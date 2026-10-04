import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it } from "@effect/vitest";
import {
  Deferred,
  Effect,
  Fiber,
  Layer,
  Ref,
  Result,
  Schema,
  Stream,
} from "effect";
import {
  FetchHttpClient,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import {
  CloudflareHostedProof,
  HostedProofAssetPropagationError,
  HostedProofExecutionError,
  PropagationRequest,
} from "./cloudflare-hosted-proof.boundary.js";
import { CloudflareHostedProofLive } from "./cloudflare-hosted-proof.live.layer.js";

const proofLayer = CloudflareHostedProofLive.pipe(
  Layer.provide(Layer.merge(BunServices.layer, FetchHttpClient.layer))
);
const serverLayer = BunHttpServer.layer({ hostname: "127.0.0.1", port: 0 });
const fixtureHtml =
  '<html><head><script defer src="/assets/route-ABC123xy.js"></script></head><body><main id="docs-main"></main></body></html>';
const fixtureScript =
  'globalThis.__TSR_ROUTER__={navigate:()=>Promise.resolve()};document.querySelector("main").dataset.tkHydrated="true";document.querySelector("main").dataset.tkNavigationInteractive="true";';

it.live.each(["temporary", "permanent"] as const)(
  "handles a %s missing JavaScript asset within the allowed attempts",
  (mode) =>
    Effect.gen(function* () {
      const assetRequests = yield* Ref.make(0);
      const server = yield* HttpServer.HttpServer;
      yield* server.serve(
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest;
          if (request.url === "/guide") {
            return HttpServerResponse.html(fixtureHtml);
          }
          if (request.url === "/assets/route-ABC123xy.js") {
            const count = yield* Ref.updateAndGet(
              assetRequests,
              (value) => value + 1
            );
            if (mode === "temporary" && count > 1) {
              return HttpServerResponse.text(fixtureScript, {
                contentType: "text/javascript",
              });
            }
          }
          return HttpServerResponse.text("Missing", { status: 404 });
        })
      );
      const config = yield* Schema.decodeEffect(PropagationRequest)({
        attempts: mode === "temporary" ? 3 : 2,
        delayMs: 10,
        hydrationTimeoutMs: 200,
        origin: HttpServer.formatAddress(server.address),
      });
      const proof = yield* CloudflareHostedProof;
      const result = yield* proof
        .verifyAssetPropagation(config)
        .pipe(Effect.result);
      expect(yield* Ref.get(assetRequests)).toBe(2);
      if (mode === "temporary") {
        expect(result).toEqual(
          Result.succeed({ diagnostics: [], retries: 1, routerPresent: true })
        );
      } else {
        expect(result).toEqual(
          Result.fail(
            new HostedProofAssetPropagationError({
              reason: "missing-script-asset",
            })
          )
        );
      }
    }).pipe(Effect.provide(Layer.merge(proofLayer, serverLayer))),
  10_000
);

// These cases exercise the installed browser adapter, not a fabricated service.
it.live.each([
  "private-diagnostic",
  "event-overflow",
  "missing-router",
] as const)(
  "refuses %s without exposing browser failure data",
  (mode) =>
    Effect.gen(function* () {
      const server = yield* HttpServer.HttpServer;
      yield* server.serve(
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest;
          if (request.url === "/guide") {
            const script =
              mode === "missing-router"
                ? 'console.error("private-upstream-value")'
                : `${fixtureScript};${mode === "event-overflow" ? 'for(let i=0;i<1100;i++){console.error("private-upstream-value")}' : 'console.error("private-upstream-value")'}`;
            return HttpServerResponse.html(
              `<html><body><main id="docs-main"></main><script>${script}</script></body></html>`
            );
          }
          return HttpServerResponse.text("Missing", { status: 404 });
        })
      );
      const proof = yield* CloudflareHostedProof;
      const config = yield* Schema.decodeEffect(PropagationRequest)({
        attempts: 2,
        delayMs: 10,
        hydrationTimeoutMs: 200,
        origin: HttpServer.formatAddress(server.address),
      });
      const result = yield* proof
        .verifyAssetPropagation(config)
        .pipe(Effect.result);
      expect(result).toEqual(
        Result.fail(
          new HostedProofExecutionError({ operation: "browser-proof" })
        )
      );
      const error = yield* Result.getFailure(result).pipe(Effect.fromOption);
      const encoded = yield* Schema.encodeEffect(
        Schema.fromJsonString(
          Schema.Union([
            HostedProofExecutionError,
            HostedProofAssetPropagationError,
          ])
        )
      )(error);
      expect(encoded).not.toContain("private-upstream-value");
    }).pipe(Effect.provide(Layer.merge(proofLayer, serverLayer))),
  10_000
);

it.live(
  "interrupting a pending visit closes the browser and retires its real HTTP request",
  () =>
    Effect.gen(function* () {
      const started = yield* Deferred.make<boolean>();
      const retired = yield* Deferred.make<boolean>();
      const server = yield* HttpServer.HttpServer;
      yield* server.serve(
        Effect.succeed(
          HttpServerResponse.stream(
            Stream.concat(
              Stream.succeed(new TextEncoder().encode("<html><body>")),
              Stream.fromEffect(
                Deferred.succeed(started, true).pipe(
                  Effect.andThen(Effect.never),
                  Effect.onInterrupt(() => Deferred.succeed(retired, true))
                )
              )
            ),
            { contentType: "text/html" }
          )
        )
      );
      const proof = yield* CloudflareHostedProof;
      const config = yield* Schema.decodeEffect(PropagationRequest)({
        attempts: 2,
        delayMs: 10,
        hydrationTimeoutMs: 200,
        origin: HttpServer.formatAddress(server.address),
      });
      const fiber = yield* proof
        .verifyAssetPropagation(config)
        .pipe(Effect.forkChild({ startImmediately: true }));
      expect(yield* Deferred.await(started)).toBe(true);
      yield* Fiber.interrupt(fiber);
      expect(
        yield* Deferred.await(retired).pipe(Effect.timeout("5 seconds"))
      ).toBe(true);
    }).pipe(Effect.provide(Layer.merge(proofLayer, serverLayer))),
  10_000
);
