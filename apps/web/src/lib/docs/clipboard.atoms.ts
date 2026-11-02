import * as Clipboard from "@effect/platform-browser/Clipboard";

import { browserRuntime } from "../api-client.atoms";

// Local browser commands share the application's factory and root registry;
// they acquire no HTTP client or remote settings.
export const clipboardRuntime = browserRuntime.factory(Clipboard.layer);
