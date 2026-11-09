import { expect, it } from "@effect/vitest";
import { McpToolUnavailable } from "@taxkit/api-mcp/schemas";
import { TaxKitMcpToolkit } from "@taxkit/api-mcp/tools";
import { CalculationRequest } from "@taxkit/calculators/testing/fixtures";
import { DocsWebsiteOrigin } from "@taxkit/content/schemas";
import {
  Schedule,
  Match,
  Function as EffectFunction,
  Array,
  Deferred,
  Effect,
  Exit,
  Fiber,
  FiberSet,
  Layer,
  Option,
  Order,
  Predicate,
  Record,
  Schema,
} from "effect";
import { McpServer } from "effect/ai";
import { TestClock } from "effect/testing";
import { vi } from "vitest";
import type { WebMCP } from "webmcp-types";

import { ModelContextHostLive } from "../src/model-context.adapter.layer.js";
import { registerWebMcpTools } from "../src/registration.egress.js";
import { WebMcpToolResult } from "../src/schemas.js";
import type { WebMcpToolInput } from "../src/schemas.js";
import { WebMcpSite } from "../src/service.js";

const websiteOrigin = DocsWebsiteOrigin.make(
  new URL("https://website.example.com")
);
// The live host adapter for this test page's origin.
const HostLive = ModelContextHostLive.pipe(
  Layer.provide(Layer.succeed(WebMcpSite)({ origin: websiteOrigin }))
);
const unavailable = new McpToolUnavailable({
  code: "service-unavailable",
  retry: "try-again-manually",
});
const ControlledHandlers = TaxKitMcpToolkit.toLayer({
  taxkit_calculate: () => Effect.fail(unavailable),
  taxkit_docs_navigation: () => Effect.fail(unavailable),
  taxkit_find_docs: () => Effect.fail(unavailable),
  taxkit_get_calculator_schema: () => Effect.fail(unavailable),
  taxkit_list_calculators: () => Effect.fail(unavailable),
  taxkit_read_doc: () => Effect.fail(unavailable),
});
const toolCount = Array.length(Record.keys(TaxKitMcpToolkit.tools));
const registerTools = registerWebMcpTools.pipe(
  Effect.provide(Layer.mergeAll(HostLive, ControlledHandlers))
);
const byName = Order.mapInput(
  Order.String,
  (tool: Readonly<{ name: string }>) => tool.name
);
const installHost = (
  host: Readonly<{ document?: unknown; navigator?: unknown; origin?: string }>
) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      vi.stubGlobal("document", host.document);
      vi.stubGlobal("navigator", host.navigator);
      vi.stubGlobal("location", new URL(host.origin ?? websiteOrigin.href));
    }),
    () => Effect.sync(() => vi.unstubAllGlobals())
  );
const execute = Effect.fnUntraced(function* ({
  input,
  signal,
  tool,
}: Readonly<{
  input: WebMcpToolInput;
  signal: AbortSignal;
  tool: WebMCP.ModelContextTool;
}>) {
  const response = yield* Effect.promise(() => {
    const reply = tool.execute(input, { signal });
    if (!Predicate.isPromise(reply)) {
      return expect.fail("The native tool callback must return a Promise");
    }
    return reply;
  });
  return yield* Schema.decodeUnknownEffect(WebMcpToolResult)(response);
});
// The single text block an MCP client reads.
const replyText = (result: WebMcpToolResult) =>
  Array.head(result.content).pipe(Option.map(({ text }) => text));
// Handlers covering every result kind, plus a call that waits until cancelled.
const ResultHandlers = (
  calls: Readonly<{
    cancelled: () => void;
    started: () => void;
  }>
) =>
  TaxKitMcpToolkit.toLayer({
    taxkit_calculate: () =>
      Effect.sync(calls.started).pipe(
        Effect.andThen(Effect.never),
        Effect.onInterrupt(() => Effect.sync(calls.cancelled))
      ),
    taxkit_docs_navigation: () => Effect.succeed({ primaryNavigation: [] }),
    taxkit_find_docs: () => Effect.fail(unavailable),
    taxkit_get_calculator_schema: () => Effect.die("PRIVATE9"),
    taxkit_list_calculators: () => Effect.fail(unavailable),
    taxkit_read_doc: () => Effect.fail(unavailable),
  });
const registeredTool = Effect.fnUntraced(function* ({
  name,
  register,
}: Readonly<{
  name: string;
  register: ReturnType<typeof vi.fn<WebMCP.ModelContext["registerTool"]>>;
}>) {
  const [tool] = yield* EffectFunction.pipe(
    register.mock.calls,
    Array.findFirst(([entry]) => entry.name === name),
    Effect.fromOption
  );
  return tool;
});

it.effect(
  "registers exactly the API MCP tools/list names, descriptions, input schemas and read-only hints",
  () =>
    Effect.gen(function* () {
      const register = vi
        .fn<WebMCP.ModelContext["registerTool"]>()
        .mockResolvedValue();
      yield* installHost({
        document: { modelContext: { registerTool: register } },
      });
      yield* registerTools;
      // The remote MCP server's own advertisement of the same toolkit.
      const listed = yield* Effect.gen(function* () {
        yield* McpServer.registerToolkit(TaxKitMcpToolkit);
        const server = yield* McpServer.McpServer;
        return server.tools;
      }).pipe(
        Effect.provide(
          Layer.mergeAll(McpServer.McpServer.layer, ControlledHandlers)
        )
      );
      const browser = EffectFunction.pipe(
        register.mock.calls,
        Array.map(([tool]) => ({
          annotations: tool.annotations,
          description: tool.description,
          inputSchema: tool.inputSchema,
          name: tool.name,
        })),
        Array.sort(byName)
      );
      const remote = EffectFunction.pipe(
        listed,
        Array.map(({ tool }) => ({
          annotations: { readOnlyHint: tool.annotations?.readOnlyHint },
          description: tool.description,
          inputSchema: tool.inputSchema,
          name: tool.name,
        })),
        Array.sort(byName)
      );
      expect({ browser, count: browser.length }).toStrictEqual({
        browser: remote,
        count: toolCount,
      });
    }).pipe(Effect.scoped)
);
it.effect.each(["absent", "unsupported", "other-origin"] as const)(
  "does not register in an $0 host",
  (mode) =>
    Effect.gen(function* () {
      const register = vi
        .fn<WebMCP.ModelContext["registerTool"]>()
        .mockResolvedValue();
      yield* installHost({
        document: Match.value(mode).pipe(
          Match.when("absent", EffectFunction.constUndefined),
          Match.when("unsupported", () => ({ modelContext: {} })),
          Match.orElse(() => ({ modelContext: { registerTool: register } }))
        ),
        origin: Match.value(mode).pipe(
          Match.when("other-origin", () => "https://other.example.com"),
          Match.orElse(() => websiteOrigin.href)
        ),
      });
      yield* registerTools;
      expect(register).not.toHaveBeenCalled();
    }).pipe(Effect.scoped)
);
it.effect(
  "falls back to navigator.modelContext and prefers document.modelContext",
  () =>
    Effect.gen(function* () {
      const onNavigator = vi
        .fn<WebMCP.ModelContext["registerTool"]>()
        .mockResolvedValue();
      yield* installHost({
        navigator: { modelContext: { registerTool: onNavigator } },
      });
      yield* registerTools;
      expect(onNavigator).toHaveBeenCalledTimes(toolCount);
      const onDocument = vi
        .fn<WebMCP.ModelContext["registerTool"]>()
        .mockResolvedValue();
      const ignored = vi
        .fn<WebMCP.ModelContext["registerTool"]>()
        .mockResolvedValue();
      yield* installHost({
        document: { modelContext: { registerTool: onDocument } },
        navigator: { modelContext: { registerTool: ignored } },
      });
      yield* registerTools;
      expect(onDocument).toHaveBeenCalledTimes(toolCount);
      expect(ignored).not.toHaveBeenCalled();
    }).pipe(Effect.scoped)
);
it.effect(
  "bounds a stalled registration without holding up independent tools",
  () =>
    Effect.gen(function* () {
      const ready = yield* Deferred.make<true>();
      // This test scope owns the controlled host's pending callback, including
      // a host that finishes late after our registration deadline.
      const hostRun = yield* FiberSet.makeRuntimePromise();
      const registration = Deferred.await(ready).pipe(Effect.asVoid, hostRun);
      const register = vi
        .fn<WebMCP.ModelContext["registerTool"]>()
        .mockReturnValueOnce(registration)
        .mockResolvedValue();
      yield* installHost({
        document: { modelContext: { registerTool: register } },
      });
      const registrations = yield* registerTools.pipe(Effect.forkChild);
      yield* Effect.sync(() => register.mock.calls.length).pipe(
        Effect.repeat({
          until: (observed) => observed === toolCount,
          schedule: Schedule.spaced("50 millis"),
        }),
        Effect.timeout(1000),
        TestClock.withLive
      );
      yield* TestClock.adjust("2 seconds");
      yield* Fiber.join(registrations);
      const stalled = yield* Array.head(register.mock.calls).pipe(
        Effect.fromOption,
        Effect.map(([, options]) => Option.fromNullishOr(options?.signal)),
        Effect.flatMap(Effect.fromOption)
      );
      expect(stalled.aborted).toBeTruthy();
      yield* Deferred.succeed(ready, true);
      expect(register).toHaveBeenCalledTimes(toolCount);
    }).pipe(Effect.scoped)
);
// An older or stand-in host sees `execute` as a one-argument callback.
interface StandInTool {
  readonly name: string;
  readonly execute: (input: WebMcpToolInput) => PromiseLike<WebMcpToolResult>;
}
it.effect("answers a host that calls execute without options", () =>
  Effect.gen(function* () {
    const register = vi
      .fn<(tool: StandInTool, options: { signal: AbortSignal }) => void>()
      .mockReturnValue();
    yield* installHost({
      document: { modelContext: { registerTool: register } },
    });
    yield* registerWebMcpTools.pipe(
      Effect.provide(
        Layer.mergeAll(
          HostLive,
          ResultHandlers({
            cancelled: EffectFunction.constVoid,
            started: EffectFunction.constVoid,
          })
        )
      )
    );
    const [tool] = yield* EffectFunction.pipe(
      register.mock.calls,
      Array.findFirst(([entry]) => entry.name === "taxkit_docs_navigation"),
      Effect.fromOption
    );
    const reply = yield* Effect.promise(() => tool.execute({}));
    expect(
      yield* Schema.decodeUnknownEffect(WebMcpToolResult)(reply)
    ).toStrictEqual({
      content: [{ text: '{"primaryNavigation":[]}', type: "text" }],
      isError: false,
      structuredContent: { primaryNavigation: [] },
    });
  }).pipe(Effect.scoped)
);
it.effect(
  "preserves the host receiver, attempts independent tools and returns only MCP-shaped safe results",
  () =>
    Effect.gen(function* () {
      // A controlled host exercises our adapter policy. The actual browser
      // contract and caller proof belong to native-browser-tools.boundary.
      const register = vi
        .fn<WebMCP.ModelContext["registerTool"]>()
        .mockRejectedValueOnce(new DOMException("PRIVATE9", "SecurityError"))
        .mockResolvedValue();
      const host = { registerTool: register };
      yield* installHost({ document: { modelContext: host } });
      yield* registerWebMcpTools.pipe(
        Effect.provide(
          Layer.mergeAll(
            HostLive,
            ResultHandlers({
              cancelled: EffectFunction.constVoid,
              started: EffectFunction.constVoid,
            })
          )
        )
      );
      const { signal } = new AbortController();
      const success = yield* execute({
        input: {},
        signal,
        tool: yield* registeredTool({
          name: "taxkit_docs_navigation",
          register,
        }),
      });
      const invalid = yield* execute({
        input: { extra: "value" },
        signal,
        tool: yield* registeredTool({
          name: "taxkit_docs_navigation",
          register,
        }),
      });
      const declared = yield* execute({
        input: { term: "tax" },
        signal,
        tool: yield* registeredTool({ name: "taxkit_find_docs", register }),
      });
      const unexpected = yield* execute({
        input: { calculatorId: "au.pay.take-home" },
        signal,
        tool: yield* registeredTool({
          name: "taxkit_get_calculator_schema",
          register,
        }),
      });
      const successText = yield* replyText(success).pipe(
        Effect.fromOption,
        Effect.flatMap(Schema.decodeEffect(Schema.fromJsonString(Schema.Json)))
      );
      const declaredFailure = yield* replyText(declared).pipe(
        Effect.fromOption,
        Effect.flatMap(
          Schema.decodeEffect(Schema.fromJsonString(McpToolUnavailable))
        )
      );
      expect({
        attempted: register.mock.calls.length,
        receivers: EffectFunction.pipe(
          register.mock.contexts,
          Array.every((receiver) => receiver === host)
        ),
      }).toStrictEqual({ attempted: toolCount, receivers: true });
      expect({
        declared: {
          failure: declaredFailure,
          isError: declared.isError,
          structured: Option.fromUndefinedOr(declared.structuredContent),
        },
        invalid: {
          detail: replyText(invalid).pipe(
            Option.map((text) => text.startsWith("Invalid input: "))
          ),
          isError: invalid.isError,
        },
        success: {
          isError: success.isError,
          structuredContent: success.structuredContent,
          text: successText,
        },
        unexpected,
      }).toStrictEqual({
        declared: {
          failure: unavailable,
          isError: true,
          structured: Option.none(),
        },
        invalid: { detail: Option.some(true), isError: true },
        success: {
          isError: false,
          structuredContent: { primaryNavigation: [] },
          text: { primaryNavigation: [] },
        },
        unexpected: {
          content: [{ text: "The tool call failed.", type: "text" }],
          isError: true,
        },
      });
    }).pipe(Effect.scoped)
);
it.effect(
  "a cancelled call is interrupted and closing the Scope unregisters every tool",
  () =>
    Effect.gen(function* () {
      const register = vi
        .fn<WebMCP.ModelContext["registerTool"]>()
        .mockResolvedValue();
      yield* installHost({
        document: { modelContext: { registerTool: register } },
      });
      const started = vi.fn<() => void>();
      const cancelled = vi.fn<() => void>();
      // The agent's JSON arguments for a valid calculation.
      const calculationInput = yield* Schema.encodeEffect(
        Schema.toCodecJson(
          TaxKitMcpToolkit.tools.taxkit_calculate.parametersSchema
        )
      )(CalculationRequest).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(Schema.JsonObject))
      );
      const open = yield* Effect.scoped(
        Effect.gen(function* () {
          yield* registerWebMcpTools.pipe(
            Effect.provide(
              Layer.mergeAll(HostLive, ResultHandlers({ cancelled, started }))
            )
          );
          const controller = new AbortController();
          const pending = yield* execute({
            input: calculationInput,
            signal: controller.signal,
            tool: yield* registeredTool({ name: "taxkit_calculate", register }),
          }).pipe(Effect.exit, Effect.forkScoped);
          yield* Effect.sync(() => started.mock.calls.length).pipe(
            Effect.repeat({
              until: (observed) => observed === 1,
              schedule: Schedule.spaced("50 millis"),
            }),
            Effect.timeout(1000),
            TestClock.withLive
          );
          controller.abort();
          const outcome = yield* Fiber.join(pending);
          return {
            interrupted: Exit.isFailure(outcome),
            registered: EffectFunction.pipe(
              register.mock.calls,
              Array.map(([, options]) => Option.fromNullishOr(options?.signal))
            ),
          };
        })
      );
      expect({
        cancelled: cancelled.mock.calls.length,
        interrupted: open.interrupted,
        unregistered: EffectFunction.pipe(
          open.registered,
          Array.every(Option.exists(({ aborted }) => aborted))
        ),
      }).toStrictEqual({ cancelled: 1, interrupted: true, unregistered: true });
    }).pipe(Effect.scoped)
);
