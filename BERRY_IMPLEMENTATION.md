# BERRY_IMPLEMENTATION.md
# Berry — Food & Nutrition Tracker PWA
# Implementation spec for Claude Code. Build exactly to this document.

## 0. Context

Berry is a calorie/nutrition tracking PWA for a single user (female, weight-loss goal,
iron-deficiency management). It is a sibling app to the existing gym tracker in this repo:
same architecture (single-file HTML PWA, localStorage, GitHub Pages), different design theme.

**Deliverable: one file — `berry/index.html` — deployable on GitHub Pages with zero build step.**
All HTML, CSS, and JS inline. React via CDN is NOT used; write vanilla JS (or preact via CDN
ONLY if genuinely needed — prefer vanilla). No external APIs. No accounts. Works offline.

An interactive JSX mockup (`berry-food-tracker-mockup-v2.jsx`) defines the approved look and
interaction patterns. Match it visually.

## 1. Design tokens (exact)

```css
:root {
  --bg: #FBF4F1;         /* blush cream page background */
  --card: #FFFFFF;
  --ink: #43273A;        /* deep plum text */
  --ink-soft: #8A6B80;   /* muted plum secondary text */
  --berry: #C2417A;      /* raspberry primary accent */
  --berry-soft: #F5DCE8; /* rose wash */
  --sage: #7FA383;       /* on-track / protein */
  --sage-soft: #E8F0E6;
  --gold: #D9A441;       /* near-target / carbs */
  --gold-soft: #F7EDD9;
  --iron: #8B5E7E;       /* iron accent, marker character: ⚘ */
  --rose-off: #D98A9E;   /* off-target calendar shade — never harsh red */
  --line: #F0DFE0;       /* hairlines */
}
```

- Display font: **Fraunces** (Google Fonts, weights 400/600 + italic 500) — headers, ring number.
- Numerals/data: **IBM Plex Mono** 400/500, tabular.
- Body: system stack (`-apple-system, 'SF Pro Text', 'Segoe UI', sans-serif`).
- Cards: radius 18px, 1px `--line` border, shadow `0 1px 3px rgba(67,39,58,.04)`.
- Buttons: radius 12–14px. Primary = berry fill, white text. Secondary = white, line border.
- Section labels: Fraunces italic 15px, `--ink-soft`.
- Tone: gentle. Going over target shows **gold**, never red. Copy is encouraging, never scolding.
- Animations: `pop` (scale .92→1) on newly added rows; `fadeUp` on screen change. Respect
  `prefers-reduced-motion`.

## 2. Architecture

- Single file `berry/index.html`. Tabs: **Today · Fridge · Meals · Coach** (bottom bar) plus a
  **History** view reached from a ▦ button in the Today header (back button returns).
- State: one in-memory `state` object, persisted to localStorage on every mutation via a single
  `save()` function (debounced 300ms). Load on boot; if empty, run first-time Setup (§8).
- PWA: inline `manifest` (data URI or separate `berry/manifest.json` — separate file is fine),
  `apple-mobile-web-app-capable`, theme-color `#FBF4F1`, apple-touch-icon (generate a simple
  180×180 PNG: berry-pink circle on blush, or inline SVG→canvas at runtime saved as icon file
  `berry/icon-180.png` committed to repo). Service worker `berry/sw.js` — cache-first for the
  app shell so it opens offline.
- iOS localStorage eviction risk: show a soft banner on Coach tab if last export > 14 days ago:
  "It's been a while — export a backup to keep your data safe."

## 3. Data model (localStorage)

All keys prefixed `berry:`. All dates local, format `YYYY-MM-DD`.

```js
// berry:profile
{
  name: "…",
  sex: "female",
  birthYear: 1993,
  heightIn: 65,
  goalWeightLb: 145,
  goalRateLbPerWk: 0.7,          // capped: see guardrails §7.4
  activityBase: 1.45,            // NEAT multiplier; covers housework, parenting,
                                 // all-day walking, PT patient work 4–5 hr/wk.
                                 // Editable in Settings, default 1.45.
  createdAt: ISO
}

// berry:targets  (written by Setup, editable in Settings, overwritten by plan.json import)
{ cals: 1650, protein: 115, carbs: 165, fat: 55, fiber: 25, ironMg: 18, updatedAt: ISO, source: "setup"|"plan" }

// berry:foods  — the personal library. Fridge items and ad-hoc foods both live here.
[{
  id: "f_xxxx",                  // "f_" + 8-char random
  name: "Kirkland spinach (frozen)",
  serving: "1 cup",
  cals: 45, protein: 5, carbs: 5, fat: 0, fiber: 4, ironMg: 3.7,
  store: "Costco" | "Trader Joe's" | "Whole Foods" | "Other" | null,  // null = not shown in Fridge groups
  useCount: 12, lastUsed: ISO,
  source: "manual" | "receipt" | "coach",
  createdAt: ISO
}]
// Derived, not stored: ironRich = ironMg >= 2.0 → show ⚘ everywhere the food appears.

// berry:meals  — saved plates
[{
  id: "m_xxxx",
  name: "Taco night plate",
  desc: "2 beef tacos · slaw · avocado",
  items: [{ foodId: "f_xxxx", portions: 1 }, ...],   // resolve totals live from foods
  createdAt: ISO, useCount: 4
}]
// If a referenced foodId was deleted, drop it from the meal at render time and flag "1 item missing".

// berry:log  — one object per day
{
  "2026-07-12": {
    entries: [{
      id: "e_xxxx",
      slot: "Breakfast" | "Lunch" | "Dinner" | "Snacks",
      foodId: "f_xxxx" | null,        // null for one-off custom entries
      name, cals, protein, carbs, fat, fiber, ironMg,   // SNAPSHOT at log time (edits to
      portions: 1                                        // library don't rewrite history)
    }],
    weightLb: 156.2 | undefined,
    energyAM: 1|2|3 | undefined,      // 1 low, 2 ok, 3 good
    energyPM: 1|2|3 | undefined,
    activities: [{
      id: "a_xxxx",
      type: "lift"|"walk"|"hike"|"bike"|"run"|"yoga"|"swim"|"custom",
      label: "Weights 45m",
      minutes: 45 | undefined,
      miles: 4 | undefined,           // walk/hike/run may use miles instead of minutes
      kcal: 189                       // computed at entry time, snapshot
    }]
  }
}

// berry:meta
{ lastExportAt: ISO|null, schemaVersion: 1 }
```

## 4. Screens

### 4.1 Today
- Header: weekday (Fraunces 22/600) + date; ▦ history button top-right (34px, line border).
- **Calorie ring** (SVG, r=74, stroke 10, rounded cap): hero number = |remaining| in Fraunces
  40/600; label "calories left" or "over today" (gold stroke when over); sub-line mono
  "X of Y". Animate stroke-dashoffset .5s on change.
- **Macro panel card**: bars for Protein (sage) / Carbs (gold) / Fat (berry), each with
  `Xg / targetg` mono right-aligned; hairline; then Fiber `Xg / 25g` and
  `Iron ⚘ X.Xmg / 18mg` inline (iron value sage when ≥ 2/3 of target so-far-today
  pro-rated is on pace — simplest rule: sage if ≥12mg, else --iron color).
- **Frequents row**: horizontal scroll of chips = top 8 foods+meals by
  `useCount` weighted by recency (score = useCount * 0.7^(daysSinceLastUsed/14)). One tap logs
  1 portion into the current slot (by hour: <11 Breakfast, <15 Lunch, <20 Dinner, else Snacks).
  Toast "Added to lunch".
- **Buttons**: `+ Add food` (primary) and `Copy yesterday` (copies all of yesterday's entries
  as fresh snapshots into today, same slots).
- **Add food flow** (bottom sheet): search input filters `foods` live (name substring,
  ranked by score). Each result row: name, serving, cals; tap → logged. Below results, always:
  `+ New food` → form: name, serving, cals, protein, carbs, fat, fiber, ironMg, store
  (optional select), [Save & log] [Save to library only]. All numeric fields `inputmode=decimal`.
- **Meal sections**: Breakfast/Lunch/Dinner/Snacks cards listing entries. Tap entry → expands:
  full macro line (mono, small: `P 17g · C 24g · F 3g · Fiber 0g · Fe 0.1mg`), portion buttons
  ½× 1× 1½× 2× (plus a small `#` field for arbitrary), Remove. ⚘ shown on iron-rich names.
- Swipe-left on entry row = Remove (with the same pattern used in the gym app).

### 4.2 History (from ▦)
- Back chevron + "History" title.
- **Month calendar** (current month; ‹ › arrows to move months). 7-col grid; each past day with
  data shows day number + `1.6k`-style mono calorie count; cell background:
  sage if |cals−target| ≤ 100, gold if ≤ 250, rose-off otherwise; empty/future = plain.
  Legend beneath. Today outlined. Tap a day → detail below.
- **Day detail card**: stats row (Calories, Protein, Iron, Energy low/ok/good — show worst of
  AM/PM), then that day's entries (slot label + name + cals) and activities with kcal.
- **Last 14 days card**: avg calories, avg protein, avg iron (from log).
- **Most logged lately card**: top 5 foods by count over trailing 30 days with proportional
  berry bars.

### 4.3 Fridge
- Subtitle: "Everything you actually buy. ⚘ = iron-rich".
- **Import card** (berry-soft): explains the loop — "Every week or two: photograph receipts
  into your Claude project; Coach returns files to import here." One button: `Import Berry file`
  → `<input type=file accept=.json>` → routes by `berryType` (§6). Show result toast:
  "Fridge updated · 4 new items · 2 updated".
- **Store groups**: foods where `store != null`, grouped Costco / Trader Joe's / Whole Foods /
  Other. Row: name (+⚘), sub `serving · Xg protein · Xmg iron`, cals mono, `+` button to log.
- **Tap row (not the +) → Edit sheet**: all fields editable (name, serving, cals, macros,
  ironMg, store), Save / Delete (confirm dialog: "Remove from fridge? Logged history keeps its
  numbers."). Deleting sets nothing in log (snapshots) but removes from meals per §3.
- `+ Add fridge item` button at bottom → same form as New food with store preselected "Other".

### 4.4 Meals
- Saved meal cards: name (+⚘ if total ironMg ≥ 3), desc, mono totals `cals · protein · iron`,
  `Log it` button (logs ALL items as separate entries into current slot, increments meal
  useCount).
- **Tap card body → Edit sheet**: rename, edit desc, item list with portion steppers and
  remove-item, `+ Add item` (search the library), live running totals, Save / Delete meal.
- `+ Build a new meal` (dashed border button) → same sheet, empty.

### 4.5 Coach
Cards top to bottom:

1. **Targets**: Daily target / Protein / Goal pace, mono values. Tap → Settings sheet
   (profile fields, activityBase, goalRate, manual target override).
2. **Weight trend**: sparkline of last 28 daily weights — raw dots berry@35%, 7-day rolling
   average as sage 2.5px line (the hero). Right: current 7-day avg + weekly Δ
   (▾ sage if losing, ▴ gold if gaining). Input `Today's weight` + Log (writes to today's log;
   re-logging overwrites).
3. **Macros — last 14 days**: stacked daily bars (protein sage / fat berry / carbs gold as %
   of calories, bar height = cals vs target), legend, mono avg split `27P / 44C / 29F`,
   and one generated insight line: pick the macro furthest below target and, if any library
   food is a top-3 source of it, name it (template: "Fiber averages 19g vs 25g — the lentil
   soup and pumpkin seeds in your fridge close that gap.").
4. **This week's movement** (NEW): quick-add chips: `Weights 45m` · `Walk (mi)` · `Hike (mi)`
   · `Bike 30m` · `Run (mi)` · `Custom`. Chips with a fixed duration log instantly; (mi) chips
   and Custom open a mini-input (miles or minutes + type select for Custom). Each logged
   activity shows as a row: label, kcal (mono), tap-to-delete. Weekly summary line:
   "This week: 3 workouts · ~890 kcal" and note beneath in ink-soft 11px:
   "Your daily budget already includes everyday movement — housework, errands, patient care.
   Log workouts only." Calories computed per §7.2 and added to that DAY's budget:
   ring target for a day = targets.cals + sum(day activities kcal). The ring sub-line shows
   `X of Y (+Z activity)` on days with activities.
5. **Iron & energy ⚘** (bg #F4EBF1): 14-day avg iron vs 18mg (mono, sage if ≥15 else iron
   color). Correlation line: count trailing-14-day days where ironMg < 12 AND worst energy = 1
   → "N of your recent low-energy days were also low-iron days." (hide if N=0 or <5 days of
   energy data). Two fixed habit bullets (vitamin C pairing ~3× absorption; keep coffee/tea
   ~1hr from iron meals). Energy check-in: "How's your energy this morning / this afternoon?"
   — show AM buttons before 14:00, PM after; low/ok/good; logged to today.
   Footer 10.5px ink-soft: "Food tracking supports — it doesn't replace — your doctor's plan
   for iron. Keep up with labs and any supplements they've prescribed."
6. **This week's note** (sage-soft): renders `plan.note` from the last imported plan.json with
   its date; empty state: "Import a Coach check-in to see your weekly note here."
7. **Coach check-in** card: 3-step ol (Export backup → attach to Claude project + receipt
   photos → import returned files), `Export backup for Coach` primary button (§6.1), and the
   same `Import Berry file` button as Fridge.

## 5. First-run Setup

Full-screen friendly wizard, one question per step: name → height → current weight →
birth year → goal weight → pace slider (0.5–1.0 lb/wk) → "About your days" info step stating
the 1.45 activity baseline in plain words with an Adjust option (1.3 / 1.45 / 1.6 radio) →
computed plan reveal (targets via §7) → done. Writes profile, targets, first weight to today.

## 6. Import / export

Every Berry file is JSON with a top-level `"berryType"` and `"version": 1`. ONE import
routine routes all three:

### 6.1 `backup` (exported by app)
```json
{ "berryType": "backup", "version": 1, "exportedAt": ISO,
  "profile": {...}, "targets": {...}, "foods": [...], "meals": [...], "log": {...} }
```
Export: `Blob` download named `berry-backup-YYYY-MM-DD.json`; update meta.lastExportAt.
Import (restore): confirm dialog, then full overwrite.

### 6.2 `fridge` (produced by Coach skill)
```json
{ "berryType": "fridge", "version": 1, "generatedAt": ISO,
  "foods": [ { "name": "...", "serving": "...", "cals": 0, "protein": 0, "carbs": 0,
               "fat": 0, "fiber": 0, "ironMg": 0, "store": "Costco" } ],
  "meals": [ { "name": "...", "desc": "...",
               "items": [ { "foodName": "...", "portions": 1 } ] } ] }
```
Merge rules: match existing food case-insensitively on name → update nutrition/store,
keep id/useCount; no match → create (source:"coach"). Meals: match by name → replace items
(resolve foodName→foodId; unresolved names are created as foods with store:"Other" ONLY if the
meal object embeds full nutrition for them under `"food": {...}`, else skip + report).
Toast summary of added/updated/skipped.

### 6.3 `plan` (produced by Coach skill)
```json
{ "berryType": "plan", "version": 1, "generatedAt": ISO,
  "targets": { "cals": 1625, "protein": 115, "carbs": 160, "fat": 54, "fiber": 25, "ironMg": 18 },
  "note": "Trending −0.7 lb/week — right on pace. …",
  "weeklyFocus": ["Pair iron foods with citrus", "Two lifting sessions"] }
```
Import: overwrite targets (source:"plan"), store note+focus+date for Coach card 6.
Reject targets.cals < 1200 with a friendly message (§7.4).

## 7. Calculations (implement exactly)

### 7.1 Baseline energy
- BMR (Mifflin-St Jeor, female): `10*kg + 6.25*cm − 5*age − 161`
  (kg = lb/2.2046, cm = in*2.54, age from birthYear).
- Maintenance = BMR × profile.activityBase (default 1.45 — covers NEAT + PT job; workouts
  are NOT in this multiplier).
- Daily calorie target = Maintenance − (goalRateLbPerWk × 3500 / 7), floored per §7.4.
- Protein target = 0.85 g × goalWeightLb (round to 5). Fat = 30% of target cals /9 (round 5).
  Carbs = remainder /4 (round 5). Fiber 25g. Iron 18mg.
- Weight used for BMR = 7-day trend average if available, else latest.

### 7.2 Activity calories (MET method)
`kcal = MET × kg × hours`, kg from current trend weight. For mile-based entries assume pace:
walk 17 min/mi, hike 20 min/mi, run 10 min/mi.

| type  | MET | default entry |
|-------|-----|---------------|
| lift  | 3.5 | 45 min chip   |
| walk  | 4.3 | miles input   |
| hike  | 6.0 | miles input   |
| bike  | 6.8 | 30 min chip   |
| run   | 9.8 | miles input   |
| yoga  | 2.5 | custom        |
| swim  | 5.8 | custom        |
| custom| 4.0 | minutes input |

Round kcal to nearest 5. Show the estimate before confirming custom entries.

### 7.3 Trends
- 7-day weight average = mean of last ≤7 logged weights. Weekly Δ = avg(last 7) − avg(prior 7).
- 14-day nutrition averages ignore days with zero entries (don't average in unlogged days).

### 7.4 Guardrails (hard rules)
- Calorie target never below **1,200** — clamp and show gentle note.
- Pace slider max 1.0 lb/wk; if actual trend loss exceeds 1% of body weight/week for 2
  consecutive weeks, Coach card shows: "You're losing faster than planned — consider adding
  ~150 calories. Fast loss costs muscle and energy."
- No calorie/macro numbers are ever shown in red. No shame copy anywhere.
- Iron card always carries the medical-support footer (§4.5.5).

## 8. Deploy

- Files: `berry/index.html`, `berry/sw.js`, `berry/manifest.json`, `berry/icon-180.png`.
- Same repo, existing GitHub Pages → app at `https://<user>.github.io/<repo>/berry/`.
- Commit message: `feat(berry): food & nutrition tracker PWA v1`.
- After deploy, verify: add-to-home-screen on iOS Safari shows icon + standalone mode;
  airplane-mode relaunch works; localStorage survives relaunch.

## 9. Acceptance checklist

- [ ] One-tap log from frequents updates ring + all macro bars instantly
- [ ] New food form → appears in library, Fridge (if store set), and search
- [ ] Fridge item edit + delete; meal build/edit/delete; meal Log-it creates per-item entries
- [ ] Copy yesterday works; portions ½–2× + arbitrary recompute snapshot values
- [ ] History calendar shades correctly; day tap shows entries, stats, energy, activities
- [ ] Activity chips compute MET kcal; day ring target expands by activity kcal
- [ ] Energy AM/PM logging; iron/energy correlation line appears with ≥5 days of data
- [ ] Export backup downloads valid JSON; import routes backup/fridge/plan by berryType
- [ ] plan.json under 1200 cals rejected politely
- [ ] Setup wizard produces targets matching §7.1 hand-check
- [ ] Offline relaunch OK; reduced-motion respected; nothing rendered in red
