import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  Array as EffectArray,
  Array,
  Console,
  Effect,
  Match,
  Option,
  Order,
  Schema,
  Record as EffectRecord,
} from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { readGovernanceJson, repositoryRootFromUrl } from "./input.boundary.js";
import {
  canonicalSkillIds,
  inspectGovernance,
  portableTreeMode,
} from "./policy.js";
import type {
  GovernanceObservations,
  LinkObservation,
  OverlayObservation,
  ReferenceObservation,
  TreeObservation,
} from "./policy.js";
import {
  AcceptedFindings,
  AuditFindings,
  CanonicalSkillBaseline,
  CriticalJourneyInventory,
  GovernanceInputError,
  GovernancePolicyError,
  ProductSpecTaskPlan,
  RepositoryHarnessProfile,
  RootPackageManifest,
} from "./schemas.js";

const repositoryRootUrl = new URL("../..", import.meta.url);
const extraSkillIds = ["docs-writer", "portless"];
const overlayBySkill = {
  "docs-maintainer": "references/repository-profile.md",
  "package-structure": "references/repository-profile.md",
};
const referenceSkillIds = [...canonicalSkillIds, "docs-writer"];
const markdownLink = /\[[^\]]*\]\((?<target>[^)]+)\)/gu;
const absoluteUserPath = /(?:file:\/\/)?\/(?:Users|home)\/[^/\s)]+\//gu;

const sha256 = (source: string | Uint8Array) =>
  Effect.sync(() =>
    new Bun.CryptoHasher("sha256").update(source).digest("hex")
  );

const readText = (repositoryRoot: string, target: string) =>
  Effect.gen(function* readGovernanceText() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    return yield* fileSystem
      .readFileString(path.join(repositoryRoot, target))
      .pipe(Effect.mapError(() => new GovernanceInputError({ target })));
  });

const inspectTree = (
  repositoryRoot: string,
  skillId: string,
  excludedRelativePath?: string
) =>
  Effect.gen(function* inspectSkillTree() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = path.join(repositoryRoot, ".agents/skills", skillId);
    const members = yield* fileSystem
      .readDirectory(root, { recursive: true })
      .pipe(
        Effect.mapError(
          () =>
            new GovernanceInputError({
              target: `.agents/skills/${skillId}`,
            })
        )
      );
    const entries = yield* Effect.forEach(
      Array.sort(members, Order.String),
      (relativePath) =>
        Effect.gen(function* inspectSkillTreeMember() {
          if (relativePath === excludedRelativePath) {
            return Option.none();
          }
          const absolutePath = path.join(root, relativePath);
          const info = yield* fileSystem.stat(absolutePath);
          if (info.type === "File") {
            const bytes = yield* fileSystem.readFile(absolutePath);
            const hash = yield* sha256(bytes);
            return Option.some([
              relativePath,
              `{"kind":"file","mode":${portableTreeMode(info.mode)},"sha256":"${hash}"}`,
            ] as const);
          }
          if (info.type === "SymbolicLink") {
            const target = yield* fileSystem.readLink(absolutePath);
            return Option.some([
              relativePath,
              `{"kind":"symlink","target":${yield* Schema.encodeEffect(Schema.fromJsonString(Schema.String))(target)}}`,
            ] as const);
          }
          return Option.none();
        }).pipe(
          Effect.mapError(
            () =>
              new GovernanceInputError({
                target: `.agents/skills/${skillId}/${relativePath}`,
              })
          )
        ),
      { concurrency: 16 }
    );
    const retained = Array.getSomes(entries);
    const fragments = yield* Effect.forEach(retained, ([relativePath, value]) =>
      Schema.encodeEffect(Schema.fromJsonString(Schema.String))(
        relativePath
      ).pipe(
        Effect.map((encodedPath) => `${encodedPath}:${value}`),
        Effect.mapError(
          () =>
            new GovernanceInputError({ target: `.agents/skills/${skillId}` })
        )
      )
    );
    const source = `{${fragments.join(",")}}`;
    return {
      entryCount: retained.length,
      treeDigest: yield* sha256(source),
    } satisfies TreeObservation;
  });

const inspectOverlay = (repositoryRoot: string, target: string) =>
  Effect.gen(function* inspectSkillOverlay() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const bytes = yield* fileSystem
      .readFile(path.join(repositoryRoot, target))
      .pipe(Effect.mapError(() => new GovernanceInputError({ target })));
    return {
      path: target,
      sha256: yield* sha256(bytes),
    } satisfies OverlayObservation;
  });

const inspectLink = (repositoryRoot: string, name: string) =>
  Effect.gen(function* inspectClaudeSkillLink() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const target = `.claude/skills/${name}`;
    const absolutePath = path.join(repositoryRoot, target);
    const observation = yield* fileSystem.readLink(absolutePath).pipe(
      Effect.map((linkTarget) => ({
        target: linkTarget,
        type: "SymbolicLink",
      })),
      Effect.catchTag("PlatformError", () =>
        fileSystem
          .stat(absolutePath)
          .pipe(Effect.map((info) => ({ target: "", type: info.type })))
      ),
      Effect.mapError(() => new GovernanceInputError({ target }))
    );
    return {
      name,
      target: observation.target,
      type: observation.type,
    } satisfies LinkObservation;
  });

const markdownTargets = (source: string) =>
  EffectArray.filter(
    EffectArray.map(
      EffectArray.map(
        EffectArray.map(
          Array.fromIterable(source.matchAll(markdownLink)),
          (match) =>
            EffectRecord.get(match.groups ?? {}, "target").pipe(
              Option.getOrElse(() => "")
            )
        ),
        (target) =>
          Array.head(target.replaceAll(/^<|>$/gu, "").split(/\s+/u)).pipe(
            Option.getOrElse(() => "")
          )
      ),
      (target) => Array.head(target.split("#")).pipe(Option.getOrElse(() => ""))
    ),
    (target) =>
      target.length > 0 &&
      !target.startsWith("/") &&
      !target.startsWith("http://") &&
      !target.startsWith("https://") &&
      !target.startsWith("mailto:")
  );

const inspectSkillReferences = (repositoryRoot: string) =>
  Effect.gen(function* inspectLocalSkillReferences() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const observations = yield* Effect.forEach(
      referenceSkillIds,
      (skillId) =>
        Effect.gen(function* inspectSkillReferencesForTree() {
          const root = path.join(repositoryRoot, ".agents/skills", skillId);
          const members = yield* fileSystem.readDirectory(root, {
            recursive: true,
          });
          const markdownFiles = EffectArray.filter(members, (member) =>
            member.endsWith(".md")
          );
          return yield* Effect.forEach(
            markdownFiles,
            (relativePath) =>
              Effect.gen(function* inspectSkillReferenceFile() {
                const sourcePath = `.agents/skills/${skillId}/${relativePath}`;
                const absoluteSource = path.join(repositoryRoot, sourcePath);
                const source = yield* fileSystem.readFileString(absoluteSource);
                const references = yield* Effect.forEach(
                  markdownTargets(source),
                  (target) =>
                    Effect.gen(function* inspectMarkdownTarget() {
                      const resolved = path.resolve(
                        path.dirname(absoluteSource),
                        target
                      );
                      const exists = yield* fileSystem.exists(resolved);
                      return exists
                        ? Option.none()
                        : Option.some({
                            source: sourcePath,
                            target,
                          } satisfies ReferenceObservation);
                    }),
                  { concurrency: 16 }
                );
                const personalPaths = EffectArray.map(
                  Array.fromIterable(source.matchAll(absoluteUserPath)),
                  (match) =>
                    ({
                      source: sourcePath,
                      target: Array.head(match).pipe(
                        Option.getOrElse(() => "")
                      ),
                    }) satisfies ReferenceObservation
                );
                return {
                  missing: Array.getSomes(references),
                  personalPaths,
                };
              }),
            { concurrency: 16 }
          );
        }).pipe(
          Effect.mapError(
            () =>
              new GovernanceInputError({
                target: `.agents/skills/${skillId}`,
              })
          )
        ),
      { concurrency: 4 }
    );
    return {
      missingReferences: Array.flatMap(observations, (tree) =>
        Array.flatMap(tree, (file) => file.missing)
      ),
      portablePathFindings: Array.flatMap(observations, (tree) =>
        Array.flatMap(tree, (file) => file.personalPaths)
      ),
    };
  });

export const checkHarnessGovernance = (repositoryRoot: string) =>
  Effect.gen(function* checkHarnessGovernanceProgram() {
    const profile = yield* readGovernanceJson(
      repositoryRoot,
      "docs/verification/repository-harness-profile.json",
      RepositoryHarnessProfile
    );
    const findings = yield* readGovernanceJson(
      repositoryRoot,
      "docs/documentation-audit/harness-foundation/audit-findings.json",
      AuditFindings
    );
    const accepted = yield* readGovernanceJson(
      repositoryRoot,
      "docs/documentation-audit/harness-foundation/accepted-findings.json",
      AcceptedFindings
    );
    const tasks = yield* readGovernanceJson(
      repositoryRoot,
      "docs/product-specs/harness-foundation-improvements.tasks.json",
      ProductSpecTaskPlan
    );
    const receipt = yield* readGovernanceJson(
      repositoryRoot,
      "tools/skills/canonical-skill-baseline.json",
      CanonicalSkillBaseline
    );
    const journeys = yield* readGovernanceJson(
      repositoryRoot,
      "docs/verification/critical-journeys.json",
      CriticalJourneyInventory
    );
    const manifest = yield* readGovernanceJson(
      repositoryRoot,
      "package.json",
      RootPackageManifest
    );
    const specSource = yield* readText(
      repositoryRoot,
      "docs/product-specs/harness-foundation-improvements.md"
    );
    const canonicalTreePairs = yield* Effect.forEach(
      canonicalSkillIds,
      (skillId) =>
        inspectTree(
          repositoryRoot,
          skillId,
          Array.findFirst(
            EffectRecord.toEntries(overlayBySkill),
            ([id]) => id === skillId
          ).pipe(
            Option.map(([, target]) => target),
            Option.getOrUndefined
          )
        ).pipe(Effect.map((observation) => [skillId, observation] as const)),
      { concurrency: 4 }
    );
    const extraTreePairs = yield* Effect.forEach(
      extraSkillIds,
      (skillId) =>
        inspectTree(repositoryRoot, skillId).pipe(
          Effect.map((observation) => [skillId, observation] as const)
        ),
      { concurrency: 2 }
    );
    const overlays = yield* Effect.forEach(
      receipt.allowedOverlays,
      (overlay) => inspectOverlay(repositoryRoot, overlay.path),
      { concurrency: 2 }
    );
    const links = yield* Effect.forEach(
      Array.sort(EffectRecord.keys(receipt.claudeLinks), Order.String),
      (name) => inspectLink(repositoryRoot, name),
      { concurrency: 8 }
    );
    const references = yield* inspectSkillReferences(repositoryRoot);
    const canonicalTrees = EffectRecord.fromEntries(canonicalTreePairs);
    const extraTrees = EffectRecord.fromEntries(extraTreePairs);
    const observations = {
      canonicalTrees,
      extraTrees,
      links,
      missingReferences: references.missingReferences,
      overlays,
      portablePathFindings: references.portablePathFindings,
    } satisfies GovernanceObservations;
    const inputs = {
      accepted,
      findings,
      journeys,
      manifest,
      observations,
      profile,
      receipt,
      specSource,
      tasks,
    };
    const policyFindings = inspectGovernance(inputs);
    return yield* Array.match(policyFindings, {
      onEmpty: () => Effect.succeed(inputs),
      onNonEmpty: (nonEmptyFindings) =>
        Effect.fail(new GovernancePolicyError({ findings: nonEmptyFindings })),
    });
  });

const program = Effect.gen(function* harnessGovernanceMain() {
  const repositoryRoot = yield* repositoryRootFromUrl(repositoryRootUrl);
  const result = yield* checkHarnessGovernance(repositoryRoot);
  yield* Console.info(
    `Harness governance passed: findings=${result.accepted.entries.length}; skills=${EffectRecord.keys(result.receipt.skills).length}; overlays=${result.receipt.allowedOverlays.length}; links=${EffectRecord.keys(result.receipt.claudeLinks).length}; journeys=${result.journeys.journeys.length}.`
  );
}).pipe(
  Effect.tapErrorTag("GovernanceInputError", (error) =>
    Console.error(
      `FAIL [input] target=${error.target}; recovery=repair the repository-local Schema-decoded governance owner.`
    )
  ),
  Effect.tapErrorTag("GovernancePolicyError", (error) =>
    Effect.forEach(error.findings, (finding) =>
      Console.error(
        `FAIL [${finding.invariant}] target=${finding.target}; recovery=${finding.recovery}`
      )
    )
  ),
  Effect.provide(BunServices.layer)
);

Match.value(import.meta.main).pipe(
  Match.when(true, () => BunRuntime.runMain(program)),
  Match.orElse(() => false)
);
