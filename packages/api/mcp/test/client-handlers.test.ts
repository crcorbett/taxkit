import { expect, it } from "@effect/vitest";
import { TaxKitApi } from "@taxkit/api-http/api";
import { TaxKitApiInProcessLive } from "@taxkit/api-http/in-process";
import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import { CalculationRequest } from "@taxkit/calculators/testing/fixtures";
import { ContentServiceLive } from "@taxkit/content/live";
import { ContentCatalogue } from "@taxkit/content/service";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import { Effect, Layer, Option, Schema, Stream } from "effect";
import { HttpApiClient } from "effect/http-api";

import { clientToolHandlers } from "../src/client-handlers.js";
import { McpToolUnavailable } from "../src/errors.js";
import { TaxKitMcpHandlersLive } from "../src/handlers.layer.js";
import { McpRequestAbortSignal } from "../src/request.service.js";
import { TaxKitMcpToolkit } from "../src/tools.js";

const ContentLive = ContentServiceLive.pipe(
  Layer.provide(Layer.effect(ContentCatalogue, exampleContentCatalogue))
);
// Remote MCP: the service-backed handlers inside one MCP request.
const ServiceTools = TaxKitMcpToolkit.pipe(
  Effect.provide(
    TaxKitMcpHandlersLive.pipe(
      Layer.provide(Layer.mergeAll(PublicCalculatorServiceLive, ContentLive))
    )
  ),
  Effect.provideService(
    McpRequestAbortSignal,
    Option.some(new AbortController().signal)
  )
);
// Browser WebMCP: the same toolkit through the generated public API client,
// answered by the actual HTTP routes over the same services.
const ClientTools = HttpApiClient.make(TaxKitApi, {
  baseUrl: "http://taxkit.internal",
}).pipe(
  Effect.flatMap((client) =>
    TaxKitMcpToolkit.pipe(
      Effect.provide(TaxKitMcpToolkit.toLayer(clientToolHandlers(client)))
    )
  ),
  Effect.provide(TaxKitApiInProcessLive.pipe(Layer.provide(ContentLive)))
);
// What an agent reads: the encoded success, or the declared safe failure.
const call = Effect.fnUntraced(function* ({
  input,
  name,
  toolkit,
}: Readonly<{
  input: typeof Schema.JsonObject.Type;
  name: keyof typeof TaxKitMcpToolkit.tools;
  toolkit: Effect.Success<typeof ServiceTools>;
}>) {
  return yield* toolkit.handle(name, input).pipe(
    Stream.unwrap,
    Stream.runLast,
    Effect.flatMap(Effect.fromOption),
    Effect.flatMap(({ encodedResult }) =>
      Schema.decodeUnknownEffect(Schema.Json)(encodedResult)
    ),
    Effect.catchIf(Schema.is(McpToolUnavailable), Effect.succeed)
  );
});

it.effect(
  "client-backed handlers answer exactly as the service-backed MCP handlers",
  () =>
    Effect.gen(function* () {
      const service = yield* ServiceTools;
      const client = yield* ClientTools;
      const calculation = yield* Schema.encodeEffect(
        Schema.toCodecJson(
          TaxKitMcpToolkit.tools.taxkit_calculate.parametersSchema
        )
      )(CalculationRequest).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(Schema.JsonObject))
      );
      const cases = [
        { input: {}, name: "taxkit_list_calculators" },
        {
          input: { calculatorId: "au.pay.take-home" },
          name: "taxkit_get_calculator_schema",
        },
        { input: calculation, name: "taxkit_calculate" },
        { input: {}, name: "taxkit_docs_navigation" },
        { input: { term: "calculator" }, name: "taxkit_find_docs" },
        { input: { path: "/start/overview" }, name: "taxkit_read_doc" },
        // A declared failure keeps the same safe vocabulary.
        {
          input: { path: "/private-taxkit-sentinel" },
          name: "taxkit_read_doc",
        },
      ] as const;
      yield* Effect.forEach(
        cases,
        Effect.fnUntraced(function* ({ input, name }) {
          const answers = yield* Effect.all({
            client: call({ input, name, toolkit: client }),
            service: call({ input, name, toolkit: service }),
          });
          expect(answers.client, name).toStrictEqual(answers.service);
        }),
        { discard: true }
      );
      const missing = yield* call({
        input: { path: "/private-taxkit-sentinel" },
        name: "taxkit_read_doc",
        toolkit: client,
      });
      expect(missing).toStrictEqual(
        new McpToolUnavailable({
          code: "service-unavailable",
          retry: "try-again-manually",
        })
      );
    })
);
