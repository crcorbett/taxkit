import { Effect } from "effect";

import { docsHomeRouteBoundary } from "./route-boundary";

const incompatibleSuccess = Effect.succeed("not docs home loader data");
const incompatibleFailure = Effect.fail("not a canonical docs loader error");

void docsHomeRouteBoundary.encodeExit(
  // @ts-expect-error The boundary success channel must match its canonical schema.
  incompatibleSuccess
);

void docsHomeRouteBoundary.encodeExit(
  // @ts-expect-error The boundary error channel must match its canonical schema.
  incompatibleFailure
);
