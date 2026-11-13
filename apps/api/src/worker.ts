import { CalculatorCatalogueLive } from "@taxkit/calculators/live";
import { TaxKitApiWorker } from "@taxkit/infrastructure/api-worker";
import { Layer } from "effect";

import { ApiContentLive } from "./content.boundary.js";
import { apiWorkerNativeInit, apiWorkerProps } from "./worker.composition.js";

// The production leaves: the built documentation catalogue and the static
// calculator catalogue. Local fixture entries replace these leaves only.
const ApiWorkerLeavesLive = Layer.mergeAll(
  ApiContentLive,
  CalculatorCatalogueLive
);

export const ApiWorkerNativeInit = apiWorkerNativeInit(ApiWorkerLeavesLive);

export default TaxKitApiWorker.make(
  { ...apiWorkerProps, main: import.meta.url },
  ApiWorkerNativeInit
);
