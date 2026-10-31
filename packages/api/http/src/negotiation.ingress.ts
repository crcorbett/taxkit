import {
  Function as EffectFunction,
  Array,
  Match,
  Option,
  Record,
  Schema,
  SchemaGetter,
  Boolean as EffectBoolean,
} from "effect";
// A transport-only selection: no preference means HTML, and equal preferences
// keep ordinary pages HTML. Invalid or wholly excluded representations remain
// distinct. This bounded ingress codec cannot reconstruct an original header.
export const DocsRepresentation = Schema.Literals([
  "html",
  "markdown",
  "unacceptable",
  "invalid",
]);
export const DocsAccept = Schema.OptionFromNullOr(
  Schema.String.check(Schema.isMaxLength(4096))
).pipe(
  Schema.decodeTo(DocsRepresentation, {
    decode: SchemaGetter.transform((input) => {
      if (Option.isNone(input)) {
        return "html";
      }
      const raw = input.value;
      // Complete RFC token/quoted-string fields, including escaped separators.
      // Concatenated matches must cover every byte: a substring is insufficient.
      const ranges = Array.fromIterable(
        raw.matchAll(
          /(?:^|(?<=,))[\t ]*(?:(?<media>[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+)(?<parameters>(?:[\t ]*;[\t ]*[!#$%&'*+.^_`|~0-9A-Za-z-]+[\t ]*=[\t ]*(?:[!#$%&'*+.^_`|~0-9A-Za-z-]+|"(?:[\t !#-[\]-~\u0080-\u00FF]|\\[\t \u0021-\u007E\u0080-\u00FF])*"))*))?[\t ]*(?:,|$)/gu
        )
      );
      if (
        ranges.length > 64 ||
        EffectFunction.pipe(
          ranges,
          Array.map((range) =>
            Array.head(range).pipe(Option.getOrElse(() => ""))
          )
        ).join("") !== raw
      ) {
        return "invalid";
      }
      const preferences = EffectFunction.pipe(
        ranges,
        Array.map((range) => {
          const media = Option.fromNullishOr(range.groups).pipe(
            Option.flatMap(Record.get("media")),
            Option.flatMap(Option.fromNullishOr),
            Option.map((value) => value.toLowerCase()),
            Option.getOrElse(() => "")
          );
          const parameters = EffectFunction.pipe(
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
            Array.map((parameter) => ({
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
            }))
          );
          const weights = EffectFunction.pipe(
            parameters,
            Array.filter((item) => item.name === "q")
          );
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
            quality: EffectBoolean.match(validWeight, {
              onFalse: (): 0 => 0,
              onTrue: () => Number(weight),
            }),
            valid:
              parameters.length <= 16 &&
              weights.length <= 1 &&
              validWeight &&
              (!media.startsWith("*/") || media === "*/*"),
          };
        })
      );
      if (
        EffectFunction.pipe(
          preferences,
          Array.some((preference) => !preference.valid)
        )
      ) {
        return "invalid";
      }
      const qualities = EffectFunction.pipe(
        ["text/html", "text/markdown"],
        Array.map((media) =>
          EffectFunction.pipe(
            preferences,
            Array.reduce(
              { quality: 0, specificity: -1 },
              (selected, preference) => {
                const specificity = Match.value(preference.media).pipe(
                  Match.when(
                    (value) => value === media,
                    (): 2 => 2
                  ),
                  Match.when("text/*", (): 1 => 1),
                  Match.when("*/*", (): 0 => 0),
                  Match.orElse(() => -1)
                );
                const parameters = EffectFunction.pipe(
                  preference.parameters,
                  Array.filter((item) => item.name !== "q")
                );
                // Both available text representations have only UTF-8 parameters.
                // Unknown media parameters cannot select a different representation.
                const matches = EffectFunction.pipe(
                  parameters,
                  Array.every(
                    (item) =>
                      item.name === "charset" &&
                      EffectBoolean.match(item.value.startsWith('"'), {
                        onFalse: () => item.value,
                        onTrue: () =>
                          item.value
                            .slice(1, -1)
                            .replaceAll(/\\(?<escaped>[\s\S])/gu, "$<escaped>"),
                      }).toLowerCase() === "utf-8"
                  )
                );
                const score = specificity * 20 + parameters.length;
                return EffectBoolean.match(
                  specificity >= 0 && matches && score > selected.specificity,
                  {
                    onFalse: () => selected,
                    onTrue: () => ({
                      quality: preference.quality,
                      specificity: score,
                    }),
                  }
                );
              }
            )
          )
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
      return EffectBoolean.match(markdown > html, {
        onFalse: (): "html" => "html",
        onTrue: (): "markdown" => "markdown",
      });
    }),
    encode: SchemaGetter.forbidden(() => "Content preference is ingress-only."),
  })
);
