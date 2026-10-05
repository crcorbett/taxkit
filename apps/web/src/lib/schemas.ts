import { CalculatorRpcClientError } from "@taxkit/api-rpc/errors";
import {
  CalculatorRpcOrigin,
  CalculatorCatalogResponse,
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
} from "@taxkit/api-rpc/schemas";
import { AnnualTaxReport } from "@taxkit/rules-au-income-tax/schemas";
import {
  PayWithholdingsLedger,
  TakeHomePayReport,
} from "@taxkit/rules-au-pay/schemas";
import { Result, Schema } from "effect";

import { TaxKitWebConfigError } from "./config";
import {
  AnnualTaxForm,
  TakeHomeForm,
  WebsiteCalculatorForm,
  WebsiteInputError,
} from "./form.boundary";

const WebsiteOrigin = CalculatorRpcOrigin.pipe(
  Schema.brand("TaxKitWebsiteOrigin")
);
export const WebsitePublicSettings = Schema.Struct({
  apiOrigin: CalculatorRpcOrigin,
});
export type WebsitePublicSettings = typeof WebsitePublicSettings.Type;
export const WebsiteHostOrigins = Schema.Struct({
  ...WebsitePublicSettings.fields,
  websiteOrigin: WebsiteOrigin,
});
export const WebsiteSettingsTransport = Schema.toCodecJson(
  Schema.Result(WebsitePublicSettings, TaxKitWebConfigError)
);
export const WebsiteCatalogueTransport = Schema.toCodecJson(
  Schema.Result(
    CalculatorCatalogResponse,
    Schema.Union([CalculatorRpcClientError, TaxKitWebConfigError])
  )
);
export const WebsiteSubmission = Schema.Struct({
  calculatorId: CalculatorRunServiceRequest.fields.calculatorId,
  form: WebsiteCalculatorForm,
  result: Schema.Result(
    CalculatorRunResponse,
    Schema.Union([
      CalculatorRpcClientError,
      TaxKitWebConfigError,
      WebsiteInputError,
    ])
  ),
}).check(
  Schema.makeFilter((value) => {
    const annual = value.calculatorId === "au.income-tax.annual";
    if (
      !(annual
        ? Schema.is(AnnualTaxForm)(value.form)
        : Schema.is(TakeHomeForm)(value.form))
    ) {
      return false;
    }
    if (Result.isFailure(value.result)) {
      return true;
    }
    const response = value.result.success;
    if (response.calculator.calculatorId !== value.calculatorId) {
      return false;
    }
    if (annual) {
      return Schema.is(AnnualTaxReport)(response.report);
    }
    return value.calculatorId === "au.pay.take-home"
      ? Schema.is(TakeHomePayReport)(response.report)
      : Schema.is(PayWithholdingsLedger)(response.report);
  })
);
export const WebsiteSubmissionTransport = Schema.toCodecJson(WebsiteSubmission);
export const WebsiteServerRenderContext = Schema.Struct({
  submission: Schema.optional(Schema.toEncoded(WebsiteSubmissionTransport)),
});
export type WebsiteServerRenderContext = typeof WebsiteServerRenderContext.Type;
