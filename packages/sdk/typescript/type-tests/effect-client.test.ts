import type { CalculatorServiceError } from "@taxkit/calculators/schemas";
import { Money, Cents } from "@taxkit/core/primitives";
import {
  AuPayJurisdiction,
  AuPayTaxYear,
  GrossPay,
} from "@taxkit/rules-au-pay";
import type { TakeHomePayReport } from "@taxkit/rules-au-pay";
import { Option } from "effect";
import type { Effect, Schema } from "effect";

import {
  calculateRunRequest,
  calculateReportRequest,
  createClient,
  defineSdkCalculation,
} from "../src/effect.js";
import type {
  SdkCalculatorRunResponse,
  TaxKitEffectRequirements,
} from "../src/effect.js";
import {
  AuAnnualIncomeTaxCalculation,
  AuIncomeTax2025_26Module,
  AuPay2025_26Module,
  AuPayTakeHomeCalculation,
} from "../src/testing/index.js";

const payClient = createClient(AuPay2025_26Module);
const fullClient = createClient(AuPay2025_26Module, AuIncomeTax2025_26Module);

const _payReport = payClient.calculations.calculateReport(
  AuPayTakeHomeCalculation,
  {
    grossPay: new GrossPay({
      amount: new Money({ cents: Cents.make(165_400), currency: "AUD" }),
      period: "weekly",
    }),
    taxFreeThresholdClaimed: true,
  }
);

const _annualReport = fullClient.calculations.calculateReport(
  AuAnnualIncomeTaxCalculation,
  {
    taxableIncome: new Money({ cents: Cents.make(9_000_000), currency: "AUD" }),
  }
);
const _fullRun: Effect.Effect<
  SdkCalculatorRunResponse<TakeHomePayReport>,
  CalculatorServiceError | Schema.SchemaError,
  TaxKitEffectRequirements
> = calculateRunRequest(AuPayTakeHomeCalculation, {
  payload: {
    facts: {
      grossPay: new GrossPay({
        amount: new Money({ cents: Cents.make(165_400), currency: "AUD" }),
        period: "weekly",
      }),
      taxFreeThresholdClaimed: true,
    },
    jurisdiction: Option.some(Option.some(AuPayJurisdiction.make("AU"))),
    taxYear: Option.some(Option.some(AuPayTaxYear.make("2025-26"))),
  },
});
const _reportRequest = calculateReportRequest(AuPayTakeHomeCalculation, {
  help: Option.some(Option.some("errors")),
  payload: {
    facts: {
      grossPay: new GrossPay({
        amount: new Money({ cents: Cents.make(165_400), currency: "AUD" }),
        period: "weekly",
      }),
      taxFreeThresholdClaimed: true,
    },
    jurisdiction: Option.some(Option.some(AuPayJurisdiction.make("AU"))),
    taxYear: Option.some(Option.some(AuPayTaxYear.make("2025-26"))),
  },
});

const _unsupportedModuleCalculation = payClient.calculations.calculateReport(
  // @ts-expect-error annual income tax is not provided by the pay-only module.
  AuAnnualIncomeTaxCalculation,
  {
    taxableIncome: new Money({ cents: Cents.make(9_000_000), currency: "AUD" }),
  }
);

const _wrongAnnualFacts = fullClient.calculations.calculateReport(
  AuAnnualIncomeTaxCalculation,
  {
    // @ts-expect-error take-home facts cannot be submitted to annual tax.
    grossPay: new GrossPay({
      amount: new Money({ cents: Cents.make(165_400), currency: "AUD" }),
      period: "weekly",
    }),
    taxFreeThresholdClaimed: true,
  }
);

const _wrongPayFacts = payClient.calculations.calculateReport(
  AuPayTakeHomeCalculation,
  {
    // @ts-expect-error annual-tax facts cannot be submitted to take-home pay.
    taxableIncome: new Money({ cents: Cents.make(9_000_000), currency: "AUD" }),
  }
);
const _wrongReportRequest = calculateReportRequest(AuPayTakeHomeCalculation, {
  payload: {
    facts: {
      // @ts-expect-error request-preserving Effect facade still binds facts to the selected descriptor.
      taxableIncome: new Money({
        cents: Cents.make(9_000_000),
        currency: "AUD",
      }),
    },
  },
});
const _wrongRunRequest = calculateRunRequest(AuPayTakeHomeCalculation, {
  payload: {
    facts: {
      // @ts-expect-error full-run Effect facade still binds facts to the selected descriptor.
      taxableIncome: new Money({
        cents: Cents.make(9_000_000),
        currency: "AUD",
      }),
    },
  },
});

defineSdkCalculation({
  calculatorId: AuPayTakeHomeCalculation.calculatorId,
  inputSchema: AuPayTakeHomeCalculation.inputSchema,
  jurisdiction: AuPayTakeHomeCalculation.jurisdiction,
  outputSchema: AuPayTakeHomeCalculation.outputSchema,
  // @ts-expect-error unsupported tax year literals must stay out of descriptors.
  taxYear: "2024-25",
});
