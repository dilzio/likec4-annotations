import { describe, expect, it } from "vitest";
import { REL_FLOW_RE, REL_FLOWTITLE_RE } from "../src/parser/grammar.js";

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
