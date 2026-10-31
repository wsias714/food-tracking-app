// Pure merge of two Berry data snapshots (see docs/sync.md). Deterministic and idempotent: merge(a, b) equals merge(b, a)
// except for ties on `changedAt`, which fall back to the larger JSON so both sides still agree.
// A snapshot is { profile, targets, plan, foods[], meals[], log{day:{entries[],activities[],weightLb,...}}, meta{changedAt, tomb{}} }.
// Deletes are tombstones: meta.tomb[id] = { at, kind, day?, item, gone }. gone === false means "restored" and beats an older delete.
// Tombstones expire after 180 days, which must outlast the longest time a device stays offline or deletions come back.

export const TOMB_DAYS = 180;
const ts = (s) => (s && s.meta && s.meta.changedAt) || "";
const ser = (x) => JSON.stringify(x);

function mergeTombs(a, b, now) {
  const out = {};
  for (const src of [a || {}, b || {}]) for (const id in src) {
    const t = src[id];
    if (!out[id] || t.at > out[id].at || (t.at === out[id].at && ser(t) > ser(out[id]))) out[id] = t;
  }
  const cutoff = new Date(now - TOMB_DAYS * 86400000).toISOString();
  for (const id in out) if (out[id].at < cutoff) delete out[id];
  return out;
}
const dead = (tomb, id) => !!tomb[id] && tomb[id].gone !== false;

/** Union by id, minus deleted ids; on a shared id the newer snapshot's copy wins. */
function unionById(newer, older, tomb) {
  const seen = new Map();
  for (const x of older || []) if (x && x.id) seen.set(x.id, x);
  for (const x of newer || []) if (x && x.id) seen.set(x.id, x);
  return [...seen.values()].filter((x) => !dead(tomb, x.id)).sort((p, q) => (p.id < q.id ? -1 : 1));
}

export function merge(a, b, now = Date.now()) {
  a = a || {}; b = b || {};
  const [n, o] = ts(a) >= ts(b) && (ts(a) !== ts(b) || ser(a) >= ser(b)) ? [a, b] : [b, a]; // n = newer
  const tomb = mergeTombs(a.meta && a.meta.tomb, b.meta && b.meta.tomb, now);
  const log = {};
  for (const day of new Set([...Object.keys(n.log || {}), ...Object.keys(o.log || {})])) {
    const dn = (n.log || {})[day] || {}, dold = (o.log || {})[day] || {};
    const d = Object.assign({}, dold, dn);
    d.entries = unionById(dn.entries, dold.entries, tomb);
    const acts = unionById(dn.activities, dold.activities, tomb);
    if (acts.length || dn.activities || dold.activities) d.activities = acts;
    if (d.entries.length || acts.length || Object.keys(d).some((k) => k !== "entries" && k !== "activities")) log[day] = d;
  }
  const meta = Object.assign({}, o.meta, n.meta, { tomb });
  const exp = [a.meta && a.meta.lastExportAt, b.meta && b.meta.lastExportAt].filter(Boolean).sort().pop();
  if (exp) meta.lastExportAt = exp;
  const pick = (k) => (n[k] !== undefined && n[k] !== null ? n[k] : (o[k] !== undefined ? o[k] : null));
  return {
    profile: pick("profile"), targets: pick("targets"), plan: pick("plan"),
    foods: unionById(n.foods, o.foods, tomb), meals: unionById(n.meals, o.meals, tomb),
    log, meta,
  };
}

/** Put a deleted record back. Returns false when the tombstone has nothing to restore. */
export function restore(state, id, now = new Date().toISOString()) {
  const t = state.meta && state.meta.tomb && state.meta.tomb[id];
  if (!t || t.gone === false || !t.item) return false;
  if (t.kind === "entry" || t.kind === "activity") {
    const d = state.log[t.day] || (state.log[t.day] = { entries: [] });
    const key = t.kind === "entry" ? "entries" : "activities";
    (d[key] = d[key] || []).push(t.item);
  } else if (t.kind === "food") state.foods.push(t.item);
  else if (t.kind === "meal") state.meals.push(t.item);
  else return false;
  state.meta.tomb[id] = { at: now, kind: t.kind, day: t.day, gone: false };
  state.meta.changedAt = now;
  return true;
}

export const snapshot = (s) => ({
  v: 1, profile: s.profile, targets: s.targets, plan: s.plan, foods: s.foods, meals: s.meals, log: s.log, meta: s.meta,
});
