import * as Website from "alchemy/Cloudflare/Website";
import { Worker } from "alchemy/Cloudflare/Workers";
import * as Output from "alchemy/Output";
import { ApiWorkerInit, TaxKitApiWorker } from "api/worker";
import { Effect, Option } from "effect";

// A forward API tag registers before its implementation Layer finishes. The
// native planner retains both address Outputs, including the binding cycle.
export class TaxKitWebsite extends Website.Vite<TaxKitWebsite>()(
  "TaxKitWebsite",
  Effect.gen(function* () {
    const api = yield* TaxKitApiWorker;
    const apiOrigin = api.url.pipe(
      Output.map((url) => Option.getOrNull(Option.fromNullishOr(url)))
    );
    return {
      compatibility: {
        date: "2026-10-04",
        flags: ["nodejs_compat"],
      },
      env: {
        API_PUBLIC_ORIGIN: apiOrigin,
        TAXKIT_API: api,
        WEBSITE_PUBLIC_ORIGIN: Worker.URL,
      },
      rootDir: "apps/web",
      workersDev: true,
    };
  })
) {}

const NativeApiHostLive = TaxKitApiWorker.make(
  Effect.gen(function* () {
    const website = yield* TaxKitWebsite;
    return {
      compatibility: {
        date: "2026-10-04",
        flags: ["nodejs_compat"],
      },
      env: {
        API_PUBLIC_ORIGIN: Worker.URL,
        WEBSITE_PUBLIC_ORIGIN: website.url.pipe(
          Output.map((url) => Option.getOrNull(Option.fromNullishOr(url)))
        ),
      },
      // The app export owns its native entry; the graph crosses the workspace
      // through that export rather than a relative filesystem import.
      main: import.meta.resolve("api/worker"),
      workersDev: true,
    };
  }),
  ApiWorkerInit
);

export const declareNativeAppsStack = Effect.gen(function* () {
  const api = yield* TaxKitApiWorker;
  const website = yield* TaxKitWebsite;
  return { apiUrl: api.url, websiteUrl: website.url };
}).pipe(Effect.provide(NativeApiHostLive));
