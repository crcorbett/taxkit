import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it } from "@effect/vitest";
import { Function as EffectFunction, Effect } from "effect";

import {
  lintFiles as runOxlint,
  writeTemporaryLintFixture as writeFixture,
} from "./cli-fixture.js";

const expectReported = Effect.fnUntraced(function* ({
  source,
  expectedDiagnostics,
  extension,
}: {
  readonly source: string;
  readonly expectedDiagnostics: number;
  readonly extension?: string;
}) {
  const fixture = yield* writeFixture({
    source,
    extension,
  });
  const result = yield* runOxlint({
    paths: [fixture],
  });
  expect(result.exitCode).toBe(1);
  EffectFunction.pipe(
    result.output.match(/taxkit\(no-decoding-outside-boundaries\)/gu),
    (actual) => {
      expect(actual).toHaveLength(expectedDiagnostics);
    }
  );
});
describe("taxkit/no-decoding-outside-boundaries", () => {
  it.effect("keeps tracking decoder assignments through lexical aliases", () =>
    expectReported({
      source: `
      import { Schema } from "effect";
      let execute;
      execute = Schema.decodeUnknownEffect;
      execute(Schema.String);
    `,
      expectedDiagnostics: 1,
    }).pipe(Effect.provide(BunServices.layer))
  );
  it.effect("follows a root namespace decoder alias", () =>
    expectReported({
      source: `
      import * as Root from "effect";
      const read = Root.Schema.decodeUnknownEffect;
      read(Root.Schema.String);
    `,
      expectedDiagnostics: 2,
    }).pipe(Effect.provide(BunServices.layer))
  );
  it.effect(
    "reports Effect Schema decoder families and direct decoder helpers",
    () =>
      expectReported({
        source: `
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
        expectedDiagnostics: 14,
      }).pipe(Effect.provide(BunServices.layer))
  );
  it.effect("reports renamed, namespace, computed and static alias forms", () =>
    expectReported({
      source: `
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
      expectedDiagnostics: 7,
    }).pipe(Effect.provide(BunServices.layer))
  );
  it.effect(
    "reports decoder calls inside React components and ordinary hooks",
    () =>
      expectReported({
        source: `
        import { Schema } from "effect";

        export const Panel = () => {
          Schema.decodeUnknownSync(Schema.String)("value");
          return <div />;
        };

        export const useDecodedValue = () => Schema.decodeUnknownSync(Schema.String)("value");
      `,
        expectedDiagnostics: 2,
        extension: "tsx",
      }).pipe(Effect.provide(BunServices.layer))
  );
  it.effect("permits declarative schema APIs and encoding", () =>
    Effect.gen(function* () {
      const fixture = yield* writeFixture({
        source: `
      import { Schema } from "effect";

      const From = Schema.String;
      const To = Schema.Number;
      Schema.decodeTo(From, To);
      Schema.encodeSync(From)("value");
      const declaration = { decodeOutput: To };
      void declaration;
    `,
      });
      const result = yield* runOxlint({
        paths: [fixture],
      });
      expect(result.output).not.toContain(
        "taxkit(no-decoding-outside-boundaries)"
      );
    }).pipe(Effect.provide(BunServices.layer))
  );
  it.effect(
    "permits a decoder only for an exact configured boundary file",
    () =>
      Effect.gen(function* () {
        const result = yield* runOxlint({
          paths: ["apps/api/src/config.ts"],
        });
        expect(result.exitCode).toBe(0);
        expect(result.output).not.toContain(
          "taxkit(no-decoding-outside-boundaries)"
        );
      }).pipe(Effect.provide(BunServices.layer))
  );
  it.effect(
    "rejects every inline disable spelling through Oxlint comment tokens",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeFixture({
          source: `
      /* eslint-disable taxkit/no-decoding-outside-boundaries */
      /* oxlint-disable taxkit/no-decoding-outside-boundaries */
      // eslint-disable-next-line taxkit/no-decoding-outside-boundaries
      const first = 1;
      // oxlint-disable-next-line taxkit/no-decoding-outside-boundaries
      const second = 2;
      const third = 3; // eslint-disable-line taxkit/no-decoding-outside-boundaries
      const fourth = 4; // oxlint-disable-line taxkit/no-decoding-outside-boundaries
      void [first, second, third, fourth];
    `,
        });
        const result = yield* runOxlint({
          paths: [fixture],
          extraArgs: [
            "--allow=taxkit/no-decoding-outside-boundaries",
            "--report-unused-disable-directives-severity=error",
          ],
        });
        expect(result.exitCode).toBe(1);
        expect(result.output).toContain("Unused eslint-disable directive");
        expect(result.output).toContain("Unused oxlint-disable directive");
      }).pipe(Effect.provide(BunServices.layer))
  );
  it.effect(
    "does not interpret directive text in a string literal as a comment",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeFixture({
          source: `
      const directiveText = "eslint-disable taxkit/no-decoding-outside-boundaries";
      void directiveText;
    `,
        });
        const result = yield* runOxlint({
          paths: [fixture],
          extraArgs: [
            "--allow=taxkit/no-decoding-outside-boundaries",
            "--report-unused-disable-directives-severity=error",
          ],
        });
        expect(result.exitCode).toBe(0);
        expect(result.output).not.toContain("Unused eslint-disable directive");
      }).pipe(Effect.provide(BunServices.layer))
  );
});
