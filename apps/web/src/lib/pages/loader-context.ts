import type * as Option from "effect/Option";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";

// Local framework context, never serialised and never an Effect Context.
export interface LoaderContext {
  readonly registry: Option.Option<AtomRegistry.AtomRegistry>;
}
