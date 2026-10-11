import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

// Procedural mid-size SUV (~4.75 × 1.92 × 1.72 m), front towards +Z, origin on the ground.
// style: 'toyota' (pearl white, large trapezoid grille) or 'bmw' (black, kidney grille).
const L = 4.75, W = 1.92, BELT = 1.1, ROOF = 0.62, WR = 0.38;
const AXLES = [1.45, -1.4];

let shadowTex = null;
function contactShadowTexture() {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 2, 0, 0); // elliptical falloff (car is longer than wide)
  const grd = g.createRadialGradient(64, 64, 6, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,0.8)');
  grd.addColorStop(0.6, 'rgba(0,0,0,0.45)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
}

// extrude a side profile (z, y) across the width and centre it, then round it in plan/section
function sideExtrude(shape, width, bevel, taper) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.3,
    bevelSegments: 4, curveSegments: 14,
  });
  geo.translate(0, 0, -(width - 2 * bevel) / 2);
  geo.rotateY(-Math.PI / 2); // shape x → world z, extrusion → world x
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    p.setX(i, x * taper(y, z));
  }
  geo.computeVertexNormals();
  return geo;
}

export function buildSUV(style, mats) {
  const g = new THREE.Group();
  const white = style === 'toyota';
  const paint = new THREE.MeshPhysicalMaterial({
    color: white ? 0xf3f3f0 : 0x0c0e11, metalness: white ? 0.05 : 0.55, roughness: white ? 0.32 : 0.3,
    clearcoat: 1, clearcoatRoughness: 0.04,
  });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0a0f14, metalness: 0.1, roughness: 0.02, clearcoat: 1, envMapIntensity: 1.4 });
  const plastic = new THREE.MeshStandardMaterial({ color: 0x141516, roughness: 0.75 });
  const gloss = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.1, clearcoat: 1 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08 });
  const alloy = new THREE.MeshStandardMaterial({ color: white ? 0xbfc3c7 : 0x5d6166, metalness: 1, roughness: 0.28 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.92 });
  const led = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf4f8ff, emissiveIntensity: 2.2 });
  const lens = new THREE.MeshPhysicalMaterial({ color: 0x20242a, metalness: 0.3, roughness: 0.05, clearcoat: 1 });
  const red = new THREE.MeshPhysicalMaterial({ color: 0x5a0505, emissive: 0x6a0000, emissiveIntensity: 0.6, roughness: 0.15, clearcoat: 1 });
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };

  // ---------- body (below the belt line) with wheel arches ----------
  const b = new THREE.Shape();
  b.moveTo(-2.3, 0.4);
  b.quadraticCurveTo(-2.4, 0.42, -2.4, 0.6);
  b.lineTo(-2.38, 0.98);
  b.quadraticCurveTo(-2.36, 1.12, -2.18, BELT + 0.06);
  b.lineTo(0.95, BELT + 0.02);
  b.quadraticCurveTo(1.7, BELT - 0.02, 2.2, 0.98);
  b.quadraticCurveTo(2.4, 0.93, 2.41, 0.78);
  b.lineTo(2.4, 0.5);
  b.quadraticCurveTo(2.38, 0.38, 2.25, 0.36);
  b.lineTo(AXLES[0] + 0.53, 0.36);
  b.absarc(AXLES[0], WR + 0.04, 0.5, -0.08, Math.PI + 0.08, false);
  b.lineTo(AXLES[1] + 0.53, 0.36);
  b.absarc(AXLES[1], WR + 0.04, 0.5, -0.08, Math.PI + 0.08, false);
  b.lineTo(-2.3, 0.4);
  const bodyGeo = sideExtrude(b, W, 0.12, (y, z) => {
    const ends = Math.max(0, Math.abs(z) - 1.7) / 0.7;            // narrower nose and tail
    const sec = (y - 0.78) / 0.42;                                  // rounder top/bottom
    return 1 - 0.035 * ends * ends - 0.025 * sec * sec;
  });
  add(bodyGeo, paint);

  // ---------- greenhouse (glass) with tumblehome ----------
  const c = new THREE.Shape();
  c.moveTo(-2.2, 0);
  c.lineTo(-2.06, ROOF - 0.08);
  c.quadraticCurveTo(-1.98, ROOF, -1.75, ROOF);
  c.lineTo(0.3, ROOF);
  c.quadraticCurveTo(0.5, ROOF - 0.01, 1.0, 0.02);
  c.lineTo(1.0, 0);
  c.lineTo(-2.2, 0);
  const cabGeo = sideExtrude(c, W - 0.2, 0.06, (y) => 1 - 0.16 * Math.max(0, y) / ROOF);
  add(cabGeo, glass, 0, BELT);
  // roof panel + rails
  const roofGeo = sideExtrude((() => {
    const r = new THREE.Shape();
    r.moveTo(-1.95, 0); r.quadraticCurveTo(-1.9, 0.05, -1.7, 0.05); r.lineTo(0.25, 0.05);
    r.quadraticCurveTo(0.45, 0.04, 0.5, 0); r.lineTo(-1.95, 0);
    return r;
  })(), W - 0.42, 0.03, () => 1);
  add(roofGeo, white ? paint : gloss, 0, BELT + ROOF - 0.005);
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.035, 0.035, 1.9), white ? plastic : chrome, s * (W / 2 - 0.3), BELT + ROOF + 0.06, -0.72);
    // pillars (blacked out) and chrome belt trim
    add(new THREE.BoxGeometry(0.02, ROOF - 0.04, 0.12), gloss, s * (W / 2 - 0.13), BELT + ROOF / 2, -0.5);
    add(new THREE.BoxGeometry(0.02, ROOF - 0.08, 0.2), gloss, s * (W / 2 - 0.15), BELT + ROOF / 2 - 0.02, -1.62);
    add(new THREE.BoxGeometry(0.015, 0.02, 3.0), chrome, s * (W / 2 - 0.085), BELT + 0.03, -0.6);
    // door seams + handles
    for (const z of [0.95, -0.42, -1.6]) add(new THREE.BoxGeometry(0.006, 0.66, 0.006), plastic, s * (W / 2 - 0.035), 0.8, z);
    for (const z of [0.4, -0.95]) add(new THREE.BoxGeometry(0.03, 0.03, 0.2), white ? paint : chrome, s * (W / 2 - 0.02), 1.0, z);
    // mirrors
    const mirror = add(new RoundedBoxGeometry(0.2, 0.13, 0.11, 2, 0.04), white ? paint : gloss, s * (W / 2 + 0.06), BELT + 0.12, 0.82);
    mirror.rotation.y = s * 0.15;
    add(new THREE.BoxGeometry(0.06, 0.05, 0.08), plastic, s * (W / 2 - 0.03), BELT + 0.06, 0.82);
    // lower cladding + wheel-arch flares
    add(new THREE.BoxGeometry(0.03, 0.12, 1.85), plastic, s * (W / 2 - 0.035), 0.44, 0.02);
    for (const az of AXLES) {
      const flare = add(new THREE.TorusGeometry(0.51, 0.04, 6, 20, Math.PI + 0.2), plastic, s * (W / 2 - 0.02), WR + 0.04, az);
      flare.rotation.y = Math.PI / 2;
      flare.rotation.x = -0.1;
    }
  }

  // ---------- wheels ----------
  const tireGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0.25, -0.125), new THREE.Vector2(0.33, -0.13), new THREE.Vector2(0.37, -0.115), new THREE.Vector2(WR, -0.07),
    new THREE.Vector2(WR, 0.07), new THREE.Vector2(0.37, 0.115), new THREE.Vector2(0.33, 0.13), new THREE.Vector2(0.25, 0.125),
  ], 32);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.255, 0.255, 0.2, 28);
  rimGeo.rotateZ(Math.PI / 2);
  const discGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.205, 24);
  discGeo.rotateZ(Math.PI / 2);
  for (const az of AXLES) {
    for (const s of [-1, 1]) {
      const wx = s * (W / 2 - 0.15);
      add(tireGeo, rubber, wx, WR, az);
      add(rimGeo, alloy, wx, WR, az);
      add(discGeo, plastic, wx + s * 0.01, WR, az);
      const hub = new THREE.Group();
      hub.position.set(wx + s * 0.105, WR, az);
      g.add(hub);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        for (const off of [-0.1, 0.1]) {
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.032), alloy);
          spoke.position.set(0, Math.cos(a + off) * 0.13, Math.sin(a + off) * 0.13);
          spoke.rotation.x = -(a + off);
          hub.add(spoke);
        }
      }
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16), white ? chrome : gloss);
      cap.rotation.z = Math.PI / 2;
      hub.add(cap);
    }
  }
  add(new THREE.BoxGeometry(W - 0.4, 0.16, 3.9), plastic, 0, 0.3, 0);
  for (const az of AXLES) {
    const well = add(new THREE.CylinderGeometry(0.5, 0.5, W - 0.1, 24, 1, true, Math.PI / 2 + 0.1, Math.PI - 0.2), new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 1, side: THREE.BackSide }), 0, WR + 0.04, az);
    well.rotation.z = Math.PI / 2;
  }

  // ---------- front ----------
  const zf = 2.45; // front face of the body
  if (white) {
    const grille = new THREE.Shape();
    grille.moveTo(-0.62, 0); grille.lineTo(0.62, 0); grille.lineTo(0.5, 0.36); grille.lineTo(-0.5, 0.36); grille.lineTo(-0.62, 0);
    const gg = new THREE.ExtrudeGeometry(grille, { depth: 0.04, bevelEnabled: false });
    add(gg, gloss, 0, 0.46, zf - 0.03);
    for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(1.12 - i * 0.04, 0.014, 0.02), plastic, 0, 0.5 + i * 0.055, zf + 0.015);
    add(new THREE.TorusGeometry(0.07, 0.012, 6, 24), chrome, 0, 0.76, zf + 0.02).scale.set(1.3, 0.85, 1);
  } else {
    for (const s of [-1, 1]) {
      add(new RoundedBoxGeometry(0.3, 0.32, 0.06, 2, 0.06), chrome, s * 0.18, 0.72, zf - 0.01);
      add(new RoundedBoxGeometry(0.26, 0.28, 0.07, 2, 0.05), gloss, s * 0.18, 0.72, zf);
      for (let k = -2; k <= 2; k++) add(new THREE.BoxGeometry(0.012, 0.24, 0.02), chrome, s * 0.18 + k * 0.045, 0.72, zf + 0.035);
    }
    add(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 20), chrome, 0, 0.97, 2.22).rotation.x = Math.PI / 2 - 0.25;
    add(new THREE.BoxGeometry(1.25, 0.14, 0.05), gloss, 0, 0.48, zf);
  }
  for (const s of [-1, 1]) {
    const hl = add(new THREE.BoxGeometry(0.44, 0.12, 0.06), lens, s * 0.64, 0.86, zf - 0.015);
    hl.rotation.z = s * -0.07;
    const drl = add(new THREE.BoxGeometry(0.4, 0.02, 0.02), led, s * 0.64, white ? 0.9 : 0.83, zf + 0.02);
    drl.rotation.z = s * -0.07;
    const proj = add(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), led, s * 0.56, 0.85, zf + 0.02);
    proj.rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(0.18, 0.04, 0.03), led, s * 0.72, 0.47, zf + 0.005);
    add(new THREE.BoxGeometry(0.3, 0.12, 0.04), gloss, s * 0.7, 0.45, zf - 0.01);
  }
  add(new THREE.BoxGeometry(0.52, 0.12, 0.02), mats.ceramic, 0, 0.4, zf + 0.025);
  add(new THREE.BoxGeometry(1.7, 0.08, 0.08), plastic, 0, 0.37, zf - 0.04);

  // ---------- rear ----------
  const zr = -2.44; // rear face of the body
  for (const s of [-1, 1]) {
    const tl = add(new THREE.BoxGeometry(0.46, 0.11, 0.06), red, s * 0.62, 1.0, zr + 0.01);
    tl.rotation.z = s * 0.04;
  }
  add(new THREE.BoxGeometry(0.75, 0.035, 0.04), red, 0, 1.0, zr);
  add(new THREE.BoxGeometry(0.52, 0.12, 0.02), mats.ceramic, 0, 0.72, zr - 0.02);
  add(new THREE.BoxGeometry(1.7, 0.12, 0.08), plastic, 0, 0.44, zr + 0.03);
  add(new THREE.BoxGeometry(1.4, 0.08, 0.3), gloss, 0, BELT + ROOF - 0.02, -1.95);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // soft contact shadow on the floor
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.5, L + 0.5), new THREE.MeshBasicMaterial({
    map: contactShadowTexture(), transparent: true, depthWrite: false, opacity: 0.85,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  }));
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.006;
  sh.renderOrder = 1;
  g.add(sh);
  return g;
}
