import "@tanstack/react-start/server-only";
import { getRequest } from "@tanstack/react-start/server";
import { Effect, Schema } from "effect";

import { appRuntime } from "./runtime.server";
import { WebsiteSettingsTransport } from "./schemas";
import { WebsiteServerApplication } from "./service.server";

export const loadWebsiteSettingsServer = () =>
  appRuntime.runPromise(
    WebsiteServerApplication.pipe(
      Effect.flatMap((application) => application.settings),
      Effect.result,
      Effect.flatMap(Schema.encodeEffect(WebsiteSettingsTransport)),
      Effect.orDie
    ),
    { signal: getRequest().signal }
  );
