// Every sound is synthesized with the Web Audio API: no audio files.
// Browsers only allow sound after a click, so unlock() runs on PLAY.
const MUTE_KEY = 'hopper:muted';

let ctx = null;
let master = null;
let noiseBuffer = null;
let muted = readMuted();

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = muted ? 0 : 0.55;
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Storage blocked: the setting just won't survive a reload.
  }
}

export function unlock() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  if (!ctx) {
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}

const ready = () => ctx !== null && !muted;

// One oscillator note with a quick attack and exponential decay.
function tone({ type = 'sine', freq, to = freq, at = 0, dur = 0.15, vol = 0.3, vibrato = 0 }) {
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  if (vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 6;
    depth.gain.value = vibrato;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + dur);
  }
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// A filtered burst of noise: knocks, plops, pops.
function noise({ at = 0, dur = 0.08, vol = 0.3, freq = 1200, type = 'bandpass', q = 1 }) {
  const t0 = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = noiseBuffer;
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

const semis = (base, n) => base * 2 ** (n / 12);

export const sfx = {
  gavel(times = 3) {
    if (!ready()) return;
    for (let i = 0; i < times; i++) {
      noise({ at: i * 0.2, dur: 0.07, vol: 0.5, freq: 900, q: 2 });
      tone({ freq: 160, to: 90, at: i * 0.2, dur: 0.12, vol: 0.45 });
    }
  },
  launch() {
    if (!ready()) return;
    tone({ freq: 190, to: 95, dur: 0.12, vol: 0.35 });
    tone({ type: 'triangle', freq: 600, to: 1300, at: 0.05, dur: 0.3, vol: 0.08 });
  },
  grab() {
    if (!ready()) return;
    tone({ freq: 320, to: 640, dur: 0.09, vol: 0.25 });
  },
  hover() {
    if (!ready()) return;
    tone({ type: 'triangle', freq: 1250, dur: 0.035, vol: 0.06 });
  },
  correct(streak = 0) {
    if (!ready()) return;
    const base = semis(660, Math.min(streak, 8));
    tone({ type: 'triangle', freq: base, dur: 0.12, vol: 0.3 });
    tone({ type: 'triangle', freq: semis(base, 7), at: 0.09, dur: 0.22, vol: 0.3 });
    tone({ freq: 2600, at: 0.12, dur: 0.12, vol: 0.06 });
    noise({ dur: 0.05, vol: 0.25, freq: 3000, type: 'highpass' }); // the balloon pops
  },
  wrong() {
    if (!ready()) return;
    tone({ freq: 240, to: 110, dur: 0.14, vol: 0.45 });
    tone({ type: 'square', freq: 175, to: 88, at: 0.12, dur: 0.38, vol: 0.12 });
  },
  plop() {
    if (!ready()) return;
    tone({ freq: 300, to: 75, dur: 0.14, vol: 0.35 });
    noise({ dur: 0.1, vol: 0.12, freq: 400, type: 'lowpass' });
  },
  click() {
    if (!ready()) return;
    tone({ freq: 520, to: 780, dur: 0.06, vol: 0.18 });
  },
  win() {
    if (!ready()) return;
    [0, 4, 7, 12].forEach((n, i) => tone({ type: 'triangle', freq: semis(523, n), at: i * 0.11, dur: 0.18, vol: 0.28 }));
    [0, 4, 7].forEach((n) => tone({ type: 'triangle', freq: semis(523, n + 12), at: 0.5, dur: 0.9, vol: 0.18 }));
  },
  lose() {
    if (!ready()) return;
    // The sad trombone: four falling notes, the last one wobbling.
    [0, -1, -2].forEach((n, i) => tone({ type: 'sawtooth', freq: semis(233, n), at: i * 0.32, dur: 0.3, vol: 0.12 }));
    tone({ type: 'sawtooth', freq: semis(233, -3), at: 0.96, dur: 1.1, vol: 0.12, vibrato: 6 });
  },
};
