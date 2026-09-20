import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Demo coordinates only: one unit = one meter; Y is up, X/Z form the floor.
export function createEnvironment(host, toolbar, status) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch {
    status.textContent = '3D unavailable. WebGL 2 is required; no live position is available.';
    toolbar.hidden = true;
    return () => {};
  }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(10, 10, 12);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'Demonstration room, 10 by 8 meters. Blue simulated user at X zero, Z zero. Not a real building or live position.');
  host.append(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 28;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.update();
  controls.saveState();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 2.5));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(4, 10, 6);
  scene.add(light);
  const floorMaterial = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  const wallMaterial = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  function box(size, position, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    scene.add(mesh);
    return mesh;
  }
  box([10, 0.15, 8], [0, -0.1, 0], floorMaterial);
  box([10, 1.4, 0.15], [0, 0.7, -4], wallMaterial);
  box([0.15, 1.4, 8], [-5, 0.7, 0], wallMaterial);
  const grid = new THREE.GridHelper(10, 10, 0x999999, 0x999999);
  grid.scale.z = 0.8;
  grid.position.y = 0.001;
  scene.add(grid);
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 0.8, 32),
    new THREE.MeshStandardMaterial({ color: 0x007aff, roughness: 0.4 }),
  );
  marker.position.set(0, 0.4, 0);
  scene.add(marker);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.48, 48), new THREE.MeshBasicMaterial({ color: 0x007aff, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);
  let lost = false;
  const render = () => { if (!lost) renderer.render(scene, camera); };
  function theme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    scene.background = new THREE.Color(dark ? 0x19191c : 0xffffff);
    floorMaterial.color.set(dark ? 0x303039 : 0xe5e8ee);
    wallMaterial.color.set(dark ? 0x50505d : 0xffffff);
    grid.material.color.set(dark ? 0x626272 : 0xb4bbc7);
    render();
  }
  const themes = new MutationObserver(theme);
  themes.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const resize = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    render();
  });
  resize.observe(host);
  controls.addEventListener('change', render);
  function action(event) {
    const button = event.target.closest('button[data-view]');
    if (!button) return;
    switch (button.dataset.view) {
      case 'reset': controls.reset(); break;
      case 'rotate': camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6); break;
      case 'in': camera.position.multiplyScalar(0.8); break;
      case 'out': camera.position.multiplyScalar(1.25); break;
    }
    controls.update();
    render();
  }
  toolbar.addEventListener('click', action);
  function contextLost(event) {
    event.preventDefault(); lost = true;
    status.textContent = '3D graphics interrupted. Reload the page to restore the demonstration.';
    toolbar.hidden = true;
  }
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  status.textContent = 'Demo only: 10 × 8 m room. Blue marker: simulated user at X 0 m, Z 0 m.';
  theme();
  // Draw only on interaction, resize or theme change; no idle animation loop.
  return () => {
    themes.disconnect(); resize.disconnect(); controls.dispose();
    toolbar.removeEventListener('click', action);
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    const materials = new Set();
    scene.traverse(object => {
      object.geometry?.dispose();
      if (object.material) materials.add(object.material);
    });
    materials.forEach(material => material.dispose());
    renderer.dispose(); renderer.domElement.remove();
  };
}
