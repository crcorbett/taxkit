import { expect, it } from "@effect/vitest";
import { TaxKitApiInProcessLive } from "@taxkit/api-http/in-process";
import { ContentServiceLive } from "@taxkit/content/live";
import { ContentCatalogue } from "@taxkit/content/service";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import { Predicate, Function as EffectFunction, Effect, Layer } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import { readCalculatorError } from "../src/api-error-envelope.js";
import { loadCalculatorHelp } from "../src/calculator-help.js";
import { invalidInput, validInput } from "../src/validate-external-input.js";

it.effect(
  "rejects external annual facts before calling the pay calculator",
  () =>
    Effect.gen(function* () {
      EffectFunction.pipe(
        Predicate.isTagged(
          yield* invalidInput.pipe(Effect.flip),
          "SchemaError"
        ),
        (matches) => {
          expect(matches).toBeTruthy();
        }
      );
      const report = yield* validInput;
      EffectFunction.pipe(
        Predicate.isTagged(report, "TakeHomePayReport"),
        (matches) => {
          expect(matches).toBeTruthy();
        }
      );
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
      EffectFunction.pipe(
        Predicate.isTagged(
          (yield* readCalculatorError(response)).error,
          "CalculatorInputDecodeError"
        ),
        (matches) => {
          expect(matches).toBeTruthy();
        }
      );
      const unrelated = HttpClientResponse.fromWeb(
        request,
        new Response('{"private":"unrelated-response"}', {
          headers: { "content-type": "application/json" },
          status: 400,
        })
      );
      EffectFunction.pipe(
        Predicate.isTagged(
          yield* readCalculatorError(unrelated).pipe(Effect.flip),
          "SchemaError"
        ),
        (matches) => {
          expect(matches).toBeTruthy();
        }
      );
    })
);
it.effect(
  "uses the real HTTP route and checked descriptor fields for calculator help",
  () =>
    Effect.gen(function* () {
      const labels = yield* loadCalculatorHelp(
        new URL("http://taxkit.internal")
      ).pipe(
        Effect.provide(
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
      );
      expect(labels).toContain(
        "taxkit/rules-au-pay/fact/GrossPay: Gross pay for a single pay period"
      );
      expect(labels).toContain(
        "taxkit/rules-au-pay/fact/TaxFreeThresholdClaimed: Whether the employee has claimed the tax-free threshold"
      );
    })
);
