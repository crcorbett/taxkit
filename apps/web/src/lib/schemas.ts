import { CalculatorRpcClientError } from "@taxkit/api-rpc/errors";
import {
  CalculatorRpcOrigin,
  CalculatorRunResponse,
} from "@taxkit/api-rpc/schemas";
import { Schema } from "effect";

import { TaxKitWebConfigError } from "./config";
import { TakeHomeForm, WebsiteInputError } from "./form.boundary";

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
export const WebsiteSubmission = Schema.Struct({
  form: TakeHomeForm,
  result: Schema.Result(
    CalculatorRunResponse,
    Schema.Union([
      CalculatorRpcClientError,
      TaxKitWebConfigError,
      WebsiteInputError,
    ])
  ),
});
export const WebsiteSubmissionTransport = Schema.toCodecJson(WebsiteSubmission);
export const WebsiteServerRenderContext = Schema.Struct({
  submission: Schema.optional(Schema.toEncoded(WebsiteSubmissionTransport)),
});
export type WebsiteServerRenderContext = typeof WebsiteServerRenderContext.Type;
