import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  DateInterval,
  IsoDate,
  dateInterval,
  isoDate,
} from "../src/primitives/date.js";
import {
  SourceArtifact,
  SourceChecksum,
  SourceExtract,
  SourceRef,
} from "../src/trace/node.js";

const sourceArtifact = new SourceArtifact({
  checksum: SourceChecksum.make("sha256:test"),
  documentVersion: "test",
  extract: new SourceExtract({ rowContract: "TestRow[]", rowCount: 1 }),
  retrievedOn: isoDate("2024-02-29"),
  source: SourceRef.make({
    kind: "internal-validation",
    reference: "test",
    title: "Test source",
  }),
});

const sourceArtifactInput = (retrievedOn: string) => ({
  ...sourceArtifact,
  retrievedOn,
});

describe("IsoDate", () => {
  it("keeps the branded Type and string Encoded representation", () => {
    const value = isoDate("2024-02-29");
    const encoded: typeof IsoDate.Encoded = value;

    expect(value).toBe("2024-02-29");
    expect(encoded).toBe("2024-02-29");
    expect(Schema.is(Schema.toEncoded(IsoDate))(encoded)).toBe(true);
  });

  it.each(["2024-02-29", "2000-02-29", "2026-07-19"])(
    "accepts real Gregorian date %s through Schema and constructor",
    (value) => {
      expect(Schema.is(IsoDate)(value)).toBe(true);
      expect(isoDate(value)).toBe(value);
    }
  );

  it.each([
    "2026-2-09",
    "2026-02-9",
    "2026-13-01",
    "2026-04-31",
    "2026-02-29",
    "1900-02-29",
    "0000-01-01",
  ])("rejects malformed or impossible date %s", (value) => {
    expect(Schema.is(IsoDate)(value)).toBe(false);
    expect(() => isoDate(value)).toThrow("Schema validation failed");
  });

  it("enforces the invariant inside DateInterval", () => {
    expect(
      Schema.is(DateInterval)({
        from: "2026-02-29",
        toExclusive: "2026-07-01",
      })
    ).toBe(false);
    expect(() =>
      dateInterval({ from: "2026-02-29", toExclusive: "2026-07-01" })
    ).toThrow("Schema validation failed");
  });

  it.each([
    { from: "2026-07-01", toExclusive: "2026-07-01" },
    { from: "2026-07-01", toExclusive: "2025-07-01" },
  ])(
    "rejects empty and reversed intervals at the Schema boundary",
    (interval) => {
      expect(Schema.is(DateInterval)(interval)).toBe(false);
      expect(() => dateInterval(interval)).toThrow("Schema validation failed");
    }
  );

  it("accepts increasing and open-ended intervals through the same Schema", () => {
    expect(
      Schema.is(DateInterval)({ from: "2025-07-01", toExclusive: "2026-07-01" })
    ).toBe(true);
    expect(Schema.is(DateInterval)({ from: "2025-07-01" })).toBe(true);
  });

  it("enforces the invariant inside SourceArtifact", () => {
    expect(
      Schema.is(Schema.toEncoded(SourceArtifact))(
        sourceArtifactInput("2026-02-29")
      )
    ).toBe(false);
    expect(
      Schema.is(Schema.toEncoded(SourceArtifact))(
        sourceArtifactInput("2024-02-29")
      )
    ).toBe(true);
  });
});
