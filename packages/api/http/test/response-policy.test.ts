import { describe, expect, it } from "@effect/vitest";
import {
  Match,
  Function as EffectFunction,
  Array as EffectArray,
} from "effect";
import { Cookies, Headers, HttpServerResponse } from "effect/http";

import {
  applyCachePolicy,
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
  "cdn-cache-control": privateCacheControl,
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
    EffectFunction.pipe(isPublicReadPath(path), (actual) => {
      expect(actual).toBeTruthy();
    });
  });

  it.each([
    "/api/health",
    "/api/v1/calculators/au.pay.take-home/calculate",
    "/mcp",
    "/api/v1/docs/discovery/other.txt",
  ])("never shares %s", (path) => {
    EffectFunction.pipe(isPublicReadPath(path), (actual) => {
      expect(!actual).toBeTruthy();
    });
  });

  it("shares only successful public reads", () => {
    const base = {
      headers: Headers.empty,
      method: "GET",
      publicRead: true,
      status: 200,
    };
    EffectFunction.pipe(cacheHeaders(base), (actual) => {
      expect(actual).toStrictEqual(shared);
    });
    EffectFunction.pipe(cacheHeaders({ ...base, method: "HEAD" }), (actual) => {
      expect(actual).toStrictEqual(shared);
    });
    EffectFunction.pipe(cacheHeaders({ ...base, method: "POST" }), (actual) => {
      expect(actual).toStrictEqual(unshared);
    });
    EffectFunction.pipe(cacheHeaders({ ...base, status: 404 }), (actual) => {
      expect(actual).toStrictEqual(unshared);
    });
    EffectFunction.pipe(cacheHeaders({ ...base, status: 503 }), (actual) => {
      expect(actual).toStrictEqual(unshared);
    });
    EffectFunction.pipe(cacheHeaders({ ...base, status: 400 }), (actual) => {
      expect(actual).toStrictEqual(unshared);
    });
    EffectFunction.pipe(
      cacheHeaders({ ...base, publicRead: false }),
      (actual) => {
        expect(actual).toStrictEqual(unshared);
      }
    );
    EffectFunction.pipe(
      cacheHeaders({
        ...base,
        headers: Headers.fromInput({ "set-cookie": "a=b" }),
      }),
      (actual) => {
        expect(actual).toStrictEqual(unshared);
      }
    );
  });

  it("stores Accept negotiation answers as their own public variant", () => {
    const negotiated = {
      headers: Headers.fromInput({ vary: "Origin, Accept" }),
      method: "GET",
      publicRead: true,
    };
    EffectFunction.pipe(
      cacheHeaders({ ...negotiated, status: 400 }),
      (actual) => {
        expect(actual).toStrictEqual(shared);
      }
    );
    EffectFunction.pipe(
      cacheHeaders({ ...negotiated, status: 406 }),
      (actual) => {
        expect(actual).toStrictEqual(shared);
      }
    );
    EffectFunction.pipe(
      cacheHeaders({ ...negotiated, status: 307 }),
      (actual) => {
        expect(actual).toStrictEqual(shared);
      }
    );
    // Missing and unavailable pages are never stored, whatever they vary on.
    EffectFunction.pipe(
      cacheHeaders({ ...negotiated, status: 404 }),
      (actual) => {
        // Missing and unavailable pages are never stored, whatever they vary on.
        expect(actual).toStrictEqual(unshared);
      }
    );
    EffectFunction.pipe(
      cacheHeaders({ ...negotiated, status: 503 }),
      (actual) => {
        expect(actual).toStrictEqual(unshared);
      }
    );
    EffectFunction.pipe(
      cacheHeaders({
        ...negotiated,
        headers: Headers.fromInput({ vary: "Accept-Encoding" }),
        status: 400,
      }),
      (actual) => {
        expect(actual).toStrictEqual(unshared);
      }
    );
  });

  it("keeps a stricter owner instruction and never overrides it publicly", () => {
    EffectFunction.pipe(
      cacheHeaders({
        headers: Headers.fromInput({ "cache-control": "private, max-age=60" }),
        method: "GET",
        publicRead: true,
        status: 200,
      }),
      (actual) => {
        expect(actual).toStrictEqual(unshared);
      }
    );
    EffectFunction.pipe(
      cacheHeaders({
        headers: Headers.fromInput({ "cdn-cache-control": "no-store" }),
        method: "GET",
        publicRead: true,
        status: 200,
      }),
      (actual) => {
        expect(actual).toStrictEqual(unshared);
      }
    );
  });
});
const cacheHeaderNames = [
  "cache-control",
  "cdn-cache-control",
  "cloudflare-cdn-cache-control",
] as const;
const declaredPublicHeaders = {
  "cache-control": publicBrowserCacheControl,
  "cdn-cache-control": publicCdnCacheControl,
  "cloudflare-cdn-cache-control": publicCdnCacheControl,
};
const publicReadRequest = { method: "GET", publicRead: true } as const;
describe("native cache policy response boundary", () => {
  it.each([
    {
      controls: { "cache-control": "public, max-age=30" },
      expectedBrowser: "public, max-age=30",
      expectedCdn: null,
      expectedCloudflare: "public, max-age=30",
      name: "an explicit browser TTL governs shared fallback",
    },
    {
      controls: { "cache-control": "public, max-age=0, s-maxage=60" },
      expectedBrowser: "public, max-age=0, s-maxage=60",
      expectedCdn: null,
      expectedCloudflare: "public, max-age=0, s-maxage=60",
      name: "an explicit browser shared TTL survives",
    },
    {
      controls: {
        "cache-control": "public, max-age=30",
        "cdn-cache-control": "public, max-age=120, stale-if-error=0",
      },
      expectedBrowser: "public, max-age=30",
      expectedCdn: "public, max-age=120, stale-if-error=0",
      expectedCloudflare: "public, max-age=120, stale-if-error=0",
      name: "a generic CDN TTL outranks the browser TTL for shared fallback",
    },
    {
      controls: { "cdn-cache-control": "public, max-age=120" },
      expectedBrowser: publicBrowserCacheControl,
      expectedCdn: "public, max-age=120",
      expectedCloudflare: "public, max-age=120",
      name: "a generic CDN TTL survives without a browser instruction",
    },
    {
      controls: {
        "cache-control": "public, max-age=30",
        "cdn-cache-control": "public, max-age=120, stale-if-error=0",
        "cloudflare-cdn-cache-control": "public, max-age=60, stale-if-error=0",
      },
      expectedBrowser: "public, max-age=30",
      expectedCdn: "public, max-age=120, stale-if-error=0",
      expectedCloudflare: "public, max-age=60, stale-if-error=0",
      name: "each native header keeps its explicit TTL",
    },
    {
      controls: {
        "cache-control": "public, max-age=30",
        "cloudflare-cdn-cache-control": "public, max-age=60",
      },
      expectedBrowser: "public, max-age=30",
      expectedCdn: null,
      expectedCloudflare: "public, max-age=60",
      name: "a Cloudflare TTL outranks browser fallback only for Cloudflare",
    },
  ])(
    "$name",
    ({ controls, expectedBrowser, expectedCdn, expectedCloudflare }) => {
      const native = HttpServerResponse.text("checked public body", {
        headers: controls,
      });
      const checked = applyCachePolicy(native, publicReadRequest);
      const outgoing = HttpServerResponse.toWeb(checked);
      EffectFunction.pipe(outgoing.headers.get("cache-control"), (actual) => {
        expect(actual).toBe(expectedBrowser);
      });
      EffectFunction.pipe(
        outgoing.headers.get("cdn-cache-control"),
        (actual) => {
          expect(actual).toBe(expectedCdn);
        }
      );
      EffectFunction.pipe(
        outgoing.headers.get("cloudflare-cdn-cache-control"),
        (actual) => {
          expect(actual).toBe(expectedCloudflare);
        }
      );
      expect(checked.body).toBe(native.body);
      expect(outgoing.status).toBe(200);
    }
  );

  it.each(
    EffectFunction.pipe(
      cacheHeaderNames,
      EffectArray.flatMap((headerName) =>
        EffectFunction.pipe(
          [
            "private",
            'private="Set-Cookie"',
            "NO-STORE",
            "public, no-store, max-age=60",
          ],
          EffectArray.map((directive) => ({ directive, headerName }))
        )
      )
    )
  )(
    "$headerName: $directive prevents sharing in every outgoing cache header",
    ({ directive, headerName }) => {
      const native = HttpServerResponse.text("restricted body", {
        headers: { ...declaredPublicHeaders, [headerName]: directive },
      });
      const checked = applyCachePolicy(native, publicReadRequest);
      const outgoing = HttpServerResponse.toWeb(checked);
      EffectFunction.pipe(
        EffectFunction.pipe(
          cacheHeaderNames,
          EffectArray.map((name) => outgoing.headers.get(name))
        ),
        (actual) => {
          expect(actual).toStrictEqual([
            privateCacheControl,
            privateCacheControl,
            privateCacheControl,
          ]);
        }
      );
      expect(checked.body).toBe(native.body);
      expect(outgoing.status).toBe(native.status);
    }
  );

  it.each(
    EffectFunction.pipe(
      cacheHeaderNames,
      EffectArray.flatMap((headerName) =>
        EffectFunction.pipe(
          [
            "public, no-cache",
            'no-cache="Set-Cookie"',
            "public, max-age=60, must-revalidate",
            "PROXY-REVALIDATE",
          ],
          EffectArray.map((directive) => ({ directive, headerName }))
        )
      )
    )
  )(
    "$headerName: $directive forces shared revalidation",
    ({ directive, headerName }) => {
      const controls = { ...declaredPublicHeaders, [headerName]: directive };
      const native = HttpServerResponse.text("revalidated body", {
        headers: controls,
      });
      const outgoing = HttpServerResponse.toWeb(
        applyCachePolicy(native, publicReadRequest)
      );
      EffectFunction.pipe(outgoing.headers.get("cache-control"), (actual) => {
        expect(actual).toBe(
          Match.value(headerName).pipe(
            Match.when("cache-control", () => directive),
            Match.orElse(() => publicBrowserCacheControl)
          )
        );
      });
      EffectFunction.pipe(
        outgoing.headers.get("cdn-cache-control"),
        (actual) => {
          expect(actual).toBe("no-cache");
        }
      );
      EffectFunction.pipe(
        outgoing.headers.get("cloudflare-cdn-cache-control"),
        (actual) => {
          expect(actual).toBe("no-cache");
        }
      );
    }
  );

  it.each(
    EffectFunction.pipe(
      ["GET", "HEAD"],
      EffectArray.flatMap((method) =>
        EffectFunction.pipe(
          [200, 307, 400, 406],
          EffectArray.map((status) => ({ method, status }))
        )
      )
    )
  )(
    "keeps existing defaults and Accept variants for $method $status",
    ({ method, status }) => {
      const native = HttpServerResponse.text("public representation", {
        headers: Match.value(status).pipe(
          Match.when(200, () => ({})),
          Match.orElse(() => ({ vary: "Origin, Accept" }))
        ),
        status,
      });
      const outgoing = HttpServerResponse.toWeb(
        applyCachePolicy(native, { method, publicRead: true }),
        { withoutBody: method === "HEAD" }
      );
      expect(outgoing.status).toBe(status);
      EffectFunction.pipe(outgoing.headers.get("cache-control"), (actual) => {
        expect(actual).toBe(publicBrowserCacheControl);
      });
      EffectFunction.pipe(
        outgoing.headers.get("cloudflare-cdn-cache-control"),
        (actual) => {
          expect(actual).toBe(publicCdnCacheControl);
        }
      );
      EffectFunction.pipe(outgoing.headers.get("set-cookie"), (actual) => {
        expect(actual).toBeNull();
      });
    }
  );

  it.each([
    {
      make: () =>
        HttpServerResponse.text("personal reply", {
          headers: {
            ...declaredPublicHeaders,
            "set-cookie": "session=checked",
          },
        }),
      name: "a raw Set-Cookie header",
      separatedCookies: false,
    },
    {
      make: () =>
        HttpServerResponse.text("personal reply", {
          headers: declaredPublicHeaders,
        }).pipe(HttpServerResponse.setCookieUnsafe("session", "checked")),
      name: "Effect's separate cookie collection",
      separatedCookies: true,
    },
    {
      make: () =>
        HttpServerResponse.fromWeb(
          new Response("<html>personal reply</html>", {
            headers: {
              ...declaredPublicHeaders,
              "content-type": "text/html; charset=utf-8",
              "set-cookie": "session=checked",
            },
          })
        ),
      name: "an SSR Web response converted through fromWeb",
      separatedCookies: true,
    },
  ])("refuses shared caching for $name", ({ make, separatedCookies }) => {
    const native = make();
    EffectFunction.pipe(Headers.has(native.headers, "set-cookie"), (actual) => {
      expect(actual).toBe(!separatedCookies);
    });
    EffectFunction.pipe(Cookies.isEmpty(native.cookies), (actual) => {
      expect(actual).toBe(!separatedCookies);
    });
    const checked = applyCachePolicy(native, publicReadRequest);
    const outgoing = HttpServerResponse.toWeb(checked);
    EffectFunction.pipe(
      EffectFunction.pipe(
        cacheHeaderNames,
        EffectArray.map((name) => outgoing.headers.get(name))
      ),
      (actual) => {
        expect(actual).toStrictEqual([
          privateCacheControl,
          privateCacheControl,
          privateCacheControl,
        ]);
      }
    );
    EffectFunction.pipe(outgoing.headers.getSetCookie(), (actual) => {
      expect(actual).toStrictEqual(["session=checked"]);
    });
    expect(checked.cookies).toBe(native.cookies);
    expect(checked.body).toBe(native.body);
    expect(outgoing.status).toBe(native.status);
  });
});
