import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer, Option, Ref, Result } from "effect";
import { Headers, HttpServerRequest } from "effect/http";

import { WebsiteApiConfigError } from "../api/errors";
import { WebsiteApi } from "../host.service";
import { docsImageRepresentation } from "./image.ingress";

const png = () => {
  const bytes = new Uint8Array(24);
  const data = new DataView(bytes.buffer);
  data.setBigUint64(0, 0x89_50_4e_47_0d_0a_1a_0an);
  data.setUint32(16, 1200);
  data.setUint32(20, 630);
  return bytes;
};

const answer = (address: string, reply: Response, init: RequestInit = {}) =>
  Effect.gen(function* () {
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
          client: Result.fail(new WebsiteApiConfigError()),
          forward: (path) =>
            Ref.update(forwarded, (paths) => [...paths, path]).pipe(
              Effect.as(reply)
            ),
        })
      )
    );
    return { forwarded: yield* Ref.get(forwarded), response };
  });

describe("documentation share images", () => {
  it.effect("forwards a page image to the API and checks its bytes", () =>
    Effect.gen(function* () {
      const { forwarded, response } = yield* answer(
        "/og/start/quickstart.png",
        new Response(png(), { headers: { "content-type": "image/png" } })
      );
      expect(forwarded).toEqual(["/api/v1/docs/og/start/quickstart.png"]);
      const reply = yield* Effect.fromOption(response);
      expect(reply.status).toBe(200);
      expect(Headers.get(reply.headers, "content-type")).toEqual(
        Option.some("image/png")
      );
    })
  );

  it.effect("ignores every other address", () =>
    Effect.gen(function* () {
      const { forwarded, response } = yield* answer(
        "/start/quickstart",
        new Response(null, { status: 500 })
      );
      expect(forwarded).toEqual([]);
      expect(Option.isNone(response)).toBe(true);
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
  ])("answers $expected for an unusable API reply", ({ expected, reply }) =>
    Effect.gen(function* () {
      const { response } = yield* answer("/og/start/quickstart.png", reply());
      const answered = yield* Effect.fromOption(response);
      expect(answered.status).toBe(expected);
      expect(Headers.get(answered.headers, "cache-control")).toEqual(
        Option.some("no-store")
      );
    })
  );

  it.effect("refuses other methods and invalid page addresses", () =>
    Effect.gen(function* () {
      const posted = yield* answer(
        "/og/start/quickstart.png",
        new Response(png()),
        { method: "POST" }
      );
      expect(posted.forwarded).toEqual([]);
      expect(Option.map(posted.response, (reply) => reply.status)).toEqual(
        Option.some(405)
      );
      const invalid = yield* answer(
        "/og/invalid.path.png",
        new Response(png())
      );
      expect(invalid.forwarded).toEqual([]);
      expect(Option.map(invalid.response, (reply) => reply.status)).toEqual(
        Option.some(404)
      );
    })
  );
});
