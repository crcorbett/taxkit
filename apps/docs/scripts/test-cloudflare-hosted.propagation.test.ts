import { expect, test } from "bun:test";

import { chromium } from "playwright";

import { HostedProofAssetPropagationError } from "./cloudflare-hosted-proof.boundary.js";
import { visitHydratedPage } from "./test-cloudflare-hosted.js";

test("retries a stale JavaScript asset while the new page reaches the edge", async () => {
  let assetRequests = 0;
  // oxlint-disable-next-line bun/no-host-api-outside-adapters -- this browser test owns its temporary loopback server.
  const server = Bun.serve({
    fetch(request) {
      const path = new URL(request.url).pathname;
      if (path === "/guide") {
        return new Response(
          '<html><head><script defer src="/assets/route-ABC123xy.js"></script></head><body><main id="docs-main"></main></body></html>',
          { headers: { "content-type": "text/html" } }
        );
      }
      if (path === "/assets/route-ABC123xy.js") {
        assetRequests += 1;
        return assetRequests === 1
          ? new Response("Missing", { status: 404 })
          : new Response(
              'globalThis.__TSR_ROUTER__={navigate:async()=>{}};document.querySelector("main").dataset.tkHydrated="true";document.querySelector("main").dataset.tkNavigationInteractive="true";',
              { headers: { "content-type": "text/javascript" } }
            );
      }
      return new Response("Missing", { status: 404 });
    },
    hostname: "127.0.0.1",
    port: 0,
  });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const diagnostics: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        diagnostics.push(message.text());
      }
    });

    const retries = await visitHydratedPage({
      attempts: 3,
      delayMs: 10,
      diagnostics,
      hydrationTimeoutMs: 200,
      origin: `http://127.0.0.1:${server.port}`,
      page,
      path: "/guide",
    });

    expect(retries).toBe(1);
    expect(assetRequests).toBe(2);
    expect(diagnostics).toEqual([]);
    expect(
      await page.evaluate(() => globalThis.__TSR_ROUTER__ !== undefined)
    ).toBe(true);
  } finally {
    await browser.close();
    server.stop(true);
  }
}, 10_000);

test("stops after the allowed attempts when the JavaScript asset stays missing", async () => {
  let assetRequests = 0;
  // oxlint-disable-next-line bun/no-host-api-outside-adapters -- this browser test owns its temporary loopback server.
  const server = Bun.serve({
    fetch(request) {
      const path = new URL(request.url).pathname;
      if (path === "/guide") {
        return new Response(
          '<html><head><script defer src="/assets/route-ABC123xy.js"></script></head><body></body></html>',
          { headers: { "content-type": "text/html" } }
        );
      }
      if (path === "/assets/route-ABC123xy.js") {
        assetRequests += 1;
      }
      return new Response("Missing", { status: 404 });
    },
    hostname: "127.0.0.1",
    port: 0,
  });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await expect(
      visitHydratedPage({
        attempts: 2,
        delayMs: 10,
        diagnostics: [],
        hydrationTimeoutMs: 200,
        origin: `http://127.0.0.1:${server.port}`,
        page,
        path: "/guide",
      })
    ).rejects.toBeInstanceOf(HostedProofAssetPropagationError);
    expect(assetRequests).toBe(2);
  } finally {
    await browser.close();
    server.stop(true);
  }
}, 10_000);
