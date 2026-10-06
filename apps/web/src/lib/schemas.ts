import { DocsRpcClientError } from "@taxkit/api-rpc/content/errors";
import { CalculatorRpcClientError } from "@taxkit/api-rpc/errors";
import {
  CalculatorRpcOrigin,
  CalculatorCatalogResponse,
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
} from "@taxkit/api-rpc/schemas";
import {
  DocsWebsiteOrigin,
  DocsPublicNavigation,
  DocsPublicPage,
  DocsSearchTerm,
  DocsSearchResult,
} from "@taxkit/content/schemas";
import { AnnualTaxReport } from "@taxkit/rules-au-income-tax/schemas";
import {
  PayWithholdingsLedger,
  TakeHomePayReport,
} from "@taxkit/rules-au-pay/schemas";
import { Array, Result, Schema, SchemaGetter } from "effect";

import { TaxKitWebConfigError } from "./config";
import {
  DocsSearchInputError,
  DocsPresentationUnavailable,
} from "./docs/errors";
import {
  AnnualTaxForm,
  TakeHomeForm,
  WebsiteCalculatorForm,
  WebsiteInputError,
} from "./form.boundary";

export const WebsitePublicSettings = Schema.Struct({
  apiOrigin: CalculatorRpcOrigin,
  websiteOrigin: DocsWebsiteOrigin,
});
export type WebsitePublicSettings = typeof WebsitePublicSettings.Type;
export const WebsiteSettingsTransport = Schema.toCodecJson(
  Schema.Result(WebsitePublicSettings, TaxKitWebConfigError)
);
export const WebsiteCatalogueTransport = Schema.toCodecJson(
  Schema.Result(
    CalculatorCatalogResponse,
    Schema.Union([CalculatorRpcClientError, TaxKitWebConfigError])
  )
);
const WebsiteDocsPageView = Schema.Struct({
  navigation: DocsPublicNavigation,
  page: DocsPublicPage,
  settings: WebsitePublicSettings,
});
export const WebsiteDocsPageTransport = Schema.toCodecJson(
  Schema.Result(
    WebsiteDocsPageView,
    Schema.Union([
      DocsRpcClientError,
      TaxKitWebConfigError,
      DocsPresentationUnavailable,
    ])
  )
);
export const WebsiteSearchParameters = Schema.Record(
  Schema.String,
  Schema.Array(Schema.String)
);

// Human search words are public page content, never calculation facts. The
// owning term Schema keeps the same 100-character bound as API search.
const WebsiteDocsSearchTerm = Schema.Trim.pipe(
  Schema.decodeTo(Schema.Union([Schema.Literal(""), DocsSearchTerm]))
);
const WebsiteDocsSearchQuery = Schema.Struct({
  term: Schema.optional(WebsiteDocsSearchTerm),
});
// Search uses the original raw address instead of the router's default JSON
// query parser, which would turn words such as 2026 or true into other types.
export const WebsiteDocsSearchLocation = Schema.String.check(
  Schema.isMaxLength(1200),
  Schema.makeFilter((raw) => {
    const query = new URLSearchParams(raw);
    return (
      query.getAll("term").length <= 1 &&
      Array.every(Array.fromIterable(query.keys()), (key) => key === "term")
    );
  })
).pipe(
  Schema.decodeTo(WebsiteDocsSearchQuery, {
    decode: SchemaGetter.transform((raw) => ({
      term: new URLSearchParams(raw).get("term") ?? undefined,
    })),
    encode: SchemaGetter.transform((query) =>
      query.term === undefined
        ? ""
        : new URLSearchParams({ term: query.term }).toString()
    ),
  })
);
// Headers admit only bounded ASCII. The native URI codec carries Unicode
// safely without relying on a browser Headers ByteString conversion.
export const WebsiteDocsSearchHeader = Schema.String.check(
  Schema.isMaxLength(1200),
  Schema.isPattern(/^(?:[A-Za-z0-9_.!~*'()-]|%[0-9A-Fa-f]{2})*$/u)
).pipe(
  Schema.decodeTo(Schema.StringFromUriComponent),
  Schema.decodeTo(Schema.toType(WebsiteDocsSearchTerm))
);
const WebsiteDocsSearchView = Schema.Struct({
  navigation: DocsPublicNavigation,
  results: Schema.Array(DocsSearchResult).check(Schema.isMaxLength(20)),
  settings: WebsitePublicSettings,
  term: Schema.toType(WebsiteDocsSearchTerm),
});
export const WebsiteDocsSearchTransport = Schema.toCodecJson(
  Schema.Result(
    WebsiteDocsSearchView,
    Schema.Union([
      DocsRpcClientError,
      TaxKitWebConfigError,
      DocsSearchInputError,
    ])
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
