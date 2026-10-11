import * as THREE from 'three';

// Collects axis-aligned boxes into one merged mesh per material (few draw calls),
// with UVs in world meters so textures keep their real-world scale everywhere.
// Also records every solid box as an AABB collider for the player.
export class Builder {
  constructor(materials) {
    this.mats = materials;
    this.buckets = new Map();
    this.colliders = [];
    this.group = new THREE.Group();
  }

  bucket(key) {
    let b = this.buckets.get(key);
    if (!b) {
      b = { pos: [], nor: [], uv: [], idx: [] };
      this.buckets.set(key, b);
    }
    return b;
  }

  quad(key, a, b, c, d, n, uvs) {
    if (!key) return;
    const bk = this.bucket(key);
    const base = bk.pos.length / 3;
    for (const p of [a, b, c, d]) bk.pos.push(p[0], p[1], p[2]);
    for (let i = 0; i < 4; i++) bk.nor.push(n[0], n[1], n[2]);
    for (const t of uvs) bk.uv.push(t[0], t[1]);
    bk.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  // faces: string, or {all, sides, top, bottom, px, nx, pz, nz}
  box(x0, y0, z0, x1, y1, z1, faces, opts = {}) {
    if (x1 < x0) [x0, x1] = [x1, x0];
    if (y1 < y0) [y0, y1] = [y1, y0];
    if (z1 < z0) [z0, z1] = [z1, z0];
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
    const f = typeof faces === 'string' ? { all: faces } : faces;
    const side = (k) => (k in f ? f[k] : ('sides' in f ? f.sides : f.all));
    const top = 'top' in f ? f.top : f.all;
    const bottom = 'bottom' in f ? f.bottom : f.all;

    this.quad(side('px'), [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0],
      [[-z1, y0], [-z0, y0], [-z0, y1], [-z1, y1]]);
    this.quad(side('nx'), [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0],
      [[z0, y0], [z1, y0], [z1, y1], [z0, y1]]);
    this.quad(side('pz'), [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1],
      [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
    this.quad(side('nz'), [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1],
      [[-x1, y0], [-x0, y0], [-x0, y1], [-x1, y1]]);
    this.quad(top, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0],
      [[x0, -z1], [x1, -z1], [x1, -z0], [x0, -z0]]);
    this.quad(bottom, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0],
      [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]);

    if (opts.collide !== false) this.addCollider(x0, y0, z0, x1, y1, z1);
  }

  // non-axis-aligned extras (e.g. sloped handrails), added as-is
  add(mesh) {
    mesh.castShadow = mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }

  addCollider(x0, y0, z0, x1, y1, z1) {
    this.colliders.push({ min: { x: x0, y: y0, z: z0 }, max: { x: x1, y: y1, z: z1 } });
  }

  addColliderFromObject(obj, shrink = 0) {
    obj.updateWorldMatrix(true, true);
    const bb = new THREE.Box3().setFromObject(obj);
    this.addCollider(bb.min.x + shrink, bb.min.y, bb.min.z + shrink, bb.max.x - shrink, bb.max.y, bb.max.z - shrink);
  }

  // Wall running along X (x: a0..a1), thickness along Z (t0..t1).
  // openings: [{a0, a1, y0, y1}] cut through the wall.
  wallX(a0, a1, t0, t1, y0, y1, faces, openings = []) {
    this._wall('x', a0, a1, t0, t1, y0, y1, faces, openings);
  }

  // Wall running along Z (z: a0..a1), thickness along X (t0..t1).
  wallZ(a0, a1, t0, t1, y0, y1, faces, openings = []) {
    this._wall('z', a0, a1, t0, t1, y0, y1, faces, openings);
  }

  _wall(axis, a0, a1, t0, t1, y0, y1, faces, openings) {
    const put = (s0, s1, h0, h1) => {
      if (axis === 'x') this.box(s0, h0, t0, s1, h1, t1, faces);
      else this.box(t0, h0, s0, t1, h1, s1, faces);
    };
    const ops = [...openings].sort((p, q) => p.a0 - q.a0);
    let cur = a0;
    for (const o of ops) {
      if (o.a0 > cur) put(cur, o.a0, y0, y1);
      if (o.y0 > y0) put(o.a0, o.a1, y0, o.y0);
      if (o.y1 < y1) put(o.a0, o.a1, o.y1, y1);
      cur = o.a1;
    }
    if (cur < a1) put(cur, a1, y0, y1);
  }

  // Black aluminium window with grid mullions and a glass pane (glass blocks the player).
  window(axis, a0, a1, y0, y1, tc, opts = {}) {
    const cols = opts.cols ?? 1;
    const rows = opts.rows ?? 1;
    const fw = 0.05;
    const d = opts.depth ?? 0.06;
    const frame = opts.frame ?? 'metalBlack';
    const B = (s0, s1, h0, h1, k, dd, col = false) => {
      if (axis === 'x') this.box(s0, h0, tc - dd / 2, s1, h1, tc + dd / 2, k, { collide: col });
      else this.box(tc - dd / 2, h0, s0, tc + dd / 2, h1, s1, k, { collide: col });
    };
    B(a0, a1, y0, y0 + fw, frame, d);
    B(a0, a1, y1 - fw, y1, frame, d);
    B(a0, a0 + fw, y0, y1, frame, d);
    B(a1 - fw, a1, y0, y1, frame, d);
    for (let i = 1; i < cols; i++) {
      const s = a0 + ((a1 - a0) * i) / cols;
      B(s - 0.015, s + 0.015, y0, y1, frame, d * 0.8);
    }
    for (let j = 1; j < rows; j++) {
      const h = y0 + ((y1 - y0) * j) / rows;
      B(a0, a1, h - 0.015, h + 0.015, frame, d * 0.8);
    }
    B(a0 + fw, a1 - fw, y0 + fw, y1 - fw, 'glass', 0.012, true);
  }

  finalize() {
    for (const [key, b] of this.buckets) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setIndex(b.idx);
      g.computeBoundingSphere();
      const mat = this.mats[key];
      if (!mat) console.warn('missing material', key);
      const m = new THREE.Mesh(g, mat);
      m.castShadow = !(mat && mat.userData.noShadow);
      m.receiveShadow = true;
      m.name = key;
      this.group.add(m);
    }
    this.buckets.clear();
    return this.group;
  }
}
