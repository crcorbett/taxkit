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
import {
  Array,
  Match,
  Option,
  Record,
  Result,
  Schema,
  SchemaGetter,
} from "effect";

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

// A transport-only selection: no preference means HTML, and equal preferences
// keep ordinary pages HTML. Invalid or wholly excluded representations remain
// distinct. This bounded ingress codec cannot reconstruct an original header.
const WebsiteDocsRepresentation = Schema.Literals([
  "html",
  "markdown",
  "unacceptable",
  "invalid",
]);
export const WebsiteDocsAccept = Schema.NullOr(
  Schema.String.check(Schema.isMaxLength(4096))
).pipe(
  Schema.decodeTo(WebsiteDocsRepresentation, {
    decode: SchemaGetter.transform((raw) => {
      if (raw === null) {
        return "html";
      }
      // Complete RFC token/quoted-string fields, including escaped separators.
      // Concatenated matches must cover every byte: a substring is insufficient.
      const ranges = Array.fromIterable(
        raw.matchAll(
          /(?:^|(?<=,))[\t ]*(?:(?<media>[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+)(?<parameters>(?:[\t ]*;[\t ]*[!#$%&'*+.^_`|~0-9A-Za-z-]+[\t ]*=[\t ]*(?:[!#$%&'*+.^_`|~0-9A-Za-z-]+|"(?:[\t !#-[\]-~\u0080-\u00FF]|\\[\t \u0021-\u007E\u0080-\u00FF])*"))*))?[\t ]*(?:,|$)/gu
        )
      );
      if (
        ranges.length > 64 ||
        Array.map(ranges, (range) =>
          Array.head(range).pipe(Option.getOrElse(() => ""))
        ).join("") !== raw
      ) {
        return "invalid";
      }
      const preferences = Array.map(ranges, (range) => {
        const media = Option.fromNullishOr(range.groups).pipe(
          Option.flatMap(Record.get("media")),
          Option.flatMap(Option.fromNullishOr),
          Option.map((value) => value.toLowerCase()),
          Option.getOrElse(() => "")
        );
        const parameters = Array.map(
          Array.fromIterable(
            Option.fromNullishOr(range.groups)
              .pipe(
                Option.flatMap(Record.get("parameters")),
                Option.flatMap(Option.fromNullishOr),
                Option.getOrElse(() => "")
              )
              .matchAll(
                /;[\t ]*(?<name>[!#$%&'*+.^_`|~0-9A-Za-z-]+)[\t ]*=[\t ]*(?<value>[!#$%&'*+.^_`|~0-9A-Za-z-]+|"(?:[\t !#-[\]-~\u0080-\u00FF]|\\[\t \u0021-\u007E\u0080-\u00FF])*")/gu
              )
          ),
          (parameter) => ({
            name: Option.fromNullishOr(parameter.groups).pipe(
              Option.flatMap(Record.get("name")),
              Option.flatMap(Option.fromNullishOr),
              Option.map((name) => name.toLowerCase()),
              Option.getOrElse(() => "")
            ),
            value: Option.fromNullishOr(parameter.groups).pipe(
              Option.flatMap(Record.get("value")),
              Option.flatMap(Option.fromNullishOr),
              Option.getOrElse(() => "")
            ),
          })
        );
        const weights = Array.filter(parameters, (item) => item.name === "q");
        const weight = Array.head(weights).pipe(
          Option.map((item) => item.value),
          Option.getOrElse(() => "1")
        );
        const validWeight = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/u.test(
          weight
        );
        return {
          media,
          parameters,
          quality: validWeight ? Number(weight) : 0,
          valid:
            parameters.length <= 16 &&
            weights.length <= 1 &&
            validWeight &&
            (!media.startsWith("*/") || media === "*/*"),
        };
      });
      if (Array.some(preferences, (preference) => !preference.valid)) {
        return "invalid";
      }
      const qualities = Array.map(["text/html", "text/markdown"], (media) =>
        Array.reduce(
          preferences,
          { quality: 0, specificity: -1 },
          (selected, preference) => {
            const specificity = Match.value(preference.media).pipe(
              Match.when(
                (value) => value === media,
                () => 2
              ),
              Match.when("text/*", () => 1),
              Match.when("*/*", () => 0),
              Match.orElse(() => -1)
            );
            const parameters = Array.filter(
              preference.parameters,
              (item) => item.name !== "q"
            );
            // Both available text representations have only UTF-8 parameters.
            // Unknown media parameters cannot select a different representation.
            const matches = Array.every(
              parameters,
              (item) =>
                item.name === "charset" &&
                (item.value.startsWith('"')
                  ? item.value
                      .slice(1, -1)
                      .replaceAll(/\\(?<escaped>[\s\S])/gu, "$<escaped>")
                  : item.value
                ).toLowerCase() === "utf-8"
            );
            const score = specificity * 20 + parameters.length;
            return specificity >= 0 && matches && score > selected.specificity
              ? { quality: preference.quality, specificity: score }
              : selected;
          }
        )
      );
      const html = Array.get(qualities, 0).pipe(
        Option.map((quality) => quality.quality),
        Option.getOrElse(() => 0)
      );
      const markdown = Array.get(qualities, 1).pipe(
        Option.map((quality) => quality.quality),
        Option.getOrElse(() => 0)
      );
      if (html === 0 && markdown === 0) {
        return "unacceptable";
      }
      return markdown > html ? "markdown" : "html";
    }),
    encode: SchemaGetter.forbidden(() => "Content preference is ingress-only."),
  })
);
