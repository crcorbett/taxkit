import type {
  ApiDeadlineExceeded,
  ApiUnavailable,
} from "@taxkit/api-http/errors";
import type { TaxKitClient } from "@taxkit/api-http/requests";
import type {
  DocsDiscoveryApiPath,
  docsImageApiPath,
} from "@taxkit/api-http/routes";
import { Context } from "effect";
import type { Effect } from "effect";

import type { TaxKitWebConfigError, WebsiteApiConfigError } from "./errors";
import type { WebsitePublicSettings } from "./schemas";

// Independent capabilities retain their own checked failure, so unavailable
// API bindings cannot prevent rendering valid Website settings.
export class WebsiteSettings extends Context.Service<
  WebsiteSettings,
  {
    readonly settings: Effect.Effect<
      WebsitePublicSettings,
      TaxKitWebConfigError
    >;
  }
>()("taxkit/web/WebsiteSettings") {}

// The only API addresses the Website forwards: finished discovery documents
// and share images, each built by its catalogue owner.
export type WebsiteForwardPath =
  | typeof DocsDiscoveryApiPath.Type
  | ReturnType<typeof docsImageApiPath>;

export class WebsiteApi extends Context.Service<
  WebsiteApi,
  {
    readonly client: Effect.Effect<TaxKitClient, WebsiteApiConfigError>;
    readonly forward: (request: {
      readonly path: WebsiteForwardPath;
    }) => Effect.Effect<
      Response,
      ApiUnavailable | ApiDeadlineExceeded | WebsiteApiConfigError
    >;
  }
>()("taxkit/web/WebsiteApi") {}
