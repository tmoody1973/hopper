// Single source of truth for the rules. The game and the home page both import
// from here, so the numbers on the page can't drift from the game.

export const WIN_SCORE = 25;
export const MAX_WRONG_PER_BIN = 3;
export const SPAWN_INTERVAL = 5; // seconds between bills
export const MIN_LIVE_BILLS = 30;

export const AREAS = [
  { name: 'Health', short: 'Health', color: '#ef7d8a', label: ['HEALTH'],
    covers: 'hospitals, Medicare, drug prices, public health' },
  { name: 'Taxation', short: 'Taxation', color: '#f2bd4f', label: ['TAXATION'],
    covers: 'tax credits, deductions, rates, the IRS' },
  { name: 'Energy', short: 'Energy', color: '#f39a4b', label: ['ENERGY'],
    covers: 'the power grid, oil and gas, nuclear, efficiency' },
  { name: 'Education', short: 'Education', color: '#6c9fe0', label: ['EDUCATION'],
    covers: 'schools, teachers, student loans, Pell Grants' },
  { name: 'Armed Forces and National Security', short: 'Armed Forces', color: '#8f9d5c', label: ['ARMED FORCES', '& NATIONAL', 'SECURITY'],
    covers: 'the military, service members, veterans, homeland defense' },
  { name: 'Environmental Protection', short: 'Environment', color: '#4fb3a9', label: ['ENVIRONMENTAL', 'PROTECTION'],
    covers: 'clean air and water, pollution, cleanup' },
  { name: 'Crime and Law Enforcement', short: 'Crime & Law', color: '#9b7fd4', label: ['CRIME & LAW', 'ENFORCEMENT'],
    covers: 'policing, federal crimes, drug trafficking, prisons' },
  { name: 'Government Operations and Politics', short: 'Gov. Operations', color: '#8c8fb0', label: ['GOVERNMENT', 'OPERATIONS', '& POLITICS'],
    covers: 'federal agencies, elections, the Postal Service, the census' },
];
export const AREA_BY_NAME = new Map(AREAS.map((a) => [a.name, a]));

const TYPE_LABEL = {
  HR: 'H.R.', S: 'S.', HRES: 'H.Res.', SRES: 'S.Res.', HJRES: 'H.J.Res.',
  SJRES: 'S.J.Res.', HCONRES: 'H.Con.Res.', SCONRES: 'S.Con.Res.',
};

export function billLabel(bill) {
  return `${TYPE_LABEL[bill.type] ?? bill.type} ${bill.number}`;
}

// "119th congress". Bills can come from the 118th too, where the 119th runs short.
export function congressLabel(bill) {
  const n = Number(bill.congress) || 119;
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th');
  return `${n}${suffix} congress`;
}

export function isUsableBill(bill) {
  return Boolean(bill) && typeof bill.title === 'string' && bill.title.trim() !== ''
    && typeof bill.type === 'string' && /^\d+$/.test(String(bill.number))
    && AREA_BY_NAME.has(bill.policyArea);
}

// The one grading rule: a bill belongs in exactly one bin.
export function isCorrectSort(bill, areaName) {
  return bill.policyArea === areaName;
}
