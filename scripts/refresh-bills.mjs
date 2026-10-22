#!/usr/bin/env node
// Downloads real bills into bills.json (119th Congress first, 118th only for bins the
// 119th can't fill), so the API key stays on
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
const PER_AREA = 15; // up to 15 bills per bin (120 total), so no bin floods the deck
const CONGRESSES = [119, 118]; // newest first; older ones only fill what's still missing
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

const billKey = (b) => `${b.congress}-${String(b.type).toUpperCase()}-${b.number}`;

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
    for (const congress of CONGRESSES) {
      let checkedHere = 0; // each Congress gets its own budget of maxDetails
      for (let offset = 0; !full() && checkedHere < maxDetails; offset += PAGE) {
        const list = await retryOnce(() => fetchJson(`${API}/bill/${congress}?limit=${PAGE}&offset=${offset}&format=json&api_key=${encodeURIComponent(key)}`));
        const all = Array.isArray(list?.bills) ? list.bills : [];
        if (all.length === 0) break;
        const summaries = all.filter((s) => !seen.has(billKey({ congress, type: s?.type, number: s?.number })));
        for (let i = 0; i < summaries.length && !full() && checkedHere < maxDetails; i += BATCH) {
          const batch = summaries.slice(i, i + BATCH);
          checked += batch.length;
          checkedHere += batch.length;
          for (const bill of await Promise.all(batch.map((s) => retryOnce(() => fetchBillDetail(s, key, congress)).catch(skipMissing)))) {
            if (isUsableBill(bill)) keep({ ...bill, source: 'congress.gov', fetched });
          }
          process.stdout.write(`\r${congress}th Congress · ${checked} bills checked · ${kept()} kept`);
        }
      }
      if (full()) break;
      process.stdout.write('\n');
    }
  } catch (err) {
    stopReason = redact(err.message, key); // usually a rate limit (HTTP 429); keep what we have
  }
  process.stdout.write('\n');
  return { byArea, checked, stopReason };
}

// ─── "Learn more" details: CRS summary, sponsor, status ────────────────────
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', sect: '§' };

// CRS summaries are HTML. Keep the words, drop the markup and the bolded title paragraph.
export function cleanSummary(html) {
  const paras = String(html)
    .replace(/^\s*<p>\s*(<strong>[\s\S]*?<\/strong>\s*)+<\/p>/i, '')
    .replace(/<\/(p|li|h\d)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === '#'
      ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
      : ENTITIES[e.toLowerCase()] ?? m))
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const text = paras.join('\n\n');
  return text.length > 2400 ? `${text.slice(0, 2400).replace(/\s+\S*$/, '')}…` : text;
}

async function latestSummary(bill, key) {
  const data = await fetchJson(`${API}/bill/${bill.congress}/${bill.type.toLowerCase()}/${bill.number}/summaries?format=json&api_key=${encodeURIComponent(key)}`);
  const list = Array.isArray(data?.summaries) ? data.summaries : [];
  const latest = list.reduce((a, b) => (String(b.updateDate) > String(a?.updateDate ?? '') ? b : a), null);
  return latest ? { summary: cleanSummary(latest.text) || null, summaryOf: latest.actionDesc ?? null } : { summary: null, summaryOf: null };
}

// For bills with no summary: the official long title ("To amend ... to ...") says what they do.
async function officialTitle(bill, key) {
  const data = await fetchJson(`${API}/bill/${bill.congress}/${bill.type.toLowerCase()}/${bill.number}/titles?format=json&api_key=${encodeURIComponent(key)}`);
  const found = (Array.isArray(data?.titles) ? data.titles : []).find((t) => /^Official Title/i.test(String(t.titleType)));
  const text = String(found?.title ?? '').replace(/,? and for other purposes\.?$/i, '.').trim();
  return text && text !== bill.title ? text : null;
}

// A card must say what the bill does: a summary, an official title, or a long descriptive title.
export const explainsItself = (b) => Boolean(b.summary || b.officialTitle || String(b.title).split(/\s+/).length >= 8);

// Refreshes status and summary for every kept bill (bills move through Congress, so this runs each time).
async function enrich(bills, key) {
  const out = [];
  let withSummary = 0;
  for (let i = 0; i < bills.length; i += BATCH) {
    const batch = await Promise.all(bills.slice(i, i + BATCH).map(async (bill) => {
      try {
        const detail = await retryOnce(() => fetchBillDetail(bill, key, bill.congress)).catch(skipMissing);
        const about = await retryOnce(() => latestSummary(bill, key)).catch(skipMissing);
        const official = about?.summary ? null : await retryOnce(() => officialTitle(bill, key)).catch(skipMissing);
        return { ...bill, ...(detail ? { ...detail, title: bill.title, policyArea: bill.policyArea } : {}), ...(about ?? {}), officialTitle: official ?? null };
      } catch (err) {
        if (/HTTP 429/.test(err.message)) throw err;
        return bill; // keep the bill as it was; a later run can fill in its details
      }
    }));
    for (const bill of batch) {
      if (bill.summary) withSummary++;
      out.push(bill);
    }
    process.stdout.write(`\rDetails ${out.length}/${bills.length} · ${withSummary} with a CRS summary`);
  }
  process.stdout.write('\n');
  return out;
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
  let final = bills;
  try {
    final = await enrich(bills, key);
  } catch (err) {
    console.log(`Details stopped early: ${redact(err.message, key)}. Bills are saved; rerun later to fill in details.`);
  }
  const dropped = final.filter((b) => !explainsItself(b));
  if (dropped.length) {
    console.log(`Dropped ${dropped.length} bills whose card couldn't say what they do: ${dropped.map((b) => b.title).join(' · ')}`);
    final = final.filter(explainsItself);
  }
  writeFileSync(out, `[\n${final.map((b) => `  ${JSON.stringify(b)}`).join(',\n')}\n]\n`);
  console.log(`Wrote ${final.length} real bills to ${out} (checked ${checked}).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((err) => {
  console.error(`refresh-bills failed: ${err.message}`);
  process.exit(1);
});
