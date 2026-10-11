import * as THREE from 'three';

// All textures are CC0 (Poly Haven / ambientCG). UVs are in meters, so `size`
// is the real-world width in meters that one texture tile covers.
export function createMaterials(manager, renderer) {
  const loader = new THREE.TextureLoader(manager);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const images = {};

  function tex(name, kind, size) {
    const key = name + '_' + kind;
    let entry = images[key];
    if (!entry) {
      entry = { clones: [], loaded: false };
      entry.base = loader.load(`assets/tex/${key}.jpg`, () => {
        entry.loaded = true;
        for (const c of entry.clones) c.needsUpdate = true;
      });
      images[key] = entry;
    }
    const t = entry.base.clone();
    t.source = entry.base.source;
    entry.clones.push(t);
    if (entry.loaded) t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = aniso;
    t.colorSpace = kind === 'diff' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.repeat.set(1 / size, 1 / size);
    return t;
  }

  function textured(name, size, params = {}, normalStrength = 1) {
    const m = new THREE.MeshStandardMaterial({
      map: tex(name, 'diff', size),
      normalMap: tex(name, 'nor', size),
      ...params,
    });
    m.normalScale.set(normalStrength, normalStrength);
    return m;
  }

  const std = (params) => new THREE.MeshStandardMaterial(params);
  // smooth painted surfaces: flat colour + subtle plaster relief from the normal map only
  const painted = (color, size, strength, rough = 0.92) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, normalMap: tex('white_plaster_02', 'nor', size) });
    m.normalScale.set(strength, strength);
    return m;
  };
  const cloth = (color) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 1, normalMap: tex('rough_linen', 'nor', 0.6) });
    m.normalScale.set(0.6, 0.6);
    return m;
  };
  const bright = (m, r, g, b) => { m.color.setRGB(r, g, b, THREE.SRGBColorSpace); return m; };

  const m = {
    // Exterior / interior walls
    stucco: painted(0xe6d3b5, 2.5, 0.35),
    stuccoLight: painted(0xf4ede2, 2.5, 0.3),
    paint: painted(0xf8f3ea, 3, 0.12),
    ceiling: std({ color: 0xf6f4ef, roughness: 0.95 }),
    trim: painted(0x8a7c6c, 2.5, 0.25, 0.8),
    stone: bright(textured('white_sandstone_bricks', 1.3, { roughness: 0.95 }, 1.2), 1.45, 1.32, 1.12),
    slat: bright(textured('kitchen_wood', 1.2, { roughness: 0.5 }), 1.55, 1.08, 0.72),
    slatBack: std({ color: 0x2a1a10, roughness: 0.9 }),
    woodDoor: bright(textured('kitchen_wood', 1.4, { roughness: 0.45 }), 1.35, 0.95, 0.66),
    woodCeil: bright(textured('kitchen_wood', 1.6, { roughness: 0.6 }), 1.6, 1.15, 0.8),
    cabinet: bright(textured('kitchen_wood', 1.2, { roughness: 0.55 }), 1.35, 1.12, 0.92),
    // Floors
    floor: textured('marble_01', 2.1, { color: 0xfaf3e8, roughness: 0.28 }, 0.4),
    bathFloor: textured('large_floor_tiles_02', 1.8, { color: 0xd9d9d6, roughness: 0.35 }, 0.6),
    bathWall: textured('long_white_tiles', 1.2, { color: 0xffffff, roughness: 0.2 }, 0.6),
    porchFloor: textured('marble_01', 2.4, { color: 0xffffff, roughness: 0.22 }, 0.4),
    sidewalk: textured('granite_tile_04', 1.6, { color: 0xc8c4bd, roughness: 0.8 }),
    asphalt: textured('asphalt_02', 9, { color: 0x9a9a9a, roughness: 0.95 }, 0.6),
    grass: textured('grass', 2.2, { color: 0xbfe0a0, roughness: 1 }),
    hedge: textured('grass', 1.0, { color: 0x6f9a50, roughness: 1 }, 2),
    concrete: bright(textured('concrete_floor_02', 4, { roughness: 0.9 }), 1.25, 1.22, 1.18),
    curb: textured('concrete_floor_02', 2, { color: 0xc9c6c0, roughness: 0.9 }),
    // Furniture
    fabric: cloth(0xbdb3a5),
    fabricDark: cloth(0x6a645d),
    bedding: cloth(0xf4f1ec),
    bedThrow: cloth(0x9a7a5c),
    counter: std({ color: 0xf1efea, roughness: 0.15 }),
    darkWood: bright(textured('kitchen_wood', 1.2, { roughness: 0.5 }), 0.75, 0.55, 0.4),
    metalBlack: std({ color: 0x1c1c1c, metalness: 0.5, roughness: 0.45 }),
    steel: std({ color: 0xc9cdd1, metalness: 1, roughness: 0.3 }),
    chrome: std({ color: 0xffffff, metalness: 1, roughness: 0.08 }),
    ceramic: std({ color: 0xfbfbfb, roughness: 0.08 }),
    mirror: std({ color: 0xc4ccd0, metalness: 1, roughness: 0.03 }),
    blackGlass: std({ color: 0x0b0b0b, roughness: 0.08, metalness: 0.2 }),
    rubber: std({ color: 0x151515, roughness: 0.9 }),
    lightWarm: std({ color: 0xffffff, emissive: 0xffdcaa, emissiveIntensity: 2.5 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xc9dde6, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.14,
      envMapIntensity: 1.0, depthWrite: false, side: THREE.DoubleSide,
    }),
    showerGlass: new THREE.MeshPhysicalMaterial({
      color: 0xe8f2f4, roughness: 0.05, transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide,
    }),
    // Neighbourhood (from the lot photos)
    whiteHouse: painted(0xeeeeea, 2.5, 0.5),
    creamHouse: painted(0xe9dcbc, 2.5, 0.5),
    brownTrim: std({ color: 0x6e4b35, roughness: 0.8 }),
    greyTile: textured('granite_tile_04', 0.9, { color: 0x8f8f92, roughness: 0.7 }),
    darkWin: std({ color: 0x1e2428, roughness: 0.15, metalness: 0.4 }),
    metalRoof: std({ color: 0x8796a2, metalness: 0.6, roughness: 0.45 }),
    blockWall: textured('concrete_floor_02', 1.5, { color: 0xa9a6a0, roughness: 0.95 }),
    galv: std({ color: 0xb4b8bb, metalness: 0.8, roughness: 0.4 }),
  };

  m.glass.userData.noShadow = true;
  m.showerGlass.userData.noShadow = true;
  m.lightWarm.userData.noShadow = true;
  return m;
}
