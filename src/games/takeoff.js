import { makeQuestion, levelFor, fmtQty, START_SECONDS, BONUS_SECONDS, PENALTY_SECONDS, pointsFor } from './takeoff-logic.js';
import { elementView } from '../scene.js';
import { $, el, floatText, buzz } from '../ui.js';

const LABEL = { L: 'Length', W: 'Width', t: 'Thickness', b: 'Breadth', h: 'Depth', H: 'Height', d: 'Depth', D: 'Depth', n: 'Bars', dia: 'Diameter' };

export function startTakeoff(ctx) {
  const { onEnd } = ctx;
  const rand = Math.random;
  let score = 0, correct = 0, time = START_SECONDS, q = null, locked = false, alive = true, view = null;
  const box = $('#to-3d');
  box.replaceChildren();
  elementView(box).then((v) => { view = v; if (q) view.show(q); });

  const timer = setInterval(() => {
    if (!alive) return;
    time -= 0.25;
    hud();
    if (time <= 0) finish();
  }, 250);

  function hud() {
    $('#to-score').textContent = score;
    $('#to-level').textContent = levelFor(correct);
    $('#to-time').textContent = Math.max(0, Math.ceil(time));
    $('.hud-stat.time').classList.toggle('low', time <= 10);
    $('#to-timefill').style.width = `${Math.max(0, Math.min(100, (time / START_SECONDS) * 100))}%`;
    $('#to-timefill').classList.toggle('low', time <= 10);
  }

  function next() {
    locked = false;
    q = makeQuestion(rand, levelFor(correct));
    if (view) view.show(q);
    $('#to-ask').textContent = q.ask;
    const dims = $('#to-dims');
    dims.replaceChildren(
      el('span', { class: 'kind' }, q.kind.replace('-', ' ') + (q.count > 1 ? ` × ${q.count}` : '')),
      ...Object.entries(q.dims).map(([k, v]) => el('div', { class: 'd' }, el('span', {}, LABEL[k] || k), el('span', {}, k === 'n' ? String(v) : k === 'dia' ? `T${v}` : `${v.toFixed(2)} m`))),
      ...(q.spec ? [el('div', { class: 'spec' }, q.spec)] : [])
    );
    const old = $('.count', box); if (old) old.remove();
    if (q.count > 1) box.append(el('span', { class: 'count' }, `${q.count} no.`));
    $('#to-options').replaceChildren(...q.options.map((o) => el('button', { class: 'opt', type: 'button', onclick: (e) => answer(o, e.currentTarget) }, fmtQty(o, q.unit))));
  }

  function answer(o, btn) {
    if (locked || !alive) return;
    locked = true;
    const opts = [...$('#to-options').children];
    opts.forEach((b) => { b.disabled = true; if (b.textContent === fmtQty(q.answer, q.unit)) b.classList.add('right'); });
    if (o === q.answer) {
      const p = pointsFor(levelFor(correct));
      score += p; correct += 1; time += BONUS_SECONDS;
      floatText(btn, `+${p}  +${BONUS_SECONDS}s`);
      buzz(15);
      hud();
      setTimeout(next, 500);
    } else {
      btn.classList.add('wrong', 'shake');
      time -= PENALTY_SECONDS;
      floatText(btn, `−${PENALTY_SECONDS}s`, '#F8717A');
      buzz([40, 30, 40]);
      hud();
      if (time <= 0) { finish(); return; }
      setTimeout(next, 900);
    }
  }

  function finish() {
    if (!alive) return;
    alive = false;
    clearInterval(timer);
    const xp = Math.round(score / 10);
    onEnd({ game: 'takeoff', score, xp, lines: [['Score', score], ['Correct', correct], ['XP', `+${xp}`]] });
  }

  hud();
  next();
  return () => { alive = false; clearInterval(timer); if (view) view.dispose(); };
}
