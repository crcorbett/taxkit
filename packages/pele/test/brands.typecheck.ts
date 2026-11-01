import type { Source, Svg } from "@taxkit/pele/schemas";
import { expectTypeOf } from "vitest";

expectTypeOf<string>().not.toExtend<Source>();
expectTypeOf<string>().not.toExtend<Svg>();
expectTypeOf<Source>().not.toExtend<Svg>();
