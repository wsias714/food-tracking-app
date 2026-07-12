# Berry — Food & Nutrition Tracker

A single-file, offline-first PWA for calorie/nutrition tracking with a gentle,
iron-aware coaching layer. Built per `BERRY_IMPLEMENTATION.md`.

## Purpose
Daily food/macro/iron logging for a single user, plus a periodic "Coach
check-in" loop: export a backup from the app, hand it (and receipt photos)
to Claude, get back `fridge.json` / `plan.json` files to import.

## Setup
No build step. `berry/index.html` is fully self-contained (inline CSS/JS,
Google Fonts via CDN, no framework).

## Run
Open `berry/index.html` directly, or serve the `berry/` folder over HTTP for
full PWA/service-worker behavior:

```
cd berry
python -m http.server 8000
```

Live: https://wsias714.github.io/food-tracking-app/berry/

## Status
v1 shipped — see `BERRY_IMPLEMENTATION.md` §9 for the acceptance checklist.

## Coach workflow (receipts → fridge/plan)
See `coach/` for the input template Julie fills out (or a receipt photo she
sends) and the two output file schemas Claude should return.
