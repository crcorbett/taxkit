import { CalculatorCatalogueLive } from "@taxkit/calculators/live";
import { CalculatorCatalogue } from "@taxkit/calculators/service";
import { TaxKitApiWorker } from "@taxkit/infrastructure/api-worker";
import { apiWorkerNativeInit, apiWorkerProps } from "api/composition";
import { ApiContentLive } from "api/content";
import { Context, Effect, Layer } from "effect";

// Native fixture entry: the real API composition over a calculator catalogue
// whose calculation and schema reads stall, to qualify stalled-work deadlines.
const StalledCatalogue = Layer.effect(
  CalculatorCatalogue,
  CalculatorCatalogueLive.pipe(
    Layer.build,
    Effect.map((context) => Context.get(context, CalculatorCatalogue)),
    Effect.map((calculator) =>
      CalculatorCatalogue.of({
        getCalculator: Effect.fn("CalculatorCatalogue.getCalculator")((input) =>
          calculator.getCalculator(input)
        ),
        getCalculatorGraph: Effect.fn("CalculatorCatalogue.getCalculatorGraph")(
          (input) => calculator.getCalculatorGraph(input)
        ),
        listCalculators: Effect.fn("CalculatorCatalogue.listCalculators")(
          (input) => calculator.listCalculators(input)
        ),
        listFacts: Effect.fn("CalculatorCatalogue.listFacts")((input) =>
          calculator.listFacts(input)
        ),
        listJurisdictions: Effect.fn("CalculatorCatalogue.listJurisdictions")(
          () => calculator.listJurisdictions()
        ),
        listRules: Effect.fn("CalculatorCatalogue.listRules")((input) =>
          calculator.listRules(input)
        ),
        listTaxYears: Effect.fn("CalculatorCatalogue.listTaxYears")((input) =>
          calculator.listTaxYears(input)
        ),
        calculate: Effect.fn("CalculatorCatalogue.calculate")((request) =>
          Effect.logWarning("PRIVATE9 work started").pipe(
            Effect.andThen(Effect.sleep("12 seconds")),
            Effect.andThen(calculator.calculate(request)),
            Effect.ensuring(Effect.logInfo("PRIVATE9 work released"))
          )
        ),
        getCalculatorSchema: Effect.fn(
          "CalculatorCatalogue.getCalculatorSchema"
        )((request) =>
          Effect.logWarning("PRIVATE9 metadata started").pipe(
            Effect.andThen(Effect.sleep("12 seconds")),
            Effect.andThen(calculator.getCalculatorSchema(request)),
            Effect.ensuring(Effect.logInfo("PRIVATE9 metadata released"))
          )
        ),
      })
    )
  )
);
const StalledWorkInit = Layer.mergeAll(ApiContentLive, StalledCatalogue).pipe(
  apiWorkerNativeInit
);

export default TaxKitApiWorker.make(
  { ...apiWorkerProps, main: import.meta.url },
  StalledWorkInit
);
