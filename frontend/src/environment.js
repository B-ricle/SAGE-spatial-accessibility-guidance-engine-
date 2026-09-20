import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function createEnvironment(host, onStatus) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
  catch { onStatus('3D unavailable on this device. Text data remains available.'); return { dispose() {}, pose() {}, hazards() {}, view() {}, theme() {}, async load() { throw Error('3D unavailable'); }, demo() {} }; }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, .01, 10000);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.append(renderer.domElement);
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', '3D environment. Position and hazard details are also available as text.');
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI / 2.05;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x555577, 2.5));
  const sun = new THREE.DirectionalLight(0xffffff, 3); sun.position.set(5, 10, 8); scene.add(sun);
  const marker = new THREE.Mesh(new THREE.CylinderGeometry(.22, .3, .8, 24), new THREE.MeshStandardMaterial({ color: 0x007aff }));
  marker.visible = false; scene.add(marker);
  const hazardGroup = new THREE.Group(); scene.add(hazardGroup);
  let model, frame = 'demo_room', disposed = false, lost = false, generation = 0;
  const render = () => { if (!disposed && !lost) renderer.render(scene, camera); };
  function release(group) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    group?.traverse(node => {
      if (node.geometry) geometries.add(node.geometry);
      for (const material of node.material ? (Array.isArray(node.material) ? node.material : [node.material]) : []) {
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); textures.forEach(item => item.dispose());
    group?.removeFromParent();
  }
  function fit() {
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3()).length();
    if (!Number.isFinite(size) || size <= 0 || size > 10000) throw Error('Model size is empty or unsupported.');
    controls.target.copy(center);
    camera.position.copy(center).add(new THREE.Vector3(size * .8, size * .8, size));
    controls.minDistance = size * .05; controls.maxDistance = size * 5;
    camera.near = Math.max(.001, size / 1000); camera.far = size * 20; camera.updateProjectionMatrix();
    controls.update(); controls.saveState();
  }
  function replace(next, nextFrame) {
    const old = model; model = next; scene.add(next);
    try { fit(); } catch (error) { release(next); model = old; throw error; }
    release(old); frame = nextFrame; marker.visible = false; clearHazards(); render();
  }
  function clearHazards() { for (const child of [...hazardGroup.children]) release(child); }
  function demo() {
    generation++;
    const group = new THREE.Group();
    function box(size, position, color) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color })); mesh.position.set(...position); group.add(mesh); }
    box([10, .1, 10], [0, -.06, 0], 0x6b7280);
    box([10, 1.4, .12], [0, .7, -5], 0x9da3b0);
    box([.12, 1.4, 10], [-5, .7, 0], 0x9da3b0);
    group.add(new THREE.GridHelper(10, 10, 0x424954, 0x424954));
    replace(group, 'demo_room'); onStatus('Demo room · 10 × 10 m · not a real environment');
  }
  async function load(file, nextFrame) {
    if (!file || file.size > 30 * 1024 * 1024) throw Error('Choose a GLB under 30 MB.');
    if (!nextFrame.trim()) throw Error('Enter the coordinate frame agreed with the data producer.');
    const request = ++generation;
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength < 12 || new DataView(bytes).getUint32(0, true) !== 0x46546c67) throw Error('Not a GLB file.');
    // Reject external asset URLs: a local model must be self-contained.
    const manager = new THREE.LoadingManager();
    manager.setURLModifier(url => {
      if (url.startsWith('blob:') || url.startsWith('data:')) return url;
      throw Error('Use a self-contained GLB with embedded textures.');
    });
    const gltf = await new GLTFLoader(manager).parseAsync(bytes, '');
    if (disposed || request !== generation) { release(gltf.scene); return; }
    replace(gltf.scene, nextFrame.trim());
    onStatus(`${file.name} · frame ${frame} · native model scale (meters required)`);
  }
  function pose(data, stale = false) {
    marker.visible = Boolean(data && data.coordinate_frame === frame);
    if (marker.visible) { marker.position.set(data.x, .4, data.z); marker.material.color.set(stale ? 0x888888 : 0x007aff); }
    render();
  }
  function hazards(items) {
    clearHazards();
    for (const item of items.filter(item => item.coordinate_frame === frame)) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(item.radius_m, item.radius_m, .25, 24), new THREE.MeshStandardMaterial({ color: item.severity === 'high' ? 0xe64b4b : 0xffb340, transparent: true, opacity: .8 }));
      mesh.position.set(item.x, .125, item.z); hazardGroup.add(mesh);
    }
    render();
  }
  function theme(dark) { scene.background = new THREE.Color(dark ? 0x19191c : 0xffffff); render(); }
  function view(action) {
    const offset = camera.position.clone().sub(controls.target);
    if (action === 'reset') controls.reset();
    if (action === 'rotate') camera.position.copy(controls.target).add(offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6));
    if (action === 'in' || action === 'out') camera.position.copy(controls.target).add(offset.multiplyScalar(action === 'in' ? .8 : 1.25));
    controls.update(); render();
  }
  const resize = new ResizeObserver(() => { const { width, height } = host.getBoundingClientRect(); if (width && height) { camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); render(); } });
  resize.observe(host); controls.addEventListener('change', render);
  function contextLost(event) { event.preventDefault(); lost = true; onStatus('Graphics interrupted. Reload to restore the view; text data remains available.'); }
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  demo();
  return { load, demo, pose, hazards, theme, view, dispose() {
    disposed = true; generation++; resize.disconnect(); controls.dispose(); release(model); clearHazards(); release(marker);
    renderer.domElement.removeEventListener('webglcontextlost', contextLost); renderer.dispose(); renderer.domElement.remove();
  } };
}
