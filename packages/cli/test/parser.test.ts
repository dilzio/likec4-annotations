import { describe, expect, it } from "vitest";
import { extractCommentBlocks } from "../src/parser/commentBlocks.js";
import { parseCommentBlock } from "../src/parser/parseAnnotations.js";

const JSDOC_SOURCE = `/**
 * Accepts incoming order requests, validates them, charges the
 * customer, and publishes a fulfillment event once payment succeeds.
 *
 * @likec4 container orders-service "Orders Service" technology:"Node.js, Express"
 * @likec4-rel payments-service "charges the customer's card" technology:"REST/HTTPS"
 * @likec4-rel fulfillment-queue "publishes OrderPlaced event" technology:"SQS" kind:async
 */
export class OrdersService {}
`;

const PYTHON_SOURCE = `def handle_webhook(payload):
    """
    Receives Stripe webhook events and updates payment status.

    @likec4 component payment-webhook-handler "Payment Webhook Handler" technology:"Python/FastAPI"
    @likec4-rel orders-service "notifies order of payment result" technology:"internal event bus"
    """
    pass
`;

const GO_SOURCE = `// Client wraps calls to the third-party Stripe payment API.
//
// @likec4 component stripe-client "Stripe Client" technology:"Go"
// @likec4-rel stripe-api "charges card" technology:"HTTPS/REST" kind:external
func NewStripeClient() *Client {}
`;

describe("extractCommentBlocks + parseCommentBlock", () => {
  it("parses a JSDoc block comment", () => {
    const blocks = extractCommentBlocks(JSDOC_SOURCE);
    expect(blocks).toHaveLength(1);
    const parsed = parseCommentBlock(blocks[0], "orders-service.ts");
    expect(parsed.malformed).toHaveLength(0);
    expect(parsed.element).toEqual({
      id: "orders-service",
      kind: "container",
      title: "Orders Service",
      technology: "Node.js, Express",
      description:
        "Accepts incoming order requests, validates them, charges the customer, and publishes a fulfillment event once payment succeeds.",
      sourceFile: "orders-service.ts",
      sourceLine: 5,
    });
    expect(parsed.relationships).toEqual([
      {
        source: "orders-service",
        target: "payments-service",
        label: "charges the customer's card",
        technology: "REST/HTTPS",
        kind: undefined,
        sourceFile: "orders-service.ts",
        sourceLine: 6,
      },
      {
        source: "orders-service",
        target: "fulfillment-queue",
        label: "publishes OrderPlaced event",
        technology: "SQS",
        kind: "async",
        sourceFile: "orders-service.ts",
        sourceLine: 7,
      },
    ]);
  });

  it("parses a Python docstring block", () => {
    const blocks = extractCommentBlocks(PYTHON_SOURCE);
    expect(blocks).toHaveLength(1);
    const parsed = parseCommentBlock(blocks[0], "webhook.py");
    expect(parsed.element?.id).toBe("payment-webhook-handler");
    expect(parsed.element?.kind).toBe("component");
    expect(parsed.element?.description).toBe(
      "Receives Stripe webhook events and updates payment status.",
    );
    expect(parsed.relationships).toHaveLength(1);
    expect(parsed.relationships[0].target).toBe("orders-service");
  });

  it("parses consecutive Go line comments", () => {
    const blocks = extractCommentBlocks(GO_SOURCE);
    expect(blocks).toHaveLength(1);
    const parsed = parseCommentBlock(blocks[0], "stripe_client.go");
    expect(parsed.element?.id).toBe("stripe-client");
    expect(parsed.element?.kind).toBe("component");
    expect(parsed.relationships[0]).toMatchObject({
      target: "stripe-api",
      kind: "external",
      technology: "HTTPS/REST",
    });
  });

  it("flags a malformed element tag line without dropping sibling relationships silently", () => {
    const source = `/**
 * @likec4 container
 * @likec4-rel payments-service "charges the card"
 */
`;
    const blocks = extractCommentBlocks(source);
    expect(blocks).toHaveLength(1);
    const parsed = parseCommentBlock(blocks[0], "bad.ts");
    expect(parsed.element).toBeNull();
    expect(parsed.malformed).toHaveLength(1);
    expect(parsed.malformed[0].rawText).toContain("@likec4 container");
    // relationships have no element to attach to, so none are emitted
    expect(parsed.relationships).toHaveLength(0);
  });

  it("flags a malformed relationship tag line but keeps the element", () => {
    const source = `/**
 * @likec4 container orders-service "Orders Service"
 * @likec4-rel payments-service not-a-quoted-label
 */
`;
    const blocks = extractCommentBlocks(source);
    const parsed = parseCommentBlock(blocks[0], "bad-rel.ts");
    expect(parsed.element?.id).toBe("orders-service");
    expect(parsed.relationships).toHaveLength(0);
    expect(parsed.malformed).toHaveLength(1);
  });

  it("ignores comment blocks with no likec4 tags", () => {
    const source = `/**
 * Just a normal doc comment, nothing to see here.
 */
export function noop() {}
`;
    expect(extractCommentBlocks(source)).toHaveLength(0);
  });

  it("parses flow and flowTitle params on a relationship", () => {
    const source = `/**
 * @likec4 container orders-service "Orders Service"
 * @likec4-rel payments-service "charges the customer's card" flow:"checkout":2 flowTitle:"Checkout Flow"
 */
`;
    const blocks = extractCommentBlocks(source);
    const parsed = parseCommentBlock(blocks[0], "flow.ts");
    expect(parsed.malformed).toHaveLength(0);
    expect(parsed.relationships).toHaveLength(1);
    expect(parsed.relationships[0]).toMatchObject({
      flow: "checkout",
      step: 2,
      flowTitle: "Checkout Flow",
    });
  });

  it("flags a malformed flow param (non-numeric step) as a malformed tag", () => {
    const source = `/**
 * @likec4 container orders-service "Orders Service"
 * @likec4-rel payments-service "charges the card" flow:"checkout":two
 */
`;
    const blocks = extractCommentBlocks(source);
    const parsed = parseCommentBlock(blocks[0], "bad-flow.ts");
    expect(parsed.relationships).toHaveLength(0);
    expect(parsed.malformed).toHaveLength(1);
  });

  it("flags a relationship with two flow params as a malformed tag", () => {
    const source = `/**
 * @likec4 container orders-service "Orders Service"
 * @likec4-rel payments-service "charges the card" flow:"checkout":1 flow:"other":2
 */
`;
    const blocks = extractCommentBlocks(source);
    const parsed = parseCommentBlock(blocks[0], "dupe-flow.ts");
    expect(parsed.relationships).toHaveLength(0);
    expect(parsed.malformed).toHaveLength(1);
  });

  it("parses a relationship with no flow param identically to before (regression)", () => {
    const blocks = extractCommentBlocks(JSDOC_SOURCE);
    const parsed = parseCommentBlock(blocks[0], "orders-service.ts");
    expect(parsed.relationships[0].flow).toBeUndefined();
    expect(parsed.relationships[0].step).toBeUndefined();
    expect(parsed.relationships[0].flowTitle).toBeUndefined();
  });

  it("populates parent when an element tag declares parent:<id>", () => {
    const source = `/**
 * @likec4 component payment-validator "Payment Validator" parent:payments-service technology:"TypeScript"
 */
`;
    const blocks = extractCommentBlocks(source);
    const parsed = parseCommentBlock(blocks[0], "nested.ts");
    expect(parsed.malformed).toHaveLength(0);
    expect(parsed.element?.parent).toBe("payments-service");
    expect(parsed.element?.technology).toBe("TypeScript");
  });

  it("leaves parent undefined when an element tag omits parent:", () => {
    const blocks = extractCommentBlocks(JSDOC_SOURCE);
    const parsed = parseCommentBlock(blocks[0], "orders-service.ts");
    expect(parsed.element?.parent).toBeUndefined();
  });

  it("parses technology: then parent: in either order on the element tag", () => {
    const source = `/**
 * @likec4 component payment-validator "Payment Validator" technology:"TypeScript" parent:payments-service
 */
`;
    const blocks = extractCommentBlocks(source);
    const parsed = parseCommentBlock(blocks[0], "nested.ts");
    expect(parsed.malformed).toHaveLength(0);
    expect(parsed.element?.parent).toBe("payments-service");
    expect(parsed.element?.technology).toBe("TypeScript");
  });
});
