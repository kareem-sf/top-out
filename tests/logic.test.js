import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/rng.js';
import { itemsFor, MARKETS } from '../src/data/prices.js';
import { makePair, pricier, points, multiplier } from '../src/games/duel-logic.js';
import { makeQuestion, levelFor } from '../src/games/takeoff-logic.js';
import { makeTender, scoreTender, tenderNumber, shareText } from '../src/games/tender-logic.js';
import { rankFor, bumpStreak } from '../src/store.js';

test('every market has a price for every item', () => {
  for (const m of Object.keys(MARKETS)) {
    for (const it of itemsFor(m)) assert.ok(it.price > 0, `${m} ${it.name}`);
  }
});

test('duel pairs differ by at least 8% and have a pricier side', () => {
  const rand = mulberry32(1);
  const items = itemsFor('ae');
  let prev = null;
  for (let i = 0; i < 200; i++) {
    const p = makePair(rand, items, prev);
    assert.notEqual(p[0].id, p[1].id);
    const gap = Math.abs(p[0].price - p[1].price) / Math.min(p[0].price, p[1].price);
    assert.ok(gap >= 0.08);
    assert.ok(p[pricier(p)].price >= p[1 - pricier(p)].price);
    prev = p;
  }
});

test('duel points grow with streak and speed', () => {
  assert.equal(multiplier(0), 1);
  assert.equal(multiplier(15), 3);
  assert.equal(points(0, 2), 100);
  assert.equal(points(0, 0), 150);
  assert.equal(points(10, 5), 200);
});

test('takeoff questions have one right answer among four distinct options', () => {
  const rand = mulberry32(7);
  for (let i = 0; i < 500; i++) {
    const q = makeQuestion(rand, 1 + (i % 3));
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.options.includes(q.answer));
    assert.ok(q.options.every((o) => o > 0));
  }
});

test('takeoff slab maths is right', () => {
  const rand = mulberry32(3);
  for (let i = 0; i < 200; i++) {
    const q = makeQuestion(rand, 1);
    if (q.kind !== 'slab') continue;
    const { L, W, t } = q.dims;
    assert.equal(q.answer, Math.round(L * W * t * 100) / 100);
  }
  assert.equal(levelFor(0), 1);
  assert.equal(levelFor(5), 2);
  assert.equal(levelFor(12), 3);
});

test('daily tender is deterministic per day and market', () => {
  const d = new Date('2026-10-08T15:00:00Z');
  assert.equal(tenderNumber(d), 8);
  const a = makeTender('eg', d), b = makeTender('eg', d), c = makeTender('ae', d);
  assert.deepEqual(a, b);
  assert.notEqual(a.lines[0].cost, c.lines[0].cost);
  assert.equal(a.lines.length, 5);
  assert.equal(a.comps.length, 3);
});

test('tender scoring: underbid wins, overbid loses', () => {
  const t = makeTender('sa', new Date('2026-10-08T00:00:00Z'));
  const low = scoreTender(t, t.lines.map((l) => l.cost * 1.02));
  assert.ok(low.won);
  assert.ok(low.margin > 0.019 && low.margin < 0.021);
  const high = scoreTender(t, t.lines.map((l) => l.cost * 1.5));
  assert.ok(!high.won);
  assert.equal(high.score, 0);
  const sweet = scoreTender(t, t.lines.map((l) => l.cost * low.best.markup * 0.995));
  assert.deepEqual(sweet.grid, ['g', 'g', 'g', 'g', 'g']);
  assert.match(shareText(t, low), /Tender #8/);
});

test('ranks and streaks', () => {
  assert.equal(rankFor(0).title, 'Trainee QS');
  assert.equal(rankFor(1500).title, 'Quantity Surveyor');
  assert.equal(rankFor(99999).next, null);
  let s = { streak: 0, lastDay: null };
  s = bumpStreak(s, '2026-10-08', '2026-10-07');
  assert.equal(s.streak, 1);
  s = bumpStreak(s, '2026-10-09', '2026-10-08');
  assert.equal(s.streak, 2);
  s = bumpStreak(s, '2026-10-09', '2026-10-08');
  assert.equal(s.streak, 2);
  s = bumpStreak(s, '2026-10-12', '2026-10-11');
  assert.equal(s.streak, 1);
});
