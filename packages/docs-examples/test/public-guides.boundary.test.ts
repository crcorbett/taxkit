import { expect, it } from "@effect/vitest";
import { TaxKitApiInProcessClientLive } from "@taxkit/api-http/client/server";
import { ContentServiceLive } from "@taxkit/content/live";
import { ContentCatalogue } from "@taxkit/content/service";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import { Effect, Layer } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import { readCalculatorError } from "../src/api-error-envelope.js";
import { loadCalculatorHelp } from "../src/calculator-help.js";
import { invalidInput, validInput } from "../src/validate-external-input.js";

it.effect(
  "rejects external annual facts before calling the pay calculator",
  () =>
    Effect.gen(function* () {
      expect((yield* invalidInput.pipe(Effect.flip))._tag).toBe("SchemaError");
      const report = yield* validInput;
      expect(report._tag).toBe("TakeHomePayReport");
      expect(report.netPay.cents).toBe(130_100);
    })
);

it.effect(
  "checks an actual raw error response and rejects an unrelated envelope",
  () =>
    Effect.gen(function* () {
      const request = HttpClientRequest.post("https://example.test/calculate");
      const response = HttpClientResponse.fromWeb(
        request,
        new Response(
          '{"error":{"_tag":"CalculatorInputDecodeError","calculatorId":"au.pay.take-home","message":"Invalid facts for au.pay.take-home","issues":[]}}',
          { headers: { "content-type": "application/json" }, status: 400 }
        )
      );
      expect((yield* readCalculatorError(response)).error._tag).toBe(
        "CalculatorInputDecodeError"
      );
      const unrelated = HttpClientResponse.fromWeb(
        request,
        new Response('{"private":"unrelated-response"}', {
          headers: { "content-type": "application/json" },
          status: 400,
        })
      );
      expect(
        (yield* readCalculatorError(unrelated).pipe(Effect.flip))._tag
      ).toBe("SchemaError");
    })
);

it.effect(
  "uses the real HTTP route and checked descriptor fields for calculator help",
  () =>
    Effect.gen(function* () {
      const labels = yield* loadCalculatorHelp.pipe(
        Effect.provide(
          TaxKitApiInProcessClientLive.pipe(
            Layer.provide(
              ContentServiceLive.pipe(
                Layer.provide(
                  Layer.effect(ContentCatalogue, exampleContentCatalogue)
                )
              )
            )
          )
        )
      );
      expect(labels).toContain(
        "taxkit/rules-au-pay/fact/GrossPay: Gross pay for a single pay period"
      );
      expect(labels).toContain(
        "taxkit/rules-au-pay/fact/TaxFreeThresholdClaimed: Whether the employee has claimed the tax-free threshold"
      );
    })
);
