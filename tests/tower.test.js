import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newTower, nextBlock, advance, place, top, floorsBuilt, dueInspection, variationOrder, compact, FULL, PERFECT_TOL, GROW_AFTER } from '../src/game/tower.js';
import { PROJECTS, projectById, nextProject } from '../src/data/projects.js';
import { makePair, pricier } from '../src/game/inspection.js';
import { itemsFor } from '../src/data/prices.js';
import { mulberry32 } from '../src/rng.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('perfect drop keeps the slab size and counts', () => {
  const t = newTower('eg');
  const b = nextBlock(t);
  const r = place(t, { ...b, pos: 0.2 });
  assert.equal(r.kind, 'perfect');
  assert.equal(top(t).w, FULL);
  assert.equal(floorsBuilt(t), 1);
  near(t.boq.area, 100);
  near(t.boq.value, 100 * 14000);
});

test('offset drop cuts the slab and makes an offcut on the right side', () => {
  const t = newTower('eg');
  const b = nextBlock(t); // axis x (index 1)
  assert.equal(b.axis, 'x');
  const r = place(t, { ...b, pos: 2 });
  assert.equal(r.kind, 'cut');
  near(r.floor.w, 8);
  near(r.floor.x, 1);
  near(r.offcut.w, 2);
  near(r.offcut.x, 6);
  assert.equal(r.offcut.side, 1);
  const b2 = nextBlock(t);
  assert.equal(b2.axis, 'z');
  near(b2.w, 8);
  const r2 = place(t, { ...b2, pos: -3 });
  near(r2.floor.d, 7);
  near(r2.floor.z, -1.5);
  near(r2.offcut.d, 3);
  near(r2.offcut.z, -6.5);
});

test('missing the tower ends it unless a safety net is held', () => {
  const t = newTower('ae');
  const b = nextBlock(t);
  assert.equal(place(t, { ...b, pos: 10.5 }).kind, 'miss');
  assert.equal(floorsBuilt(t), 0);
  t.nets = 1;
  assert.equal(place(t, { ...b, pos: 10.5 }).kind, 'saved');
  assert.equal(t.nets, 0);
  assert.equal(floorsBuilt(t), 1);
});

test('three perfects in a row grow the slab back', () => {
  const t = newTower('sa');
  place(t, { ...nextBlock(t), pos: 3 }); // w 7
  near(top(t).w, 7);
  for (let i = 0; i < GROW_AFTER - 1; i++) {
    const b = nextBlock(t);
    assert.equal(place(t, { ...b, pos: b.axis === 'x' ? top(t).x : top(t).z }).grew, false);
  }
  const b = nextBlock(t);
  const r = place(t, { ...b, pos: b.axis === 'x' ? top(t).x : top(t).z });
  assert.equal(r.grew, true);
  near(top(t).w, 7.5);
  near(top(t).d, FULL);
});

test('block bounces inside its range', () => {
  const t = newTower('eg');
  let b = nextBlock(t);
  const start = b.pos;
  for (let i = 0; i < 400; i++) b = advance(b, 6, 1 / 60);
  assert.ok(Math.abs(b.pos) <= b.range + 1e-9);
  assert.notEqual(b.pos, start);
});

test('inspection every 8 floors and the variation order adds a net', () => {
  const t = newTower('eg');
  for (let i = 0; i < 8; i++) { const b = nextBlock(t); place(t, { ...b, pos: b.axis === 'x' ? top(t).x : top(t).z }); }
  assert.ok(dueInspection(t));
  const before = t.boq.value;
  const bonus = variationOrder(t);
  assert.ok(bonus > 0);
  near(t.boq.value, before + bonus);
  assert.equal(t.nets, 1);
  assert.equal(compact(48_200_000), '48.2M');
  assert.equal(compact(412_000), '412K');
});

test('projects chain and inspections have a right answer', () => {
  assert.equal(nextProject('villa').id, 'midrise');
  assert.equal(nextProject('megatall'), null);
  assert.equal(projectById('nope').id, PROJECTS[0].id);
  const rand = mulberry32(5);
  const items = itemsFor('ae');
  for (let i = 0; i < 100; i++) {
    const p = makePair(rand, items);
    assert.ok(p[pricier(p)].price > p[1 - pricier(p)].price);
  }
  assert.ok(Math.abs(PERFECT_TOL - 0.25) < 1e-9);
});
