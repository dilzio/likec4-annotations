import { describe, expect, it } from "vitest";
import { buildFlows } from "../src/model/flows.js";
import type { ParsedRelationship } from "../src/types.js";

function rel(overrides: Partial<ParsedRelationship>): ParsedRelationship {
  return {
    source: "a",
    target: "b",
    label: "step",
    sourceFile: "f.ts",
    sourceLine: 1,
    ...overrides,
  };
}

describe("buildFlows", () => {
  it("orders steps ascending by step number regardless of input order", () => {
    const { flows } = buildFlows([
      rel({ flow: "checkout", step: 3, label: "three" }),
      rel({ flow: "checkout", step: 1, label: "one" }),
      rel({ flow: "checkout", step: 2, label: "two" }),
    ]);
    expect(flows).toHaveLength(1);
    expect(flows[0].steps.map((s) => s.label)).toEqual(["one", "two", "three"]);
  });

  it("ignores relationships with no flow id", () => {
    const { flows } = buildFlows([rel({ label: "untagged" })]);
    expect(flows).toHaveLength(0);
  });

  it("groups relationships into distinct flows by flow id", () => {
    const { flows } = buildFlows([
      rel({ flow: "checkout", step: 1, label: "a" }),
      rel({ flow: "returns", step: 1, label: "b" }),
    ]);
    expect(flows.map((f) => f.id).sort()).toEqual(["checkout", "returns"]);
  });

  it("breaks duplicate step ties by source file then source line, and warns", () => {
    const { flows, warnings } = buildFlows([
      rel({ flow: "checkout", step: 1, label: "second", sourceFile: "b.ts", sourceLine: 1 }),
      rel({ flow: "checkout", step: 1, label: "first", sourceFile: "a.ts", sourceLine: 5 }),
    ]);
    expect(flows[0].steps.map((s) => s.label)).toEqual(["first", "second"]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].flowId).toBe("checkout");
    expect(warnings[0].message).toContain("duplicate step 1");
  });

  it("resolves flow title from the single flowTitle occurrence", () => {
    const { flows, warnings } = buildFlows([
      rel({ flow: "checkout", step: 1, flowTitle: "Checkout Flow" }),
      rel({ flow: "checkout", step: 2 }),
    ]);
    expect(flows[0].title).toBe("Checkout Flow");
    expect(warnings).toHaveLength(0);
  });

  it("falls back to the flow id when no flowTitle is present", () => {
    const { flows } = buildFlows([rel({ flow: "checkout", step: 1 })]);
    expect(flows[0].title).toBe("checkout");
  });

  it("resolves conflicting flowTitle values using the first occurrence and warns", () => {
    const { flows, warnings } = buildFlows([
      rel({ flow: "checkout", step: 1, flowTitle: "Checkout Flow" }),
      rel({ flow: "checkout", step: 2, flowTitle: "Something Else" }),
    ]);
    expect(flows[0].title).toBe("Checkout Flow");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain("conflicting flowTitle");
  });
});
