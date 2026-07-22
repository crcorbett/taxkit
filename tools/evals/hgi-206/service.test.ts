import { expect, test } from "bun:test";

import {
  expectedEpochSkills,
  forbiddenClaims,
  isPortableSkillSourceId,
} from "./schemas.js";
import {
  isTypedForbiddenClaim,
  renderManifestAggregateSource,
} from "./service.js";

test("HGI-206 exposes fifteen typed forbidden claims", () => {
  expect(forbiddenClaims).toHaveLength(15);
  expect(forbiddenClaims.every(isTypedForbiddenClaim)).toBe(true);
});

test("HGI-206 source aggregate sorts by ASCII path before rendering hashes", () => {
  const highHash = "f".repeat(64);
  const lowHash = "0".repeat(64);
  const members = [
    { path: "z-source.ts", sha256: lowHash },
    { path: "a-source.ts", sha256: highHash },
  ];
  const hashes = new Map([
    ["a-source.ts", highHash],
    ["z-source.ts", lowHash],
  ]);

  expect(renderManifestAggregateSource(members, hashes)).toBe(
    `${highHash}  a-source.ts\n${lowHash}  z-source.ts\n`
  );
});

test("HGI-206 epoch skill identities are portable logical IDs", () => {
  expect(
    expectedEpochSkills.every((skill) =>
      isPortableSkillSourceId(skill.sourceId)
    )
  ).toBe(true);
  const posixHomePath = [
    "",
    "Users",
    "example",
    ".codex",
    "skills",
    "skill",
    "SKILL.md",
  ].join("/");
  const posixHomePrefix = ["", "Users", ""].join("/");

  expect(isPortableSkillSourceId(posixHomePath)).toBe(false);
  expect(JSON.stringify(expectedEpochSkills)).not.toContain(posixHomePrefix);
});
