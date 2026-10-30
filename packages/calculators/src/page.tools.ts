import {
  Match,
  Duration,
  Effect,
  Option,
  Result,
  Schema,
  Stream,
} from "effect";
import { Tool, Toolkit } from "effect/ai";
import type * as Atom from "effect/reactivity/Atom";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";

import { AnnualTaxForm, CalculatorForm, TakeHomeForm } from "./form.ingress.js";
import type { CalculatorPage } from "./page.atoms.js";
import { CalculatorToolFailure, CalculatorViewState } from "./page.schemas.js";
import { CalculatorCatalogResponse } from "./schemas.js";
// Native callbacks supply unknown input. Decode it directly into the owning
// EmptyParams contract: an empty Struct alone accepts excess fields.
const NoArguments = Schema.Unknown.pipe(Schema.decodeTo(Tool.EmptyParams));
const ToolFailure = Schema.toCodecJson(CalculatorToolFailure);
const ToolView = Schema.toCodecJson(CalculatorViewState);
// These operations act on the mounted page, so their names and inputs differ
// from remote MCP's catalogue/calculation operations. Both interfaces still
// use the owning catalogue/report Schemas and the same calculation service.
export const CalculatorPageToolkit = Toolkit.make(
  Tool.make("taxkit_find_calculators", {
    description:
      "Read the same supported calculator list shown in this page's navigation. Choose a calculator through the visible links.",
    failure: ToolFailure,
    parameters: NoArguments,
    success: Schema.toCodecJson(CalculatorCatalogResponse),
  })
    .annotate(Tool.Readonly, true)
    .annotate(Tool.Strict, true),
  Tool.make("taxkit_read_calculator", {
    description:
      "Read the mounted calculator's visible form, current or retained answer, waiting state and safe message. A stale answer does not match the current form.",
    failure: ToolFailure,
    parameters: NoArguments,
    success: ToolView,
  })
    .annotate(Tool.Readonly, true)
    .annotate(Tool.Strict, true),
  Tool.make("taxkit_fill_calculator", {
    description:
      "Replace the mounted calculator's visible form fields. This cancels its unfinished calculation and marks any retained answer stale. Does not calculate or save figures.",
    failure: ToolFailure,
    parameters: CalculatorForm,
    success: ToolView,
  })
    .annotate(Tool.Readonly, false)
    .annotate(Tool.Strict, true),
  Tool.make("taxkit_calculate_visible_form", {
    description:
      "Press Calculate for the mounted calculator's current visible form and wait for that attempt. Uses the existing anonymous API allowance. Figures are not saved. Do not retry automatically.",
    failure: ToolFailure,
    parameters: NoArguments,
    success: ToolView,
  })
    .annotate(Tool.Readonly, false)
    .annotate(Tool.Strict, true),
  Tool.make("taxkit_read_result", {
    description:
      "Read the answer currently displayed by the mounted calculator. Check stale, busy and message before using a retained answer.",
    failure: ToolFailure,
    parameters: NoArguments,
    success: ToolView,
  })
    .annotate(Tool.Readonly, true)
    .annotate(Tool.Strict, true)
);
const unavailable = () =>
  new CalculatorToolFailure({
    code: "service-unavailable",
    retry: "try-again-manually",
  });
const invalidInput = () =>
  new CalculatorToolFailure({
    code: "invalid-input",
    retry: "check-the-visible-form",
  });
/**
 * One mounted page's tool handlers. They invoke the page's own edit and submit
 * commands through the registry; they neither acquire a client nor calculate.
 * `findCalculators` is the host's catalogue read.
 */
export const calculatorPageToolHandlers = <E, F>({
  findCalculators,
  get,
  page,
}: Readonly<{
  findCalculators: Effect.Effect<typeof CalculatorCatalogResponse.Type, F>;
  get: Atom.FnContext;
  page: CalculatorPage<E>;
}>) =>
  CalculatorPageToolkit.toHandlers({
    taxkit_calculate_visible_form: Effect.fn(
      "CalculatorPageTools.calculateVisibleForm"
    )(function* () {
      // Admission and visible submission are one synchronous registry
      // command. Two tool calls cannot both claim the same idle form.
      const owned = yield* Effect.sync(() => {
        if (get.registry.get(page.view).busy) {
          return Result.fail(
            new CalculatorToolFailure({
              code: "calculation-busy",
              retry: "wait-then-try-manually",
            })
          );
        }
        get.set(page.submit, "calculate");
        return get.registry.get(page.attempt).pipe(
          Option.match({
            onNone: () => Result.fail(invalidInput()),
            onSome: Result.succeed,
          })
        );
      }).pipe(Effect.flatMap(Effect.fromResult));
      yield* AtomRegistry.getResult(get.registry, page.calculation, {
        suspendOnWaiting: true,
      }).pipe(
        Effect.raceFirst(
          AtomRegistry.toStream(get.registry, page.attempt).pipe(
            Stream.dropWhile(
              (current) => Option.isSome(current) && current.value === owned
            ),
            Stream.take(1),
            Stream.runDrain,
            Effect.andThen(Effect.interrupt)
          )
        ),
        Effect.mapError(unavailable),
        Effect.timeoutOrElse({
          duration: Duration.seconds(12),
          orElse: () => Effect.fail(unavailable()),
        }),
        Effect.onExit(() =>
          Effect.sync(() => {
            // Cancel only unfinished work still owned by this call. A newer
            // manual request must survive an older tool's cleanup.
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
          new CalculatorToolFailure({
            code: "no-current-result",
            retry: "try-again-manually",
          })
        );
      }
      return current;
    }),
    taxkit_fill_calculator: Effect.fn("CalculatorPageTools.fillCalculator")(
      (form) =>
        Effect.sync(() => {
          const current = get.registry.get(page.view);
          if (
            !Match.value(current).pipe(
              Match.when({ calculatorId: "au.income-tax.annual" }, () =>
                Schema.is(AnnualTaxForm)(form)
              ),
              Match.orElse(() => Schema.is(TakeHomeForm)(form))
            )
          ) {
            return Result.fail(invalidInput());
          }
          get.set(page.edit, form);
          return Result.succeed(get.registry.get(page.view));
        }).pipe(Effect.flatMap(Effect.fromResult))
    ),
    taxkit_find_calculators: Effect.fn("CalculatorPageTools.findCalculators")(
      () => findCalculators.pipe(Effect.mapError(unavailable))
    ),
    taxkit_read_calculator: Effect.fn("CalculatorPageTools.readCalculator")(
      () => Effect.sync(() => get.registry.get(page.view))
    ),
    taxkit_read_result: Effect.fn("CalculatorPageTools.readResult")(() =>
      Effect.sync(() => get.registry.get(page.view))
    ),
  });
