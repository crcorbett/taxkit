// Native pair surface: Calculator metadata and the server-rendered calculator form.
// native-pair.boundary.test.ts runs these checks in order on one host pair.
import { expect } from "@effect/vitest";
import { TaxKitApi } from "@taxkit/api-http/api";
import {
  CalculatorRequestBodyErrorEnvelope,
  CalculatorRequestBodyTooLarge,
} from "@taxkit/api-http/request-boundary";
import {
  DescriptorFilterQuery,
  HelpQuery,
  MetadataQuery,
} from "@taxkit/calculators/schemas";
import {
  Match,
  Function as EffectFunction,
  Array,
  Effect,
  Option,
  Order,
  Record,
  Schema,
} from "effect";
import { FetchHttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";

import {
  apiOrigin,
  websiteOrigin,
  form,
  publicCache,
  frameworkSentinel,
} from "./native-pair.fixture";
import type { NativePairBundles, NativePairHosts } from "./native-pair.fixture";

export const verifyCalculatorMetadata = Effect.fnUntraced(
  function* verifyCalculatorMetadata({
    websiteModules,
    website,
  }: {
    readonly websiteModules: NativePairBundles["websiteModules"];
    readonly website: NativePairHosts["website"];
  }) {
    yield* EffectFunction.pipe(
      ["first", "after idle"] as const,
      Effect.forEach((attempt) =>
        Effect.gen(function* () {
          if (attempt === "after idle") {
            yield* Effect.sleep("750 millis");
          }
          const catalogue = yield* HttpApiClient.make(TaxKitApi, {
            baseUrl: apiOrigin,
          }).pipe(
            Effect.flatMap((client) =>
              client.calculatorApi.listCalculators({
                query: MetadataQuery.make({}),
              })
            ),
            Effect.provide(FetchHttpClient.layer)
          );
          expect({
            calculatorCount: catalogue.calculators.length,
            calculatorIds: EffectFunction.pipe(
              catalogue.calculators,
              Array.map((value) => value.calculatorId),
              Array.sort(Order.String)
            ),
          }).toStrictEqual({
            calculatorCount: 3,
            calculatorIds: [
              "au.income-tax.annual",
              "au.pay.take-home",
              "au.pay.withholdings",
            ],
          });
        })
      )
    );
    // Exercise the seven additional checked calls against the real built Worker.
    yield* Effect.gen(function* () {
      const { calculatorApi } = yield* HttpApiClient.make(TaxKitApi, {
        baseUrl: apiOrigin,
      });
      const catalogue = yield* calculatorApi.listCalculators({
        query: MetadataQuery.make({}),
      });
      const pay = EffectFunction.pipe(
        catalogue.calculators,
        Array.findFirst(
          (calculator) => calculator.calculatorId === "au.pay.take-home"
        )
      ).pipe(
        Option.getOrElse(() => expect.fail("Missing retained calculator"))
      );
      const params = { calculatorId: pay.calculatorId };
      const calculator = yield* calculatorApi.getCalculator({
        params,
        query: HelpQuery.make({}),
      });
      const schema = yield* calculatorApi.getCalculatorSchema({
        params,
        query: HelpQuery.make({}),
      });
      const graph = yield* calculatorApi.getCalculatorGraph({
        params,
        query: MetadataQuery.make({}),
      });
      const filter = DescriptorFilterQuery.make({
        calculator: Option.some(pay.calculatorId),
      });
      const facts = yield* calculatorApi.listFacts({ query: filter });
      const rules = yield* calculatorApi.listRules({ query: filter });
      expect({
        calculator,
        schemaCalculator: schema.calculator,
        graphCalculator: graph.calculator,
        graphIssues: graph.validationIssues,
        hasInputFacts: schema.inputFacts.length > 0,
        hasEdges: graph.edges.length > 0,
        hasFacts: facts.facts.length > 0,
      }).toStrictEqual({
        calculator: pay,
        schemaCalculator: pay,
        graphCalculator: pay,
        graphIssues: [],
        hasInputFacts: true,
        hasEdges: true,
        hasFacts: true,
      });
      expect(rules.rules).toStrictEqual(
        expect.arrayContaining(Array.fromIterable(schema.rules))
      );
      expect({
        ruleCount: rules.rules.length,
        jurisdictions: yield* calculatorApi.getJurisdictions(),
        taxYears: yield* calculatorApi.getTaxYears({
          query: MetadataQuery.make({}),
        }),
      }).toStrictEqual({
        ruleCount: schema.rules.length,
        jurisdictions: {
          jurisdictions: [{ code: "AU", title: "Australia" }],
        },
        taxYears: {
          taxYears: [{ jurisdiction: "AU", taxYear: "2025-26" }],
        },
      });
    }).pipe(Effect.provide(FetchHttpClient.layer));
    expect({
      serverFunctionsAbsent: !EffectFunction.pipe(
        Record.values(websiteModules),
        Array.some((module) =>
          /"[a-f0-9]{64}":\s*\{\s*functionName:/u.test(module.contents)
        )
      ),
      serverFunctionHandlerAbsent: !EffectFunction.pipe(
        Record.values(websiteModules),
        Array.some((module) =>
          module.contents.includes("_createServerFn_handler")
        )
      ),
    }).toStrictEqual({
      serverFunctionsAbsent: true,
      serverFunctionHandlerAbsent: true,
    });
    yield* Effect.forEach(
      [
        { address: frameworkSentinel, method: "GET" },
        { address: "0".repeat(64), method: "GET" },
        {
          address: `${"0".repeat(64)}/${frameworkSentinel}`,
          method: "GET",
        },
        { address: "", method: "GET" },
        { address: "0".repeat(64), method: "POST" },
        { address: `0?payload=${frameworkSentinel}`, method: "GET" },
      ],
      (retired) =>
        Effect.gen(function* () {
          const response = yield* Effect.promise(() =>
            website.dispatchFetch(
              `${websiteOrigin}/_serverFn/${retired.address}`,
              {
                body: Match.value(retired).pipe(
                  Match.when({ method: "POST" }, () => frameworkSentinel),
                  Match.orElse(() => null)
                ),
                headers: {
                  "content-type": "application/json",
                  origin: websiteOrigin,
                  "sec-fetch-site": "same-origin",
                  "x-tsr-serverFn": "true",
                },
                method: retired.method,
              }
            )
          );
          expect(response.status, retired.address).toBe(404);
          expect({
            responseHeadersGetCacheControl:
              response.headers.get("cache-control"),
            EffectPromiseResponseText: yield* Effect.promise(() =>
              response.text()
            ),
          }).toStrictEqual({
            responseHeadersGetCacheControl: "no-store",
            EffectPromiseResponseText: "",
          });
        })
    );
  }
);
export const verifyServerRenderedCalculator = Effect.fnUntraced(
  function* verifyServerRenderedCalculator({
    publicApi,
    website,
  }: {
    readonly publicApi: NativePairHosts["publicApi"];
    readonly website: NativePairHosts["website"];
  }) {
    yield* Effect.logInfo("native-pair: initial page");
    const initial = yield* Effect.promise(() =>
      website.dispatchFetch(`${websiteOrigin}/`)
    );
    const initialHtml = yield* Effect.promise(() => initial.text());
    expect({
      status: initial.status,
      cacheControl: initial.headers.get("cache-control"),
      cloudflareCdnCacheControl: initial.headers.get(
        "cloudflare-cdn-cache-control"
      ),
    }).toStrictEqual({
      status: 200,
      cacheControl: publicCache.browser,
      cloudflareCdnCacheControl: publicCache.cdn,
    });
    // The first HTML seeds the browser's checked public settings; there is
    // no separate settings request.
    Array.forEach((marker: string) => {
      expect(initialHtml).toContain(marker);
    })([
      `apiOrigin:"${apiOrigin}/",publicationOrigin:"${websiteOrigin}/",websiteOrigin:"${websiteOrigin}/"`,
      "Pay before tax",
      'href="/calculators/au.pay.withholdings"',
      'href="/calculators/au.income-tax.annual"',
      'href="/agents"',
    ]);
    expect(initialHtml).not.toContain("Take-home pay:");
    // Calculators need JavaScript; the Website accepts no form POST.
    yield* Effect.forEach(
      [
        "/",
        "/calculators/au.pay.withholdings",
        "/calculators/au.income-tax.annual",
      ],
      (pathname) =>
        Effect.gen(function* () {
          const posted = yield* Effect.promise(() =>
            website.dispatchFetch(`${websiteOrigin}${pathname}`, {
              body: form,
              headers: {
                "content-type": "application/x-www-form-urlencoded",
              },
              method: "POST",
            })
          );
          expect(posted.status, pathname).toBe(404);
          expect({
            postedHeadersGetCacheControl: posted.headers.get("cache-control"),
            EffectPromisePostedText: yield* Effect.promise(() => posted.text()),
          }).toStrictEqual({
            postedHeadersGetCacheControl: "no-store",
            EffectPromisePostedText: "",
          });
        })
    );
    yield* Effect.forEach(
      ["/api/v2/calculators/au.pay.take-home/calculate"],
      (pathname) =>
        Effect.gen(function* () {
          const oversized = yield* Effect.promise(() =>
            publicApi.dispatchFetch(`${apiOrigin}${pathname}`, {
              body: "é".repeat(32_769),
              headers: {
                "content-type": "application/json",
                origin: websiteOrigin,
              },
              method: "POST",
            })
          );
          expect({
            status: oversized.status,
            accessControlAllowOrigin: oversized.headers.get(
              "access-control-allow-origin"
            ),
          }).toStrictEqual({
            status: 413,
            accessControlAllowOrigin: websiteOrigin,
          });
          const body = yield* Effect.promise(() => oversized.text());
          expect(
            yield* Schema.decodeEffect(
              Schema.fromJsonString(CalculatorRequestBodyErrorEnvelope)
            )(body)
          ).toStrictEqual({ error: new CalculatorRequestBodyTooLarge() });
          Array.forEach((marker: string) => {
            expect(body).not.toContain(marker);
          })(["PRIVATE9", "stack"]);
        })
    );
  }
);
