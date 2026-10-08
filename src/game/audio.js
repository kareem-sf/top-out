// Tiny synth. No files, no library. Everything is a few oscillators.
let ctx = null;
let muted = false;
const LADDER = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5, 1567.98, 1760.0];

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

export function unlock() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { ctx = null; }
}

function tone(freq, type, dur, gain = 0.2, slide = 0) {
  if (!ctx || muted) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), ctx.currentTime + dur);
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.connect(g).connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + dur + 0.02);
}

function noise(dur, gain = 0.25, cutoff = 800) {
  if (!ctx || muted) return;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
  const g = ctx.createGain(); g.gain.value = gain;
  s.connect(f).connect(g).connect(ctx.destination);
  s.start();
}

export const sfx = {
  place() { tone(140, 'triangle', 0.12, 0.3, -60); noise(0.08, 0.12, 600); },
  cut() { tone(110, 'sawtooth', 0.16, 0.18, -50); noise(0.14, 0.2, 1200); },
  perfect(run) { const f = LADDER[Math.min(LADDER.length - 1, run)]; tone(f, 'sine', 0.35, 0.25); tone(f * 2, 'sine', 0.25, 0.08); setTimeout(() => tone(f * 1.5, 'sine', 0.3, 0.12), 60); },
  grow() { [0, 80, 160].forEach((d, i) => setTimeout(() => tone(523 * (1 + i * 0.25), 'triangle', 0.25, 0.18), d)); },
  crash() { noise(0.5, 0.4, 400); tone(60, 'sawtooth', 0.5, 0.3, -40); },
  cash() { tone(1800, 'square', 0.05, 0.06); setTimeout(() => tone(2400, 'square', 0.06, 0.06), 50); },
  tick() { tone(900, 'square', 0.03, 0.05); },
  right() { tone(660, 'sine', 0.2, 0.2); setTimeout(() => tone(990, 'sine', 0.3, 0.2), 90); },
  wrong() { tone(200, 'sawtooth', 0.3, 0.2, -80); },
  fanfare() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 'triangle', 0.4, 0.2), i * 110)); },
  save() { tone(330, 'sine', 0.25, 0.2, 120); },
};
