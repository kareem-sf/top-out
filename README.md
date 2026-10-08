# Site Break

Quick games for engineers who are waiting. Guess the price, take off the quantity, win the tender.

Live: https://play.kareemsafwat.com

## Games

- **Rate Duel.** Two items, tap the one that costs more. Three lives, streak multiplier, speed bonus.
- **Takeoff Sprint.** A 3D element with its dimensions. Pick the right quantity before the clock runs out.
- **Daily Tender.** One tender a day, the same for everyone. Price five BOQ items, beat three bidders, keep a margin. Share the result grid.

Markets: Egypt (EGP), UAE (AED), KSA (SAR). Prices are indicative mid-2025 rates, for play only. See `src/data/prices.js`.

## Run it

Static files, no build step.

```bash
npm test          # logic tests (node --test)
npm run dev       # serves on http://localhost:4173
```

Deployed on Vercel from `main`.

## Layout

```
index.html, styles.css       the page
src/app.js                   screens, profile bar, result sheets
src/store.js                 local profile: XP, ranks, bests, streak
src/rng.js                   seeded random for the daily tender
src/data/prices.js           items per market
src/games/*-logic.js         pure game logic (tested)
src/games/{duel,takeoff,tender}.js   screens
src/scene.js                 Three.js background and element view
tests/                       node --test
```

A [QS Mind](https://qsmind.com) side project. MIT licence.
