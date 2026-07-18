import { Array, Match, Option, Order, Result } from "effect";
import { pipe } from "effect/Function";

import {
  RepositoryPathCategory,
  RepositoryPathFinding,
  RepositoryPathReport,
} from "./schemas.js";
import type { RepositoryRelativeFile } from "./schemas.js";

const homeDirectoryName = ["Us", "ers"].join("");
const checkoutDirectoryName = ["Pro", "jects"].join("");
const httpsReference = new RegExp("https://[^\\s)\\]}>]+", "gu");
const homeFileUrl = new RegExp(
  `file:///(?:${homeDirectoryName}|home)/[^/\\s]+(?:/|$)`,
  "u"
);
const windowsHomePath = new RegExp(
  `[A-Za-z]:[\\\\/]${homeDirectoryName}[\\\\/][^\\\\/\\s]+(?:[\\\\/]|$)`,
  "u"
);
const tildeCheckoutPath = new RegExp(
  `~[\\\\/]${checkoutDirectoryName}(?:[\\\\/]|$)`,
  "u"
);
const posixHomePath = new RegExp(
  `/(?:${homeDirectoryName}|home)/[^/\\s]+(?:/|$)`,
  "u"
);
const checkoutDirectoryPath = new RegExp(
  `(?:^|[^A-Za-z0-9_.~-])${checkoutDirectoryName}/[A-Za-z0-9._-]+`,
  "u"
);

const categoryForLine = (
  line: string
): Option.Option<RepositoryPathCategory> => {
  const candidate = line.replace(httpsReference, "");

  return Match.value(candidate).pipe(
    Match.when(
      (value) => homeFileUrl.test(value),
      () => RepositoryPathCategory.make("home-file-url")
    ),
    Match.when(
      (value) => windowsHomePath.test(value),
      () => RepositoryPathCategory.make("windows-home-path")
    ),
    Match.when(
      (value) => tildeCheckoutPath.test(value),
      () => RepositoryPathCategory.make("tilde-checkout-path")
    ),
    Match.when(
      (value) => posixHomePath.test(value),
      () => RepositoryPathCategory.make("posix-home-path")
    ),
    Match.when(
      (value) => checkoutDirectoryPath.test(value),
      () => RepositoryPathCategory.make("checkout-directory-path")
    ),
    Match.option
  );
};

export const inspectRepositoryText = (
  file: RepositoryRelativeFile,
  text: string
): readonly RepositoryPathFinding[] =>
  pipe(
    text.split(/\r?\n/u),
    Array.map((line, index) =>
      Option.map(
        categoryForLine(line),
        (category) =>
          new RepositoryPathFinding({
            category,
            file,
            line: index + 1,
          })
      )
    ),
    Array.getSomes
  );

export const decodeReadableRepositoryText = (
  bytes: Uint8Array
): Option.Option<string> =>
  bytes.includes(0)
    ? Option.none()
    : Result.try(() =>
        new TextDecoder("utf-8", { fatal: true }).decode(bytes)
      ).pipe(
        Result.match({
          onFailure: Option.none,
          onSuccess: Option.some,
        })
      );

const findingOrder = Order.combineAll<RepositoryPathFinding>([
  Order.mapInput(Order.String, (finding) => finding.file),
  Order.mapInput(Order.Number, (finding) => finding.line),
  Order.mapInput(Order.String, (finding) => finding.category),
]);

const sortRepositoryPathFindings = (
  findings: Iterable<RepositoryPathFinding>
): readonly RepositoryPathFinding[] => Array.sort(findings, findingOrder);

export const renderRepositoryPathReport = (
  report: RepositoryPathReport
): string =>
  Match.value(report.findings.length).pipe(
    Match.when(
      0,
      () =>
        `Repository path check passed: ${report.textFiles} text and ${report.binaryFiles} binary files from ${report.trackedFiles} tracked files.`
    ),
    Match.orElse(() =>
      [
        `Repository path check failed with ${report.findings.length} finding(s):`,
        ...Array.map(
          report.findings,
          (finding) => `${finding.file}:${finding.line} [${finding.category}]`
        ),
      ].join("\n")
    )
  );

export const makeRepositoryPathReport = (options: {
  readonly binaryFiles: number;
  readonly findings: Iterable<RepositoryPathFinding>;
  readonly textFiles: number;
  readonly trackedFiles: number;
}): RepositoryPathReport =>
  new RepositoryPathReport({
    binaryFiles: options.binaryFiles,
    findings: sortRepositoryPathFindings(options.findings),
    textFiles: options.textFiles,
    trackedFiles: options.trackedFiles,
  });
