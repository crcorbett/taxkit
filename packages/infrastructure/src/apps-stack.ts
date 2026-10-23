import type { CalculatorHostMode } from "@taxkit/observability/edge-identity";
import { adopt } from "alchemy/AdoptPolicy";
import { BotManagement } from "alchemy/Cloudflare/BotManagement";
import { Dnssec, ZoneDnsSettings } from "alchemy/Cloudflare/DNS";
import * as Website from "alchemy/Cloudflare/Website";
import { Worker } from "alchemy/Cloudflare/Workers";
import { Setting, Zone } from "alchemy/Cloudflare/Zone";
import * as Output from "alchemy/Output";
import { retain } from "alchemy/RemovalPolicy";
import { Stage } from "alchemy/Stage";
import { Context, Effect, Option } from "effect";

import { TaxKitApiWorker } from "./api-worker.js";
import {
  apiHostName,
  publicationOrigin,
  taxKitZoneName,
  websiteRedirectHostName,
} from "./hostnames.js";
import { checkedStage } from "./secrets.js";
import { taxKitLogsDestinationProduction } from "./telemetry.js";
import {
  disabledWorkerObservability,
  workerCompatibility,
} from "./worker-settings.js";

export const NativeAppsHostMode = Context.Reference<CalculatorHostMode>(
  "@taxkit/infrastructure/NativeAppsHostMode",
  { defaultValue: () => "edge" }
);

export const NativeProductionZone = Context.Reference<Option.Option<Zone>>(
  "@taxkit/infrastructure/NativeProductionZone",
  { defaultValue: Option.none }
);

/**
 * Production zone settings, one retained native resource each. TLS 1.3 is on
 * with a TLS 1.2 minimum (a 1.3 minimum would refuse TLS 1.2 clients, including
 * some crawlers). Browser Integrity Check is off because it answers default
 * script user agents with Cloudflare error 1010, and the lowest challenge
 * level keeps IP-reputation challenges to a minimum for API and agent callers.
 */
export const productionZoneSettings = [
  { resource: "TaxKitProductionTls13", settingId: "tls_1_3", value: "on" },
  {
    resource: "TaxKitProductionMinimumTlsVersion",
    settingId: "min_tls_version",
    value: "1.2",
  },
  {
    resource: "TaxKitProductionBrowserIntegrityCheck",
    settingId: "browser_check",
    value: "off",
  },
  {
    resource: "TaxKitProductionSecurityLevel",
    settingId: "security_level",
    value: "essentially_off",
  },
  {
    resource: "TaxKitProductionAlwaysUseHttps",
    settingId: "always_use_https",
    value: "on",
  },
] as const;

/**
 * A bot policy that bans no user agent: no Bot Fight Mode, no AI-bot blocking
 * or link maze, no content-bot blocking, and no Cloudflare-managed robots.txt
 * prepended to TaxKit's own. TaxKit is for API, SDK and agent callers.
 */
export const productionBotPolicy = {
  aiBotsProtection: "disabled",
  contentBotsProtection: "disabled",
  crawlerProtection: "disabled",
  fightMode: false,
  isRobotsTxtManaged: false,
} as const;

/**
 * Production exports only the hosts' own checked console records, through the
 * retained `taxkit-axiom-logs` destination. Cloudflare's invocation logs and
 * automatic traces stay off: they can record the full request URL with its
 * query string, headers and caller details outside the fixed fields.
 * This is Common Practice's decision for its privacy-sensitive tracking
 * Worker. Other stages keep every platform channel off.
 */
const productionObservability = Effect.gen(function* () {
  const logsDestination = yield* taxKitLogsDestinationProduction;
  return {
    enabled: true,
    logs: {
      destinations: [logsDestination],
      enabled: true,
      headSamplingRate: 1,
      invocationLogs: false,
      persist: false,
    },
    traces: { enabled: false, persist: false },
  };
});

// The API is declared first and knows nothing of the Website. Its version
// scoped cache is declared in its native init (`Cloudflare.cache`).
export const nativeApiHostProps = Effect.gen(function* () {
  return {
    // Production serves only its API hostname, as in Common Practice; other
    // stages keep the native workers.dev default.
    ...Option.match(yield* NativeProductionZone, {
      onNone: () => ({ workersDev: true }),
      onSome: (zone) => ({
        domain: { name: apiHostName, zoneId: zone.zoneId },
        workersDev: false,
      }),
    }),
    compatibility: workerCompatibility,
    dev: { host: "127.0.0.1", port: 3221, strictPort: true },
    env: {
      API_PUBLIC_ORIGIN: Worker.URL,
      CALCULATOR_HOST_MODE: yield* NativeAppsHostMode,
      TAXKIT_PUBLICATION_ORIGIN: publicationOrigin,
    },
    observability: Option.isSome(yield* NativeProductionZone)
      ? yield* productionObservability
      : disabledWorkerObservability,
  };
});

/**
 * The Website's build-input hash, in Alchemy's documented sibling-package
 * form. `**\/*` keeps `.gitignore` filtering inside `apps/web`; setting
 * `exclude` would switch it off. Each `../` pattern names only what the build
 * reads: package sources (at each nesting depth), manifests, tsconfigs and the
 * authored documentation content. Those patterns skip `.gitignore` and follow
 * links, so a wildcard depth also reaches each package's `node_modules`; the
 * negations prune installed, built and test files. Tests, READMEs and
 * CHANGELOGs therefore leave the hash unchanged, so a version-packages change
 * does not redeploy the Website. `workspaces: []` turns off Vite's
 * auto-detected workspaces, which would hash whole package directories. The
 * lockfile stands for installed dependencies.
 */
export const websiteBuildMemo = {
  include: [
    "**/*",
    "../../tsconfig.base.json",
    "../../packages/*/src/**",
    "../../packages/*/*/src/**",
    "../../packages/*/*/*/src/**",
    "../../packages/*/package.json",
    "../../packages/*/*/package.json",
    "../../packages/*/*/*/package.json",
    "../../packages/*/tsconfig.json",
    "../../packages/*/*/tsconfig.json",
    "../../packages/*/*/*/tsconfig.json",
    "../../packages/docs-content/content/**",
    "../../packages/docs-content/navigation.json",
    "../../packages/docs-content/source.config.ts",
    "!../../packages/**/node_modules/**",
    "!../../packages/**/dist/**",
    "!../../packages/**/*.test.ts",
    "!../../packages/**/*.test.tsx",
  ],
  lockfile: true,
  workspaces: [],
};

// The Website receives the same stage's API address and private binding.
export class TaxKitWebsite extends Website.Vite<TaxKitWebsite>()(
  "TaxKitWebsite",
  Effect.gen(function* () {
    const api = yield* TaxKitApiWorker;
    return {
      // Production serves its custom domain only; native Alchemy redirects www
      // with a 301 that keeps path and query. Other stages use their stable
      // workers.dev address. No stage needs version preview addresses.
      ...Option.match(yield* NativeProductionZone, {
        onNone: () => ({
          workersDev: { enabled: true, previewsEnabled: false },
        }),
        onSome: (zone) => ({
          domain: {
            name: taxKitZoneName,
            redirects: [websiteRedirectHostName],
            zoneId: zone.zoneId,
          },
          workersDev: false,
        }),
      }),
      // Each deployed Website version starts its own cache.
      cache: { crossVersionCache: false, enabled: true },
      compatibility: workerCompatibility,
      dev: { host: "127.0.0.1", port: 3220, strictPort: true },
      env: {
        API_PUBLIC_ORIGIN: api.url.pipe(
          Output.map((url) => Option.getOrNull(Option.fromNullishOr(url)))
        ),
        TAXKIT_API: api,
        TAXKIT_PUBLICATION_ORIGIN: publicationOrigin,
        WEBSITE_PUBLIC_ORIGIN: Worker.URL,
      },
      // Authored content and shared package sources are build inputs, so a
      // content-only change deploys a new Website version.
      memo: websiteBuildMemo,
      // Same policy as the API: Production exports checked console records
      // only; other stages keep every platform channel off.
      observability: Option.isSome(yield* NativeProductionZone)
        ? yield* productionObservability
        : disabledWorkerObservability,
      rootDir: "apps/web",
    };
  })
) {}

export const declareNativeAppsInfrastructure = Effect.gen(function* () {
  const stage = yield* checkedStage(yield* Stage);
  const zone =
    stage === "prod"
      ? Option.some(
          yield* Zone("TaxKitProductionZone", {
            name: taxKitZoneName,
            paused: false,
            type: "full",
          }).pipe(adopt(true), retain())
        )
      : Option.none<Zone>();
  if (Option.isSome(zone)) {
    // Preserve the DNS settings independently read on 7 October. This does
    // not change registrar, mail or verification records.
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
    yield* Effect.forEach(productionZoneSettings, (setting) =>
      Setting(setting.resource, {
        settingId: setting.settingId,
        value: setting.value,
        zoneId: zone.value.zoneId,
      }).pipe(retain())
    );
    // Cloudflare Registrar publishes the DS record when signing starts.
    yield* Dnssec("TaxKitProductionDnssec", {
      status: "active",
      zoneId: zone.value.zoneId,
    }).pipe(retain());
    yield* BotManagement("TaxKitProductionBotManagement", {
      ...productionBotPolicy,
      zoneId: zone.value.zoneId,
    }).pipe(retain());
  }
  return zone;
});

export const declareNativeAppsHosts = Effect.gen(function* () {
  const api = yield* TaxKitApiWorker;
  const website = yield* TaxKitWebsite;
  // Attach the Website's native address after both Workers exist. Native
  // binding env resolves this dependency without a props declaration cycle.
  yield* api.bind("WebsiteOrigin", {
    env: { WEBSITE_PUBLIC_ORIGIN: website.url },
  });
  return { apiUrl: api.url, websiteUrl: website.url };
});
