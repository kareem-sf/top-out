// Local profile: XP, rank, bests, streak. localStorage only.
export const RANKS = [
  [0, 'Trainee QS'],
  [500, 'Assistant QS'],
  [1500, 'Quantity Surveyor'],
  [4000, 'Senior QS'],
  [8000, 'Commercial Manager'],
  [15000, 'Commercial Director'],
  [30000, 'Partner'],
];

export function rankFor(xp) {
  let cur = RANKS[0], next = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i][0]) cur = RANKS[i];
    else { next = RANKS[i]; break; }
  }
  return { title: cur[1], from: cur[0], next: next ? next[0] : null, nextTitle: next ? next[1] : null,
    progress: next ? (xp - cur[0]) / (next[0] - cur[0]) : 1 };
}

const KEY = 'site-break-v1';

const blank = () => ({ xp: 0, market: 'eg', best: { duel: 0, takeoff: 0 }, streak: 0, lastDay: null, tenders: {} });

export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return s ? { ...blank(), ...s } : blank();
  } catch { return blank(); }
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

// Daily streak: played yesterday keeps it, a gap resets it. Pure, for tests.
export function bumpStreak(state, dayKey, yesterdayKey) {
  if (state.lastDay === dayKey) return state;
  const streak = state.lastDay === yesterdayKey ? state.streak + 1 : 1;
  return { ...state, streak, lastDay: dayKey };
}
