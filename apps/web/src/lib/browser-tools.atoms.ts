import type { CalculatorRunServiceRequest } from "@taxkit/api-rpc/schemas";
import { Duration, Effect, Option, Result, Schema, Stream } from "effect";
import * as Atom from "effect/reactivity/Atom";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";

import { registerWebsiteBrowserTools } from "./browser-tools.boundary";
import { WebsiteBrowserToolFailure } from "./browser-tools.schemas";
import { WebsiteBrowserToolkit } from "./browser-tools.toolkit";
import {
  calculatorPageAtoms,
  calculatorRuntime,
  publicSettingsAtom,
  websiteCatalogueAtom,
} from "./calculator.atoms";
import { AnnualTaxForm, TakeHomeForm } from "./form.boundary";

// One mounted calculator owns these registrations and callbacks through its
// existing React runtime. Handlers invoke its existing edit/submit commands;
// they neither acquire another client nor perform their own calculation.
export const browserCalculatorToolsAtom = Atom.family(
  (calculatorId: CalculatorRunServiceRequest["calculatorId"]) => {
    const page = calculatorPageAtoms(calculatorId);
    return calculatorRuntime.fn<"register">()((_, get) =>
      Effect.gen(function* () {
        const settings = get.registry.get(publicSettingsAtom);
        if (Option.isNone(settings)) {
          return;
        }
        // Reads made by a later native callback do not retain an idle atom.
        // Hold the current attempt for this page's entire registration lifetime.
        get.mount(page.attempt);
        const handlers = yield* WebsiteBrowserToolkit.toHandlers({
          taxkit_calculate_visible_form: Effect.fn(
            "WebsiteBrowserTools.calculateVisibleForm"
          )(() =>
            Effect.gen(function* () {
              // Admission and visible submission are one synchronous registry
              // command. Two tool calls cannot both claim the same idle form.
              const owned = yield* Effect.sync(() => {
                if (get.registry.get(page.view).busy) {
                  return Result.fail(
                    new WebsiteBrowserToolFailure({
                      code: "calculation-busy",
                      retry: "wait-then-try-manually",
                    })
                  );
                }
                get.set(page.submit, "calculate");
                return get.registry.get(page.attempt).pipe(
                  Option.match({
                    onNone: () =>
                      Result.fail(
                        new WebsiteBrowserToolFailure({
                          code: "invalid-input",
                          retry: "check-the-visible-form",
                        })
                      ),
                    onSome: Result.succeed,
                  })
                );
              }).pipe(Effect.flatMap(Effect.fromResult));
              yield* AtomRegistry.getResult(get.registry, page.calculation, {
                suspendOnWaiting: true,
              }).pipe(
                Effect.raceFirst(
                  AtomRegistry.toStream(get.registry, page.attempt).pipe(
                    Stream.filter(
                      (current) =>
                        Option.isNone(current) || current.value !== owned
                    ),
                    Stream.take(1),
                    Stream.runDrain,
                    Effect.andThen(Effect.interrupt)
                  )
                ),
                Effect.mapError(
                  () =>
                    new WebsiteBrowserToolFailure({
                      code: "service-unavailable",
                      retry: "try-again-manually",
                    })
                ),
                Effect.timeoutOrElse({
                  duration: Duration.seconds(12),
                  orElse: () =>
                    Effect.fail(
                      new WebsiteBrowserToolFailure({
                        code: "service-unavailable",
                        retry: "try-again-manually",
                      })
                    ),
                }),
                Effect.onExit(() =>
                  Effect.sync(() => {
                    // Cancel only unfinished work still owned by this call. A
                    // newer manual request must survive an older tool's cleanup.
                    if (
                      get.registry.get(page.view).busy &&
                      get.registry
                        .get(page.attempt)
                        .pipe(Option.exists((current) => current === owned))
                    ) {
                      get.set(page.cancel, "cancel");
                    }
                  })
                )
              );
              const current = get.registry.get(page.view);
              if (
                !get.registry
                  .get(page.attempt)
                  .pipe(Option.exists((attempt) => attempt === owned))
              ) {
                return yield* Effect.interrupt;
              }
              if (current.stale || Option.isNone(current.report)) {
                return yield* Effect.fail(
                  new WebsiteBrowserToolFailure({
                    code: "no-current-result",
                    retry: "try-again-manually",
                  })
                );
              }
              return current;
            })
          ),
          taxkit_fill_calculator: Effect.fn(
            "WebsiteBrowserTools.fillCalculator"
          )((form) =>
            Effect.sync(() => {
              if (
                !(calculatorId === "au.income-tax.annual"
                  ? Schema.is(AnnualTaxForm)(form)
                  : Schema.is(TakeHomeForm)(form))
              ) {
                return Result.fail(
                  new WebsiteBrowserToolFailure({
                    code: "invalid-input",
                    retry: "check-the-visible-form",
                  })
                );
              }
              get.set(page.edit, form);
              return Result.succeed(get.registry.get(page.view));
            }).pipe(Effect.flatMap(Effect.fromResult))
          ),
          taxkit_find_calculators: Effect.fn(
            "WebsiteBrowserTools.findCalculators"
          )(() =>
            Effect.sync(() => get.registry.get(websiteCatalogueAtom)).pipe(
              Effect.flatMap(
                Option.match({
                  onNone: () =>
                    Effect.fail(
                      new WebsiteBrowserToolFailure({
                        code: "service-unavailable",
                        retry: "try-again-manually",
                      })
                    ),
                  onSome: Effect.succeed,
                })
              )
            )
          ),
          taxkit_read_calculator: Effect.fn(
            "WebsiteBrowserTools.readCalculator"
          )(() => Effect.sync(() => get.registry.get(page.view))),
          taxkit_read_result: Effect.fn("WebsiteBrowserTools.readResult")(() =>
            Effect.sync(() => get.registry.get(page.view))
          ),
        });
        const toolkit = yield* WebsiteBrowserToolkit.pipe(
          Effect.provide(handlers)
        );
        yield* registerWebsiteBrowserTools(
          toolkit,
          settings.value.websiteOrigin
        );
        // Retain the callback scope until React releases this page atom. The
        // registration adapter removes tools and interrupts its fibre set.
        return yield* Effect.never;
      })
    );
  }
);
