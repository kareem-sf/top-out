// Three.js view of the tower. Knows nothing about rules; app.js tells it what happened.
import * as THREE from 'three';
import { STOREY, FULL } from './tower.js';
import { METALS } from '../data/projects.js';

const INK = new THREE.Color('#0E0F12');
const SKY_TOP = new THREE.Color('#2A1E3F');   // deep violet when the tower is high
const SKY_FAR = new THREE.Color('#0B2A3A');   // teal when very high
const PAPER = new THREE.Color('#F9F8F4');

export class View {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.scene = new THREE.Scene();
    this.scene.background = INK.clone();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 200);
    this.camDir = new THREE.Vector3(1, 0.82, 1).normalize();
    this.target = new THREE.Vector3(0, 0, 0);
    this.lookY = 0;
    this.shake = 0;
    this.shift = 0; this.shiftTarget = 0; // metres: push the tower up the screen behind menus
    this.zoom = 1;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x3a3340, 2.4);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 3.2);
    sun.position.set(4, 16, 2);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 1.2);
    fill.position.set(-8, 6, -6);
    this.scene.add(fill);

    this.floors = new THREE.Group();
    this.scene.add(this.floors);
    this.moving = null;
    this.debris = [];
    this.fx = [];
    this.metal = METALS.copper;
    this.edgeMat = new THREE.LineBasicMaterial({ color: 0x0e0f12, transparent: true, opacity: 0.35 });
    this.height = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const c = this.renderer.domElement;
    const w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    const s = (aspect < 0.8 ? 27 : 21) * this.zoom; // half-height in metres
    this.camera.left = -s * aspect; this.camera.right = s * aspect; this.camera.top = s; this.camera.bottom = -s;
    this.camera.updateProjectionMatrix();
  }

  setMetal(name) { this.metal = METALS[name] || METALS.copper; }

  colorFor(index) {
    const a = new THREE.Color(this.metal[0]), b = new THREE.Color(this.metal[1]);
    const t = 0.5 - 0.5 * Math.cos((index / 14) * Math.PI * 2);
    const c = a.clone().lerp(b, t);
    // every floor a touch different so stripes read
    const hsl = {}; c.getHSL(hsl);
    c.setHSL(hsl.h, hsl.s, Math.min(0.85, hsl.l + (index % 2 ? 0.04 : 0)));
    return c;
  }

  reset() {
    this.floors.clear();
    for (const d of this.debris) this.scene.remove(d.mesh);
    for (const f of this.fx) this.scene.remove(f.mesh);
    this.debris = []; this.fx = [];
    if (this.moving) { this.scene.remove(this.moving); this.moving = null; }
    this.height = 0;
    this.lookY = 0;
    this.target.set(0, 0, 0);
    // podium
    const pod = this.block({ x: 0, z: 0, w: FULL + 6, d: FULL + 6 }, 1.2, new THREE.Color('#2A2C33'), -0.6);
    this.floors.add(pod);
    this.floors.add(this.block({ x: 0, z: 0, w: FULL, d: FULL }, STOREY, this.colorFor(0), STOREY / 2));
  }

  block(f, h, color, y) {
    const geo = new THREE.BoxGeometry(f.w, h, f.d);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, flatShading: true, emissive: color, emissiveIntensity: 0.18 });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(f.x, y, f.z);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), this.edgeMat);
    m.add(edges);
    return m;
  }

  yFor(index) { return index * STOREY + STOREY / 2; }

  addFloor(floor, index) {
    const m = this.block(floor, STOREY, this.colorFor(index), this.yFor(index));
    m.scale.y = 0.6; m.userData.pop = 0;
    this.floors.add(m);
    this.height = index * STOREY;
    this.fx.push({ kind: 'pop', mesh: m, t: 0 });
    return m;
  }

  setMoving(block) {
    if (!block) { if (this.moving) { this.scene.remove(this.moving); this.moving = null; } return; }
    if (!this.moving || this.moving.userData.index !== block.index) {
      if (this.moving) this.scene.remove(this.moving);
      this.moving = this.block({ x: block.x, z: block.z, w: block.w, d: block.d }, STOREY, this.colorFor(block.index), this.yFor(block.index));
      this.moving.userData.index = block.index;
      this.scene.add(this.moving);
    }
    if (block.axis === 'x') this.moving.position.x = block.pos; else this.moving.position.z = block.pos;
  }

  dropOffcut(offcut, index, axis) {
    const m = this.block(offcut, STOREY, this.colorFor(index), this.yFor(index));
    this.scene.add(m);
    const v = new THREE.Vector3(axis === 'x' ? offcut.side * 2 : 0, 2, axis === 'z' ? offcut.side * 2 : 0);
    const spin = new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3);
    if (axis === 'x') spin.z = -offcut.side * 2.5; else spin.x = offcut.side * 2.5;
    this.debris.push({ mesh: m, v, spin, t: 0 });
  }

  // the whole moving slab falls past the tower
  crash(block) {
    if (!this.moving) return;
    const m = this.moving; this.moving = null;
    const v = new THREE.Vector3(block.axis === 'x' ? Math.sign(block.pos) * 1.5 : 0, 1, block.axis === 'z' ? Math.sign(block.pos) * 1.5 : 0);
    this.debris.push({ mesh: m, v, spin: new THREE.Vector3(block.axis === 'z' ? 2 : 0, 0, block.axis === 'x' ? -2 : 0), t: 0 });
    this.shake = 1;
  }

  perfect(floor, index, run) {
    const y = index * STOREY + STOREY;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.98, 1, 48), new THREE.MeshBasicMaterial({ color: PAPER, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(floor.x, y + 0.02, floor.z);
    const base = Math.max(floor.w, floor.d) / 2;
    ring.scale.setScalar(base);
    this.scene.add(ring);
    this.fx.push({ kind: 'ring', mesh: ring, t: 0, base });
    // sparks
    const n = 10 + Math.min(14, run * 2);
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshBasicMaterial({ color: i % 3 ? PAPER : new THREE.Color(this.metal[0]) }));
      const a = (i / n) * Math.PI * 2;
      s.position.set(floor.x + Math.cos(a) * floor.w * 0.5, y, floor.z + Math.sin(a) * floor.d * 0.5);
      this.scene.add(s);
      this.fx.push({ kind: 'spark', mesh: s, t: 0, v: new THREE.Vector3(Math.cos(a) * 5, 4 + Math.random() * 3, Math.sin(a) * 5) });
    }
  }

  flash() { this.flashT = 0.25; }

  frame(dt) {
    dt = Math.min(dt, 0.05);
    // camera follows the top
    const topY = this.height;
    this.lookY += (Math.max(0, topY - STOREY) - this.lookY) * Math.min(1, dt * 4);
    const topMesh = this.floors.children[this.floors.children.length - 1];
    if (topMesh) {
      this.target.x += (topMesh.position.x - this.target.x) * Math.min(1, dt * 3);
      this.target.z += (topMesh.position.z - this.target.z) * Math.min(1, dt * 3);
    }
    this.shift += (this.shiftTarget - this.shift) * Math.min(1, dt * 3);
    const look = new THREE.Vector3(this.target.x, this.lookY + 6 - this.shift, this.target.z);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 3);
      look.x += (Math.random() - 0.5) * this.shake * 0.8;
      look.y += (Math.random() - 0.5) * this.shake * 0.8;
    }
    this.camera.position.copy(look).addScaledVector(this.camDir, 60);
    this.camera.lookAt(look);

    // sky with height
    const h = Math.min(1, topY / 180);
    const sky = h < 0.5 ? INK.clone().lerp(SKY_TOP, h * 2) : SKY_TOP.clone().lerp(SKY_FAR, (h - 0.5) * 2);
    if (this.flashT > 0) { this.flashT -= dt; sky.lerp(PAPER, Math.max(0, this.flashT) * 0.6); }
    this.scene.background.copy(sky);

    // debris physics
    for (const d of this.debris) {
      d.t += dt;
      d.v.y -= 32 * dt;
      d.mesh.position.addScaledVector(d.v, dt);
      d.mesh.rotation.x += d.spin.x * dt; d.mesh.rotation.z += d.spin.z * dt;
    }
    this.debris = this.debris.filter((d) => { const keep = d.mesh.position.y > this.lookY - 60 && d.t < 4; if (!keep) this.scene.remove(d.mesh); return keep; });

    // effects
    for (const f of this.fx) {
      f.t += dt;
      if (f.kind === 'ring') { f.mesh.scale.setScalar(f.base * (1 + f.t * 2.2)); f.mesh.material.opacity = Math.max(0, 0.95 - f.t * 1.9); }
      if (f.kind === 'spark') { f.v.y -= 20 * dt; f.mesh.position.addScaledVector(f.v, dt); f.mesh.scale.setScalar(Math.max(0.01, 1 - f.t * 1.4)); }
      if (f.kind === 'pop') { const p = Math.min(1, f.t / 0.18); const e = 1 + Math.sin(p * Math.PI) * 0.12; f.mesh.scale.y = 0.6 + 0.4 * p; f.mesh.scale.x = e; f.mesh.scale.z = e; if (p >= 1) f.mesh.scale.set(1, 1, 1); }
    }
    this.fx = this.fx.filter((f) => { const keep = f.kind === 'pop' ? f.t < 0.2 : f.t < 0.8; if (!keep && f.kind !== 'pop') this.scene.remove(f.mesh); return keep; });

    this.renderer.render(this.scene, this.camera);
  }
}
