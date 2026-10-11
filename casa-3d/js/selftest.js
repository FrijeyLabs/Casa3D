// Scripted walk-through used for automated checks: open index.html?test
export function run({ player, input, doors, interact }) {
  const out = [];
  const dt = 1 / 60;
  const fmt = (v) => v.toFixed(2);
  const pos = () => `(${fmt(player.pos.x)}, ${fmt(player.pos.y)}, ${fmt(player.pos.z)})`;
  const sim = (secs, keys = []) => {
    input.keys.clear();
    for (const k of keys) input.keys.add(k);
    let maxY = -Infinity;
    for (let t = 0; t < secs; t += dt) {
      player.update(dt, input);
      doors.update(dt);
      interact();
      maxY = Math.max(maxY, player.pos.y);
    }
    input.keys.clear();
    return maxY;
  };
  const check = (name, ok, extra = '') => out.push(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${pos()} ${extra}`);
  const put = (x, y, z, yawDeg) => { player.setSpawn(x, y, z, (yawDeg * Math.PI) / 180); };

  // 1. street → walkway → steps → porch, stopped by the closed front door
  put(7.4, 0.12, 22.5, 0);
  sim(10, ['KeyW']);
  check('walk up the steps to the front door', Math.abs(player.pos.y - 0.5) < 0.01 && player.pos.z > 11.0 && player.pos.z < 11.5);

  // 2. open the front door and walk into the living room
  input.use = true;
  sim(1.5);
  sim(2.5, ['KeyW']);
  check('front door opens, enter living room', player.pos.z < 9.5 && Math.abs(player.pos.y - 0.5) < 0.01);

  // 3. walls block: walk left into the living-room wall (x = 4.30)
  put(6.0, 0.5, 7.3, 90);
  sim(4, ['KeyW']);
  check('living room wall blocks', player.pos.x > 4.30 && player.pos.x < 4.7);

  // 4. stairs: from the carport (beside the cars) up to the roof
  put(13.2, 0.3, 13.0, 0);
  sim(10, ['KeyW']);
  check('carport → stairs → roof', Math.abs(player.pos.y - 3.7) < 0.01 && player.pos.z < 4.0);

  // 5. parapet keeps you on the roof
  put(11.0, 3.7, 12.0, 180);
  sim(5, ['KeyW']);
  check('parapet stops roof edge', Math.abs(player.pos.y - 3.7) < 0.01 && player.pos.z < 14.0);

  // 6. walk back down the stairs into the carport
  put(13.2, 3.7, 2.5, 180);
  sim(3.6, ['KeyW']);
  check('walk down the stairs to the carport', Math.abs(player.pos.y - 0.3) < 0.01 && player.pos.z > 9.0 && player.pos.z < 14.5);

  // 7. jump on the living room floor
  put(6.2, 0.5, 7.0, 0);
  sim(0.3);
  input.jump = true;
  const top = sim(1.5);
  check('jump height ≈ 0.85 m', top - 0.5 > 0.7 && top - 0.5 < 1.0 && Math.abs(player.pos.y - 0.5) < 0.01, `peak ${fmt(top - 0.5)}`);

  // 8. crouch
  input.crouchToggle = true;
  sim(1);
  check('crouch lowers the camera', player.height < 1.1, `height ${fmt(player.height)}`);
  input.crouchToggle = false;
  sim(1);
  check('stand up again', player.height > 1.7, `height ${fmt(player.height)}`);

  // 9. every interior door opens and can be walked through
  let opened = 0;
  for (const d of doors.list) { if (d.target === 0) { doors.toggle(d); opened++; } }
  sim(2);
  put(3.7, 0.5, 6.5, 0);
  sim(3, ['KeyW']);
  check('hallway → bedroom 1 through its door', player.pos.z < 3.6, `(${opened} doors opened)`);
  put(3.7, 0.5, 6.5, 180);
  sim(3.5, ['KeyW']);
  check('hallway → master bedroom', player.pos.z > 9.5);
  put(2.65, 0.5, 10.2, 0);
  sim(5, ['KeyW']);
  check('master → walk-in closet → master bath', player.pos.z < 7.1 && player.pos.z > 5.85);
  put(11.1, 0.5, 3.5, 0);
  sim(4, ['KeyW']);
  check('dining → galería → back patio (open)', player.pos.z < -0.5 && player.pos.y < 0.1);
  put(10.0, 0.03, -2.0, 90);
  sim(5, ['KeyW']);
  check('back patio connects behind the half-bath to the bedroom patio', player.pos.x < 5.0);

  // 10. carport: walk from the street into the carport between the cars
  put(11.0, 0.12, 22.0, 0);
  sim(6, ['KeyW']);
  check('street → ramp → raised carport', player.pos.z < 16 && player.pos.z > 8.5 && Math.abs(player.pos.y - 0.3) < 0.01);

  const log = document.getElementById('log') || document.body.appendChild(Object.assign(document.createElement('pre'), { id: 'log' }));
  log.textContent = out.join('\n');
  document.title = out.every((l) => l.startsWith('PASS')) ? 'TEST OK' : 'TEST FAIL';
  console.log(out.join('\n'));
}
