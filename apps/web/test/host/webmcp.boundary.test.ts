import { expect, it } from "@effect/vitest";
import { TaxKitApi } from "@taxkit/api-http/api";
import { TaxKitApiInProcessLive } from "@taxkit/api-http/in-process";
import { TaxKitMcpToolkit } from "@taxkit/api-mcp/tools";
import { CalculatorCatalogResponse } from "@taxkit/calculators/schemas";
import { ContentServiceLive } from "@taxkit/content/live";
import {
  DocsPublicationOrigin,
  DocsWebsiteOrigin,
} from "@taxkit/content/schemas";
import { ContentCatalogue } from "@taxkit/content/service";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import { WebMcpToolResult } from "@taxkit/webmcp/schemas";
import {
  Function as EffectFunction,
  Array,
  Effect,
  Layer,
  Option,
  Order,
  Predicate,
  Record,
  Ref,
  Schedule,
  Schema,
} from "effect";
import { HttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { TestClock } from "effect/testing";
import { vi } from "vitest";
import type { WebMCP } from "webmcp-types";

import {
  ApiClient,
  apiClientRuntime,
  browserApiClient,
  publicSettingsAtom,
} from "../../src/lib/api-client.atoms";
import { WebsitePublicSettings } from "../../src/lib/host/schemas";
import { webMcpAtom } from "../../src/lib/runtime.client";

const websiteOrigin = DocsWebsiteOrigin.make(
  new URL("https://website.example.com")
);
const settings = WebsitePublicSettings.make({
  apiOrigin: WebsitePublicSettings.fields.apiOrigin.make(
    new URL("https://api.example.com")
  ),
  publicationOrigin: DocsPublicationOrigin.make(websiteOrigin),
  websiteOrigin,
});
const toolNames = EffectFunction.pipe(
  Record.keys(TaxKitMcpToolkit.tools),
  Array.sort(Order.String)
);
// The real generated client over the actual API routes in this process. The
// counter shows that every tool shares the one client the loaders use.
const makeRegistry = (requests: Ref.Ref<readonly string[]>) =>
  Effect.acquireRelease(
    Effect.sync(() =>
      AtomRegistry.make({
        initialValues: [
          [publicSettingsAtom, Option.some(settings)],
          [
            apiClientRuntime.layer,
            Layer.effect(
              ApiClient,
              HttpApiClient.make(TaxKitApi, {
                baseUrl: settings.apiOrigin.origin,
              })
            ).pipe(
              Layer.provide(
                Layer.effect(
                  HttpClient.HttpClient,
                  HttpClient.HttpClient.pipe(
                    Effect.map(
                      HttpClient.tapRequest((request) =>
                        Ref.update(requests, Array.append(request.url))
                      )
                    )
                  )
                )
              ),
              Layer.provide(
                TaxKitApiInProcessLive.pipe(
                  Layer.provide(
                    ContentServiceLive.pipe(
                      Layer.provide(
                        Layer.effect(ContentCatalogue, exampleContentCatalogue)
                      )
                    )
                  )
                )
              )
            ),
          ],
        ],
      })
    ),
    (registry) =>
      Effect.sync(() => {
        registry.dispose();
      })
  );
const installHost = Effect.fnUntraced(function* ({
  origin,
}: Readonly<{ origin: string }>) {
  const register = vi
    .fn<WebMCP.ModelContext["registerTool"]>()
    .mockResolvedValue();
  yield* Effect.acquireRelease(
    Effect.sync(() => {
      vi.stubGlobal("document", { modelContext: { registerTool: register } });
      vi.stubGlobal("location", new URL(origin));
    }),
    () => Effect.sync(() => vi.unstubAllGlobals())
  );
  return register;
});
type Register = Effect.Success<ReturnType<typeof installHost>>;
const execute = Effect.fnUntraced(function* ({
  input,
  name,
  register,
}: Readonly<{
  input: Parameters<WebMCP.ToolExecuteCallback>[0];
  name: string;
  register: Register;
}>) {
  const [tool] = yield* EffectFunction.pipe(
    register.mock.calls,
    Array.findFirst(([entry]) => entry.name === name),
    Effect.fromOption
  );
  const response = yield* Effect.promise(() => {
    const reply = tool.execute(input, {
      signal: new AbortController().signal,
    });
    if (!Predicate.isPromise(reply)) {
      return expect.fail("The native tool callback must return a Promise");
    }
    return reply;
  });
  return yield* Schema.decodeUnknownEffect(WebMcpToolResult)(response);
});
// Poll a registry-driven observation with the live clock.
const eventually = <A>(observe: () => A, until: (value: A) => boolean) =>
  Effect.sync(observe).pipe(
    Effect.repeat({ schedule: Schedule.spaced("20 millis"), until }),
    Effect.timeout(2000),
    TestClock.withLive
  );

it.effect(
  "the root registration registers every API MCP tool once, calls the shared client and unregisters on unmount",
  () =>
    Effect.gen(function* () {
      const register = yield* installHost({ origin: websiteOrigin.href });
      const requests = yield* Ref.make<readonly string[]>([]);
      const registry = yield* makeRegistry(requests);
      // React's useAtomMount is registry.mount plus its cleanup.
      const unmount = registry.mount(webMcpAtom);
      yield* eventually(
        () => register.mock.calls.length,
        (count) => count >= toolNames.length
      );
      const names = EffectFunction.pipe(
        register.mock.calls,
        Array.map(([tool]) => tool.name),
        Array.sort(Order.String)
      );
      const catalogue = yield* execute({
        input: {},
        name: "taxkit_list_calculators",
        register,
      });
      const page = yield* execute({
        input: { path: "/start/overview" },
        name: "taxkit_read_doc",
        register,
      });
      const beforeInvalid = yield* Ref.get(requests);
      // Invalid input is answered without a request.
      const invalid = yield* execute({
        input: {},
        name: "taxkit_read_doc",
        register,
      });
      const catalogueChecked = yield* Schema.decodeUnknownEffect(
        Schema.toCodecJson(CalculatorCatalogResponse)
      )(catalogue.structuredContent).pipe(Effect.isSuccess);
      expect({
        catalogue: { checked: catalogueChecked, isError: catalogue.isError },
        invalid: invalid.isError,
        names,
        page: page.isError,
        requests: yield* Ref.get(requests),
      }).toStrictEqual({
        catalogue: { checked: true, isError: false },
        invalid: true,
        names: toolNames,
        page: false,
        requests: beforeInvalid,
      });
      expect(beforeInvalid).toStrictEqual([
        "/api/v2/calculators",
        "/api/v2/docs/page",
      ]);
      const client = yield* browserApiClient.pipe(
        Effect.provideService(AtomRegistry.AtomRegistry, registry)
      );
      unmount();
      // The registry releases an unmounted Atom in a later task; its Scope
      // then aborts every registration.
      const aborted = yield* eventually(
        () =>
          EffectFunction.pipe(
            register.mock.calls,
            Array.every(([, options]) => options?.signal?.aborted === true)
          ),
        (value) => value
      );
      // Unregistering does not close the client the loaders still use.
      const retained = yield* browserApiClient.pipe(
        Effect.provideService(AtomRegistry.AtomRegistry, registry)
      );
      expect({ aborted, retained: retained === client }).toStrictEqual({
        aborted: true,
        retained: true,
      });
    }).pipe(Effect.scoped)
);
it.effect("another origin, or a page without settings, registers nothing", () =>
  Effect.gen(function* () {
    const register = yield* installHost({
      origin: "https://other.example.com",
    });
    const requests = yield* Ref.make<readonly string[]>([]);
    const registry = yield* makeRegistry(requests);
    const unmount = registry.mount(webMcpAtom);
    yield* AtomRegistry.getResult(registry, webMcpAtom, {
      suspendOnWaiting: true,
    });
    unmount();
    const unconfigured = yield* Effect.acquireRelease(
      Effect.sync(() => AtomRegistry.make()),
      (value) =>
        Effect.sync(() => {
          value.dispose();
        })
    );
    const sameOrigin = yield* installHost({ origin: websiteOrigin.href });
    const release = unconfigured.mount(webMcpAtom);
    yield* AtomRegistry.getResult(unconfigured, webMcpAtom, {
      suspendOnWaiting: true,
    });
    release();
    expect(register).not.toHaveBeenCalled();
    expect(sameOrigin).not.toHaveBeenCalled();
    expect(yield* Ref.get(requests)).toStrictEqual([]);
  }).pipe(Effect.scoped)
);
