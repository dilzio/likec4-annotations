import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readPreviousRelationships } from "../src/diff/previousGenerated.js";

describe("readPreviousRelationships", () => {
  it("parses a relationship whose source/target is a dotted (nested-element) path", () => {
    const dir = mkdtempSync(join(tmpdir(), "likec4-agent-prev-"));
    const file = join(dir, "relationships.c4");
    writeFileSync(
      file,
      `model {
  orders-service -> payments-service.payment-validator "double-checks card details" // a.ts:1
}
`,
      "utf8",
    );
    try {
      const result = readPreviousRelationships(file);
      expect(result).toEqual([
        {
          source: "orders-service",
          target: "payments-service.payment-validator",
          label: "double-checks card details",
        },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("still parses a plain (non-nested) relationship (regression)", () => {
    const dir = mkdtempSync(join(tmpdir(), "likec4-agent-prev-"));
    const file = join(dir, "relationships.c4");
    writeFileSync(
      file,
      `model {
  a -[async]-> b "calls" // a.ts:1
}
`,
      "utf8",
    );
    try {
      const result = readPreviousRelationships(file);
      expect(result).toEqual([{ source: "a", target: "b", label: "calls" }]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
