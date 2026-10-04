import { Array, Option } from "effect";

export const failure = new Error("valid constructor");
export const last = Array.last([1, 2]).pipe(Option.getOrElse(() => 0));
