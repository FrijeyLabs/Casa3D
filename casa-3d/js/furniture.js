import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { H } from './house.js';
import { buildSUV } from './car.js';

// Only the pieces drawn on the plan: beds + nightstands, wardrobes, sofas, coffee table,
// dining set, kitchen with island and stools, bathrooms, laundry and the two cars.
export function buildFurniture(b, mats, scene) {
  const F = H.F;
  const group = new THREE.Group();
  scene.add(group);

  const rbox = (w, h, d, mat, r = 0.03) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), mats[mat]);
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const cyl = (rt, rb, h, mat, seg = 20) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mats[mat]);
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const add = (parent, mesh, x, y, z) => { mesh.position.set(x, y, z); parent.add(mesh); return mesh; };
  // place a local group (front = +Z local) and register its bounding box as a collider
  const place = (g, x, y, z, rotY, collide = true) => {
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    group.add(g);
    if (collide) b.addColliderFromObject(g, 0.02);
    return g;
  };

  // ---------- Beds (head at local z=0, foot towards +z) ----------
  function bed(x, z, rot, W = 1.6, L = 2.05) {
    const g = new THREE.Group();
    add(g, rbox(W + 0.06, 0.28, L, 'darkWood', 0.02), 0, 0.14, L / 2);
    add(g, rbox(W, 0.26, L - 0.06, 'bedding', 0.08), 0, 0.41, L / 2 + 0.02);
    add(g, rbox(W + 0.04, 0.06, L * 0.42, 'bedThrow', 0.03), 0, 0.55, L * 0.72);
    for (const s of [-1, 1]) add(g, rbox(W * 0.42, 0.14, 0.42, 'bedding', 0.06), s * W * 0.23, 0.6, 0.3);
    add(g, rbox(W + 0.2, 1.15, 0.09, 'fabricDark', 0.03), 0, 0.575, 0.045);
    place(g, x, F, z, rot);
    // nightstands with lamps
    for (const s of [-1, 1]) {
      const n = new THREE.Group();
      add(n, rbox(0.45, 0.5, 0.42, 'darkWood', 0.015), 0, 0.25, 0.21);
      add(n, cyl(0.05, 0.07, 0.25, 'ceramic'), 0, 0.62, 0.21);
      const shade = add(n, cyl(0.11, 0.14, 0.2, 'lightWarm', 24), 0, 0.84, 0.21);
      shade.castShadow = false;
      const off = s * (W / 2 + 0.38);
      const dx = Math.cos(rot) * off, dz = -Math.sin(rot) * off;
      place(n, x + dx, F, z + dz, rot);
    }
  }
  bed(0.14, 1.6, Math.PI / 2);          // bedroom 1 — head on the left wall
  bed(8.15, 3.25, -Math.PI / 2, 1.5);   // bedroom 2 — head on the dining wall
  bed(2.5, 12.98, Math.PI);             // master — head on the front wall

  // ---------- Built-in wardrobes ----------
  function wardrobe(x0, z0, x1, z1, front) {
    const h = F + 2.4;
    b.box(x0, F, z0, x1, h, z1, 'cabinet');
    b.box(x0, h, z0, x1, h + 0.02, z1, 'paint', { collide: false });
    const along = front === 'pz' || front === 'nz' ? [x0, x1] : [z0, z1];
    const n = Math.max(2, Math.round((along[1] - along[0]) / 0.55));
    for (let i = 1; i < n; i++) {
      const s = along[0] + ((along[1] - along[0]) * i) / n;
      if (front === 'nz') b.box(s - 0.004, F + 0.02, z0 - 0.003, s + 0.004, h - 0.02, z0, 'metalBlack', { collide: false });
      if (front === 'pz') b.box(s - 0.004, F + 0.02, z1, s + 0.004, h - 0.02, z1 + 0.003, 'metalBlack', { collide: false });
      if (front === 'px') b.box(x1, F + 0.02, s - 0.004, x1 + 0.003, h - 0.02, s + 0.004, 'metalBlack', { collide: false });
      const hs = s + (i % 2 ? -0.06 : 0.06);
      if (front === 'nz') b.box(hs - 0.01, F + 0.9, z0 - 0.03, hs + 0.01, F + 1.3, z0, 'chrome', { collide: false });
      if (front === 'pz') b.box(hs - 0.01, F + 0.9, z1, hs + 0.01, F + 1.3, z1 + 0.03, 'chrome', { collide: false });
      if (front === 'px') b.box(x1, F + 0.9, hs - 0.01, x1 + 0.03, F + 1.3, hs + 0.01, 'chrome', { collide: false });
    }
  }
  wardrobe(0.14, 3.25, 3.10, 3.85, 'nz');
  wardrobe(4.99, 5.10, 8.15, 5.70, 'nz');
  // master walk-in closet: L-shaped wardrobes, path from the bedroom straight to the master bath
  wardrobe(0.14, 7.29, 0.74, 8.90, 'px');
  wardrobe(0.74, 7.29, 2.05, 7.89, 'pz');

  // ---------- Living room ----------
  function sofa(x, z, rot, L = 2.2) {
    const g = new THREE.Group();
    const D = 0.92;
    add(g, rbox(L, 0.22, D, 'fabricDark', 0.03), 0, 0.17, 0);
    for (const s of [-1, 1]) add(g, rbox(0.2, 0.62, D, 'fabric', 0.06), s * (L / 2 - 0.1), 0.31, 0);
    const seats = 3;
    const sw = (L - 0.4) / seats;
    for (let i = 0; i < seats; i++) {
      const cx = -L / 2 + 0.2 + sw * (i + 0.5);
      add(g, rbox(sw - 0.02, 0.18, D - 0.25, 'fabric', 0.06), cx, 0.37, 0.1);
      add(g, rbox(sw - 0.02, 0.48, 0.2, 'fabric', 0.08), cx, 0.66, -D / 2 + 0.16);
    }
    place(g, x, F, z, rot);
  }
  sofa(4.30 + 0.47, 8.8, Math.PI / 2, 2.2);
  sofa(5.85, 10.90 - 0.48, Math.PI, 2.0);
  // coffee table
  b.box(5.65, F + 0.36, 8.3, 6.35, F + 0.42, 9.5, 'darkWood');
  for (const [x, z] of [[5.7, 8.35], [6.3, 8.35], [5.7, 9.45], [6.3, 9.45]]) b.box(x - 0.02, F, z - 0.02, x + 0.02, F + 0.36, z + 0.02, 'metalBlack', { collide: false });

  // ---------- Dining (table for 6) ----------
  b.box(9.6, F + 0.72, 3.1, 10.6, F + 0.76, 5.1, 'darkWood');
  for (const [x, z] of [[9.68, 3.18], [10.52, 3.18], [9.68, 5.02], [10.52, 5.02]]) b.box(x - 0.03, F, z - 0.03, x + 0.03, F + 0.72, z + 0.03, 'darkWood', { collide: false });
  function chair(x, z, rot) {
    const g = new THREE.Group();
    add(g, rbox(0.46, 0.08, 0.46, 'fabric', 0.03), 0, 0.46, 0);
    add(g, rbox(0.46, 0.5, 0.05, 'darkWood', 0.02), 0, 0.73, -0.21);
    for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) add(g, cyl(0.015, 0.015, 0.44, 'metalBlack', 8), lx, 0.22, lz);
    place(g, x, F, z, rot);
  }
  for (const z of [3.5, 4.1, 4.7]) {
    chair(9.3, z, Math.PI / 2);
    chair(10.9, z, -Math.PI / 2);
  }

  // ---------- Kitchen ----------
  const top = F + 0.9;
  b.box(8.32, F, 7.71, 9.12, F + 1.85, 8.41, 'steel');
  b.box(8.95, F + 0.9, 7.68, 8.98, F + 1.6, 7.71, 'chrome', { collide: false });
  b.box(9.12, F, 7.84, 12.53, top - 0.04, 8.41, 'cabinet');
  b.box(9.12, top - 0.04, 7.80, 12.53, top, 8.41, 'counter');
  b.box(11.93, F, 5.08, 12.53, top - 0.04, 7.84, 'cabinet');
  b.box(11.89, top - 0.04, 5.08, 12.53, top, 7.80, 'counter');
  b.box(10.3, top, 7.92, 11.1, top + 0.004, 8.3, 'steel', { collide: false });
  b.box(10.68, top, 8.3, 10.72, top + 0.32, 8.34, 'chrome', { collide: false });
  b.box(10.68, top + 0.28, 8.1, 10.72, top + 0.32, 8.34, 'chrome', { collide: false });
  b.box(12.0, top, 6.6, 12.48, top + 0.006, 7.3, 'blackGlass', { collide: false });
  b.box(12.0, F + 1.6, 6.6, 12.53, F + 1.75, 7.3, 'steel');
  b.box(12.25, F + 1.75, 6.85, 12.53, H.C, 7.05, 'steel');
  b.box(12.18, F + 1.5, 5.15, 12.53, F + 2.3, 6.45, 'cabinet');
  b.box(12.18, F + 1.5, 7.45, 12.53, F + 2.3, 7.8, 'cabinet');
  // island with overhang towards the stools
  b.box(8.95, F, 6.42, 11.23, F + 0.88, 7.0, 'cabinet');
  b.box(8.9, F + 0.88, 6.15, 11.28, F + 0.93, 7.05, 'counter');
  for (const x of [9.34, 9.82, 10.32, 10.84]) {
    const g = new THREE.Group();
    add(g, cyl(0.2, 0.2, 0.06, 'fabricDark', 24), 0, 0.75, 0);
    add(g, cyl(0.025, 0.025, 0.72, 'chrome', 10), 0, 0.37, 0);
    add(g, cyl(0.2, 0.22, 0.02, 'chrome', 24), 0, 0.01, 0);
    place(g, x, F, 5.9, 0);
  }

  // ---------- Bathrooms ----------
  function toilet(x, z, rot) {
    const g = new THREE.Group();
    add(g, rbox(0.38, 0.38, 0.2, 'ceramic', 0.04), 0, 0.62, 0.1);
    add(g, rbox(0.36, 0.38, 0.5, 'ceramic', 0.12), 0, 0.2, 0.36);
    add(g, rbox(0.38, 0.03, 0.46, 'ceramic', 0.015), 0, 0.41, 0.38);
    place(g, x, F, z, rot);
  }
  function vanity(x0, z0, x1, z1, wallSide) {
    b.box(x0, F + 0.15, z0, x1, F + 0.8, z1, 'cabinet');
    b.box(x0, F + 0.8, z0, x1, F + 0.85, z1, 'ceramic');
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    b.box(cx - 0.18, F + 0.85, cz - 0.13, cx + 0.18, F + 0.852, cz + 0.13, 'steel', { collide: false });
    const mz = wallSide === 'pz' ? z1 - 0.012 : z0;
    b.box(x0 + 0.04, F + 1.15, mz, x1 - 0.04, F + 1.95, mz + 0.012, 'mirror', { collide: false });
  }
  toilet(1.9, 5.70, Math.PI);  // bath 1
  vanity(2.45, 5.20, 3.06, 5.70, 'pz');
  toilet(1.9, 5.85, 0);        // bath 2
  vanity(2.45, 5.85, 3.06, 6.35, 'nz');
  toilet(7.05, 1.54, Math.PI); // service bath
  vanity(7.55, 1.12, 8.12, 1.54, 'pz');

  // ---------- Laundry (patio corner) ----------
  for (const z of [0.25, 0.9]) {
    b.box(13.1, 0.4, z, 13.7, 1.3, z + 0.6, 'ceramic');
    const door = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), mats.blackGlass);
    door.position.set(13.095, 0.85, z + 0.3);
    door.rotation.y = -Math.PI / 2;
    group.add(door);
  }

  // ---------- Cars (from the render: white Toyota SUV + black BMW SUV) ----------
  // parked nose-out, leaving a path along the right side to the stairs
  for (const [style, x] of [['toyota', 9.4], ['bmw', 11.55]]) {
    place(buildSUV(style, mats), x, H.CF, 11.1, 0, false);
    b.addCollider(x - 0.98, H.CF, 11.1 - 2.4, x + 0.98, H.CF + 1.75, 11.1 + 2.4);
  }

  return group;
}
