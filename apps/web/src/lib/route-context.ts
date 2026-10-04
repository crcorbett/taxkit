import type { TaxKitHttpApiService } from "@taxkit/api-http/client";
import type { ManagedRuntime } from "effect";

import type { TaxKitWebConfigError } from "./config";

export interface RouterContext {
  readonly api: Pick<
    ManagedRuntime.ManagedRuntime<TaxKitHttpApiService, TaxKitWebConfigError>,
    "runPromise" | "runPromiseExit"
  >;
}
