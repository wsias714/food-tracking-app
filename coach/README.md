# Coach check-in — inputs & outputs

Every 1–2 weeks, Julie runs a Berry "Coach check-in" (see app §4.5.7). This
folder defines what she uploads to this Claude project and what Claude should
hand back. The app's **only** intake mechanism is `Import Berry file` on the
Fridge or Coach tab — it reads one JSON file at a time and routes it by its
`"berryType"` field. Nothing else the app reads.

## What Julie sends in

1. **`berry-backup-YYYY-MM-DD.json`** — from the app's "Export backup for
   Coach" button (Coach tab). Contains her `profile`, `targets`, `foods`,
   `meals`, and full `log` (daily entries, weights, energy, activities).
   This is the ground truth for everything Coach needs to reason about —
   trends, targets, iron/energy patterns.
2. **Receipt photos** (however many), OR **`receipt_intake.csv`** filled out
   by hand if she'd rather type than photograph. Either is fine — Claude
   should read whichever shows up. The CSV is just a faster path when she
   already knows the item names.
3. Anything freeform — she can just say "I started buying X" or "cut this
   from my list" in chat instead of files.

## What Claude sends back

Produce **up to two files**, matching the schemas in `coach/examples/`:

### `fridge.json` (when receipts/new items were provided)
- One food object per **new or changed** grocery item — not the whole
  fridge, just what's new/updated this cycle.
- `store` must be exactly one of: `"Costco"`, `"Trader Joe's"`,
  `"Whole Foods"`, `"Other"`.
- Nutrition numbers: look up per the serving size implied by the receipt
  (or ask Julie for a serving size if it's ambiguous — a wrong serving size
  is worse than asking).
- `ironMg`: include even when small — the app marks anything ≥2.0mg as
  iron-rich (⚘) throughout the UI, which matters for Julie's iron tracking.
- The app **matches foods by exact name (case-insensitive)** to decide
  update-vs-create. Reuse the exact name Julie already has in her library
  when she's clearly restocking the same item (check her backup's `foods`
  array) — a near-duplicate name creates a second food instead of updating
  the first.
- `meals` is optional — only include it if Julie described a new go-to
  plate. Each item needs either a `foodName` that already exists in her
  library/backup, or an embedded `food: {...}` object (see example) if it's
  brand new — otherwise the app skips that item and reports it missing.

### `plan.json` (every check-in)
- Recompute `targets` from the trend in her backup's `log`, not from
  scratch — use her actual 7-day trend weight, not just what she typed at
  setup.
- **Hard floor: `targets.cals` must never go below 1200.** The app rejects
  the whole import if it does — there's no partial-accept.
- `note`: 2–4 sentences, warm and specific, referencing her actual data
  (a pattern, a day, a food she already has). This is the only thing shown
  on the Coach tab's "This week's note" card, so make it earn the space.
- `weeklyFocus`: 1–3 short bullets, concrete actions, not general advice.
- If her trailing-14-day trend loss exceeds ~1% of body weight/week for two
  consecutive weeks, say so explicitly in `note` — the app also flags this
  internally, but the note should acknowledge it in Julie's voice, not just
  rely on the in-app banner.
- Never suggest anything that would show as red or read as scolding in the
  app — Berry's whole tone is gentle (see `BERRY_IMPLEMENTATION.md` §7.4).

## File naming
Return files named exactly `fridge.json` and `plan.json` (no dates in the
filename needed — Julie imports and discards). If only one is warranted this
cycle (e.g. no new groceries), just send `plan.json`.

## Reference
- Full data model & rules: `../BERRY_IMPLEMENTATION.md` §3 (data model),
  §6 (import/export), §7 (calculations), §7.4 (guardrails).
- Working examples: `examples/fridge.example.json`,
  `examples/plan.example.json`.
