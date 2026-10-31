import { strict, style } from "@commonplaces/oxlint-plugin";
import { describe, expect, it } from "@effect/vitest";
import { Function as EffectFunction, Array, Option, Record } from "effect";
import type { OxlintConfig } from "oxlint";

import configuration from "../../oxlint.config.ts";

describe("commonplaces presets", () => {
  it("inherits the complete shared presets in their documented order", () => {
    expect(configuration.extends).toStrictEqual([style, strict]);
  });

  it("keeps local rules at error severity, including ownership overrides", () => {
    const groups: readonly NonNullable<OxlintConfig["rules"]>[] = [
      configuration.rules,
      ...Array.map(
        (override: NonNullable<OxlintConfig["overrides"]>[number]) =>
          override.rules ?? {}
      )(configuration.overrides),
    ];
    Array.forEach((rules: NonNullable<OxlintConfig["rules"]>) => {
      Array.forEach((setting: NonNullable<OxlintConfig["rules"]>[string]) => {
        EffectFunction.pipe(Array.head(Array.ensure(setting)), (severity) => {
          expect(severity).toStrictEqual(Option.some("error"));
        });
      })(Record.values(rules));
    })(groups);
  });
});
