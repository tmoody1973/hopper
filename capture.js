// Launch-video recording mode, loaded only for ?capture=<scene>. It drives the
// real game frame by frame (no real-time clock), plays it with a scripted
// cursor, and logs event times so the video edit can sync sound to them.
// The recorder (video/scripts/record.mjs) calls window.__capture.step() once
// per frame and screenshots the page.
import * as THREE from 'three';
import { renderOffline } from './audio.js';

const FPS = 30;
const DT = 1 / FPS;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Bills chosen for the video: an opaque title that the plain line explains,
// then one we deliberately sort wrong so the video can show a mistake.
const PLAY_DECK = [
  ['GEO Act', 'right'],
  ['FairTax Act of 2025', 'Health'],
  ['Ultrasound Informed Consent Act', 'right'],
  ['HOUSE Act of 2025', 'right'],
  ['TCJA Permanency Act', 'right'],
];
const DOME_VIEW = { pos: new THREE.Vector3(0, 9, 1.5), look: new THREE.Vector3(0, 8.6, -15) };

// ─── Clock, cursor, pointer ────────────────────────────────────────────────
function installVirtualTimers(clock) {
  const queue = [];
  let nextId = 1;
  window.setTimeout = (fn, ms = 0) => {
    const id = nextId++;
    queue.push({ id, at: clock.ms + ms, fn });
    return id;
  };
  window.clearTimeout = (id) => {
    const i = queue.findIndex((q) => q.id === id);
    if (i > -1) queue.splice(i, 1);
  };
  return function runDue() {
    for (;;) {
      queue.sort((a, b) => a.at - b.at);
      if (queue.length === 0 || queue[0].at > clock.ms) return;
      queue.shift().fn();
    }
  };
}

function makeCursor() {
  const el = document.createElement('div');
  el.id = 'capture-cursor';
  el.innerHTML = '<svg viewBox="0 0 32 32" width="46" height="46" aria-hidden="true"><path d="M6 3l20 12-9 2 5 10-4 2-5-10-7 6z" fill="#fffaf3" stroke="#2b2540" stroke-width="2.4" stroke-linejoin="round"/></svg>';
  document.body.append(el);
  return { el, x: innerWidth * 0.72, y: innerHeight * 0.32, down: false, visible: false };
}

function drawCursor(c) {
  c.el.style.display = c.visible ? 'block' : 'none';
  c.el.style.translate = `${c.x - 7}px ${c.y - 4}px`;
  c.el.style.scale = c.down ? '0.88' : '1';
}

function pointer(api, type, x, y) {
  const target = type === 'pointerdown' ? api.canvas : window;
  target.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true, pointerId: 1, isPrimary: true }));
}

function toScreen(api, v) {
  const p = v.clone().project(api.camera);
  return { x: ((p.x + 1) / 2) * innerWidth, y: ((1 - p.y) / 2) * innerHeight };
}

// ─── Script building blocks (each `yield` is one frame) ────────────────────
function* wait(seconds) {
  for (let i = 0; i < Math.round(seconds * FPS); i++) yield;
}

function* moveTo(ctx, target, seconds, dragging = false) {
  const n = Math.max(1, Math.round(seconds * FPS));
  const sx = ctx.cursor.x;
  const sy = ctx.cursor.y;
  for (let i = 1; i <= n; i++) {
    const t = ease(i / n);
    const goal = target();
    ctx.cursor.x = sx + (goal.x - sx) * t;
    ctx.cursor.y = sy + (goal.y - sy) * t;
    if (dragging) pointer(ctx.api, 'pointermove', ctx.cursor.x, ctx.cursor.y);
    yield;
  }
}

function* nextCrate(ctx, readY = 5.2) {
  let crate;
  while (!(crate = ctx.api.game.crates.find((c) => !ctx.seen.has(c) && c.state === 'falling' && c.group.position.y <= readY))) yield;
  ctx.seen.add(crate);
  return crate;
}

function* dragCrate(ctx, crate, binName) {
  const { api } = ctx;
  yield* moveTo(ctx, () => toScreen(api, crate.mesh.getWorldPosition(new THREE.Vector3())), 0.55);
  // Where the bill's title card sits on screen (0..1), so the edit can punch in on it.
  const card = toScreen(api, crate.sprite.getWorldPosition(new THREE.Vector3()));
  pointer(api, 'pointerdown', ctx.cursor.x, ctx.cursor.y);
  ctx.cursor.down = true;
  ctx.event('grab', { title: crate.bill.title, cardX: card.x / innerWidth, cardY: card.y / innerHeight });
  const bin = api.world().bins.find((b) => b.area.name === binName);
  yield* moveTo(ctx, () => toScreen(api, new THREE.Vector3(bin.x, 2.05, 4.6)), 0.75, true);
  yield* wait(0.15);
  pointer(api, 'pointerup', ctx.cursor.x, ctx.cursor.y);
  ctx.cursor.down = false;
  ctx.event(binName === crate.bill.policyArea ? 'correct' : 'wrong', { title: crate.bill.title, bin: binName, area: crate.bill.policyArea });
}

function findBill(api, title) {
  const bill = api.game.bills.find((b) => b.title === title);
  if (!bill) throw new Error(`capture: bill not in deck: ${title}`);
  return bill;
}

function startQuietRound(api) {
  api.enterGame();
  api.game.spawnTimer = 1e9; // no bills unless a scene launches them
}

// ─── Scenes ────────────────────────────────────────────────────────────────
const SCENES = {
  hero: {
    seconds: 8,
    *run() {
      yield* wait(8);
    },
  },

  play: {
    seconds: 27,
    *run(ctx) {
      const { api } = ctx;
      api.enterGame();
      const picks = PLAY_DECK.map(([title]) => findBill(api, title));
      api.game.deck = [...picks, ...api.game.deck.filter((b) => !picks.includes(b))];
      api.game.deckIndex = 0;
      ctx.cursor.visible = true;
      for (const [title, bin] of PLAY_DECK) {
        const crate = yield* nextCrate(ctx);
        yield* dragCrate(ctx, crate, bin === 'right' ? crate.bill.policyArea : bin);
        if (title !== PLAY_DECK.at(-1)[0]) yield* moveTo(ctx, () => ({ x: innerWidth * 0.72, y: innerHeight * 0.3 }), 0.6);
      }
      for (;;) yield;
    },
  },

  dome: {
    seconds: 7,
    *run(ctx) {
      const { api } = ctx;
      startQuietRound(api);
      api.setView(DOME_VIEW, true);
      yield* wait(0.4);
      for (let n = 1; n <= 24; n++) {
        api.capitol().setProgress(n);
        ctx.event('ring', { n });
        yield* wait(0.08);
      }
      yield* wait(0.35);
      api.capitol().complete();
      ctx.event('win');
      for (;;) yield;
    },
  },

  docket: {
    seconds: 7,
    *run(ctx) {
      const { api } = ctx;
      startQuietRound(api);
      document.body.classList.add('capture-ui');
      const rec = (title, verdict, picked, beforeHint = true) => ({ bill: findBill(api, title), verdict, picked, beforeHint });
      api.game.handled = [
        rec('FairTax Act of 2025', 'wrong', 'Health'),
        rec('GEO Act', 'right'),
        rec('Ultrasound Informed Consent Act', 'right'),
        rec('HOUSE Act of 2025', 'right', undefined, false),
        rec('TCJA Permanency Act', 'right'),
      ];
      api.game.score = 4;
      api.showDocket(true);
      yield* wait(1.2);
      // Scroll the open card down to its journey track, the "where it is now" moment.
      const card = document.getElementById('card');
      const journey = card.querySelector('.journey');
      const target = Math.max(0, journey.offsetTop - card.clientHeight * 0.35);
      const n = Math.round(2.2 * FPS);
      for (let i = 1; i <= n; i++) {
        card.scrollTop = target * ease(i / n);
        yield;
      }
      ctx.event('journey');
      for (;;) yield;
    },
  },
};

// ─── Audio: the game's own sound recipes, plus a short music loop ──────────
const BEAT = 0.5; // 120 BPM
const BAR = 4 * BEAT;
const CHORDS = [[0, 4, 7, 12], [7, 11, 14, 19], [9, 12, 16, 21], [5, 9, 12, 17]]; // C, G, Am, F
const C3 = 130.81;

function music({ tone, noise, semis }) {
  for (let bar = 0; bar < 15; bar++) {
    const t0 = bar * BAR;
    const chord = CHORDS[bar % 4];
    const full = bar >= 3 && bar < 14; // the groove drops in at 6 s, with the logo
    if (bar === 14) {
      chord.forEach((n) => tone({ type: 'triangle', freq: semis(C3 * 2, n % 12), at: t0, dur: 1.9, vol: 0.12 }));
      tone({ freq: semis(C3 / 2, 0), at: t0, dur: 1.6, vol: 0.32 });
      tone({ freq: 130, to: 45, at: t0, dur: 0.25, vol: 0.5 });
      continue;
    }
    for (const b of [0, 2]) tone({ freq: semis(C3 / 2, chord[0] % 12), at: t0 + b * BEAT, dur: 0.42, vol: full ? 0.3 : 0.16 });
    if (full) {
      for (let b = 0; b < 4; b++) tone({ freq: 130, to: 45, at: t0 + b * BEAT, dur: 0.2, vol: 0.45 });
      for (const b of [1, 3]) noise({ at: t0 + b * BEAT, dur: 0.12, vol: 0.14, freq: 1600, q: 0.8 });
    }
    for (let e = 1; e < 8; e += 2) noise({ at: t0 + (e * BEAT) / 2, dur: 0.035, vol: full ? 0.07 : 0.04, freq: 8000, type: 'highpass' });
    [0, 1, 2, 3, 2, 1, 2, 3].forEach((i, e) => tone({ type: 'triangle', freq: semis(C3 * 2, chord[i]), at: t0 + (e * BEAT) / 2, dur: 0.22, vol: 0.085 }));
  }
  tone({ type: 'triangle', freq: 220, to: 880, at: 4.6, dur: 1.4, vol: 0.05 }); // riser into the drop
}

const AUDIO = {
  music: [30.5, music],
  gavel: [1, ({ sfx }) => sfx.gavel()],
  launch: [0.6, ({ sfx }) => sfx.launch()],
  grab: [0.3, ({ sfx }) => sfx.grab()],
  hover: [0.2, ({ sfx }) => sfx.hover()],
  correct: [0.6, ({ sfx }) => sfx.correct(0)],
  correct3: [0.6, ({ sfx }) => sfx.correct(3)],
  wrong: [0.8, ({ sfx }) => sfx.wrong()],
  plop: [0.4, ({ sfx }) => sfx.plop()],
  click: [0.2, ({ sfx }) => sfx.click()],
  win: [2, ({ sfx }) => sfx.win()],
  lose: [2.5, ({ sfx }) => sfx.lose()],
  whoosh: [0.5, ({ tone, noise }) => { noise({ dur: 0.35, vol: 0.3, freq: 1200, q: 0.6 }); tone({ type: 'triangle', freq: 300, to: 900, dur: 0.3, vol: 0.05 }); }],
  tick: [0.1, ({ tone }) => tone({ freq: 1800, dur: 0.03, vol: 0.07 })],
  pop: [0.2, ({ tone }) => tone({ freq: 500, to: 950, dur: 0.08, vol: 0.2 })],
};

// Returns 16-bit PCM as base64, peak-normalised so loud mixes never clip.
async function renderAudio(name) {
  const [seconds, schedule] = AUDIO[name];
  const buffer = await renderOffline(seconds, schedule);
  const data = buffer.getChannelData(0);
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0.9 ? 0.9 / peak : 1;
  const pcm = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) pcm[i] = Math.round(Math.max(-1, Math.min(1, data[i] * gain)) * 32767);
  let binary = '';
  const bytes = new Uint8Array(pcm.buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { sampleRate: buffer.sampleRate, base64: btoa(binary) };
}

// ─── Entry ─────────────────────────────────────────────────────────────────
export function start(api, sceneName) {
  document.body.classList.add('capture');
  if (sceneName === 'audio') {
    window.__capture = { ready: true, names: Object.keys(AUDIO), renderAudio };
    return;
  }
  const scene = SCENES[sceneName];
  if (!scene) throw new Error(`capture: unknown scene "${sceneName}"`);
  const clock = { ms: 0 };
  const runTimers = installVirtualTimers(clock);
  const events = [];
  const ctx = { api, cursor: makeCursor(), seen: new Set(), frame: 0, event: (type, detail = {}) => events.push({ frame: ctx.frame, type, ...detail }) };
  const knownCrates = new Set();
  const script = scene.run(ctx);
  api.resize();

  window.__capture = {
    ready: true,
    fps: FPS,
    frames: Math.round(scene.seconds * FPS),
    events,
    step() {
      script.next();
      clock.ms += 1000 / FPS;
      runTimers();
      api.frame(DT);
      for (const c of api.game.crates) {
        if (!knownCrates.has(c)) {
          knownCrates.add(c);
          ctx.event('launch', { title: c.bill.title });
        }
      }
      drawCursor(ctx.cursor);
      ctx.frame++;
    },
  };
}
