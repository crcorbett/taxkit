import { createIsomorphicFn } from "@tanstack/react-start";
import { Effect } from "effect";
import * as Atom from "effect/reactivity/Atom";

import { webMcpAtom } from "./runtime.client";

// The atoms each environment mounts at the app root. Only the client branch
// reaches `runtime.client.ts`, so the server build drops that import; server
// rendering mounts an inert atom and never touches browser globals.
const inertAtom = Atom.make(Effect.void);
export const browserAtoms = createIsomorphicFn()
  .client(() => ({ registration: webMcpAtom }))
  .server(() => ({ registration: inertAtom }));
