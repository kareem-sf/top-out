// Daily Tender: one seeded tender a day, same for everyone in the same market.
import { mulberry32, hashString, pick, between, shuffle } from '../rng.js';
import { itemsFor } from '../data/prices.js';

export const EPOCH = Date.UTC(2026, 9, 1); // tender #1

export function tenderNumber(date = new Date()) {
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((day - EPOCH) / 86400000) + 1;
}

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

const PROJECTS = [
  { name: 'Three-storey villa', where: { eg: 'New Cairo', ae: 'Dubai Hills', sa: 'North Riyadh' } },
  { name: 'Logistics warehouse', where: { eg: '6th of October', ae: 'Jebel Ali', sa: 'Dammam' } },
  { name: 'Primary school', where: { eg: 'New Alamein', ae: 'Al Ain', sa: 'Jeddah' } },
  { name: 'Residential tower, 14 floors', where: { eg: 'New Capital', ae: 'JVC', sa: 'KAFD' } },
  { name: 'Substation building', where: { eg: 'Sokhna', ae: 'Abu Dhabi', sa: 'NEOM' } },
  { name: 'Clinic fit-out', where: { eg: 'Sheikh Zayed', ae: 'Sharjah', sa: 'Khobar' } },
  { name: 'Access road, 2 km', where: { eg: 'Ain Sokhna', ae: 'Ras Al Khaimah', sa: 'Qiddiya' } },
];

// Items that make sense in a BOQ with a quantity range.
const BOQ = [
  ['High-tensile rebar B500', 20, 240],
  ['Ready-mix concrete C30', 150, 1800],
  ['Ready-mix concrete C40', 100, 900],
  ['Hollow concrete block 20 cm', 4000, 60000],
  ['Thermal insulated block 20 cm', 2000, 20000],
  ['Gypsum board 12.5 mm sheet', 200, 3000],
  ['Emulsion paint 20 L drum', 20, 300],
  ['Ceramic floor tile 60×60', 200, 4000],
  ['Porcelain tile 60×120', 100, 2500],
  ['Marble 2 cm slab', 50, 800],
  ['Epoxy floor coating', 300, 6000],
  ['Interlock paving 6 cm', 300, 8000],
  ['Precast kerb stone', 200, 4000],
  ['Aluminium window, glazed', 40, 900],
  ['Fire-rated steel door', 4, 80],
  ['XPS insulation 50 mm', 200, 5000],
  ['Bitumen membrane 4 mm roll (10 m²)', 20, 400],
  ['Structural steel, fabricated', 10, 400],
  ['uPVC drain pipe 110 mm, 6 m', 30, 600],
  ['LED downlight 18 W', 50, 1500],
  ['Split AC 1.5 ton', 4, 120],
  ['WC suite', 4, 200],
  ['Asphalt wearing course', 200, 3000],
  ['Precast boundary wall', 100, 1500],
  ['Excavator hire', 5, 90],
];

function roundQty(q) {
  if (q >= 1000) return Math.round(q / 100) * 100;
  if (q >= 100) return Math.round(q / 10) * 10;
  return Math.round(q);
}

export function makeTender(market, date = new Date()) {
  const n = tenderNumber(date);
  const rand = mulberry32(hashString(`site-break-${market}-${n}`));
  const items = itemsFor(market);
  const byName = Object.fromEntries(items.map((i) => [i.name, i]));
  const project = pick(rand, PROJECTS);
  const lines = shuffle(rand, BOQ).slice(0, 5).map(([name, lo, hi]) => {
    const item = byName[name];
    const qty = roundQty(between(rand, lo, hi));
    const cost = item.price * between(rand, 0.9, 1.1); // hidden true cost per unit
    return { name, unit: item.unit, qty, market: item.price, cost,
      min: Math.round(item.price * 0.6), max: Math.round(item.price * 1.6) };
  });
  const competitors = ['Al Bina Contracting', 'Hassan & Sons', 'Delta Build', 'Orbit JV', 'Summit Contractors', 'Crescent Engineering'];
  const comps = shuffle(rand, competitors).slice(0, 3).map((name) => {
    const markup = between(rand, 1.04, 1.16);
    const total = lines.reduce((s, l) => s + l.cost * l.qty * markup, 0);
    return { name, markup, total };
  });
  return { number: n, market, project: project.name, where: project.where[market], lines, comps };
}

// rates: array of 5 unit rates the player chose.
export function scoreTender(tender, rates) {
  const bid = tender.lines.reduce((s, l, i) => s + rates[i] * l.qty, 0);
  const cost = tender.lines.reduce((s, l) => s + l.cost * l.qty, 0);
  const best = tender.comps.reduce((a, c) => (c.total < a.total ? c : a));
  const won = bid < best.total;
  const margin = (bid - cost) / cost;
  const sweet = best.markup * 0.995; // just under the keenest competitor
  const grid = tender.lines.map((l, i) => {
    const target = l.cost * sweet;
    const off = Math.abs(rates[i] - target) / target;
    return off <= 0.05 ? 'g' : off <= 0.15 ? 'y' : 'r';
  });
  const score = won ? Math.round(margin * 1000) / 10 : 0;
  const xp = won ? Math.max(50, Math.round(300 + margin * 2000)) : 50;
  return { bid, cost, best, won, margin, grid, score, xp, gap: (bid - best.total) / best.total };
}

export function shareText(tender, result) {
  const sq = { g: '🟩', y: '🟨', r: '🟥' };
  const grid = result.grid.map((g) => sq[g]).join('');
  const line = result.won
    ? `Won, ${result.margin >= 0 ? '+' : ''}${(result.margin * 100).toFixed(1)}% margin`
    : `Lost by ${(result.gap * 100).toFixed(1)}%`;
  return `Site Break Tender #${tender.number} ${grid} ${line}\nhttps://play.kareemsafwat.com`;
}
