// Pure tower rules. No DOM, no Three.js. Everything here is unit-tested.
import { RATE_PER_M2 } from '../data/projects.js';

export const FULL = 10;          // metres, base slab
export const STOREY = 3;         // metres per floor
export const PERFECT_TOL = 0.25; // metres
export const GROW_AFTER = 3;     // perfects in a row before the slab grows back
export const GROW_BY = 0.5;      // metres per side... per axis total
export const INSPECT_EVERY = 8;  // floors between site inspections
export const MAX_NETS = 3;
export const MIN_OVERLAP = 0.35; // thinner than this is a miss

// Quantities per m² of floor (whole storey: slab, beams, columns).
const CONCRETE_PER_M2 = 0.25; // m³
const REBAR_PER_M3 = 0.11;    // tonne
const FORMWORK_PER_M2 = 1.15; // m²

export function newTower(market) {
  return {
    market,
    floors: [{ x: 0, z: 0, w: FULL, d: FULL }], // floors[0] is the ground slab
    perfectRun: 0,
    perfects: 0,
    nets: 0,
    boq: { area: 0, concrete: 0, rebar: 0, formwork: 0, value: 0 },
    bonus: 0,
  };
}

export function top(t) { return t.floors[t.floors.length - 1]; }
export function floorsBuilt(t) { return t.floors.length - 1; }
export function axisFor(index) { return index % 2 === 1 ? 'x' : 'z'; } // index of the floor being placed

export function speedFor(project, index) {
  return Math.min(project.speed.max, project.speed.base + project.speed.inc * index);
}

// The moving slab for the next floor: same size as the top, travels along `axis`.
export function nextBlock(t) {
  const tp = top(t);
  const index = t.floors.length;
  const axis = axisFor(index);
  const size = axis === 'x' ? tp.w : tp.d;
  const range = Math.max(6, size / 2 + 5);
  const side = index % 4 < 2 ? -1 : 1;
  return { index, axis, w: tp.w, d: tp.d, range, pos: side * range, dir: -side, x: tp.x, z: tp.z };
}

export function advance(block, speed, dt) {
  let pos = block.pos + block.dir * speed * dt;
  let dir = block.dir;
  if (pos > block.range) { pos = block.range - (pos - block.range); dir = -1; }
  if (pos < -block.range) { pos = -block.range + (-block.range - pos); dir = 1; }
  return { ...block, pos, dir };
}

function addFloorBoq(t, floor) {
  const area = floor.w * floor.d;
  const concrete = area * CONCRETE_PER_M2;
  t.boq.area += area;
  t.boq.concrete += concrete;
  t.boq.rebar += concrete * REBAR_PER_M3;
  t.boq.formwork += area * FORMWORK_PER_M2;
  t.boq.value += area * RATE_PER_M2[t.market];
}

// Drop the block at block.pos along block.axis. Mutates t. Returns what happened.
export function place(t, block) {
  const tp = top(t);
  const axis = block.axis;
  const center = axis === 'x' ? tp.x : tp.z;
  const size = axis === 'x' ? tp.w : tp.d;
  const delta = block.pos - center;
  const grewFrom = { w: tp.w, d: tp.d };

  if (Math.abs(delta) <= PERFECT_TOL) {
    t.perfectRun += 1;
    t.perfects += 1;
    let w = tp.w, d = tp.d, grew = false;
    if (t.perfectRun >= GROW_AFTER && (w < FULL || d < FULL)) {
      w = Math.min(FULL, w + GROW_BY);
      d = Math.min(FULL, d + GROW_BY);
      grew = true;
    }
    const floor = { x: tp.x, z: tp.z, w, d };
    t.floors.push(floor);
    addFloorBoq(t, floor);
    return { kind: 'perfect', floor, offcut: null, grew, run: t.perfectRun, grewFrom };
  }

  const overlap = size - Math.abs(delta);
  if (overlap <= MIN_OVERLAP) {
    if (t.nets > 0) {
      t.nets -= 1;
      t.perfectRun = 0;
      const floor = { x: tp.x, z: tp.z, w: tp.w, d: tp.d };
      t.floors.push(floor);
      addFloorBoq(t, floor);
      return { kind: 'saved', floor, offcut: null, grew: false, run: 0 };
    }
    t.perfectRun = 0;
    return { kind: 'miss', floor: null, offcut: null, grew: false, run: 0 };
  }

  t.perfectRun = 0;
  const lo = Math.max(center - size / 2, block.pos - size / 2);
  const hi = Math.min(center + size / 2, block.pos + size / 2);
  const mid = (lo + hi) / 2;
  const floor = { x: tp.x, z: tp.z, w: tp.w, d: tp.d };
  if (axis === 'x') { floor.x = mid; floor.w = hi - lo; } else { floor.z = mid; floor.d = hi - lo; }
  // the part hanging over the edge
  const cutLo = delta > 0 ? hi : block.pos - size / 2;
  const cutHi = delta > 0 ? block.pos + size / 2 : lo;
  const offcut = { x: tp.x, z: tp.z, w: tp.w, d: tp.d, side: Math.sign(delta) };
  if (axis === 'x') { offcut.x = (cutLo + cutHi) / 2; offcut.w = cutHi - cutLo; } else { offcut.z = (cutLo + cutHi) / 2; offcut.d = cutHi - cutLo; }
  t.floors.push(floor);
  addFloorBoq(t, floor);
  return { kind: 'cut', floor, offcut, grew: false, run: 0 };
}

export function dueInspection(t) {
  const n = floorsBuilt(t);
  return n > 0 && n % INSPECT_EVERY === 0;
}

// Variation order after a correct inspection answer: 6% of value so far, at least one floor's worth.
export function variationOrder(t) {
  const oneFloor = FULL * FULL * RATE_PER_M2[t.market];
  const bonus = Math.max(oneFloor, Math.round(t.boq.value * 0.06));
  t.boq.value += bonus;
  t.bonus += bonus;
  t.nets = Math.min(MAX_NETS, t.nets + 1);
  return bonus;
}

export function xpFor(t) {
  return floorsBuilt(t) * 10 + t.perfects * 5;
}

export function compact(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return `${Math.round(n)}`;
}
