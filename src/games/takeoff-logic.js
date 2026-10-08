// Takeoff Sprint: generates an element, the right quantity and three wrong ones.
import { pick, shuffle } from '../rng.js';

const KG_PER_M = { 10: 0.617, 12: 0.888, 16: 1.578, 20: 2.466, 25: 3.853 };

function r(x, d = 2) {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

// Dimension steps get finer with level.
function dim(rand, lo, hi, level) {
  const step = level >= 3 ? 0.1 : level >= 2 ? 0.5 : 1;
  const n = Math.round((lo + rand() * (hi - lo)) / step) * step;
  return r(Math.max(lo, n), 1);
}

const ELEMENTS = [
  {
    kind: 'slab', level: 1, unit: 'm³', ask: 'Concrete volume',
    make(rand, level) {
      const L = dim(rand, 3, 9, level), W = dim(rand, 3, 7, level), t = pick(rand, [0.15, 0.2, 0.25, 0.3]);
      return { dims: { L, W, t }, shape: [L, t, W], answer: L * W * t,
        wrong: [L * W, L * W * t * 10, (L + W) * 2 * t] };
    },
  },
  {
    kind: 'column', level: 1, unit: 'm³', ask: 'Concrete volume',
    make(rand, level) {
      const b = pick(rand, [0.3, 0.4, 0.5, 0.6]), h = pick(rand, [0.3, 0.4, 0.6, 0.8]), H = dim(rand, 3, 5, level);
      return { dims: { b, h, H }, shape: [b, H, h], answer: b * h * H,
        wrong: [b * h * H * 10, (b + h) * 2 * H, b * h] };
    },
  },
  {
    kind: 'wall', level: 1, unit: 'm²', ask: 'Blockwork area (one face)',
    make(rand, level) {
      const L = dim(rand, 3, 12, level), H = dim(rand, 2.5, 4, level), t = 0.2;
      return { dims: { L, H, t }, shape: [L, H, t], answer: L * H,
        wrong: [L * H * t, (L + H) * 2, L * H * 2] };
    },
  },
  {
    kind: 'excavation', level: 1, unit: 'm³', ask: 'Excavation volume',
    make(rand, level) {
      const L = dim(rand, 4, 12, level), W = dim(rand, 3, 8, level), D = dim(rand, 1, 3, level);
      return { dims: { L, W, D }, shape: [L, D, W], hollow: true, answer: L * W * D,
        wrong: [L * W, L * W * D * 2, (L + W) * 2 * D] };
    },
  },
  {
    kind: 'beam', level: 2, unit: 'm³', ask: 'Concrete volume',
    make(rand, level) {
      const L = dim(rand, 3, 8, level), b = pick(rand, [0.25, 0.3, 0.4]), d = pick(rand, [0.5, 0.6, 0.7, 0.8]);
      return { dims: { L, b, d }, shape: [L, d, b], answer: L * b * d,
        wrong: [L * b * d * 10, L * d, L * b] };
    },
  },
  {
    kind: 'footing', level: 2, unit: 'm³', ask: 'Concrete volume, 4 identical footings',
    make(rand, level) {
      const L = dim(rand, 1.5, 3, level), W = dim(rand, 1.5, 3, level), t = pick(rand, [0.5, 0.6, 0.8, 1]);
      return { dims: { L, W, t }, shape: [L, t, W], count: 4, answer: 4 * L * W * t,
        wrong: [L * W * t, 4 * L * W, 2 * L * W * t] };
    },
  },
  {
    kind: 'column-form', level: 2, unit: 'm²', ask: 'Formwork area (sides only)',
    make(rand, level) {
      const b = pick(rand, [0.3, 0.4, 0.5, 0.6]), h = pick(rand, [0.4, 0.6, 0.8]), H = dim(rand, 3, 5, level);
      return { dims: { b, h, H }, shape: [b, H, h], answer: 2 * (b + h) * H,
        wrong: [(b + h) * H, b * h * H, 2 * (b + h) * H + b * h] };
    },
  },
  {
    kind: 'slab-form', level: 2, unit: 'm²', ask: 'Soffit formwork area',
    make(rand, level) {
      const L = dim(rand, 4, 10, level), W = dim(rand, 3, 8, level), t = pick(rand, [0.2, 0.25]);
      return { dims: { L, W, t }, shape: [L, t, W], answer: L * W,
        wrong: [L * W * t, L * W + 2 * (L + W) * t, (L + W) * 2] };
    },
  },
  {
    kind: 'plaster', level: 2, unit: 'm²', ask: 'Plaster area, both faces',
    make(rand, level) {
      const L = dim(rand, 3, 10, level), H = dim(rand, 2.5, 4, level);
      return { dims: { L, H, t: 0.2 }, shape: [L, H, 0.2], answer: 2 * L * H,
        wrong: [L * H, 2 * L * H * 0.2, (L + H) * 4] };
    },
  },
  {
    kind: 'rebar', level: 3, unit: 'kg', ask: 'Rebar weight',
    make(rand, level) {
      const dia = pick(rand, [12, 16, 20, 25]), n = pick(rand, [4, 6, 8, 10, 12]), L = dim(rand, 3, 9, level);
      const k = KG_PER_M[dia];
      return { dims: { n, dia, L }, shape: [0.4, L, 0.4], answer: n * L * k, spec: `${n} × T${dia}, ${L} m each`,
        wrong: [n * L * k * 1.1 + 3, n * L, n * L * (KG_PER_M[dia === 25 ? 20 : dia + (dia === 12 ? 4 : 4)] || k * 0.7)] };
    },
  },
  {
    kind: 'blocks', level: 3, unit: 'no.', ask: 'Blocks needed (40×20 cm face, no waste)',
    make(rand, level) {
      const L = dim(rand, 3, 12, level), H = dim(rand, 2.5, 4, level);
      const a = L * H;
      return { dims: { L, H, t: 0.2 }, shape: [L, H, 0.2], answer: Math.round(a / 0.08),
        wrong: [Math.round(a / 0.08 * 1.1), Math.round(a / 0.04), Math.round(a * 10)] };
    },
  },
  {
    kind: 'paint', level: 3, unit: 'm²', ask: 'Paint area, one face, less one 2×1 m door',
    make(rand, level) {
      const L = dim(rand, 4, 10, level), H = dim(rand, 2.5, 3.5, level);
      return { dims: { L, H, t: 0.2 }, shape: [L, H, 0.2], answer: L * H - 2,
        wrong: [L * H, L * H - 4, 2 * L * H - 2] };
    },
  },
];

export function levelFor(correct) {
  return Math.min(3, 1 + Math.floor(correct / 5));
}

export function fmtQty(x, unit) {
  const d = unit === 'no.' ? 0 : unit === 'kg' ? 1 : 2;
  return `${r(x, d).toLocaleString('en', { minimumFractionDigits: d, maximumFractionDigits: d })} ${unit}`;
}

// Builds one question. `level` 1..3. Returns the element plus four shuffled options.
export function makeQuestion(rand, level) {
  const pool = ELEMENTS.filter((e) => e.level <= level);
  for (let tries = 0; tries < 50; tries++) {
    const el = pick(rand, pool);
    const q = el.make(rand, level);
    const d = el.unit === 'no.' ? 0 : el.unit === 'kg' ? 1 : 2;
    const answer = r(q.answer, d);
    const wrong = [...new Set(q.wrong.map((w) => r(w, d)))].filter((w) => w > 0 && w !== answer);
    if (wrong.length < 3) continue;
    const options = shuffle(rand, [answer, ...wrong.slice(0, 3)]);
    return { kind: el.kind, ask: el.ask, unit: el.unit, dims: q.dims, shape: q.shape, hollow: !!q.hollow,
      count: q.count || 1, spec: q.spec || null, answer, options };
  }
  throw new Error('no question');
}

export const START_SECONDS = 60;
export const BONUS_SECONDS = 5;
export const PENALTY_SECONDS = 5;

export function pointsFor(level) {
  return 100 * level;
}
