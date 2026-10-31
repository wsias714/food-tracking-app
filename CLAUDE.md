# CLAUDE.md

Notes for Claude Code sessions in this repo. New-app checklist: `~/Projects/APPS.md`. Reference entry: `~/Projects/obligations/reference/apps.md`.

## Project
Berry: single-file offline-first nutrition PWA (`berry/index.html`, inline CSS/JS, no build step), in daily use by Julie. Public repo. Also `coach/` templates for the periodic coach check-in.

## Deploy
GitHub Pages from the `master` branch root: **every push to `master` publishes**. Work on a branch, run `npm run check`, then merge. Live: wsias714.github.io/food-tracking-app/berry/

## Data and sync (added 2026-10-31)
Working copy is the phone's localStorage; it syncs to Dropbox `Apps/Berry_app/data.json` (`berry/sync.js`, merge in `berry/merge.js`, tests in `scripts/merge.test.mjs`). Merge is non-destructive: food entries, activities, fridge foods and meals union by id; profile, targets and plan come from the newer device. Anything that deletes one of those must call `tombstone(kind, item, day)` (keeps the record 180 days so sync can't resurrect it and History's "Recently deleted" can restore it). Safety copies go to `backups/` (`pre-sync.json` once, then one dated copy a day, last 5). Feedback goes to `feedback/` with the same login. Don't break the import/export JSON format. Dropbox app key is public (PKCE); never add a secret. Dropbox app scopes needed: files.metadata.read/write, files.content.read/write.

## Rules
- `npm run check` (parses the inline script, manifest and service worker) before every push.
- Bump the service-worker cache name when shipping changes, or phones keep the old version.
- No child names or secrets in the repo.
