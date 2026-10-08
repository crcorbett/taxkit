import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it as test } from "@effect/vitest";
import {
  Array as EffectArray,
  Effect,
  FileSystem,
  Result,
  Schema,
} from "effect";
import type { Scope } from "effect";

import automationJson from "./automation-register.json";
import { checkDocsDeploymentAutomation } from "./automation.check.runtime.js";
import {
  DeploymentAutomationRegister,
  DeploymentControlRegister,
} from "./automation.schemas.js";
import controlsJson from "./controls.json";

const withRegisters = <A, E>(
  run: (
    root: string
  ) => Effect.Effect<A, E, BunServices.BunServices | Scope.Scope>
) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const root = yield* fileSystem.makeTempDirectoryScoped({
      prefix: "taxkit-automation-command-",
    });
    yield* fileSystem.makeDirectory(`${root}/tools/docs-deployment`, {
      recursive: true,
    });
    const automations = yield* Schema.decodeUnknownEffect(
      DeploymentAutomationRegister
    )(
      EffectArray.map(automationJson, (entry) => ({
        ...entry,
        externalState: { receipt: null, status: "not-established" },
      }))
    );
    const controls = yield* Schema.decodeUnknownEffect(
      DeploymentControlRegister
    )(controlsJson);
    yield* fileSystem.writeFileString(
      `${root}/tools/docs-deployment/automation-register.json`,
      yield* Schema.encodeEffect(
        Schema.fromJsonString(DeploymentAutomationRegister)
      )(automations)
    );
    yield* fileSystem.writeFileString(
      `${root}/tools/docs-deployment/controls.json`,
      yield* Schema.encodeEffect(
        Schema.fromJsonString(DeploymentControlRegister)
      )(controls)
    );
    return yield* run(root);
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer));

test.effect(
  "does not establish external state from local register checks",
  () =>
    withRegisters((root) =>
      checkDocsDeploymentAutomation(root).pipe(
        Effect.tap((result) =>
          Effect.sync(() =>
            expect(result).toEqual({
              automationCount: 3,
              controlCount: 5,
              externalStateEstablished: 0,
            })
          )
        )
      )
    )
);

test.effect.each(["missing", "malformed", "excess"] as const)(
  "returns safe input failure for %s register",
  (problem) =>
    withRegisters((root) =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const target = "tools/docs-deployment/controls.json";
        if (problem === "missing") {
          yield* fileSystem.remove(`${root}/${target}`);
        } else {
          const source = yield* fileSystem.readFileString(`${root}/${target}`);
          yield* fileSystem.writeFileString(
            `${root}/${target}`,
            problem === "malformed"
              ? "TAXKIT_SECRET_SENTINEL"
              : source.replace(
                  '"id":',
                  '"extra": "TAXKIT_SECRET_SENTINEL", "id":'
                )
          );
        }
        const result = yield* checkDocsDeploymentAutomation(root).pipe(
          Effect.result
        );
        Result.match(result, {
          onFailure: (error) => {
            expect(error._tag).toBe("DeploymentAutomationInputError");
            expect(error).toHaveProperty("target", target);
            expect(String(error)).not.toContain(root);
            expect(String(error)).not.toContain("TAXKIT_SECRET_SENTINEL");
          },
          onSuccess: () => expect.unreachable(),
        });
      })
    )
);

test.effect(
  "returns the exact control finding for a valid but incomplete register",
  () =>
    withRegisters((root) =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        yield* fileSystem.writeFileString(
          `${root}/tools/docs-deployment/controls.json`,
          "[]"
        );
        const result = yield* checkDocsDeploymentAutomation(root).pipe(
          Effect.result
        );
        Result.match(result, {
          onFailure: (error) => {
            expect(error._tag).toBe("DeploymentAutomationPolicyError");
            expect(error).toHaveProperty("findings", [
              expect.objectContaining({
                invariant: "control-register",
                target: "tools/docs-deployment/controls.json",
              }),
            ]);
          },
          onSuccess: () => expect.unreachable(),
        });
      })
    )
);
