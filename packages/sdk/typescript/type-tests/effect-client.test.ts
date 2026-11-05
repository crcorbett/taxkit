import { Context, Effect, Layer, Schema, SchemaGetter } from "effect";

import {
  CalculateTakeHomePay,
  AuTakeHomePayWithSacrifice2025_26_Live,
  GrossPayFact,
  TaxFreeThresholdClaimedFact,
  TaxFreeThresholdClaimed,
  TaxablePayFact,
  PaygWithholdingComponentFact,
  PaygWithholdingLive,
} from "../src/au-effect.js";
import { AuPayTakeHomeCalculation } from "../src/au.js";
import type { TaxablePay } from "../src/au/schemas.js";
import { TakeHomeScenarioInputSchema, GrossPay } from "../src/au/schemas.js";
import {
  calculateReport,
  decodeInput,
  TaxKitLive,
  // @ts-expect-error removed independent descriptor factory is unavailable.
  defineSdkCalculation,
} from "../src/effect.js";
import { Cents, Money, NonNegativeMoney } from "../src/money.js";

const amount = NonNegativeMoney.make(Money.fromCents(Cents.make(165_400)));
const scenario = TakeHomeScenarioInputSchema.make({
  grossPay: amount,
  period: "weekly",
  taxFreeThresholdClaimed: true,
});
const program = calculateReport(AuPayTakeHomeCalculation, scenario);
const closed: Effect.Effect<
  typeof AuPayTakeHomeCalculation.outputSchema.Type,
  typeof AuPayTakeHomeCalculation.errorSchema.Type
> = program.pipe(Effect.provide(TaxKitLive));
void closed;
type Requirements = Effect.Services<typeof program>;
declare const requirements: Requirements;
// @ts-expect-error an engine service is still required until provided.
const noRequirements: never = requirements;
void noRequirements;
const gross = new GrossPay({ amount, period: "weekly" });
// @ts-expect-error gross and taxable pay retain separate nominal identities.
const taxable: TaxablePay = gross;
void taxable;
const unfinished = CalculateTakeHomePay.pipe(
  Effect.provide(AuTakeHomePayWithSacrifice2025_26_Live),
  Effect.provide(
    Layer.mergeAll(
      Layer.succeed(GrossPayFact)(gross),
      Layer.succeed(TaxFreeThresholdClaimedFact)(
        new TaxFreeThresholdClaimed({ value: true })
      )
    )
  )
);
declare const remaining: Effect.Services<typeof unfinished>;
// @ts-expect-error salary sacrifice remains in the native requirement channel.
const completed: never = remaining;
void completed;
void defineSdkCalculation;

declare const checkedTaxablePay: TaxablePay;
const parameterDependent = PaygWithholdingComponentFact.pipe(
  Effect.provide(PaygWithholdingLive),
  Effect.provideService(TaxablePayFact, checkedTaxablePay),
  Effect.provideService(
    TaxFreeThresholdClaimedFact,
    new TaxFreeThresholdClaimed({ value: true })
  )
);
declare const parameterRequirement: Effect.Services<typeof parameterDependent>;
// @ts-expect-error the statutory parameter service remains unprovided.
const noParameter: never = parameterRequirement;
void noParameter;
class DecodePermission extends Context.Service<DecodePermission, boolean>()(
  "test/DecodePermission"
) {}
const serviceCodec = Schema.String.pipe(
  Schema.decodeTo(Schema.String, {
    decode: SchemaGetter.transformEffect((value) =>
      DecodePermission.pipe(Effect.as(value))
    ),
    encode: SchemaGetter.passthrough(),
  })
);
const serviceIngress = decodeInput(
  { inputSchema: serviceCodec },
  "checked representation"
);
declare const decoderRequirement: Effect.Services<typeof serviceIngress>;
// @ts-expect-error explicit ingress preserves the codec's native decoding service.
const noDecoder: never = decoderRequirement;
void noDecoder;
