import { describe, expect, it as test } from "@effect/vitest";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Provider from "alchemy/Provider";
import { State, StateStoreError } from "alchemy/State";
import type { StateService } from "alchemy/State";
import { Deferred, Effect, Fiber, Layer, Option, Ref, Result } from "effect";

import { DocsDeploymentInventoryLive } from "./inventory.live.layer.js";
import { DocsDeploymentInventory } from "./inventory.service.js";

const workerName = "taxkitdocscloudflare-docswebsite-prod-example";
const workerUrl = `https://${workerName}.example.workers.dev`;
const stackTag = "alchemy:stack:TaxKitDocsCloudflare";
const tags = [stackTag, "alchemy:stage:prod", "alchemy:id:DocsWebsite"];
const providerWorker = {
  accountId: "fixture-account",
  crons: [],
  domain: undefined,
  durableObjectNamespaces: {},
  logpush: undefined,
  namespace: undefined,
  routes: [],
  tags,
  url: workerUrl,
  urls: [workerUrl],
  workerId: "fixture-worker",
  workerName,
};
const stateResource = {
  attr: { tags, url: workerUrl, workerName },
  bindings: [],
  downstream: [],
  fqn: "DocsWebsite",
  instanceId: "worker-instance",
  logicalId: "DocsWebsite",
  namespace: undefined,
  props: {},
  providerVersion: 1,
  resourceType: "Cloudflare.Worker",
  status: "updated",
} satisfies NonNullable<Effect.Success<ReturnType<StateService["get"]>>>;

const stateFixture = (overrides: Partial<StateService> = {}): StateService => ({
  delete: () => Effect.die("Inventory must never delete state"),
  deleteStack: () => Effect.die("Inventory must never delete a stack"),
  get: (request) => {
    expect(request).toEqual({
      fqn: "DocsWebsite",
      stack: "TaxKitDocsCloudflare",
      stage: "prod",
    });
    return Effect.succeed(stateResource);
  },
  getOutput: () => Effect.die("Inventory does not read outputs"),
  getReplacedResources: () =>
    Effect.die("Inventory does not read replacements"),
  getVersion: () => Effect.succeed(7),
  id: "cloudflare-http",
  list: (request) => {
    expect(request).toEqual({ stack: "TaxKitDocsCloudflare", stage: "prod" });
    return Effect.succeed(["DocsWebsite"]);
  },
  listStacks: () => Effect.die("Inventory does not read other stacks"),
  listStages: (stack) => {
    expect(stack).toBe("TaxKitDocsCloudflare");
    return Effect.succeed(["prod"]);
  },
  set: () => Effect.die("Inventory must never write state"),
  setOutput: () => Effect.die("Inventory must never write outputs"),
  ...overrides,
});
type WorkerProvider = Effect.Success<typeof Cloudflare.Worker.Provider>;
const workerFixture = (
  overrides: Partial<WorkerProvider> = {}
): WorkerProvider =>
  Cloudflare.Worker.Provider.of({
    delete: () => Effect.die("Inventory must never delete Workers"),
    diff: () => Effect.die("Inventory must never plan Workers"),
    list: () => Effect.succeed([providerWorker]),
    read: () => Effect.die("Inventory only lists Workers"),
    reconcile: () => Effect.die("Inventory must never change Workers"),
    ...overrides,
  });
const readFixture = (
  state: StateService = stateFixture(),
  provider: WorkerProvider = workerFixture()
) =>
  DocsDeploymentInventory.pipe(
    Effect.flatMap((inventory) => inventory.read),
    Effect.provide(
      DocsDeploymentInventoryLive.pipe(
        Layer.provide(
          Layer.merge(
            Layer.succeed(State, Effect.succeed(state)),
            Provider.effect(Cloudflare.Worker, Effect.succeed(provider))
          )
        )
      )
    )
  );

describe("inventory live boundary with synthetic native services", () => {
  test.effect(
    "reads only the named stack and keeps checked worker identities",
    () =>
      Effect.gen(function* () {
        const report = yield* readFixture();
        expect(report.stateStore).toEqual({
          id: "cloudflare-http",
          version: 7,
        });
        expect(report.stages).toEqual([
          {
            resources: [
              {
                instanceId: "worker-instance",
                logicalId: "DocsWebsite",
                resourceType: "Cloudflare.Worker",
                status: "updated",
                workerName,
                workerUrl: new URL(workerUrl),
              },
            ],
            stage: "prod",
          },
        ]);
        expect(report.providerWorkers).toEqual([
          { logicalId: "DocsWebsite", stage: "prod", workerName },
        ]);
      })
  );
  test.effect.each([
    [
      "version",
      { getVersion: () => Effect.succeed(0) },
      "alchemy-state-version",
    ],
    [
      "stage",
      { listStages: () => Effect.succeed(["not-a-stage"]) },
      "alchemy-state-stages",
    ],
    [
      "fqn",
      { list: () => Effect.succeed([""]) },
      "alchemy-state-resource-fqns:prod",
    ],
    [
      "missing resource",
      {
        get: () =>
          Effect.succeed(
            Option.getOrUndefined(
              Option.none<Effect.Success<ReturnType<StateService["get"]>>>()
            )
          ),
      },
      "alchemy-state-resource:prod:DocsWebsite",
    ],
    [
      "attributes",
      {
        get: () =>
          Effect.succeed({
            ...stateResource,
            attr: { url: "bad-url", workerName },
          }),
      },
      "alchemy-state-worker-attributes:prod:DocsWebsite",
    ],
  ] satisfies readonly (readonly [string, Partial<StateService>, string])[])(
    "rejects an invalid %s reply at ingress",
    ([_name, overrides, target]) =>
      Effect.gen(function* () {
        const result = yield* readFixture(stateFixture(overrides)).pipe(
          Effect.result
        );
        Result.match(result, {
          onFailure: (error) => {
            expect(error._tag).toBe("DocsDeploymentInventoryInputError");
            expect(error).toMatchObject({ target });
          },
          onSuccess: () => expect.fail("An invalid provider reply must fail"),
        });
      })
  );
  test.effect.each([
    [
      "worker name",
      { ...providerWorker, workerName: "" },
      "cloudflare-worker-list",
    ],
    [
      "logical tag",
      {
        ...providerWorker,
        tags: [stackTag, "alchemy:stage:prod", "alchemy:id:Other"],
      },
      `${workerName}:logical-id-tag`,
    ],
    [
      "stage tag",
      { ...providerWorker, tags: [stackTag, "alchemy:id:DocsWebsite"] },
      `${workerName}:stage-tag`,
    ],
  ] satisfies readonly (readonly [string, typeof providerWorker, string])[])(
    "rejects an invalid provider %s",
    ([_name, worker, target]) =>
      Effect.gen(function* () {
        const result = yield* readFixture(
          stateFixture(),
          workerFixture({ list: () => Effect.succeed([worker]) })
        ).pipe(Effect.result);
        Result.match(result, {
          onFailure: (error) => {
            expect(error._tag).toBe("DocsDeploymentInventoryInputError");
            expect(error).toMatchObject({ target });
          },
          onSuccess: () => expect.fail("Invalid provider metadata must fail"),
        });
      })
  );
  test.effect("drops underlying provider error text", () =>
    Effect.gen(function* () {
      const result = yield* readFixture(
        stateFixture({
          getVersion: () =>
            Effect.fail(
              new StateStoreError({ message: "TAXKIT_SECRET_SENTINEL" })
            ),
        })
      ).pipe(Effect.result);
      Result.match(result, {
        onFailure: (error) => {
          expect(error._tag).toBe("DocsDeploymentInventoryReadError");
          expect(error).toMatchObject({
            operation: "state-version",
          });
          expect(String(error)).not.toContain("TAXKIT_SECRET_SENTINEL");
        },
        onSuccess: () => expect.fail("Read refusal must fail"),
      });
    })
  );
  test.effect("drops underlying Worker list error text", () =>
    Effect.gen(function* () {
      const result = yield* readFixture(
        stateFixture(),
        workerFixture({
          list: () =>
            Effect.fail(
              new StateStoreError({ message: "TAXKIT_SECRET_SENTINEL" })
            ),
        })
      ).pipe(Effect.result);
      Result.match(result, {
        onFailure: (error) => {
          expect(error._tag).toBe("DocsDeploymentInventoryReadError");
          expect(error).toMatchObject({
            operation: "provider-workers",
          });
          expect(String(error)).not.toContain("TAXKIT_SECRET_SENTINEL");
        },
        onSuccess: () => expect.fail("Provider refusal must fail"),
      });
    })
  );
  test.effect(
    "ignores other stacks and keeps the first matching ownership tag",
    () =>
      Effect.gen(function* () {
        const report = yield* readFixture(
          stateFixture(),
          workerFixture({
            list: () =>
              Effect.succeed([
                {
                  ...providerWorker,
                  tags: [...tags, "alchemy:stage:not-a-stage"],
                },
                {
                  ...providerWorker,
                  tags: ["alchemy:stack:Other"],
                  workerName: "unrelated",
                },
              ]),
          })
        );
        expect(report.providerWorkers).toEqual([
          { logicalId: "DocsWebsite", stage: "prod", workerName },
        ]);
      })
  );
  test.effect("interrupts all unfinished parallel native reads", () =>
    Effect.gen(function* () {
      const versionStarted = yield* Deferred.make<boolean>();
      const stagesStarted = yield* Deferred.make<boolean>();
      const workersStarted = yield* Deferred.make<boolean>();
      const interrupted = yield* Ref.make(0);
      const fiber = yield* readFixture(
        stateFixture({
          getVersion: () =>
            Deferred.succeed(versionStarted, true).pipe(
              Effect.andThen(Effect.never),
              Effect.onInterrupt(() =>
                Ref.update(interrupted, (count) => count + 1)
              )
            ),
          listStages: () =>
            Deferred.succeed(stagesStarted, true).pipe(
              Effect.andThen(Effect.never),
              Effect.onInterrupt(() =>
                Ref.update(interrupted, (count) => count + 1)
              )
            ),
        }),
        workerFixture({
          list: () =>
            Deferred.succeed(workersStarted, true).pipe(
              Effect.andThen(Effect.never),
              Effect.onInterrupt(() =>
                Ref.update(interrupted, (count) => count + 1)
              )
            ),
        })
      ).pipe(Effect.forkScoped);
      yield* Deferred.await(versionStarted);
      yield* Deferred.await(stagesStarted);
      yield* Deferred.await(workersStarted);
      yield* Fiber.interrupt(fiber);
      expect(yield* Ref.get(interrupted)).toBe(3);
    }).pipe(Effect.scoped)
  );
});
