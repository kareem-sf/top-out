import { MARKETS } from './data/prices.js';
import { load, save, rankFor, RANKS, bumpStreak } from './store.js';
import { dayKey, tenderNumber } from './games/tender-logic.js';
import { startDuel } from './games/duel.js';
import { startTakeoff } from './games/takeoff.js';
import { startTender } from './games/tender.js';
import { startBackground } from './scene.js';
import { $, el, confetti } from './ui.js';

const state = load();
let stop = () => {};
let bgToggle = () => {};
let current = 'home';

const screens = { home: $('#home'), duel: $('#duel'), takeoff: $('#takeoff'), tender: $('#tender') };

function yesterdayKey() { const d = new Date(); d.setUTCDate(d.getUTCDate() - 1); return dayKey(d); }

function profile() {
  const r = rankFor(state.xp);
  $('#rank-title').textContent = r.title;
  $('#xp-fill').style.width = `${Math.round(r.progress * 100)}%`;
  $('#market-btn').textContent = `${MARKETS[state.market].flag} ${MARKETS[state.market].currency}`;
  $('#best-duel').textContent = state.best.duel;
  $('#best-takeoff').textContent = state.best.takeoff;
  const played = state.tenders[`${state.market}-${dayKey()}`];
  $('#daily-status').innerHTML = played
    ? `Today: ${played.result.won ? 'won' : 'lost'} · Streak <b>${state.streak}</b>`
    : `Tender #${tenderNumber()} is open · Streak <b>${state.streak}</b>`;
}

function go(name) {
  stop(); stop = () => {};
  current = name;
  for (const [k, s] of Object.entries(screens)) s.hidden = k !== name;
  bgToggle(name === 'home');
  $('#bg').style.opacity = name === 'home' ? '' : '0';
  window.scrollTo({ top: 0 });
  closeSheet();
  if (name === 'duel') stop = startDuel({ market: state.market, onEnd });
  if (name === 'takeoff') stop = startTakeoff({ onEnd });
  if (name === 'tender') stop = startTender({ market: state.market, state, onEnd, go });
  profile();
}

function onEnd(r) {
  const before = rankFor(state.xp).title;
  state.xp += r.xp;
  let newBest = false;
  if (r.game !== 'tender' && r.score > state.best[r.game]) { state.best[r.game] = r.score; newBest = r.score > 0; }
  if (r.game === 'tender') Object.assign(state, bumpStreak(state, dayKey(), yesterdayKey()));
  save(state);
  profile();
  const after = rankFor(state.xp).title;
  if (r.silent) { if (after !== before) setTimeout(() => sheet(rankUp(after)), 4000); return; }
  if (newBest) confetti();
  sheet(el('div', {},
    el('h2', {}, r.game === 'duel' ? 'Out of lives' : "Time's up"),
    el('p', {}, after !== before ? `Promoted to ${after}.` : `You are a ${after}.`),
    el('div', { class: 'stats' }, ...r.lines.map(([k, v], i) => el('div', { class: 'stat' + (i === 2 ? ' hi' : '') }, el('small', {}, k), el('b', {}, String(v))))),
    newBest ? el('span', { class: 'new-best' }, 'New personal best') : null,
    el('div', { class: 'btn-row' },
      el('button', { class: 'btn primary', type: 'button', onclick: () => go(r.game) }, 'Play again'),
      el('button', { class: 'btn ghost', type: 'button', onclick: () => go('home') }, 'Home'))
  ));
}

function rankUp(title) {
  confetti({ particleCount: 140, spread: 90 });
  return el('div', {}, el('h2', {}, 'Promotion'), el('p', {}, `You are now a ${title}.`),
    el('div', { class: 'btn-row' }, el('button', { class: 'btn primary', type: 'button', onclick: closeSheet }, 'Nice')));
}

function sheet(content) {
  $('#sheet').replaceChildren(content);
  $('#overlay').hidden = false;
}
function closeSheet() { $('#overlay').hidden = true; }

function marketSheet() {
  sheet(el('div', {}, el('h2', {}, 'Market'), el('p', {}, 'Prices and the daily tender follow the market you pick.'),
    el('div', { class: 'markets' }, ...Object.entries(MARKETS).map(([k, m]) => el('button', {
      class: 'market-opt' + (k === state.market ? ' on' : ''), type: 'button',
      onclick: () => { state.market = k; save(state); profile(); closeSheet(); if (current !== 'home') go(current); },
    }, el('span', {}, `${m.flag} ${m.name}`), el('small', {}, m.currency))))));
}

function rankSheet() {
  const r = rankFor(state.xp);
  sheet(el('div', {}, el('h2', {}, r.title), el('p', {}, r.next ? `${state.xp.toLocaleString('en')} XP. ${(r.next - state.xp).toLocaleString('en')} more to ${r.nextTitle}.` : `${state.xp.toLocaleString('en')} XP. Top of the ladder.`),
    el('ul', { class: 'ranks' }, ...RANKS.map(([xp, title]) => el('li', { class: title === r.title ? 'on' : '' }, el('span', {}, title), el('small', {}, `${xp.toLocaleString('en')} XP`)))),
    el('div', { class: 'btn-row' }, el('button', { class: 'btn ghost', type: 'button', onclick: closeSheet }, 'Close'))));
}

document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-go]');
  if (g) { e.preventDefault(); go(g.dataset.go); }
});
$('#market-btn').addEventListener('click', marketSheet);
$('#rank-btn').addEventListener('click', rankSheet);
$('#overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeSheet(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSheet();
  if (current === 'duel' && (e.key === '1' || e.key === '2')) $('#duel-pair').children[Number(e.key) - 1]?.click();
  if (current === 'takeoff' && '1234'.includes(e.key) && e.key) $('#to-options').children[Number(e.key) - 1]?.click();
});

profile();
startBackground($('#bg')).then((t) => { bgToggle = t; });
