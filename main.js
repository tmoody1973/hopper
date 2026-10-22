import * as THREE from 'three';
import { AREA_BY_NAME, AREAS, WIN_SCORE, MAX_WRONG_PER_BIN, SPAWN_INTERVAL, billLabel, isCorrectSort } from './rules.js';
import { loadBills, shuffle } from './data.js';
import { FONT, makeCrateTexture, makeTitleSprite, setMaxAnisotropy, rand } from './textures.js';
import { BIN, buildWorld, addWrongMarker, clearBin, flash } from './world.js';
import { buildCapitol } from './capitol.js';
import { sfx, unlock, isMuted, setMuted } from './audio.js';
import { initPage, setBills } from './page.js';

// ─── Config ────────────────────────────────────────────────────────────────
const CONFIG = {
  // Congress.gov API key. Get a free one at https://api.data.gov/signup/
  // (the same key works for api.congress.gov). Leave empty to use ./bills.json.
  // Anything here is visible to every visitor: for a public site, leave it empty
  // and run scripts/refresh-bills.mjs instead, which keeps the key on your machine.
  API_KEY: '',
};

const BASE_FALL_SPEED = 0.7;
const FALL_SPEED_RAMP = 0.012; // per correct sort
const TOAST_MS = 2000;
const END_SCREEN_DELAY_MS = 1600; // long enough for the fanfare or the trombone
const FIRST_SPAWN_DELAY = 1.4; // let the camera settle and the gavel land
const CRATE_TINT = 0.32; // how far crate wood leans toward its policy colour (the subtle hint)
const DRAG_FOLLOW = 18;
const LAUNCH_TIME = 0.9;
const SORT_TIME = 0.45;
const VANISH_TIME = 0.5;
const CAMERA_MOVE_TIME = 1.2;
const MAX_DT = 0.05;
const BASE_FOV = 50;
const MIN_H_FOV = 80;

// Bills fall either side of the dome so their title cards never hide it.
const SPAWN = { y: 9, z: -2.5, xMin: 4.5, xMax: 8.5 };
const GAME_VIEW = { pos: new THREE.Vector3(0, 11.5, 19), look: new THREE.Vector3(0, 3.6, 0) };
const HERO_VIEW = { pos: new THREE.Vector3(0, 13, 31), look: new THREE.Vector3(0, 4.5, -5) };

// ─── DOM ───────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const canvas = $('scene');
const ui = {
  score: $('score'), misses: $('misses'), source: $('source'), bins: $('bins'), title: $('title'),
  toast: $('toast'), overlay: $('overlay'), card: $('card'), mute: $('mute'), pause: $('pause'), playNote: $('play-note'),
};

let renderer;
let world;
let capitol;
let crateTexture;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(BASE_FOV, 16 / 9, 0.1, 160);
camera.position.copy(GAME_VIEW.pos);
camera.lookAt(GAME_VIEW.look);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tmpVec = new THREE.Vector3();
const lookAt = GAME_VIEW.look.clone();

// Slanted drag surface from the drop zone down to the bin tops, so a held
// crate always sits in front of whatever bin the cursor points at.
const dragPlane = (() => {
  const top = new THREE.Vector3(0, 10, SPAWN.z);
  const bottom = new THREE.Vector3(0, BIN.h + 0.4, BIN.z);
  const along = bottom.clone().sub(top);
  const normal = new THREE.Vector3(0, along.z, -along.y).normalize();
  return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, bottom);
})();

const game = {
  phase: 'loading', // loading | ready | playing | paused | over
  source: 'local',
  bills: [],
  deck: [],
  deckIndex: 0,
  score: 0,
  misses: 0,
  streak: 0,
  wrongs: freshWrongs(),
  crates: [],
  spawnTimer: 0,
  side: 1,
  endTimer: null,
};

const cam = { from: { pos: GAME_VIEW.pos.clone(), look: GAME_VIEW.look.clone() }, to: GAME_VIEW, t: 1 };
let dragging = null;
let hovered = null;
let hoverBin = null;
let toastTimer = null;
let titleKey = '';
let lastTime = null;
let elapsed = 0;
let heroVisible = true;

function freshWrongs() {
  return Object.fromEntries(AREAS.map((a) => [a.name, 0]));
}

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// ─── Camera ────────────────────────────────────────────────────────────────
function setView(view, instant = false) {
  cam.from = instant ? { pos: view.pos.clone(), look: view.look.clone() } : { pos: camera.position.clone(), look: lookAt.clone() };
  cam.to = view;
  cam.t = instant ? 1 : 0;
}

function updateCamera(dt) {
  cam.t = Math.min(1, cam.t + dt / CAMERA_MOVE_TIME);
  const k = ease(cam.t);
  camera.position.lerpVectors(cam.from.pos, cam.to.pos, k);
  lookAt.lerpVectors(cam.from.look, cam.to.look, k);
  if (cam.to === HERO_VIEW) camera.position.x += Math.sin(elapsed * 0.15) * 2.5 * k;
  camera.lookAt(lookAt);
}

// ─── Crates ────────────────────────────────────────────────────────────────
function crateSize(title) {
  const t = THREE.MathUtils.clamp((title.length - 30) / 170, 0, 1);
  const s = 0.95 + t * 0.55;
  return { w: s * 1.12, h: s * 0.92, d: s };
}

function nextBill() {
  if (game.deckIndex >= game.deck.length) {
    game.deck = shuffle(game.bills);
    game.deckIndex = 0;
  }
  return game.deck[game.deckIndex++];
}

function spawnCrate() {
  const bill = nextBill();
  const size = crateSize(bill.title);
  const tint = new THREE.Color('#ffffff').lerp(new THREE.Color(AREA_BY_NAME.get(bill.policyArea).color), CRATE_TINT);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size.w, size.h, size.d),
    new THREE.MeshLambertMaterial({ map: crateTexture, color: tint }),
  );
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.rotation.y = rand(-0.4, 0.4);
  const balloon = world.balloons.forCrate(size);
  const sprite = makeTitleSprite(bill, { sample: game.source === 'local' });
  sprite.position.y = balloon.top + 0.3 + sprite.scale.y / 2;

  const group = new THREE.Group();
  group.add(mesh, balloon.group, sprite);
  game.side = -game.side;
  const to = new THREE.Vector3(game.side * rand(SPAWN.xMin, SPAWN.xMax), SPAWN.y, SPAWN.z);
  const from = capitol.launchPoint(new THREE.Vector3());
  const ctrl = from.clone().lerp(to, 0.5);
  ctrl.y = Math.max(from.y, to.y) + 4;
  group.position.copy(from);
  group.scale.setScalar(0.3);
  sprite.material.opacity = 0;
  scene.add(group);

  const crate = {
    bill, size, group, mesh, sprite, balloon,
    state: 'launching', // launching | falling | dragging | sorting | vanishing | done
    from, ctrl, to,
    target: to.clone(),
    anim: 0,
    seed: rand(0, 10),
  };
  mesh.userData.crate = crate;
  sprite.userData.crate = crate;
  balloon.envelope.userData.crate = crate;
  game.crates.push(crate);
  capitol.pulse();
  sfx.launch();
}

function disposeCrate(crate) {
  scene.remove(crate.group);
  crate.mesh.geometry.dispose();
  crate.mesh.material.dispose();
  crate.sprite.material.map.dispose();
  crate.sprite.material.dispose();
  crate.balloon.strings.geometry.dispose();
}

function updateLaunch(crate, dt) {
  crate.anim = Math.min(1, crate.anim + dt / LAUNCH_TIME);
  const t = crate.anim;
  crate.group.position.copy(crate.from).multiplyScalar((1 - t) ** 2)
    .addScaledVector(crate.ctrl, 2 * (1 - t) * t)
    .addScaledVector(crate.to, t * t);
  crate.group.scale.setScalar(0.3 + 0.7 * (1 - (1 - t) ** 3));
  crate.sprite.material.opacity = t;
  if (t >= 1) {
    crate.state = 'falling';
    crate.anim = 0;
  }
}

function updateCrate(crate, dt, speed) {
  const pos = crate.group.position;
  if (crate.state === 'launching') {
    updateLaunch(crate, dt);
  } else if (crate.state === 'falling') {
    if (game.phase !== 'playing') return;
    pos.y -= speed * dt;
    crate.mesh.rotation.y += 0.2 * dt;
    crate.group.rotation.z = Math.sin(elapsed * 1.3 + crate.seed) * 0.04;
    if (pos.y - crate.size.h / 2 <= 0) {
      pos.y = crate.size.h / 2;
      registerMiss(crate);
    }
  } else if (crate.state === 'dragging') {
    pos.lerp(crate.target, 1 - Math.exp(-DRAG_FOLLOW * dt));
    crate.group.rotation.z = 0;
  } else if (crate.state === 'sorting' || crate.state === 'vanishing') {
    crate.anim = Math.min(1, crate.anim + dt / (crate.state === 'sorting' ? SORT_TIME : VANISH_TIME));
    const t = crate.anim;
    if (crate.state === 'sorting') {
      pos.lerpVectors(crate.from, crate.to, t * (2 - t));
      pos.y += Math.sin(t * Math.PI) * 0.5;
      crate.group.scale.setScalar(1 - 0.55 * t);
      const k = Math.max(0, 1 - t * 5); // the balloon pops
      crate.balloon.envelope.scale.set(k, 1.15 * k, k);
      crate.balloon.strings.visible = k > 0;
    } else {
      crate.balloon.group.position.y += dt * 4; // the balloon floats off
      crate.mesh.scale.setScalar(1 - t);
    }
    crate.sprite.material.opacity = 1 - t;
    if (t >= 1) crate.state = 'done';
  }
}

function registerMiss(crate) {
  crate.state = 'vanishing';
  crate.anim = 0;
  game.misses++;
  game.streak = 0;
  sfx.plop();
  updateHud();
}

// ─── Grading and rounds ────────────────────────────────────────────────────
function sortCrate(crate, bin) {
  crate.state = 'sorting';
  crate.anim = 0;
  crate.from = crate.group.position.clone();
  crate.to = new THREE.Vector3(bin.x, 0.5, BIN.z);

  const actual = crate.bill.policyArea;
  if (isCorrectSort(crate.bill, bin.area.name)) {
    game.score++;
    sfx.correct(game.streak++);
    flash(bin, 'good');
    capitol.setProgress(game.score);
    toast(['✓ Correct: ', el('em', { textContent: actual })], 'good');
  } else {
    game.wrongs[bin.area.name]++;
    game.streak = 0;
    sfx.wrong();
    addWrongMarker(bin);
    flash(bin, 'bad');
    const realBin = world.bins.find((b) => b.area.name === actual);
    if (realBin) flash(realBin, 'hint');
    toast([`✗ Not ${bin.area.name}. This bill is `, el('em', { textContent: actual })], 'bad');
  }
  updateHud();

  if (game.score >= WIN_SCORE) endRound(true);
  else if (game.wrongs[bin.area.name] >= MAX_WRONG_PER_BIN) endRound(false);
}

function endRound(won) {
  game.phase = 'over';
  releaseDrag();
  if (won) {
    capitol.complete();
    sfx.win();
  } else {
    capitol.setGridlock(true);
    sfx.lose();
  }
  clearTimeout(game.endTimer);
  game.endTimer = setTimeout(() => showEndCard(won), END_SCREEN_DELAY_MS);
}

function clearRound() {
  clearTimeout(game.endTimer);
  releaseDrag();
  game.crates.forEach(disposeCrate);
  game.crates = [];
  world.bins.forEach(clearBin);
  hovered = null;
  ui.toast.classList.remove('show');
}

function startRound() {
  clearRound();
  capitol.reset();
  Object.assign(game, {
    phase: 'playing',
    deck: shuffle(game.bills),
    deckIndex: 0,
    score: 0,
    misses: 0,
    streak: 0,
    wrongs: freshWrongs(),
    spawnTimer: FIRST_SPAWN_DELAY,
    endTimer: null,
  });
  sfx.gavel();
  updateHud();
  hideCard();
}

function enterGame() {
  if (game.bills.length === 0 || !renderer || game.phase !== 'ready') return;
  unlock();
  sfx.click();
  document.body.classList.add('playing');
  window.scrollTo(0, 0);
  resize();
  setView(GAME_VIEW);
  startRound();
}

function leaveGame() {
  clearRound();
  game.phase = 'ready';
  capitol.reset();
  capitol.complete({ instant: true });
  hideCard();
  document.body.classList.remove('playing');
  resize();
  setView(HERO_VIEW);
}

// Pausing freezes the whole loop and covers the scene, so titles can't be read ahead.
function pauseGame() {
  if (game.phase !== 'playing') return;
  releaseDrag();
  game.phase = 'paused';
  showCard({
    title: 'Paused',
    lines: ['The bills are holding still, and their titles stay hidden until you come back.'],
    stats: [['sorted', game.score], ['missed', game.misses]],
    buttons: [
      { label: 'Resume', kind: 'play', onClick: resumeGame },
      { label: 'Back to the page', kind: 'ghost', onClick: leaveGame },
    ],
    solid: true,
  });
}

function resumeGame() {
  if (game.phase !== 'paused') return;
  game.phase = 'playing';
  hideCard();
  sfx.click();
}

// ─── Pointer input ─────────────────────────────────────────────────────────
function setPointer(e) {
  const rect = canvas.getBoundingClientRect();
  pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
}

function crateUnderPointer() {
  const targets = game.crates.filter((c) => c.state === 'falling').flatMap((c) => [c.mesh, c.sprite, c.balloon.envelope]);
  const hit = raycaster.intersectObjects(targets, false)[0];
  return hit ? hit.object.userData.crate : null;
}

function binUnderPointer() {
  const hit = raycaster.intersectObjects(world.hitboxes.children, false)[0];
  return hit ? hit.object.userData.bin : null;
}

function updateDragTarget() {
  if (!raycaster.ray.intersectPlane(dragPlane, tmpVec)) return;
  tmpVec.x = THREE.MathUtils.clamp(tmpVec.x, -11.5, 11.5);
  tmpVec.y = Math.max(tmpVec.y, dragging.size.h / 2 + 0.05);
  tmpVec.z = Math.min(tmpVec.z, BIN.z + 1.2);
  dragging.target.copy(tmpVec);
}

function releaseDrag() {
  if (dragging && dragging.state === 'dragging') dragging.state = 'falling';
  dragging = null;
  hoverBin = null;
  world?.bins.forEach((b) => { b.hover = false; });
  canvas.style.cursor = '';
}

function onPointerDown(e) {
  if (game.phase !== 'playing' || e.button !== 0 || dragging) return;
  setPointer(e);
  const crate = crateUnderPointer();
  if (!crate) return;
  e.preventDefault();
  dragging = crate;
  crate.state = 'dragging';
  crate.mesh.rotation.y = 0;
  updateDragTarget();
  canvas.style.cursor = 'grabbing';
  sfx.grab();
}

function onPointerMove(e) {
  if (game.phase !== 'playing') return;
  setPointer(e);
  if (dragging) {
    updateDragTarget();
    const over = binUnderPointer();
    if (over && over !== hoverBin) sfx.hover();
    hoverBin = over;
    world.bins.forEach((b) => { b.hover = b === over; });
    return;
  }
  hovered = crateUnderPointer();
  canvas.style.cursor = hovered ? 'grab' : '';
}

function onPointerUp(e) {
  if (!dragging) return;
  setPointer(e);
  const crate = dragging;
  const bin = binUnderPointer();
  releaseDrag();
  if (bin && game.phase === 'playing') sortCrate(crate, bin);
}

function onKeyDown(e) {
  if (!document.body.classList.contains('playing')) return;
  if (e.key === 'm' || e.key === 'M') toggleMute();
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
    if (game.phase === 'playing') pauseGame();
    else if (game.phase === 'paused') resumeGame();
  }
}

// ─── HUD ───────────────────────────────────────────────────────────────────
const binHudRows = new Map();

function buildBinHud() {
  for (const area of AREAS) {
    const dots = Array.from({ length: MAX_WRONG_PER_BIN }, () => el('span', { className: 'dot' }));
    const row = el('li', {}, [el('span', { textContent: area.name }), el('span', { className: 'dots' }, dots)]);
    ui.bins.append(row);
    binHudRows.set(area.name, { row, dots });
  }
}

function updateHud() {
  ui.score.textContent = String(game.score);
  ui.misses.textContent = String(game.misses);
  for (const [name, { row, dots }] of binHudRows) {
    const wrong = game.wrongs[name];
    dots.forEach((dot, i) => dot.classList.toggle('on', i < wrong));
    row.classList.toggle('danger', wrong >= MAX_WRONG_PER_BIN - 1);
  }
}

function renderMuteButton() {
  ui.mute.textContent = isMuted() ? 'sound off' : 'sound on';
  ui.mute.setAttribute('aria-pressed', String(!isMuted()));
}

function toggleMute() {
  setMuted(!isMuted());
  renderMuteButton();
  sfx.click();
}

function toast(parts, kind) {
  ui.toast.replaceChildren(...parts);
  ui.toast.className = `panel show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), TOAST_MS);
}

function focusCrate() {
  if (dragging) return { crate: dragging, verb: 'holding' };
  if (hovered?.state === 'falling') return { crate: hovered, verb: 'pointing at' };
  const falling = game.crates.filter((c) => c.state === 'falling');
  if (falling.length === 0) return null;
  const lowest = falling.reduce((a, b) => (a.group.position.y < b.group.position.y ? a : b));
  return { crate: lowest, verb: 'next to land' };
}

function updateTitlePanel() {
  const focus = game.phase === 'playing' ? focusCrate() : null;
  const key = focus ? `${focus.verb}|${billLabel(focus.crate.bill)}` : '';
  if (key === titleKey) return;
  titleKey = key;
  ui.title.classList.toggle('show', Boolean(focus));
  if (!focus) return;
  const { bill } = focus.crate;
  const label = `${focus.verb} · ${game.source === 'local' ? 'sample bill · ' : ''}${billLabel(bill)}`;
  ui.title.replaceChildren(el('small', { textContent: label.toLowerCase() }), bill.title);
}

function showCard({ title, lines = [], stats = [], buttons = [], solid = false }) {
  ui.overlay.classList.toggle('solid', solid);
  const children = [el('h2', { textContent: title }), ...lines.map((text) => el('p', { textContent: text }))];
  if (stats.length) {
    children.push(el('div', { className: 'big' }, stats.map(([label, value]) => el('div', {}, [el('b', { textContent: String(value) }), label]))));
  }
  const btns = buttons.map(({ label, kind, onClick }) => {
    const btn = el('button', { type: 'button', className: `btn ${kind}`, textContent: label });
    btn.addEventListener('click', onClick);
    return btn;
  });
  if (btns.length) children.push(el('div', { className: 'cta' }, btns));
  ui.card.replaceChildren(...children);
  ui.overlay.classList.remove('hidden');
  btns[0]?.focus();
}

function hideCard() {
  ui.overlay.classList.add('hidden');
  ui.overlay.classList.remove('solid');
}

function showEndCard(won) {
  showCard({
    title: won ? 'The dome is finished.' : 'Gridlock.',
    lines: [won
      ? `${WIN_SCORE} bills sorted. Freedom is back on top of the Capitol.`
      : `One bin collected ${MAX_WRONG_PER_BIN} wrong bills. Nothing moves until the next session.`],
    stats: [['sorted', game.score], ['missed', game.misses]],
    buttons: [
      { label: 'Play again', kind: 'play', onClick: () => { sfx.click(); startRound(); } },
      { label: 'Back to the page', kind: 'ghost', onClick: leaveGame },
    ],
  });
}

// ─── Loop ──────────────────────────────────────────────────────────────────
function update(dt) {
  elapsed += dt;
  if (game.phase === 'playing') {
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      spawnCrate();
      game.spawnTimer += SPAWN_INTERVAL;
    }
  }
  const speed = BASE_FALL_SPEED + game.score * FALL_SPEED_RAMP;
  game.crates.forEach((crate) => updateCrate(crate, dt, speed));
  const finished = game.crates.filter((c) => c.state === 'done');
  if (finished.length) {
    finished.forEach(disposeCrate);
    game.crates = game.crates.filter((c) => c.state !== 'done');
  }
  updateCamera(dt);
  world.update(dt, elapsed);
  capitol.update(dt, elapsed);
  updateTitlePanel();
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, MAX_DT);
  lastTime = now;
  if (game.phase === 'paused') return; // frozen and hidden behind the pause card
  if (!heroVisible && !document.body.classList.contains('playing')) return; // scrolled past the scene
  update(dt);
  renderer.render(scene, camera);
}

function resize() {
  if (!renderer) return;
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Keep all eight bins in view on narrow screens by widening the vertical FOV.
  const fitFov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(MIN_H_FOV / 2)) / camera.aspect));
  camera.fov = Math.max(BASE_FOV, fitFov);
  camera.updateProjectionMatrix();
}

// Canvas textures are painted once, so the fonts must be loaded first.
async function loadFonts() {
  if (!document.fonts?.load) return;
  const faces = [`800 64px ${FONT.display}`, `800 64px ${FONT.body}`, `700 32px ${FONT.mono}`];
  const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
  await Promise.race([Promise.all(faces.map((f) => document.fonts.load(f))), timeout]).catch(() => {});
}

async function init() {
  initPage({ onPlay: enterGame });
  buildBinHud();
  updateHud();
  renderMuteButton();
  ui.mute.addEventListener('click', toggleMute);
  ui.pause.addEventListener('click', pauseGame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
  const billsLoading = loadBills(CONFIG.API_KEY);
  await loadFonts();

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());

  world = buildWorld(scene, camera); // bin signs face the game camera, so build before moving it
  capitol = buildCapitol(scene);
  crateTexture = makeCrateTexture();
  setView(HERO_VIEW, true);

  resize();
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', releaseDrag);
  window.addEventListener('blur', pauseGame); // also drops any held crate
  window.addEventListener('keydown', onKeyDown);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; }).observe($('top'));
  }
  requestAnimationFrame(loop);

  const { bills, source, fetched } = await billsLoading;
  game.bills = bills;
  game.source = source;
  if (bills.length) game.phase = 'ready';
  ui.source.textContent = { live: 'live bills · congress.gov', snapshot: `real bills · congress.gov · ${fetched}`, local: 'sample bills · made up' }[source];
  setBills(bills, source, fetched);
}

init().catch((err) => {
  console.error(err);
  for (const btn of document.querySelectorAll('[data-play]')) btn.disabled = true;
  ui.playNote.textContent = 'this browser could not start the 3D scene (WebGL)';
});

// Read-only handles for the headless test harness; unused by the page itself.
export const debug = { game, camera, startRound, enterGame, leaveGame, world: () => world, capitol: () => capitol };
