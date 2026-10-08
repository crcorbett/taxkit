import { expect } from "@effect/vitest";
import { Array, Option } from "effect";

export const expectAt = <A>(items: readonly A[], index: number): A =>
  Array.get(items, index).pipe(
    Option.flatMap(Option.fromUndefinedOr),
    Option.getOrElse(() => expect.fail(`Expected item at index ${index}`))
  );
