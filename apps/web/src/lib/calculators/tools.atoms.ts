import { requestCatalogue } from "@taxkit/api-http/requests";
import {
  CalculatorPageToolkit,
  calculatorPageToolHandlers,
} from "@taxkit/calculators/page-tools";
import type { CalculatorRunRequest } from "@taxkit/calculators/schemas";
import { ModelContextHostLive } from "@taxkit/webmcp/host";
import { registerCalculatorPageTools } from "@taxkit/webmcp/registration";
import { WebMcpSite } from "@taxkit/webmcp/service";
import { Context, Effect, Layer, Option, Stream } from "effect";
import * as Atom from "effect/reactivity/Atom";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";

import {
  ApiClient,
  apiClientRuntime,
  publicSettingsAtom,
} from "../api-client.atoms";
import { calculatorPageAtoms } from "./page.atoms";

// WebMCP tool names are unique in a document, so one mounted calculator owns
// them at a time. The registry removes an unmounted page's Atom in a later
// task; the next page waits until that registration's Scope has closed.
const toolNamesOwnerAtom = Atom.make(
  Option.none<CalculatorRunRequest["calculatorId"]>()
).pipe(Atom.keepAlive);

/**
 * One mounted calculator's browser-tool registration, keyed by its checked
 * calculator ID and mounted by the page container with `useAtomMount`. The
 * Atom's Scope owns the host Layer, the registrations and their callbacks:
 * unmounting removes the tools and interrupts running calls. Handlers invoke
 * the page's own edit and submit commands; they neither acquire another
 * client nor calculate themselves.
 */
export const calculatorToolsAtom = Atom.family(
  (calculatorId: CalculatorRunRequest["calculatorId"]) =>
    apiClientRuntime.atom((get) =>
      Effect.gen(function* () {
        const settings = get.once(publicSettingsAtom);
        if (Option.isNone(settings)) {
          return;
        }
        yield* AtomRegistry.toStream(get.registry, toolNamesOwnerAtom).pipe(
          Stream.filter(Option.isNone),
          Stream.take(1),
          Stream.runDrain
        );
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            get.registry.set(toolNamesOwnerAtom, Option.some(calculatorId));
          }),
          () =>
            Effect.sync(() => {
              get.registry.set(toolNamesOwnerAtom, Option.none());
            })
        );
        const page = calculatorPageAtoms(calculatorId);
        // Reads made by a later native callback do not retain an idle atom.
        // Hold the current attempt for this page's entire registration.
        get.mount(page.attempt);
        const host = yield* Layer.build(
          ModelContextHostLive.pipe(
            Layer.provide(
              Layer.succeed(WebMcpSite)({
                origin: settings.value.websiteOrigin,
              })
            )
          )
        );
        const handlers = yield* calculatorPageToolHandlers({
          findCalculators: requestCatalogue(yield* ApiClient),
          page,
          registry: get.registry,
        });
        yield* CalculatorPageToolkit.pipe(
          Effect.flatMap(registerCalculatorPageTools),
          Effect.provide(Context.merge(handlers, host))
        );
      })
    )
);
