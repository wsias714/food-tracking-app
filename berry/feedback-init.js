// In-app Feedback button (shared module, see ~/Projects/_shared/feedback). Berry has no Dropbox sync, so an item
// is kept on the device and sent by email from the panel (the address is asked for once and never stored in this repo).
import { initFeedback } from "./feedback.js";
initFeedback({ app: "berry", bottom: 84 });
