import * as THREE from 'three';

const RADIUS = 0.28;
const STAND = 1.74;   // body height
const CROUCH = 1.05;
const EYE_OFFSET = 0.12;
const STEP = 0.3;     // max climbable step (stairs are 0.20)
const GRAVITY = 18;
const JUMP_V = 5.6;   // ≈ 0.85 m jump

// First-person body: a vertical cylinder resolved against AABB colliders.
export class Player {
  constructor(camera, colliders) {
    this.camera = camera;
    this.colliders = colliders;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.height = STAND;
    this.eyeY = 0;
    this.onGround = false;
    this.bob = 0;
    this.spawn = { pos: new THREE.Vector3(), yaw: 0 };
  }

  setSpawn(x, y, z, yaw) {
    this.spawn.pos.set(x, y, z);
    this.spawn.yaw = yaw;
    this.respawn();
  }

  respawn() {
    this.pos.copy(this.spawn.pos);
    this.vel.set(0, 0, 0);
    this.yaw = this.spawn.yaw;
    this.pitch = 0;
    this.eyeY = this.pos.y + this.height - EYE_OFFSET;
  }

  _blocked(c, feet, top) {
    return c.max.y > feet + STEP && c.min.y < top;
  }

  _pushOut(feet, top) {
    const p = this.pos;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const c of this.colliders) {
        if (!this._blocked(c, feet, top)) continue;
        const cx = Math.max(c.min.x, Math.min(p.x, c.max.x));
        const cz = Math.max(c.min.z, Math.min(p.z, c.max.z));
        let dx = p.x - cx, dz = p.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= RADIUS * RADIUS) continue;
        if (d2 > 1e-10) {
          const d = Math.sqrt(d2);
          p.x += (dx / d) * (RADIUS - d);
          p.z += (dz / d) * (RADIUS - d);
        } else {
          // centre inside the box: leave by the nearest side
          const opts = [
            [c.min.x - RADIUS - p.x, 0], [c.max.x + RADIUS - p.x, 0],
            [0, c.min.z - RADIUS - p.z], [0, c.max.z + RADIUS - p.z],
          ];
          opts.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
          p.x += opts[0][0];
          p.z += opts[0][1];
        }
        moved = true;
      }
      if (!moved) break;
    }
  }

  _overlapXZ(c, r) {
    const p = this.pos;
    const cx = Math.max(c.min.x, Math.min(p.x, c.max.x));
    const cz = Math.max(c.min.z, Math.min(p.z, c.max.z));
    const dx = p.x - cx, dz = p.z - cz;
    return dx * dx + dz * dz < r * r;
  }

  _spaceAbove(from, to) {
    for (const c of this.colliders) {
      if (c.min.y < to && c.max.y > from + STEP && this._overlapXZ(c, RADIUS * 0.95)) return false;
    }
    return true;
  }

  update(dt, input) {
    // look
    const [lx, ly] = input.consumeLook();
    this.yaw -= lx * 0.0022;
    this.pitch -= ly * 0.0022;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));

    // crouch
    const wantCrouch = input.crouching;
    const targetH = wantCrouch ? CROUCH : STAND;
    if (targetH > this.height && !this._spaceAbove(this.pos.y, this.pos.y + STAND)) {
      // stay crouched under low ceilings
    } else {
      this.height += (targetH - this.height) * Math.min(1, dt * 10);
    }

    // horizontal velocity
    const { f, r } = input.axes();
    const speed = this.height < STAND - 0.2 ? 1.4 : input.running ? 5.0 : 2.6;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const wx = (-sin * f + cos * r) * speed;
    const wz = (-cos * f - sin * r) * speed;
    const accel = this.onGround ? 14 : 3;
    this.vel.x += (wx - this.vel.x) * Math.min(1, dt * accel);
    this.vel.z += (wz - this.vel.z) * Math.min(1, dt * accel);

    if (input.consumeJump() && this.onGround) {
      this.vel.y = JUMP_V;
      this.onGround = false;
    }

    const steps = Math.ceil(dt / (1 / 120));
    const h = dt / steps;
    for (let s = 0; s < steps; s++) this._step(h);

    if (this.pos.y < -20) this.respawn();

    // camera
    const moving = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround && moving > 0.3) this.bob += dt * moving * 2.4;
    const bobY = this.onGround ? Math.sin(this.bob * 2) * 0.025 * Math.min(1, moving / 3) : 0;
    const eye = this.pos.y + this.height - EYE_OFFSET;
    // smooth stair stepping, but follow jumps/falls directly
    this.eyeY = Math.abs(eye - this.eyeY) > 0.6 ? eye : this.eyeY + (eye - this.eyeY) * Math.min(1, dt * 18);
    this.camera.position.set(this.pos.x, this.eyeY + bobY, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  _step(dt) {
    const p = this.pos;
    const wasGround = this.onGround;

    p.x += this.vel.x * dt;
    p.z += this.vel.z * dt;
    this._pushOut(p.y, p.y + this.height);

    this.vel.y -= GRAVITY * dt;
    p.y += this.vel.y * dt;

    // ceiling
    if (this.vel.y > 0) {
      for (const c of this.colliders) {
        if (c.min.y > p.y + STEP && c.min.y < p.y + this.height && this._overlapXZ(c, RADIUS * 0.9)) {
          p.y = c.min.y - this.height;
          this.vel.y = 0;
        }
      }
    }

    // ground
    let ground = -Infinity;
    for (const c of this.colliders) {
      if (c.max.y <= p.y + STEP + 0.001 && c.max.y > ground && this._overlapXZ(c, RADIUS * 0.75)) ground = c.max.y;
    }
    if (p.y <= ground) {
      p.y = ground;
      this.vel.y = 0;
      this.onGround = true;
    } else if (wasGround && this.vel.y <= 0 && p.y - ground < 0.32) {
      p.y = ground; // walk down steps without bouncing
      this.vel.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }
}
