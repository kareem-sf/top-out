// Three.js: a slow drift of blocks behind the home screen, and the element view for Takeoff.
let THREE = null;
async function lib() {
  if (THREE) return THREE;
  try { THREE = await import('three'); } catch { THREE = false; }
  return THREE;
}

const INK = 0x0e0f12, LINE = 0x3a3d47, ORANGE = 0xff7a1a, COPPER = 0xf0a35a, PAPER = 0xf9f8f4;

export async function startBackground(canvas) {
  const T = await lib();
  if (!T) return () => {};
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(40, 1, 0.1, 100);
  cam.position.set(0, 0, 16);
  const group = new T.Group();
  scene.add(group);
  const mat = new T.LineBasicMaterial({ color: LINE, transparent: true, opacity: 0.9 });
  const items = [];
  for (let i = 0; i < 18; i++) {
    const w = 0.6 + Math.random() * 1.6, h = 0.4 + Math.random() * 1.4, d = 0.6 + Math.random() * 1.2;
    const geo = new T.EdgesGeometry(new T.BoxGeometry(w, h, d));
    const m = new T.LineSegments(geo, i % 5 === 0 ? new T.LineBasicMaterial({ color: COPPER, transparent: true, opacity: 0.6 }) : mat);
    m.position.set((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 8 - 2);
    m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    items.push({ m, vy: 0.002 + Math.random() * 0.004, rx: (Math.random() - 0.5) * 0.004, ry: (Math.random() - 0.5) * 0.004 });
    group.add(m);
  }
  let running = true, raf = 0;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);
  function frame() {
    if (!running) return;
    for (const it of items) {
      it.m.position.y += it.vy;
      if (it.m.position.y > 8) it.m.position.y = -8;
      it.m.rotation.x += it.rx; it.m.rotation.y += it.ry;
    }
    renderer.render(scene, cam);
    raf = requestAnimationFrame(frame);
  }
  frame();
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) frame();
  });
  return (on) => { running = on; if (on) frame(); else cancelAnimationFrame(raf); };
}

// Element view: isometric box(es) with edges. show(q) replaces the element.
export async function elementView(container) {
  const T = await lib();
  if (!T) return { show() {}, dispose() {} };
  const canvas = document.createElement('canvas');
  container.append(canvas);
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  const scene = new T.Scene();
  const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  cam.position.set(10, 8, 10);
  cam.lookAt(0, 0, 0);
  scene.add(new T.AmbientLight(0xffffff, 0.9));
  const sun = new T.DirectionalLight(0xffffff, 1.2);
  sun.position.set(5, 10, 4);
  scene.add(sun);
  const grid = new T.GridHelper(12, 12, 0x2a2d35, 0x1f2229);
  scene.add(grid);
  let group = new T.Group();
  scene.add(group);
  let t0 = performance.now();

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h, s = 3.6;
    cam.left = -s * aspect; cam.right = s * aspect; cam.top = s; cam.bottom = -s;
    cam.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  function show(q) {
    scene.remove(group);
    group = new T.Group();
    scene.add(group);
    const [x, y, z] = q.shape;
    const maxDim = Math.max(x, y, z);
    const k = 5.2 / maxDim; // fit
    const count = q.count || 1;
    const color = q.kind === 'excavation' ? 0x8b6b43 : q.kind === 'rebar' ? 0x6b7280 : q.kind === 'wall' || q.kind === 'blocks' || q.kind === 'plaster' || q.kind === 'paint' ? 0xb8a58a : 0xd1cfc7;
    const mat = new T.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, transparent: q.hollow, opacity: q.hollow ? 0.35 : 1 });
    const edge = new T.LineBasicMaterial({ color: q.hollow ? ORANGE : PAPER, transparent: true, opacity: 0.9 });
    const geo = new T.BoxGeometry(x * k, y * k, z * k);
    const spacing = x * k + 0.6;
    for (let i = 0; i < count; i++) {
      const mesh = new T.Mesh(geo, mat);
      const lines = new T.LineSegments(new T.EdgesGeometry(geo), edge);
      const off = (i - (count - 1) / 2) * spacing * (count > 1 ? 0.55 : 0);
      mesh.position.set(off, (y * k) / 2 * (q.hollow ? -1 : 1), 0);
      lines.position.copy(mesh.position);
      group.add(mesh, lines);
    }
    if (q.kind === 'rebar') {
      // a few bars inside the column
      const n = Math.min(q.dims.n, 8);
      const barGeo = new T.CylinderGeometry(0.05, 0.05, y * k, 8);
      const barMat = new T.MeshStandardMaterial({ color: ORANGE, roughness: 0.6 });
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const bar = new T.Mesh(barGeo, barMat);
        bar.position.set(Math.cos(a) * x * k * 0.35, (y * k) / 2, Math.sin(a) * z * k * 0.35);
        group.add(bar);
      }
    }
    group.userData.target = count > 1 ? 0.7 : 1;
    group.scale.setScalar(0.01);
    t0 = performance.now();
  }

  let running = true;
  function frame() {
    if (!running) return;
    const p = Math.min(1, (performance.now() - t0) / 450);
    const e = 1 - Math.pow(1 - p, 3);
    const target = group.userData.target ?? 1;
    group.scale.setScalar(0.01 + (target - 0.01) * e);
    group.rotation.y = Math.sin(performance.now() / 2400) * 0.12;
    renderer.render(scene, cam);
    requestAnimationFrame(frame);
  }
  frame();
  return { show, dispose() { running = false; renderer.dispose(); canvas.remove(); } };
}
