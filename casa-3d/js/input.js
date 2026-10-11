// Keyboard + mouse (pointer lock) on desktop, virtual joystick + drag-to-look on touch.
export class Input {
  constructor(canvas, touch) {
    this.canvas = canvas;
    this.touch = touch;
    this.keys = new Set();
    this.lookX = 0;
    this.lookY = 0;
    this.moveX = 0;
    this.moveY = 0;
    this.jump = false;
    this.crouchToggle = false;
    this.crouchHold = false;
    this.use = false;
    this.locked = false;
    this.enabled = false;

    addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.code === 'Space') { this.jump = true; e.preventDefault(); }
      if (e.code === 'KeyC') this.crouchToggle = !this.crouchToggle;
      if (e.code === 'KeyE' || e.code === 'KeyF') this.use = true;
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (this.onLockChange) this.onLockChange(this.locked);
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.lookX += e.movementX;
      this.lookY += e.movementY;
    });

    if (touch) this._setupTouch();
  }

  lock() {
    if (!this.touch && this.canvas.requestPointerLock) {
      const p = this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    }
  }

  _setupTouch() {
    const stick = document.getElementById('stick');
    const knob = document.getElementById('knob');
    const R = 55;
    let moveId = null, lookId = null, ox = 0, oy = 0, lx = 0, ly = 0;

    const zone = document.getElementById('touchzone');
    zone.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth * 0.45 && moveId === null) {
          moveId = t.identifier;
          ox = t.clientX; oy = t.clientY;
          stick.style.left = ox - 65 + 'px';
          stick.style.top = oy - 65 + 'px';
          stick.classList.add('active');
          knob.style.transform = 'translate(0px,0px)';
        } else if (lookId === null) {
          lookId = t.identifier;
          lx = t.clientX; ly = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === moveId) {
          let dx = t.clientX - ox, dy = t.clientY - oy;
          const d = Math.hypot(dx, dy);
          if (d > R) { dx *= R / d; dy *= R / d; }
          this.moveX = dx / R;
          this.moveY = -dy / R;
          knob.style.transform = `translate(${dx}px,${dy}px)`;
        } else if (t.identifier === lookId) {
          this.lookX += (t.clientX - lx) * 2.2;
          this.lookY += (t.clientY - ly) * 2.2;
          lx = t.clientX; ly = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });

    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === moveId) {
          moveId = null;
          this.moveX = this.moveY = 0;
          stick.classList.remove('active');
        } else if (t.identifier === lookId) lookId = null;
      }
    };
    zone.addEventListener('touchend', end);
    zone.addEventListener('touchcancel', end);

    const btn = (id, down, up) => {
      const el = document.getElementById(id);
      el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.add('pressed'); down(); }, { passive: false });
      el.addEventListener('touchend', (e) => { e.preventDefault(); el.classList.remove('pressed'); if (up) up(); }, { passive: false });
    };
    btn('btnJump', () => { this.jump = true; });
    btn('btnCrouch', () => {
      this.crouchToggle = !this.crouchToggle;
      document.getElementById('btnCrouch').classList.toggle('on', this.crouchToggle);
    });
    btn('btnUse', () => { this.use = true; });
  }

  // forward/right axes in [-1, 1]
  axes() {
    let f = this.moveY, r = this.moveX;
    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) f += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) f -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) r += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) r -= 1;
    const l = Math.hypot(f, r);
    if (l > 1) { f /= l; r /= l; }
    return { f, r };
  }

  get running() { return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'); }
  // (Ctrl is deliberately not used: Ctrl+W would close the browser tab.)
  get crouching() { return this.crouchToggle; }

  consumeLook() {
    const v = [this.lookX, this.lookY];
    this.lookX = this.lookY = 0;
    return v;
  }
  consumeJump() { const j = this.jump; this.jump = false; return j; }
  consumeUse() { const u = this.use; this.use = false; return u; }
}
