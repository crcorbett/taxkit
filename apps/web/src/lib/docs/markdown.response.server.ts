import { DocsPublicPagePath } from "@taxkit/content/schemas";
import type { HttpEffect } from "alchemy/Http";
import { Array, Effect, Match, Option, Result, Schema } from "effect";
import { Headers, HttpServerRequest, HttpServerResponse } from "effect/http";

import { WebsiteDocsAccept } from "../schemas";
import { WebsiteServerApplication } from "../service.server";

// This named HTTP policy composes the native HTML Effect, not a client callback.
// It owns only documentation representation selection and its response headers.
// The host retains its single runner, native-function admission and request scope.
export const withDocsRepresentation = (
  html: HttpEffect<WebsiteServerApplication>
): HttpEffect<WebsiteServerApplication> =>
  Effect.gen(function* websiteDocsRepresentation() {
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
      // Calculator POSTs are already selected by the host. Ordinary POSTs
      // retain its empty 404 without invoking a framework body parser.
      if (incoming.method === "POST") {
        return HttpServerResponse.empty({ status: 404 });
      }
      return yield* html;
    }
    // Only the original URL selects a page. One codec supplies its canonical
    // identity; this excludes calculator form paths and all native function IDs.
    const docsPath = Schema.decodeUnknownResult(DocsPublicPagePath)(
      markdownFile ? url.pathname.slice(0, -3) : url.pathname
    );
    const negotiates = Result.match(docsPath, {
      onFailure: () => false,
      onSuccess: () => url.pathname !== "/search" && url.pathname !== "/agents",
    });
    if (!markdownFile && !negotiates) {
      return yield* html;
    }
    const preference = markdownFile
      ? "markdown"
      : Schema.decodeUnknownResult(WebsiteDocsAccept)(
          Headers.get(incoming.headers, "accept").pipe(Option.getOrNull)
        ).pipe(Result.getOrElse(() => "invalid"));
    if (preference === "invalid" || preference === "unacceptable") {
      return HttpServerResponse.empty({
        headers: { "cache-control": "no-store", vary: "Accept" },
        status: preference === "invalid" ? 400 : 406,
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
            Array.some(
              vary.split(","),
              (field) =>
                field.trim().toLowerCase() === "accept" || field.trim() === "*"
            )
              ? vary
              : Match.value(vary).pipe(
                  Match.when("", () => "Accept"),
                  Match.orElse((existing) => `${existing}, Accept`)
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
    const application = yield* WebsiteServerApplication;
    return yield* Effect.gen(function* websiteDocsMarkdown() {
      const settings = yield* application.settings;
      const markdown = yield* application.docsMarkdown(docsPath.success);
      const headers = {
        "cache-control": "public, max-age=300",
        "content-type": "text/markdown; charset=utf-8",
        link: `<${new URL(docsPath.success, settings.websiteOrigin).href}>; rel="canonical"; type="text/html"`,
        vary: "Accept",
        "x-content-type-options": "nosniff",
      };
      return incoming.method === "HEAD"
        ? HttpServerResponse.empty({ headers, status: 200 })
        : HttpServerResponse.text(markdown, {
            contentType: "text/markdown; charset=utf-8",
            headers,
          });
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
