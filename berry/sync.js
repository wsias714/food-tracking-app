// Keeps Berry's data in Dropbox Apps/Berry_app/data.json. localStorage stays the working copy (Berry works offline);
// this module merges with the Dropbox copy on open, on return to the app and a few seconds after each change.
// Runs as a module and talks to the app through its globals (state, saveNow, render, uiState).
import { connected, read, write, list, remove, disconnect, startAuth } from "./dropbox.js";
import { merge, restore, snapshot } from "./merge.js";

const FILE = "/data.json";
const KEEP_BACKUPS = 5;
let busy = false, timer = null;
export const status = { text: "", at: null, error: "" };

const dayStamp = () => new Date().toISOString().slice(0, 10);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const mine = () => snapshot(state);

function adopt(m) {
  state.profile = m.profile; state.targets = m.targets; state.plan = m.plan;
  state.foods = m.foods; state.meals = m.meals; state.log = m.log; state.meta = m.meta;
  saveNow();
}

/** Safety copy of what is about to be replaced, at most one per day; the first ever is kept for good. */
async function backup(text, first) {
  const name = first ? "pre-sync.json" : `${dayStamp()}.json`;
  try { await write(`/backups/${name}`, text, null); } catch (e) { if (!e.conflict) throw e; }
  const dated = (await list("/backups")).map((f) => f.name).filter((n) => /^\d{4}-\d\d-\d\d\.json$/.test(n)).sort();
  for (const n of dated.slice(0, Math.max(0, dated.length - KEEP_BACKUPS))) await remove(`/backups/${n}`);
}

export async function syncNow() {
  if (busy || !connected()) return;
  busy = true; status.text = "Syncing…"; status.error = ""; notify();
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const remote = await read(FILE);
      let next = mine(), first = false;
      if (remote) {
        const theirs = JSON.parse(remote.text);
        first = !localStorage.getItem("berry-synced-once");
        if (first) await backup(JSON.stringify(mine()), true);
        next = merge(mine(), theirs);
        if (!same(next, theirs) && !first) await backup(remote.text, false);
      } else if (state.profile) await backup(JSON.stringify(mine()), true);
      else { status.text = "Nothing to sync yet"; return; }
      const changed = !same(next, mine());
      if (changed) { adopt(next); if (!uiState.sheet) render(); }
      if (!remote || !same(next, JSON.parse(remote.text))) {
        try { await write(FILE, JSON.stringify(next), remote ? remote.rev : null); } catch (e) { if (e.conflict && attempt < 2) continue; throw e; }
      }
      localStorage.setItem("berry-synced-once", "1");
      status.at = new Date(); status.text = ""; return;
    }
  } catch (e) {
    status.error = e.scope ? "Dropbox needs permission to read files. Disconnect and connect again." : e.message;
    status.text = navigator.onLine ? "Sync problem" : "Offline; changes are kept on this phone";
  } finally { busy = false; notify(); }
}

/** Called after every save: sync a few seconds after the last change. */
export function kick() { clearTimeout(timer); timer = setTimeout(() => void syncNow(), 4000); }
const notify = () => { try { window.dispatchEvent(new Event("berry-sync")); } catch { /* ignore */ } };
export const connect = startAuth;
export const signOut = () => { disconnect(); status.text = ""; status.at = null; notify(); };

window.berrySync = { syncNow, kick, status, connect, signOut, connected, restore };
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void syncNow(); });
window.addEventListener("online", () => void syncNow());
window.dispatchEvent(new Event("berry-sync-ready"));
