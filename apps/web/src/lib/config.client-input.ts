import { Config, Option, Schema } from "effect";

// Build representation only. The HTTP package still owns URL validation at runtime.
export const TaxKitWebClientInput = Schema.Struct({
  VITE_TAXKIT_API_BASE_URL: Schema.optionalKey(Schema.String),
});

export const TaxKitWebClientInputConfig = Config.option(
  Config.schema(Schema.String, "VITE_TAXKIT_API_BASE_URL")
).pipe(
  Config.map(
    Option.match({
      onNone: () => TaxKitWebClientInput.make({}),
      onSome: (value) =>
        TaxKitWebClientInput.make({ VITE_TAXKIT_API_BASE_URL: value }),
    })
  )
);

declare global {
  const __TAXKIT_WEB_CLIENT_INPUT__: typeof TaxKitWebClientInput.Type;
}
