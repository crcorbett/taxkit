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

    expect(code).not.toMatch(/\buse\s*:/u);
    expect(code).not.toMatch(/\.use\s*\(/u);
    expect(code).not.toMatch(/\bclient\s*:/u);
    expect(code).not.toMatch(/\b[A-Za-z][A-Za-z0-9]*Id\s*:\s*string\b/u);
    expect(code).not.toMatch(
      /Config\.(?:string|nonEmptyString|redacted)\s*\(/u
    );
    expect(code).not.toContain("instanceof");
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
