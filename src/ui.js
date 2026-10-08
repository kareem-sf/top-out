export const $ = (sel, root = document) => root.querySelector(sel);

export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'html') n.innerHTML = v;
    else n.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
}

export function money(x, currency) {
  const d = x < 100 ? 2 : 0;
  return `${currency} ${x.toLocaleString('en', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

export function buzz(pattern) {
  try { navigator.vibrate && navigator.vibrate(pattern); } catch { /* ignore */ }
}

export function toast(text) {
  const t = el('div', { class: 'toast' }, text);
  document.body.append(t);
  setTimeout(() => t.remove(), 1700);
}

export async function share(text) {
  try {
    if (navigator.share) { await navigator.share({ text }); return true; }
    await navigator.clipboard.writeText(text);
    toast('Copied');
    return true;
  } catch { return false; }
}
