import { afterEach, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";

const repositoryRoot = join(import.meta.dir, "../..");
const oxlint = join(repositoryRoot, "node_modules/.bin/oxlint");
const temporaryFiles: string[] = [];

const runOxlint = (
  paths: readonly string[],
  extraArgs: readonly string[] = []
) => {
  const result = Bun.spawnSync({
    cmd: [
      oxlint,
      "-c",
      "oxlint.config.ts",
      "--disable-nested-config",
      "--no-error-on-unmatched-pattern",
      ...extraArgs,
      ...paths,
    ],
    cwd: repositoryRoot,
    stderr: "pipe",
    stdout: "pipe",
  });

  return {
    exitCode: result.exitCode,
    output: `${new TextDecoder().decode(result.stdout)}${new TextDecoder().decode(result.stderr)}`,
  };
};

const writeFixture = async (source: string, extension = "ts") => {
  const path = join(
    "/tmp",
    `taxkit-decoding-${crypto.randomUUID()}.${extension}`
  );

  temporaryFiles.push(path);
  await Bun.write(path, source);

  return path;
};

afterEach(async () => {
  await Promise.all(
    temporaryFiles.splice(0).map((path) => rm(path, { force: true }))
  );
});

const expectReported = async (
  source: string,
  expectedDiagnostics: number,
  extension?: string
) => {
  const fixture = await writeFixture(source, extension);
  const result = runOxlint([fixture]);

  expect(result.exitCode).toBe(1);
  expect(
    result.output.match(/taxkit\(no-decoding-outside-boundaries\)/gu)
  ).toHaveLength(expectedDiagnostics);
};

describe("taxkit/no-decoding-outside-boundaries", () => {
  test("reports Effect Schema decoder families and direct decoder helpers", async () => {
    await expectReported(
      `
      import { Schema } from "effect";
      import { decodeUnknownEffect as decodeInput } from "effect/Schema";

      Schema.decodeEffect(Schema.String);
      Schema.decodeExit(Schema.String);
      Schema.decodeOption(Schema.String);
      Schema.decodePromise(Schema.String);
      Schema.decodeResult(Schema.String);
      Schema.decodeSync(Schema.String);
      Schema.decodeUnknownEffect(Schema.String);
      Schema.decodeUnknownExit(Schema.String);
      Schema.decodeUnknownOption(Schema.String);
      Schema.decodeUnknownPromise(Schema.String);
      Schema.decodeUnknownResult(Schema.String);
      Schema.decodeUnknownSync(Schema.String);
      decodeInput(Schema.String);
      decodeJson("{} ");
    `,
      14
    );
  });

  test("reports renamed, namespace, computed and static alias forms", async () => {
    await expectReported(
      `
      import { Schema as S } from "effect";
      import * as SchemaNamespace from "effect/Schema";

      const LocalSchema = S;
      const decoderFactory = LocalSchema["decodeUnknownEffect"];
      const decoderAlias = decoderFactory;
      const { decodeUnknownSync: decodeSync } = SchemaNamespace;
      decoderAlias(S.String);
      decodeSync(S.String);
      SchemaNamespace.decodeUnknownExit(S.String);
      Stream.decodeText(stream);
    `,
      7
    );
  });

  test("reports decoder calls inside React components and ordinary hooks", async () => {
    await expectReported(
      `
        import { Schema } from "effect";

        export const Panel = () => {
          Schema.decodeUnknownSync(Schema.String)("value");
          return <div />;
        };

        export const useDecodedValue = () => Schema.decodeUnknownSync(Schema.String)("value");
      `,
      2,
      "tsx"
    );
  });

  test("permits declarative schema APIs and encoding", async () => {
    const fixture = await writeFixture(`
      import { Schema } from "effect";

      const From = Schema.String;
      const To = Schema.Number;
      Schema.decodeTo(From, To);
      Schema.encodeSync(From)("value");
      const declaration = { decodeOutput: To };
      void declaration;
    `);
    const result = runOxlint([fixture]);

    expect(result.output).not.toContain(
      "taxkit(no-decoding-outside-boundaries)"
    );
  });

  test("permits a decoder only for an exact configured boundary file", () => {
    const result = runOxlint(["apps/api/src/config.ts"]);

    expect(result.exitCode).toBe(0);
    expect(result.output).not.toContain(
      "taxkit(no-decoding-outside-boundaries)"
    );
  });

  test("rejects every inline disable spelling through Oxlint comment tokens", async () => {
    const fixture = await writeFixture(`
      /* eslint-disable taxkit/no-decoding-outside-boundaries */
      /* oxlint-disable taxkit/no-decoding-outside-boundaries */
      // eslint-disable-next-line taxkit/no-decoding-outside-boundaries
      const first = 1;
      // oxlint-disable-next-line taxkit/no-decoding-outside-boundaries
      const second = 2;
      const third = 3; // eslint-disable-line taxkit/no-decoding-outside-boundaries
      const fourth = 4; // oxlint-disable-line taxkit/no-decoding-outside-boundaries
      void [first, second, third, fourth];
    `);
    const result = runOxlint(
      [fixture],
      [
        "--allow=taxkit/no-decoding-outside-boundaries",
        "--report-unused-disable-directives-severity=error",
      ]
    );

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("Unused eslint-disable directive");
    expect(result.output).toContain("Unused oxlint-disable directive");
  });

  test("does not interpret directive text in a string literal as a comment", async () => {
    const fixture = await writeFixture(`
      const directiveText = "eslint-disable taxkit/no-decoding-outside-boundaries";
      void directiveText;
    `);
    const result = runOxlint(
      [fixture],
      [
        "--allow=taxkit/no-decoding-outside-boundaries",
        "--report-unused-disable-directives-severity=error",
      ]
    );

    expect(result.exitCode).toBe(0);
    expect(result.output).not.toContain("Unused eslint-disable directive");
  });
});
