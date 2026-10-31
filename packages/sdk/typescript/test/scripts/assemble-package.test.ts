import { expect, it } from "@effect/vitest";
import { Predicate, Function as EffectFunction, Effect, Option } from "effect";

import { relocateModuleImports } from "../../scripts/assemble-package.runtime.js";

it.effect(
  "relocates module references while preserving service identity strings",
  () =>
    Effect.gen(function* () {
      const source = `import { Money } from "@taxkit/core";
export { Money } from "@taxkit/core";
type Report = import("@taxkit/core").Money;
const load = () => import("@taxkit/core");
const serviceId = "@taxkit/core";`;
      const output = yield* relocateModuleImports(source, "entry.d.ts", () =>
        Option.some("./internal/core/index.js")
      );
      EffectFunction.pipe(
        output.match(/\.\/internal\/core\/index\.js/gu),
        (actual) => {
          expect(actual).toHaveLength(4);
        }
      );
      expect(output).toContain('const serviceId = "@taxkit/core"');
    })
);
it.effect("refuses an unassembled private dependency", () =>
  Effect.gen(function* () {
    const result = yield* relocateModuleImports(
      'export * from "@taxkit/unknown";',
      "entry.d.ts",
      () => Option.none()
    ).pipe(Effect.result);
    EffectFunction.pipe(Predicate.isTagged(result, "Failure"), (matches) => {
      expect(matches).toBeTruthy();
    });
  })
);
