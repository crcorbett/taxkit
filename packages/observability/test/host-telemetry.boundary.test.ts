import { expect, it } from "@effect/vitest";
import { Array, Effect, Schema } from "effect";
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
      const telemetry =
        host === "api" ? ApiHostTelemetryLive : WebsiteHostTelemetryLive;
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
      expect(lines.length).toBe(2);
      const output = Array.join(Array.map(lines, String), "\n");
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
    expect(lines.length).toBe(1);
    const records = yield* Effect.forEach(lines, (line) =>
      Schema.decodeUnknownEffect(Schema.fromJsonString(HostRequestRecord))(line)
    );
    expect(records).toEqual([
      expect.objectContaining({
        event: "taxkit.request",
        method: "POST",
        outcome: "completed",
        route: "calculate",
        service: "taxkit-api",
        status: 204,
        statusClass: "2xx",
      }),
    ]);
  }).pipe(Effect.provide(TestConsole.layer))
);
