import { assert, describe, it } from "@effect/vitest";
import { AuPayCalculatorId } from "@taxkit/rules-au-pay/schemas";
import { Array, Effect, Option, Record, Schema } from "effect";
import { OpenApi } from "effect/http-api";

import { TaxKitApi } from "../src/api.js";
import { isPublicReadPath } from "../src/response-policy.js";
import {
  ApiDataPath,
  ApiReferencePath,
  CalculatorApiPath,
  CalculationPath,
  DiscoveryPath,
  DocsApiPath,
  DocsDiscoveryApiPath,
  HealthPath,
  McpRoutePath,
  RpcRoutePath,
  discoveryApiPath,
  healthPath,
  isTrustedCalculationPath,
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
              Array.filter(
                [HealthPath, CalculatorApiPath, DocsApiPath],
                (family) => Schema.is(family)(path)
              ).length,
              1,
              path
            );
            assert.equal(
              isPublicReadPath(path),
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
      Effect.forEach(DiscoveryPath.literals, (path) =>
        Effect.sync(() => {
          const apiPath = discoveryApiPath(path);
          assert.isTrue(Schema.is(DocsDiscoveryApiPath)(apiPath));
          assert.isTrue(isPublicReadPath(apiPath));
          assert.isFalse(Schema.is(ApiDataPath)(apiPath));
          assert.isFalse(Schema.is(ApiReferencePath)(apiPath));
        })
      )
  );

  it.effect(
    "refuses unknown calculator identifiers and suffixes for public cache and trusted admission",
    () =>
      Effect.forEach(
        [
          "/api/v1/calculators/unknown",
          "/api/v1/calculators/unknown/schema",
          "/api/v1/calculators/au.pay.take-home/private",
          "/api/v1/calculators/au.pay.take-home/schema/extra",
          "/api/v1/docs/discovery/unknown.txt",
          "/api/v1/docs/markdown/extra",
          "/rpc/extra",
          "/mcp",
        ],
        (path) =>
          Effect.sync(() => {
            assert.isFalse(isPublicReadPath(path), path);
            assert.isFalse(isTrustedCalculationPath(path), path);
          })
      )
  );

  it("admits only the checked calculation endpoint and exact native RPC address", () => {
    const path = `/api/v1/calculators/${calculator}/calculate`;
    assert.isTrue(Schema.is(CalculationPath)(path));
    assert.isTrue(isTrustedCalculationPath(path));
    assert.isTrue(isTrustedCalculationPath("/rpc"));
    assert.isFalse(
      isTrustedCalculationPath("/api/v1/calculators/unknown/calculate")
    );
    assert.isTrue(Schema.is(RpcRoutePath)("/rpc"));
    assert.isTrue(Schema.is(McpRoutePath)("/mcp/session"));
    assert.isFalse(Schema.is(McpRoutePath)("/mcpo"));
  });
});
