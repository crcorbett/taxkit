import { DocsAccept } from "@taxkit/api-http/negotiation";
import "@tanstack/react-start/server-only";
import { requestDocsMarkdown } from "@taxkit/api-http/requests";
import { docsMarkdownPath } from "@taxkit/content/publication";
import { DocsPublicPagePath } from "@taxkit/content/schemas";
import type { HttpEffect } from "alchemy/Http";
import {
  Function as EffectFunction,
  Array,
  Effect,
  Match,
  Option,
  Result,
  Schema,
  Boolean as EffectBoolean,
} from "effect";
import { Headers, HttpServerRequest, HttpServerResponse } from "effect/http";

import { WebsiteApi, WebsiteSettings } from "../host/service";
// This named HTTP policy composes the native HTML Effect, not a client callback.
// It owns only documentation representation selection and its response headers.
// The host retains its single runner, native-function admission and request scope.
export const withDocsRepresentation = Effect.fnUntraced(function* (
  html: HttpEffect<WebsiteApi | WebsiteSettings>
) {
  const incoming = yield* HttpServerRequest.HttpServerRequest;
  const url = new URL(incoming.originalUrl);
  const markdownFile = url.pathname.endsWith(".md");
  if (incoming.method !== "GET" && incoming.method !== "HEAD") {
    if (markdownFile) {
      return HttpServerResponse.empty({
        headers: { allow: "GET, HEAD" },
        status: 405,
      });
    }
    // The Website accepts no POST; reply with an empty 404 without
    // invoking a framework body parser.
    if (incoming.method === "POST") {
      return HttpServerResponse.empty({ status: 404 });
    }
    return yield* html;
  }
  // Only the original URL selects a page. One codec supplies its canonical
  // identity; this excludes calculator form paths and all native function IDs.
  const docsPath = Schema.decodeUnknownResult(DocsPublicPagePath)(
    EffectBoolean.match(markdownFile, {
      onFalse: () => url.pathname,
      onTrue: () => url.pathname.slice(0, -3),
    })
  );
  const negotiates = Result.match(docsPath, {
    onFailure: () => false,
    onSuccess: () => url.pathname !== "/search" && url.pathname !== "/agents",
  });
  if (!markdownFile && !negotiates) {
    return yield* html;
  }
  const preference = EffectBoolean.match(markdownFile, {
    onFalse: () =>
      Schema.decodeUnknownResult(DocsAccept)(
        Headers.get(incoming.headers, "accept").pipe(Option.getOrNull)
      ).pipe(Result.getOrElse(() => "invalid")),
    onTrue: (): "markdown" => "markdown",
  });
  if (preference === "invalid" || preference === "unacceptable") {
    // The host's cache decision stores this Accept answer as its own
    // variant, so an odd Accept header cannot evict the cached page.
    return HttpServerResponse.empty({
      headers: { vary: "Accept" },
      status: Match.value(preference).pipe(
        Match.when("invalid", (): 400 => 400),
        Match.orElse((): 406 => 406)
      ),
    });
  }
  if (preference === "html") {
    // The framework recognises concrete HTML but rejects a valid text/*
    // preference. Our checked choice owns negotiation; supply it explicitly
    // while retaining the original URL, body and caller signal.
    const htmlRequest = new Request(
      yield* HttpServerRequest.toWeb(incoming).pipe(Effect.orDie),
      {
        headers: Headers.set(incoming.headers, "accept", "text/html"),
      }
    );
    return yield* html.pipe(
      Effect.provideService(
        HttpServerRequest.HttpServerRequest,
        HttpServerRequest.fromWeb(htmlRequest)
      ),
      Effect.map((response) => {
        const vary = Headers.get(response.headers, "vary").pipe(
          Option.getOrElse(() => "")
        );
        return HttpServerResponse.setHeader(
          response,
          "vary",
          EffectBoolean.match(
            EffectFunction.pipe(
              vary.split(","),
              Array.some(
                (field) =>
                  field.trim().toLowerCase() === "accept" ||
                  field.trim() === "*"
              )
            ),
            {
              onFalse: () =>
                Match.value(vary).pipe(
                  Match.when("", (): "Accept" => "Accept"),
                  Match.orElse((existing) => `${existing}, Accept`)
                ),
              onTrue: () => vary,
            }
          )
        );
      })
    );
  }
  if (url.search !== "" || Result.isFailure(docsPath)) {
    return HttpServerResponse.empty({
      headers: { "cache-control": "no-store", vary: "Accept" },
      status: 400,
    });
  }
  if (!markdownFile) {
    // A Markdown preference at a page address moves to its own Markdown
    // file, so each address keeps one representation for the cache.
    return HttpServerResponse.empty({
      headers: {
        location: docsMarkdownPath(docsPath.success),
        vary: "Accept",
      },
      status: 307,
    });
  }
  const api = yield* WebsiteApi;
  const host = yield* WebsiteSettings;
  return yield* Effect.gen(function* websiteDocsMarkdown() {
    const settings = yield* host.settings;
    const client = yield* api.client;
    const markdown = yield* requestDocsMarkdown({
      client,
      path: docsPath.success,
    });
    // The host's one cache decision adds the cache headers.
    const headers = {
      "content-type": "text/markdown; charset=utf-8",
      link: `<${new URL(docsPath.success, settings.publicationOrigin).href}>; rel="canonical"; type="text/html"`,
      vary: "Accept",
      "x-content-type-options": "nosniff",
    };
    return Match.value(incoming).pipe(
      Match.when({ method: "HEAD" }, () =>
        HttpServerResponse.empty({ headers, status: 200 })
      ),
      Match.orElse(() =>
        HttpServerResponse.text(markdown, {
          contentType: "text/markdown; charset=utf-8",
          headers,
        })
      )
    );
  }).pipe(
    Effect.catchTag("DocsPageUnavailable", () =>
      Effect.succeed(
        HttpServerResponse.empty({
          headers: { "cache-control": "no-store", vary: "Accept" },
          status: 404,
        })
      )
    ),
    Effect.catch(() =>
      Effect.succeed(
        HttpServerResponse.empty({
          headers: { "cache-control": "no-store", vary: "Accept" },
          status: 503,
        })
      )
    )
  );
});
