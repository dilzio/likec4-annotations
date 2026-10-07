import { describe, expect, it } from "vitest";
import { resolveModel } from "../src/model/resolve.js";
import type { ParsedElement, ParsedRelationship, SpecificationInfo } from "../src/types.js";

const spec: SpecificationInfo = {
  elementKinds: new Set(["container", "softwareSystem"]),
  relationshipKinds: new Set(["async"]),
};

function el(overrides: Partial<ParsedElement>): ParsedElement {
  return {
    id: "orders-service",
    kind: "container",
    title: "Orders Service",
    sourceFile: "a.ts",
    sourceLine: 1,
    ...overrides,
  };
}

function rel(overrides: Partial<ParsedRelationship>): ParsedRelationship {
  return {
    source: "orders-service",
    target: "payments-service",
    label: "charges",
    sourceFile: "a.ts",
    sourceLine: 2,
    ...overrides,
  };
}

describe("resolveModel", () => {
  it("omits an element with an undeclared kind and flags it", () => {
    const result = resolveModel([el({ kind: "coscontainer" })], [], spec, []);
    expect(result.validElements).toHaveLength(0);
    expect(result.undeclaredKinds).toEqual([
      { id: "orders-service", kind: "coscontainer", sourceFile: "a.ts", sourceLine: 1, context: "element" },
    ]);
  });

  it("drops relationships sourced from an element with an undeclared kind, without double-flagging", () => {
    const result = resolveModel(
      [el({ kind: "coscontainer" })],
      [rel({})],
      spec,
      ["payments-service"],
    );
    expect(result.validRelationships).toHaveLength(0);
    expect(result.undeclaredKinds).toHaveLength(1); // only the element, not the relationship too
  });

  it("flags a dangling relationship target and omits it", () => {
    const result = resolveModel([el({})], [rel({ target: "nonexistent-service" })], spec, []);
    expect(result.validElements).toHaveLength(1);
    expect(result.validRelationships).toHaveLength(0);
    expect(result.danglingTargets).toEqual([
      {
        source: "orders-service",
        target: "nonexistent-service",
        label: "charges",
        sourceFile: "a.ts",
        sourceLine: 2,
      },
    ]);
  });

  it("resolves a relationship target declared in model/manual", () => {
    const result = resolveModel([el({})], [rel({ target: "stripe-api" })], spec, ["stripe-api"]);
    expect(result.validRelationships).toHaveLength(1);
    expect(result.danglingTargets).toHaveLength(0);
  });

  it("omits a relationship with an undeclared relationship kind", () => {
    const result = resolveModel(
      [el({})],
      [rel({ target: "payments-service", kind: "sync-ish" })],
      spec,
      ["payments-service"],
    );
    expect(result.validRelationships).toHaveLength(0);
    expect(result.undeclaredKinds).toEqual([
      {
        id: "orders-service->payments-service",
        kind: "sync-ish",
        sourceFile: "a.ts",
        sourceLine: 2,
        context: "relationship",
      },
    ]);
  });

  it("allows a declared relationship kind", () => {
    const result = resolveModel(
      [el({})],
      [rel({ target: "payments-service", kind: "async" })],
      spec,
      ["payments-service"],
    );
    expect(result.validRelationships).toHaveLength(1);
  });
});
