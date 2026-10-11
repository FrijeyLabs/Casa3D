import * as THREE from 'three';

const angleOf = (d) => Math.atan2(-d[1], d[0]);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Interactive doors. Each door owns a dynamic collider that follows its leaf.
export class Doors {
  constructor(scene, mats, colliders) {
    this.scene = scene;
    this.mats = mats;
    this.colliders = colliders;
    this.list = [];
    this.pickables = [];
    this._box = new THREE.Box3();
  }

  _leaf(width, height, mat, thick = 0.045) {
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(width, height, thick);
    geo.translate(width / 2, height / 2, 0);
    const leaf = new THREE.Mesh(geo, this.mats[mat]);
    leaf.castShadow = leaf.receiveShadow = true;
    g.add(leaf);
    return { g, leaf };
  }

  _handle(group, x, y, thick, long = false) {
    const h = long ? 0.9 : 0.14;
    for (const s of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(long ? 0.03 : 0.14, h, 0.025), this.mats.chrome);
      bar.position.set(x, y, s * (thick / 2 + 0.04));
      group.add(bar);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.05), this.mats.chrome);
      post.position.set(x, y + (long ? 0.3 : 0), s * (thick / 2 + 0.02));
      group.add(post);
    }
  }

  _register(door) {
    door.collider = { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 }, door };
    this.colliders.push(door.collider);
    this.list.push(door);
    door.leaf.userData.door = door;
    this.pickables.push(door.leaf);
    this._sync(door);
  }

  // hinge: [x, z]; closed/open: direction vectors [dx, dz] the leaf points to.
  addHinged({ hinge, closed, open, width, height = 2.1, y0, mat = 'woodDoor', label = 'puerta', long = false }) {
    const thick = long ? 0.06 : 0.045;
    const { g, leaf } = this._leaf(width, height, mat, thick);
    this._handle(g, width - 0.1, long ? 1.1 : 1.0, thick, long);
    const pivot = new THREE.Group();
    pivot.position.set(hinge[0], y0, hinge[1]);
    pivot.add(g);
    this.scene.add(pivot);
    const a0 = angleOf(closed);
    const a1 = a0 + wrap(angleOf(open) - a0);
    pivot.rotation.y = a0;
    this._register({ type: 'hinge', pivot, leaf, a0, a1, t: 0, target: 0, label });
  }

  // Sliding glass panel: origin is its closed left-bottom corner, slides along `dir` by `dist`.
  addSliding({ origin, axis = 'x', width, height, dir = -1, dist, y0, label = 'puerta corrediza' }) {
    const g = new THREE.Group();
    const fw = 0.05;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(width - 2 * fw, height - 2 * fw, 0.012), this.mats.glass);
    glass.position.set(width / 2, height / 2, 0);
    g.add(glass);
    const frameGeo = [
      [width, fw, width / 2, fw / 2], [width, fw, width / 2, height - fw / 2],
      [fw, height, fw / 2, height / 2], [fw, height, width - fw / 2, height / 2],
    ];
    for (const [w, h, x, y] of frameGeo) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), this.mats.metalBlack);
      f.position.set(x, y, 0);
      f.castShadow = true;
      g.add(f);
    }
    // invisible pick plate covering the panel
    const pick = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.05), new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.set(width / 2, height / 2, 0);
    g.add(pick);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.08), this.mats.metalBlack);
    handle.position.set(dir < 0 ? width - 0.12 : 0.12, 1.05, 0);
    g.add(handle);
    g.position.set(origin[0], y0, origin[1]);
    if (axis === 'z') g.rotation.y = -Math.PI / 2;
    this.scene.add(g);
    this._register({ type: 'slide', group: g, leaf: pick, origin: g.position.clone(), axis, dir, dist, t: 0, target: 0, label });
  }

  toggle(door) {
    door.target = door.target > 0.5 ? 0 : 1;
  }

  _sync(door) {
    door.leaf.updateWorldMatrix(true, false);
    this._box.setFromObject(door.leaf);
    const c = door.collider;
    c.min.x = this._box.min.x; c.min.y = this._box.min.y; c.min.z = this._box.min.z;
    c.max.x = this._box.max.x; c.max.y = this._box.max.y; c.max.z = this._box.max.z;
  }

  update(dt) {
    for (const d of this.list) {
      if (d.t === d.target) continue;
      const speed = d.type === 'hinge' ? 1.6 : 1.3;
      d.t = d.target > d.t ? Math.min(d.target, d.t + dt * speed) : Math.max(d.target, d.t - dt * speed);
      const e = d.t * d.t * (3 - 2 * d.t);
      if (d.type === 'hinge') {
        d.pivot.rotation.y = d.a0 + (d.a1 - d.a0) * e;
      } else {
        const off = d.dir * d.dist * e;
        d.group.position.copy(d.origin);
        if (d.axis === 'x') d.group.position.x += off;
        else d.group.position.z += off;
      }
      this._sync(d);
    }
  }
}
