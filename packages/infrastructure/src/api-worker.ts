import { Worker } from "alchemy/Cloudflare/Workers";
import type { InferEnv } from "alchemy/Cloudflare/Workers";
import type { HttpEffect } from "alchemy/Http";
import type { Effect, Scope } from "effect";

// Deployment identity only. Root composition supplies the app implementation;
// neither the Website nor this declaration imports the API app.
export class TaxKitApiWorker extends Worker<
  TaxKitApiWorker,
  {
    readonly fetch: HttpEffect;
    readonly calculatorRequest: (
      request: Request,
      encodedKey: string
    ) => Effect.Effect<Response, never, Scope.Scope>;
  }
>()("TaxKitApi") {}

export type TaxKitApiBinding = InferEnv<{
  readonly TAXKIT_API: typeof TaxKitApiWorker;
}>["TAXKIT_API"];
