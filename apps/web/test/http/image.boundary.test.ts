import { describe, expect, it } from "@effect/vitest";
import { Function as EffectFunction, Effect, Layer, Option, Ref } from "effect";
import { Headers, HttpServerRequest } from "effect/http";

import { WebsiteApiConfigError } from "../../src/lib/host/errors";
import { WebsiteApi } from "../../src/lib/host/service";
import { docsImageRepresentation } from "../../src/lib/http/image.ingress";

const png = () => {
  const bytes = new Uint8Array(24);
  const data = new DataView(bytes.buffer);
  data.setBigUint64(0, 0x89_50_4e_47_0d_0a_1a_0an);
  data.setUint32(16, 1200);
  data.setUint32(20, 630);
  return bytes;
};
const answer = Effect.fnUntraced(function* ({
  address,
  reply,
  init = {},
}: {
  readonly address: string;
  readonly reply: Response;
  readonly init?: RequestInit;
}) {
  const forwarded = yield* Ref.make<readonly string[]>([]);
  const response = yield* docsImageRepresentation.pipe(
    Effect.provideService(
      HttpServerRequest.HttpServerRequest,
      HttpServerRequest.fromWeb(
        new Request(`http://127.0.0.1:4196${address}`, init)
      )
    ),
    Effect.provide(
      Layer.mock(WebsiteApi, {
        client: Effect.fail(new WebsiteApiConfigError()).pipe(
          Effect.withSpan("WebsiteApi.client")
        ),
        forward: Effect.fn("WebsiteApi.forward")(
          ({ path }: Parameters<WebsiteApi["Service"]["forward"]>[0]) =>
            Ref.update(forwarded, (paths) => [...paths, path]).pipe(
              Effect.as(reply)
            )
        ),
      })
    )
  );
  return { forwarded: yield* Ref.get(forwarded), response };
});
describe("documentation share images", () => {
  it.effect(
    "forwards a page image to the API and checks its bytes",
    Effect.fnUntraced(function* () {
      const { forwarded, response } = yield* answer({
        address: "/og/start/quickstart.png",
        reply: new Response(png(), {
          headers: { "content-type": "image/png" },
        }),
      });
      expect(forwarded).toStrictEqual(["/api/v1/docs/og/start/quickstart.png"]);
      const reply = yield* Effect.fromOption(response);
      expect(reply.status).toBe(200);
      EffectFunction.pipe(
        Headers.get(reply.headers, "content-type"),
        (actual) => {
          expect(actual).toStrictEqual(Option.some("image/png"));
        }
      );
    })
  );
  it.effect(
    "ignores every other address",
    Effect.fnUntraced(function* () {
      const { forwarded, response } = yield* answer({
        address: "/start/quickstart",
        reply: new Response(null, { status: 500 }),
      });
      expect(forwarded).toStrictEqual([]);
      EffectFunction.pipe(Option.isNone(response), (actual) => {
        expect(actual).toBeTruthy();
      });
    })
  );
  it.effect.each([
    {
      expected: 404,
      reply: () => new Response(null, { status: 404 }),
    },
    {
      expected: 503,
      reply: () =>
        new Response("<svg/>", { headers: { "content-type": "image/png" } }),
    },
    {
      expected: 503,
      reply: () =>
        new Response(png(), { headers: { "content-type": "text/plain" } }),
    },
    {
      expected: 503,
      reply: () => new Response(null, { status: 500 }),
    },
  ])(
    "answers $expected for an unusable API reply",
    Effect.fnUntraced(function* ({ expected, reply }) {
      const upstreamResponse = reply();
      const { response } = yield* answer({
        address: "/og/start/quickstart.png",
        reply: upstreamResponse,
      });
      const answered = yield* Effect.fromOption(response);
      expect(answered.status).toBe(expected);
      EffectFunction.pipe(
        Headers.get(answered.headers, "cache-control"),
        (actual) => {
          expect(actual).toStrictEqual(Option.some("no-store"));
        }
      );
    })
  );
  it.effect(
    "refuses other methods and invalid page addresses",
    Effect.fnUntraced(function* () {
      const posted = yield* answer({
        address: "/og/start/quickstart.png",
        reply: new Response(png()),
        init: { method: "POST" },
      });
      expect(posted.forwarded).toStrictEqual([]);
      EffectFunction.pipe(
        posted.response,
        Option.map((reply) => reply.status),
        (actual) => {
          expect(actual).toStrictEqual(Option.some(405));
        }
      );
      const invalid = yield* answer({
        address: "/og/invalid.path.png",
        reply: new Response(png()),
      });
      expect(invalid.forwarded).toStrictEqual([]);
      EffectFunction.pipe(
        invalid.response,
        Option.map((reply) => reply.status),
        (actual) => {
          expect(actual).toStrictEqual(Option.some(404));
        }
      );
    })
  );
});
