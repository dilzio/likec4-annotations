import { describe, expect, it } from "vitest";
import { formatHuman } from "../src/report/formatHuman.js";
import type { SyncReport } from "../src/types.js";

function baseReport(overrides: Partial<SyncReport["issues"]> = {}): SyncReport {
  return {
    schemaVersion: 1,
    timestamp: "2026-01-01T00:00:00.000Z",
    repoRoot: "/repo",
    modelDir: "c4-agent",
    scan: { filesScanned: 1, filesWithAnnotations: 1 },
    elements: { total: 0, new: [], orphaned: [] },
    relationships: { total: 0, added: [], removed: [] },
    flows: [],
    issues: {
      danglingTargets: [],
      undeclaredKinds: [],
      unresolvedParents: [],
      parentCycles: [],
      malformedTags: [],
      flowWarnings: [],
      ...overrides,
    },
    write: {
      elementsFile: "c4-agent/generated/elements.c4",
      relationshipsFile: "c4-agent/generated/relationships.c4",
      flowsFile: "c4-agent/generated/flows.c4",
      changed: false,
    },
    validate: { ran: false, passed: null },
    untouched: { manualDirConfirmed: true, viewsDirConfirmed: true },
  };
}

describe("formatHuman composition issues", () => {
  it("reports 'none' when there are no unresolved parents or cycles", () => {
    const output = formatHuman(baseReport());
    expect(output).toContain("**Unresolved parent references (element generated top-level instead):**\nnone");
    expect(output).toContain("**Parent cycles (participating elements generated top-level instead):**\nnone");
  });

  it("renders an unresolved parent reference", () => {
    const output = formatHuman(
      baseReport({
        unresolvedParents: [
          { id: "payment-validator", parent: "nonexistent", sourceFile: "a.ts", sourceLine: 4 },
        ],
      }),
    );
    expect(output).toContain(
      "- payment-validator declares parent:nonexistent, which is not declared anywhere — a.ts:4",
    );
  });

  it("renders a parent cycle", () => {
    const output = formatHuman(
      baseReport({
        parentCycles: [{ ids: ["a", "b"], sourceFile: "a.ts", sourceLine: 1 }],
      }),
    );
    expect(output).toContain("- a -> b -> a — a.ts:1");
  });
});
