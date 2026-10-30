import {
  Predicate,
  Function as EffectFunction,
  Array,
  Option,
  Result,
  Boolean as EffectBoolean,
} from "effect";
import { Cookies, Headers, HttpServerResponse, Url } from "effect/http";
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
// Compatibility export; the route catalogue owns cache eligibility.
export { isPublicReadApiPath as isPublicReadPath } from "./routes.js";
const restrictive = /(?:^|,)\s*(?:private|no-store)\s*(?:=|,|$)/iu;
const revalidation =
  /(?:^|,)\s*(?:no-cache|must-revalidate|proxy-revalidate)\s*(?:=|,|$)/iu;
// A Markdown redirect, 400 or 406 that answers only the Accept header is a
// stable variant of a public page. Workers Cache drops a page's stored entry
// when an uncacheable reply arrives at the same address, so these answers are
// stored as their own variant rather than letting any Accept header empty the
// page's cache.
const negotiationAnswer = (status: number, headers: Headers.Headers) =>
  (status === 307 || status === 400 || status === 406) &&
  Option.exists(Headers.get(headers, "vary"), (vary) =>
    EffectFunction.pipe(
      vary.split(","),
      Array.some((field) => field.trim().toLowerCase() === "accept")
    )
  );
/**
 * The one cache decision for TaxKit hosts. Only a successful public GET/HEAD,
 * or its Accept negotiation answer, without cookies is eligible for sharing.
 * Owner instructions govern freshness and revalidation; refused responses
 * are `no-store` at every cache layer.
 */
export const cacheHeaders = ({
  cookies,
  headers,
  method,
  publicRead,
  status,
}: Readonly<{
  cookies?: Cookies.Cookies;
  headers: Headers.Headers;
  method: string;
  publicRead: boolean;
  status: number;
}>) => {
  const browser = Headers.get(headers, "cache-control");
  const cdn = Headers.get(headers, "cdn-cache-control");
  const cloudflare = Headers.get(headers, "cloudflare-cdn-cache-control");
  const declared = Array.getSomes([browser, cdn, cloudflare]);
  const restricted = EffectFunction.pipe(
    declared,
    Array.some((value) => restrictive.test(value))
  );
  const requiresRevalidation = EffectFunction.pipe(
    declared,
    Array.some((value) => revalidation.test(value))
  );
  const eligible =
    publicRead &&
    (method === "GET" || method === "HEAD") &&
    (status === 200 || negotiationAnswer(status, headers)) &&
    !Headers.has(headers, "set-cookie") &&
    (Predicate.isUndefined(cookies) || Cookies.isEmpty(cookies)) &&
    !restricted;
  if (!eligible) {
    return {
      "cache-control": privateCacheControl,
      "cdn-cache-control": privateCacheControl,
      "cloudflare-cdn-cache-control": privateCacheControl,
    };
  }
  // The canonical browser policy deliberately rechecks while the CDN keeps
  // seven-day freshness. Any other explicit owner lifetime is the edge fallback.
  const selectedCdn = Option.getOrElse(cdn, () =>
    Option.match(browser, {
      onNone: () => publicCdnCacheControl,
      onSome: (value) =>
        EffectBoolean.match(value === publicBrowserCacheControl, {
          onFalse: () => value,
          onTrue: () => publicCdnCacheControl,
        }),
    })
  );
  return {
    "cache-control": Option.getOrElse(browser, () => publicBrowserCacheControl),
    ...EffectBoolean.match(requiresRevalidation, {
      onFalse: () =>
        Option.match(cdn, {
          onNone: () => ({}),
          onSome: (value) => ({ "cdn-cache-control": value }),
        }),
      onTrue: () => ({ "cdn-cache-control": "no-cache" }),
    }),
    "cloudflare-cdn-cache-control": EffectBoolean.match(requiresRevalidation, {
      onFalse: () => Option.getOrElse(cloudflare, () => selectedCdn),
      onTrue: (): "no-cache" => "no-cache",
    }),
  };
};
/** Apply the cache decision to a native Effect HTTP response. */
export const applyCachePolicy = (
  response: HttpServerResponse.HttpServerResponse,
  request: Readonly<{
    method: string;
    publicRead: boolean;
  }>
) =>
  HttpServerResponse.setHeaders(
    response,
    cacheHeaders({
      cookies: response.cookies,
      headers: response.headers,
      method: request.method,
      publicRead: request.publicRead,
      status: response.status,
    })
  );
