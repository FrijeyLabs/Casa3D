import * as THREE from 'three';
import { Sky } from 'three/addons/Sky.js';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { LOT } from './house.js';

// ---------- small deterministic noise ----------
function hash(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, oct = 5) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; }
  return s;
}
let seed = 1234567;
const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- canvas textures ----------
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function frondTexture() {
  return canvasTex(128, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const t = i / 70;
      const y = h - t * h;
      const len = (w / 2 - 4) * Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.04));
      const shade = 70 + Math.floor(rnd() * 50);
      g.strokeStyle = `rgb(${40 + shade * 0.3},${shade + 60},${30 + shade * 0.2})`;
      g.lineWidth = 3.2;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(w / 2, y);
        g.quadraticCurveTo(w / 2 + s * len * 0.5, y - 10, w / 2 + s * len, y - 26 * (0.4 + t));
        g.stroke();
      }
    }
    g.strokeStyle = '#6f7a3a';
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 0); g.stroke();
  });
}

function barkTexture() {
  const t = canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#8a7d6b';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      g.fillStyle = `rgba(60,50,40,${0.35 + rnd() * 0.3})`;
      g.fillRect(0, y, w, 2 + rnd() * 2);
    }
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(${150 + rnd() * 50},${140 + rnd() * 40},${120 + rnd() * 30},0.25)`;
      g.fillRect(rnd() * w, rnd() * h, 3, 1);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function cloudTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    for (let i = 0; i < 26; i++) {
      const x = w * (0.2 + rnd() * 0.6), y = h * (0.35 + rnd() * 0.3);
      const r = w * (0.08 + rnd() * 0.14);
      const gr = g.createRadialGradient(x, y - r * 0.2, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)');
      gr.addColorStop(0.6, 'rgba(245,247,250,0.6)');
      gr.addColorStop(1, 'rgba(225,230,238,0)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  });
}

function chainLinkTexture() {
  const t = canvasTex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(190,195,198,1)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(w, h);
    g.moveTo(w, 0); g.lineTo(0, h);
    g.stroke();
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// frond strip that rises at angle a0 and droops by `droop` radians along its length
function frondGeo(len, wid, a0, droop, segs = 8) {
  const pos = [], uv = [], idx = [];
  let y = 0, z = 0;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const w = wid * (0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.05)));
    pos.push(-w / 2, y + Math.abs(w) * 0.12, z, w / 2, y + Math.abs(w) * 0.12, z);
    uv.push(0, t, 1, t);
    const a = a0 - droop * t;
    y += (Math.sin(a) * len) / segs;
    z += (Math.cos(a) * len) / segs;
  }
  for (let i = 0; i < segs; i++) {
    const k = i * 2;
    idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function buildEnvironment(scene, renderer, b, mats, quality) {
  // ---------- Sky, sun, ambient ----------
  const sky = new Sky();
  sky.scale.setScalar(4500);
  const u = sky.material.uniforms;
  u.turbidity.value = 2.2;
  u.rayleigh.value = 1.1;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.82;
  const sunDir = new THREE.Vector3(0.38, 0.8, 0.62).normalize();
  u.sunPosition.value.copy(sunDir);
  scene.add(sky);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new Sky();
  envSky.scale.setScalar(1000);
  envSky.material.uniforms.turbidity.value = 2.2;
  envSky.material.uniforms.rayleigh.value = 1.1;
  envSky.material.uniforms.sunPosition.value.copy(sunDir);
  envScene.add(envSky);
  const groundDisk = new THREE.Mesh(new THREE.CircleGeometry(900, 32), new THREE.MeshBasicMaterial({ color: 0x8a8474 }));
  groundDisk.rotation.x = -Math.PI / 2;
  groundDisk.position.y = -2;
  envScene.add(groundDisk);
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;
  scene.environmentIntensity = 0.5;

  scene.fog = new THREE.Fog(0xc4d4e4, 300, 3200);

  const sun = new THREE.DirectionalLight(0xfff1dc, 3.0);
  const center = new THREE.Vector3(7, 0, 6);
  sun.position.copy(center).addScaledVector(sunDir, 90);
  sun.target.position.copy(center);
  sun.castShadow = true;
  const sm = quality.shadowMap;
  sun.shadow.mapSize.set(sm, sm);
  const sc = sun.shadow.camera;
  sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 20; sc.far = 180;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.025;
  scene.add(sun, sun.target);

  scene.add(new THREE.HemisphereLight(0xe6edf4, 0xd2cabd, 0.5));

  // warm interior lighting (the downlights)
  const rooms = [[2.2, 2.0], [6.3, 3.4], [2.2, 11.0], [3.7, 6.0], [6.2, 8.4], [10.2, 4.0], [10.2, 7.0], [1.6, 5.8], [12.9, 3.2], [11.0, 11.2], [6.2, 12.0]];
  for (const [x, z] of rooms) {
    const l = new THREE.SpotLight(0xffdcb4, quality.interiorLight, 10, 1.15, 0.9, 1.6);
    l.position.set(x, 3.45, z);
    l.target.position.set(x, 0, z);
    scene.add(l, l.target);
  }

  // ---------- Ground, street, sidewalks ----------
  const groundGeo = new THREE.PlaneGeometry(800, 800);
  groundGeo.rotateX(-Math.PI / 2);
  // world-meter UVs like everything else
  const gp = groundGeo.attributes.position, guv = groundGeo.attributes.uv;
  for (let i = 0; i < gp.count; i++) guv.setXY(i, gp.getX(i), -gp.getZ(i));
  // the lawn sits slightly below everything else and is pushed back in depth,
  // so roads/paths never z-fight with it (some phones have 16-bit depth buffers)
  mats.grass.polygonOffset = true;
  mats.grass.polygonOffsetFactor = 2;
  mats.grass.polygonOffsetUnits = 4;
  const ground = new THREE.Mesh(groundGeo, mats.grass);
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);
  b.addCollider(-2000, -5, -2000, 2000, 0, 2000);

  // Corner lot: street in front (along X) and on the right side (along Z), T-junction at the corner.
  const SX0 = 16.8, SX1 = 23.8;                 // side street asphalt
  const walk = { all: 'curb', top: 'sidewalk' };
  b.box(-200, 0, 15.66, 16.6, 0.12, 17.0, walk);             // front sidewalk (our side)
  b.box(24.0, 0, 15.66, 200, 0.12, 17.0, walk);
  b.box(-200, 0, 17.0, SX0, 0.15, 17.2, 'curb');
  b.box(SX1, 0, 17.0, 200, 0.15, 17.2, 'curb');
  b.box(-200, -0.05, 17.2, 200, 0.03, 24.2, 'asphalt');      // front street
  b.box(-200, 0, 24.2, 200, 0.15, 24.4, 'curb');
  b.box(-200, 0, 24.4, 200, 0.12, 25.8, walk);
  b.box(15.1, 0, -200, 16.6, 0.12, 17.0, walk);               // side sidewalk (our side)
  b.box(16.6, 0, -200, SX0, 0.15, 17.0, 'curb');
  b.box(SX0, -0.05, -200, SX1, 0.03, 17.2, 'asphalt');        // side street
  b.box(SX1, 0, -200, 24.0, 0.15, 17.0, 'curb');
  b.box(24.0, 0, -200, 25.5, 0.12, 15.66, walk);
  // dashed centre lines
  for (let x = -200; x < 200; x += 6) if (x + 3 < SX0 || x > SX1) b.box(x, 0.03, 20.62, x + 3, 0.034, 20.78, 'stuccoLight', { collide: false });
  for (let z = -200; z < 15; z += 6) b.box(20.22, 0.03, z, 20.38, 0.034, z + 3, 'stuccoLight', { collide: false });
  // zebra crossing on the side street at the corner
  for (let x = SX0 + 0.3; x < SX1 - 0.3; x += 0.9) b.box(x, 0.03, 14.6, x + 0.45, 0.034, 16.8, 'stuccoLight', { collide: false });

  // ---------- Our lot (render): perimeter walls, lawn, driveway, walkway, garden ----------
  const { x0, x1, z0, z1 } = LOT;
  const wallFaces = { all: 'stucco', top: 'trim' };
  b.box(x0 - 0.15, 0, z0 - 0.15, x0, 2.1, z1, wallFaces);
  b.box(x1, 0, z0 - 0.15, x1 + 0.15, 2.1, z1, wallFaces);
  b.box(x0, 0, z0 - 0.15, x1, 2.1, z0, wallFaces);
  // wall lamps on the side walls (render)
  for (const z of [11, 14.8]) {
    b.box(x0, 1.5, z - 0.06, x0 + 0.08, 1.75, z + 0.06, 'metalBlack', { collide: false });
    b.box(x0 + 0.08, 1.55, z - 0.04, x0 + 0.085, 1.7, z + 0.04, 'lightWarm', { collide: false });
    b.box(x1 - 0.08, 1.5, z - 0.06, x1, 1.75, z + 0.06, 'metalBlack', { collide: false });
    b.box(x1 - 0.085, 1.55, z - 0.04, x1 - 0.08, 1.7, z + 0.04, 'lightWarm', { collide: false });
  }
  // driveway: gentle ramp from the raised carport down to the sidewalk
  ramp(scene, b, mats.porchFloor, 8.15, x1, 14.06, 0.3, 15.66, 0.12);
  b.box(6.4, 0, 14.02, 7.95, 0.03, 15.66, 'sidewalk');
  // planting beds with white pebble edging in front of the master bedroom and porch
  const soil = 'soil';
  mats.soil = mats.soil || new THREE.MeshStandardMaterial({ color: 0x3b2c22, roughness: 1 });
  b.box(-0.6, 0, 13.12, 3.35, 0.08, 14.2, { all: 'stuccoLight', top: soil }, { collide: false });
  b.box(4.3, 0, 13.65, 6.4, 0.08, 14.3, { all: 'stuccoLight', top: soil }, { collide: false });
  b.box(-0.6, 0, 14.2, 3.35, 0.04, 14.4, 'stuccoLight', { collide: false });
  b.box(4.3, 0, 14.3, 6.4, 0.04, 14.5, 'stuccoLight', { collide: false });
  b.box(-1.0, 0, 8, -0.2, 0.08, 13.0, { all: 'stuccoLight', top: soil }, { collide: false });
  // uplights in the planter under the wood-slat panel (render)
  for (const x of [4.6, 5.2]) b.box(x - 0.05, 0.08, 13.8, x + 0.05, 0.12, 13.9, 'lightWarm', { collide: false });
  // back patio: paved, all connected — behind the bedrooms, the notch, and the galería
  b.box(x0, 0, z0, x1, 0.03, 0, 'sidewalk');
  b.box(4.39, 0, 0, 6.56, 0.03, 1.54, 'sidewalk');

  // ---------- Neighbours (from the lot photos) ----------
  buildNeighbours(b);

  // ---------- Vegetation ----------
  const veg = new Vegetation(mats);
  // our garden (render): tropical plants, red-leaf plants, small palms
  for (let x = -0.3; x < 3.2; x += 0.55) veg.plant(x, 0.08, 13.5 + rnd() * 0.5, 0.9 + rnd() * 0.5, rnd() < 0.3);
  for (let x = 4.5; x < 6.3; x += 0.6) veg.plant(x, 0.08, 13.95 + rnd() * 0.2, 0.8 + rnd() * 0.4, rnd() < 0.4);
  for (let z = 8.4; z < 12.8; z += 0.8) veg.plant(-0.6, 0.08, z, 1.0 + rnd() * 0.5, false);
  for (let z = 14.3; z < 15.5; z += 0.6) veg.bush(14.55, z, 0.45);
  veg.plant(14.5, 0.06, 13.0, 1.2, false);
  veg.palm(-0.3, 15.1, 5.5);
  veg.palm(2.0, -2.3, 7.5);
  veg.palm(11.5, -2.4, 8.5);
  for (const [x, z] of [[2.0, -2.3], [11.5, -2.4]]) b.box(x - 0.45, 0, z - 0.45, x + 0.45, 0.35, z + 0.45, { all: 'stuccoLight', top: soil });
  // garden bollard lights along the walkway
  for (const z of [14.4, 15.2]) for (const x of [6.25, 8.1]) {
    b.box(x - 0.05, 0, z - 0.05, x + 0.05, 0.45, z + 0.05, 'metalBlack', { collide: false });
    b.box(x - 0.04, 0.38, z - 0.04, x + 0.04, 0.43, z + 0.04, 'lightWarm', { collide: false });
  }
  // neighbourhood greenery
  const palms = [[-8, 13], [-19, 5], [33, 13], [29, -14], [-5, -19], [40, 30], [-25, 32], [10, 44], [55, 2], [-45, -10], [30, -30], [-30, -25], [60, 40], [-60, 20]];
  for (const [x, z] of palms) veg.palm(x, z, 7 + rnd() * 5);
  const trees = [[-12, -8], [30, -6], [45, 12], [-30, 10], [26, 34], [-14, 42], [52, -20], [-50, -30], [5, -35], [70, 5], [-70, 0], [35, 55], [-40, 55], [80, -40], [-85, -45]];
  for (const [x, z] of trees) veg.tree(x, z, 3 + rnd() * 2.5);
  veg.pine(-22, -16, 13);
  veg.pine(42, -24, 11);
  for (let i = 0; i < 160; i++) {
    const a = rnd() * Math.PI * 2, r = 90 + rnd() * 220;
    const x = 7 + Math.cos(a) * r, z = 7 + Math.sin(a) * r;
    if ((z > 12 && z < 30) || (x > 12 && x < 28)) continue;
    if (rnd() < 0.35) veg.palm(x, z, 8 + rnd() * 6); else veg.tree(x, z, 3 + rnd() * 4);
  }
  // hedges along neighbour fences (photos)
  b.box(-16, 0, -3.9, -1.3, 1.6, -3.5, 'hedge');

  scene.add(veg.build());

  // chain-link fences (photos)
  const fence = new Fence(mats);
  fence.run(3, 26.6, 18, 26.6);
  fence.run(3, 26.6, 3, 42);
  fence.run(18, 26.6, 18, 42);
  fence.run(-1.3, -3.6, 14.9, -3.6, 1.6);
  scene.add(fence.build());

  // utility poles + wires along the far sidewalk (photos)
  scene.add(utilityPoles(mats));

  // ---------- Mountains + clouds ----------
  scene.add(mountains());
  scene.add(clouds());

  return { sun, sky };
}

// ---------- neighbours ----------
function winGrid(b, axis, plane, a0, a1, y0, y1, n, w, side) {
  for (let i = 0; i < n; i++) {
    const c = a0 + ((a1 - a0) * (i + 0.5)) / n;
    const d = side > 0 ? [plane, plane + 0.04] : [plane - 0.04, plane];
    if (axis === 'x') {
      b.box(c - w / 2, y0, d[0], c + w / 2, y1, d[1], 'darkWin', { collide: false });
      for (let k = 1; k < 5; k++) {
        const xx = c - w / 2 + (w * k) / 5;
        b.box(xx - 0.012, y0, d[0] - 0.02 * side, xx + 0.012, y1, d[1] + 0.02 * side, 'stuccoLight', { collide: false });
      }
    } else {
      b.box(d[0], y0, c - w / 2, d[1], y1, c + w / 2, 'darkWin', { collide: false });
      for (let k = 1; k < 5; k++) {
        const zz = c - w / 2 + (w * k) / 5;
        b.box(d[0] - 0.02 * side, y0, zz - 0.012, d[1] + 0.02 * side, y1, zz + 0.012, 'stuccoLight', { collide: false });
      }
    }
  }
}

function buildNeighbours(b) {
  // Behind: long white flat-roof house with small barred windows
  b.box(-2, 0, -16, 16, 3.3, -8, { all: 'whiteHouse', top: 'concrete' });
  b.box(-2.1, 3.3, -16.1, 16.1, 3.6, -7.9, { all: 'whiteHouse', top: 'concrete' });
  winGrid(b, 'x', -8, -1, 15, 1.2, 2.1, 6, 0.9, 1);
  // Behind-left: two-storey white block
  b.box(-22, 0, -24, -6, 6.2, -12, { all: 'whiteHouse', top: 'concrete' });
  winGrid(b, 'x', -12, -21, -7, 1.2, 2.2, 5, 1.0, 1);
  winGrid(b, 'x', -12, -21, -7, 4.2, 5.2, 5, 1.0, 1);
  // Left: beige house with brown fascia + grey stone-tile block (photos)
  b.box(-14.5, 0, 0, -4.2, 3.1, 11, { all: 'creamHouse', top: 'concrete' });
  b.box(-14.6, 3.1, -0.1, -4.1, 3.45, 11.1, { all: 'brownTrim', top: 'concrete' });
  b.box(-16.4, 0, 1, -13.2, 4.2, 8, { all: 'greyTile', top: 'concrete' });
  b.box(-16.5, 4.2, 0.9, -13.1, 4.45, 8.1, 'brownTrim');
  winGrid(b, 'x', 11, -13, -5, 1.0, 2.2, 3, 1.1, 1);
  winGrid(b, 'z', -4.2, 1, 10, 1.0, 2.2, 3, 1.1, 1);
  b.box(-9.6, 0, 11, -8.4, 2.3, 11.06, 'brownTrim', { collide: false });
  // cream wall with gate in front of the left neighbour (photo)
  b.box(-17, 0, 15.4, -1.3, 1.8, 15.6, { all: 'creamHouse', top: 'brownTrim' });
  b.box(-11, 0.05, 15.35, -7.5, 1.7, 15.38, 'metalBlack', { collide: false });
  for (const x of [-11.3, -7.2]) b.box(x - 0.2, 0, 15.3, x + 0.2, 2.1, 15.7, { all: 'creamHouse', top: 'brownTrim' });
  // Across the street
  b.box(-12, 0, 30, 1, 3.2, 40, { all: 'creamHouse', top: 'concrete' });
  b.box(-12.1, 3.2, 29.9, 1.1, 3.55, 40.1, 'brownTrim');
  winGrid(b, 'x', 30, -11, 0, 1.0, 2.2, 4, 1.1, -1);
  b.box(20, 0, 29, 32, 6.0, 39, { all: 'whiteHouse', top: 'concrete' });
  winGrid(b, 'x', 29, 21, 31, 1.2, 2.2, 4, 1.0, -1);
  winGrid(b, 'x', 29, 21, 31, 3.9, 4.9, 4, 1.0, -1);
  b.box(36, 0, 30, 47, 3.3, 41, { all: 'creamHouse', top: 'concrete' });
  winGrid(b, 'x', 30, 37, 46, 1.0, 2.2, 3, 1.1, -1);
  // Same side of the street, further out
  b.box(-31, 0, 2, -20, 3.3, 12, { all: 'creamHouse', top: 'concrete' });
  winGrid(b, 'x', 12, -30, -21, 1.0, 2.2, 3, 1.1, 1);
  b.box(34, 0, 0, 46, 3.4, 11, { all: 'whiteHouse', top: 'concrete' });
  winGrid(b, 'x', 11, 35, 45, 1.0, 2.2, 3, 1.1, 1);
  // scattered houses filling the valley
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2, r = 70 + rnd() * 230;
    const x = 7 + Math.cos(a) * r, z = 7 + Math.sin(a) * r;
    if ((z > 12 && z < 30) || (x > 10 && x < 28)) continue;
    const w = 8 + rnd() * 6, d = 8 + rnd() * 5, h = rnd() < 0.3 ? 6 : 3.3;
    const mat = rnd() < 0.5 ? 'whiteHouse' : 'creamHouse';
    b.box(x, 0, z, x + w, h, z + d, { all: mat, top: 'concrete' }, { collide: false });
    if (rnd() < 0.5) b.box(x - 0.1, h, z - 0.1, x + w + 0.1, h + 0.3, z + d + 0.1, 'brownTrim', { collide: false });
  }
}

// ---------- vegetation (merged into a few meshes) ----------
class Vegetation {
  constructor(mats) {
    this.mats = mats;
    this.frond = [];
    this.redFrond = [];
    this.trunk = [];
    this.leaves = [];
    this.pineLeaves = [];
    this.wood = [];
  }

  _push(list, geo, x, y, z, ry = 0, rx = 0, s = 1) {
    const g = geo.clone();
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, 0, 'YXZ'));
    m.scale(new THREE.Vector3(s, s, s));
    m.setPosition(x, y, z);
    g.applyMatrix4(m);
    list.push(g);
  }

  palm(x, z, h) {
    const lean = (rnd() - 0.5) * 1.2;
    const pts = [new THREE.Vector3(x, 0, z), new THREE.Vector3(x + lean * 0.3, h * 0.5, z + lean * 0.2), new THREE.Vector3(x + lean, h, z + lean * 0.5)];
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, 10, 0.17, 8, false);
    const uv = tube.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i) * h * 0.8);
    this.trunk.push(tube);
    const top = pts[2];
    const n = 13;
    for (let i = 0; i < n; i++) {
      const g = frondGeo(2.6 + rnd() * 1.0, 0.9, 0.5 + rnd() * 0.5, 1.6 + rnd() * 0.6);
      this._push(this.frond, g, top.x, top.y - 0.1, top.z, (i / n) * Math.PI * 2 + rnd() * 0.3);
    }
  }

  plant(x, y, z, s, red) {
    const n = 7 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const g = frondGeo(0.8 * s, 0.32 * s, 0.9 + rnd() * 0.5, 1.3 + rnd() * 0.5, 5);
      this._push(red ? this.redFrond : this.frond, g, x, y, z, (i / n) * Math.PI * 2 + rnd());
    }
  }

  bush(x, z, r) {
    const g = new THREE.IcosahedronGeometry(r, 1);
    this._push(this.leaves, g, x, r * 0.8, z, rnd() * 3, 0, 1);
  }

  tree(x, z, r) {
    const h = r * 1.4;
    this._push(this.wood, new THREE.CylinderGeometry(0.15 * r * 0.4, 0.22 * r * 0.4, h, 7), x, h / 2, z);
    for (let i = 0; i < 6; i++) {
      const rr = r * (0.55 + rnd() * 0.35);
      const g = new THREE.IcosahedronGeometry(rr, 1);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const f = 0.85 + 0.3 * vnoise(p.getX(k) * 1.3 + i * 10, p.getY(k) * 1.3 + p.getZ(k));
        p.setXYZ(k, p.getX(k) * f, p.getY(k) * f * 0.8, p.getZ(k) * f);
      }
      g.computeVertexNormals();
      this._push(this.leaves, g, x + (rnd() - 0.5) * r, h + rnd() * r * 0.6, z + (rnd() - 0.5) * r);
    }
  }

  pine(x, z, h) {
    this._push(this.wood, new THREE.CylinderGeometry(0.12, 0.3, h, 7), x, h / 2, z);
    for (let i = 0; i < 9; i++) {
      const y = h * 0.25 + (h * 0.75 * i) / 9;
      const r = 2.6 * (1 - i / 10);
      this._push(this.pineLeaves, new THREE.ConeGeometry(r, 1.0, 9, 1, true), x, y, z, rnd() * 3);
    }
  }

  build() {
    const g = new THREE.Group();
    const frondTex = frondTexture();
    const bark = barkTexture();
    const leafMat = new THREE.MeshStandardMaterial({ map: frondTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8, color: 0xe8ffd8 });
    const redMat = new THREE.MeshStandardMaterial({ map: frondTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8, color: 0xff6a5a });
    const trunkMat = new THREE.MeshStandardMaterial({ map: bark, roughness: 1 });
    const crown = this.mats.hedge.clone();
    crown.color.set(0x7aa35a);
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x2f4f2c, roughness: 1, side: THREE.DoubleSide });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 1 });
    const add = (list, mat, shadow = true) => {
      if (!list.length) return;
      const geo = mergeGeometries(list, false);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      g.add(mesh);
    };
    const nonIndexed = (l) => l.map((x) => (x.index ? x.toNonIndexed() : x));
    add(nonIndexed(this.frond), leafMat);
    add(nonIndexed(this.redFrond), redMat);
    add(nonIndexed(this.trunk), trunkMat);
    add(nonIndexed(this.leaves), crown);
    add(nonIndexed(this.pineLeaves), pineMat);
    add(nonIndexed(this.wood), woodMat);
    return g;
  }
}

// ---------- chain-link fence on a block base ----------
class Fence {
  constructor(mats) { this.mats = mats; this.mesh = []; this.posts = []; this.base = []; }
  run(x0, z0, x1, z1, h = 1.9) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ang = Math.atan2(z1 - z0, x1 - x0);
    const plane = new THREE.PlaneGeometry(len, h - 0.3);
    const uv = plane.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 0.07, uv.getY(i) * (h - 0.3) / 0.07);
    const m = new THREE.Matrix4().makeRotationY(-ang).setPosition((x0 + x1) / 2, 0.3 + (h - 0.3) / 2, (z0 + z1) / 2);
    plane.applyMatrix4(m);
    this.mesh.push(plane);
    const base = new THREE.BoxGeometry(len, 0.3, 0.18);
    base.applyMatrix4(new THREE.Matrix4().makeRotationY(-ang).setPosition((x0 + x1) / 2, 0.15, (z0 + z1) / 2));
    this.base.push(base);
    const rail = new THREE.CylinderGeometry(0.025, 0.025, len, 6);
    rail.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2).premultiply(new THREE.Matrix4().makeRotationY(-ang)).setPosition((x0 + x1) / 2, h, (z0 + z1) / 2));
    this.posts.push(rail);
    const n = Math.max(1, Math.round(len / 2.6));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = new THREE.CylinderGeometry(0.035, 0.035, h, 8);
      p.translate(x0 + (x1 - x0) * t, h / 2, z0 + (z1 - z0) * t);
      this.posts.push(p);
    }
  }
  build() {
    const g = new THREE.Group();
    const tex = chainLinkTexture();
    const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5 });
    const a = new THREE.Mesh(mergeGeometries(this.mesh), mat);
    const b = new THREE.Mesh(mergeGeometries(this.posts.map((x) => x.toNonIndexed())), this.mats.galv);
    const c = new THREE.Mesh(mergeGeometries(this.base.map((x) => x.toNonIndexed())), this.mats.blockWall);
    for (const m of [a, b, c]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }
    return g;
  }
}

function utilityPoles(mats) {
  const g = new THREE.Group();
  const geos = [];
  const tops = [];
  for (let x = -110; x <= 130; x += 34) {
    const z = 25.3;
    const p = new THREE.CylinderGeometry(0.12, 0.2, 9, 8);
    p.translate(x, 4.5, z);
    geos.push(p.toNonIndexed());
    const arm = new THREE.BoxGeometry(1.8, 0.1, 0.1);
    arm.translate(x, 8.4, z);
    geos.push(arm.toNonIndexed());
    const lamp = new THREE.BoxGeometry(0.08, 0.08, 1.6);
    lamp.translate(x, 7.6, z - 0.8);
    geos.push(lamp.toNonIndexed());
    tops.push(x);
  }
  const mesh = new THREE.Mesh(mergeGeometries(geos), mats.curb);
  mesh.castShadow = true;
  g.add(mesh);
  const pts = [];
  for (const dx of [-0.8, 0, 0.8]) {
    for (let i = 0; i < tops.length - 1; i++) {
      const a = tops[i], c = tops[i + 1];
      const y = dx === 0 ? 8.9 : 8.5;
      for (let k = 0; k < 8; k++) {
        const t0 = k / 8, t1 = (k + 1) / 8;
        const sag = (t) => -0.6 * 4 * t * (1 - t);
        pts.push(new THREE.Vector3(a + (c - a) * t0, y + sag(t0), 25.3 + dx * 0.3));
        pts.push(new THREE.Vector3(a + (c - a) * t1, y + sag(t1), 25.3 + dx * 0.3));
      }
    }
  }
  const wires = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x222222 }));
  g.add(wires);
  return g;
}

// Forested mountains surrounding the valley, highest behind the lot (as in the photos).
function mountains() {
  const NR = 80, NA = 380;
  const pos = [], col = [], idx = [];
  const lo = new THREE.Color(0x587f45), hi = new THREE.Color(0x2c5030), dark = new THREE.Color(0x24432a), tmp = new THREE.Color();
  for (let i = 0; i <= NR; i++) {
    const r = 330 * Math.pow(3200 / 330, i / NR);
    for (let j = 0; j < NA; j++) {
      const a = (j / NA) * Math.PI * 2;
      const x = 7 + Math.cos(a) * r, z = 7 + Math.sin(a) * r;
      const rise = smooth(420, 1300, r);
      const ridge = 1 - Math.abs(2 * fbm(x / 520 + 3, z / 520 - 7) - 1);
      let h = 25 + 120 * fbm(x / 900 + 11, z / 900 + 5) + 150 * ridge * ridge;
      const dA = (t) => { const d = Math.atan2(Math.sin(a - t), Math.cos(a - t)); return d * d; };
      h *= 1 + 0.7 * Math.exp(-dA(-1.45) / 0.3) + 0.5 * Math.exp(-dA(-2.5) / 0.25) - 0.4 * Math.exp(-dA(1.5) / 0.5);
      h += 230 * Math.exp(-((x - 260) ** 2 + (z + 1350) ** 2) / (2 * 280 ** 2));
      h += 28 * (fbm(x / 140 - 4, z / 140 + 9, 4) - 0.5) * smooth(0, 200, h);
      h = -0.5 + rise * h * (1 + 0.6 * smooth(1500, 3200, r));
      pos.push(x, h, z);
      const n = fbm(x / 45, z / 45, 3);
      tmp.copy(lo).lerp(hi, Math.min(1, h / 380)).lerp(dark, Math.max(0, n - 0.3) * 0.9);
      col.push(tmp.r, tmp.g, tmp.b);
    }
  }
  for (let i = 0; i < NR; i++) {
    for (let j = 0; j < NA; j++) {
      const a = i * NA + j, b2 = i * NA + ((j + 1) % NA), c = (i + 1) * NA + j, d = (i + 1) * NA + ((j + 1) % NA);
      idx.push(a, b2, c, b2, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  m.receiveShadow = false;
  return m;
}

function clouds() {
  const g = new THREE.Group();
  const texs = [cloudTexture(), cloudTexture(), cloudTexture()];
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2, r = 1100 + rnd() * 2400;
    const mat = new THREE.SpriteMaterial({ map: texs[i % 3], transparent: true, depthWrite: false, fog: false, opacity: 0.85 + rnd() * 0.15, color: 0xffffff });
    const s = new THREE.Sprite(mat);
    const w = 350 + rnd() * 650;
    s.scale.set(w, w * 0.45, 1);
    s.position.set(7 + Math.cos(a) * r, 520 + rnd() * 450, 7 + Math.sin(a) * r);
    g.add(s);
  }
  return g;
}

// Sloped slab (visual) + thin stepped colliders so the player walks up smoothly.
function ramp(scene, b, mat, x0, x1, zA, yA, zB, yB) {
  const g = new THREE.BufferGeometry();
  const pos = [x0, yA, zA, x1, yA, zA, x1, yB, zB, x0, yB, zB, x0, 0, zA, x1, 0, zA, x1, 0, zB, x0, 0, zB];
  const uv = [x0, -zA, x1, -zA, x1, -zB, x0, -zB, x0, 0, x1, 0, x1, 0, x0, 0];
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  // top, two sides
  g.setIndex([0, 3, 2, 0, 2, 1, 4, 7, 3, 4, 3, 0, 5, 1, 2, 5, 2, 6]);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  scene.add(m);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const za = zA + ((zB - zA) * i) / n, zb = zA + ((zB - zA) * (i + 1)) / n;
    b.addCollider(x0, 0, za, x1, yA + ((yB - yA) * (i + 0.5)) / n, zb);
  }
}
