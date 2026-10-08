// Rate Duel: pure logic. Which of two items costs more?
import { pick } from '../rng.js';

export const LIVES = 3;

export function multiplier(streak) {
  if (streak >= 15) return 3;
  if (streak >= 10) return 2;
  if (streak >= 6) return 1.5;
  if (streak >= 3) return 1.2;
  return 1;
}

// Points for a correct answer given the current streak (before this answer) and time taken.
export function points(streak, seconds) {
  const speed = Math.max(0, Math.min(50, Math.round(50 * (1 - seconds / 2))));
  return Math.round(100 * multiplier(streak)) + speed;
}

// Two items whose prices differ by at least 8%, never the same pair as before.
export function makePair(rand, items, prev = null) {
  for (let tries = 0; tries < 200; tries++) {
    const a = pick(rand, items);
    const b = pick(rand, items);
    if (a.id === b.id) continue;
    const gap = Math.abs(a.price - b.price) / Math.min(a.price, b.price);
    if (gap < 0.08) continue;
    if (prev && ((prev[0].id === a.id && prev[1].id === b.id) || (prev[0].id === b.id && prev[1].id === a.id))) continue;
    return [a, b];
  }
  throw new Error('no pair');
}

export function pricier(pair) {
  return pair[0].price >= pair[1].price ? 0 : 1;
}
