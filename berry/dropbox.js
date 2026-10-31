// Minimal Dropbox client for Berry: OAuth PKCE (no secret, refresh token kept on the device), create-only uploads for
// feedback, and rev-checked read/write for the data file (sync.js). Everything stays in the app's own folder (Apps/Berry_app/).
import { DROPBOX_APP_KEY } from "./config.js";

const K = { refresh: "berry-dbx-refresh", verifier: "berry-dbx-verifier" };
const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const put = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ } };
const redirectUri = () => location.origin + location.pathname.replace(/[^/]*$/, "");
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const configured = () => !!DROPBOX_APP_KEY;
export const connected = () => configured() && !!get(K.refresh);
export function disconnect() { put(K.refresh, null); cached = { token: "", exp: 0 }; }

async function tokenRequest(params) {
  const r = await fetch("https://api.dropboxapi.com/oauth2/token", { method: "POST", body: new URLSearchParams({ client_id: DROPBOX_APP_KEY, ...params }) });
  if (!r.ok) throw new Error("Dropbox sign-in failed (" + r.status + ")");
  return r.json();
}

export async function startAuth() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  put(K.verifier, verifier);
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  location.href = "https://www.dropbox.com/oauth2/authorize?" + new URLSearchParams({
    client_id: DROPBOX_APP_KEY, response_type: "code", code_challenge: challenge, code_challenge_method: "S256",
    token_access_type: "offline", redirect_uri: redirectUri(), state: "berry",
  });
}

/** Call on every load: completes the redirect back from Dropbox, if this load is one. */
export async function finishAuthFromUrl() {
  const q = new URLSearchParams(location.search);
  if (!configured() || q.get("state") !== "berry" || !q.get("code")) return;
  const verifier = get(K.verifier);
  history.replaceState(null, "", location.pathname);
  if (!verifier) return;
  const t = await tokenRequest({ grant_type: "authorization_code", code: q.get("code"), code_verifier: verifier, redirect_uri: redirectUri() });
  if (t.refresh_token) put(K.refresh, t.refresh_token);
  put(K.verifier, null);
}

let cached = { token: "", exp: 0 };
async function accessToken() {
  if (cached.token && Date.now() < cached.exp) return cached.token;
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: get(K.refresh) });
  cached = { token: t.access_token, exp: Date.now() + (t.expires_in - 120) * 1000 };
  return cached.token;
}

/** Create-only upload. A path that already exists counts as done (a retry of something already sent). */
export async function create(path, text) {
  const r = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: { Authorization: "Bearer " + (await accessToken()), "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({ path, mode: "add", autorename: false, mute: true }) },
    body: text,
  });
  if (r.ok || r.status === 409) return;
  throw new Error("Dropbox upload failed (" + r.status + ")");
}

async function api(host, path, arg, body) {
  const r = await fetch(`https://${host}.dropboxapi.com/2/${path}`, {
    method: "POST",
    headers: host === "content"
      ? { Authorization: "Bearer " + (await accessToken()), "Content-Type": "application/octet-stream", "Dropbox-API-Arg": JSON.stringify(arg) }
      : { Authorization: "Bearer " + (await accessToken()), "Content-Type": "application/json" },
    body: host === "content" ? body : JSON.stringify(arg),
  });
  if (r.ok) return r;
  const text = await r.text().catch(() => "");
  const e = new Error("Dropbox " + path + " failed (" + r.status + ")");
  e.status = r.status;
  e.scope = /missing_scope/.test(text);
  e.conflict = r.status === 409 && /conflict/.test(text);
  e.notFound = r.status === 409 && /not_found/.test(text);
  throw e;
}

/** { text, rev } or null when the file does not exist yet. */
export async function read(path) {
  try {
    const r = await api("content", "files/download", { path });
    return { text: await r.text(), rev: JSON.parse(r.headers.get("dropbox-api-result")).rev };
  } catch (e) { if (e.notFound) return null; throw e; }
}

/** Write with a rev check: rev = null creates only, a rev updates only that version. A lost race throws e.conflict. */
export async function write(path, text, rev) {
  const mode = rev ? { ".tag": "update", update: rev } : "add";
  const r = await api("content", "files/upload", { path, mode, autorename: false, mute: true }, text);
  return (await r.json()).size;
}

export async function list(path) {
  try { return (await (await api("api", "files/list_folder", { path })).json()).entries; }
  catch (e) { if (e.notFound) return []; throw e; }
}
export const remove = (path) => api("api", "files/delete_v2", { path });
