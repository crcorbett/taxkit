import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { loadWebsiteSettingsServer } from "./loaders.server";
import type { WebsiteServerRenderContext } from "./schemas";

const websiteSettings = createServerFn({ method: "GET" }).handler(() =>
  loadWebsiteSettingsServer()
);
// Use the native generated identity at ingress; never mirror a build-time ID.
export const WebsiteSettingsFunctionPath = websiteSettings.url;

// The framework owns this plain Promise transport. Its small Effect carries
// the request signal and encoded SSR submission; it owns no client or Layer.
export const loadWebsiteSettings = (options: {
  readonly signal: AbortSignal;
  readonly submission?: WebsiteServerRenderContext["submission"];
}) =>
  Effect.runPromise(
    Effect.promise(() => websiteSettings({ signal: options.signal })).pipe(
      Effect.map((bootstrap) => ({
        catalogue: "catalogue" in bootstrap ? bootstrap.catalogue : undefined,
        settings: "settings" in bootstrap ? bootstrap.settings : undefined,
        submission: options.submission,
      }))
    ),
    { signal: options.signal }
  );
