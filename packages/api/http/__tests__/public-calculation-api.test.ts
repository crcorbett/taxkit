import { describe, expect, it } from "@effect/vitest";
import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import { CalculatorOperationTimedOut } from "@taxkit/calculators/schemas";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { CalculationEngineLive } from "@taxkit/core";
import { aud } from "@taxkit/core/primitives";
import {
  AuPayCalculatorId,
  GrossPay,
  GrossPayDescriptor,
  TaxFreeThresholdClaimedDescriptor,
} from "@taxkit/rules-au-pay";
import {
  AuAnnualIncomeTaxCalculation,
  AuPayTakeHomeCalculation,
} from "@taxkit/sdk/au/effect";
import { calculateRunRequest as calculateSdkRunRequest } from "@taxkit/sdk/effect";
import { expectAt } from "@taxkit/testing";
import {
  Array,
  Cause,
  Effect,
  Exit,
  Layer,
  Match,
  Option,
  Schema,
} from "effect";
import {
  HttpClientRequest,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import { TaxKitApiInProcessClientLive } from "../src/client/server.layer.js";
import { TaxKitHttpApiService } from "../src/client/service.js";
import {
  CalculatorApiErrorEnvelope,
  CalculatorCatalogResponse,
  CalculatorRunResponse,
  CalculatorServiceError,
} from "../src/groups/calculators.js";
import { TaxKitApiRoutesLayer } from "../src/server.js";

const PublicCalculatorServiceTestLive = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);

const TestLive = Layer.mergeAll(
  TaxKitApiInProcessClientLive,
  PublicCalculatorServiceTestLive
);

const takeHomeCalculatorId = AuPayCalculatorId.make("au.pay.take-home");
const annualTaxCalculatorId = AuAnnualIncomeTaxCalculation.calculatorId;
const secretSentinel = "taxkit-secret-sentinel";
const privatePathSentinel = "/private/taxkit-sentinel/http-input.json";

const grossPayFacts = (
  cents: number,
  period: "fortnightly" | "monthly" | "weekly",
  taxFreeThresholdClaimed: boolean
) => ({
  grossPay: new GrossPay({ amount: aud(cents), period }),
  taxFreeThresholdClaimed,
});

describe("TaxKit public calculation HTTP API", () => {
  it.effect.each([
    "/api/v1/jurisdictions",
    "/api/v1/tax-years",
    "/api/v1/calculators",
    "/api/v1/calculators/au.pay.take-home",
    "/api/v1/calculators/au.pay.take-home/schema",
    "/api/v1/calculators/au.pay.take-home/graph",
    "/api/v1/facts",
    "/api/v1/rules",
  ])("declares and encodes a checked metadata timeout at %s", (pathname) =>
    Effect.gen(function* () {
      const live = yield* PublicCalculatorService;
      const service = Layer.succeed(
        PublicCalculatorService,
        PublicCalculatorService.of({
          ...live,
          getCalculator: () => Effect.fail(new CalculatorOperationTimedOut()),
          getCalculatorGraph: () =>
            Effect.fail(new CalculatorOperationTimedOut()),
          getCalculatorSchema: () =>
            Effect.fail(new CalculatorOperationTimedOut()),
          listCalculators: () => Effect.fail(new CalculatorOperationTimedOut()),
          listFacts: () => Effect.fail(new CalculatorOperationTimedOut()),
          listJurisdictions: () =>
            Effect.fail(new CalculatorOperationTimedOut()),
          listRules: () => Effect.fail(new CalculatorOperationTimedOut()),
          listTaxYears: () => Effect.fail(new CalculatorOperationTimedOut()),
        })
      );
      // HttpApiBuilder captures services while constructing handlers. Supply
      // the controlled implementation there, rather than a later request override.
      const handler = yield* HttpRouter.toHttpEffect(TaxKitApiRoutesLayer).pipe(
        Effect.provide(service)
      );
      const request = HttpClientRequest.get(
        `http://taxkit.internal${pathname}`
      );
      const response = yield* handler.pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromClientRequest(request)
        )
      );
      expect(response.status).toBe(504);
      expect(
        yield* Schema.decodeUnknownEffect(CalculatorApiErrorEnvelope)(
          yield* HttpServerResponse.toClientResponse(response, { request }).json
        )
      ).toEqual({ error: new CalculatorOperationTimedOut() });
    }).pipe(Effect.provide(PublicCalculatorServiceTestLive), Effect.scoped)
  );

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
          jurisdiction: AuPayTakeHomeCalculation.jurisdiction,
          taxYear: AuPayTakeHomeCalculation.taxYear,
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
            jurisdiction: AuPayTakeHomeCalculation.jurisdiction,
            taxYear: AuPayTakeHomeCalculation.taxYear,
          },
        }
      );
      const decoded = yield* Schema.decodeUnknownEffect(CalculatorRunResponse)(
        response
      );

      const takeHomeReport = Match.value(response.report).pipe(
        Match.tag("TakeHomePayReport", (report) => report),
        Match.orElse(() => expect.fail("Expected take-home report"))
      );
      expect(response.calculator.calculatorId).toBe("au.pay.take-home");
      expect(response.report._tag).toBe("TakeHomePayReport");
      expect(takeHomeReport.rulePackVersion).toBe("rules-au-pay/1.0.0");
      expect(decoded).toEqual(sdkResponse);
      expect(response).toEqual(sdkResponse);
      expect(takeHomeReport.withholdingsTotal.cents).toBe(75_600);
      expect(takeHomeReport.netPay.cents).toBe(270_600);
      expect(response.diagnostics.graphIssues.length).toBe(0);

      const annualTaxResponse = yield* client.calculatorApi.calculate({
        params: {
          calculatorId: annualTaxCalculatorId,
        },
        payload: {
          facts: { taxableIncome: aud(9_000_000) },
          jurisdiction: AuPayTakeHomeCalculation.jurisdiction,
          taxYear: AuPayTakeHomeCalculation.taxYear,
        },
        query: {},
      });

      const annualReport = Match.value(annualTaxResponse.report).pipe(
        Match.tag("AnnualTaxReport", (report) => report),
        Match.orElse(() => expect.fail("Expected annual tax report"))
      );
      expect(annualTaxResponse.report._tag).toBe("AnnualTaxReport");
      expect(annualReport.rulePackVersion).toBe("rules-au-income-tax/1.0.0");
    }).pipe(Effect.provide(TestLive))
  );

  it.effect(
    "returns typed calculator input errors through the HTTP client",
    () =>
      Effect.gen(function* () {
        const client = yield* TaxKitHttpApiService;
        const service = yield* PublicCalculatorService;
        const invalidFacts = {
          rejectedSource: `${secretSentinel}:${privatePathSentinel}`,
          taxableIncome: aud(9_000_000),
        };
        const exit = yield* client.calculatorApi
          .calculate({
            params: {
              calculatorId: takeHomeCalculatorId,
            },
            payload: {
              facts: invalidFacts,
              jurisdiction: AuPayTakeHomeCalculation.jurisdiction,
              taxYear: AuPayTakeHomeCalculation.taxYear,
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
              jurisdiction: AuPayTakeHomeCalculation.jurisdiction,
              taxYear: AuPayTakeHomeCalculation.taxYear,
            },
          }
        ).pipe(Effect.exit);
        const serviceExit = yield* service
          .calculate({
            calculatorId: takeHomeCalculatorId,
            help: "errors",
            payload: {
              facts: invalidFacts,
              jurisdiction: AuPayTakeHomeCalculation.jurisdiction,
              taxYear: AuPayTakeHomeCalculation.taxYear,
            },
          })
          .pipe(Effect.exit);

        const httpCause = yield* Exit.match(exit, {
          onFailure: Effect.succeed,
          onSuccess: () =>
            Effect.die(
              new Error("Expected the HTTP calculate fixture to fail")
            ),
        });
        const sdkCause = yield* Exit.match(sdkExit, {
          onFailure: Effect.succeed,
          onSuccess: () =>
            Effect.die(new Error("Expected the SDK calculate fixture to fail")),
        });
        const serviceCause = yield* Exit.match(serviceExit, {
          onFailure: Effect.succeed,
          onSuccess: () =>
            Effect.die(
              new Error("Expected the calculator service fixture to fail")
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
        const decodedCalculatorError = yield* Schema.decodeUnknownEffect(
          CalculatorServiceError
        )(envelope.error);
        const calculatorError = Match.value(decodedCalculatorError).pipe(
          Match.tag("CalculatorInputDecodeError", (error) => error),
          Match.orElse(() => expect.fail("Expected calculator input error"))
        );
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
        expect(expectAt(calculatorError.issues, 0).message).toBe(
          "Invalid calculator input value"
        );
        expect(expectAt(inputHelp, 0).factId).toBe(GrossPayDescriptor.id);
        const serializedEnvelope = yield* Schema.encodeEffect(
          Schema.fromJsonString(CalculatorApiErrorEnvelope)
        )(envelope);
        expect(serializedEnvelope).not.toContain(secretSentinel);
        expect(serializedEnvelope).not.toContain(privatePathSentinel);
      }).pipe(Effect.provide(TestLive))
  );
});
