import { describe, expect, it } from "@effect/vitest";
import {
  Predicate,
  Function as EffectFunction,
  Array as EffectArray,
  Array,
  Option,
} from "effect";

import {
  decodeReadableRepositoryText,
  inspectRepositoryText,
  createRepositoryPathReport,
  renderRepositoryPathReport,
} from "./policy.js";
import { RepositoryRelativeFile } from "./schemas.js";

const usersDirectory = ["Us", "ers"].join("");
const checkoutDirectory = ["Pro", "jects"].join("");
const fixtureFile = RepositoryRelativeFile.make("fixtures/path-policy.md");
describe("repository path policy", () => {
  it("classifies every rejected path family without storing matched values", () => {
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
    const findings = EffectFunction.pipe(fixtureFile, (argument1) =>
      EffectFunction.pipe(
        EffectFunction.pipe(
          rejected,
          Array.map(([, value]) => value)
        ).join("\n"),
        (argument2) => inspectRepositoryText(argument1, argument2)
      )
    );
    EffectFunction.pipe(
      EffectFunction.pipe(
        findings,
        Array.map((finding) => finding.category)
      ),
      (actual) => {
        expect(actual).toStrictEqual(
          EffectFunction.pipe(
            rejected,
            Array.map(([category]) => category)
          )
        );
      }
    );
    EffectFunction.pipe(
      EffectFunction.pipe(
        findings,
        Array.map((finding) => finding.line)
      ),
      (actual) => {
        expect(actual).toStrictEqual([1, 2, 3, 4, 5]);
      }
    );
    EffectFunction.pipe(
      EffectFunction.pipe(
        findings,
        EffectArray.every((finding) => !Predicate.hasProperty(finding, "match"))
      ),
      (actual) => {
        expect(actual).toBeTruthy();
      }
    );
  });

  it("accepts portable references and ordinary prose", () => {
    const accepted = [
      "./docs/architecture/README.md",
      "crcorbett/taxkit",
      ["https://example.test/reference/", checkoutDirectory, "/site"].join(""),
      "Several projects are useful references.",
      "~/.portless/config.json",
    ];
    EffectFunction.pipe(
      EffectFunction.pipe(fixtureFile, (argument3) =>
        EffectFunction.pipe(accepted.join("\n"), (argument4) =>
          inspectRepositoryText(argument3, argument4)
        )
      ),
      (actual) => {
        expect(actual).toStrictEqual([]);
      }
    );
  });

  it.each([
    "fixture.md",
    "fixture.json",
    "fixture.yaml",
    "fixture.ts",
    "NOTICE",
  ])("reports portable line locations for %s", (file) => {
    const rejectedPath = ["~", "/", checkoutDirectory, "/taxkit"].join("");
    const findings = EffectFunction.pipe(
      RepositoryRelativeFile.make(file),
      (argument5) =>
        EffectFunction.pipe(`portable\r\n${rejectedPath}`, (argument6) =>
          inspectRepositoryText(argument5, argument6)
        )
    );
    expect(findings).toHaveLength(1);
    const finding = Array.head(findings).pipe(
      Option.getOrElse(() => expect.fail("Expected a path finding"))
    );
    expect(finding.file).toBe(RepositoryRelativeFile.make(file));
    expect(finding.line).toBe(2);
    expect(finding.category).toBe("tilde-checkout-path");
  });

  it("treats NUL-containing and malformed UTF-8 payloads as binary", () => {
    EffectFunction.pipe(
      Option.isNone(decodeReadableRepositoryText(new Uint8Array([0]))),
      (actual) => {
        expect(actual).toBeTruthy();
      }
    );
    EffectFunction.pipe(
      Option.isNone(decodeReadableRepositoryText(new Uint8Array([0xc3, 0x28]))),
      (actual) => {
        expect(actual).toBeTruthy();
      }
    );
    EffectFunction.pipe(
      EffectFunction.pipe(
        new TextEncoder().encode("portable text"),
        decodeReadableRepositoryText
      ).pipe(Option.getOrElse(() => "")),
      (actual) => {
        expect(actual).toBe("portable text");
      }
    );
  });

  it("sorts findings and renders only safe locations", () => {
    const privatePath = [
      "/",
      usersDirectory,
      "/private-person/",
      checkoutDirectory,
      "/taxkit",
    ].join("");
    const findings = [
      ...EffectFunction.pipe(
        RepositoryRelativeFile.make("z-last.md"),
        (argument7) =>
          EffectFunction.pipe(`portable\n${privatePath}`, (argument8) =>
            inspectRepositoryText(argument7, argument8)
          )
      ),
      ...EffectFunction.pipe(
        RepositoryRelativeFile.make("a-first.md"),
        (argument9) =>
          EffectFunction.pipe(privatePath, (argument10) =>
            inspectRepositoryText(argument9, argument10)
          )
      ),
    ];
    const report = createRepositoryPathReport({
      binaryFiles: 1,
      findings,
      textFiles: 2,
      trackedFiles: 3,
    });
    const rendered = renderRepositoryPathReport(report);
    EffectFunction.pipe(
      EffectFunction.pipe(
        report.findings,
        Array.map((finding) => `${finding.file}:${finding.line}`)
      ),
      (actual) => {
        expect(actual).toStrictEqual(["a-first.md:1", "z-last.md:2"]);
      }
    );
    expect(rendered).toContain("a-first.md:1 [posix-home-path]");
    expect(rendered).not.toContain("private-person");
    expect(rendered).not.toContain(privatePath);
  });
});
