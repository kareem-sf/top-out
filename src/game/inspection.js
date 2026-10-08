// Site inspection: two items, which costs more? Pure.
import { pick } from '../rng.js';

export function makePair(rand, items, prev = null) {
  for (let tries = 0; tries < 200; tries++) {
    const a = pick(rand, items);
    const b = pick(rand, items);
    if (a.id === b.id) continue;
    const gap = Math.abs(a.price - b.price) / Math.min(a.price, b.price);
    if (gap < 0.1) continue;
    if (prev && ((prev[0].id === a.id && prev[1].id === b.id) || (prev[0].id === b.id && prev[1].id === a.id))) continue;
    return [a, b];
  }
  throw new Error('no pair');
}

export function pricier(pair) {
  return pair[0].price >= pair[1].price ? 0 : 1;
}

export const INSPECT_SECONDS = 6;
