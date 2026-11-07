// In-app Feedback button (shared module, see ~/Projects/_shared/feedback). Items go to Dropbox Apps/Berry_app/feedback/.
// The first Send asks to connect Dropbox (one tap, then it is remembered); until the app key is set in config.js,
// or if the phone is offline, the item stays on the device and the panel offers email.
import { initFeedback } from "./feedback.js";
import { configured, connected, create, finishAuthFromUrl, startAuth } from "./dropbox.js";
import { syncNow } from "./sync.js";

const upload = configured() ? async (item) => {
  if (!connected()) {
    if (confirm("Connect Dropbox so Berry can send feedback? Your note is saved and will go as soon as you are back.")) await startAuth();
    throw new Error("not connected");
  }
  await create(`/feedback/${item.id}.json`, JSON.stringify(item));
} : undefined;

finishAuthFromUrl().catch(() => {}).finally(() => { window.berryFeedback = initFeedback({ app: "berry", bottom: 84, upload }); void syncNow(); });
