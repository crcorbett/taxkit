import { Worker } from "@alchemy.run/cloudflare/Workers";
import type { InferEnv } from "@alchemy.run/cloudflare/Workers";
import type { HttpEffect } from "alchemy/Http";

// Deployment identity only. Root composition supplies the app implementation;
// neither the Website nor this declaration imports the API app.
export class TaxKitApiWorker extends Worker<
  TaxKitApiWorker,
  {
    readonly fetch: HttpEffect;
  }
>()("TaxKitApi") {}

export type TaxKitApiBinding = InferEnv<{
  readonly TAXKIT_API: typeof TaxKitApiWorker;
}>["TAXKIT_API"];
