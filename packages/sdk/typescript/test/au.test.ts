import { expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { takeHomePay, payWithholdings } from "../src/au.js";
import { takeHomeFacts } from "./fixtures.js";

it.effect("named AU conveniences execute the same owning programs", () =>
  Effect.gen(function* () {
    const report = yield* Effect.promise(() => takeHomePay(takeHomeFacts));
    const ledger = yield* Effect.promise(() => payWithholdings(takeHomeFacts));
    expect(report.withholdings).toStrictEqual(ledger);
  })
);
