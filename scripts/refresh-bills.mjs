#!/usr/bin/env node
// Downloads real 119th-Congress bills into bills.json, so the API key stays on
// this machine and visitors never call the API.
//
// Setup once: copy .env.example to .env.local and paste your free key from
// https://api.data.gov/signup/ after CONGRESS_API_KEY=
// Run:        node scripts/refresh-bills.mjs            (writes bills.json)
//             node scripts/refresh-bills.mjs --out x.json --max 1000
//
// Real bills already in bills.json are kept, so a rerun only fills thin bins.
// If it can't collect enough bills, it exits without touching bills.json.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AREAS, MIN_LIVE_BILLS, isUsableBill } from '../rules.js';
import { fetchJson, fetchBillDetail } from '../data.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.congress.gov/v3';
const PER_AREA = 8; // up to 8 bills per bin, so no bin floods the deck
const PAGE = 100; // big pages are slow (250 can pass the 8 s timeout); 100 takes ~3 s
const BATCH = 5; // detail requests in flight at once
const DEFAULT_MAX = 2000; // bills to inspect per run (one request each). New bills often have no
// policy area yet, so the rarer bins (Energy, Education) need a deep look. If you hit HTTP 429,
// your key's hourly limit is lower: rerun later or pass --max 800; kept bills carry over.

function readKey() {
  if (process.env.CONGRESS_API_KEY) return process.env.CONGRESS_API_KEY.trim();
  const file = join(ROOT, '.env.local');
  if (!existsSync(file)) return '';
  const line = readFileSync(file, 'utf8').split(/\r?\n/).find((l) => l.startsWith('CONGRESS_API_KEY='));
  return line ? line.slice('CONGRESS_API_KEY='.length).trim().replace(/^["']|["']$/g, '') : '';
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const billKey = (b) => `${b.type}-${b.number}`;

// Real bills from a previous run, so reruns top up instead of starting over.
function previousRealBills(file) {
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    return Array.isArray(data) ? data.filter((b) => b.source === 'congress.gov' && isUsableBill(b)) : [];
  } catch {
    return [];
  }
}

const redact = (msg, key) => String(msg).split(key).join('***');

// A bill whose detail page is missing (HTTP 404) is skipped; anything else stops the run.
function skipMissing(err) {
  if (/HTTP 404/.test(err.message)) return null;
  throw err;
}

// One retry for a slow or dropped request. Rate limits (HTTP 429) are not retried.
async function retryOnce(fn) {
  try {
    return await fn();
  } catch (err) {
    if (/HTTP \d+/.test(err.message)) throw err;
    return fn();
  }
}

async function collect(key, previous, maxDetails) {
  const byArea = new Map(AREAS.map((a) => [a.name, []]));
  const seen = new Set();
  const keep = (bill) => {
    const slot = byArea.get(bill.policyArea);
    if (seen.has(billKey(bill)) || slot.length >= PER_AREA) return;
    seen.add(billKey(bill));
    slot.push(bill);
  };
  previous.forEach(keep);
  const kept = () => [...byArea.values()].reduce((n, list) => n + list.length, 0);
  const full = () => [...byArea.values()].every((list) => list.length >= PER_AREA);
  const fetched = new Date().toISOString().slice(0, 10);
  let checked = 0;
  let stopReason = null;

  try {
    for (let offset = 0; !full() && checked < maxDetails; offset += PAGE) {
      const list = await retryOnce(() => fetchJson(`${API}/bill/119?limit=${PAGE}&offset=${offset}&format=json&api_key=${encodeURIComponent(key)}`));
      const all = Array.isArray(list?.bills) ? list.bills : [];
      if (all.length === 0) break;
      const summaries = all.filter((s) => !seen.has(`${String(s?.type).toUpperCase()}-${s?.number}`));
      for (let i = 0; i < summaries.length && !full() && checked < maxDetails; i += BATCH) {
        const batch = summaries.slice(i, i + BATCH);
        checked += batch.length;
        for (const bill of await Promise.all(batch.map((s) => retryOnce(() => fetchBillDetail(s, key)).catch(skipMissing)))) {
          if (isUsableBill(bill)) keep({ ...bill, source: 'congress.gov', fetched });
        }
        process.stdout.write(`\r${checked} bills checked · ${kept()} kept`);
      }
    }
  } catch (err) {
    stopReason = redact(err.message, key); // usually a rate limit (HTTP 429); keep what we have
  }
  process.stdout.write('\n');
  return { byArea, checked, stopReason };
}

async function main() {
  const key = readKey();
  if (!key) {
    console.error('No API key. Copy .env.example to .env.local and add your key from https://api.data.gov/signup/');
    process.exit(1);
  }
  const out = arg('--out', join(ROOT, 'bills.json'));
  const maxDetails = Number(arg('--max', DEFAULT_MAX)) || DEFAULT_MAX;
  const previous = previousRealBills(out);
  if (previous.length) console.log(`Keeping ${previous.length} real bills from the last run.`);
  const { byArea, checked, stopReason } = await collect(key, previous, maxDetails);
  const bills = [...byArea.values()].flat();
  for (const [name, list] of byArea) console.log(`${String(list.length).padStart(2)}  ${name}`);
  if (stopReason) console.log(`Stopped early: ${stopReason}`);

  if (bills.length < MIN_LIVE_BILLS) {
    console.error(`Only ${bills.length} usable bills after checking ${checked}; need ${MIN_LIVE_BILLS}. bills.json left unchanged.`);
    process.exit(1);
  }
  writeFileSync(out, `[\n${bills.map((b) => `  ${JSON.stringify(b)}`).join(',\n')}\n]\n`);
  console.log(`Wrote ${bills.length} real bills to ${out} (checked ${checked}).`);
}

main().catch((err) => {
  console.error(`refresh-bills failed: ${err.message}`);
  process.exit(1);
});
