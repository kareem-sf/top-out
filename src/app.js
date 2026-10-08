import { View } from './game/render.js';
import { newTower, nextBlock, advance, place, top, floorsBuilt, dueInspection, variationOrder, xpFor, compact, speedFor, MAX_NETS, STOREY } from './game/tower.js';
import { makePair, pricier, INSPECT_SECONDS } from './game/inspection.js';
import { PROJECTS, METALS, projectById, nextProject } from './data/projects.js';
import { itemsFor, MARKETS } from './data/prices.js';
import { load, save, rankFor, dayKey, bumpStreak } from './store.js';
import { mulberry32, hashString } from './rng.js';
import { sfx, unlock, setMuted, isMuted } from './game/audio.js';
import { $, el, money, buzz, share } from './ui.js';

const state = load();
setMuted(state.muted);
const view = new View($('#stage'));

let mode = 'title'; // title | tutorial | play | inspect | over
let project = projectById(state.project);
let daily = false;
let tower = null, block = null, bot = false, handedOver = false, floorsAtStart = 0;
let rand = Math.random, lastPair = null, inspectLeft = 0, inspectDone = false;
let last = performance.now();
let shownValue = 0;

const DAILY_EPOCH = Date.UTC(2026, 9, 1);
const dailyNumber = () => Math.floor((Date.now() - DAILY_EPOCH) / 86400000) + 1;

// ---------- round control ----------
function startRound(asBot) {
  bot = asBot;
  handedOver = false;
  if (daily && !bot) {
    const n = dailyNumber();
    project = PROJECTS[n % PROJECTS.length];
    rand = mulberry32(hashString(`site-break-daily-${n}`));
  } else if (!bot) {
    rand = Math.random;
  }
  tower = newTower(project.market);
  lastPair = null;
  view.setMetal(project.metal);
  view.reset();
  block = nextBlock(tower);
  view.setMoving(block);
  shownValue = 0;
  floorsAtStart = 0;
  $('#hud-name').textContent = daily && !bot ? `Daily #${dailyNumber()} · ${project.name}` : project.name;
  $('#hud-city').textContent = `${project.city} · ${MARKETS[project.market].currency}`;
  $('#hud-target-text').textContent = `Handover at ${project.target}`;
  $('#taphint').hidden = state.games > 2;
  hud();
}

function speed() {
  const s = speedFor(project, block.index);
  return daily && !bot ? s * 1.08 : s;
}

function hud() {
  $('#hud-floors').textContent = floorsBuilt(tower);
  const p = Math.min(1, floorsBuilt(tower) / project.target);
  $('#hud-target-bar').style.setProperty('--p', `${p * 100}%`);
  if (handedOver) $('#hud-target-text').textContent = 'Handed over · endless';
  $('#hud-nets').replaceChildren(...Array.from({ length: tower.nets }, () => el('span', { class: 'net' })));
  $('#boq-area').textContent = Math.round(tower.boq.area).toLocaleString('en');
  $('#boq-concrete').textContent = Math.round(tower.boq.concrete).toLocaleString('en');
  $('#boq-rebar').textContent = tower.boq.rebar.toFixed(1);
}

function callout(text, cls) {
  const c = el('div', { class: `c ${cls}` }, text);
  $('#callout').append(c);
  setTimeout(() => c.remove(), 950);
}

// ---------- the one action ----------
function drop() {
  if (mode !== 'play' && !bot) return;
  if (!block) return;
  const b = block;
  const res = place(tower, b);
  const index = b.index;

  if (res.kind === 'miss') {
    block = null;
    view.crash(b);
    if (!bot) { sfx.crash(); buzz([60, 40, 80]); gameOver(); }
    else setTimeout(() => startRound(true), 1200);
    return;
  }

  view.addFloor(res.floor, index);
  if (res.kind === 'perfect') {
    view.perfect(res.floor, index, res.run);
    if (!bot) {
      sfx.perfect(res.run - 1);
      buzz(12);
      callout(res.run > 1 ? `APPROVED ×${res.run}` : 'APPROVED', 'good');
      if (res.grew) { sfx.grow(); setTimeout(() => callout('SLAB RESTORED', 'grow'), 220); view.flash(); }
    }
  } else if (res.kind === 'cut') {
    view.dropOffcut(res.offcut, index, b.axis);
    if (!bot) { sfx.cut(); buzz(25); }
  } else if (res.kind === 'saved') {
    if (!bot) { sfx.save(); callout('SAFETY NET', 'grow'); view.flash(); }
  }
  if (!bot && floorsBuilt(tower) >= 2) $('#taphint').hidden = true;
  hud();

  if (!bot && !handedOver && floorsBuilt(tower) >= project.target) handover();

  if (!bot && dueInspection(tower)) { block = null; view.setMoving(null); setTimeout(inspection, 350); return; }
  block = nextBlock(tower);
  view.setMoving(block);
}

function handover() {
  handedOver = true;
  sfx.fanfare();
  buzz([30, 50, 30, 50, 60]);
  const nxt = nextProject(project.id);
  if (nxt && !state.unlocked.includes(nxt.id)) { state.unlocked.push(nxt.id); save(state); }
  const b = $('#banner');
  b.replaceChildren(el('b', {}, `${project.name} handed over`), el('small', {}, nxt ? (nxt.id === state.unlocked[state.unlocked.length - 1] ? `${nxt.name} in ${nxt.city} unlocked. Keep building.` : 'Keep building.') : 'Top of the ladder. Keep building.'));
  b.hidden = false;
  b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  setTimeout(() => { b.hidden = true; }, 2800);
  hud();
}

// ---------- inspection ----------
function inspection() {
  mode = 'inspect';
  inspectDone = false;
  const items = itemsFor(project.market);
  lastPair = makePair(rand, items, lastPair);
  const cur = MARKETS[project.market].currency;
  $('#inspect-where').textContent = `in ${MARKETS[project.market].name}`;
  $('#inspect-pair').replaceChildren(...lastPair.map((it, i) => el('button', { class: 'choice', type: 'button', onclick: () => answer(i) },
    el('span', { class: 'cat' }, it.cat), el('span', { class: 'name' }, it.name), el('span', { class: 'unit' }, `per ${it.unit}`), el('span', { class: 'price' }, money(it.price, cur)))));
  inspectLeft = INSPECT_SECONDS;
  $('#inspect').hidden = false;
  sfx.tick();
}

function answer(i) {
  if (inspectDone) return;
  inspectDone = true;
  const right = pricier(lastPair);
  const btns = [...$('#inspect-pair').children];
  btns.forEach((b, j) => { b.disabled = true; b.classList.add('reveal', j === right ? 'win' : 'lose'); });
  if (i === right) {
    const bonus = variationOrder(tower);
    sfx.right(); setTimeout(() => sfx.cash(), 250); buzz([20, 30, 20]);
    setTimeout(() => callout(`+${MARKETS[project.market].currency} ${compact(bonus)}  VARIATION ORDER`, 'cash'), 300);
  } else {
    sfx.wrong(); buzz(60);
  }
  setTimeout(resume, 1400);
}

function resume() {
  $('#inspect').hidden = true;
  mode = 'play';
  hud();
  block = nextBlock(tower);
  view.setMoving(block);
}

// ---------- game over ----------
function gameOver() {
  mode = 'over';
  const floors = floorsBuilt(tower);
  const value = Math.round(tower.boq.value);
  const xp = xpFor(tower);
  const before = rankFor(state.xp).title;
  state.xp += xp;
  state.games += 1;
  const bestFloors = floors > state.best.floors, bestValue = value > state.best.value;
  if (bestFloors) state.best.floors = floors;
  if (bestValue) state.best.value = value;
  if (daily) {
    const key = dayKey();
    if (!state.daily || state.daily.key !== key || floors > state.daily.floors) state.daily = { key, floors, value, n: dailyNumber() };
    const y = new Date(); y.setUTCDate(y.getUTCDate() - 1);
    Object.assign(state, bumpStreak(state, key, dayKey(y)));
  }
  save(state);
  const after = rankFor(state.xp);
  const cur = MARKETS[project.market].currency;
  setTimeout(() => {
    $('#over-chip').textContent = daily ? `Daily tower #${dailyNumber()}` : floors >= project.target ? `${project.name} handed over` : 'Tower down';
    $('#over-title').textContent = `${floors} floor${floors === 1 ? '' : 's'}`;
    $('#over-stats').replaceChildren(
      el('div', { class: 'stat hi' + (bestValue ? ' best' : '') }, el('small', {}, 'Contract value'), el('b', {}, `${cur} ${compact(value)}`)),
      el('div', { class: 'stat' + (bestFloors ? ' best' : '') }, el('small', {}, 'Perfect drops'), el('b', {}, String(tower.perfects))),
      el('div', { class: 'stat' }, el('small', {}, 'XP'), el('b', {}, `+${xp}`)));
    $('#over-rank').innerHTML = after.title !== before ? `Promoted to <b>${after.title}</b>.` : after.next ? `<b>${after.title}</b> · ${(after.next - state.xp).toLocaleString('en')} XP to ${after.nextTitle}` : `<b>${after.title}</b>`;
    $('#over').hidden = false;
    $('#hud').hidden = true;
  }, 900);
}

function shareText() {
  const floors = floorsBuilt(tower);
  const cur = MARKETS[project.market].currency;
  const head = daily ? `Site Break Daily #${dailyNumber()}` : `Site Break · ${project.name}, ${project.city}`;
  return `${head}\n🏗️ ${floors} floors · ${cur} ${compact(Math.round(tower.boq.value))} contract value\nhttps://play.kareemsafwat.com`;
}

// ---------- title ----------
function renderTitle() {
  const picker = $('#projects');
  picker.replaceChildren(...PROJECTS.map((p) => {
    const locked = !state.unlocked.includes(p.id);
    const c = METALS[p.metal];
    return el('button', { class: 'proj' + (p.id === project.id && !daily ? ' on' : '') + (locked ? ' locked' : ''), type: 'button',
      onclick: () => { if (locked) return; daily = false; project = p; state.project = p.id; save(state); renderTitle(); startRound(true); } },
      el('b', {}, el('i', { style: `background:linear-gradient(135deg,${c[0]},${c[1]})` }), p.name),
      el('small', {}, locked ? `Hand over ${PROJECTS[PROJECTS.indexOf(p) - 1].name} to unlock` : `${p.city} · ${p.target} floors`));
  }));
  const r = rankFor(state.xp);
  $('#profile').replaceChildren(
    el('span', {}, el('b', {}, r.title), el('span', { class: 'xp' }, el('i', { style: `width:${Math.round(r.progress * 100)}%` }))),
    el('span', {}, `Best `, el('b', { class: 'mono' }, String(state.best.floors)), ` floors`, state.streak > 1 ? ` · ${state.streak}-day streak` : ''));
  const n = dailyNumber();
  $('#btn-daily').textContent = state.daily && state.daily.n === n ? `Daily #${n}: ${state.daily.floors} floors` : `Daily tower #${n}`;
  $('#btn-daily').classList.toggle('primary', false);
}

function showTitle() {
  mode = 'title';
  view.shiftTarget = 11;
  daily = false;
  $('#over').hidden = true; $('#hud').hidden = true; $('#tutorial').hidden = true; $('#inspect').hidden = true;
  renderTitle();
  $('#title').hidden = false;
  startRound(true);
}

function beginPlay() {
  view.shiftTarget = 0;
  $('#title').hidden = true; $('#tutorial').hidden = true; $('#over').hidden = true;
  $('#hud').hidden = false;
  mode = 'play';
  startRound(false);
}

function showTutorial(fromGame) {
  $('#title').hidden = true;
  $('#tutorial').hidden = false;
  $('#btn-start').textContent = fromGame ? 'Back to the tower' : 'Tap to build';
  $('#btn-start').onclick = () => { state.tutorialSeen = true; save(state); if (fromGame) { $('#tutorial').hidden = true; mode = 'play'; } else beginPlay(); };
  mode = 'tutorial';
  if (!fromGame) { view.shiftTarget = 13; startRound(true); }
}

// ---------- bot (attract mode and tutorial demo) ----------
const PLAN = [0, 0, 1.4, 0, 0, 0, -1.1, 0, 0, 0.9, 0, 0];
let prevPos = 0;
function botStep() {
  if (!block) return;
  const tp = top(tower);
  const center = block.axis === 'x' ? tp.x : tp.z;
  const want = center + PLAN[block.index % PLAN.length];
  const crossed = (prevPos - want) * (block.pos - want) <= 0 && Math.abs(block.pos - want) < 1.5;
  if (crossed) { block = { ...block, pos: want + (Math.random() - 0.5) * 0.12 }; drop(); }
  if (floorsBuilt(tower) > 34) startRound(true);
}

// ---------- loop ----------
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (block && (mode === 'play' || bot)) {
    prevPos = block.pos;
    block = advance(block, speed(), dt);
    view.setMoving(block);
    if (bot) botStep();
  }
  if (mode === 'inspect' && !inspectDone) {
    inspectLeft -= dt;
    $('#inspect-timer').textContent = Math.max(0, inspectLeft).toFixed(1);
    $('#inspect-fill').style.width = `${Math.max(0, inspectLeft / INSPECT_SECONDS) * 100}%`;
    if (inspectLeft <= 0) answer(-1);
  }
  // count the value up smoothly
  if (tower) {
    const target = tower.boq.value;
    shownValue += (target - shownValue) * Math.min(1, dt * 6);
    if (Math.abs(target - shownValue) < 1) shownValue = target;
    $('#boq-value').textContent = `${MARKETS[project.market].currency} ${compact(shownValue)}`;
  }
  view.frame(dt);
  requestAnimationFrame(loop);
}

// ---------- input ----------
function onTap(e) {
  if (e.target.closest('button, .sheet, .overlay')) return;
  unlock();
  if (mode === 'play') drop();
}
$('#tapzone').addEventListener('pointerdown', onTap);
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') {
    if (mode === 'play') { e.preventDefault(); unlock(); drop(); }
    else if (mode === 'over') { e.preventDefault(); beginPlay(); }
    else if (mode === 'title') { e.preventDefault(); unlock(); state.tutorialSeen ? beginPlay() : showTutorial(false); }
  }
  if (e.key === 'Escape' && mode === 'tutorial') $('#btn-start').click();
});
$('#btn-build').addEventListener('click', () => { unlock(); state.tutorialSeen ? beginPlay() : showTutorial(false); });
$('#btn-how').addEventListener('click', () => { unlock(); showTutorial(false); });
$('#btn-daily').addEventListener('click', () => { unlock(); daily = true; state.tutorialSeen ? beginPlay() : showTutorial(false); });
$('#btn-again').addEventListener('click', () => { unlock(); beginPlay(); });
$('#btn-menu').addEventListener('click', showTitle);
$('#btn-share').addEventListener('click', () => share(shareText()));
$('#btn-help').addEventListener('click', () => { if (mode === 'play') { mode = 'tutorial'; showTutorial(true); } });
function syncMute() { $('#btn-mute').textContent = isMuted() ? '🔇' : '🔊'; }
$('#btn-mute').addEventListener('click', () => { setMuted(!isMuted()); state.muted = isMuted(); save(state); syncMute(); });
syncMute();
document.addEventListener('visibilitychange', () => { if (document.hidden) last = performance.now(); });

window.__sb = { get tower() { return tower; }, get block() { return block; }, get mode() { return mode; }, drop };
showTitle();
requestAnimationFrame(loop);
