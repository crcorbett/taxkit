import { expect, it } from "@effect/vitest";
import {
  Match,
  Function as EffectFunction,
  Array,
  Effect,
  Option,
  Schema,
} from "effect";
import { HttpServerResponse } from "effect/http";
import { TestConsole } from "effect/testing";

import {
  ApiHostTelemetryLive,
  HostEventRecord,
  HostRequestRecord,
  WebsiteHostTelemetryLive,
  observeHostRequest,
} from "../src/host-telemetry.js";

const privateValue = "PRIVATE_TAX_FACT_OR_REQUEST";
it.effect.each(["api", "website"] as const)(
  "removes arbitrary %s messages, causes and annotations before log egress",
  (host) =>
    Effect.gen(function* () {
      const telemetry = Match.value(host).pipe(
        Match.when("api", () => ApiHostTelemetryLive),
        Match.orElse(() => WebsiteHostTelemetryLive)
      );
      yield* Effect.log(privateValue).pipe(
        Effect.annotateLogs({ [privateValue]: privateValue }),
        Effect.withLogSpan(privateValue),
        Effect.provide(telemetry)
      );
      yield* Effect.die(privateValue).pipe(
        Effect.withErrorReporting,
        Effect.exit,
        Effect.provide(telemetry)
      );
      const lines = yield* TestConsole.logLines;
      expect(lines).toHaveLength(2);
      const output = Array.join(
        EffectFunction.pipe(lines, Array.map(String)),
        "\n"
      );
      expect(output).not.toContain(privateValue);
      expect(output).toContain(`${host}.runtime.event`);
      expect(output).not.toContain("annotations");
      expect(output).not.toContain("cause");
    }).pipe(Effect.provide(TestConsole.layer))
);
it.effect("emits the canonical request record with only closed fields", () =>
  Effect.gen(function* () {
    yield* Effect.succeed(HttpServerResponse.empty({ status: 204 })).pipe(
      observeHostRequest("taxkit-api", { method: "POST", route: "calculate" }),
      Effect.provide(ApiHostTelemetryLive)
    );
    const lines = yield* TestConsole.logLines;
    expect(lines).toHaveLength(1);
    const records = yield* EffectFunction.pipe(
      lines,
      Effect.forEach((line) =>
        Schema.decodeUnknownEffect(Schema.fromJsonString(HostRequestRecord))(
          line
        )
      )
    );
    expect(records).toStrictEqual([
      expect.objectContaining({
        event: "taxkit.request",
        method: "POST",
        outcome: "completed",
        route: "calculate",
        service: "taxkit-api",
        status: Option.some(204),
        statusClass: "2xx",
      }),
    ]);
  }).pipe(Effect.provide(TestConsole.layer))
);

const EventLine = Schema.fromJsonString(
  Schema.Struct({
    ...HostEventRecord.fields,
    level: Schema.String,
    service: Schema.String,
  })
);
class SampleUnavailable extends Schema.TaggedError<
  SampleUnavailable,
  { readonly brand: unique symbol }
>()("SampleUnavailable", { detail: Schema.String }) {}
it.effect(
  "keeps only a checked event record from annotations or the reporter",
  () =>
    Effect.gen(function* () {
      yield* Effect.logWarning(privateValue).pipe(
        Effect.annotateLogs({
          ...HostEventRecord.make({
            errorTag: "ApiUnavailable",
            event: "website.load.failed",
            reason: "unavailable",
          }),
          url: privateValue,
        }),
        Effect.provide(WebsiteHostTelemetryLive)
      );
      // An unchecked tag or reason falls back to the fixed runtime event.
      yield* Effect.logWarning("ignored").pipe(
        Effect.annotateLogs({
          errorTag: privateValue,
          event: "website.load.failed",
          reason: "unavailable",
        }),
        Effect.provide(WebsiteHostTelemetryLive)
      );
      yield* Effect.fail(new SampleUnavailable({ detail: privateValue })).pipe(
        Effect.withErrorReporting,
        Effect.exit,
        Effect.provide(ApiHostTelemetryLive)
      );
      const lines = EffectFunction.pipe(
        yield* TestConsole.logLines,
        Array.map(String)
      );
      const output = Array.join(lines, "\n");
      expect(output).not.toContain(privateValue);
      const [first, second, third] = lines;
      const warning = yield* Schema.decodeUnknownEffect(EventLine)(first);
      const reported = yield* Schema.decodeUnknownEffect(EventLine)(third);
      expect(warning).toStrictEqual({
        errorTag: "ApiUnavailable",
        event: "website.load.failed",
        level: "Warn",
        reason: "unavailable",
        service: "taxkit-web",
      });
      expect(second).toContain("website.runtime.event");
      expect(reported).toStrictEqual({
        errorTag: "SampleUnavailable",
        event: "host.failure.reported",
        level: "Error",
        reason: "reported",
        service: "taxkit-api",
      });
    }).pipe(Effect.provide(TestConsole.layer))
);
