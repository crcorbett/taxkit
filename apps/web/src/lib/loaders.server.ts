import "@tanstack/react-start/server-only";
import { notFound } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { DocsPageUnavailable } from "@taxkit/api-rpc/content/errors";
import { DocsPublicPagePath } from "@taxkit/content/schemas";
import { Array, Cause, Effect, ErrorReporter, Schema } from "effect";
import { HttpServerError, HttpServerResponse } from "effect/http";

import { WebsiteServerFunctionBase } from "./config";
import { preloadDocsPresentation } from "./docs/mdx.boundary";
import { appRuntime } from "./runtime.server";
import {
  WebsiteCatalogueTransport,
  WebsiteDocsPageTransport,
  WebsiteSettingsTransport,
} from "./schemas";
import { WebsiteServerApplication } from "./service.server";

export const loadWebsiteSettingsServer = () =>
  appRuntime.runPromise(
    WebsiteServerApplication.pipe(
      Effect.flatMap((application) =>
        Effect.gen(function* () {
          const settings = yield* application.settings.pipe(
            Effect.result,
            Effect.flatMap(Schema.encodeEffect(WebsiteSettingsTransport))
          );
          const catalogue = yield* application.catalogue.pipe(
            Effect.result,
            Effect.flatMap(Schema.encodeEffect(WebsiteCatalogueTransport))
          );
          return { catalogue, settings };
        })
      ),
      Effect.orDie,
      // Expected settings errors remain checked values. An unexpected failure
      // reaches the host reporter and native empty response before TanStack can
      // log or serialise an arbitrary Cause as a server-function error.
      Effect.catchCause((cause) =>
        HttpServerError.causeResponse(cause).pipe(
          Effect.flatMap(([response, reportable]) =>
            ErrorReporter.report(reportable).pipe(
              Effect.as(HttpServerResponse.toWeb(response))
            )
          )
        )
      )
    ),
    { signal: getRequest().signal }
  );

export const loadWebsiteDocsPageServer = () => {
  const request = getRequest();
  const url = new URL(request.url);
  // A fresh native Router signal is private to this request. Only this exact
  // signal bypasses unexpected-error containment; arbitrary defects cannot.
  const missingPage = notFound();
  // SSR reads the real document address. Only the admitted native browser
  // function reads the bounded public header; headers cannot override SSR.
  const rawPath = url.pathname.startsWith(`${WebsiteServerFunctionBase}/`)
    ? request.headers.get("x-taxkit-docs-page")
    : url.pathname;
  return appRuntime.runPromise(
    Schema.decodeUnknownEffect(DocsPublicPagePath)(rawPath).pipe(
      Effect.mapError(
        () =>
          new DocsPageUnavailable({
            message: "The documentation page was not found.",
          })
      ),
      Effect.flatMap((path) =>
        WebsiteServerApplication.pipe(
          Effect.flatMap((application) =>
            Effect.gen(function* () {
              const settings = yield* application.settings;
              const navigation = yield* application.docsNavigation;
              const page = yield* application.docsPage(path);
              yield* preloadDocsPresentation(page);
              return { navigation, page, settings };
            })
          )
        )
      ),
      Effect.catchTag("DocsPageUnavailable", () => Effect.die(missingPage)),
      Effect.result,
      Effect.flatMap(Schema.encodeEffect(WebsiteDocsPageTransport)),
      Effect.orDie,
      Effect.catchCauseIf(
        (cause) =>
          !Array.some(
            cause.reasons,
            (reason) =>
              Cause.isDieReason(reason) && reason.defect === missingPage
          ),
        (cause) =>
          HttpServerError.causeResponse(cause).pipe(
            Effect.flatMap(([response, reportable]) =>
              ErrorReporter.report(reportable).pipe(
                Effect.as(HttpServerResponse.toWeb(response))
              )
            )
          )
      )
    ),
    { signal: request.signal }
  );
};
