import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it } from "@effect/vitest";
import {
  Function as EffectFunction,
  Array,
  Effect,
  FileSystem,
  Record,
} from "effect";

import { workspaceBoundaryOptions } from "../oxlint/workspaces.boundary.js";

// A package README is its public contract: it names every export path, so an
// added or removed subpath changes the README in the same change.
it.effect("every package README lists each public export path", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const missing = yield* EffectFunction.pipe(
      workspaceBoundaryOptions.workspaces,
      Array.filter(({ owner }) => owner.startsWith("packages/")),
      Effect.forEach(({ exports, name, owner }) =>
        fs.readFileString(`${owner}/README.md`).pipe(
          Effect.map((readme) =>
            EffectFunction.pipe(
              Record.keys(exports),
              Array.filter(
                (key) =>
                  !readme.includes(`\`${key}\``) &&
                  !readme.includes(`\`${name}${key.slice(1)}\``)
              ),
              Array.map((key) => `${owner}: ${key}`)
            )
          )
        )
      ),
      Effect.map(Array.flatten)
    );
    expect(missing).toStrictEqual([]);
  }).pipe(Effect.provide(BunServices.layer))
);
