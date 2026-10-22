// The Capitol, low-poly and built from primitives. It does three jobs:
// launches each bill from the dome, grows one dome ring per correct sort,
// and gets a rain cloud when the round ends in gridlock.
import * as THREE from 'three';
import { WIN_SCORE } from './rules.js';
import { makeFacadeTexture, makeFlagTexture, rand } from './textures.js';

const RINGS = WIN_SCORE;
const DOME_R = 2.25;
const DOME_STRETCH = 1.3;
const DOME_BASE = 5.77; // top of the attic drum, local units
const DOME_TOP = DOME_BASE + DOME_R * DOME_STRETCH;
const RING_STEP = Math.PI / 2 / RINGS;
const POSITION = new THREE.Vector3(0, 1.2, -15);
const FW_MAX = 360;
const FW_COLORS = ['#ffd166', '#ef6a6a', '#7dd3fc', '#c4b5fd', '#86efac'].map((c) => new THREE.Color(c));

const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
const ease = (t) => 1 - (1 - t) ** 3;

export function buildCapitol(scene) {
  const root = new THREE.Group();
  root.position.copy(POSITION);
  scene.add(root);

  const facadeTex = makeFacadeTexture();
  facadeTex.wrapS = THREE.RepeatWrapping;
  const mats = {
    stone: lambert('#f7f1e6'),
    trim: lambert('#ece3d3'),
    dome: lambert('#fbf8f1'),
    bronze: lambert('#6f6a7d'),
    scaffold: lambert('#d4a56a'),
    hill: lambert('#79c27c'),
  };

  const add = (mesh, x, y, z, parent = root) => {
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const box = (w, h, d, x, y, z, mat = mats.stone) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z);
  const facade = (w, h, d, x, y, z) => {
    const tex = facadeTex.clone();
    tex.repeat.set(Math.round(w / 1.4), 1);
    const front = new THREE.MeshLambertMaterial({ map: tex });
    const m = mats.stone;
    return add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [m, m, m, m, front, m]), x, y, z);
  };
  const colGeo = (r, h) => new THREE.CylinderGeometry(r, r, h, 8);
  const colonnade = (count, x0, x1, y, z, h, r) => {
    const geo = colGeo(r, h);
    for (let i = 0; i < count; i++) add(new THREE.Mesh(geo, mats.stone), x0 + ((x1 - x0) * i) / (count - 1), y, z);
  };
  const pediment = (w, h, depth, x, baseY, z) => {
    const shape = new THREE.Shape().moveTo(-w / 2, 0).lineTo(w / 2, 0).lineTo(0, h).closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2);
    add(new THREE.Mesh(geo, mats.trim), x, baseY, z);
  };

  // Capitol Hill, terrace and steps
  add(new THREE.Mesh(new THREE.CylinderGeometry(12, 14, 1.2, 28), mats.hill), 0, -0.6, 0);
  box(24, 0.5, 7, 0, 0.25, 0, mats.trim);
  for (let i = 0; i < 3; i++) box(5.6, 0.17, 0.5, 0, 0.5 - 0.17 * (i + 0.5), 3.75 + 0.5 * i, mats.trim);

  // Central block, connectors, Senate wing (left from the Mall) and House wing (right)
  facade(8, 2.6, 5, 0, 1.8, 0);
  box(8.3, 0.25, 5.3, 0, 3.225, 0, mats.trim);
  for (const s of [-1, 1]) {
    facade(1.8, 2.2, 3.6, s * 4.9, 1.6, -0.3);
    facade(5.6, 2.4, 4.6, s * 8.6, 1.7, 0);
    box(5.9, 0.22, 4.9, s * 8.6, 3.01, 0, mats.trim);
    colonnade(6, s * 8.6 - 1.6, s * 8.6 + 1.6, 1.5, 2.75, 2.0, 0.12);
    box(3.9, 0.28, 0.9, s * 8.6, 2.64, 2.75, mats.trim);
    pediment(3.9, 0.65, 0.8, s * 8.6, 2.78, 2.75);
  }

  // Central portico
  colonnade(8, -2.7, 2.7, 1.65, 3.25, 2.3, 0.14);
  box(6.2, 0.3, 1.6, 0, 2.95, 3.0, mats.trim);
  pediment(6.4, 1.0, 1.4, 0, 3.1, 3.0);

  // Rotunda drum with its ring of columns, then the attic
  const dome = new THREE.Group();
  root.add(dome);
  add(new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.6, 1.5, 24), mats.stone), 0, 4.1, 0, dome);
  const periGeo = colGeo(0.085, 1.5);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    add(new THREE.Mesh(periGeo, mats.stone), Math.sin(a) * 2.95, 4.1, Math.cos(a) * 2.95, dome);
  }
  add(new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.15, 0.22, 32), mats.trim), 0, 4.96, 0, dome);
  add(new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.35, 0.7, 24), mats.stone), 0, 5.42, 0, dome);

  // The dome: one horizontal ring per correct sort, built bottom to top.
  const rings = [];
  for (let i = 0; i < RINGS; i++) {
    const geo = new THREE.SphereGeometry(DOME_R, 28, 1, 0, Math.PI * 2, Math.PI / 2 - (i + 1) * RING_STEP, RING_STEP);
    const ring = add(new THREE.Mesh(geo, lambert('#fbf8f1', { emissive: '#ffcf5a', emissiveIntensity: 0 })), 0, DOME_BASE, 0, dome);
    ring.scale.y = DOME_STRETCH;
    rings.push(ring);
  }

  const scaffold = new THREE.Group();
  const poleGeo = new THREE.CylinderGeometry(0.045, 0.045, 3.6, 4);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    add(new THREE.Mesh(poleGeo, mats.scaffold), Math.sin(a) * 2.6, DOME_BASE + 1.8, Math.cos(a) * 2.6, scaffold);
  }
  for (const y of [0.6, 1.8, 3.0]) {
    const hoop = add(new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.04, 4, 28), mats.scaffold), 0, DOME_BASE + y, 0, scaffold);
    hoop.rotation.x = Math.PI / 2;
  }
  dome.add(scaffold);

  // Lantern and the Statue of Freedom
  const crown = new THREE.Group();
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.8, 12), mats.stone), 0, 0.4, 0, crown);
  const cap = add(new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mats.dome), 0, 0.8, 0, crown);
  cap.scale.y = 0.9;
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.3, 8), mats.bronze), 0, 1.36, 0, crown);
  add(new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.55, 8), mats.bronze), 0, 1.785, 0, crown);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mats.bronze), 0, 2.12, 0, crown);
  add(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 5), mats.bronze), 0, 2.24, 0, crown);
  dome.add(crown);

  // Flags over each chamber
  const flagMat = new THREE.MeshLambertMaterial({ map: makeFlagTexture(), side: THREE.DoubleSide });
  const flags = [-1, 1].map((s) => {
    const pole = new THREE.Group();
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 4), mats.trim), 0, 0.55, 0, pole);
    const flag = add(new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.46), flagMat), 0.35, 0.86, 0, pole);
    pole.position.set(s * 8.6, 3.12, 0);
    root.add(pole);
    return flag;
  });

  // Gridlock: a grey cloud that parks over the dome and rains
  const cloud = new THREE.Group();
  const puffGeo = new THREE.IcosahedronGeometry(1, 1);
  const puffMat = lambert('#9aa0b3');
  for (let i = 0; i < 6; i++) {
    const puff = add(new THREE.Mesh(puffGeo, puffMat), (i - 2.5) * 1.1, rand(-0.2, 0.4), rand(-0.5, 0.5), cloud);
    puff.scale.setScalar(rand(0.9, 1.4));
  }
  const rainPos = new Float32Array(40 * 6);
  const rain = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(rainPos, 3)),
    new THREE.LineBasicMaterial({ color: '#7b8fb5', transparent: true, opacity: 0.8 }),
  );
  for (let i = 0; i < 40; i++) {
    const x = rand(-3, 3);
    const z = rand(-1.5, 1.5);
    const y = rand(-6, -0.8);
    rainPos.set([x, y, z, x, y - 0.35, z], i * 6);
  }
  cloud.add(rain);
  cloud.visible = false;
  root.add(cloud);

  // Fireworks for the win
  const fwPos = new Float32Array(FW_MAX * 3).fill(-100);
  const fwCol = new Float32Array(FW_MAX * 3);
  const fwVel = new Float32Array(FW_MAX * 3);
  const fwBase = new Float32Array(FW_MAX * 3);
  const fwLife = new Float32Array(FW_MAX);
  const fwGeo = new THREE.BufferGeometry();
  fwGeo.setAttribute('position', new THREE.BufferAttribute(fwPos, 3));
  fwGeo.setAttribute('color', new THREE.BufferAttribute(fwCol, 3));
  const fireworks = new THREE.Points(fwGeo, new THREE.PointsMaterial({
    size: 0.24, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  fireworks.frustumCulled = false;
  root.add(fireworks);
  let fwNext = 0;
  let fwQueue = [];

  function burst(origin, color) {
    for (let k = 0; k < FW_MAX / 3; k++) {
      const i = fwNext;
      fwNext = (fwNext + 1) % FW_MAX;
      const dir = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(2.2, 3.8));
      fwPos.set([origin.x, origin.y, origin.z], i * 3);
      fwVel.set([dir.x, dir.y, dir.z], i * 3);
      color.toArray(fwBase, i * 3);
      fwLife[i] = 1;
    }
  }

  function updateFireworks(dt) {
    fwQueue = fwQueue.filter((b) => {
      b.at -= dt;
      if (b.at > 0) return true;
      burst(b.origin, b.color);
      return false;
    });
    for (let i = 0; i < FW_MAX; i++) {
      if (fwLife[i] <= 0) continue;
      fwLife[i] = Math.max(0, fwLife[i] - dt / 1.8);
      fwVel[i * 3 + 1] -= 2.5 * dt;
      for (let a = 0; a < 3; a++) {
        fwPos[i * 3 + a] = fwLife[i] > 0 ? fwPos[i * 3 + a] + fwVel[i * 3 + a] * dt : -100;
        fwCol[i * 3 + a] = fwBase[i * 3 + a] * fwLife[i];
      }
    }
    fwGeo.attributes.position.needsUpdate = true;
    fwGeo.attributes.color.needsUpdate = true;
  }

  // ─── State ───────────────────────────────────────────────────────────────
  let built = 0;
  let pulseT = 0;
  let crownT = 1;
  let cloudT = 0;
  let pops = [];

  function showRings(n) {
    rings.forEach((ring, i) => { ring.visible = i < n; });
    scaffold.visible = n < RINGS;
  }

  function setProgress(n) {
    const next = THREE.MathUtils.clamp(n, 0, RINGS);
    if (next > built) pops.push({ ring: rings[next - 1], t: 0 });
    built = next;
    showRings(built);
  }

  function complete({ instant = false } = {}) {
    setProgress(RINGS);
    if (instant) pops = [];
    crown.visible = true;
    crownT = instant ? 1 : 0;
    if (!instant) {
      fwQueue = [0, 0.5, 1.0, 1.5].map((at, i) => ({
        at, color: FW_COLORS[i % FW_COLORS.length],
        origin: new THREE.Vector3(rand(-7, 7), DOME_TOP + rand(0.5, 2.5), rand(0, 2)),
      }));
    }
  }

  function reset() {
    built = 0;
    pops = [];
    rings.forEach((ring) => { ring.material.emissiveIntensity = 0; ring.scale.set(1, DOME_STRETCH, 1); });
    showRings(0);
    crown.visible = false;
    setGridlock(false);
    fwQueue = [];
    fwLife.fill(0);
    fwPos.fill(-100);
  }

  function setGridlock(on) {
    cloud.visible = on;
    cloudT = 0;
  }

  // Where the next bill pops out: the top of whatever dome is built so far.
  function launchPoint(target) {
    const y = crown.visible ? DOME_TOP + 1 : DOME_BASE + DOME_R * DOME_STRETCH * Math.sin(built * RING_STEP) + 0.3;
    root.updateMatrixWorld();
    return root.localToWorld(target.set(0, y, 0));
  }

  function pulse() {
    pulseT = 1;
  }

  function update(dt, t) {
    pulseT = Math.max(0, pulseT - dt * 4);
    dome.scale.setScalar(1 + 0.05 * Math.sin(pulseT * Math.PI));

    pops = pops.filter((p) => {
      p.t = Math.min(1, p.t + dt / 0.6);
      p.ring.material.emissiveIntensity = 0.9 * (1 - p.t);
      const s = 1 + 0.12 * (1 - ease(p.t));
      p.ring.scale.set(s, DOME_STRETCH * s, s);
      return p.t < 1;
    });

    if (crown.visible && crownT < 1) crownT = Math.min(1, crownT + dt / 1.2);
    crown.position.y = DOME_TOP + 4 * (1 - ease(crownT));

    flags.forEach((flag, i) => { flag.rotation.y = Math.sin(t * 3 + i) * 0.25; });

    if (cloud.visible) {
      cloudT = Math.min(1, cloudT + dt / 1.5);
      cloud.position.set(0, DOME_TOP + 2.6 + 5 * (1 - ease(cloudT)) + Math.sin(t * 1.3) * 0.15, 0.5);
      for (let i = 0; i < 40; i++) {
        let y = rainPos[i * 6 + 1] - dt * 9;
        if (y < -6) y = -0.8;
        rainPos[i * 6 + 1] = y;
        rainPos[i * 6 + 4] = y - 0.35;
      }
      rain.geometry.attributes.position.needsUpdate = true;
    }
    updateFireworks(dt);
  }

  complete({ instant: true });
  return { root, launchPoint, pulse, setProgress, complete, reset, setGridlock, update, get built() { return built; } };
}
