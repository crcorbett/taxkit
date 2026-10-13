import { Array, Option, Result } from "effect";
import { Headers, HttpServerResponse, Url } from "effect/http";

// Exact HTTP(S) origin text, as browsers send it. URL parsing normalises the
// address, so compare the parsed origin with the original header.
export const isBrowserOrigin = (origin: string) =>
  Result.match(Url.fromString(origin), {
    onFailure: () => false,
    onSuccess: (url) =>
      url.origin === origin &&
      (url.protocol === "https:" || url.protocol === "http:"),
  });

// Public credential-free browser access for HTTP and RPC on every host.
// Native Effect clients send b3 and traceparent; admitting them enables no
// exporter.
export const publicCors = {
  allowedHeaders: ["b3", "content-type", "traceparent"],
  allowedMethods: ["GET", "HEAD", "POST", "OPTIONS"],
  allowedOrigins: isBrowserOrigin,
  credentials: false,
} as const;

// Browsers recheck public content on every visit. Cloudflare may reuse the same
// deployed Worker version's response for seven days; that is freshness, not a
// promise that the cache keeps it.
export const publicBrowserCacheControl = "public, max-age=0";
export const publicCdnCacheControl = "public, max-age=604800, stale-if-error=0";
export const privateCacheControl = "no-store";

// Public documentation and fixed calculator metadata. Health, calculation,
// RPC and MCP replies are never shared.
const publicReadPaths = [
  /^\/api\/v1\/docs\/(?:navigation|page|search|markdown)$/u,
  /^\/api\/v1\/docs\/discovery\/(?:sitemap\.xml|robots\.txt|llms\.txt|llms-full\.txt)$/u,
  /^\/api\/v1\/(?:jurisdictions|tax-years|calculators|facts|rules)$/u,
  /^\/api\/v1\/calculators\/[^/]+(?:\/schema|\/graph)?$/u,
  /^\/api\/docs(?:\/openapi\.json)?$/u,
] as const;

export const isPublicReadPath = (pathname: string) =>
  Array.some(publicReadPaths, (pattern) => pattern.test(pathname));

const restrictive = /(?:^|,)\s*(?:private|no-store)\s*(?:=|,|$)/iu;

// A 400 or 406 that answers only the Accept header is a stable variant of a
// public page. Workers Cache drops a page's stored entry when an uncacheable
// reply arrives at the same address, so these answers are stored as their own
// variant rather than letting any odd Accept header empty the page's cache.
const negotiationAnswer = (status: number, headers: Headers.Headers) =>
  (status === 400 || status === 406) &&
  Option.exists(Headers.get(headers, "vary"), (vary) =>
    Array.some(
      vary.split(","),
      (field) => field.trim().toLowerCase() === "accept"
    )
  );

/**
 * The one cache decision for TaxKit hosts. Only a successful public GET/HEAD,
 * or its Accept negotiation answer, without cookies or a stricter owner
 * instruction is shared; everything else is `no-store` for both the browser
 * and Cloudflare, so a CDN header can never make a private reply public.
 */
export const cacheHeaders = ({
  headers,
  method,
  publicRead,
  status,
}: Readonly<{
  headers: Headers.Headers;
  method: string;
  publicRead: boolean;
  status: number;
}>): Readonly<Record<string, string>> => {
  const declared = Array.getSomes([
    Headers.get(headers, "cache-control"),
    Headers.get(headers, "cdn-cache-control"),
    Headers.get(headers, "cloudflare-cdn-cache-control"),
  ]);
  const restricted = Array.some(declared, (value) => restrictive.test(value));
  const eligible =
    publicRead &&
    (method === "GET" || method === "HEAD") &&
    (status === 200 || negotiationAnswer(status, headers)) &&
    !Headers.has(headers, "set-cookie") &&
    !restricted;
  return eligible
    ? {
        "cache-control": publicBrowserCacheControl,
        "cloudflare-cdn-cache-control": publicCdnCacheControl,
      }
    : {
        "cache-control": restricted
          ? Option.getOrElse(
              Headers.get(headers, "cache-control"),
              () => privateCacheControl
            )
          : privateCacheControl,
        "cloudflare-cdn-cache-control": privateCacheControl,
      };
};

/** Apply the cache decision to a native Effect HTTP response. */
export const applyCachePolicy = (
  response: HttpServerResponse.HttpServerResponse,
  request: Readonly<{ method: string; publicRead: boolean }>
) =>
  HttpServerResponse.setHeaders(
    response,
    cacheHeaders({
      headers: response.headers,
      method: request.method,
      publicRead: request.publicRead,
      status: response.status,
    })
  );
