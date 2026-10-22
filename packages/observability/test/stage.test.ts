import { expect, it } from "@effect/vitest";
import { Schema } from "effect";

import { DeploymentStage, PullRequestStage } from "../src/stage.js";

it.each(["pr-1", "pr-163", "pr-9999999"])(
  "accepts the bounded pull-request stage %s",
  (stage) => {
    expect(Schema.is(PullRequestStage)(stage)).toBe(true);
    expect(Schema.is(DeploymentStage)(stage)).toBe(true);
  }
);

it("accepts the retained production stage only as a deployment stage", () => {
  expect(Schema.is(DeploymentStage)("prod")).toBe(true);
  expect(Schema.is(PullRequestStage)("prod")).toBe(false);
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
  expect(Schema.is(DeploymentStage)(stage)).toBe(false);
});
