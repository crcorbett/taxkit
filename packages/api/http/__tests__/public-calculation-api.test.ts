import { describe, expect, it } from "@effect/vitest";
import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { CalculationEngineLive } from "@taxkit/core";
import { aud } from "@taxkit/core/primitives";
import {
  AuPayCalculatorId,
  GrossPay,
  GrossPayDescriptor,
  TaxFreeThresholdClaimedDescriptor,
} from "@taxkit/rules-au-pay";
import { AuPayTakeHomeCalculation } from "@taxkit/sdk/au/effect";
import { calculateRunRequest as calculateSdkRunRequest } from "@taxkit/sdk/effect";
import { expectAt } from "@taxkit/testing";
import { Array, Cause, Effect, Exit, Layer, Option, Schema } from "effect";

import { TaxKitApiInProcessClientLive } from "../src/client/server.layer.js";
import { TaxKitHttpApiService } from "../src/client/service.js";
import {
  CalculatorApiErrorEnvelope,
  CalculatorCatalogResponse,
  CalculatorRunResponse,
  CalculatorServiceError,
} from "../src/groups/calculators.js";

const PublicCalculatorServiceTestLive = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);

const TestLive = Layer.mergeAll(
  TaxKitApiInProcessClientLive,
  PublicCalculatorServiceTestLive
);

const takeHomeCalculatorId = AuPayCalculatorId.make("au.pay.take-home");

const grossPayFacts = (
  cents: number,
  period: "fortnightly" | "monthly" | "weekly",
  taxFreeThresholdClaimed: boolean
) => ({
  grossPay: new GrossPay({ amount: aud(cents), period }),
  taxFreeThresholdClaimed,
});

describe("TaxKit public calculation HTTP API", () => {
  it.effect("pins the health route fixture", () =>
    Effect.gen(function* () {
      const client = yield* TaxKitHttpApiService;
      const response = yield* client.health.getHealth();

      expect(response).toEqual({
        service: "taxkit",
        status: "ok",
      });
    }).pipe(Effect.provide(TestLive))
  );

  it.effect(
    "pins calculator metadata against the calculator service contract",
    () =>
      Effect.gen(function* () {
        const client = yield* TaxKitHttpApiService;
        const service = yield* PublicCalculatorService;
        const query = {
          jurisdiction: AuPayTakeHomeCalculation.jurisdiction,
          taxYear: AuPayTakeHomeCalculation.taxYear,
        };
        const response = yield* client.calculatorApi.listCalculators({
          query,
        });
        const serviceResponse = yield* service.listCalculators(query);
        const decoded = yield* Schema.decodeUnknownEffect(
          CalculatorCatalogResponse
        )(response);
        const takeHomeCalculator = expectAt(
          Array.filter(
            response.calculators,
            (calculator) => calculator.calculatorId === takeHomeCalculatorId
          ),
          0
        );

        expect(decoded).toEqual(serviceResponse);
        expect(takeHomeCalculator.calculatorId).toBe(takeHomeCalculatorId);
        expect(takeHomeCalculator.context).toEqual(query);
        expect(takeHomeCalculator.inputFactIds).toEqual([
          GrossPayDescriptor.id,
          TaxFreeThresholdClaimedDescriptor.id,
        ]);
        expect(takeHomeCalculator.reportSchemaName).toBe("TakeHomePayReport");
      }).pipe(Effect.provide(TestLive))
  );

  it.effect("pins calculate success through SDK full-run parity", () =>
    Effect.gen(function* () {
      const client = yield* TaxKitHttpApiService;
      const facts = grossPayFacts(346_200, "fortnightly", true);
      const response = yield* client.calculatorApi.calculate({
        params: {
          calculatorId: takeHomeCalculatorId,
        },
        payload: {
          facts,
          jurisdiction: "AU",
          taxYear: "2025-26",
        },
        query: {
          help: "errors",
        },
      });
      const sdkResponse = yield* calculateSdkRunRequest(
        AuPayTakeHomeCalculation,
        {
          payload: {
            facts,
            jurisdiction: "AU",
            taxYear: "2025-26",
          },
        }
      );
      const decoded = yield* Schema.decodeUnknownEffect(CalculatorRunResponse)(
        response
      );

      expect(response.calculator.calculatorId).toBe("au.pay.take-home");
      expect(response.report._tag).toBe("TakeHomePayReport");
      expect(decoded).toEqual(sdkResponse);
      expect(response).toEqual(sdkResponse);
      expect(response.report.withholdingsTotal.cents).toBe(75_600);
      expect(response.report.netPay.cents).toBe(270_600);
      expect(response.diagnostics.graphIssues.length).toBe(0);
    }).pipe(Effect.provide(TestLive))
  );

  it.effect(
    "returns typed calculator input errors through the HTTP client",
    () =>
      Effect.gen(function* () {
        const client = yield* TaxKitHttpApiService;
        const service = yield* PublicCalculatorService;
        const invalidFacts = {
          taxableIncome: aud(9_000_000),
        };
        const exit = yield* client.calculatorApi
          .calculate({
            params: {
              calculatorId: takeHomeCalculatorId,
            },
            payload: {
              facts: invalidFacts,
              jurisdiction: "AU",
              taxYear: "2025-26",
            },
            query: {
              help: "errors",
            },
          })
          .pipe(Effect.exit);
        const sdkExit = yield* calculateSdkRunRequest(
          AuPayTakeHomeCalculation,
          {
            help: "errors",
            payload: {
              // @ts-expect-error runtime parity covers invalid external input after the typed boundary is bypassed.
              facts: invalidFacts,
              jurisdiction: "AU",
              taxYear: "2025-26",
            },
          }
        ).pipe(Effect.exit);
        const serviceExit = yield* service
          .calculate({
            calculatorId: takeHomeCalculatorId,
            help: "errors",
            payload: {
              facts: invalidFacts,
              jurisdiction: "AU",
              taxYear: "2025-26",
            },
          })
          .pipe(Effect.exit);

        const httpCause = yield* Exit.match(exit, {
          onFailure: Effect.succeed,
          onSuccess: () =>
            Effect.dieMessage("Expected the HTTP calculate fixture to fail"),
        });
        const sdkCause = yield* Exit.match(sdkExit, {
          onFailure: Effect.succeed,
          onSuccess: () =>
            Effect.dieMessage("Expected the SDK calculate fixture to fail"),
        });
        const serviceCause = yield* Exit.match(serviceExit, {
          onFailure: Effect.succeed,
          onSuccess: () =>
            Effect.dieMessage(
              "Expected the calculator service fixture to fail"
            ),
        });
        const failure = expectAt(
          Array.filter(httpCause.reasons, Cause.isFailReason),
          0
        );
        const sdkFailure = expectAt(
          Array.filter(sdkCause.reasons, Cause.isFailReason),
          0
        );
        const serviceFailure = expectAt(
          Array.filter(serviceCause.reasons, Cause.isFailReason),
          0
        );
        const envelope = yield* Schema.decodeUnknownEffect(
          CalculatorApiErrorEnvelope
        )(failure.error);
        const calculatorError = yield* Schema.decodeUnknownEffect(
          CalculatorServiceError
        )(envelope.error);
        const inputHelp = Option.fromNullishOr(calculatorError.help).pipe(
          Option.match({
            onNone: Array.empty,
            onSome: (help) => help,
          })
        );

        expect(Exit.isFailure(exit)).toBe(true);
        expect(Exit.isFailure(sdkExit)).toBe(true);
        expect(Exit.isFailure(serviceExit)).toBe(true);
        expect(calculatorError).toEqual(sdkFailure.error);
        expect(calculatorError).toEqual(serviceFailure.error);
        expect(calculatorError._tag).toBe("CalculatorInputDecodeError");
        expect(expectAt(calculatorError.issues, 0).path).toEqual(["grossPay"]);
        expect(expectAt(inputHelp, 0).factId).toBe(GrossPayDescriptor.id);
      }).pipe(Effect.provide(TestLive))
  );
});
