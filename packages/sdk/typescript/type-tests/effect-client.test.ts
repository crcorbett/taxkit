import { Effect, Layer } from "effect";
import type { Schema } from "effect";
import { calculateReport, TaxKitLive } from "../src/effect.js";
import { AuPayTakeHomeCalculation } from "../src/au.js";
import { TakeHomeScenarioInputSchema, GrossPay, TaxablePay } from "../src/au/schemas.js";
import { Cents, Money, NonNegativeMoney } from "../src/money.js";
import { CalculateTakeHomePay, AuTakeHomePayWithSacrifice2025_26_Live, GrossPayFact, TaxFreeThresholdClaimedFact, TaxFreeThresholdClaimed } from "../src/au-effect.js";
const amount = NonNegativeMoney.make(Money.fromCents(Cents.make(165_400)));
const scenario = TakeHomeScenarioInputSchema.make({ grossPay: amount, period: "weekly", taxFreeThresholdClaimed: true });
const program = calculateReport(AuPayTakeHomeCalculation, scenario);
const closed: Effect.Effect<typeof AuPayTakeHomeCalculation.outputSchema.Type, typeof AuPayTakeHomeCalculation.errorSchema.Type> = program.pipe(Effect.provide(TaxKitLive));
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
const unfinished = CalculateTakeHomePay.pipe(Effect.provide(AuTakeHomePayWithSacrifice2025_26_Live), Effect.provide(Layer.mergeAll(Layer.succeed(GrossPayFact)(gross), Layer.succeed(TaxFreeThresholdClaimedFact)(new TaxFreeThresholdClaimed({ value: true })))));
declare const remaining: Effect.Services<typeof unfinished>;
// @ts-expect-error salary sacrifice remains in the native requirement channel.
const completed: never = remaining;
void completed;
// @ts-expect-error legacy independent descriptor factory is unavailable.
import { defineSdkCalculation } from "../src/effect.js";
void defineSdkCalculation;
