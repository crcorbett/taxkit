import { expect, it } from "@effect/vitest";
import { Schema } from "effect";

import {
  HostName,
  apiHostName,
  publicationOrigin,
  taxKitZoneName,
  websiteRedirectHostName,
} from "../src/hostnames.js";

it("derives every Production hostname and the publication origin from the zone", () => {
  expect([
    taxKitZoneName,
    websiteRedirectHostName,
    apiHostName,
    publicationOrigin,
  ]).toEqual([
    "taxkit.dev",
    "www.taxkit.dev",
    "api.taxkit.dev",
    "https://taxkit.dev",
  ]);
});

it.each(["", "taxkit", "https://taxkit.dev", "TaxKit.dev", "-a.taxkit.dev"])(
  "rejects %j as a hostname",
  (value) => {
    expect(Schema.is(HostName)(value)).toBe(false);
  }
);
