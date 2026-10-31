import test from "node:test";
import assert from "node:assert/strict";
import { merge, restore } from "../berry/merge.js";

const NOW = Date.parse("2026-11-01T12:00:00Z");
const e = (id, name = id) => ({ id, name, cals: 100, portions: 1, slot: "Lunch" });
const snap = (changedAt, over = {}) => ({ profile: { name: "J" }, targets: { cals: 1650 }, plan: null, foods: [], meals: [], log: {}, meta: { changedAt, tomb: {} }, ...over });

test("entries from two devices are both kept", () => {
  const a = snap("2026-11-01T10:00:00Z", { log: { "2026-11-01": { entries: [e("e1")] } } });
  const b = snap("2026-11-01T11:00:00Z", { log: { "2026-11-01": { entries: [e("e2")] } } });
  assert.deepEqual(merge(a, b, NOW).log["2026-11-01"].entries.map((x) => x.id), ["e1", "e2"]);
});

test("merge is commutative and idempotent", () => {
  const a = snap("2026-11-01T10:00:00Z", { foods: [e("f1")], log: { d: { entries: [e("e1")], weightLb: 150 } } });
  const b = snap("2026-11-01T11:00:00Z", { foods: [e("f2")], log: { d: { entries: [e("e2")], weightLb: 149 } } });
  const ab = merge(a, b, NOW);
  assert.deepEqual(ab, merge(b, a, NOW));
  assert.deepEqual(merge(ab, ab, NOW), ab);
  assert.deepEqual(merge(ab, a, NOW), ab);
  assert.equal(ab.log.d.weightLb, 149);
});

test("a deleted entry stays deleted after merging with a device that still has it", () => {
  const old = snap("2026-11-01T09:00:00Z", { log: { d: { entries: [e("e1"), e("e2")] } } });
  const after = snap("2026-11-01T10:00:00Z", { log: { d: { entries: [e("e2")] } }, meta: { changedAt: "2026-11-01T10:00:00Z", tomb: { e1: { at: "2026-11-01T10:00:00Z", kind: "entry", day: "d", item: e("e1") } } } });
  assert.deepEqual(merge(old, after, NOW).log.d.entries.map((x) => x.id), ["e2"]);
  assert.deepEqual(merge(after, old, NOW).log.d.entries.map((x) => x.id), ["e2"]);
});

test("restore brings a deleted entry back and survives a merge with the stale copy", () => {
  const stale = snap("2026-11-01T09:00:00Z", { log: { d: { entries: [e("e1")] } } });
  const s = snap("2026-11-01T10:00:00Z", { log: { d: { entries: [] } }, meta: { changedAt: "x", tomb: { e1: { at: "2026-11-01T10:00:00Z", kind: "entry", day: "d", item: e("e1") } } } });
  assert.ok(restore(s, "e1", "2026-11-01T11:00:00Z"));
  assert.deepEqual(s.log.d.entries.map((x) => x.id), ["e1"]);
  assert.deepEqual(merge(s, stale, NOW).log.d.entries.map((x) => x.id), ["e1"]);
  assert.equal(restore(s, "e1"), false);
});

test("a fresh phone takes the Dropbox copy", () => {
  const fresh = { profile: null, targets: null, plan: null, foods: [], meals: [], log: {}, meta: { tomb: {} } };
  const full = snap("2026-11-01T10:00:00Z", { foods: [e("f1")], log: { d: { entries: [e("e1")] } } });
  const m = merge(fresh, full, NOW);
  assert.equal(m.profile.name, "J");
  assert.equal(m.foods.length, 1);
});

test("tombstones expire after 180 days", () => {
  const old = new Date(NOW - 181 * 86400000).toISOString();
  const s = snap("2026-11-01T10:00:00Z", { meta: { changedAt: "2026-11-01T10:00:00Z", tomb: { x: { at: old, kind: "entry", item: e("x") } } } });
  assert.deepEqual(merge(s, s, NOW).meta.tomb, {});
});
