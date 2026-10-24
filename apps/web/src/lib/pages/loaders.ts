import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import * as Option from "effect/Option";

import * as browserRegistry from "../api-client.atoms";
import type { WebsiteDocsSearchQuery } from "../docs/search-location.ingress";
import * as browser from "../runtime.client";
import * as server from "../runtime.server";
import type { LoaderContext } from "./loader-context";

type LoadRequest = Readonly<{ context: LoaderContext; signal: AbortSignal }>;

// Each branch calls local code; none creates a Website endpoint. Server loads
// also stop when the incoming request is cancelled.
export const createLoaderRegistry = createIsomorphicFn()
  .server(() => Option.none())
  .client(() => browserRegistry.createLoaderRegistry());

export const loadRoot = createIsomorphicFn()
  .server((request: LoadRequest) =>
    server.loadRoot({
      signal: AbortSignal.any([request.signal, getRequest().signal]),
    })
  )
  .client((request: LoadRequest) => browser.loadRoot(request));

export const loadDocsPage = createIsomorphicFn()
  .server((request: LoadRequest & Readonly<{ path: string }>) =>
    server.loadDocsPage({
      path: request.path,
      signal: AbortSignal.any([request.signal, getRequest().signal]),
    })
  )
  .client((request: LoadRequest & Readonly<{ path: string }>) =>
    browser.loadDocsPage(request)
  );

export const loadDocsSearch = createIsomorphicFn()
  .server(
    (request: LoadRequest & Readonly<{ query: WebsiteDocsSearchQuery }>) =>
      server.loadDocsSearch({
        query: request.query,
        signal: AbortSignal.any([request.signal, getRequest().signal]),
      })
  )
  .client(
    (request: LoadRequest & Readonly<{ query: WebsiteDocsSearchQuery }>) =>
      browser.loadDocsSearch(request)
  );
