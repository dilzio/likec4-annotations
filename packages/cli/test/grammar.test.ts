import { describe, expect, it } from "vitest";
import {
  ELEMENT_PARENT_RE,
  ELEMENT_TAG_HEAD_RE,
  REL_FLOW_RE,
  REL_FLOWTITLE_RE,
  REL_TECH_RE,
} from "../src/parser/grammar.js";

function parseElementTagLine(line: string) {
  const match = ELEMENT_TAG_HEAD_RE.exec(line);
  if (!match || !match.groups) return null;
  const { kind, id, title, rest } = match.groups;
  let remainder = rest;
  const techMatch = REL_TECH_RE.exec(remainder);
  if (techMatch) remainder = remainder.replace(REL_TECH_RE, "");
  const parentMatch = ELEMENT_PARENT_RE.exec(remainder);
  if (parentMatch) remainder = remainder.replace(ELEMENT_PARENT_RE, "");
  return {
    kind,
    id,
    title,
    technology: techMatch?.[1],
    parent: parentMatch?.[1],
    leftover: remainder.trim(),
  };
}

describe("@likec4 element tag optional params (order-independent)", () => {
  it("parses parent: alone", () => {
    const result = parseElementTagLine('@likec4 container orders-service parent:ecommerce');
    expect(result).toMatchObject({ parent: "ecommerce", technology: undefined, leftover: "" });
  });

  it("parses technology: alone", () => {
    const result = parseElementTagLine('@likec4 container orders-service technology:"Node.js"');
    expect(result).toMatchObject({ technology: "Node.js", parent: undefined, leftover: "" });
  });

  it("parses parent: then technology:", () => {
    const result = parseElementTagLine(
      '@likec4 container orders-service parent:ecommerce technology:"Node.js"',
    );
    expect(result).toMatchObject({ parent: "ecommerce", technology: "Node.js", leftover: "" });
  });

  it("parses technology: then parent:", () => {
    const result = parseElementTagLine(
      '@likec4 container orders-service technology:"Node.js" parent:ecommerce',
    );
    expect(result).toMatchObject({ parent: "ecommerce", technology: "Node.js", leftover: "" });
  });

  it("parses neither param (no parent, no technology)", () => {
    const result = parseElementTagLine('@likec4 container orders-service "Orders Service"');
    expect(result).toMatchObject({
      title: "Orders Service",
      parent: undefined,
      technology: undefined,
      leftover: "",
    });
  });
});

describe("REL_FLOW_RE", () => {
  it("matches a well-formed flow:\"<flowId>\":<step> param", () => {
    const match = REL_FLOW_RE.exec('flow:"checkout":2');
    expect(match?.[1]).toBe("checkout");
    expect(match?.[2]).toBe("2");
  });

  it("rejects a non-numeric step", () => {
    expect(REL_FLOW_RE.test('flow:"checkout":two')).toBe(false);
  });

  it("rejects a missing step", () => {
    expect(REL_FLOW_RE.test('flow:"checkout"')).toBe(false);
  });
});

describe("REL_FLOWTITLE_RE", () => {
  it("matches a well-formed flowTitle:\"<title>\" param", () => {
    const match = REL_FLOWTITLE_RE.exec('flowTitle:"Checkout Flow"');
    expect(match?.[1]).toBe("Checkout Flow");
  });

  it("does not match without quotes", () => {
    expect(REL_FLOWTITLE_RE.test("flowTitle:Checkout")).toBe(false);
  });
});
