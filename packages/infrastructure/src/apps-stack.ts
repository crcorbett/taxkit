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

import { nativeAppsStage } from "./apps-secrets.boundary.js";

export const NativeAppsHostMode = Context.Reference<CalculatorHostMode>(
  "@taxkit/infrastructure/NativeAppsHostMode",
  { defaultValue: () => "edge" }
);

const NativeProductionZone = Context.Reference<Option.Option<Zone>>(
  "@taxkit/infrastructure/NativeProductionZone",
  { defaultValue: Option.none }
);

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
      ...Option.match(yield* NativeProductionZone, {
        onNone: () => ({}),
        onSome: (zone) => ({
          domain: {
            name: "taxkit.dev",
            redirects: ["www.taxkit.dev"],
            zoneId: zone.zoneId,
          },
        }),
      }),
      compatibility: {
        date: "2026-10-04",
        flags: ["nodejs_compat"],
      },
      env: {
        API_PUBLIC_ORIGIN: apiOrigin,
        CALCULATOR_HOST_MODE: yield* NativeAppsHostMode,
        TAXKIT_API: api,
        WEBSITE_PUBLIC_ORIGIN: Worker.URL,
      },
      // The Website's platform records can include caller URLs independently
      // of its fixed application reporter. Qualified exporters remain pending.
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

const NativeApiHostLive = TaxKitApiWorker.make(
  Effect.gen(function* () {
    const website = yield* TaxKitWebsite;
    return {
      ...Option.match(yield* NativeProductionZone, {
        onNone: () => ({}),
        onSome: (zone) => ({
          domain: { name: "api.taxkit.dev", zoneId: zone.zoneId },
        }),
      }),
      compatibility: {
        date: "2026-10-04",
        flags: ["nodejs_compat"],
      },
      env: {
        API_PUBLIC_ORIGIN: Worker.URL,
        CALCULATOR_HOST_MODE: yield* NativeAppsHostMode,
        WEBSITE_PUBLIC_ORIGIN: website.url.pipe(
          Output.map((url) => Option.getOrNull(Option.fromNullishOr(url)))
        ),
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

export const declareNativeAppsStack = Effect.gen(function* () {
  const stage = yield* nativeAppsStage(yield* Stage);
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
