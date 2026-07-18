import { describe, expect, test } from "bun:test";

import { Array, Option } from "effect";

import {
  decodeReadableRepositoryText,
  inspectRepositoryText,
  makeRepositoryPathReport,
  renderRepositoryPathReport,
} from "./policy.js";
import { RepositoryRelativeFile } from "./schemas.js";

const usersDirectory = ["Us", "ers"].join("");
const checkoutDirectory = ["Pro", "jects"].join("");
const fixtureFile = RepositoryRelativeFile.make("fixtures/path-policy.md");

describe("repository path policy", () => {
  test("classifies every rejected path family without storing matched values", () => {
    const rejected = [
      [
        "home-file-url",
        [
          "file:",
          "//",
          "/",
          usersDirectory,
          "/person/",
          checkoutDirectory,
          "/taxkit",
        ].join(""),
      ],
      [
        "windows-home-path",
        [
          "C:",
          "\\",
          usersDirectory,
          "\\person\\",
          checkoutDirectory,
          "\\taxkit",
        ].join(""),
      ],
      [
        "tilde-checkout-path",
        ["~", "/", checkoutDirectory, "/taxkit"].join(""),
      ],
      [
        "posix-home-path",
        ["/", usersDirectory, "/person/", checkoutDirectory, "/taxkit"].join(
          ""
        ),
      ],
      [
        "checkout-directory-path",
        [checkoutDirectory, "/site/packages/content"].join(""),
      ],
    ] as const;

    const findings = inspectRepositoryText(
      fixtureFile,
      Array.map(rejected, ([, value]) => value).join("\n")
    );

    expect(Array.map(findings, (finding) => finding.category)).toEqual(
      Array.map(rejected, ([category]) => category)
    );
    expect(Array.map(findings, (finding) => finding.line)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(findings.every((finding) => !("match" in finding))).toBe(true);
  });

  test("accepts portable references and ordinary prose", () => {
    const accepted = [
      "./docs/architecture/README.md",
      "crcorbett/taxkit",
      ["https://example.test/reference/", checkoutDirectory, "/site"].join(""),
      "Several projects are useful references.",
      "~/.portless/config.json",
    ];

    expect(inspectRepositoryText(fixtureFile, accepted.join("\n"))).toEqual([]);
  });

  test.each([
    "fixture.md",
    "fixture.json",
    "fixture.yaml",
    "fixture.ts",
    "NOTICE",
  ])("reports portable line locations for %s", (file) => {
    const rejectedPath = ["~", "/", checkoutDirectory, "/taxkit"].join("");
    const findings = inspectRepositoryText(
      RepositoryRelativeFile.make(file),
      `portable\r\n${rejectedPath}`
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.file).toBe(RepositoryRelativeFile.make(file));
    expect(findings[0]?.line).toBe(2);
    expect(findings[0]?.category).toBe("tilde-checkout-path");
  });

  test("treats NUL-containing and malformed UTF-8 payloads as binary", () => {
    expect(
      Option.isNone(decodeReadableRepositoryText(new Uint8Array([0])))
    ).toBe(true);
    expect(
      Option.isNone(decodeReadableRepositoryText(new Uint8Array([0xc3, 0x28])))
    ).toBe(true);
    expect(
      decodeReadableRepositoryText(
        new TextEncoder().encode("portable text")
      ).pipe(Option.getOrElse(() => ""))
    ).toBe("portable text");
  });

  test("sorts findings and renders only safe locations", () => {
    const privatePath = [
      "/",
      usersDirectory,
      "/private-person/",
      checkoutDirectory,
      "/taxkit",
    ].join("");
    const findings = [
      ...inspectRepositoryText(
        RepositoryRelativeFile.make("z-last.md"),
        `portable\n${privatePath}`
      ),
      ...inspectRepositoryText(
        RepositoryRelativeFile.make("a-first.md"),
        privatePath
      ),
    ];
    const report = makeRepositoryPathReport({
      binaryFiles: 1,
      findings,
      textFiles: 2,
      trackedFiles: 3,
    });
    const rendered = renderRepositoryPathReport(report);

    expect(
      Array.map(report.findings, (finding) => `${finding.file}:${finding.line}`)
    ).toEqual(["a-first.md:1", "z-last.md:2"]);
    expect(rendered).toContain("a-first.md:1 [posix-home-path]");
    expect(rendered).not.toContain("private-person");
    expect(rendered).not.toContain(privatePath);
  });
});
