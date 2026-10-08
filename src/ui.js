// Small DOM helpers.
export const $ = (sel, root = document) => root.querySelector(sel);

export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'html') n.innerHTML = v;
    else n.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
}

export function money(x, currency) {
  const d = x < 100 ? 2 : 0;
  return `${currency} ${x.toLocaleString('en', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

export function countUp(node, to, currency, ms = 600) {
  const start = performance.now();
  const from = 0;
  const d = to < 100 ? 2 : 0;
  function tick(t) {
    const p = Math.min(1, (t - start) / ms);
    const e = 1 - Math.pow(1 - p, 3);
    const v = from + (to - from) * e;
    node.textContent = `${currency} ${v.toLocaleString('en', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function toast(text) {
  const t = el('div', { class: 'toast' }, text);
  document.body.append(t);
  setTimeout(() => t.remove(), 1700);
}

export function floatText(anchor, text, color) {
  const r = anchor.getBoundingClientRect();
  const f = el('div', { class: 'float' }, text);
  f.style.left = `${r.left + r.width / 2 - 20}px`;
  f.style.top = `${r.top + window.scrollY - 10}px`;
  if (color) f.style.color = color;
  document.body.append(f);
  setTimeout(() => f.remove(), 900);
}

export function buzz(pattern) {
  try { navigator.vibrate && navigator.vibrate(pattern); } catch { /* ignore */ }
}

let confettiLib = null;
export async function confetti(opts = {}) {
  try {
    if (!confettiLib) {
      const m = await import('https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/+esm');
      confettiLib = m.default;
    }
    confettiLib({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors: ['#FF7A1A', '#F0A35A', '#F9F8F4', '#4ADE80'], ...opts });
  } catch { /* offline: no confetti */ }
}

export async function share(text) {
  try {
    if (navigator.share) { await navigator.share({ text }); return true; }
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard');
    return true;
  } catch { return false; }
}
