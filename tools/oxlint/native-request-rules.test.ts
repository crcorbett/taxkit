import nodePath from "node:path";
import { fileURLToPath } from "node:url";

import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it } from "@effect/vitest";
import { Array, Effect, Schema } from "effect";

import { lintFiles, writeLintFixture } from "./cli-fixture.js";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

// The published native request, cache and Layer rules, proved through the
// repository's actual Oxlint command and configuration at TaxKit paths.
const runOxlint = (path: string, extraArgs: readonly string[] = []) =>
  lintFiles([path], extraArgs, "json").pipe(
    Effect.flatMap((result) =>
      Schema.decodeEffect(
        Schema.fromJsonString(
          Schema.Struct({
            diagnostics: Schema.Array(Schema.Struct({ code: Schema.String })),
          })
        )
      )(result.stdout)
    ),
    Effect.map((report) =>
      Array.map(report.diagnostics, (diagnostic) => diagnostic.code)
    )
  );

describe("native request ownership rules", () => {
  it.effect(
    "traverses a large cyclic host AST without structural hashing",
    () =>
      runOxlint("apps/web/test/native-pair.boundary.test.ts").pipe(
        Effect.tap((codes) =>
          Effect.sync(() => {
            expect(codes).toEqual([]);
          })
        ),
        Effect.provide(BunServices.layer)
      ),
    10_000
  );
  it.effect.each([
    {
      count: 1,
      name: "rejects duplicate runtime production hostnames",
      path: "packages/analytics/src/.generated-host-owner.ts",
      rule: "strict-effect(public-host-literals)",
      source: 'export const origin = "https://api.taxkit.dev";',
    },
    {
      count: 1,
      name: "rejects duplicate runtime transport paths",
      path: "apps/api/src/.generated-route-owner.ts",
      rule: "strict-effect(route-literal-ownership)",
      source: 'export const route = "/api/v1/calculators";',
    },
    {
      count: 4,
      name: "rejects exported, aliased and Match-wrapped Layer factories",
      path: "packages/analytics/src/.generated-static-layers.ts",
      rule: "strict-effect(static-layers)",
      source: `import { Context, Effect, Layer, Layer as L, Match } from "effect";
class Origin extends Context.Service<Origin, string>()("Origin") {}
class Address extends Context.Service<Address, URL>()("Address") {}
export const factory = (origin: string) => Layer.succeed(Origin)(origin);
export const aliased = (origin: string) => L.succeed(Origin)(origin);
export const matched = (enabled: boolean) => Match.value(enabled).pipe(
  Match.when(true, () => Layer.succeed(Origin)("enabled")),
  Match.orElse(() => Layer.succeed(Origin)("disabled")),
);
export const exhaustive = (mode: { readonly _tag: "on" } | { readonly _tag: "off" }) => Match.value(mode).pipe(
  Match.tag("on", () => Layer.succeed(Origin)("enabled")),
  Match.tag("off", () => Layer.succeed(Origin)("disabled")),
  Match.exhaustive,
);
export const matcher = () => Match.type<boolean>().pipe(
  Match.when(true, () => Layer.succeed(Origin)("enabled")),
  Match.orElse(() => Layer.succeed(Origin)("disabled")),
);
export const ordinaryMatch = (enabled: boolean) => Match.value(enabled).pipe(
  Match.when(true, () => "enabled"), Match.orElse(() => "disabled"),
);
export const staticLayer = Layer.effect(
  Address,
  Effect.map(Origin, (origin) => new URL(origin))
);
export const composed = Layer.unwrap(
  Effect.map(Origin, (origin) => Layer.succeed(Address)(new URL(origin)))
);`,
    },
    {
      // The alias declaration reads the global too.
      count: 3,
      name: "rejects the global Cache API, including an alias",
      path: "apps/api/src/.generated-native-cache.ts",
      rule: "strict-effect(native-cloudflare-cache)",
      source: `const store = caches;
export const direct = caches.default;
export const aliased = store.default;
export const local = (caches: { readonly default: string }) => caches.default;`,
    },
    {
      count: 1,
      name: "rejects a service that only forwards generated client methods",
      path: "packages/analytics/src/.generated-client-replica.ts",
      rule: "strict-effect(no-native-client-replica)",
      source: `import { Context, Duration, Effect, Layer } from "effect";
import { HttpApiClient } from "effect/http-api";
import { TaxKitApi } from "@taxkit/api-http/api";
class Replica extends Context.Service<Replica, { readonly list: unknown }>()("Replica") {}
class Policy extends Context.Service<Policy, { readonly list: unknown }>()("Policy") {}
export const ReplicaLive = Layer.effect(
  Replica,
  Effect.gen(function* () {
    const client = yield* HttpApiClient.make(TaxKitApi);
    return Replica.of({ list: client.content.getNavigation });
  })
);
export const PolicyLive = Layer.effect(
  Policy,
  Effect.gen(function* () {
    const client = yield* HttpApiClient.make(TaxKitApi);
    return Policy.of({
      list: () =>
        client.content.getNavigation().pipe(Effect.timeout(Duration.seconds(10))),
    });
  })
);`,
    },
    {
      count: 2,
      name: "rejects request state inside route loaders",
      path: "apps/web/src/routes/.generated-loader-state.tsx",
      rule: "strict-effect(no-loader-request-state)",
      source: `import { createFileRoute } from "@tanstack/react-router";
import { Effect } from "effect";
import * as Atom from "effect/reactivity/Atom";
export const Route = createFileRoute("/generated")({
  loader: () => {
    const cached = Effect.cached(Effect.succeed(1));
    const state = Atom.make(0);
    return { cached, state };
  },
  component: () => {
    const local = Atom.make(0);
    return String(local);
  },
});`,
    },
    {
      count: 1,
      name: "rejects a Website handler at the API's public paths",
      path: "apps/web/src/routes/.generated-data-proxy.tsx",
      rule: "strict-effect(website-data-proxy)",
      source: `import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/v1/calculators")({
  server: { handlers: { GET: () => new Response("proxied") } },
});
export const Download = createFileRoute("/llms.txt")({
  server: { handlers: { GET: () => new Response("download") } },
});`,
    },
    {
      // The server-function import and its use are both reported.
      count: 4,
      name: "rejects server functions, stray runtimes and registries",
      path: "apps/web/src/lib/.generated-website-runtime.ts",
      rule: "strict-effect(website-rpc-boundary)",
      source: `import { createServerFn } from "@tanstack/react-start";
import { Layer, ManagedRuntime } from "effect";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
export const endpoint = createServerFn;
export const runtime = ManagedRuntime.make(Layer.empty);
export const registry = AtomRegistry.make();`,
    },
    {
      count: 3,
      name: "keeps Worker bindings and the API bridge with their owners",
      path: "apps/web/src/lib/.generated-host-modules.ts",
      rule: "strict-effect(module-ownership)",
      source: `import { env } from "cloudflare:workers";
import type { Env } from "cloudflare:workers";
import { toHttpClient } from "alchemy/Cloudflare/Bridge";
const address = "alchemy/Cloudflare/" + "Bridge";
export const bridge = import(address);
export const values = [env, toHttpClient];
export type Values = Env;`,
    },
  ])("$name", ({ count, path, rule, source }) =>
    Effect.gen(function* () {
      yield* writeLintFixture(nodePath.join(repositoryRoot, path), source);
      const codes = yield* runOxlint(path);
      expect(Array.filter(codes, (code) => code === rule)).toHaveLength(count);
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );

  it.effect.each([
    "apps/web/src/lib/api-client.atoms.ts",
    "apps/web/src/lib/host/binding.server.ts",
    "apps/web/src/lib/pages/loaders.ts",
    "apps/web/src/lib/runtime.client.ts",
    "apps/web/src/lib/runtime.server.ts",
    "apps/web/src/server.ts",
    "apps/web/src/routes/$.tsx",
    "apps/web/src/routes/search.tsx",
  ])("accepts the Website's native owner %s", (path) =>
    Effect.gen(function* () {
      const codes = yield* runOxlint(path);
      expect(
        Array.filter(
          codes,
          (code) =>
            code.startsWith("strict-effect(website-") ||
            code === "strict-effect(no-loader-request-state)" ||
            code === "strict-effect(static-layers)" ||
            code === "strict-effect(native-cloudflare-cache)" ||
            code === "strict-effect(no-native-client-replica)"
        )
      ).toEqual([]);
    }).pipe(Effect.provide(BunServices.layer))
  );
  it.effect(
    "checks floating Promises without requiring async SDK facades",
    () =>
      Effect.gen(function* () {
        const path = "packages/sdk/typescript/src/.generated-type-aware.ts";
        yield* writeLintFixture(
          nodePath.join(repositoryRoot, path),
          "export const native = () => Promise.resolve(1); native();"
        );
        const codes = yield* runOxlint(path, ["--type-aware"]);
        expect(codes).toContain("typescript(no-floating-promises)");
        expect(codes).not.toContain("typescript(promise-function-async)");
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );
});
