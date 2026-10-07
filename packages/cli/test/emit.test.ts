import { describe, expect, it } from "vitest";
import { emitElements } from "../src/emit/elements.js";
import { emitRelationships } from "../src/emit/relationships.js";
import type { ParsedElement, ParsedRelationship } from "../src/types.js";

describe("emitElements", () => {
  it("sorts elements by id and renders technology/description", () => {
    const elements: ParsedElement[] = [
      {
        id: "payments-service",
        kind: "container",
        title: "Payments Service",
        technology: "Node.js, Express",
        description: "Charges customer payment methods.",
        sourceFile: "b.ts",
        sourceLine: 5,
      },
      {
        id: "orders-service",
        kind: "container",
        title: "Orders Service",
        technology: "Node.js, Express",
        description: "Accepts incoming order requests.",
        sourceFile: "a.ts",
        sourceLine: 5,
      },
    ];
    const output = emitElements(elements);
    expect(output.indexOf("orders-service")).toBeLessThan(output.indexOf("payments-service"));
    expect(output).toContain("orders-service = container 'Orders Service' {");
    expect(output).toContain("technology 'Node.js, Express'");
    expect(output).toContain("description 'Accepts incoming order requests.'");
  });

  it("omits technology/description lines when absent", () => {
    const elements: ParsedElement[] = [
      { id: "x", kind: "container", title: "X", sourceFile: "a.ts", sourceLine: 1 },
    ];
    const output = emitElements(elements);
    expect(output).not.toContain("technology");
    expect(output).not.toContain("description");
  });

  it("is idempotent — identical input produces identical output", () => {
    const elements: ParsedElement[] = [
      { id: "x", kind: "container", title: "X", sourceFile: "a.ts", sourceLine: 1 },
    ];
    expect(emitElements(elements)).toBe(emitElements(elements));
  });
});

describe("emitRelationships", () => {
  it("sorts by source, then target, then label", () => {
    const relationships: ParsedRelationship[] = [
      { source: "b", target: "a", label: "z", sourceFile: "f.ts", sourceLine: 1 },
      { source: "a", target: "z", label: "y", sourceFile: "f.ts", sourceLine: 2 },
      { source: "a", target: "a", label: "x", sourceFile: "f.ts", sourceLine: 3 },
    ];
    const output = emitRelationships(relationships);
    const lines = output.split("\n").filter((l) => l.includes("->"));
    expect(lines[0]).toContain('"x"');
    expect(lines[1]).toContain('"y"');
    expect(lines[2]).toContain('"z"');
  });

  it("renders a kinded relationship with the bracket-arrow syntax", () => {
    const output = emitRelationships([
      {
        source: "a",
        target: "b",
        label: "publishes event",
        technology: "SQS",
        kind: "async",
        sourceFile: "f.ts",
        sourceLine: 7,
      },
    ]);
    expect(output).toContain('a -[async]-> b "publishes event" \'SQS\' // f.ts:7');
  });

  it("renders a plain relationship without technology", () => {
    const output = emitRelationships([
      { source: "a", target: "b", label: "calls", sourceFile: "f.ts", sourceLine: 1 },
    ]);
    expect(output).toContain('a -> b "calls" // f.ts:1');
  });
});
