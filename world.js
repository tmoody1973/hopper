// The floating island: lights, sky, lawn, trees, clouds, confetti, balloons and the eight bins.
import * as THREE from 'three';
import { AREAS } from './rules.js';
import {
  makeGrassTexture, makeSkyTexture, makeSignTexture, makeBeamTexture, makeStripeTexture, rand, PAPER,
} from './textures.js';

export const BIN = { w: 2.5, h: 1.2, d: 2.0, z: 5.5, spacing: 2.75, wall: 0.12 };
const SIGN = { w: 2.6, h: 1.625 };
const BALLOON_COLORS = ['#ef6a6a', '#f2bd4f', '#4fb3a9', '#9b7fd4', '#6c9fe0'];
const ISLAND = { radius: 30, z: -4 };

const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });

function shadowed(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addLights(scene) {
  scene.add(new THREE.HemisphereLight('#fff4e2', '#7fb07a', 1.5));
  const sun = new THREE.DirectionalLight('#fff1dc', 2.2);
  sun.position.set(-14, 26, 14);
  sun.target.position.set(0, 0, -4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 80 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
}

function addIsland(scene) {
  const top = new THREE.MeshLambertMaterial({ map: makeGrassTexture() });
  const soil = lambert('#c99b6a');
  const lawn = new THREE.Mesh(new THREE.CylinderGeometry(ISLAND.radius, ISLAND.radius - 0.6, 1.2, 64), [soil, top, soil]);
  lawn.position.set(0, -0.6, ISLAND.z);
  lawn.receiveShadow = true;
  const rock = new THREE.Mesh(new THREE.ConeGeometry(ISLAND.radius - 0.6, 16, 14), lambert('#a58c74'));
  rock.rotation.x = Math.PI;
  rock.position.set(0, -9.2, ISLAND.z);

  const sand = lambert('#efdcb2');
  const path = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 15), sand);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.012, -4.5);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(24.5, 3.2), sand);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.011, BIN.z);
  path.receiveShadow = plaza.receiveShadow = true;
  scene.add(lawn, rock, path, plaza);
}

function addTrees(scene) {
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.17, 0.8, 6);
  const roundGeo = new THREE.IcosahedronGeometry(0.85, 0);
  const pineGeo = new THREE.ConeGeometry(0.8, 1.6, 7);
  const trunkMat = lambert('#9b7552');
  const leafMats = ['#6cbf6a', '#5aaf63', '#79c27c'].map((c) => lambert(c));
  const pineMat = lambert('#4f9e74');
  const spots = [];
  for (const x of [-13, -16, 13, 16]) for (let z = -13; z <= 9; z += 4.4) spots.push([x + rand(-0.6, 0.6), z + rand(-0.8, 0.8)]);
  for (const x of [-20, -23, 20, 23]) for (let z = -18; z <= 2; z += 5) spots.push([x + rand(-1, 1), z + rand(-1, 1)]);

  for (const [x, z] of spots) {
    const tree = new THREE.Group();
    const s = rand(0.85, 1.25);
    const trunk = shadowed(new THREE.Mesh(trunkGeo, trunkMat));
    trunk.position.y = 0.4;
    tree.add(trunk);
    if (Math.random() < 0.3) {
      for (const [y, k] of [[1.3, 1], [2.0, 0.75]]) {
        const cone = shadowed(new THREE.Mesh(pineGeo, pineMat));
        cone.position.y = y;
        cone.scale.setScalar(k);
        tree.add(cone);
      }
    } else {
      const crown = shadowed(new THREE.Mesh(roundGeo, leafMats[Math.floor(Math.random() * leafMats.length)]));
      crown.position.y = 1.45;
      crown.rotation.set(rand(0, 3), rand(0, 3), 0);
      tree.add(crown);
    }
    tree.position.set(x, 0, z);
    tree.scale.setScalar(s);
    scene.add(tree);
  }
}

function addClouds(scene) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const mat = lambert('#ffffff', { emissive: '#3a3550', emissiveIntensity: 0.15 });
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const cloud = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const puff = new THREE.Mesh(geo, mat);
      puff.position.set((k - 2) * 1.3 + rand(-0.3, 0.3), rand(-0.3, 0.6), rand(-0.6, 0.6));
      puff.scale.setScalar(rand(0.9, 1.6) * (k === 2 ? 1.3 : 1));
      cloud.add(puff);
    }
    const side = i % 2 ? 1 : -1;
    cloud.position.set(side * rand(30, 42), rand(-4, 6), rand(-34, 8));
    cloud.scale.setScalar(rand(1, 1.8));
    cloud.userData.speed = rand(0.15, 0.4);
    scene.add(cloud);
    clouds.push(cloud);
  }
  return clouds;
}

function addConfetti(scene) {
  const count = 160;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = ['#ffffff', '#f6c1d0', '#c9b8f0', '#fbe08a', '#a8e0f0'].map((c) => new THREE.Color(c));
  for (let i = 0; i < count; i++) {
    positions.set([rand(-24, 24), rand(0.5, 14), rand(-20, 12)], i * 3);
    palette[i % palette.length].toArray(colors, i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, opacity: 0.85 }));
  scene.add(points);
  return points;
}

// Shared balloon parts: crates ride under small ones; two big ones decorate the sky.
function makeBalloonKit() {
  const envelopeGeo = new THREE.SphereGeometry(0.62, 12, 9);
  const mats = BALLOON_COLORS.map((c) => new THREE.MeshLambertMaterial({ map: makeStripeTexture(c), flatShading: true }));
  const stringMat = new THREE.LineBasicMaterial({ color: '#7a6a5a' });

  // Returns a group to add to a crate; strings are per-crate geometry (dispose with the crate).
  function forCrate(size) {
    const group = new THREE.Group();
    const envelope = new THREE.Mesh(envelopeGeo, mats[Math.floor(Math.random() * mats.length)]);
    envelope.scale.set(1, 1.15, 1);
    const bottom = size.h / 2 + 0.75;
    envelope.position.y = bottom + 0.62 * 1.15;
    envelope.castShadow = true;
    const pts = [];
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      pts.push(sx * 0.18, bottom + 0.05, sz * 0.18, sx * size.w * 0.42, size.h / 2, sz * size.d * 0.42);
    }
    const strings = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)),
      stringMat,
    );
    group.add(envelope, strings);
    return { group, envelope, strings, top: envelope.position.y + 0.62 * 1.15 };
  }

  function decorative(colorIndex, scale) {
    const group = new THREE.Group();
    const envelope = new THREE.Mesh(envelopeGeo, mats[colorIndex]);
    envelope.scale.set(scale, scale * 1.15, scale);
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.4 * scale, 0.3 * scale, 0.4 * scale), lambert('#b98a5b'));
    basket.position.y = -0.62 * scale * 1.15 - 0.55 * scale;
    group.add(envelope, basket);
    return group;
  }

  return { forCrate, decorative };
}

// ─── Bins ──────────────────────────────────────────────────────────────────
const GLOW = {
  good: { color: new THREE.Color('#7dffa0'), duration: 1.4, peak: 0.95 },
  bad: { color: new THREE.Color('#ff4a4a'), duration: 1.0, peak: 1 },
  hint: { color: new THREE.Color('#ffc23d'), duration: 2.0, peak: 0.75 },
  hover: { color: new THREE.Color('#fff6e4'), peak: 0.28 },
};

function buildBin(scene, area, x, shared, camera) {
  const group = new THREE.Group();
  group.position.set(x, 0, BIN.z);
  const { w, h, d, wall } = BIN;
  const body = lambert(new THREE.Color(area.color).lerp(new THREE.Color('#ffffff'), 0.12));
  const parts = [
    [w, wall, d, 0, wall / 2, 0, body],
    [w, h, wall, 0, h / 2, d / 2 - wall / 2, body],
    [w, h, wall, 0, h / 2, -d / 2 + wall / 2, body],
    [wall, h, d - wall * 2, w / 2 - wall / 2, h / 2, 0, body],
    [wall, h, d - wall * 2, -w / 2 + wall / 2, h / 2, 0, body],
    [w + 0.1, 0.1, 0.22, 0, h, d / 2 - 0.08, shared.rim],
    [w + 0.1, 0.1, 0.22, 0, h, -d / 2 + 0.08, shared.rim],
    [0.22, 0.1, d, w / 2 - 0.08, h, 0, shared.rim],
    [0.22, 0.1, d, -w / 2 + 0.08, h, 0, shared.rim],
  ];
  for (const [sx, sy, sz, px, py, pz, mat] of parts) {
    const part = shadowed(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat));
    part.position.set(px, py, pz);
    group.add(part);
  }

  // Inner glow: an open square tube rising out of the bin plus a glowing floor.
  const glowOpts = { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false };
  const beamMat = new THREE.MeshBasicMaterial({ ...glowOpts, map: shared.beam, side: THREE.DoubleSide });
  const floorMat = new THREE.MeshBasicMaterial(glowOpts);
  const beamH = 2.8;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2, beamH, 4, 1, true).rotateY(Math.PI / 4), beamMat);
  beam.scale.set(w - 0.25, 1, d - 0.25);
  beam.position.y = beamH / 2 + 0.1;
  const glowFloor = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.25, d - 0.25), floorMat);
  glowFloor.rotation.x = -Math.PI / 2;
  glowFloor.position.y = wall + 0.02;
  group.add(beam, glowFloor);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(SIGN.w, SIGN.h),
    new THREE.MeshBasicMaterial({ map: makeSignTexture(area), transparent: true, alphaTest: 0.5, toneMapped: false }),
  );
  sign.position.set(x, h + SIGN.h / 2 + 0.05, BIN.z - d / 2 + 0.05);
  sign.lookAt(camera.position);
  scene.add(sign, group);

  // Drop zones: one flat panel per bin, all in the same vertical plane, so a
  // pointer ray can only ever cross one of them. Never rendered, only raycast.
  const hitbox = new THREE.Mesh(new THREE.PlaneGeometry(BIN.spacing, 5.4));
  hitbox.position.set(x, 1.1, BIN.z);
  shared.hitboxes.add(hitbox);

  const bin = { area, x, group, hitbox, glowMats: [beamMat, floorMat], markers: [], glow: { mode: null, t: 0 }, hover: false };
  hitbox.userData.bin = bin;
  return bin;
}

const markerGeo = new THREE.IcosahedronGeometry(0.19, 0);
const markerMat = lambert('#ef6a6a', { emissive: '#7a1414', emissiveIntensity: 0.4 });

export function addWrongMarker(bin) {
  const marker = shadowed(new THREE.Mesh(markerGeo, markerMat));
  marker.position.set(-0.8 + bin.markers.length * 0.8, BIN.h + 0.25, BIN.d / 2 - 0.08);
  bin.group.add(marker);
  bin.markers.push(marker);
}

export function clearBin(bin) {
  bin.markers.forEach((m) => bin.group.remove(m));
  bin.markers = [];
  bin.glow = { mode: null, t: 0 };
  bin.hover = false;
}

export function flash(bin, mode) {
  bin.glow = { mode, t: GLOW[mode].duration };
}

function updateBinGlow(bin, dt) {
  let mode = null;
  let opacity = 0;
  if (bin.glow.t > 0) {
    bin.glow.t = Math.max(0, bin.glow.t - dt);
    mode = bin.glow.mode;
    const fade = bin.glow.t / GLOW[mode].duration;
    const pulse = mode === 'bad' ? (Math.sin(bin.glow.t * 28) > 0 ? 1 : 0.3)
      : mode === 'hint' ? 0.6 + 0.4 * Math.sin(bin.glow.t * 9) : 1;
    opacity = GLOW[mode].peak * fade * pulse;
  } else if (bin.hover) {
    mode = 'hover';
    opacity = GLOW.hover.peak;
  }
  for (const mat of bin.glowMats) {
    mat.opacity = opacity;
    if (mode) mat.color.copy(GLOW[mode].color);
  }
}

// ─── Assemble ──────────────────────────────────────────────────────────────
export function buildWorld(scene, camera) {
  scene.background = makeSkyTexture();
  scene.fog = new THREE.Fog('#f4dfca', 50, 105);
  addLights(scene);
  addIsland(scene);
  addTrees(scene);
  const clouds = addClouds(scene);
  const confetti = addConfetti(scene);
  const balloons = makeBalloonKit();

  const big = [balloons.decorative(0, 3), balloons.decorative(2, 2.4)];
  big[0].position.set(-19, 9, -9);
  big[1].position.set(21, 11, -17);
  scene.add(...big);

  const hitboxes = new THREE.Group();
  const shared = { rim: lambert(PAPER), beam: makeBeamTexture(), hitboxes };
  const bins = AREAS.map((area, i) => buildBin(scene, area, (i - (AREAS.length - 1) / 2) * BIN.spacing, shared, camera));
  hitboxes.updateMatrixWorld(true);

  const confettiPos = confetti.geometry.attributes.position;
  function update(dt, t) {
    for (const cloud of clouds) {
      cloud.position.x += cloud.userData.speed * dt;
      if (cloud.position.x > 46) cloud.position.x = -46;
    }
    big[0].position.y = 9 + Math.sin(t * 0.5) * 0.6;
    big[1].position.y = 11 + Math.sin(t * 0.4 + 2) * 0.5;
    for (let i = 0; i < confettiPos.count; i++) {
      let y = confettiPos.getY(i) - dt * (0.25 + (i % 5) * 0.06);
      if (y < 0.2) y = 14;
      confettiPos.setY(i, y);
      confettiPos.setX(i, confettiPos.getX(i) + Math.sin(t + i) * dt * 0.15);
    }
    confettiPos.needsUpdate = true;
    bins.forEach((bin) => updateBinGlow(bin, dt));
  }

  return { bins, hitboxes, balloons, update };
}
