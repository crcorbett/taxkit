import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");

const readSkill = (name: string) =>
  readFileSync(resolve(root, ".agents/skills", name, "SKILL.md"), "utf-8");

const readMetadata = (name: string) =>
  readFileSync(
    resolve(root, ".agents/skills", name, "agents/openai.yaml"),
    "utf-8"
  );

interface CoordinationFixture {
  readonly workflow: {
    readonly delegation: {
      readonly rationale: string;
      readonly requiredWorkerCount: number | null;
    };
    readonly acceptance: {
      readonly evidence: readonly string[];
      readonly fixedAuditPassCount: number | null;
    };
  };
}

const readFixture = (name: string): CoordinationFixture => {
  const fixture: CoordinationFixture = JSON.parse(
    readFileSync(
      resolve(root, "tools/skills/fixtures/hgi-201", `${name}.json`),
      "utf-8"
    )
  );

  return fixture;
};

const readProviderFixture = (name: "accepted" | "rejected") =>
  readFileSync(
    resolve(
      root,
      "tools/skills/fixtures/hgi-201",
      `provider-boundary.${name}.ts.txt`
    ),
    "utf-8"
  );

const classifyProviderBoundarySource = (source: string) =>
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
  ].filter((reason): reason is string => reason !== null);

const classifyCoordinationPolicy = (
  fixture: ReturnType<typeof readFixture>
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
    reasons: [
      fixture.workflow.delegation.requiredWorkerCount === null
        ? null
        : "fixed-worker-count",
      fixture.workflow.acceptance.fixedAuditPassCount === null
        ? null
        : "fixed-audit-count",
      hasDelegationRationale ? null : "missing-delegation-rationale",
      hasSemanticEvidence ? null : "missing-semantic-evidence",
    ].filter((reason): reason is string => reason !== null),
  };
};

const typescriptFences = (source: string) =>
  Array.from(
    source.matchAll(/```(?:ts|typescript)\n([\s\S]*?)```/gu),
    (match) => match[1] ?? ""
  ).join("\n");

describe("repo-owned skill policy", () => {
  test("prd skills require edit-first path-evidenced impact ledgers", () => {
    for (const name of ["prd-writer", "prd-implementer"]) {
      const skill = readSkill(name);

      expect(skill).toContain("Edit");
      expect(skill).toContain("Change required");
      expect(skill).toContain("N/A");
      expect(skill).toMatch(/relevant[^\n]*README/iu);
      expect(skill).toContain("lint");
      expect(skill).toContain("agents/openai.yaml");
      expect(skill).toContain("Config.schema");
      expect(skill).toContain("Effect.fn");
      expect(skill).toContain("route");
      expect(skill).toContain("container");
      expect(skill).toContain("leaf");
    }
  });

  test("prd review routes through the canonical edit-first review contract", () => {
    const skill = readSkill("prd-review");

    expect(skill).toContain("Use this repository-owned contract directly");
    expect(skill).toContain("DeepWiki");
    expect(skill).toContain("Change required");
    expect(skill).toContain("effect-client-wrapper");
    expect(skill).toContain("helper sprawl");
  });

  test("prd coordination is evidence-led rather than ritual-counted", () => {
    const writer = readSkill("prd-writer");
    const implementer = readSkill("prd-implementer");

    expect(writer).toContain("primary trajectory");
    expect(implementer).toContain("primary trajectory");
    expect(implementer).toContain(
      "Use a goal only when the user explicitly requests one"
    );
    expect(implementer).not.toContain("one sequential subagent per task");
  });

  test("HGI-201 coordination fixtures reject ritual and accept semantic evidence", () => {
    expect(classifyCoordinationPolicy(readFixture("ritual"))).toEqual({
      accepts: false,
      reasons: ["fixed-worker-count", "fixed-audit-count"],
    });
    expect(classifyCoordinationPolicy(readFixture("evidence-led"))).toEqual({
      accepts: true,
      reasons: [],
    });
  });

  test("HGI-201 provider fixtures reject stale code and accept the owned boundary", () => {
    expect(
      classifyProviderBoundarySource(readProviderFixture("rejected"))
    ).toEqual([
      "generic-sdk-use-callback",
      "raw-string-id",
      "primitive-config",
      "instanceof-policy",
      "unchecked-sdk-output",
    ]);
    expect(
      classifyProviderBoundarySource(readProviderFixture("accepted"))
    ).toEqual([]);
  });

  test("every current HGI-201 owner rejects fixed coordination ritual", () => {
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

    for (const owner of currentOwners) {
      expect(readFileSync(resolve(root, owner), "utf-8")).not.toMatch(
        fixedRitual
      );
    }
  });

  test("current guides preserve the boundary contract while rejecting ritual", () => {
    const guideSources = [
      readFileSync(
        resolve(root, "docs/product-specs/writing-specs.md"),
        "utf-8"
      ),
      readFileSync(
        resolve(root, "docs/product-specs/writing-task-lists.md"),
        "utf-8"
      ),
      readFileSync(
        resolve(root, "docs/exec-plans/implementing-specs.md"),
        "utf-8"
      ),
    ].join("\n");
    const providerSkill = readSkill("effect-client-wrapper");
    const boundarySources = [
      guideSources,
      readSkill("prd-implementer"),
      readFileSync(
        resolve(root, "docs/architecture/effect-services.md"),
        "utf-8"
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
    expect(providerSkill).toContain("Config.schema");
    expect(providerSkill).toContain("without `instanceof`");
    expect(providerSkill).toContain("decode every SDK output");
    expect(providerSkill).toContain("deterministic mock Layers");
  });

  test("package structure applies the TaxKit profile and canonical contract", () => {
    const skill = readSkill("package-structure");
    const profile = readFileSync(
      resolve(
        root,
        ".agents/skills/package-structure/references/repository-profile.md"
      ),
      "utf-8"
    );

    expect(skill).toContain("Use this skill directly");
    expect(skill).toContain("Required separation");
    expect(skill).toContain("flat, composable, readable, and sequential");
    expect(skill).toContain("helper sprawl");
    expect(profile).toContain("@taxkit/docs-content");
    expect(profile).toContain("bun run release:check");
  });

  test("local skills and profiles contain no personal installation path", () => {
    const personalRoot = ["", "Users", "cooper"].join("/");
    for (const name of [
      "prd-writer",
      "prd-implementer",
      "prd-review",
      "package-structure",
      "effect-client-wrapper",
    ]) {
      expect(readSkill(name)).not.toContain(personalRoot);
    }
    const profile = readFileSync(
      resolve(
        root,
        ".agents/skills/package-structure/references/repository-profile.md"
      ),
      "utf-8"
    );
    expect(profile).not.toContain(personalRoot);
    expect(profile).toContain("git rev-parse --show-toplevel");
  });

  test("effect client wrapper requires the accepted provider boundary", () => {
    const skill = readSkill("effect-client-wrapper");

    expect(skill).toContain("named domain operations");
    expect(skill).toContain("Config.schema");
    expect(skill).toContain("Schema.TaggedErrorClass");
    expect(skill).toContain("decode every SDK output");
    expect(skill).toContain("live and deterministic mock Layers");
    expect(skill).toContain("Stale-Pattern Audit");
  });

  test("effect client wrapper code does not teach stale escape hatches", () => {
    const code = typescriptFences(readSkill("effect-client-wrapper"));

    expect(classifyProviderBoundarySource(code)).toEqual([]);
    expect(code).not.toMatch(/\bclient\s*:/u);
    expect(code).not.toMatch(/Promise<\s*[A-Z]\s*>/u);
    expect(code).toMatch(
      /const rawResponse = yield\* Effect\.tryPromise[\s\S]*Schema\.decodeUnknownEffect\([^)]*\)\([\s\n]*rawResponse[\s\n]*\)/u
    );
  });

  test("skill metadata exposes an explicit invocation prompt", () => {
    for (const name of [
      "prd-writer",
      "prd-implementer",
      "prd-review",
      "package-structure",
      "effect-client-wrapper",
    ]) {
      const metadata = readMetadata(name);

      expect(metadata).toContain("display_name:");
      expect(metadata).toContain("short_description:");
      expect(metadata).toContain(`$${name}`);
    }
  });
});
