import { Array, Match, Option, Record, Schema, SchemaGetter } from "effect";

// A transport-only selection: no preference means HTML, and equal preferences
// keep ordinary pages HTML. Invalid or wholly excluded representations remain
// distinct. This bounded ingress codec cannot reconstruct an original header.
export const DocsRepresentation = Schema.Literals([
  "html",
  "markdown",
  "unacceptable",
  "invalid",
]);
export const DocsAccept = Schema.NullOr(
  Schema.String.check(Schema.isMaxLength(4096))
).pipe(
  Schema.decodeTo(DocsRepresentation, {
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
