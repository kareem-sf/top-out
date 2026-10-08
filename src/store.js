// Local profile. localStorage only.
export const RANKS = [
  [0, 'Trainee QS'],
  [400, 'Assistant QS'],
  [1200, 'Quantity Surveyor'],
  [3000, 'Senior QS'],
  [6500, 'Commercial Manager'],
  [12000, 'Commercial Director'],
  [25000, 'Partner'],
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

const KEY = 'site-break-v2';

const blank = () => ({ xp: 0, best: { floors: 0, value: 0 }, unlocked: ['villa'], project: 'villa', daily: null,
  streak: 0, lastDay: null, muted: false, tutorialSeen: false, games: 0 });

export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return s ? { ...blank(), ...s } : blank();
  } catch { return blank(); }
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

export function dayKey(date = new Date()) { return date.toISOString().slice(0, 10); }

export function bumpStreak(state, today, yesterday) {
  if (state.lastDay === today) return state;
  const streak = state.lastDay === yesterday ? state.streak + 1 : 1;
  return { ...state, streak, lastDay: today };
}
