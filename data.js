// Loads bills: live from api.congress.gov when a key is set, otherwise (or on
// any failure) from ./bills.json. Never throws; worst case returns no bills.
import { MIN_LIVE_BILLS, isUsableBill } from './rules.js';

const API_BASE = 'https://api.congress.gov/v3';
const MAX_LIST_PAGES = 3; // 50 bills per page; stops early once enough usable bills are found
const DETAIL_BATCH = 10; // detail requests in flight at once
const FETCH_TIMEOUT_MS = 8000;
const CACHE_KEY = 'policy-sorter:live-bills:v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // live fetch costs ~50–150 requests; api.data.gov allows 1000/hour

export function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchBillDetail(summary, key, congress = 119) {
  const type = String(summary?.type ?? '').toLowerCase();
  const number = String(summary?.number ?? '');
  if (!/^[a-z]+$/.test(type) || !/^\d+$/.test(number)) return null;
  const data = await fetchJson(`${API_BASE}/bill/${congress}/${type}/${number}?format=json&api_key=${encodeURIComponent(key)}`);
  const bill = data?.bill ?? {};
  const sponsor = bill.sponsors?.[0];
  const law = Array.isArray(bill.laws) ? bill.laws[0] : null;
  return {
    congress,
    type: type.toUpperCase(),
    number,
    title: String(bill.title ?? summary.title ?? '').trim(),
    policyArea: bill.policyArea?.name ?? null,
    // Used by the "learn more" bill cards.
    sponsor: sponsor ? {
      name: [sponsor.firstName, sponsor.lastName].filter(Boolean).join(' '),
      role: String(sponsor.fullName ?? '').startsWith('Sen.') ? 'Sen.' : 'Rep.',
      party: String(sponsor.party ?? ''),
      state: String(sponsor.state ?? ''),
    } : null,
    cosponsors: Number(bill.cosponsors?.count ?? 0),
    introduced: bill.introducedDate ?? null,
    latestAction: bill.latestAction ? { date: bill.latestAction.actionDate, text: String(bill.latestAction.text ?? '') } : null,
    law: law ? `${law.type} ${law.number}` : null,
    url: String(bill.legislationUrl ?? '').startsWith('https://www.congress.gov/') ? bill.legislationUrl : null,
  };
}

// Any failed request rejects the whole thing; the caller falls back to bills.json.
// Note: /bill?congress=119 ignores the congress filter and lists every Congress; /bill/119 is the 119th only.
async function fetchLiveBills(key) {
  const usable = [];
  for (let page = 0; page < MAX_LIST_PAGES && usable.length < MIN_LIVE_BILLS; page++) {
    const list = await fetchJson(`${API_BASE}/bill/119?limit=50&offset=${page * 50}&format=json&api_key=${encodeURIComponent(key)}`);
    const summaries = Array.isArray(list?.bills) ? list.bills : [];
    if (summaries.length === 0) break;
    for (let i = 0; i < summaries.length && usable.length < MIN_LIVE_BILLS; i += DETAIL_BATCH) {
      const details = await Promise.all(summaries.slice(i, i + DETAIL_BATCH).map((s) => fetchBillDetail(s, key)));
      usable.push(...details.filter(isUsableBill));
    }
  }
  return usable;
}

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    if (!Number.isFinite(cached?.at) || Date.now() - cached.at > CACHE_TTL_MS || !Array.isArray(cached.bills)) return null;
    const bills = cached.bills.filter(isUsableBill);
    return bills.length >= MIN_LIVE_BILLS ? bills : null;
  } catch {
    return null;
  }
}

function writeCache(bills) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), bills }));
  } catch {
    // Storage blocked or full: the game still works, it just refetches next time.
  }
}

async function loadLiveBills(apiKey) {
  const key = String(apiKey ?? '').trim();
  if (!key) return [];
  const cached = readCache();
  if (cached) return cached;
  try {
    const bills = await fetchLiveBills(key);
    if (bills.length >= MIN_LIVE_BILLS) writeCache(bills);
    return bills;
  } catch {
    return [];
  }
}

async function loadLocalBills() {
  try {
    const data = await fetchJson('./bills.json');
    return Array.isArray(data) ? data.filter(isUsableBill) : [];
  } catch {
    return [];
  }
}

// source: 'live' (fetched in this browser) · 'snapshot' (real bills saved by
// scripts/refresh-bills.mjs) · 'local' (the made-up sample set).
export async function loadBills(apiKey) {
  const live = await loadLiveBills(apiKey);
  if (live.length >= MIN_LIVE_BILLS) return { bills: shuffle(live), source: 'live', fetched: null };
  const local = await loadLocalBills();
  const snapshot = local.length > 0 && local.every((b) => b.source === 'congress.gov');
  return { bills: shuffle(local), source: snapshot ? 'snapshot' : 'local', fetched: snapshot ? local.map((b) => b.fetched ?? '').sort().at(-1) || null : null };
}
