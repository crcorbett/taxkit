import {
  CalculatorClientRateKey,
  CalculatorRequestRateKey,
} from "@taxkit/api-rpc/rate-identity";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { ContentService } from "@taxkit/content/service";
import { DurableObject, DurableObjectState } from "alchemy/Cloudflare/Workers";
import { safeHttpEffect } from "alchemy/Http";
import type { HttpEffect } from "alchemy/Http";
import type { RuntimeContext } from "alchemy/RuntimeContext";
import {
  Context,
  DateTime,
  Effect,
  Exit,
  Layer,
  Option,
  Redacted,
  Ref,
  Schema,
  Scope,
  Semaphore,
  SynchronizedRef,
} from "effect";
import { McpProtocol } from "effect/ai";
import {
  Headers,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { NetAddress } from "effect/net";

import { McpRequestAbortSignal } from "./mcp-request.service.js";
import { withBoundedMcpReply } from "./mcp-response.boundary.js";
import {
  McpSessionId,
  McpSessionInitialisationLimit,
  McpSessionLifetime,
  McpSessionRequestLimit,
} from "./mcp.schemas.js";
import { TaxKitMcpHttpLayer } from "./mcp.tools.layer.js";
import { ApiSafeTelemetryLive } from "./worker-telemetry.layer.js";
import { ApiWorkerSettingsConfig } from "./worker.config.js";

// The plain/in-process host keeps its modern-only composition. Only the
// native composition supplies the private, stage-bound session namespace.
export const McpSessionHost = Context.Reference<
  Option.Option<{ readonly fetch: HttpEffect }>
>("@taxkit/api/McpSessionHost", { defaultValue: Option.none });

class TaxKitMcpSessions extends DurableObject<
  TaxKitMcpSessions,
  { readonly fetch: HttpEffect<RuntimeContext> }
>()("TaxKitMcpSessions") {}

const SessionRateHeader = "x-taxkit-mcp-calculator-key";

// SDK registration captures these existing services. The SDK reconstructs
// their graph in its native isolate; this is not a second implementation or
// a global work pool. Native protocol parsing/session maps remain native.
export const McpSessionHostLive = Layer.effect(
  McpSessionHost,
  Effect.gen(function* () {
    const settings = yield* Effect.cached(ApiWorkerSettingsConfig);
    const telemetry = yield* Layer.build(ApiSafeTelemetryLive);
    const calculator = Layer.succeed(
      PublicCalculatorService,
      yield* PublicCalculatorService
    );
    const content = Layer.succeed(ContentService, yield* ContentService);
    const namespace = yield* TaxKitMcpSessions.pipe(
      Effect.provide(
        TaxKitMcpSessions.make(
          Effect.gen(function* () {
            const state = yield* DurableObjectState;
            return Effect.gen(function* () {
              // A whole native host Scope is the supported expiry boundary. The
              // adapter provides no public per-session removal operation.
              const makeHost = Effect.gen(function* () {
                const config = yield* settings.pipe(Effect.orDie);
                const expires = DateTime.addDuration(
                  yield* DateTime.now,
                  McpSessionLifetime
                );
                const scope = yield* Scope.make();
                return yield* Effect.gen(function* () {
                  const handler = yield* HttpRouter.toHttpEffect(
                    TaxKitMcpHttpLayer(
                      config.websiteOrigin,
                      McpProtocol.v2025_11_25
                    ).pipe(Layer.provide(calculator), Layer.provide(content))
                  ).pipe(
                    Scope.provide(scope),
                    Effect.provideContext(telemetry),
                    Effect.orDie
                  );
                  const initialisations = yield* Ref.make(0);
                  // Only the expiry timestamp is stored by the native alarm API.
                  yield* state.storage.setAlarm(
                    DateTime.toEpochMillis(expires)
                  );
                  return { expires, handler, initialisations, scope } as const;
                }).pipe(
                  Effect.onExit((exit) =>
                    Exit.isFailure(exit)
                      ? Scope.close(scope, exit)
                      : Effect.void
                  )
                );
              }).pipe(
                Effect.updateContext(
                  (context: Context.Context<RuntimeContext>) =>
                    Context.omit(
                      CalculatorRequestRateKey,
                      McpRequestAbortSignal,
                      HttpServerRequest.HttpServerRequest
                    )(context)
                )
              );
              const host = yield* SynchronizedRef.make(
                Option.none<Effect.Success<typeof makeHost>>()
              );
              const requests = yield* Semaphore.make(McpSessionRequestLimit);
              const expire = Effect.gen(function* () {
                const now = yield* DateTime.now;
                return yield* SynchronizedRef.modifyEffect(host, (current) =>
                  Option.match(current, {
                    onNone: () =>
                      Effect.succeed([undefined, Option.none()] as const),
                    onSome: (value) =>
                      DateTime.isGreaterThanOrEqualTo(now, value.expires)
                        ? Scope.close(value.scope, Exit.void).pipe(
                            Effect.as([undefined, Option.none()] as const)
                          )
                        : state.storage
                            .setAlarm(DateTime.toEpochMillis(value.expires))
                            .pipe(Effect.as([undefined, current] as const)),
                  })
                );
              });

              const fetch = Effect.gen(function* () {
                const request = yield* HttpServerRequest.HttpServerRequest;
                const config = yield* settings.pipe(Effect.orDie);
                if (
                  new URL(request.url, config.apiOrigin).pathname !== "/mcp"
                ) {
                  return HttpServerResponse.empty({ status: 404 });
                }
                // Origin refusal precedes admission and native state allocation.
                const origin = Headers.get(request.headers, "origin");
                if (
                  Option.isSome(origin) &&
                  origin.value !== config.websiteOrigin.origin
                ) {
                  return HttpServerResponse.empty({ status: 403 });
                }
                const rawId = Headers.get(request.headers, "mcp-session-id");
                if (
                  Option.isSome(rawId) &&
                  Option.isNone(
                    Schema.decodeUnknownOption(McpSessionId)(rawId.value)
                  )
                ) {
                  return HttpServerResponse.empty({ status: 404 });
                }
                // Native session streams/subscriptions are outside this closed
                // tool contract. POST cancellation notifications still work.
                if (request.method !== "POST") {
                  return HttpServerResponse.empty({ status: 405 });
                }
                const now = yield* DateTime.now;
                const selected = yield* SynchronizedRef.modifyEffect(
                  host,
                  (current) =>
                    Effect.gen(function* () {
                      if (
                        Option.isSome(current) &&
                        DateTime.isGreaterThanOrEqualTo(
                          now,
                          current.value.expires
                        )
                      ) {
                        yield* Scope.close(current.value.scope, Exit.void);
                      }
                      const active = Option.filter(current, (value) =>
                        DateTime.isLessThan(now, value.expires)
                      );
                      if (Option.isSome(active)) {
                        return [active, active] as const;
                      }
                      // An expired/unknown conversation cannot create a host.
                      if (Option.isSome(rawId)) {
                        return [Option.none(), Option.none()] as const;
                      }
                      const created = Option.some(yield* makeHost);
                      return [created, created] as const;
                    })
                );
                if (Option.isNone(selected)) {
                  return HttpServerResponse.empty({ status: 404 });
                }
                const active = selected.value;
                if (Option.isNone(rawId)) {
                  const admitted = yield* Ref.modify(
                    active.initialisations,
                    (count) =>
                      count < McpSessionInitialisationLimit
                        ? ([true, count + 1] as const)
                        : ([false, count] as const)
                  );
                  if (!admitted) {
                    return HttpServerResponse.empty({
                      headers: {
                        "retry-after": String(
                          Math.max(
                            1,
                            Math.ceil(
                              (DateTime.toEpochMillis(active.expires) -
                                DateTime.toEpochMillis(now)) /
                                1000
                            )
                          )
                        ),
                      },
                      status: 429,
                    });
                  }
                }
                const key = Headers.get(
                  request.headers,
                  SessionRateHeader
                ).pipe(
                  Option.flatMap(
                    Schema.decodeUnknownOption(CalculatorClientRateKey)
                  )
                );
                return yield* withBoundedMcpReply(active.handler).pipe(
                  Effect.provideService(CalculatorRequestRateKey, key),
                  Effect.provideService(
                    McpRequestAbortSignal,
                    Schema.decodeUnknownOption(Schema.instanceOf(Request))(
                      request.source
                    ).pipe(Option.map((source) => source.signal))
                  )
                );
              }).pipe(
                requests.withPermitsIfAvailable(1),
                Effect.map(
                  Option.getOrElse(() =>
                    HttpServerResponse.empty({ status: 503 })
                  )
                ),
                safeHttpEffect,
                Effect.provideContext(telemetry)
              );
              return {
                alarm: () => expire,
                fetch,
              };
            });
          })
        )
      )
    );
    const fetch = Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const key = yield* CalculatorRequestRateKey;
      const headers = Headers.remove(request.headers, SessionRateHeader);
      const trusted = Option.isSome(key)
        ? Headers.set(
            headers,
            SessionRateHeader,
            NetAddress.formatIp(Redacted.value(key.value))
          )
        : headers;
      return yield* namespace
        .getByName("legacy-mcp-v2025-11-25")
        .fetch(request.modify({ headers: trusted }));
    });
    return Option.some({ fetch });
  })
);
