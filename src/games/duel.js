import { itemsFor, MARKETS } from '../data/prices.js';
import { makePair, pricier, points, LIVES } from './duel-logic.js';
import { $, el, countUp, floatText, buzz, confetti } from '../ui.js';

export function startDuel(ctx) {
  const { market, onEnd } = ctx;
  const cur = MARKETS[market].currency;
  const items = itemsFor(market);
  const rand = Math.random;
  let score = 0, streak = 0, best = 0, lives = LIVES, prev = null, t0 = 0, locked = false;
  const pairBox = $('#duel-pair');
  $('#duel-per').textContent = `in ${MARKETS[market].name}`;
  $('#duel-hint').textContent = 'Tap the pricier one. Faster is worth more.';

  function hud() {
    $('#duel-score').textContent = score;
    $('#duel-streak').textContent = streak;
    const L = $('#duel-lives');
    L.replaceChildren(...Array.from({ length: LIVES }, (_, i) => el('span', { class: 'life' + (i >= lives ? ' lost' : '') })));
  }

  function next() {
    locked = false;
    prev = makePair(rand, items, prev);
    pairBox.replaceChildren(...prev.map((it, i) => el('button', { class: 'choice', type: 'button', onclick: () => answer(i) },
      el('span', { class: 'cat' }, it.cat),
      el('span', { class: 'name' }, it.name),
      el('span', { class: 'unit' }, `per ${it.unit}`),
      el('span', { class: 'price' }, '')
    )));
    t0 = performance.now();
  }

  function answer(i) {
    if (locked) return;
    locked = true;
    const secs = (performance.now() - t0) / 1000;
    const right = pricier(prev);
    const btns = [...pairBox.children];
    btns.forEach((b, j) => {
      b.disabled = true;
      b.classList.add('reveal', j === right ? 'win' : 'lose');
      if (j === i) b.classList.add('picked');
      countUp($('.price', b), prev[j].price, cur);
    });
    if (i === right) {
      const p = points(streak, secs);
      score += p; streak += 1; best = Math.max(best, streak);
      floatText(btns[i], `+${p}`);
      btns[i].classList.add('pop');
      if (streak === 3 || streak === 6 || streak === 10 || streak === 15) {
        $('#duel-hint').textContent = `Streak ${streak}: multiplier up!`;
        buzz(20);
      } else {
        $('#duel-hint').textContent = secs < 2 ? `Quick. +${p}` : `+${p}`;
      }
    } else {
      lives -= 1; streak = 0;
      btns[i].classList.add('shake');
      buzz([40, 30, 40]);
      const ratio = prev[right].price / prev[1 - right].price;
      $('#duel-hint').textContent = ratio >= 2
        ? `${prev[right].name} is about ${Math.round(ratio)}× the price.`
        : `${prev[right].name} is ${Math.round((ratio - 1) * 100)}% dearer.`;
    }
    hud();
    if (lives === 0) { setTimeout(() => finish(), 1300); return; }
    setTimeout(next, 1100);
  }

  function finish() {
    const xp = Math.round(score / 10);
    onEnd({ game: 'duel', score, best, xp, lines: [['Score', score], ['Best streak', best], ['XP', `+${xp}`]] });
  }

  hud();
  next();
  return () => { locked = true; };
}
