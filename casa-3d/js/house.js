import * as THREE from 'three';

// Casa Fraylin y Marlenis — geometry taken from the plan "CASA MARLENI, FACHADA".
// Coordinates in meters. Origin = back-left exterior corner of the house.
// +X = towards the right side (as seen from the street), +Z = towards the street.
// Plan dimensions: lot 15.95 x 19.00, house 13.85 x 14.06, setbacks L 1.00 / R 1.10 / back 3.34 / front 1.61.

export const H = {
  F: 0.5,   // finished floor level (house is raised ~3 steps)
  C: 3.5,   // ceiling (3.0 m rooms)
  R: 3.7,   // roof slab top
  P: 4.15,  // parapet top
  T: 4.75,  // tall front volume top (render)
  CP: 3.4,  // carport ceiling
  CF: 0.3,  // carport floor (raised too, with a ramp down to the street)
  W: 13.85, // house width
  D: 14.06, // house depth (carport front)
};

export const LOT = { x0: -1.0, x1: 14.95, z0: -3.34, z1: 15.66 };

export function buildHouse(b, doors) {
  const { F, C, R, P, T, CP, CF } = H;
  const DH = F + 2.1; // interior door head

  // ---------- Floor slabs (0 → F) ----------
  const slab = { all: 'stucco', top: 'floor' };
  b.box(0, 0, 0, 4.39, F, 13.12, slab);
  b.box(4.39, 0, 1.54, 6.56, F, 13.12, slab);
  b.box(6.56, 0, 0, 8.30, F, 13.12, slab);
  b.box(8.30, 0, 2.01, 13.85, F, 8.55, slab);
  // bathroom floor overlays
  b.box(0.14, F, 4.0, 3.10, F + 0.008, 5.70, 'bathFloor', { collide: false });
  b.box(0.14, F, 5.85, 3.10, F + 0.008, 7.14, 'bathFloor', { collide: false });
  b.box(6.70, F, 0.15, 8.15, F + 0.008, 1.54, 'bathFloor', { collide: false });

  // ---------- Exterior walls ----------
  // Left side (bedroom 1, bathrooms, master)
  b.wallZ(0, 13.12, 0, 0.14, F, C, { all: 'stucco', px: 'paint' }, [
    { a0: 4.55, a1: 5.15, y0: F + 1.7, y1: F + 2.25 },
    { a0: 6.35, a1: 6.95, y0: F + 1.7, y1: F + 2.25 },
    { a0: 10.32, a1: 12.14, y0: F + 0.9, y1: F + 2.4 },
  ]);
  b.window('z', 4.55, 5.15, F + 1.7, F + 2.25, 0.07);
  b.window('z', 6.35, 6.95, F + 1.7, F + 2.25, 0.07);
  b.window('z', 10.32, 12.14, F + 0.9, F + 2.4, 0.07, { cols: 3, rows: 2 });

  // Back of bedroom 1
  b.wallX(0.14, 4.39, 0, 0.15, F, C, { all: 'stucco', pz: 'paint' }, [{ a0: 1.3, a1: 3.0, y0: F + 1.0, y1: F + 2.3 }]);
  b.window('x', 1.3, 3.0, F + 1.0, F + 2.3, 0.075, { cols: 2, rows: 2 });
  // Back notch between bedroom 1 and the service bathroom
  b.wallZ(0.15, 1.69, 4.24, 4.39, F, C, { all: 'stucco', nx: 'paint' });
  b.wallX(4.39, 6.56, 1.54, 1.69, F, C, { all: 'stucco', pz: 'paint' }, [{ a0: 4.95, a1: 6.25, y0: F + 1.0, y1: F + 2.3 }]);
  b.window('x', 4.95, 6.25, F + 1.0, F + 2.3, 1.615, { cols: 2, rows: 2 });
  b.wallZ(0, 1.69, 6.56, 6.70, F, C, { all: 'stucco', px: 'paint' });
  // Service half-bath (patio)
  b.wallX(6.70, 8.30, 0, 0.15, F, C, { all: 'stucco', pz: 'paint' }, [{ a0: 7.15, a1: 7.75, y0: F + 1.7, y1: F + 2.2 }]);
  b.window('x', 7.15, 7.75, F + 1.7, F + 2.2, 0.075);
  b.wallZ(0.15, 2.15, 8.15, 8.30, F, C, { all: 'stucco', nx: 'paint' }, [{ a0: 0.15, a1: 1.06, y0: F, y1: DH }]);
  // Dining → patio (sliding glass door)
  b.wallX(8.30, 12.12, 2.01, 2.15, F, C, { all: 'stucco', pz: 'paint' }, [{ a0: 8.6, a1: 11.9, y0: F, y1: F + 2.4 }]);
  b.box(8.6, F + 2.4, 2.03, 11.9, F + 2.45, 2.13, 'metalBlack', { collide: false });
  // Storage room (under the top of the stairs) → galería
  b.wallX(12.12, 13.71, 2.01, 2.15, F, C, { all: 'stucco', pz: 'paint' }, [{ a0: 12.30, a1: 12.98, y0: F, y1: DH }]);
  // Right side (stairs)
  b.wallZ(2.01, 8.55, 13.71, 13.85, F, C, { all: 'stucco', nx: 'paint' }, [{ a0: 6.0, a1: 7.0, y0: 2.6, y1: 3.25 }]);
  b.window('z', 6.0, 7.0, 2.6, 3.25, 13.78);
  // Kitchen / stairs → carport wall
  b.wallX(8.30, 13.71, 8.41, 8.55, F, C, { all: 'paint', pz: 'stucco' }, [
    { a0: 9.57, a1: 11.39, y0: F + 1.05, y1: F + 1.75 },
    { a0: 12.67, a1: 13.71, y0: F, y1: F + 2.4 },   // stairs go up from the carport
  ]);
  b.window('x', 9.57, 11.39, F + 1.05, F + 1.75, 8.48, { cols: 3 });
  // Living ↔ carport wall
  b.wallZ(7.77, 11.03, 8.15, 8.30, F, C, { all: 'paint', px: 'stucco' });
  b.wallZ(11.03, 13.12, 8.15, 8.30, F, C, 'stucco');
  // Living room façade (big window + front door), recessed behind the porch
  b.wallX(4.30, 8.15, 10.90, 11.03, F, C, { all: 'paint', pz: 'stucco' }, [
    { a0: 5.55, a1: 6.82, y0: F + 0.3, y1: F + 2.4 },
    { a0: 6.94, a1: 8.15, y0: F, y1: F + 2.4 },
  ]);
  b.window('x', 5.55, 6.82, F + 0.3, F + 2.4, 10.965, { cols: 3, rows: 3 });
  // vertical wood-slat panel left of the window (render)
  b.box(4.30, F, 11.03, 5.47, C, 11.05, 'slatBack', { collide: false });
  for (let x = 4.33; x < 5.45; x += 0.085) b.box(x, F, 11.05, x + 0.05, C, 11.1, 'slat', { collide: false });
  b.box(6.94, F + 2.4, 10.90, 8.15, F + 2.45, 11.03, 'metalBlack', { collide: false });
  // Master bedroom right wall / porch left wall
  b.wallZ(10.90, 13.12, 4.15, 4.30, F, C, { all: 'paint', px: 'stucco' });
  // Master bedroom front (tall black window, from the render)
  b.wallX(0, 4.30, 12.98, 13.12, F, C, { all: 'stucco', nz: 'paint' }, [{ a0: 0.3, a1: 1.15, y0: F + 0.1, y1: C - 0.1 }]);
  b.window('x', 0.3, 1.15, F + 0.1, C - 0.1, 13.05, { cols: 2, rows: 4 });

  // ---------- Interior walls ----------
  const pt = 'paint';
  b.wallX(0.14, 3.24, 3.85, 4.0, F, C, pt);                // bedroom 1 / hall
  b.box(3.24, DH, 3.85, 4.24, C, 4.0, pt);                 // lintel bedroom 1 door
  b.wallZ(1.69, 4.0, 4.24, 4.39, F, C, pt);                // bedroom 1 / bedroom 2
  b.box(4.24, DH, 4.0, 4.39, C, 4.90, pt);                 // lintel bedroom 2 door
  b.box(4.24, F, 4.90, 4.99, C, 5.85, pt);                 // column
  b.wallZ(4.0, 9.05, 3.10, 3.24, F, C, pt, [               // bath 1 → hall
    { a0: 4.0, a1: 4.90, y0: F, y1: DH },
  ]);
  b.wallX(0.14, 3.10, 5.70, 5.85, F, C, pt);               // bath 1 / bath 2
  b.wallX(0.14, 3.10, 7.14, 7.29, F, C, pt, [{ a0: 2.19, a1: 3.10, y0: F, y1: DH }]);
  b.wallX(0.14, 3.10, 8.90, 9.05, F, C, pt, [{ a0: 2.2, a1: 3.10, y0: F, y1: DH }]); // master → walk-in closet → master bath
  b.box(3.24, DH, 8.90, 4.15, C, 9.05, pt);                // lintel master door
  b.wallX(4.99, 8.15, 5.70, 5.85, F, C, pt);               // bedroom 2 / living
  b.wallZ(2.15, 5.85, 8.15, 8.30, F, C, pt);               // bedroom 2 / dining
  b.wallX(6.56, 8.30, 1.54, 1.69, F, C, pt);               // service bath / bedroom 2
  b.wallZ(2.15, 4.95, 12.12, 12.26, F, C, pt);             // dining / stair passage
  b.wallX(12.12, 12.53, 4.95, 5.08, F, C, pt);
  b.wallZ(4.04, 8.41, 12.53, 12.67, F, C, pt);             // kitchen + storage / stairs
  b.wallZ(7.09, 10.90, 4.15, 4.30, F, C, pt);              // hall+master / living

  // Showers (tiles + glass)
  const tile = 'bathWall';
  for (const [z0, z1, g0, g1] of [[4.0, 5.70, 4.0, 4.9], [5.85, 7.14, 6.25, 7.14]]) {
    b.box(0.14, F, z0, 0.155, F + 2.2, z1, tile, { collide: false });
    b.box(0.14, F, z0, 1.03, F + 2.2, z0 + 0.012, tile, { collide: false });
    b.box(0.14, F, z1 - 0.012, 1.03, F + 2.2, z1, tile, { collide: false });
    b.box(1.02, F, g0, 1.04, F + 2.0, g1, 'showerGlass');
    b.box(1.02, F + 2.0, g0, 1.045, F + 2.03, g1, 'chrome', { collide: false });
    b.box(0.155, F + 1.95, (z0 + z1) / 2 - 0.1, 0.4, F + 1.98, (z0 + z1) / 2 + 0.1, 'chrome', { collide: false });
  }

  // ---------- Stairs to the roof: start in the carport, climb towards the back (16 × 0.20 m) ----------
  const run = (8.41 - 4.04) / 16;
  for (let i = 0; i < 16; i++) {
    const z1 = 8.41 - i * run;
    b.box(12.67, F, z1 - run, 13.71, F + (i + 1) * 0.2, z1, { all: 'paint', top: 'floor' });
    b.box(12.67, F + (i + 1) * 0.2, z1 - 0.03, 13.71, F + (i + 1) * 0.2 + 0.005, z1, 'darkWood', { collide: false });
  }
  // continuous handrail on the kitchen-side wall, with wall brackets
  const ra = new THREE.Vector3(12.75, F + 0.2 + 0.9, 8.3), rb = new THREE.Vector3(12.75, F + 3.2 + 0.9, 4.3);
  const dir = rb.clone().sub(ra);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, dir.length(), 10), b.mats.darkWood);
  rail.position.copy(ra).addScaledVector(dir, 0.5);
  rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  b.add(rail);
  for (let t = 0.08; t < 1; t += 0.28) {
    const p = ra.clone().addScaledVector(dir, t);
    b.box(12.67, p.y - 0.08, p.z - 0.012, 12.75, p.y - 0.02, p.z + 0.012, 'chrome', { collide: false });
  }

  // ---------- Roof slabs (C → R), with an opening above the stairs ----------
  const roof = { all: 'stucco', bottom: 'ceiling', top: 'concrete' };
  b.box(0, C, 0, 4.39, R, 13.12, roof);
  b.box(4.39, C, 1.54, 6.56, R, 13.12, roof);
  b.box(6.56, C, 0, 8.30, R, 13.12, roof);
  b.box(8.30, C, 0, 13.85, R, 4.04, roof);        // includes the galería
  b.box(8.30, C, 4.04, 12.53, R, 8.55, roof);
  b.box(13.71, C, 4.04, 13.85, R, 8.55, roof);
  b.box(12.53, C, 7.6, 13.71, R, 8.55, roof);
  b.box(8.30, C - 0.35, 0, 13.71, C, 0.22, { all: 'stucco', bottom: 'ceiling' }); // galería beam
  // carport roof with wood ceiling (render)
  b.box(8.30, CP, 8.55, 13.85, R, 14.06, { all: 'trim', bottom: 'woodCeil', top: 'concrete' });
  b.box(8.15, CP - 0.05, 13.95, 13.95, P, 14.25, { all: 'trim', top: 'concrete' });
  b.box(8.3, CP - 0.06, 14.1, 13.85, CP - 0.05, 14.2, 'lightWarm', { collide: false });

  // Parapets
  const par = { all: 'stucco', top: 'trim' };
  b.box(0, R, 0, 0.15, P, 9.0, par);
  b.box(0.15, R, 0, 4.39, P, 0.15, par);
  b.box(4.24, R, 0.15, 4.39, P, 1.69, par);
  b.box(4.39, R, 1.54, 6.56, P, 1.69, par);
  b.box(6.56, R, 0, 6.70, P, 1.54, par);
  b.box(6.70, R, 0, 8.30, P, 0.15, par);
  b.box(8.30, R, 0, 13.85, P, 0.15, par);
  b.box(13.70, R, 0.15, 13.85, P, 13.95, par);
  b.box(8.15, R, 13.12, 8.30, P, 13.95, par);
  // railing around the stair opening
  b.addCollider(12.47, R, 4.04, 12.53, R + 1.0, 7.66);
  b.addCollider(12.47, R, 7.6, 13.70, R + 1.0, 7.66);
  b.box(12.47, R + 0.96, 4.04, 12.53, R + 1.0, 7.66, 'metalBlack', { collide: false });
  b.box(12.47, R + 0.96, 7.6, 13.70, R + 1.0, 7.66, 'metalBlack', { collide: false });
  b.box(12.48, R + 0.45, 4.04, 12.52, R + 0.48, 7.66, 'metalBlack', { collide: false });
  b.box(12.48, R + 0.45, 7.61, 13.70, R + 0.48, 7.65, 'metalBlack', { collide: false });
  for (let z = 4.06; z < 7.7; z += 0.9) b.box(12.48, R, z - 0.02, 12.52, R + 0.96, z + 0.02, 'metalBlack', { collide: false });
  for (const x of [13.1, 13.68]) b.box(x - 0.02, R, 7.61, x + 0.02, R + 0.96, 7.65, 'metalBlack', { collide: false });

  // ---------- Tall front volume (master + porch) ----------
  // left volume (master) is the most forward plane; the centre volume above the porch is set back
  b.box(0, R, 9.0, 0.15, T, 13.12, 'stucco');
  b.box(0.15, R, 12.97, 4.30, T, 13.12, 'stucco');
  b.box(4.30, R, 12.55, 8.30, T, 12.7, 'stucco');
  b.box(4.30, C - 0.1, 12.55, 8.30, R, 12.7, 'stucco', { collide: false });
  b.box(8.15, R, 9.0, 8.30, T, 12.55, 'stucco');
  b.box(0.15, R, 9.0, 8.15, T, 9.15, 'stucco');
  // thick top slab with LED strip, shared by both volumes (render)
  b.box(-0.25, T, 8.85, 8.55, T + 0.3, 13.42, { all: 'trim', top: 'concrete' });
  b.box(-0.2, T - 0.012, 13.3, 8.5, T, 13.36, 'lightWarm', { collide: false });
  // wood slats over the porch on the left part, plain stucco on the right (render)
  b.box(4.30, C, 12.7, 6.75, T, 12.72, 'slatBack', { collide: false });
  for (let x = 4.33; x < 6.72; x += 0.085) b.box(x, C, 12.72, x + 0.05, T, 12.77, 'slat', { collide: false });
  // porch canopy with downlights, projecting past the stone column
  b.box(3.65, 3.15, 12.7, 8.0, 3.5, 13.75, { all: 'trim', bottom: 'ceiling' });
  b.box(3.7, 3.138, 13.6, 7.95, 3.15, 13.66, 'lightWarm', { collide: false });
  for (const x of [4.6, 5.8, 7.0]) b.box(x - 0.06, 3.14, 13.15, x + 0.06, 3.15, 13.27, 'lightWarm', { collide: false });
  // stacked-stone column at the left of the porch (render)
  b.box(3.70, 0, 13.12, 4.30, 3.15, 13.4, 'stone');
  // stone columns (between porch and carport, carport right corner)
  b.box(7.95, 0, 12.95, 8.6, CP, 14.06, 'stone');
  b.box(13.30, CF, 13.45, 13.85, CP, 14.06, 'stone');
  // wall sconces (black, glowing up and down)
  for (const [x, z, y] of [[3.25, 13.12, 2.3], [8.27, 14.06, 2.2], [13.57, 14.06, 2.2]]) {
    b.box(x - 0.06, y - 0.16, z, x + 0.06, y + 0.16, z + 0.12, 'metalBlack', { collide: false });
    b.box(x - 0.04, y + 0.16, z + 0.02, x + 0.04, y + 0.17, z + 0.1, 'lightWarm', { collide: false });
    b.box(x - 0.04, y - 0.17, z + 0.02, x + 0.04, y - 0.16, z + 0.1, 'lightWarm', { collide: false });
  }

  // ---------- Carport ----------
  b.box(8.30, 0, 8.55, 13.71, CF, 14.06, { all: 'stucco', top: 'porchFloor' });
  b.wallZ(8.55, 13.45, 13.71, 13.85, 0, CP, 'stucco', [{ a0: 9.3, a1: 10.5, y0: CF + 0.9, y1: CF + 2.8 }]);
  b.window('z', 9.3, 10.5, CF + 0.9, CF + 2.8, 13.78, { cols: 2, rows: 3 });

  // ---------- Back galería (roofed, open to the back patio) ----------
  b.box(8.30, 0, 0, 13.71, 0.4, 2.01, { all: 'stucco', top: 'porchFloor' });
  b.box(8.30, 0, -0.3, 13.71, 0.2, 0, { all: 'stucco', top: 'porchFloor' });
  b.wallZ(0, 2.01, 13.71, 13.85, 0, C, { all: 'stucco' });

  // ---------- Front steps ----------
  const st = { all: 'porchFloor' };
  b.box(6.4, 0, 13.12, 7.95, F, 13.42, st);
  b.box(6.4, 0, 13.42, 7.95, 0.333, 13.72, st);
  b.box(6.4, 0, 13.72, 7.95, 0.167, 14.02, st);
  for (const [z, y] of [[13.72, 0.333], [14.02, 0.167]]) b.box(6.45, y - 0.03, z, 7.9, y - 0.015, z + 0.006, 'lightWarm', { collide: false });

  // ---------- Ceiling downlights ----------
  const lamps = [
    [2.2, 1.9], [6.3, 3.4], [2.2, 11.0], [3.7, 4.4], [3.7, 6.5], [3.7, 8.2],
    [6.2, 7.2], [6.2, 9.4], [10.1, 3.3], [10.1, 4.8], [9.5, 6.9], [11.2, 6.9],
    [1.6, 4.85], [1.6, 6.5], [7.4, 0.85], [1.6, 8.1], [12.95, 3.1], [9.8, 1.0], [12.0, 1.0],
    [5.4, 12.0], [7.0, 12.0], [9.7, 10.0], [12.2, 10.0], [9.7, 12.6], [12.2, 12.6],
  ];
  for (const [x, z] of lamps) {
    const y = z > 8.55 && x > 8.3 ? CP : C;
    b.box(x - 0.07, y - 0.01, z - 0.07, x + 0.07, y, z + 0.07, 'lightWarm', { collide: false });
  }

  // ---------- Doors ----------
  doors.addHinged({ hinge: [4.22, 3.925], closed: [-1, 0], open: [0, -1], width: 0.96, y0: F, label: 'Habitación 1' });
  doors.addHinged({ hinge: [3.17, 4.02], closed: [0, 1], open: [-1, 0], width: 0.86, y0: F, label: 'Baño 1' });
  doors.addHinged({ hinge: [4.315, 4.02], closed: [0, 1], open: [1, 0], width: 0.86, y0: F, label: 'Habitación 2' });
  doors.addHinged({ hinge: [3.08, 8.975], closed: [-1, 0], open: [0, 1], width: 0.86, y0: F, label: 'Walk-in closet' });
  doors.addHinged({ hinge: [2.21, 7.215], closed: [1, 0], open: [0, -1], width: 0.87, y0: F, label: 'Baño principal' });
  doors.addHinged({ hinge: [4.13, 8.975], closed: [-1, 0], open: [0, 1], width: 0.87, y0: F, label: 'Habitación principal' });
  doors.addHinged({ hinge: [8.225, 0.17], closed: [0, 1], open: [-1, 0], width: 0.87, y0: F, label: 'Baño de servicio' });
  doors.addHinged({ hinge: [12.32, 2.08], closed: [1, 0], open: [0, -1], width: 0.64, y0: F, label: 'Depósito' });
  doors.addHinged({ hinge: [8.13, 10.965], closed: [-1, 0], open: [0, -1], width: 1.17, height: 2.4, y0: F, label: 'Puerta principal', long: true });
  b.window('x', 8.6, 10.3, F, F + 2.4, 2.045, { depth: 0.04 });
  doors.addSliding({ origin: [10.2, 2.11], width: 1.7, height: 2.4, dir: -1, dist: 1.55, y0: F, label: 'Puerta corrediza' });
}
