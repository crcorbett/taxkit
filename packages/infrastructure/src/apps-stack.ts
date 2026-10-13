import { adopt } from "alchemy/AdoptPolicy";
import { ZoneDnsSettings } from "alchemy/Cloudflare/DNS";
import * as Website from "alchemy/Cloudflare/Website";
import { Worker } from "alchemy/Cloudflare/Workers";
import { Zone } from "alchemy/Cloudflare/Zone";
import * as Output from "alchemy/Output";
import { retain } from "alchemy/RemovalPolicy";
import { Stage } from "alchemy/Stage";
import type { CalculatorHostMode } from "api/worker";
import {
  ApiWorkerNativeInit,
  ApiWorkerObservability,
  TaxKitApiWorker,
} from "api/worker";
import { Context, Effect, Option } from "effect";

import { checkedStage } from "./secrets.js";

export const NativeAppsHostMode = Context.Reference<CalculatorHostMode>(
  "@taxkit/infrastructure/NativeAppsHostMode",
  { defaultValue: () => "edge" }
);

const NativeProductionZone = Context.Reference<Option.Option<Zone>>(
  "@taxkit/infrastructure/NativeProductionZone",
  { defaultValue: Option.none }
);

// Published pages and discovery documents name the Production site in every
// stage, including Preview. Each host still binds its own native address.
export const publicationOrigin = "https://taxkit.dev";

const compatibility = {
  date: "2026-10-04",
  flags: ["nodejs_compat"],
};

// The API is declared first and knows nothing of the Website. Its version
// scoped cache is declared in its native init (`Cloudflare.cache`).
const NativeApiHostLive = TaxKitApiWorker.make(
  Effect.gen(function* () {
    return {
      ...Option.match(yield* NativeProductionZone, {
        onNone: () => ({}),
        onSome: (zone) => ({
          domain: { name: "api.taxkit.dev", zoneId: zone.zoneId },
        }),
      }),
      compatibility,
      env: {
        API_PUBLIC_ORIGIN: Worker.URL,
        CALCULATOR_HOST_MODE: yield* NativeAppsHostMode,
        TAXKIT_PUBLICATION_ORIGIN: publicationOrigin,
      },
      // The app export owns its native entry; the graph crosses the workspace
      // through that export rather than a relative filesystem import.
      main: import.meta.resolve("api/worker"),
      observability: ApiWorkerObservability,
      workersDev: true,
    };
  }),
  ApiWorkerNativeInit
);

// The Website receives the same stage's API address and private binding.
export class TaxKitWebsite extends Website.Vite<TaxKitWebsite>()(
  "TaxKitWebsite",
  Effect.gen(function* () {
    const api = yield* TaxKitApiWorker;
    return {
      ...Option.match(yield* NativeProductionZone, {
        onNone: () => ({}),
        onSome: (zone) => ({
          // Native Alchemy redirects www with a 301 that keeps path and query.
          domain: {
            name: "taxkit.dev",
            redirects: ["www.taxkit.dev"],
            zoneId: zone.zoneId,
          },
        }),
      }),
      // Each deployed Website version starts its own cache.
      cache: { crossVersionCache: false, enabled: true },
      compatibility,
      env: {
        API_PUBLIC_ORIGIN: api.url.pipe(
          Output.map((url) => Option.getOrNull(Option.fromNullishOr(url)))
        ),
        CALCULATOR_HOST_MODE: yield* NativeAppsHostMode,
        TAXKIT_API: api,
        TAXKIT_PUBLICATION_ORIGIN: publicationOrigin,
        WEBSITE_PUBLIC_ORIGIN: Worker.URL,
      },
      // Authored content and shared packages are build inputs, so a
      // content-only change deploys a new Website version.
      // Hash the Website and the workspace packages it bundles. Native
      // gitignore excludes do not reach `../` paths, so name them here;
      // otherwise the hash follows linked node_modules into the package store.
      memo: {
        exclude: [
          "**/node_modules/**",
          "**/dist/**",
          "**/.alchemy/**",
          "**/.output/**",
          "**/.tanstack/**",
          "**/.turbo/**",
          "**/.wrangler/**",
          "**/.vitest/**",
          "**/.env",
          "**/.env.*",
          "public/og/**",
          "../../packages/**/node_modules/**",
          "../../packages/**/dist/**",
          "../../packages/**/.source/**",
          "../../packages/**/.turbo/**",
          "../../packages/**/*.tsbuildinfo",
        ],
        include: ["**/*", "../../packages/**"],
        lockfile: true,
      },
      // The Website's platform records can include caller URLs independently
      // of its fixed application reporter. Keep them off.
      observability: {
        enabled: false,
        headSamplingRate: 0,
        logs: {
          enabled: false,
          headSamplingRate: 0,
          invocationLogs: false,
          persist: false,
        },
        traces: { enabled: false, headSamplingRate: 0, persist: false },
      },
      rootDir: "apps/web",
      workersDev: true,
    };
  })
) {}

export const declareNativeAppsStack = Effect.gen(function* () {
  const stage = yield* checkedStage(yield* Stage);
  const zone =
    stage === "prod"
      ? Option.some(
          yield* Zone("TaxKitProductionZone", {
            name: "taxkit.dev",
            paused: false,
            type: "full",
          }).pipe(adopt(true), retain())
        )
      : Option.none<Zone>();
  if (Option.isSome(zone)) {
    // Preserve the DNS settings independently read on 7 October. This does
    // not change DNSSEC, registrar, TLS, mail or verification records.
    yield* ZoneDnsSettings("TaxKitProductionDnsSettings", {
      flattenAllCnames: false,
      foundationDns: false,
      multiProvider: false,
      nameservers: { type: "cloudflare.standard" },
      nsTtl: 86_400,
      secondaryOverrides: false,
      zoneId: zone.value.zoneId,
      zoneMode: "standard",
    }).pipe(retain());
  }
  return yield* Effect.gen(function* () {
    const api = yield* TaxKitApiWorker;
    const website = yield* TaxKitWebsite;
    return { apiUrl: api.url, websiteUrl: website.url };
  }).pipe(
    Effect.provide(NativeApiHostLive),
    Effect.provideService(NativeProductionZone, zone)
  );
});
