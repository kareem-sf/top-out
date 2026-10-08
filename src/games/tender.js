import { MARKETS } from '../data/prices.js';
import { makeTender, scoreTender, shareText, dayKey } from './tender-logic.js';
import { $, el, money, buzz, confetti, share } from '../ui.js';

export function startTender(ctx) {
  const { market, state, onEnd } = ctx;
  const cur = MARKETS[market].currency;
  const t = makeTender(market);
  const key = `${market}-${dayKey()}`;
  const body = $('#tender-body');
  $('#tender-no').textContent = `Tender #${t.number} · ${MARKETS[market].name}`;
  $('#tender-project').textContent = `${t.project}, ${t.where}`;
  const done = state.tenders[key];
  if (done) { showResult(done.rates, done.result, true); return () => {}; }

  const rates = t.lines.map((l) => Math.round(l.market));
  const inputs = [];

  function total() { return t.lines.reduce((s, l, i) => s + rates[i] * l.qty, 0); }

  function render() {
    body.replaceChildren(
      el('div', { class: 'tender-intro' }, el('b', {}, 'Invitation to tender. '), `Five items, three other bidders. Lowest total wins. Price above cost or you win the job and lose money. Your reference is today's market rate; real cost sits somewhere near it.`),
      ...t.lines.map((l, i) => {
        const val = el('div', { class: 'line-val' }, money(rates[i], cur), el('small', {}, `per ${l.unit}`));
        const range = el('input', { type: 'range', min: l.min, max: l.max, step: l.max - l.min > 500 ? 10 : 1, value: rates[i],
          oninput: (e) => { rates[i] = Number(e.target.value); val.firstChild.textContent = money(rates[i], cur); bar.textContent = money(total(), cur); } });
        inputs.push(range);
        return el('div', { class: 'line' },
          el('div', { class: 'line-head' }, el('span', { class: 'line-name' }, l.name), el('span', { class: 'line-qty' }, `${l.qty.toLocaleString('en')} ${l.unit}`)),
          el('div', { class: 'line-rate' }, range, val),
          el('div', { class: 'line-ref' }, el('span', {}, 'Market rate ', el('b', {}, money(l.market, cur))), el('span', {}, `Line ${money(rates[i] * l.qty, cur)}`)));
      }),
      el('div', { class: 'bid-bar' }, el('div', {}, el('small', {}, 'Your total bid'), bar), el('button', { class: 'btn primary', type: 'button', onclick: submit }, 'Submit bid'))
    );
    // keep line totals live
    body.addEventListener('input', () => {
      [...body.querySelectorAll('.line')].forEach((ln, i) => { ln.querySelector('.line-ref span:last-child').textContent = `Line ${money(rates[i] * t.lines[i].qty, cur)}`; });
    });
  }
  const bar = el('b', {}, money(total(), cur));

  function submit() {
    const result = scoreTender(t, rates);
    state.tenders[key] = { rates: rates.slice(), result };
    onEnd({ game: 'tender', xp: result.xp, won: result.won, silent: true });
    showResult(rates, result, false);
  }

  function showResult(rates, result, replay) {
    const bids = [...t.comps.map((c) => ({ name: c.name, total: c.total, you: false })), { name: 'You', total: result.bid, you: true }]
      .sort((a, b) => a.total - b.total);
    const sq = { g: '🟩', y: '🟨', r: '🟥' };
    body.replaceChildren(
      el('p', { class: 'prompt' }, replay ? 'Bids opened earlier today' : 'Opening the bids…'),
      el('div', { class: 'bids' }, ...bids.map((b, i) => {
        const n = el('div', { class: 'bid' + (b.you ? ' you' : '') + (i === 0 ? ' winner' : '') },
          el('span', { class: 'who' }, b.name, i === 0 ? el('span', { class: 'tag' }, 'lowest') : null), el('b', {}, money(Math.round(b.total), cur)));
        n.style.animationDelay = replay ? '0s' : `${0.5 + i * 0.6}s`;
        return n;
      })),
      el('div', { class: 'verdict', style: replay ? '' : 'opacity:0' },
        el('div', { class: 'result-big ' + (result.won && result.margin > 0 ? 'good' : 'bad') },
          result.won ? `${result.margin >= 0 ? '+' : ''}${(result.margin * 100).toFixed(1)}% margin` : `Lost by ${(result.gap * 100).toFixed(1)}%`),
        el('p', {}, result.won
          ? (result.margin > 0 ? `You won the job and kept a margin. Cost was ${money(Math.round(result.cost), cur)}.` : `You won the job, but below cost. Cost was ${money(Math.round(result.cost), cur)}.`)
          : `${result.best.name} took it at ${money(Math.round(result.best.total), cur)}. Your cost would have been ${money(Math.round(result.cost), cur)}.`),
        el('div', { class: 'grid-row' }, result.grid.map((g) => sq[g]).join('')),
        el('p', { class: 'hint', style: 'text-align:left' }, 'Green: within 5% of the rate that just beats the keenest bidder. Yellow: within 15%.'),
        el('div', { class: 'btn-row' },
          el('button', { class: 'btn primary', type: 'button', onclick: () => share(shareText(t, result)) }, 'Share result'),
          el('button', { class: 'btn ghost', type: 'button', onclick: () => ctx.go('home') }, 'Back home'))
      )
    );
    if (!replay) {
      setTimeout(() => {
        const v = $('.verdict', body); if (v) { v.style.transition = 'opacity .4s'; v.style.opacity = 1; }
        $('.prompt', body).textContent = result.won ? 'You have the lowest bid' : 'Not this time';
        if (result.won && result.margin > 0) { confetti(); buzz([20, 40, 20]); } else buzz(60);
      }, 500 + bids.length * 600 + 300);
    }
  }

  render();
  return () => {};
}
