import { expect, it } from "@effect/vitest";
import { AuPayCalculatorId } from "@taxkit/rules-au-pay/schemas";
import { Effect, Result, Schema } from "effect";

import { TaxKitWebConfigError } from "./config";
import { initialTakeHomeForm, WebsiteInputError } from "./form.boundary";
import { WebsiteSettings } from "./host.service";
import { loadRootView } from "./root.load.server";
import {
  WebsitePublicSettings,
  WebsiteRootView,
  WebsiteSubmissionTransport,
} from "./schemas";

it.effect(
  "loads settings and personal submission without an API capability",
  () =>
    Effect.gen(function* () {
      const settings = yield* Schema.decodeUnknownEffect(WebsitePublicSettings)(
        {
          apiOrigin: "https://api.taxkit.example",
          publicationOrigin: "https://taxkit.example",
          websiteOrigin: "https://preview.taxkit.example",
        }
      );
      const submission = yield* Schema.encodeEffect(WebsiteSubmissionTransport)(
        {
          calculatorId: AuPayCalculatorId.make("au.pay.take-home"),
          form: initialTakeHomeForm,
          result: Result.fail(
            new WebsiteInputError({
              message: "Enter a valid pay amount and pay period.",
            })
          ),
        }
      );
      const loaded = yield* loadRootView(submission).pipe(
        Effect.provideService(WebsiteSettings, {
          settings: Result.succeed(settings),
        })
      );
      expect(loaded.submission).toEqual(submission);
      const view = yield* Schema.decodeUnknownEffect(WebsiteRootView)(
        loaded.view
      );
      expect(view.settings.websiteOrigin.href).toBe(
        "https://preview.taxkit.example/"
      );
    })
);

it.effect("keeps invalid required settings as a root failure", () =>
  Effect.gen(function* () {
    const failure = new TaxKitWebConfigError({
      message: "TaxKit web settings are missing or invalid.",
      operation: "settings",
      runtime: "server",
    });
    const loaded = yield* loadRootView().pipe(
      Effect.provideService(WebsiteSettings, {
        settings: Result.fail(failure),
      }),
      Effect.result
    );
    expect(loaded).toEqual(Result.fail(failure));
  })
);
