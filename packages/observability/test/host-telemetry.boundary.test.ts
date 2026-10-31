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
