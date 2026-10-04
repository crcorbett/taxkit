import nodePath from "node:path";
import { fileURLToPath } from "node:url";

import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import {
  Array as EffectArray,
  Effect,
  FileSystem,
  HashSet,
  Option,
  Record,
  Schema,
} from "effect";

const { resolve } = nodePath;
const root = fileURLToPath(new URL("../..", import.meta.url));
const CoordinationFixture = Schema.Struct({
  workflow: Schema.Struct({
    acceptance: Schema.Struct({
      evidence: Schema.Array(Schema.String),
      fixedAuditPassCount: Schema.NullOr(Schema.Finite),
    }),
    delegation: Schema.Struct({
      rationale: Schema.String,
      requiredWorkerCount: Schema.NullOr(Schema.Finite),
    }),
  }),
});
const DocumentationImpactFixture = Schema.Struct({
  classifications: Schema.Array(Schema.String),
});
type DocumentationImpactFixture = typeof DocumentationImpactFixture.Type;
const Hgi208Fixture = Schema.Struct({
  generated: Schema.String,
  impactLedger: Schema.String,
  lifecycle: Schema.String,
  maintenanceOwners: Schema.Array(Schema.String),
  mirror: Schema.String,
  portable: Schema.Boolean,
});
type Hgi208Fixture = typeof Hgi208Fixture.Type;
const readSkill = (name: string) =>
  Effect.flatMap(FileSystem.FileSystem, (fs) =>
    fs.readFileString(resolve(root, ".agents/skills", name, "SKILL.md"))
  );
const readMetadata = (name: string) =>
  Effect.flatMap(FileSystem.FileSystem, (fs) =>
    fs.readFileString(
      resolve(root, ".agents/skills", name, "agents/openai.yaml")
    )
  );
const readFixture = (name: string) =>
  Effect.flatMap(FileSystem.FileSystem, (fs) =>
    fs.readFileString(
      resolve(root, "tools/skills/fixtures/hgi-201", `${name}.json`)
    )
  ).pipe(
    Effect.flatMap(
      Schema.decodeEffect(Schema.fromJsonString(CoordinationFixture))
    )
  );
const readProviderFixture = (name: "accepted" | "rejected") =>
  Effect.flatMap(FileSystem.FileSystem, (fs) =>
    fs.readFileString(
      resolve(
        root,
        "tools/skills/fixtures/hgi-201",
        `provider-boundary.${name}.ts.txt`
      )
    )
  );
const readTextFixture = (
  family: "react-leaf-boundary",
  name: "accepted" | "rejected"
) =>
  Effect.flatMap(FileSystem.FileSystem, (fs) =>
    fs.readFileString(
      resolve(root, "tools/skills/fixtures/hgi-201", `${family}.${name}.txt`)
    )
  );
const readDocumentationImpactFixture = (name: "accepted" | "rejected") =>
  Effect.flatMap(FileSystem.FileSystem, (fs) =>
    fs.readFileString(
      resolve(
        root,
        "tools/skills/fixtures/hgi-201",
        `documentation-impact.${name}.json`
      )
    )
  ).pipe(
    Effect.flatMap(
      Schema.decodeEffect(Schema.fromJsonString(DocumentationImpactFixture))
    )
  );
const readHgi208Fixture = (name: string) =>
  Effect.flatMap(FileSystem.FileSystem, (fs) =>
    fs.readFileString(
      resolve(root, "tools/skills/fixtures/hgi-208", `${name}.json`)
    )
  ).pipe(
    Effect.flatMap(Schema.decodeEffect(Schema.fromJsonString(Hgi208Fixture)))
  );
const classifyProviderBoundarySource = (source: string) =>
  EffectArray.filter(
    [
      /\buse\s*:/u.test(source) || /\.use\s*\(/u.test(source)
        ? "generic-sdk-use-callback"
        : null,
      /\b(?:id|[A-Za-z][A-Za-z0-9]*Id)\s*:\s*string\b/u.test(source)
        ? "raw-string-id"
        : null,
      /Config\.(?:string|nonEmptyString|redacted)\s*\(/u.test(source)
        ? "primitive-config"
        : null,
      /\binstanceof\b/u.test(source) ? "instanceof-policy" : null,
      /Effect\.tryPromise/u.test(source) &&
      !/Schema\.decodeUnknownEffect\([^)]*\)\([\s\n]*rawResponse[\s\n]*\)/u.test(
        source
      )
        ? "unchecked-sdk-output"
        : null,
    ],
    (reason): reason is string => reason !== null
  );
const affirmativeLeafSentences = (source: string) =>
  EffectArray.filter(
    EffectArray.filter(source.split(/[.!?]\s*|\n+/u), (sentence) =>
      /\b(?:presentation\s+)?lea(?:f|ves)\b/iu.test(sentence)
    ),
    (sentence) =>
      !/\b(?:must not|do not|does not|never|forbid|forbids|reject|rejects)\b/iu.test(
        sentence
      )
  );
const classifyReactLeafBoundarySource = (source: string) => {
  const sentences = affirmativeLeafSentences(source);
  const matches = (pattern: RegExp) =>
    EffectArray.some(sentences, (sentence) => pattern.test(sentence));
  return EffectArray.filter(
    [
      matches(
        /\b(?:owns?|handles?|manages?)\b[^.!?\n]*\b(?:data\s+loading|boundary\s+data|fetch(?:ing)?|quer(?:y|ies|ying))\b|\b(?:loads?\s+(?:their\s+own\s+)?(?:boundary\s+)?data|fetch(?:es)?|quer(?:y|ies))\b|\b(?:uses?|calls?|invokes?|runs?|executes?)\b[^.!?\n]*\buse(?:Suspense|Infinite)?Quer(?:y|ies)\b/iu
      )
        ? "leaf-owned-data-loading"
        : null,
      matches(
        /\b(?:owns?|handles?|manages?|acquires?|uses?|runs?|calls?|invokes?|executes?|performs?)\b[^.!?\n]*\b(?:Effect|services?|runtimes?|RPC)\b/iu
      )
        ? "leaf-owned-effect-service-rpc"
        : null,
      matches(
        /\b(?:owns?|handles?|manages?|runs?|calls?|invokes?|executes?|performs?)\b[^.!?\n]*\b(?:remote|domain)?\s*(?:mutations?|commands?)\b|\b(?:uses?|calls?|invokes?|runs?|executes?)\b[^.!?\n]*\buseMutation\b/iu
      )
        ? "leaf-owned-mutation-command"
        : null,
      matches(
        /\b(?:owns?|handles?|manages?|runs?|coordinates?|orchestrates?)\b[^.!?\n]*\b(?:shared\s+workflows?|workflow\s+orchestration|error\s+policy)\b/iu
      )
        ? "leaf-owned-shared-workflow-policy"
        : null,
    ],
    (reason): reason is string => reason !== null
  );
};
const requiredDocumentationImpactClassifications = [
  "tests",
  "fixtures",
  "configuration",
  "exports",
  "manifests",
  "lifecycle",
  "release",
  "rollback",
  "critical journeys",
  "semantic owners",
] as const;
const classifyDocumentationImpactFixture = (
  fixture: DocumentationImpactFixture
) => {
  const classifications = HashSet.fromIterable(fixture.classifications);
  return EffectArray.map(
    EffectArray.filter(
      requiredDocumentationImpactClassifications,
      (classification) => !HashSet.has(classifications, classification)
    ),
    (classification) => `missing-${classification.replaceAll(" ", "-")}`
  );
};
const classifyCoordinationPolicy = (
  fixture: typeof CoordinationFixture.Type
) => {
  const hasDelegationRationale = [
    "independent-proof",
    "adversarial-review",
    "disjoint-write-scope",
  ].includes(fixture.workflow.delegation.rationale);
  const hasSemanticEvidence = fixture.workflow.acceptance.evidence.includes(
    "boundary-matched-semantic-review"
  );
  return {
    accepts:
      fixture.workflow.delegation.requiredWorkerCount === null &&
      fixture.workflow.acceptance.fixedAuditPassCount === null &&
      hasDelegationRationale &&
      hasSemanticEvidence,
    reasons: EffectArray.filter(
      [
        fixture.workflow.delegation.requiredWorkerCount === null
          ? null
          : "fixed-worker-count",
        fixture.workflow.acceptance.fixedAuditPassCount === null
          ? null
          : "fixed-audit-count",
        hasDelegationRationale ? null : "missing-delegation-rationale",
        hasSemanticEvidence ? null : "missing-semantic-evidence",
      ],
      (reason): reason is string => reason !== null
    ),
  };
};
const typescriptFences = (source: string) =>
  EffectArray.map(
    EffectArray.fromIterable(
      source.matchAll(/```(?:ts|typescript)\n(?<code>[\s\S]*?)```/gu)
    ),
    (match) =>
      Record.get(match.groups ?? {}, "code").pipe(Option.getOrElse(() => ""))
  ).join("\n");
const classifyHgi208Fixture = (fixture: Hgi208Fixture) =>
  EffectArray.filter(
    [
      fixture.impactLedger === "complete" ? null : "missing-impact",
      fixture.maintenanceOwners.join(",") === "docs-maintainer"
        ? null
        : "competing-maintenance-skill",
      fixture.generated === "source-and-check" ? null : "stale-generated-docs",
      fixture.lifecycle === "accepted-record-and-binding" ? null : "lifecycle",
      fixture.mirror === "valid" ? null : "mirror",
      fixture.portable ? null : "personal-path-dependency",
    ],
    (reason): reason is string => reason !== null
  );
describe("repo-owned skill policy", () => {
  test.effect(
    "prd skills require edit-first path-evidenced impact ledgers",
    () =>
      Effect.gen(function* () {
        yield* Effect.forEach(
          ["prd-writer", "prd-implementer"],
          (name) =>
            Effect.gen(function* () {
              const skill = yield* readSkill(name);
              expect(skill).toMatch(/Edit|Update/u);
              expect(skill).toContain("Change required");
              expect(skill).toContain("N/A");
              expect(skill).toContain("README");
              expect(skill).toContain("lint");
              expect(skill).toContain("Config");
              expect(skill).toContain("Effect.fn");
              expect(skill).toContain("route");
              expect(skill).toContain("leaf");
            }),
          { concurrency: 4, discard: true }
        );
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "prd review routes through the canonical edit-first review contract",
    () =>
      Effect.gen(function* () {
        const skill = yield* readSkill("prd-review");
        expect(skill).toContain(
          "Default to editing the SPEC and its directly associated repository-local task artifacts in place"
        );
        expect(skill).toContain("DeepWiki");
        expect(skill).toContain("Change required");
        expect(skill).toContain("effect-client-wrapper");
        expect(skill).toContain("helper sprawl");
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "prd coordination is evidence-led rather than ritual-counted",
    () =>
      Effect.gen(function* () {
        const writer = yield* readSkill("prd-writer");
        const implementer = yield* readSkill("prd-implementer");
        expect(writer).toContain("accepted outcome");
        expect(implementer).toContain("primary trajectory");
        expect(implementer).toContain("one-subagent-per-task");
        expect(implementer).toContain("fixed number");
        expect(implementer).toContain("acceptance proof");
        expect(implementer).not.toContain("one sequential subagent per task");
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "HGI-201 coordination fixtures reject ritual and accept semantic evidence",
    () =>
      Effect.gen(function* () {
        expect(
          classifyCoordinationPolicy(yield* readFixture("ritual"))
        ).toEqual({
          accepts: false,
          reasons: ["fixed-worker-count", "fixed-audit-count"],
        });
        expect(
          classifyCoordinationPolicy(yield* readFixture("evidence-led"))
        ).toEqual({
          accepts: true,
          reasons: [],
        });
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "HGI-201 provider fixtures reject stale code and accept the owned boundary",
    () =>
      Effect.gen(function* () {
        expect(
          classifyProviderBoundarySource(yield* readProviderFixture("rejected"))
        ).toEqual([
          "generic-sdk-use-callback",
          "raw-string-id",
          "primitive-config",
          "instanceof-policy",
          "unchecked-sdk-output",
        ]);
        expect(
          classifyProviderBoundarySource(yield* readProviderFixture("accepted"))
        ).toEqual([]);
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "HGI-201 React fixtures reject leaf-owned boundaries and accept compositional leaves",
    () =>
      Effect.gen(function* () {
        expect(
          classifyReactLeafBoundarySource(
            yield* readTextFixture("react-leaf-boundary", "rejected")
          )
        ).toEqual([
          "leaf-owned-data-loading",
          "leaf-owned-effect-service-rpc",
          "leaf-owned-mutation-command",
          "leaf-owned-shared-workflow-policy",
        ]);
        expect(
          classifyReactLeafBoundarySource(
            yield* readTextFixture("react-leaf-boundary", "accepted")
          )
        ).toEqual([]);
      }).pipe(Effect.provide(BunServices.layer))
  );
  test("HGI-201 React policy catches hook ownership without rejecting supplied values", () => {
    expect(
      classifyReactLeafBoundarySource(
        "Presentation leaves use useQuery, call useSuspenseQuery, invoke useInfiniteQuery and run useQueries for their data. Presentation leaves call useMutation to save."
      )
    ).toEqual(["leaf-owned-data-loading", "leaf-owned-mutation-command"]);
    expect(
      classifyReactLeafBoundarySource(
        "Presentation leaves receive a readonly value derived by a useQuery owner and an onSave callback."
      )
    ).toEqual([]);
  });
  test.effect(
    "HGI-201 impact fixtures require independently classified documentation surfaces",
    () =>
      Effect.gen(function* () {
        expect(
          classifyDocumentationImpactFixture(
            yield* readDocumentationImpactFixture("rejected")
          )
        ).toEqual([
          "missing-tests",
          "missing-fixtures",
          "missing-configuration",
          "missing-exports",
          "missing-manifests",
          "missing-lifecycle",
          "missing-release",
          "missing-rollback",
          "missing-critical-journeys",
          "missing-semantic-owners",
        ]);
        expect(
          classifyDocumentationImpactFixture(
            yield* readDocumentationImpactFixture("accepted")
          )
        ).toEqual([]);
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "current PRD skills and frontend docs preserve the route-container-leaf boundary",
    () =>
      Effect.gen(function* () {
        const [writer, reviewer, implementer] = yield* Effect.all([
          readSkill("prd-writer"),
          readSkill("prd-review"),
          readSkill("prd-implementer"),
        ]);
        const prdSkills = [writer, reviewer, implementer];
        const frontend = yield* (yield* FileSystem.FileSystem).readFileString(
          resolve(root, "docs/architecture/frontend.md")
        );
        const sources = [...prdSkills, frontend];
        expect(
          EffectArray.map(sources, classifyReactLeafBoundarySource)
        ).toEqual([[], [], [], []]);
        expect(writer).toContain("route or feature boundary");
        expect(writer).toContain(
          "focused leaf components narrow readonly values and callbacks"
        );
        expect(reviewer).toContain("feature or route boundaries");
        expect(reviewer).toContain("focused leaf components");
        expect(implementer).toContain("route or feature boundary");
        expect(implementer).toContain("leaf components focused on rendering");
        const normalizedFrontend = frontend.replaceAll(/\s+/gu, " ");
        expect(normalizedFrontend).toContain(
          "Leaf components receive focused readonly values, callbacks or `children`"
        );
        expect(normalizedFrontend).toContain(
          "owned by the route action or nearest policy-owning container"
        );
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "current PRD and docs-maintainer skills keep impact classifications separate",
    () =>
      Effect.gen(function* () {
        const owners = [
          "prd-writer",
          "prd-review",
          "prd-implementer",
          "docs-maintainer",
        ];
        yield* Effect.forEach(
          owners,
          (owner) =>
            Effect.gen(function* () {
              const skill = yield* readSkill(owner);
              const normalized = skill.toLowerCase();
              expect(skill).toContain("Change required");
              expect(skill).toContain("N/A");
              expect(normalized).toContain("test");
              expect(normalized).toMatch(/fixture|template/u);
              expect(normalized).toContain("config");
              expect(normalized).toContain("lifecycle");
              expect(normalized).toContain("release");
              expect(normalized).toContain("rollback");
            }),
          { concurrency: 4, discard: true }
        );
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "every current HGI-201 owner rejects fixed coordination ritual",
    () =>
      Effect.gen(function* () {
        const currentOwners = [
          ".agents/skills/docs-writer/SKILL.md",
          ".agents/skills/prd-writer/SKILL.md",
          ".agents/skills/prd-implementer/SKILL.md",
          "docs/product-specs/writing-specs.md",
          "docs/product-specs/writing-task-lists.md",
          "docs/exec-plans/implementing-specs.md",
          "docs/design-docs/abstraction-admission.md",
          "docs/architecture/effect-services.md",
          "docs/architecture/testing-and-quality.md",
          "docs/standards/documentation-review.md",
        ];
        const fixedRitual =
          /(?:three|required|documented|fixed)\s+(?:improvement\s+)?audit\s+passes|three\s+failed\s+correction\s+turns|one\s+sequential\s+subagent\s+per\s+task/iu;
        yield* Effect.forEach(
          currentOwners,
          (owner) =>
            Effect.gen(function* () {
              expect(
                yield* (yield* FileSystem.FileSystem).readFileString(
                  resolve(root, owner)
                )
              ).not.toMatch(fixedRitual);
            }),
          { concurrency: 4, discard: true }
        );
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "current guides preserve the boundary contract while rejecting ritual",
    () =>
      Effect.gen(function* () {
        const guideSources = [
          yield* (yield* FileSystem.FileSystem).readFileString(
            resolve(root, "docs/product-specs/writing-specs.md")
          ),
          yield* (yield* FileSystem.FileSystem).readFileString(
            resolve(root, "docs/product-specs/writing-task-lists.md")
          ),
          yield* (yield* FileSystem.FileSystem).readFileString(
            resolve(root, "docs/exec-plans/implementing-specs.md")
          ),
        ].join("\n");
        const providerSkill = yield* readSkill("effect-client-wrapper");
        const boundarySources = [
          guideSources,
          yield* readSkill("prd-implementer"),
          yield* (yield* FileSystem.FileSystem).readFileString(
            resolve(root, "docs/architecture/effect-services.md")
          ),
        ].join("\n");
        expect(guideSources).toContain("independent proof value");
        expect(guideSources).toContain("path-evidenced");
        expect(guideSources).toContain("fixed audit count");
        expect(boundarySources).toContain("flat, sequential");
        expect(boundarySources).toContain("branded IDs");
        expect(boundarySources).toContain("route");
        expect(boundarySources).toContain("container");
        expect(boundarySources).toContain("leaf");
        expect(providerSkill).toContain("generic SDK `use` callback");
        expect(providerSkill).toContain("Schema-backed `Config`");
        expect(providerSkill).toContain("`instanceof`");
        expect(providerSkill).toContain(
          "decode the unknown SDK result immediately"
        );
        expect(providerSkill).toContain("mock/test Layer");
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "package structure applies the TaxKit profile and canonical contract",
    () =>
      Effect.gen(function* () {
        const skill = yield* readSkill("package-structure");
        const profile = yield* (yield* FileSystem.FileSystem).readFileString(
          resolve(
            root,
            ".agents/skills/package-structure/references/repository-profile.md"
          )
        );
        expect(skill).toContain(
          "Build the narrowest package that owns a real semantic boundary"
        );
        expect(skill).toContain("Enforce the Effect boundary");
        expect(skill).toContain("lazy, flat, and sequential");
        expect(skill).toContain("one-use");
        expect(profile).toContain("@taxkit/docs-content");
        expect(profile).toContain("bun run release:check");
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "local skills and profiles contain no personal installation path",
    () =>
      Effect.gen(function* () {
        const personalRoot = ["", "Users", "cooper"].join("/");
        yield* Effect.forEach(
          [
            "prd-writer",
            "prd-implementer",
            "prd-review",
            "package-structure",
            "effect-client-wrapper",
          ],
          (name) =>
            Effect.gen(function* () {
              expect(yield* readSkill(name)).not.toContain(personalRoot);
            }),
          { concurrency: 4, discard: true }
        );
        const profile = yield* (yield* FileSystem.FileSystem).readFileString(
          resolve(
            root,
            ".agents/skills/package-structure/references/repository-profile.md"
          )
        );
        expect(profile).not.toContain(personalRoot);
        expect(profile).toContain("git rev-parse --show-toplevel");
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "effect client wrapper requires the accepted provider boundary",
    () =>
      Effect.gen(function* () {
        const skill = yield* readSkill("effect-client-wrapper");
        expect(skill).toContain("named domain/provider operations");
        expect(skill).toContain("Schema-backed `Config`");
        expect(skill).toContain("Schema-tagged errors");
        expect(skill).toContain("decode the unknown SDK result immediately");
        expect(skill).toContain("live Layer and a mock/test Layer");
        expect(skill).toContain(
          "Acceptance requires zero examples or public APIs"
        );
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "effect client wrapper code does not teach stale escape hatches",
    () =>
      Effect.gen(function* () {
        const code = typescriptFences(
          yield* readSkill("effect-client-wrapper")
        );
        expect(classifyProviderBoundarySource(code)).toEqual([]);
        expect(code).not.toMatch(/\bclient\s*:/u);
        expect(code).not.toMatch(/Promise<\s*[A-Z]\s*>/u);
        expect(yield* readSkill("effect-client-wrapper")).toContain(
          "SDK result escaping without immediate Schema decoding"
        );
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect("skill metadata exposes an explicit invocation prompt", () =>
    Effect.gen(function* () {
      yield* Effect.forEach(
        [
          "prd-writer",
          "prd-implementer",
          "prd-review",
          "package-structure",
          "effect-client-wrapper",
        ],
        (name) =>
          Effect.gen(function* () {
            const metadata = yield* readMetadata(name);
            expect(metadata).toContain("display_name:");
            expect(metadata).toContain("short_description:");
            expect(metadata).toContain(`$${name}`);
          }),
        { concurrency: 4, discard: true }
      );
    }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "HGI-208 docs maintainer has one portable maintenance owner",
    () =>
      Effect.gen(function* () {
        const maintainer = yield* readSkill("docs-maintainer");
        const writer = yield* readSkill("docs-writer");
        const profile = yield* (yield* FileSystem.FileSystem).readFileString(
          resolve(
            root,
            ".agents/skills/docs-maintainer/references/repository-profile.md"
          )
        );
        const metadata = yield* readMetadata("docs-maintainer");
        const personalRoot = ["", "Users", "cooper"].join("/");
        expect(maintainer).toContain("Change required");
        expect(maintainer).toContain("Preserve");
        expect(maintainer).toContain("N/A");
        expect(maintainer).toContain("report-only");
        expect(maintainer).toContain("not hand-edit");
        expect(maintainer).toContain("accepted outcome");
        expect(maintainer).not.toContain(personalRoot);
        expect(profile).toContain("git rev-parse --show-toplevel");
        expect(profile).not.toContain(personalRoot);
        expect(writer).toContain("does not own");
        expect(writer).not.toContain(
          "Use this skill for TaxKit documentation work"
        );
        expect(metadata).toContain("$docs-maintainer");
        expect(yield* readMetadata("docs-writer")).toContain("$docs-writer");
        expect(profile).toContain("tools/documentation/owner-policy.json");
        expect(profile).toContain("public.statusDecision.acceptanceRecords");
        expect(profile).toContain(
          "packages/api/http/__snapshots__/openapi.json"
        );
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect("HGI-208 Claude mirror points at the local canonical skill", () =>
    Effect.gen(function* () {
      const mirror = resolve(root, ".claude/skills/docs-maintainer");
      expect(yield* (yield* FileSystem.FileSystem).readLink(mirror)).toBe(
        "../../.agents/skills/docs-maintainer"
      );
    }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "HGI-208 negative fixtures reject documentation governance gaps",
    () =>
      Effect.gen(function* () {
        expect(
          classifyHgi208Fixture(yield* readHgi208Fixture("accepted"))
        ).toEqual([]);
        expect(
          classifyHgi208Fixture(yield* readHgi208Fixture("missing-impact"))
        ).toEqual(["missing-impact"]);
        expect(
          classifyHgi208Fixture(yield* readHgi208Fixture("competing-skill"))
        ).toEqual(["competing-maintenance-skill"]);
        expect(
          classifyHgi208Fixture(
            yield* readHgi208Fixture("stale-generated-docs")
          )
        ).toEqual(["stale-generated-docs"]);
        expect(
          classifyHgi208Fixture(yield* readHgi208Fixture("lifecycle"))
        ).toEqual(["lifecycle"]);
        expect(
          classifyHgi208Fixture(yield* readHgi208Fixture("mirror"))
        ).toEqual(["mirror"]);
        expect(
          classifyHgi208Fixture(yield* readHgi208Fixture("personal-path"))
        ).toEqual(["personal-path-dependency"]);
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "HGI-208 PRD routes invoke docs maintainer at all material boundaries",
    () =>
      Effect.gen(function* () {
        expect(yield* readSkill("prd-writer")).toContain(
          "[`docs-maintainer`](../docs-maintainer/SKILL.md)"
        );
        expect(yield* readSkill("prd-review")).toContain(
          "[`docs-maintainer`](../docs-maintainer/SKILL.md)"
        );
        const implementer = yield* readSkill("prd-implementer");
        expect(implementer).toContain("For a material slice, load the sibling");
        expect(implementer).toContain("closeout");
      }).pipe(Effect.provide(BunServices.layer))
  );
});
