# Site Break

Build the tower. One tap, one floor. Real quantities, real prices.

A 3D game for engineers on a break, by [QS Mind](https://qsmind.com). Live at https://play.kareemsafwat.com

## How it plays

- A floor slab slides in. Tap (or press space) to drop it. Overhang is cut off and falls; the next slab is only as big as what landed.
- Land within 25 cm and it snaps ("approved"). Three in a row and the slab grows back.
- Every floor is measured: built area, concrete, rebar, and the contract value at the market rate per m² (Egypt, UAE, KSA).
- Every 8 floors the consultant asks which material costs more. Right answer: a variation order and a safety net.
- Projects: Villa, Mid-rise, Tower, Skyscraper, Megatall. Hand one over to unlock the next. A daily tower is seeded for everyone.

Prices are indicative mid-2025 rates, for play only: `src/data/prices.js`.

## Run it

Static files, no build step.

```bash
npm test          # rules tests (node --test)
npm run dev       # http://localhost:4173
```

Deployed on Vercel from `main`.

## Layout

```
index.html, styles.css       page and HUD
src/app.js                   state machine, bot demo, inspections, game over
src/game/tower.js            pure rules (tested)
src/game/render.js           Three.js view
src/game/audio.js            synth sounds
src/game/inspection.js       the price question
src/data/prices.js           items per market
src/data/projects.js         levels and brand metals
src/store.js, src/rng.js     profile and seeded random
tests/                       node --test
public/                      Site Break mark, lockup, favicon
```

MIT licence.
