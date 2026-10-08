import { expect, it } from "@effect/vitest";
import { CollectionPolicyHeader } from "@taxkit/analytics/schemas";
import type { CalculatorUse } from "@taxkit/analytics/schemas";
import {
  CalculationRequest,
  CalculatorFixture,
  CalculatorLive,
} from "@taxkit/api-rpc/testing/fixtures";
import { GetCalculatorRequest } from "@taxkit/calculators/schemas";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { Array, Cause, Effect, Exit, Layer, Option, Ref } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/http";

import { withCalculatorAnalytics } from "../src/analytics-request.boundary.js";
import {
  ApiCalculatorAnalyticsLive,
  ApiCalculatorEvents,
} from "../src/calculator-analytics.layer.js";

const AnalyticsCalculatorLive = ApiCalculatorAnalyticsLive.pipe(
  Layer.provide(CalculatorLive)
);

it.effect.each([
  { count: 1, headers: {} },
  { count: 1, headers: { [CollectionPolicyHeader]: "allow" } },
  { count: 0, headers: { [CollectionPolicyHeader]: "deny" } },
  { count: 0, headers: { [CollectionPolicyHeader]: "malformed-policy" } },
  { count: 0, headers: { dnt: "1" } },
  { count: 0, headers: { dnt: "1", [CollectionPolicyHeader]: "allow" } },
])(
  "checked request policy keeps successful calculation independent of collection %j",
  ({ headers, count }) =>
    Effect.gen(function* () {
      const observed = yield* Ref.make<readonly CalculatorUse[]>([]);
      const operation = Effect.gen(function* () {
        const service = yield* PublicCalculatorService;
        const result = yield* service
          .calculate(CalculationRequest)
          .pipe(
            Effect.catch(() =>
              Effect.die("The successful calculator fixture failed")
            )
          );
        expect(result.calculator.calculatorId).toBe(
          CalculationRequest.calculatorId
        );
        yield* Option.match(yield* ApiCalculatorEvents, {
          onNone: () => Effect.die("Missing request-owned collector"),
          onSome: ({ events }) =>
            Ref.get(events).pipe(
              Effect.flatMap((items) => Ref.set(observed, items))
            ),
        });
        return HttpServerResponse.empty({ status: 200 });
      });
      expect(
        (yield* withCalculatorAnalytics(operation).pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromWeb(
              new Request("https://api.example.com/rpc?private-query=ignored", {
                headers,
              })
            )
          ),
          Effect.provide(AnalyticsCalculatorLive),
          Effect.scoped
        )).status
      ).toBe(200);
      const events = yield* Ref.get(observed);
      expect(events.length).toBe(count);
      if (count === 1) {
        expect(events).toEqual([
          {
            calculatorId: CalculationRequest.calculatorId,
            calculatorName: expect.any(String),
            collectionPolicy: "allow",
          },
        ]);
      }
    })
);

it.effect.each(["expected", "defect", "mixed", "capacity", "timeout"] as const)(
  "failed %s calculation adds no successful-use event",
  (mode) =>
    Effect.gen(function* () {
      const events = yield* Ref.make<readonly CalculatorUse[]>([]);
      const exit = yield* PublicCalculatorService.pipe(
        Effect.flatMap((calculator) =>
          calculator.calculate(CalculationRequest)
        ),
        Effect.exit,
        Effect.provideService(
          ApiCalculatorEvents,
          Option.some({ collectionPolicy: "allow", events })
        ),
        Effect.provide(
          ApiCalculatorAnalyticsLive.pipe(
            Layer.provide(
              CalculatorFixture(mode).pipe(Layer.provide(CalculatorLive))
            )
          )
        )
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (mode === "mixed" && Exit.isFailure(exit)) {
        expect(Cause.hasInterrupts(exit.cause)).toBe(true);
      }
      expect(yield* Ref.get(events)).toEqual([]);
    })
);

it.effect("metadata and direct local calculator work generate no event", () =>
  Effect.gen(function* () {
    const events = yield* Ref.make<readonly CalculatorUse[]>([]);
    yield* PublicCalculatorService.pipe(
      Effect.flatMap((calculator) =>
        calculator.getCalculator(
          GetCalculatorRequest.make({
            calculatorId: CalculationRequest.calculatorId,
          })
        )
      ),
      Effect.provide(AnalyticsCalculatorLive),
      Effect.provideService(
        ApiCalculatorEvents,
        Option.some({
          collectionPolicy: "allow",
          events,
        })
      )
    );
    yield* PublicCalculatorService.pipe(
      Effect.flatMap((calculator) => calculator.calculate(CalculationRequest)),
      Effect.provide(AnalyticsCalculatorLive)
    );
    expect(yield* Ref.get(events)).toEqual([]);
  })
);

it.effect(
  "concurrent allowed and denied calls use different request collectors",
  () =>
    Effect.gen(function* () {
      const allowed = yield* Ref.make<readonly CalculatorUse[]>([]);
      const denied = yield* Ref.make<readonly CalculatorUse[]>([]);
      const calculator = yield* PublicCalculatorService;
      yield* Effect.all(
        [
          calculator.calculate(CalculationRequest).pipe(
            Effect.provideService(
              ApiCalculatorEvents,
              Option.some({
                collectionPolicy: "allow",
                events: allowed,
              })
            )
          ),
          calculator.calculate(CalculationRequest).pipe(
            Effect.provideService(
              ApiCalculatorEvents,
              Option.some({
                collectionPolicy: "deny",
                events: denied,
              })
            )
          ),
        ],
        { concurrency: "unbounded" }
      );
      expect((yield* Ref.get(allowed)).length).toBe(1);
      expect(yield* Ref.get(denied)).toEqual([]);
    }).pipe(Effect.provide(AnalyticsCalculatorLive))
);

it.effect(
  "one request has a bounded collector even when it makes many successful calls",
  () =>
    Effect.gen(function* () {
      const events = yield* Ref.make<readonly CalculatorUse[]>([]);
      const calculator = yield* PublicCalculatorService;
      yield* Effect.forEach(
        Array.range(0, 65),
        () => calculator.calculate(CalculationRequest),
        {
          discard: true,
        }
      ).pipe(
        Effect.provideService(
          ApiCalculatorEvents,
          Option.some({ collectionPolicy: "allow", events })
        )
      );
      expect((yield* Ref.get(events)).length).toBe(64);
    }).pipe(Effect.provide(AnalyticsCalculatorLive))
);
