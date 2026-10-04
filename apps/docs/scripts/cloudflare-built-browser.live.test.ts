import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it } from "@effect/vitest";
import {
  Array,
  Config,
  Deferred,
  Effect,
  Fiber,
  FileSystem,
  Layer,
  Match,
  Option,
  Path,
  Ref,
  Result,
  Schema,
  Stream,
} from "effect";
import {
  Headers,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import { verifyBuiltBrowser } from "./cloudflare-built-browser.live.js";
import {
  BuiltBrowserInput,
  BuiltProofError,
} from "./cloudflare-built-proof.boundary.js";

const title = "Calculate Australian take-home pay";
const script = `
const main=document.querySelector("main");
const article='<article class="docs-article"><h1>Calculate Australian take-home pay</h1><p>Controlled browser fixture.</p></article>';
main.dataset.tkHydrated="true";
main.dataset.tkNavigationInteractive="true";
window.__TSR_ROUTER__={navigate:({to})=>{
  if(to.includes("missing")){main.innerHTML='<div data-testid="route-not-found">Documentation page not found</div>';return Promise.resolve()}
  main.innerHTML='<div class="docs-route-state" data-testid="route-pending"><h1>Loading documentation</h1><p>Loading fixture.</p></div>';
  return fetch("/_serverFn/guide").then(()=>{main.innerHTML=article})
}};
document.querySelector("#reference").addEventListener("click",event=>{event.preventDefault();fetch("/_serverFn/reference").then(()=>{main.innerHTML='<h1>Reference</h1>'})});
document.querySelector("#skip").addEventListener("click",event=>{event.preventDefault();main.focus()});
document.querySelector("#mobile").addEventListener("click",event=>{event.currentTarget.setAttribute("aria-label","Close navigation");event.currentTarget.setAttribute("aria-expanded","true")});
`;
const html = `<html><head><style>:root,.docs-nav-toggle{background:rgb(255,255,255)}body,.docs-article p,.docs-route-state p,.docs-nav-toggle{color:rgb(0,0,0)}*{animation-name:none;transition-duration:0s}</style><script defer src="/assets/route-ABC123xy.js"></script></head><body><a id="skip" href="#docs-main">Skip to documentation</a><nav aria-label="Documentation"><a id="reference" href="/reference">Reference</a><a href="/guides/calculate-australian-take-home-pay">Calculate Australian take-home pay</a></nav><button class="docs-nav-toggle" id="mobile" aria-label="Open navigation">Menu</button><main id="docs-main" tabindex="-1"><article class="docs-article"><h1>${title}</h1><p>Controlled browser fixture.</p></article></main></body></html>`;

it.live.each([
  {
    mode: "clean",
    name: "checks raw malformed JSON, delayed navigation, screenshots and all browser assertions",
  },
  {
    mode: "private-console",
    name: "rejects private console output without copying it into the safe error",
  },
  {
    mode: "overflow",
    name: "fails closed when the real Chromium event queue overflows",
  },
] as const)(
  "$name",
  ({ mode }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const screenshotDirectory = yield* fs.makeTempDirectoryScoped();
      const requests = yield* Ref.make<readonly string[]>([]);
      const malformedBodies = yield* Ref.make<readonly string[]>([]);
      const server = yield* HttpServer.HttpServer;
      yield* server.serve(
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest;
          yield* Ref.update(requests, (values) =>
            Array.append(values, `${request.method} ${request.url}`)
          );
          if (request.url === "/assets/route-ABC123xy.js") {
            const diagnostics = Match.value(mode).pipe(
              Match.when(
                "private-console",
                () => 'console.error("private-fixture-value");'
              ),
              Match.when(
                "overflow",
                () =>
                  'for(let count=0;count<1100;count++){console.warn("overflow-fixture")}'
              ),
              Match.when("clean", () => ""),
              Match.exhaustive
            );
            return HttpServerResponse.text(`${script}\n${diagnostics}`, {
              contentType: "text/javascript",
            });
          }
          if (request.url.startsWith("/_serverFn/")) {
            const body = request.method === "POST" ? yield* request.text : "";
            if (request.method === "POST") {
              yield* Ref.update(malformedBodies, (values) =>
                Array.append(values, body)
              );
            }
            return HttpServerResponse.text("fixture", {
              status:
                request.method === "POST" &&
                body === "{" &&
                Headers.get(request.headers, "content-type").pipe(
                  Option.contains("application/json")
                )
                  ? 400
                  : 200,
            });
          }
          if (request.url === "/favicon.ico") {
            return HttpServerResponse.empty({ status: 204 });
          }
          return HttpServerResponse.text(html, { contentType: "text/html" });
        })
      );
      const input = yield* Schema.decodeEffect(BuiltBrowserInput)({
        captureScreenshots: mode === "clean",
        environment: {
          PATH: yield* Config.String("PATH"),
          PLAYWRIGHT_BROWSERS_PATH: yield* Config.String(
            "PLAYWRIGHT_BROWSERS_PATH"
          ),
        },
        origin: HttpServer.formatAddress(server.address),
        screenshotDirectory,
      });
      const result = yield* verifyBuiltBrowser(input).pipe(Effect.result);
      if (mode === "clean") {
        expect(yield* Ref.get(malformedBodies)).toEqual(["{"]);
        const observation = yield* Effect.fromResult(result);
        expect(observation.serverFunctionRequests).toBe(2);
        expect(
          Array.map(observation.screenshots, (screenshot) => screenshot.kind)
        ).toEqual(["desktop", "mobile"]);
        yield* Effect.forEach(observation.screenshots, (screenshot) =>
          Effect.gen(function* () {
            expect(
              Number(
                (yield* fs.stat(
                  path.join(
                    screenshotDirectory,
                    screenshot.path.replace("screenshots/", "")
                  )
                )).size
              )
            ).toBeGreaterThan(0);
          })
        );
        expect(yield* Ref.get(requests)).toContain("GET /_serverFn/guide");
      } else {
        expect(result).toEqual(
          Result.fail(
            new BuiltProofError({
              operation: "browser",
              reason: "start-or-read",
            })
          )
        );
      }
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          BunServices.layer,
          BunHttpServer.layer({ hostname: "127.0.0.1", port: 0 })
        )
      )
    ),
  15_000
);

it.live(
  "interrupting a real pending browser response closes Chromium and retires the request",
  () =>
    Effect.gen(function* () {
      const started = yield* Deferred.make<boolean>();
      const retired = yield* Deferred.make<boolean>();
      const fs = yield* FileSystem.FileSystem;
      const screenshotDirectory = yield* fs.makeTempDirectoryScoped();
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
      const input = yield* Schema.decodeEffect(BuiltBrowserInput)({
        captureScreenshots: false,
        environment: {
          PATH: yield* Config.String("PATH"),
          PLAYWRIGHT_BROWSERS_PATH: yield* Config.String(
            "PLAYWRIGHT_BROWSERS_PATH"
          ),
        },
        origin: HttpServer.formatAddress(server.address),
        screenshotDirectory,
      });
      const fiber = yield* verifyBuiltBrowser(input).pipe(
        Effect.scoped,
        Effect.forkChild({ startImmediately: true })
      );
      expect(yield* Deferred.await(started)).toBe(true);
      yield* Fiber.interrupt(fiber);
      expect(
        yield* Deferred.await(retired).pipe(Effect.timeout("5 seconds"))
      ).toBe(true);
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          BunServices.layer,
          BunHttpServer.layer({ hostname: "127.0.0.1", port: 0 })
        )
      )
    ),
  10_000
);
