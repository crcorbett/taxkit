import { describe, expect, it } from "@effect/vitest";
import { Function as EffectFunction, Schema } from "effect";

import {
  HostName,
  apiHostName,
  publicationOrigin,
  taxKitZoneName,
  websiteRedirectHostName,
} from "../src/hostnames.js";

describe("hostnames", () => {
  it("derives every Production hostname and the publication origin from the zone", () => {
    expect([
      taxKitZoneName,
      websiteRedirectHostName,
      apiHostName,
      publicationOrigin,
    ]).toStrictEqual([
      "taxkit.dev",
      "www.taxkit.dev",
      "api.taxkit.dev",
      "https://taxkit.dev",
    ]);
  });

  it.each(["", "taxkit", "https://taxkit.dev", "TaxKit.dev", "-a.taxkit.dev"])(
    "rejects %j as a hostname",
    (value) => {
      EffectFunction.pipe(Schema.is(HostName)(value), (actual) => {
        expect(!actual).toBeTruthy();
      });
    }
  );
});
