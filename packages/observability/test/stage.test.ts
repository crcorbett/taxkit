import { describe, expect, it } from "@effect/vitest";
import { Function as EffectFunction, Schema } from "effect";

import { DeploymentStage, PullRequestStage } from "../src/stage.js";

describe("stage", () => {
  it.each(["pr-1", "pr-163", "pr-9999999"])(
    "accepts the bounded pull-request stage %s",
    (stage) => {
      EffectFunction.pipe(Schema.is(PullRequestStage)(stage), (actual) => {
        expect(actual).toBeTruthy();
      });
      EffectFunction.pipe(Schema.is(DeploymentStage)(stage), (actual) => {
        expect(actual).toBeTruthy();
      });
    }
  );

  it("accepts the retained production stage only as a deployment stage", () => {
    EffectFunction.pipe(Schema.is(DeploymentStage)("prod"), (actual) => {
      expect(actual).toBeTruthy();
    });
    EffectFunction.pipe(Schema.is(PullRequestStage)("prod"), (actual) => {
      expect(!actual).toBeTruthy();
    });
  });

  it.each([
    "pr-0",
    "pr-01",
    "pr-10000000",
    "pr-",
    "PR-1",
    "pr-1a",
    "preview",
    "production",
    "dev",
    "dev_local",
  ])("rejects %s", (stage) => {
    EffectFunction.pipe(Schema.is(DeploymentStage)(stage), (actual) => {
      expect(!actual).toBeTruthy();
    });
  });
});
