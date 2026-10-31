import { assert, describe, it } from "@effect/vitest";
import { AuPayCalculatorId } from "@taxkit/rules-au-pay/schemas";
import {
  Function as EffectFunction,
  Array,
  Effect,
  Option,
  Record,
  Schema,
} from "effect";
import { OpenApi } from "effect/http-api";

import { TaxKitApi } from "../src/api.js";
import {
  ApiDataPath,
  isPublicReadApiPath,
  ApiReferencePath,
  CalculatorApiPath,
  CalculationPath,
  DiscoveryPath,
  DocsApiPath,
  DocsDiscoveryApiPath,
  HealthPath,
  McpRoutePath,
  discoveryApiPath,
  healthPath,
} from "../src/routes.js";

const calculator = AuPayCalculatorId.make("au.pay.take-home");
describe("transport route catalogue", () => {
  it.effect(
    "covers every native OpenAPI endpoint and derives cache eligibility",
    () =>
      Effect.forEach(
        Record.toEntries(OpenApi.fromApi(TaxKitApi).paths),
        ([template, methods]) =>
          Effect.sync(() => {
            const path = template.replaceAll("{calculatorId}", calculator);
            // An unfamiliar parameter must gain its own checked fixture here.
            assert.notInclude(path, "{");
            assert.isTrue(Schema.is(ApiDataPath)(path), path);
            assert.equal(
              EffectFunction.pipe(
                [HealthPath, CalculatorApiPath, DocsApiPath],
                Array.filter((family) => Schema.is(family)(path))
              ).length,
              1,
              path
            );
            assert.equal(
              isPublicReadApiPath(path),
              Option.isSome(Option.fromNullishOr(methods.get)) &&
                path !== healthPath,
              path
            );
          })
      )
  );
  it.effect(
    "keeps discovery and reference reads in their own public families",
    () =>
      EffectFunction.pipe(
        DiscoveryPath.literals,
        Effect.forEach((path) =>
          Effect.sync(() => {
            const apiPath = discoveryApiPath(path);
            assert.isTrue(Schema.is(DocsDiscoveryApiPath)(apiPath));
            assert.isTrue(isPublicReadApiPath(apiPath));
            assert.isFalse(Schema.is(ApiDataPath)(apiPath));
            assert.isFalse(Schema.is(ApiReferencePath)(apiPath));
          })
        )
      )
  );
  it.effect(
    "refuses unknown calculator identifiers and suffixes for public cache",
    () =>
      Effect.forEach(
        [
          "/api/v1/calculators/unknown",
          "/api/v1/calculators/unknown/schema",
          "/api/v1/calculators/au.pay.take-home/private",
          "/api/v1/calculators/au.pay.take-home/schema/extra",
          "/api/v1/docs/discovery/unknown.txt",
          "/api/v1/docs/markdown/extra",
          "/mcp",
        ],
        (path) =>
          Effect.sync(() => {
            assert.isFalse(isPublicReadApiPath(path), path);
          })
      )
  );

  it("admits only the checked calculation endpoint and the MCP address", () => {
    const path = `/api/v1/calculators/${calculator}/calculate`;
    assert.isTrue(Schema.is(CalculationPath)(path));
    assert.isFalse(
      Schema.is(CalculationPath)("/api/v1/calculators/unknown/calculate")
    );
    assert.isTrue(Schema.is(McpRoutePath)("/mcp/session"));
    assert.isFalse(Schema.is(McpRoutePath)("/mcpo"));
  });
});
