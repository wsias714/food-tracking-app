# CLAUDE.md

Notes for Claude Code sessions in this repo. New-app checklist: `~/Projects/APPS.md`. Reference entry: `~/Projects/obligations/reference/apps.md`.

## Project
Berry: single-file offline-first nutrition PWA (`berry/index.html`, inline CSS/JS, no build step), in daily use by Julie. Public repo. Also `coach/` templates for the periodic coach check-in.

## Deploy
GitHub Pages from the `master` branch root: **every push to `master` publishes**. Work on a branch, run `npm run check`, then merge. Live: wsias714.github.io/food-tracking-app/berry/

## Data
Data is in the phone's localStorage only (no Dropbox sync yet; the `mobile-dropbox-sync` skill is the pattern if Wade asks). Don't break the import/export JSON format: backups are how data survives a phone wipe.

## Rules
- `npm run check` (parses the inline script, manifest and service worker) before every push.
- Bump the service-worker cache name when shipping changes, or phones keep the old version.
- No child names or secrets in the repo.
