import { CollectionPolicyHeader } from "@taxkit/analytics/schemas";
import {
  applyCachePolicy,
  isBrowserOrigin,
  isPublicReadPath,
  publicCors,
} from "@taxkit/api-http/response-policy";
import { TaxKitApiRoutesLayer } from "@taxkit/api-http/server";
import { CalculatorRpcResponseTooLarge } from "@taxkit/api-rpc/errors";
import { observeHostRequest } from "@taxkit/api-rpc/host-telemetry";
import type { HostRoute } from "@taxkit/api-rpc/host-telemetry";
import {
  CalculatorRpcDeadline,
  CalculatorRpcResponseLimit,
} from "@taxkit/api-rpc/schemas";
import { TaxKitRpcHttpLayer } from "@taxkit/api-rpc/server";
import { CalculatorClientRateKey } from "@taxkit/calculators/admission.schemas";
import { CalculatorRequestRateKey } from "@taxkit/calculators/admission.service";
import { CalculatorId } from "@taxkit/calculators/schemas";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { DocsSourceError } from "@taxkit/content/errors";
import { ContentDiscoveryLive } from "@taxkit/content/live";
import {
  DocsDiscoveryPath,
  DocsDiscoverySettings,
} from "@taxkit/content/schemas";
import {
  ContentCatalogue,
  ContentDiscovery,
  ContentDiscoverySettings,
  ContentService,
} from "@taxkit/content/service";
import { safeHttpEffect } from "alchemy/Http";
import {
  Array,
  ByteSize,
  Config,
  Context,
  Effect,
  Layer,
  Match,
  Option,
  Record,
  Schema,
  Scope,
  Stream,
} from "effect";
import { McpProtocol } from "effect/ai";
import {
  HttpClientRequest,
  HttpClientResponse,
  Headers,
  HttpMiddleware,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import {
  ApiCalculatorDelivery,
  withCalculatorAnalytics,
} from "./analytics-request.boundary.js";
import { ApiCalculatorEvents } from "./calculator-analytics.layer.js";
import {
  CalculatorHostMode,
  calculatorEdgeRateKey,
} from "./edge-identity.boundary.js";
import { McpRequestAbortSignal } from "./mcp-request.service.js";
import { withBoundedMcpReply } from "./mcp-response.boundary.js";
import { McpSessionHost } from "./mcp-session.layer.js";
import { TaxKitMcpHost, TaxKitMcpHttpLayer } from "./mcp.tools.layer.js";
import { withApiRequestBodyLimit } from "./worker-request.boundary.js";
import { ApiSafeTelemetryLive } from "./worker-telemetry.layer.js";
import { ApiWorkerSettingsConfig } from "./worker.config.js";

const calculatePath = /^\/api\/v1\/calculators\/(?<id>[^/]+)\/calculate$/u;

// Exact trusted Website calls: machine RPC and the canonical HTTP calculation.
const isTrustedCalculationPath = (pathname: string) =>
  pathname === "/rpc" ||
  Option.fromNullishOr(calculatePath.exec(pathname)).pipe(
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    Option.flatMap(Record.get("id")),
    Option.exists(Schema.is(CalculatorId))
  );

// The closed route family for the one request record; the raw path, query and
// calculator ID never leave this function.
const apiRoute = (pathname: string): HostRoute =>
  Match.value(pathname).pipe(
    Match.when("/api/health", () => "health" as const),
    Match.when("/rpc", () => "rpc" as const),
    Match.when("/mcp", () => "mcp" as const),
    Match.when(
      (path) => calculatePath.test(path),
      () => "calculate" as const
    ),
    Match.when(
      (path) => path.startsWith("/api/v1/docs/discovery/"),
      () => "discovery" as const
    ),
    Match.when(
      (path) => path === "/api/v1/docs" || path.startsWith("/api/v1/docs/"),
      () => "docs" as const
    ),
    Match.when(
      (path) => path.startsWith("/api/v1/"),
      () => "catalogue" as const
    ),
    Match.when(
      (path) => path === "/api/docs" || path.startsWith("/api/docs/"),
      () => "reference" as const
    ),
    Match.orElse(() => "other" as const)
  );

// The finished public discovery documents. The Website forwards its own
// /sitemap.xml, /robots.txt and /llms*.txt requests here once.
const DiscoveryRoutes = HttpRouter.addAll(
  Array.map(DocsDiscoveryPath.literals, (path) =>
    HttpRouter.route(
      "GET",
      `/api/v1/docs/discovery${path}`,
      ContentDiscovery.pipe(
        Effect.flatMap((discovery) => discovery.getDocument(path)),
        Effect.map((document) =>
          HttpServerResponse.text(document.body, {
            contentType: `${document.contentType}; charset=utf-8`,
            headers: { "x-content-type-options": "nosniff" },
          })
        ),
        Effect.catchTag("DocsSourceError", () =>
          Effect.succeed(HttpServerResponse.empty({ status: 503 }))
        )
      )
    )
  )
);

// Construct once in the native instance scope. Both transports receive this
// same application service; native requests keep their own scope and fibre.
export const ApiWorkerApplication = Effect.gen(function* () {
  const analytics = yield* ApiCalculatorDelivery;
  // Native planning binds deferred resource addresses. Read their runtime
  // values once on first incoming use, without inventing planning URLs.
  const settings = yield* Effect.cached(ApiWorkerSettingsConfig);
  const localKey = yield* Effect.cached(
    Config.schema(CalculatorHostMode, "CALCULATOR_HOST_MODE").pipe(
      Config.withDefault("edge"),
      Effect.flatMap((mode) =>
        mode === "local-emulator"
          ? settings.pipe(
              Effect.flatMap((config) =>
                config.apiOrigin.protocol === "http:" &&
                (config.apiOrigin.hostname === "127.0.0.1" ||
                  config.apiOrigin.hostname === "localhost")
                  ? Schema.decodeEffect(CalculatorClientRateKey)(
                      "127.0.0.1"
                    ).pipe(Effect.map(Option.some))
                  : Effect.succeed(Option.none())
              )
            )
          : Effect.succeed(Option.none())
      ),
      Effect.catchTags({
        ConfigError: () => Effect.succeedNone,
        SchemaError: () => Effect.succeedNone,
      })
    )
  );
  const telemetry = yield* Layer.build(ApiSafeTelemetryLive);
  const calculator = Layer.succeed(
    PublicCalculatorService,
    yield* PublicCalculatorService
  );
  const content = Layer.succeed(ContentService, yield* ContentService);
  const discovery = ContentDiscoveryLive.pipe(
    Layer.provide(
      Layer.succeed(ContentDiscoverySettings)(
        settings.pipe(
          Effect.map((config) =>
            DocsDiscoverySettings.make({
              apiOrigin: config.apiOrigin,
              publicationOrigin: config.publicationOrigin,
            })
          ),
          Effect.mapError(
            () =>
              new DocsSourceError({
                message: "Documentation discovery settings are unavailable.",
                operation: "getDiscoveryDocument",
              })
          )
        )
      )
    ),
    Layer.provide(Layer.succeed(ContentCatalogue, yield* ContentCatalogue))
  );
  const routes = Layer.mergeAll(
    TaxKitApiRoutesLayer,
    TaxKitRpcHttpLayer.pipe(Layer.provide(calculator)),
    DiscoveryRoutes.pipe(HttpRouter.provideRequest(discovery))
  ).pipe(
    Layer.provide(Layer.merge(content, discovery)),
    HttpRouter.provideRequest(calculator)
  );
  const handler = yield* HttpRouter.toHttpEffect(routes).pipe(
    Effect.provideContext(telemetry)
  );
  const instanceScope = yield* Scope.Scope;
  const sessions = yield* McpSessionHost;
  // Build the protocol host once on first use, after native addresses resolve.
  // Retain its fibres in the instance Scope, and keep the first caller's
  // request/key out of registration. Each call receives its own native Context.
  const mcp = yield* Effect.cached(
    settings.pipe(
      Effect.flatMap((config) =>
        HttpRouter.toHttpEffect(
          TaxKitMcpHttpLayer.pipe(
            Layer.provide(calculator),
            Layer.provide(content),
            Layer.provide(
              Layer.succeed(TaxKitMcpHost)({
                protocol: McpProtocol.v2026_07_28,
                publicationOrigin: config.publicationOrigin,
              })
            )
          )
        )
      ),
      Scope.provide(instanceScope),
      Effect.updateContext((context: Context.Context<never>) =>
        Context.omit(
          ApiCalculatorEvents,
          CalculatorRequestRateKey,
          McpRequestAbortSignal,
          HttpServerRequest.HttpServerRequest
        )(context)
      ),
      Effect.provideContext(telemetry),
      Effect.catchTags({
        ConfigError: () =>
          Effect.succeed(
            Effect.succeed(HttpServerResponse.empty({ status: 503 }))
          ),
        IllegalArgumentError: () =>
          Effect.succeed(
            Effect.succeed(HttpServerResponse.empty({ status: 503 }))
          ),
      })
    )
  );

  const fetch = safeHttpEffect(
    Effect.gen(function* () {
      const config = yield* settings;
      const request = yield* HttpServerRequest.HttpServerRequest;
      const isMcp = new URL(request.url, config.apiOrigin).pathname === "/mcp";
      const protocol = Headers.get(request.headers, "mcp-protocol-version");
      const legacy =
        Option.isSome(sessions) &&
        Option.match(protocol, {
          onNone: () => true,
          onSome: (value) => value === "2025-11-25",
        });
      const selected = isMcp
        ? (legacy && Option.isSome(sessions)
            ? Effect.succeed(sessions.value.fetch)
            : mcp
          ).pipe(
            Effect.flatMap(withBoundedMcpReply),
            Effect.provideService(
              McpRequestAbortSignal,
              Schema.decodeUnknownOption(Schema.instanceOf(Request))(
                request.source
              ).pipe(Option.map((original) => original.signal))
            )
          )
        : handler;
      return yield* withCalculatorAnalytics(
        withApiRequestBodyLimit(selected)
      ).pipe(
        Effect.provideService(ApiCalculatorDelivery, analytics),
        // The shared public browser policy for HTTP and RPC, plus the
        // Website's collection header. Remote MCP keeps its own exact
        // browser origin list.
        HttpMiddleware.cors({
          allowedHeaders: isMcp
            ? [
                CollectionPolicyHeader,
                "b3",
                "content-type",
                "mcp-method",
                "mcp-name",
                "mcp-protocol-version",
                "mcp-session-id",
                "traceparent",
              ]
            : [CollectionPolicyHeader, ...publicCors.allowedHeaders],
          allowedMethods: publicCors.allowedMethods,
          allowedOrigins: (origin) =>
            isMcp
              ? origin === config.publicationOrigin.origin
              : isBrowserOrigin(origin),
          credentials: false,
        })
      );
    }).pipe(
      Effect.catchTag("ConfigError", () =>
        Effect.succeed(HttpServerResponse.empty({ status: 503 }))
      )
    )
  ).pipe(
    // Every reply, including native error responses, gets one cache decision.
    Effect.flatMap((response) =>
      HttpServerRequest.HttpServerRequest.pipe(
        Effect.map((request) =>
          applyCachePolicy(response, {
            method: request.method,
            publicRead: isPublicReadPath(
              new URL(request.url, "https://api.invalid").pathname
            ),
          })
        )
      )
    ),
    // One fixed request record per external call or private binding call.
    (reply) =>
      HttpServerRequest.HttpServerRequest.pipe(
        Effect.flatMap((request) =>
          reply.pipe(
            observeHostRequest("taxkit-api", {
              method: request.method,
              route: apiRoute(
                new URL(request.url, "https://api.invalid").pathname
              ),
            })
          )
        )
      ),
    Effect.provideContext(telemetry)
  );

  return {
    // Native service-binding RPC only; this method has no HTTP route. The
    // Website passes its checked original caller key separately from JSON,
    // for exactly the RPC endpoint and the canonical HTTP calculation POST.
    calculatorRequest: (request: Request, encodedKey: string) =>
      Effect.gen(function* () {
        if (
          Option.isNone(
            Schema.decodeUnknownOption(Schema.instanceOf(Request))(request)
          )
        ) {
          return new Response(null, { status: 503 });
        }
        if (
          request.method !== "POST" ||
          !isTrustedCalculationPath(new URL(request.url).pathname)
        ) {
          return new Response(null, { status: 404 });
        }
        const key = Schema.decodeUnknownOption(CalculatorClientRateKey)(
          encodedKey
        );
        // One deadline covers the whole call, including the reply body. The
        // closed JSON reply is buffered before the native method closes its
        // event scope, keeping its real status and headers.
        return yield* fetch.pipe(
          Effect.provideService(CalculatorRequestRateKey, key),
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromWeb(request)
          ),
          Effect.flatMap((response) => {
            const web = HttpServerResponse.toWeb(response);
            // An empty reply (such as an undeclared 400) has no body to read.
            return Option.match(Option.fromNullishOr(web.body), {
              onNone: () =>
                Effect.succeed(
                  new Response(null, {
                    headers: web.headers,
                    status: web.status,
                  })
                ),
              onSome: () =>
                HttpClientResponse.fromWeb(
                  HttpClientRequest.post(request.url),
                  web
                ).stream.pipe(
                  Stream.mapAccumEffect(
                    () => ByteSize.bytes(0),
                    (total, chunk) => {
                      const next = ByteSize.sum(
                        total,
                        ByteSize.bytes(chunk.byteLength)
                      );
                      return ByteSize.isGreaterThan(
                        next,
                        CalculatorRpcResponseLimit
                      )
                        ? Effect.fail(new CalculatorRpcResponseTooLarge())
                        : Effect.succeed([next, [chunk]] as const);
                    }
                  ),
                  Stream.mkUint8Array,
                  Effect.map(
                    (bytes) =>
                      new Response(new Uint8Array(bytes), {
                        headers: web.headers,
                        status: web.status,
                      })
                  )
                ),
            });
          }),
          Effect.timeoutOption(CalculatorRpcDeadline),
          // Only this adapter's body-read, size and deadline failures become
          // 503. Interruption and unexpected defects keep their identity.
          Effect.catchTags({
            CalculatorRpcResponseTooLarge: () => Effect.succeedNone,
            HttpClientError: () => Effect.succeedNone,
          }),
          Effect.map(
            Option.getOrElse(() => new Response(null, { status: 503 }))
          )
        );
      }).pipe(Effect.provideContext(telemetry)),
    fetch: Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const edgeKey = calculatorEdgeRateKey(request.headers);
      const key = Option.isSome(edgeKey) ? edgeKey : yield* localKey;
      return yield* fetch.pipe(
        Effect.provideService(CalculatorRequestRateKey, key)
      );
    }),
  };
});
