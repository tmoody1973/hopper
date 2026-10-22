// Every texture in the game, painted on a <canvas> at runtime. No image files.
import * as THREE from 'three';
import { billLabel, congressLabel } from './rules.js';
import { teaser } from './learn.js';

export const FONT = {
  display: '"Baloo 2", "Trebuchet MS", system-ui, sans-serif',
  body: 'Nunito, "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
};
export const INK = '#2b2540';
export const INK_SOFT = '#5d5675';
export const PAPER = '#fffaf3';

let maxAnisotropy = 1;
export function setMaxAnisotropy(n) {
  maxAnisotropy = n;
}

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

export function toTexture(c, repeat) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
  }
  return tex;
}

export function wrapText(g, text, maxWidth, maxLines) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && g.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines) {
    if (line) lines.push(line);
    return lines;
  }
  // Out of room with words left over: ellipsize the last line.
  let last = lines[maxLines - 1];
  while (last.length > 1 && g.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
  return [...lines.slice(0, -1), `${last.trimEnd()}…`];
}

function roundedRect(g, x, y, w, h, r, fill) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fillStyle = fill;
  g.fill();
}

// A paper card with a darker "lip" under it, like the PLAY button.
function lipCard(g, x, y, w, h, r, lip, lipH) {
  roundedRect(g, x, y + lipH, w, h, r, lip);
  roundedRect(g, x, y, w, h, r, PAPER);
}

export function makeSkyTexture() {
  const [c, g] = makeCanvas(4, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#8fc3ec');
  grad.addColorStop(0.5, '#b9d6ef');
  grad.addColorStop(1, '#ffe0b8');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 512);
  return toTexture(c);
}

export function makeGrassTexture() {
  const S = 512;
  const [c, g] = makeCanvas(S, S);
  g.fillStyle = '#7cc47e';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 220; i++) {
    const tone = Math.random() < 0.5 ? '255,255,255' : '40,110,50';
    g.fillStyle = `rgba(${tone}, ${rand(0.03, 0.07)})`;
    g.beginPath();
    g.arc(rand(0, S), rand(0, S), rand(6, 26), 0, Math.PI * 2);
    g.fill();
  }
  // Soft rounded tiles, the lawn pattern from the reference.
  g.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  g.lineWidth = 6;
  const cell = S / 4;
  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) {
      g.beginPath();
      g.roundRect(x * cell + 10, y * cell + 10, cell - 20, cell - 20, 26);
      g.stroke();
    }
  }
  const petals = ['#fff6e0', '#f6c1d0', '#c9b8f0', '#fbe08a'];
  for (let i = 0; i < 40; i++) {
    g.fillStyle = petals[i % petals.length];
    g.beginPath();
    g.arc(rand(0, S), rand(0, S), rand(2, 3.5), 0, Math.PI * 2);
    g.fill();
  }
  return toTexture(c, 14);
}

function grain(g, x, y, len, alpha) {
  g.strokeStyle = `rgba(150, 95, 45, ${alpha})`;
  g.lineWidth = rand(1, 2.2);
  g.beginPath();
  g.moveTo(x, y);
  g.bezierCurveTo(x + len * 0.3, y + rand(-4, 4), x + len * 0.7, y + rand(-4, 4), x + len, y + rand(-2, 2));
  g.stroke();
}

export function makeCrateTexture() {
  const [c, g] = makeCanvas(256, 256);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = `hsl(36 ${rand(62, 72)}% ${rand(80, 86)}%)`;
    g.fillRect(0, i * 64, 256, 64);
    for (let k = 0; k < 6; k++) grain(g, 0, i * 64 + rand(6, 58), 256, rand(0.1, 0.22));
    g.fillStyle = 'rgba(150, 95, 45, 0.35)';
    g.fillRect(0, i * 64, 256, 2);
  }
  g.strokeStyle = '#e0aa6c';
  g.lineWidth = 26;
  g.strokeRect(13, 13, 230, 230);
  g.lineWidth = 22;
  g.beginPath();
  g.moveTo(30, 226);
  g.lineTo(226, 30);
  g.stroke();
  g.fillStyle = '#9b7552';
  for (const [nx, ny] of [[13, 13], [243, 13], [13, 243], [243, 243]]) {
    g.beginPath();
    g.arc(nx, ny, 5, 0, Math.PI * 2);
    g.fill();
  }
  return toTexture(c);
}

export function makeSignTexture(area) {
  const W = 512;
  const H = 320;
  const [c, g] = makeCanvas(W, H);
  lipCard(g, 6, 6, W - 12, H - 26, 40, area.color, 14);
  g.lineWidth = 12;
  g.strokeStyle = area.color;
  g.beginPath();
  g.roundRect(12, 12, W - 24, H - 38, 34);
  g.stroke();

  let size = 84;
  const fits = () => {
    g.font = `800 ${size}px ${FONT.display}`;
    const widest = Math.max(...area.label.map((line) => g.measureText(line).width));
    return widest <= W - 70 && area.label.length * size * 0.98 <= H - 70;
  };
  while (size > 24 && !fits()) size -= 2;

  g.fillStyle = INK;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lineH = size * 0.98;
  const top = (H - 20 - lineH * area.label.length) / 2 + lineH / 2 + 4;
  area.label.forEach((line, i) => g.fillText(line, W / 2, top + i * lineH));
  return toTexture(c);
}

export function makeBeamTexture() {
  const [c, g] = makeCanvas(4, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  return toTexture(c);
}

// Balloon gores: alternating colour and cream panels around the envelope.
export function makeStripeTexture(color) {
  const [c, g] = makeCanvas(128, 8);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? PAPER : color;
    g.fillRect(i * 16, 0, 16, 8);
  }
  return toTexture(c);
}

// Two rows of arched windows on cream stone, tiled along each Capitol facade.
export function makeFacadeTexture() {
  const [c, g] = makeCanvas(128, 128);
  g.fillStyle = '#f7f1e6';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#e8dece';
  g.fillRect(0, 60, 128, 6);
  for (const y of [18, 78]) {
    for (const x of [14, 46, 78, 110]) {
      g.beginPath();
      g.roundRect(x - 8, y, 16, 30, [8, 8, 2, 2]);
      g.fillStyle = '#8fa6c2';
      g.fill();
    }
  }
  return toTexture(c);
}

export function makeFlagTexture() {
  const [c, g] = makeCanvas(96, 64);
  for (let i = 0; i < 7; i++) {
    g.fillStyle = i % 2 ? PAPER : '#e0645f';
    g.fillRect(0, (i * 64) / 7, 96, 64 / 7 + 1);
  }
  g.fillStyle = '#4f6fb0';
  g.fillRect(0, 0, 42, 34);
  return toTexture(c);
}

export function makeTitleSprite(bill, { sample }) {
  const W = 1024;
  const PAD = 40;
  const SIZE = 64;
  const LINE = 76;
  const SUB = 50; // the plain "what it does" line under the title
  const SUB_LINE = 62;
  const GAP = 12;
  const HEAD = 52;
  const LIP = 14;
  const [, probe] = makeCanvas(8, 8);
  probe.font = `800 ${SIZE}px ${FONT.body}`;
  const about = sample ? null : teaser(bill);
  const lines = wrapText(probe, bill.title, W - PAD * 2, about ? 2 : 4);
  probe.font = `600 ${SUB}px ${FONT.body}`;
  const subLines = about ? wrapText(probe, about, W - PAD * 2, 3) : [];
  const H = PAD * 2 + HEAD + lines.length * LINE + (subLines.length ? GAP + subLines.length * SUB_LINE : 0) + LIP;

  const [c, g] = makeCanvas(W, H);
  lipCard(g, 2, 2, W - 4, H - LIP - 4, 36, '#d8c8b0', LIP);
  g.textBaseline = 'top';
  g.fillStyle = INK_SOFT;
  g.font = `700 ${HEAD - 18}px ${FONT.mono}`;
  const header = sample ? `sample bill · ${billLabel(bill)}` : `${billLabel(bill)} · ${congressLabel(bill)}`;
  g.fillText(header.toLowerCase(), PAD, PAD);
  g.fillStyle = INK;
  g.font = `800 ${SIZE}px ${FONT.body}`;
  lines.forEach((line, i) => g.fillText(line, PAD, PAD + HEAD + i * LINE + (LINE - SIZE) / 2));
  g.fillStyle = INK_SOFT;
  g.font = `600 ${SUB}px ${FONT.body}`;
  const subTop = PAD + HEAD + lines.length * LINE + GAP;
  subLines.forEach((line, i) => g.fillText(line, PAD, subTop + i * SUB_LINE + (SUB_LINE - SUB) / 2));

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: toTexture(c), depthTest: false, transparent: true }));
  const width = 7.4;
  sprite.scale.set(width, (width * H) / W, 1);
  sprite.renderOrder = 10;
  return sprite;
}
