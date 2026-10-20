import { describe, expect, it } from "vitest";
import { resolveModel } from "../src/model/resolve.js";
import type { ParsedElement, ParsedRelationship, SpecificationInfo } from "../src/types.js";

const spec: SpecificationInfo = {
  elementKinds: new Set(["container", "softwareSystem", "component"]),
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

describe("resolveModel parent resolution", () => {
  it("leaves an element with no parent unchanged (top-level)", () => {
    const result = resolveModel([el({})], [], spec, []);
    expect(result.validElements[0].parent).toBeUndefined();
    expect(result.unresolvedParents).toHaveLength(0);
    expect(result.parentCycles).toHaveLength(0);
  });

  it("resolves a parent pointing to another annotated element", () => {
    const parent = el({ id: "payments-service", kind: "container" });
    const child = el({ id: "payment-validator", kind: "component", parent: "payments-service" });
    const result = resolveModel([parent, child], [], spec, []);
    const resolvedChild = result.validElements.find((e) => e.id === "payment-validator");
    expect(resolvedChild?.parent).toBe("payments-service");
    expect(result.unresolvedParents).toHaveLength(0);
    expect(result.parentCycles).toHaveLength(0);
  });

  it("resolves a parent pointing to a manual-declared element using its known path", () => {
    const child = el({ id: "payment-validator", kind: "component", parent: "cloud.backend" });
    const manualIdPaths = new Map([["cloud.backend", "cloud.backend"]]);
    const result = resolveModel(
      [child],
      [],
      spec,
      ["cloud.backend"],
      manualIdPaths,
    );
    expect(result.validElements[0].parent).toBe("cloud.backend");
    expect(result.unresolvedParents).toHaveLength(0);
  });

  it("nests under an ancestor's full path when the ancestor is itself nested", () => {
    const grandparent = el({ id: "cloud-system", kind: "softwareSystem" });
    const parent = el({
      id: "payments-service",
      kind: "container",
      parent: "cloud-system",
    });
    const child = el({
      id: "payment-validator",
      kind: "component",
      parent: "payments-service",
    });
    const result = resolveModel([grandparent, parent, child], [], spec, []);
    const resolvedParent = result.validElements.find((e) => e.id === "payments-service");
    const resolvedChild = result.validElements.find((e) => e.id === "payment-validator");
    expect(resolvedParent?.parent).toBe("cloud-system");
    expect(resolvedChild?.parent).toBe("cloud-system.payments-service");
  });

  it("reports an unresolved parent and keeps the element top-level", () => {
    const child = el({ id: "payment-validator", kind: "component", parent: "nonexistent" });
    const result = resolveModel([child], [], spec, []);
    expect(result.validElements).toHaveLength(1);
    expect(result.validElements[0].parent).toBeUndefined();
    expect(result.unresolvedParents).toEqual([
      {
        id: "payment-validator",
        parent: "nonexistent",
        sourceFile: "a.ts",
        sourceLine: 1,
      },
    ]);
  });

  it("detects a two-element cycle and forces both elements top-level", () => {
    const a = el({ id: "a", kind: "container", parent: "b" });
    const b = el({ id: "b", kind: "container", parent: "a" });
    const result = resolveModel([a, b], [], spec, []);
    expect(result.validElements.find((e) => e.id === "a")?.parent).toBeUndefined();
    expect(result.validElements.find((e) => e.id === "b")?.parent).toBeUndefined();
    expect(result.parentCycles).toHaveLength(1);
    expect(result.parentCycles[0].ids).toEqual(["a", "b"]);
  });

  it("detects a three-element cycle and forces all three elements top-level", () => {
    const a = el({ id: "a", kind: "container", parent: "b" });
    const b = el({ id: "b", kind: "container", parent: "c" });
    const c = el({ id: "c", kind: "container", parent: "a" });
    const result = resolveModel([a, b, c], [], spec, []);
    for (const id of ["a", "b", "c"]) {
      expect(result.validElements.find((e) => e.id === id)?.parent).toBeUndefined();
    }
    expect(result.parentCycles).toHaveLength(1);
    expect(result.parentCycles[0].ids).toEqual(["a", "b", "c"]);
  });

  it("rewrites a relationship's target to the nested element's fully-qualified path", () => {
    const parent = el({ id: "payments-service", kind: "container" });
    const child = el({ id: "payment-validator", kind: "component", parent: "payments-service" });
    const result = resolveModel(
      [parent, child],
      [rel({ source: "payments-service", target: "payment-validator" })],
      spec,
      [],
    );
    expect(result.validRelationships[0].target).toBe("payments-service.payment-validator");
  });
});
