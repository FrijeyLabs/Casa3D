import * as THREE from 'three';
import { createMaterials } from './materials.js';
import { Builder } from './builder.js';
import { buildHouse } from './house.js';
import { buildFurniture } from './furniture.js';
import { buildEnvironment } from './environment.js';
import { Doors } from './doors.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const params = new URLSearchParams(location.search);
// phones/tablets (touch laptops with a mouse keep the keyboard + mouse controls)
const touch = matchMedia('(hover: none) and (pointer: coarse)').matches || (params.has('touch') && 'ontouchstart' in window);
const quality = {
  shadowMap: touch ? 2048 : 4096,
  pixelRatio: Math.min(devicePixelRatio, touch ? 1.5 : 2),
  interiorLight: 14,
  ao: !touch && !params.has('noao'), // ambient occlusion (soft contact shadows) on computers
};

const ui = {
  overlay: document.getElementById('overlay'),
  start: document.getElementById('start'),
  bar: document.getElementById('bar'),
  status: document.getElementById('status'),
  prompt: document.getElementById('prompt'),
  hud: document.getElementById('hud'),
  touchUI: document.getElementById('touchui'),
  btnUse: document.getElementById('btnUse'),
};
document.body.classList.toggle('touch', touch);

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(quality.pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
// ~55° vertical field of view: close to how the eye sees, so the house doesn't look small/far away
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 6000);

const manager = new THREE.LoadingManager();
manager.onProgress = (_url, loaded, total) => {
  ui.bar.style.width = `${Math.round((loaded / total) * 100)}%`;
};
let ready = false;
manager.onLoad = () => {
  ready = true;
  ui.status.textContent = touch ? 'Toca para entrar' : 'Haz clic para entrar';
  ui.start.disabled = false;
  document.body.classList.add('loaded');
  if (params.has('play')) begin(); // debug: skip the title screen
  if (params.has('stats')) setTimeout(() => { document.title = `calls=${renderer.info.render.calls} tris=${renderer.info.render.triangles}`; }, 1000);
};

const mats = createMaterials(manager, renderer);
const builder = new Builder(mats);
const doors = new Doors(scene, mats, builder.colliders);

buildHouse(builder, doors);
buildFurniture(builder, mats, scene);
buildEnvironment(scene, renderer, builder, mats, quality);
scene.add(builder.finalize());

// ---------- post-processing: ambient occlusion ----------
let composer = null;
if (quality.ao) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  ao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.2, scale: 1.1, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  ao.blendIntensity = 0.9;
  // glass, sprites (clouds) and decals don't occlude
  ao.overrideVisibility = function () {
    const cache = this._visibilityCache;
    this.scene.traverse((o) => {
      cache.set(o, o.visible);
      if (o.isPoints || o.isLine || o.isSprite || o.userData.noAO) o.visible = false;
    });
  };
  composer.addPass(ao);
  composer.addPass(new OutputPass());
}
scene.traverse((o) => { if (o.isMesh && o.material && o.material.transparent) o.userData.noAO = true; });

// ---------- player ----------
const input = new Input(renderer.domElement, touch);
const player = new Player(camera, builder.colliders);
player.setSpawn(7.0, 0.12, 21.5, 0); // on the street, facing the façade like the render

// ---------- start / pause ----------
let playing = false;
let started = false;
function begin() {
  if (!ready) return;
  playing = true;
  started = true;
  input.enabled = true;
  ui.overlay.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  if (touch) {
    ui.touchUI.classList.remove('hidden');
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  } else {
    input.lock();
  }
}
ui.start.addEventListener('click', begin);
input.onLockChange = (locked) => {
  if (!locked && playing && !touch) {
    playing = false;
    input.enabled = false;
    ui.status.textContent = 'Pausa — haz clic para continuar';
    ui.overlay.classList.remove('hidden');
    ui.hud.classList.add('hidden');
  }
};

// ---------- debug camera for screenshots: ?view=x,y,z,yawDeg,pitchDeg ----------
const view = params.get('view');
if (view) {
  const [x, y, z, yaw, pitch] = view.split(',').map(Number);
  ui.overlay.classList.add('hidden');
  camera.position.set(x, y, z);
  camera.rotation.set(THREE.MathUtils.degToRad(pitch || 0), THREE.MathUtils.degToRad(yaw || 0), 0, 'YXZ');
  if (params.has('open')) for (const d of doors.list) { d.target = 1; }
  if (params.has('cut')) renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), Number(params.get('cut')))];
}

// ---------- interaction ----------
const ray = new THREE.Raycaster();
ray.far = 2.8;
const center = new THREE.Vector2(0, 0);
let target = null;
function updateInteraction() {
  camera.updateMatrixWorld();
  ray.setFromCamera(center, camera);
  const hit = ray.intersectObjects(doors.pickables, false)[0];
  target = hit ? hit.object.userData.door : null;
  if (target) {
    const verb = target.target > 0.5 ? 'Cerrar' : 'Abrir';
    ui.prompt.textContent = touch ? `${verb}: ${target.label}` : `E · ${verb} ${target.label}`;
    ui.prompt.classList.add('show');
    ui.btnUse.classList.add('show');
  } else {
    ui.prompt.classList.remove('show');
    ui.btnUse.classList.remove('show');
  }
  if (input.consumeUse() && target) doors.toggle(target);
}

if (params.has('test')) {
  import('./selftest.js').then((m) => m.run({ player, input, doors, interact: updateInteraction }));
}

// ---------- loop ----------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  doors.update(view ? 1 : dt);
  if (playing) {
    player.update(dt, input);
    updateInteraction();
  } else if (!view && !started) {
    // title screen: look at the façade from the street
    camera.position.set(7.0, 1.6, 21.5);
    camera.rotation.set(0.06, 0, 0, 'YXZ');
  }
  if (composer) composer.render(dt);
  else renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (composer) composer.setSize(innerWidth, innerHeight);
});
