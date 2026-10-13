import { describe, expect, it } from "@effect/vitest";
import { Headers } from "effect/http";

import {
  cacheHeaders,
  isPublicReadPath,
  privateCacheControl,
  publicBrowserCacheControl,
  publicCdnCacheControl,
} from "../src/response-policy.js";

const shared = {
  "cache-control": publicBrowserCacheControl,
  "cloudflare-cdn-cache-control": publicCdnCacheControl,
};
const unshared = {
  "cache-control": privateCacheControl,
  "cloudflare-cdn-cache-control": privateCacheControl,
};

describe("public response cache policy", () => {
  it.each([
    "/api/v1/docs/page",
    "/api/v1/docs/search",
    "/api/v1/docs/markdown",
    "/api/v1/docs/navigation",
    "/api/v1/docs/discovery/llms.txt",
    "/api/v1/calculators",
    "/api/v1/calculators/au.pay.take-home",
    "/api/v1/calculators/au.pay.take-home/schema",
    "/api/v1/facts",
    "/api/docs/openapi.json",
  ])("shares the public read %s", (path) => {
    expect(isPublicReadPath(path)).toBe(true);
  });

  it.each([
    "/api/health",
    "/api/v1/calculators/au.pay.take-home/calculate",
    "/rpc",
    "/mcp",
    "/api/v1/docs/discovery/other.txt",
  ])("never shares %s", (path) => {
    expect(isPublicReadPath(path)).toBe(false);
  });

  it("shares only successful public reads", () => {
    const base = {
      headers: Headers.empty,
      method: "GET",
      publicRead: true,
      status: 200,
    };
    expect(cacheHeaders(base)).toEqual(shared);
    expect(cacheHeaders({ ...base, method: "HEAD" })).toEqual(shared);
    expect(cacheHeaders({ ...base, method: "POST" })).toEqual(unshared);
    expect(cacheHeaders({ ...base, status: 404 })).toEqual(unshared);
    expect(cacheHeaders({ ...base, status: 503 })).toEqual(unshared);
    expect(cacheHeaders({ ...base, publicRead: false })).toEqual(unshared);
    expect(
      cacheHeaders({
        ...base,
        headers: Headers.fromInput({ "set-cookie": "a=b" }),
      })
    ).toEqual(unshared);
  });

  it("keeps a stricter owner instruction and never overrides it publicly", () => {
    expect(
      cacheHeaders({
        headers: Headers.fromInput({ "cache-control": "private, max-age=60" }),
        method: "GET",
        publicRead: true,
        status: 200,
      })
    ).toEqual({
      "cache-control": "private, max-age=60",
      "cloudflare-cdn-cache-control": privateCacheControl,
    });
    expect(
      cacheHeaders({
        headers: Headers.fromInput({ "cdn-cache-control": "no-store" }),
        method: "GET",
        publicRead: true,
        status: 200,
      })
    ).toEqual(unshared);
  });
});
