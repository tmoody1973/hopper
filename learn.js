// "Learn more" bill cards: what a bill would do (official CRS summary), where it
// is now (a plain-English journey), and who is behind it. Used by the end-of-round
// Docket and by the home page's "try one bill" quiz.
import { AREA_BY_NAME, billLabel, congressLabel } from './rules.js';

// The road a measure travels depends on its type. Simple resolutions never go
// to the other chamber or the President.
const ROADS = {
  bill: ['Introduced', 'In committee', 'Passed one chamber', 'Passed both', 'To the President', 'Law'],
  simple: ['Introduced', 'In committee', 'Adopted'],
  concurrent: ['Introduced', 'In committee', 'Passed one chamber', 'Adopted by both'],
};

function roadFor(type) {
  if (type === 'HRES' || type === 'SRES') return ROADS.simple;
  if (type === 'HCONRES' || type === 'SCONRES') return ROADS.concurrent;
  return ROADS.bill;
}

// Best reading of the latest action. It's a heuristic over Congress.gov's wording.
export function journey(bill) {
  const steps = roadFor(bill.type);
  const t = String(bill.latestAction?.text ?? '').toLowerCase();
  const last = steps.length - 1;
  let step = 0;
  if (steps === ROADS.simple) {
    step = /agreed to|adopted/.test(t) ? 2 : /referred|committee|reported|calendar/.test(t) ? 1 : 0;
  } else if (bill.law || /became (public|private) law|signed by (the )?president/.test(t)) {
    step = last;
  } else if (steps === ROADS.bill && /presented to (the )?president/.test(t)) {
    step = 4;
  } else if (/(passed|agreed to)( in)? (the )?(house|senate)|received in the (house|senate)|message on (house|senate) action/.test(t)) {
    step = 2;
  } else if (/referred|committee|subcommittee|reported|hearings|markup|calendar/.test(t)) {
    step = 1;
  }
  return { steps, step };
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Turns Congress.gov's latest action into a plain sentence.
export function statusSentence(bill) {
  const action = bill.latestAction;
  if (!action?.text) return 'No action on record yet.';
  const date = formatDate(action.date);
  const text = action.text.replace(/\s+/g, ' ').trim().replace(/\.$/, '');
  const referred = text.match(/^Referred to the (.+)$/i);
  if (referred) return `Sent to the ${referred[1]} on ${date}.`;
  if (/^Became Public Law/i.test(text)) return `Became law on ${date} (${text.replace(/^Became /i, '')}).`;
  return `Latest step, ${date}: ${text}.`;
}

export function sponsorLine(bill) {
  const s = bill.sponsor;
  if (!s?.name) return null;
  const who = `${s.role} ${s.name}${s.party || s.state ? ` (${[s.party, s.state].filter(Boolean).join('-')})` : ''}`;
  const n = Number(bill.cosponsors) || 0;
  return n ? `${who}, with ${n} cosponsor${n === 1 ? '' : 's'}` : `${who}, with no cosponsors yet`;
}

export function firstSentence(text) {
  const para = String(text ?? '').split('\n\n')[0];
  const match = para.match(/^.+?[.!?](?=\s+[A-Z(]|$)/);
  return (match ? match[0] : para).trim();
}

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function verdictLine({ verdict, picked }, area) {
  if (verdict === 'right') return el('span', { className: 'bc-verdict right', textContent: `✓ ${area}` });
  if (verdict === 'wrong') return el('span', { className: 'bc-verdict wrong', textContent: `✗ You said ${picked} · it's ${area}` });
  if (verdict === 'missed') return el('span', { className: 'bc-verdict missed', textContent: `○ Missed · it's ${area}` });
  return null;
}

function journeyTrack(bill) {
  const { steps, step } = journey(bill);
  const list = el('ol', { className: 'journey' }, steps.map((label, i) => el('li', {
    className: i < step ? 'done' : i === step ? 'now' : '',
    textContent: label,
  })));
  list.setAttribute('aria-label', `Step ${step + 1} of ${steps.length}: ${steps[step]}`);
  return { list, stuckInCommittee: steps[step] === 'In committee' };
}

// One bill as an expandable card. record: { bill, verdict?, picked? }.
export function billCard(record, { open = false } = {}) {
  const { bill } = record;
  const area = bill.policyArea;
  const real = bill.source === 'congress.gov';
  const head = [
    verdictLine(record, area),
    el('span', { className: 'bc-id', textContent: `${billLabel(bill)} · ${congressLabel(bill)}`.toLowerCase() }),
    el('span', { className: 'bc-title', textContent: bill.title }),
    el('span', { className: 'bc-more', textContent: 'what it would do', ariaHidden: 'true' }),
  ].filter(Boolean);

  const body = [];
  if (!real) {
    body.push(el('p', { textContent: 'This is a made-up sample bill, so there is nothing more to read about it.' }));
  } else {
    body.push(el('h4', { textContent: 'What it would do' }));
    if (bill.summary) {
      const first = firstSentence(bill.summary);
      body.push(el('p', { className: 'bc-lead', textContent: first }));
      if (bill.summary.length > first.length + 5) {
        body.push(el('details', { className: 'bc-full' }, [
          el('summary', { textContent: 'Read the whole summary' }),
          ...bill.summary.split('\n\n').map((p) => el('p', { textContent: p })),
        ]));
      }
      body.push(el('p', { className: 'bc-source', textContent: `Summary by the Congressional Research Service${bill.summaryOf ? ` · ${bill.summaryOf.toLowerCase()} version` : ''}` }));
    } else {
      body.push(el('p', { textContent: "Congress's researchers haven't written a summary for this bill yet. The title is the best description for now." }));
    }

    const { list, stuckInCommittee } = journeyTrack(bill);
    body.push(el('h4', { textContent: 'Where it is now' }), list,
      el('p', { textContent: `${statusSentence(bill)}${stuckInCommittee ? ' Most bills never make it out of committee.' : ''}` }));

    const sponsor = sponsorLine(bill);
    if (sponsor) body.push(el('h4', { textContent: "Who's behind it" }), el('p', { textContent: sponsor }));
    if (bill.url) {
      body.push(el('a', { className: 'bc-link', href: bill.url, target: '_blank', rel: 'noopener', textContent: 'Read it on Congress.gov ↗' }));
    }
  }

  const card = el('details', { className: 'bill-card', open }, [el('summary', {}, head), el('div', { className: 'bc-body' }, body)]);
  card.style.setProperty('--c', AREA_BY_NAME.get(area)?.color ?? '#8c8fb0');
  return card;
}
