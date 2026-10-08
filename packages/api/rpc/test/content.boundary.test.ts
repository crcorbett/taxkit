import { describe, expect, it } from "@effect/vitest";
import { DocsSourceError } from "@taxkit/content/errors";
import { ContentDiscoveryLive, ContentServiceLive } from "@taxkit/content/live";
import { DocsPublicPagePath } from "@taxkit/content/schemas";
import {
  ContentCatalogue,
  ContentDiscovery,
  ContentService,
} from "@taxkit/content/service";
import {
  exampleContentCatalogue,
  exampleDiscoverySettings,
} from "@taxkit/content/testing/fixtures";
import {
  Array,
  Cause,
  Effect,
  Exit,
  Layer,
  Option,
  Ref,
  Result,
  Schema,
  Stream,
} from "effect";
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { RpcClient, RpcSerialization } from "effect/rpc";

import { CalculatorFixture } from "../src/__testing__/fixtures.js";
import {
  DocsDiscoveryUnavailable,
  DocsPageUnavailable,
  DocsSearchUnavailable,
  DocsRpcClientError,
  DocsRpcInvalidResponse,
  DocsRpcResponseTooLarge,
  DocsRpcUnavailable,
  DocsRpcVersionMismatch,
} from "../src/content.errors.js";
import { DocsRpcGroup } from "../src/content.group.js";
import { DocsRpcClientLive } from "../src/content.live.layer.js";
import { DocsRpcVersion } from "../src/content.schemas.js";
import { DocsRpcClient } from "../src/content.service.js";
import { DocsRpcClientTest } from "../src/content.test.layer.js";
import { CalculatorRpcOrigin } from "../src/schemas.js";
import { TaxKitRpcHttpLayer } from "../src/server.js";
import {
  DocsRpcOperationCases,
  docsPath,
  docsTerm,
} from "./content.fixture.js";

const origin = Schema.decodeResult(CalculatorRpcOrigin)(
  "https://api.example.com"
).pipe(Result.getOrThrowWith(() => new Error("Invalid fixture origin")));
const missing = Schema.decodeResult(DocsPublicPagePath)("/start/missing").pipe(
  Result.getOrThrowWith(() => new Error("Invalid fixture missing address"))
);
const ContentLive = Layer.merge(
  ContentServiceLive,
  ContentDiscoveryLive(exampleDiscoverySettings.pipe(Effect.orDie))
).pipe(Layer.provide(Layer.effect(ContentCatalogue, exampleContentCatalogue)));
const NativeSuccess = Schema.TaggedStruct("Success", { value: Schema.Unknown });
const NativeExit = Schema.TaggedStruct("Exit", {
  exit: NativeSuccess,
  requestId: Schema.Unknown,
});

const makeTransport = Effect.gen(function* () {
  const content = yield* ContentService;
  const discovery = yield* ContentDiscovery;
  const handler = yield* HttpRouter.toHttpEffect(
    TaxKitRpcHttpLayer.pipe(
      Layer.provide([
        CalculatorFixture("success"),
        Layer.succeed(ContentService, content),
        Layer.succeed(ContentDiscovery, discovery),
      ])
    )
  );
  return HttpClient.make((request, url) => {
    expect(url.pathname).toBe("/rpc");
    expect(request.method).toBe("POST");
    expect(request.headers).not.toHaveProperty("traceparent");
    expect(request.headers).not.toHaveProperty("b3");
    return handler.pipe(
      Effect.provideService(
        HttpServerRequest.HttpServerRequest,
        HttpServerRequest.fromClientRequest(request)
      ),
      Effect.map((response) =>
        HttpServerResponse.toClientResponse(response, { request })
      ),
      Effect.orDie,
      Effect.scoped
    );
  });
});

describe("checked documentation native RPC", () => {
  it.effect(
    "rejects a valid document for a different requested discovery address",
    () =>
      Effect.gen(function* () {
        const native = yield* makeTransport.pipe(Effect.provide(ContentLive));
        const transport = native.pipe(
          HttpClient.transformResponse(
            Effect.flatMap((response) =>
              response.text.pipe(
                Effect.map((text) => {
                  expect(text).toContain('"path":"/sitemap.xml"');
                  expect(text).toContain('"contentType":"application/xml"');
                  return HttpClientResponse.fromWeb(
                    response.request,
                    new Response(
                      text
                        .replace(
                          '"path":"/sitemap.xml"',
                          '"path":"/robots.txt"'
                        )
                        .replace(
                          '"contentType":"application/xml"',
                          '"contentType":"text/plain"'
                        ),
                      { headers: response.headers, status: response.status }
                    )
                  );
                })
              )
            )
          )
        );
        const error = yield* DocsRpcClient.pipe(
          Effect.flatMap((client) => client.getDiscovery("/sitemap.xml")),
          Effect.flip,
          Effect.provide(
            DocsRpcClientLive(origin).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
            )
          )
        );
        expect(error).toEqual(new DocsRpcInvalidResponse());
      }).pipe(Effect.scoped)
  );
  it.effect(
    "projects a private discovery failure to fixed public guidance",
    () =>
      Effect.gen(function* () {
        const transport = yield* makeTransport.pipe(
          Effect.provide(
            Layer.succeed(
              ContentDiscovery,
              ContentDiscovery.of({
                getDocument: () =>
                  Effect.fail(
                    new DocsSourceError({
                      message: "PRIVATE9",
                      operation: "getDiscoveryDocument",
                    })
                  ),
              })
            )
          ),
          Effect.provide(ContentLive)
        );
        const error = yield* DocsRpcClient.pipe(
          Effect.flatMap((client) => client.getDiscovery("/sitemap.xml")),
          Effect.flip,
          Effect.provide(
            DocsRpcClientLive(origin).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
            )
          )
        );
        expect(error).toEqual(
          new DocsDiscoveryUnavailable({
            message: "Documentation discovery is temporarily unavailable.",
          })
        );
      }).pipe(Effect.scoped)
  );
  it.effect.each(
    Array.flatMap(DocsRpcOperationCases, (operation) =>
      Array.map([400, 408, 413, 429, 500, 503] as const, (status) => ({
        ...operation,
        status,
      }))
    )
  )(
    "rejects HTTP $status for $operation before reading its body",
    ({ invoke, status }) =>
      Effect.gen(function* () {
        const bodyRead = yield* Ref.make(false);
        const transport = HttpClient.make((request) =>
          Effect.succeed(
            HttpServerResponse.toClientResponse(
              HttpServerResponse.stream(
                Stream.fromEffect(
                  Ref.set(bodyRead, true).pipe(Effect.andThen(Effect.never))
                ),
                { status }
              ),
              { request }
            )
          )
        );
        const error = yield* DocsRpcClient.pipe(
          Effect.flatMap(invoke),
          Effect.flip,
          Effect.provide(
            DocsRpcClientLive(origin).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
            )
          )
        );
        expect(error).toEqual(new DocsRpcUnavailable());
        expect(yield* Ref.get(bodyRead)).toBe(false);
      })
  );

  it.effect.each(
    Array.flatMap(DocsRpcOperationCases, (operation) =>
      Array.map([204, 205] as const, (status) => ({ ...operation, status }))
    )
  )(
    "rejects an empty HTTP $status reply to $operation as invalid data",
    ({ invoke, status }) =>
      Effect.gen(function* () {
        const transport = HttpClient.make((request) =>
          Effect.succeed(
            HttpServerResponse.toClientResponse(
              HttpServerResponse.empty({ status }),
              { request }
            )
          )
        );
        const error = yield* DocsRpcClient.pipe(
          Effect.flatMap(invoke),
          Effect.flip,
          Effect.provide(
            DocsRpcClientLive(origin).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
            )
          )
        );
        expect(error).toEqual(new DocsRpcInvalidResponse());
      })
  );

  it.effect(
    "reads navigation, the complete page, exact Markdown and search from the owning content service",
    () =>
      Effect.gen(function* () {
        const catalogue = yield* exampleContentCatalogue;
        const page = Array.head(catalogue.pages).pipe(
          Option.getOrElse(() => expect.fail("Missing controlled page"))
        );
        const transport = yield* makeTransport.pipe(
          Effect.provide(ContentLive)
        );
        yield* Effect.gen(function* () {
          const client = yield* DocsRpcClient;
          expect(yield* client.getNavigation()).toEqual(catalogue.navigation);
          expect(yield* client.getPage(docsPath)).toEqual(page);
          expect(yield* client.getMarkdown(docsPath)).toBe(page.markdown);
          const discovery = yield* client.getDiscovery("/sitemap.xml");
          expect(discovery.body).toContain(
            "https://website.example.com/start/overview"
          );
          expect(discovery.path).toBe("/sitemap.xml");
          const results = yield* client.searchPages(docsTerm);
          expect(results).toHaveLength(1);
          expect(
            Array.head(results).pipe(Option.map((result) => result.path))
          ).toEqual(Option.some(docsPath));
        }).pipe(
          Effect.provide(
            DocsRpcClientLive(origin).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
            )
          )
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "provides the same checked values through the explicit test Layer",
    () =>
      Effect.gen(function* () {
        const client = yield* DocsRpcClient;
        expect((yield* client.getPage(docsPath)).path).toBe(docsPath);
        expect(yield* client.getMarkdown(docsPath)).toContain("# Start here");
        expect((yield* client.getNavigation()).primaryNavigation).toHaveLength(
          1
        );
        expect(yield* client.searchPages(docsTerm)).toHaveLength(1);
      }).pipe(
        Effect.provide(DocsRpcClientTest.pipe(Layer.provide(ContentLive)))
      )
  );

  it.effect.each(DocsRpcOperationCases)(
    "checks its own version for $operation",
    ({ nativeInvoke }) =>
      Effect.gen(function* () {
        const transport = yield* makeTransport.pipe(
          Effect.provide(ContentLive)
        );
        const client = yield* RpcClient.make(DocsRpcGroup, {
          disableTracing: true,
        }).pipe(
          Effect.provide(
            RpcClient.layerProtocolHttp({ url: "" }).pipe(
              Layer.provide([
                Layer.succeed(
                  HttpClient.HttpClient,
                  transport.pipe(
                    HttpClient.mapRequest(
                      HttpClientRequest.setUrl(`${origin.origin}/rpc`)
                    )
                  )
                ),
                RpcSerialization.layerJson,
              ])
            )
          )
        );
        expect(
          yield* nativeInvoke(client, "outdated").pipe(
            Effect.provideService(HttpClient.TracerDisabledWhen, () => true),
            Effect.flip
          )
        ).toEqual(new DocsRpcVersionMismatch());
        yield* nativeInvoke(client, DocsRpcVersion).pipe(
          Effect.provideService(HttpClient.TracerDisabledWhen, () => true)
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "projects missing-page and source failures to fixed public errors",
    () =>
      Effect.gen(function* () {
        const real = yield* ContentService.pipe(Effect.provide(ContentLive));
        const handler = yield* HttpRouter.toHttpEffect(
          TaxKitRpcHttpLayer.pipe(
            Layer.provide(CalculatorFixture("success")),
            Layer.provide(
              Layer.succeed(
                ContentService,
                ContentService.of({
                  ...real,
                  searchPages: () =>
                    Effect.fail(
                      new DocsSourceError({
                        message: "private-content-canary",
                        operation: "searchPages",
                      })
                    ),
                })
              )
            ),
            Layer.provide(ContentLive)
          )
        );
        const transport = HttpClient.make((request) =>
          handler.pipe(
            Effect.provideService(
              HttpServerRequest.HttpServerRequest,
              HttpServerRequest.fromClientRequest(request)
            ),
            Effect.map((response) =>
              HttpServerResponse.toClientResponse(response, { request })
            ),
            Effect.orDie,
            Effect.scoped
          )
        );
        yield* Effect.gen(function* () {
          const client = yield* DocsRpcClient;
          const pageError = yield* client.getPage(missing).pipe(Effect.flip);
          const markdownError = yield* client
            .getMarkdown(missing)
            .pipe(Effect.flip);
          const searchError = yield* client
            .searchPages(docsTerm)
            .pipe(Effect.flip);
          expect(pageError).toEqual(
            new DocsPageUnavailable({
              message: "The documentation page was not found.",
            })
          );
          expect(markdownError).toEqual(pageError);
          expect(searchError).toEqual(
            new DocsSearchUnavailable({
              message: "Documentation search is temporarily unavailable.",
            })
          );
          yield* Effect.forEach(
            [pageError, markdownError, searchError],
            (error) =>
              Schema.encodeEffect(Schema.fromJsonString(DocsRpcClientError))(
                error
              ).pipe(
                Effect.tap((wire) =>
                  Effect.sync(() => {
                    expect(wire).not.toContain("private-content-canary");
                    expect(wire).not.toContain(missing);
                    expect(wire).not.toContain("stack");
                  })
                )
              )
          );
        }).pipe(
          Effect.provide(
            DocsRpcClientLive(origin).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
            )
          )
        );
      }).pipe(Effect.scoped)
  );

  it.effect.each(
    Array.flatMap(DocsRpcOperationCases, (operation) => [
      { ...operation, mode: "json" as const },
      { ...operation, mode: "schema" as const },
    ])
  )(
    "rejects broken $mode replies to $operation without exposing their body",
    ({ mode, invoke, operation }) =>
      Effect.gen(function* () {
        const transport = HttpClient.make((request) =>
          Effect.gen(function* () {
            const incoming = yield* HttpServerRequest.fromClientRequest(
              request
            ).text.pipe(
              Effect.flatMap(
                Schema.decodeUnknownEffect(
                  Schema.fromJsonString(
                    Schema.Struct({
                      id: Schema.Union([Schema.String, Schema.Finite]),
                    })
                  )
                )
              )
            );
            const reply =
              mode === "json"
                ? "{"
                : yield* Schema.encodeEffect(
                    Schema.fromJsonString(Schema.Unknown)
                  )([
                    NativeExit.make({
                      exit: NativeSuccess.make({
                        value:
                          operation === "getMarkdown"
                            ? 123
                            : "private-content-canary",
                      }),
                      requestId: incoming.id,
                    }),
                  ]);
            return HttpServerResponse.toClientResponse(
              HttpServerResponse.text(reply, {
                contentType: "application/json",
              }),
              { request }
            );
          }).pipe(Effect.orDie)
        );
        const error = yield* DocsRpcClient.pipe(
          Effect.flatMap(invoke),
          Effect.flip,
          Effect.provide(
            DocsRpcClientLive(origin).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
            )
          )
        );
        expect(error).toEqual(new DocsRpcInvalidResponse());
      })
  );

  it.effect.each(
    Array.flatMap(DocsRpcOperationCases, (operation) => [
      { ...operation, mode: "fatal" as const },
      { ...operation, mode: "mixed" as const },
    ])
  )(
    "contains actual remote $mode defects from $operation in the native wire reply",
    ({ invoke, mode }) =>
      Effect.gen(function* () {
        const wire = yield* Ref.make("");
        const remoteFailure =
          mode === "fatal"
            ? Effect.die("private-content-canary")
            : Effect.failCause(
                Cause.combine(
                  Cause.die("private-content-canary"),
                  Cause.interrupt()
                )
              );
        const native = yield* makeTransport.pipe(
          Effect.provide(
            Layer.merge(
              Layer.succeed(
                ContentService,
                ContentService.of({
                  getNavigation: () => remoteFailure,
                  getPage: () => remoteFailure,
                  listPages: () => remoteFailure,
                  searchPages: () => remoteFailure,
                })
              ),
              Layer.succeed(
                ContentDiscovery,
                ContentDiscovery.of({
                  getDocument: () => remoteFailure,
                })
              )
            )
          )
        );
        const transport = native.pipe(
          HttpClient.transformResponse(
            Effect.flatMap((response) =>
              response.text.pipe(
                Effect.tap((text) => Ref.set(wire, text)),
                Effect.map((text) =>
                  HttpClientResponse.fromWeb(
                    response.request,
                    new Response(text, {
                      headers: response.headers,
                      status: response.status,
                    })
                  )
                )
              )
            )
          )
        );
        const exit = yield* DocsRpcClient.pipe(
          Effect.flatMap(invoke),
          Effect.exit,
          Effect.provide(
            DocsRpcClientLive(origin).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
            )
          )
        );
        const safeDefect =
          mode === "fatal"
            ? "Calculation service failed"
            : "Documentation service failed";
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          expect(Cause.hasFails(exit.cause)).toBe(false);
          expect(
            Result.match(Cause.findDie(exit.cause), {
              onFailure: () => false,
              onSuccess: (reason) => reason.defect === safeDefect,
            })
          ).toBe(true);
        }
        const reply = yield* Ref.get(wire);
        expect(reply).toContain(safeDefect);
        expect(reply).not.toContain("private-content-canary");
        expect(reply).not.toContain("stack");
      }).pipe(Effect.scoped)
  );

  it.effect.each(DocsRpcOperationCases)(
    "accepts a complete valid native reply at exactly 2 MiB for $operation",
    ({ invoke }) =>
      Effect.gen(function* () {
        const released = yield* Ref.make(false);
        const native = yield* makeTransport.pipe(Effect.provide(ContentLive));
        const transport = native.pipe(
          HttpClient.transformResponse(
            Effect.flatMap((response) =>
              response.text.pipe(
                Effect.map((text) =>
                  HttpServerResponse.toClientResponse(
                    HttpServerResponse.stream(
                      Stream.succeed(
                        new TextEncoder().encode(
                          text +
                            " ".repeat(
                              2 * 1024 * 1024 -
                                new TextEncoder().encode(text).byteLength
                            )
                        )
                      ).pipe(Stream.ensuring(Ref.set(released, true))),
                      { contentType: "application/json" }
                    ),
                    { request: response.request }
                  )
                )
              )
            )
          )
        );
        yield* DocsRpcClient.pipe(
          Effect.flatMap(invoke),
          Effect.provide(
            DocsRpcClientLive(origin).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
            )
          )
        );
        expect(yield* Ref.get(released)).toBe(true);
      }).pipe(Effect.scoped)
  );

  it.effect.each(DocsRpcOperationCases)(
    "preserves an unrelated adapter defect for $operation",
    ({ invoke }) =>
      Effect.gen(function* () {
        const original = yield* Schema.decodeUnknownEffect(Schema.String)(
          123
        ).pipe(Effect.flip);
        const transport = HttpClient.make(() => Effect.die(original));
        const exit = yield* DocsRpcClient.pipe(
          Effect.flatMap(invoke),
          Effect.exit,
          Effect.provide(
            DocsRpcClientLive(origin).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
            )
          )
        );
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          expect(Cause.hasFails(exit.cause)).toBe(false);
          expect(
            Result.match(Cause.findDie(exit.cause), {
              onFailure: () => false,
              onSuccess: (reason) => reason.defect === original,
            })
          ).toBe(true);
        }
      })
  );

  it.effect.each(
    Array.flatMap(DocsRpcOperationCases, (operation) => [
      { ...operation, representation: "chunks" as const },
      { ...operation, representation: "utf-8" as const },
    ])
  )(
    "bounds $representation replies to $operation and closes them before the unread tail",
    ({ invoke, representation }) =>
      Effect.gen(function* () {
        const tailRead = yield* Ref.make(false);
        const released = yield* Ref.make(false);
        const first =
          representation === "chunks"
            ? Stream.make(
                new Uint8Array(1024 * 1024),
                new Uint8Array(1024 * 1024 + 1)
              )
            : Stream.succeed(
                new TextEncoder().encode("é".repeat(1024 * 1024 + 1))
              );
        const source = first.pipe(
          Stream.concat(
            Stream.fromEffect(
              Ref.set(tailRead, true).pipe(Effect.as(new Uint8Array([1])))
            )
          ),
          Stream.ensuring(Ref.set(released, true))
        );
        const transport = HttpClient.make((request) =>
          Effect.succeed(
            HttpServerResponse.toClientResponse(
              HttpServerResponse.stream(source, {
                contentType: "application/json",
                headers: { "content-length": "1" },
              }),
              { request }
            )
          )
        );
        const error = yield* DocsRpcClient.pipe(
          Effect.flatMap(invoke),
          Effect.flip,
          Effect.provide(
            DocsRpcClientLive(origin).pipe(
              Layer.provide(Layer.succeed(HttpClient.HttpClient, transport))
            )
          )
        );
        expect(error).toEqual(new DocsRpcResponseTooLarge());
        expect(yield* Ref.get(tailRead)).toBe(false);
        expect(yield* Ref.get(released)).toBe(true);
      })
  );
});
