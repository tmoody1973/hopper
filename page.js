// The home page around the game: PLAY buttons, the "try one bill" toy and the
// eight bin cards. Rule numbers come from rules.js, the same module the game uses.
import { AREAS, WIN_SCORE, MAX_WRONG_PER_BIN, SPAWN_INTERVAL, billLabel, congressLabel, isCorrectSort } from './rules.js';
import { shuffle } from './data.js';

const $ = (id) => document.getElementById(id);

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

const RULE_VALUES = { win: WIN_SCORE, strikes: MAX_WRONG_PER_BIN, spawn: SPAWN_INTERVAL, bins: AREAS.length };

let quizDeck = [];
let quizIndex = 0;
let sampleSource = false;

export function initPage({ onPlay }) {
  for (const node of document.querySelectorAll('[data-rule]')) {
    node.textContent = String(RULE_VALUES[node.dataset.rule] ?? node.textContent);
  }
  for (const btn of document.querySelectorAll('[data-play]')) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      onPlay();
    });
  }
  $('quiz-next')?.addEventListener('click', nextQuestion);
  renderBinCards([]);
}

export function setBills(bills, source, fetched) {
  sampleSource = source === 'local';
  const ready = bills.length > 0;
  for (const btn of document.querySelectorAll('[data-play]')) btn.disabled = !ready;
  $('play-note').textContent = !ready
    ? 'could not load bills · serve this folder over http'
    : { live: `${bills.length} live bills from congress.gov`,
        snapshot: `${bills.length} real bills from congress.gov · updated ${fetched}`,
        local: `${bills.length} sample bills (made up) · real ones need an api key` }[source];
  if (!ready) return;
  quizDeck = shuffle(bills);
  quizIndex = 0;
  nextQuestion();
  renderBinCards(bills);
}

function nextQuestion() {
  if (quizDeck.length === 0) return;
  const bill = quizDeck[quizIndex++ % quizDeck.length];
  $('quiz-id').textContent = `${sampleSource ? 'sample bill · ' : ''}${billLabel(bill)} · ${congressLabel(bill)}`.toLowerCase();
  $('quiz-title').textContent = bill.title;
  $('quiz-result').textContent = '';
  $('quiz-result').className = 'quiz-result';
  const chips = AREAS.map((area) => {
    const chip = el('button', { type: 'button', className: 'chip', textContent: area.name });
    chip.style.setProperty('--c', area.color);
    chip.addEventListener('click', () => answer(bill, area.name, chips));
    return chip;
  });
  $('quiz-chips').replaceChildren(...chips);
}

function answer(bill, picked, chips) {
  const right = isCorrectSort(bill, picked);
  chips.forEach((chip) => {
    chip.disabled = true;
    if (chip.textContent === bill.policyArea) chip.classList.add('right');
    else if (chip.textContent === picked) chip.classList.add('wrong');
  });
  const result = $('quiz-result');
  result.className = `quiz-result ${right ? 'good' : 'bad'}`;
  result.textContent = right
    ? `Right. That's ${bill.policyArea}: green glow, one more ring on the dome.`
    : `Not quite. It's ${bill.policyArea}. In the game, that's a strike on ${picked}.`;
}

function renderBinCards(bills) {
  const cards = AREAS.map((area) => {
    const example = bills.find((b) => b.policyArea === area.name);
    const card = el('div', { className: 'bin-card' }, [
      el('span', { className: 'swatch' }),
      el('h3', { textContent: area.name }),
      el('p', { textContent: area.covers }),
      example ? el('p', { className: 'eg' }, [el('span', { className: 'eg-label', textContent: 'example bill' }), example.title]) : '',
    ]);
    card.style.setProperty('--c', area.color);
    return card;
  });
  $('bin-cards').replaceChildren(...cards);
}
