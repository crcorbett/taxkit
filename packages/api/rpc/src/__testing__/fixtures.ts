import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import {
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
  CalculatorRunServiceRequest,
  DescriptorFilterQuery,
  GetCalculatorGraphRequest,
  GetCalculatorRequest,
  MetadataQuery,
  CalculatorInputDecodeError,
  CalculatorInputIssue,
} from "@taxkit/calculators/schemas";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { CalculationEngineLive } from "@taxkit/core";
import { aud } from "@taxkit/core/primitives";
import { AuPayCalculatorId, GrossPay } from "@taxkit/rules-au-pay";
import { Cause, Effect, Layer, Match } from "effect";
import type { RpcClient, RpcClientError } from "effect/rpc";

import type { TaxKitRpcGroup } from "../group.js";
import type { TaxKitRpcClient } from "../service.js";

export const sensitiveSentinel =
  "private-rpc-sentinel-/private/source?credential=hidden";
export const CalculationRequest = CalculatorRunServiceRequest.make({
  calculatorId: AuPayCalculatorId.make("au.pay.take-home"),
  payload: {
    facts: {
      grossPay: new GrossPay({ amount: aud(165_400), period: "weekly" }),
      taxFreeThresholdClaimed: true,
    },
  },
});

export const CalculatorLive = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);

export const CalculatorFixture = (
  mode: "success" | "expected" | "defect" | "mixed" | "capacity" | "timeout"
) =>
  Layer.effect(
    PublicCalculatorService,
    Effect.gen(function* () {
      const calculator = yield* PublicCalculatorService;
      const inputFailure = new CalculatorInputDecodeError({
        issues: [
          new CalculatorInputIssue({
            message: sensitiveSentinel,
            path: [sensitiveSentinel],
          }),
        ],
        message: sensitiveSentinel,
      });
      const metadataDefect = Effect.die({
        cause: sensitiveSentinel,
        message: sensitiveSentinel,
      });
      const metadataInterruptedDefect = Effect.failCause(
        Cause.combine(Cause.die(sensitiveSentinel), Cause.interrupt())
      );
      return PublicCalculatorService.of({
        ...calculator,
        calculate: (request) =>
          Match.value(mode).pipe(
            Match.when("capacity", () =>
              Effect.fail(new CalculatorCapacityExceeded())
            ),
            Match.when("timeout", () =>
              Effect.fail(new CalculatorOperationTimedOut())
            ),
            Match.when("success", () => calculator.calculate(request)),
            Match.when("expected", () => Effect.fail(inputFailure)),
            Match.when("defect", () =>
              Effect.die({
                cause: sensitiveSentinel,
                message: sensitiveSentinel,
              })
            ),
            Match.when("mixed", () =>
              Effect.failCause(
                Cause.combine(Cause.die(sensitiveSentinel), Cause.interrupt())
              )
            ),
            Match.exhaustive
          ),
        getCalculator: (request) =>
          Match.value(mode).pipe(
            Match.when("expected", () => Effect.fail(inputFailure)),
            Match.when("defect", () => metadataDefect),
            Match.when("mixed", () => metadataInterruptedDefect),
            Match.orElse(() => calculator.getCalculator(request))
          ),
        getCalculatorGraph: (request) =>
          Match.value(mode).pipe(
            Match.when("expected", () => Effect.fail(inputFailure)),
            Match.when("defect", () => metadataDefect),
            Match.when("mixed", () => metadataInterruptedDefect),
            Match.orElse(() => calculator.getCalculatorGraph(request))
          ),
        getCalculatorSchema: (request) =>
          Match.value(mode).pipe(
            Match.when("expected", () => Effect.fail(inputFailure)),
            Match.when("defect", () => metadataDefect),
            Match.when("mixed", () => metadataInterruptedDefect),
            Match.orElse(() => calculator.getCalculatorSchema(request))
          ),
        listCalculators: (query) =>
          Match.value(mode).pipe(
            Match.when("defect", () => metadataDefect),
            Match.when("mixed", () => metadataInterruptedDefect),
            Match.orElse(() => calculator.listCalculators(query))
          ),
        listFacts: (query) =>
          Match.value(mode).pipe(
            Match.when("defect", () => metadataDefect),
            Match.when("mixed", () => metadataInterruptedDefect),
            Match.orElse(() => calculator.listFacts(query))
          ),
        listJurisdictions: () =>
          Match.value(mode).pipe(
            Match.when("defect", () => metadataDefect),
            Match.when("mixed", () => metadataInterruptedDefect),
            Match.orElse(() => calculator.listJurisdictions())
          ),
        listRules: (query) =>
          Match.value(mode).pipe(
            Match.when("defect", () => metadataDefect),
            Match.when("mixed", () => metadataInterruptedDefect),
            Match.orElse(() => calculator.listRules(query))
          ),
        listTaxYears: (query) =>
          Match.value(mode).pipe(
            Match.when("defect", () => metadataDefect),
            Match.when("mixed", () => metadataInterruptedDefect),
            Match.orElse(() => calculator.listTaxYears(query))
          ),
      });
    })
  ).pipe(Layer.provide(CalculatorLive));

// Closed named calls for common transport/lifetime and revision tests.
export const CalculatorRpcOperationCases = [
  {
    invoke: (client: TaxKitRpcClient["Service"]) =>
      client.calculate(CalculationRequest).pipe(Effect.asVoid),
    nativeInvoke: (
      client: RpcClient.FromGroup<
        typeof TaxKitRpcGroup,
        RpcClientError.RpcClientError
      >,
      version: string
    ) =>
      client
        .Calculate({ request: CalculationRequest, version })
        .pipe(Effect.asVoid),
    operation: "calculate",
  },
  {
    invoke: (client: TaxKitRpcClient["Service"]) =>
      client
        .getCalculator(
          GetCalculatorRequest.make({
            calculatorId: CalculationRequest.calculatorId,
          })
        )
        .pipe(Effect.asVoid),
    nativeInvoke: (
      client: RpcClient.FromGroup<
        typeof TaxKitRpcGroup,
        RpcClientError.RpcClientError
      >,
      version: string
    ) =>
      client
        .GetCalculator({
          request: GetCalculatorRequest.make({
            calculatorId: CalculationRequest.calculatorId,
          }),
          version,
        })
        .pipe(Effect.asVoid),
    operation: "getCalculator",
  },
  {
    invoke: (client: TaxKitRpcClient["Service"]) =>
      client
        .getCalculatorGraph(
          GetCalculatorGraphRequest.make({
            calculatorId: CalculationRequest.calculatorId,
          })
        )
        .pipe(Effect.asVoid),
    nativeInvoke: (
      client: RpcClient.FromGroup<
        typeof TaxKitRpcGroup,
        RpcClientError.RpcClientError
      >,
      version: string
    ) =>
      client
        .GetCalculatorGraph({
          request: GetCalculatorGraphRequest.make({
            calculatorId: CalculationRequest.calculatorId,
          }),
          version,
        })
        .pipe(Effect.asVoid),
    operation: "getCalculatorGraph",
  },
  {
    invoke: (client: TaxKitRpcClient["Service"]) =>
      client
        .getCalculatorSchema(
          GetCalculatorRequest.make({
            calculatorId: CalculationRequest.calculatorId,
          })
        )
        .pipe(Effect.asVoid),
    nativeInvoke: (
      client: RpcClient.FromGroup<
        typeof TaxKitRpcGroup,
        RpcClientError.RpcClientError
      >,
      version: string
    ) =>
      client
        .GetCalculatorSchema({
          request: GetCalculatorRequest.make({
            calculatorId: CalculationRequest.calculatorId,
          }),
          version,
        })
        .pipe(Effect.asVoid),
    operation: "getCalculatorSchema",
  },
  {
    invoke: (client: TaxKitRpcClient["Service"]) =>
      client.listCalculators(MetadataQuery.make({})).pipe(Effect.asVoid),
    nativeInvoke: (
      client: RpcClient.FromGroup<
        typeof TaxKitRpcGroup,
        RpcClientError.RpcClientError
      >,
      version: string
    ) =>
      client
        .ListCalculators({ query: MetadataQuery.make({}), version })
        .pipe(Effect.asVoid),
    operation: "listCalculators",
  },
  {
    invoke: (client: TaxKitRpcClient["Service"]) =>
      client
        .listFacts(
          DescriptorFilterQuery.make({
            calculator: CalculationRequest.calculatorId,
          })
        )
        .pipe(Effect.asVoid),
    nativeInvoke: (
      client: RpcClient.FromGroup<
        typeof TaxKitRpcGroup,
        RpcClientError.RpcClientError
      >,
      version: string
    ) =>
      client
        .ListFacts({
          query: DescriptorFilterQuery.make({
            calculator: CalculationRequest.calculatorId,
          }),
          version,
        })
        .pipe(Effect.asVoid),
    operation: "listFacts",
  },
  {
    invoke: (client: TaxKitRpcClient["Service"]) =>
      client.listJurisdictions().pipe(Effect.asVoid),
    nativeInvoke: (
      client: RpcClient.FromGroup<
        typeof TaxKitRpcGroup,
        RpcClientError.RpcClientError
      >,
      version: string
    ) => client.ListJurisdictions({ version }).pipe(Effect.asVoid),
    operation: "listJurisdictions",
  },
  {
    invoke: (client: TaxKitRpcClient["Service"]) =>
      client
        .listRules(
          DescriptorFilterQuery.make({
            calculator: CalculationRequest.calculatorId,
          })
        )
        .pipe(Effect.asVoid),
    nativeInvoke: (
      client: RpcClient.FromGroup<
        typeof TaxKitRpcGroup,
        RpcClientError.RpcClientError
      >,
      version: string
    ) =>
      client
        .ListRules({
          query: DescriptorFilterQuery.make({
            calculator: CalculationRequest.calculatorId,
          }),
          version,
        })
        .pipe(Effect.asVoid),
    operation: "listRules",
  },
  {
    invoke: (client: TaxKitRpcClient["Service"]) =>
      client.listTaxYears(MetadataQuery.make({})).pipe(Effect.asVoid),
    nativeInvoke: (
      client: RpcClient.FromGroup<
        typeof TaxKitRpcGroup,
        RpcClientError.RpcClientError
      >,
      version: string
    ) =>
      client
        .ListTaxYears({ query: MetadataQuery.make({}), version })
        .pipe(Effect.asVoid),
    operation: "listTaxYears",
  },
] as const;
