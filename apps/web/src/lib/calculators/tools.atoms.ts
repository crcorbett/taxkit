import { requestCatalogue } from "@taxkit/api-http/requests";
import {
  CalculatorPageToolkit,
  calculatorPageToolHandlers,
} from "@taxkit/calculators/page-tools";
import type { CalculatorRunServiceRequest } from "@taxkit/calculators/schemas";
import { ModelContextHostLive } from "@taxkit/webmcp/host";
import { registerCalculatorPageTools } from "@taxkit/webmcp/registration";
import { WebMcpSite } from "@taxkit/webmcp/service";
import { Effect, Layer, Option } from "effect";
import * as Atom from "effect/reactivity/Atom";

import {
  ApiClient,
  apiClientRuntime,
  publicSettingsAtom,
} from "../api-client.atoms";
import { calculatorPageAtoms } from "./page.atoms";

// One mounted calculator owns these registrations and callbacks through its
// existing React runtime. Handlers invoke the page's own edit and submit
// commands; they neither acquire another client nor calculate themselves.
export const calculatorToolsAtom = Atom.family(
  (calculatorId: CalculatorRunServiceRequest["calculatorId"]) => {
    const page = calculatorPageAtoms(calculatorId);
    return apiClientRuntime.fn<"register">()((_, get) =>
      Effect.gen(function* () {
        const settings = get.registry.get(publicSettingsAtom);
        if (Option.isNone(settings)) {
          return yield* Effect.void;
        }
        // Reads made by a later native callback do not retain an idle atom.
        // Hold the current attempt for this page's entire registration.
        get.mount(page.attempt);
        const client = yield* ApiClient;
        const handlers = yield* calculatorPageToolHandlers({
          findCalculators: requestCatalogue(client),
          get,
          page,
        });
        const toolkit = yield* CalculatorPageToolkit.pipe(
          Effect.provide(handlers)
        );
        yield* registerCalculatorPageTools(toolkit).pipe(
          Effect.provide(
            ModelContextHostLive.pipe(
              Layer.provide(
                Layer.succeed(WebMcpSite)({
                  origin: settings.value.websiteOrigin,
                })
              )
            )
          )
        );
        // Retain the callback scope until React releases this page atom. The
        // host adapter removes the tools and interrupts their fibres.
        return yield* Effect.never;
      })
    );
  }
);
