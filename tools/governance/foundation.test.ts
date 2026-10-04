import { describe, expect, it } from "bun:test";

import { Array as EffectArray, Result, Schema } from "effect";

import acceptedJson from "../../docs/documentation-audit/harness-foundation/accepted-findings.json";
import findingsJson from "../../docs/documentation-audit/harness-foundation/audit-findings.json";
import scopeJson from "../../docs/documentation-audit/harness-foundation/audit-scope.json";
import profileJson from "../../docs/verification/repository-harness-profile.json";
import {
  AcceptedFindings,
  AuditFindings,
  AuditScope,
  RepositoryHarnessProfile,
} from "./schemas";

describe("harness foundation schemas", () => {
  it("decodes the TaxKit profile and structured HE audit records", () => {
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(RepositoryHarnessProfile)(profileJson)
      )
    ).toBe(true);
    expect(
      Result.isSuccess(Schema.decodeUnknownResult(AuditScope)(scopeJson))
    ).toBe(true);
    expect(
      Result.isSuccess(Schema.decodeUnknownResult(AuditFindings)(findingsJson))
    ).toBe(true);
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(AcceptedFindings)(acceptedJson)
      )
    ).toBe(true);
  });

  it("rejects an accepted HE finding without requirement and task mappings", () => {
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(AcceptedFindings)({
          ...acceptedJson,
          entries: EffectArray.map(acceptedJson.entries, (entry) =>
            entry.findingId === "HE-001"
              ? { ...entry, requirementIds: [], taskIds: [] }
              : entry
          ),
        })
      )
    ).toBe(true);
  });
});
