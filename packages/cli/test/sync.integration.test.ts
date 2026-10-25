import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  readFileSync,
  existsSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSync } from "../src/commands/sync.js";
import { resolveSyncOptions } from "../src/config.js";

let dir: string;

// `likec4` is a devDependency of this workspace package, so npm hoists its
// bin to the repo root's node_modules/.bin (falling back to this package's
// own node_modules/.bin if hoisting ever changes). Symlinking it into a
// test's scratch directory lets runLikeC4Validate's local-bin check
// succeed, so validation runs the real installed binary directly instead
// of falling through to `npx` — which would otherwise hit the network on
// every run and be slow (or flaky) on a cold CI cache.
function linkLocalLikeC4Bin(targetDir: string) {
  const candidates = [
    join(__dirname, "../../../node_modules/.bin"),
    join(__dirname, "../node_modules/.bin"),
  ];
  const realBinDir = candidates.find((candidate) => existsSync(join(candidate, "likec4")));
  if (!realBinDir) return;

  mkdirSync(join(targetDir, "node_modules"), { recursive: true });
  symlinkSync(realBinDir, join(targetDir, "node_modules/.bin"), "dir");
}

function write(relPath: string, content: string) {
  const full = join(dir, relPath);
  mkdirSync(full.substring(0, full.lastIndexOf("/")), { recursive: true });
  writeFileSync(full, content, "utf8");
}

const SPEC = `specification {
  element container
  element softwareSystem

  relationship async {
    line dashed
  }
}
`;

const MANUAL = `model {
  stripe-api = softwareSystem 'Stripe API' {
    description 'Third-party payment processor.'
  }
}
`;

const ORDERS_SOURCE = `/**
 * Accepts incoming order requests.
 *
 * @likec4 container orders-service "Orders Service" technology:"Node.js"
 * @likec4-rel stripe-api "charges the card"
 */
export class OrdersService {}
`;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "likec4-agent-sync-"));
  write("c4-agent/specification.c4", SPEC);
  write("c4-agent/manual/external-systems.c4", MANUAL);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("runSync integration", () => {
  it("discovers a new element and relationship on first run", async () => {
    write("src/orders.ts", ORDERS_SOURCE);
    const opts = resolveSyncOptions({ rootDir: dir, validate: false });
    const { report, exitCode } = await runSync(opts, "2026-01-01T00:00:00.000Z");

    expect(exitCode).toBe(0);
    expect(report.elements.new.map((e) => e.id)).toEqual(["orders-service"]);
    expect(report.relationships.added).toHaveLength(1);
    expect(report.write.changed).toBe(true);
    expect(report.issues.unresolvedParents).toEqual([]);
    expect(report.issues.parentCycles).toEqual([]);

    const elementsContent = readFileSync(join(dir, "c4-agent/generated/elements.c4"), "utf8");
    expect(elementsContent).toContain("orders-service = container 'Orders Service'");
  });

  it("is idempotent on a second run with no code changes", async () => {
    write("src/orders.ts", ORDERS_SOURCE);
    const opts = resolveSyncOptions({ rootDir: dir, validate: false });
    await runSync(opts, "2026-01-01T00:00:00.000Z");
    const { report } = await runSync(opts, "2026-01-01T00:00:01.000Z");

    expect(report.elements.new).toHaveLength(0);
    expect(report.elements.orphaned).toHaveLength(0);
    expect(report.relationships.added).toHaveLength(0);
    expect(report.relationships.removed).toHaveLength(0);
    expect(report.write.changed).toBe(false);
  });

  it("flags an orphaned element when its annotation disappears", async () => {
    write("src/orders.ts", ORDERS_SOURCE);
    const opts = resolveSyncOptions({ rootDir: dir, validate: false });
    await runSync(opts, "2026-01-01T00:00:00.000Z");

    write("src/orders.ts", "export class OrdersService {}\n");
    const { report } = await runSync(opts, "2026-01-01T00:00:01.000Z");

    expect(report.elements.orphaned).toEqual([{ id: "orders-service", kind: "container" }]);
    expect(report.relationships.removed).toHaveLength(1);
  });

  it("omits an element with an undeclared kind and reports it", async () => {
    write(
      "src/orders.ts",
      ORDERS_SOURCE.replace("@likec4 container", "@likec4 coscontainer"),
    );
    const opts = resolveSyncOptions({ rootDir: dir, validate: false });
    const { report } = await runSync(opts, "2026-01-01T00:00:00.000Z");

    expect(report.elements.new).toHaveLength(0);
    expect(report.issues.undeclaredKinds).toEqual([
      {
        id: "orders-service",
        kind: "coscontainer",
        sourceFile: "src/orders.ts",
        sourceLine: 4,
        context: "element",
      },
    ]);
    const elementsContent = readFileSync(join(dir, "c4-agent/generated/elements.c4"), "utf8");
    expect(elementsContent).not.toContain("orders-service");
  });

  it("flags a dangling relationship target", async () => {
    write(
      "src/orders.ts",
      ORDERS_SOURCE.replace("stripe-api", "nonexistent-service"),
    );
    const opts = resolveSyncOptions({ rootDir: dir, validate: false });
    const { report } = await runSync(opts, "2026-01-01T00:00:00.000Z");

    expect(report.issues.danglingTargets).toHaveLength(1);
    expect(report.issues.danglingTargets[0].target).toBe("nonexistent-service");
    expect(report.relationships.added).toHaveLength(0);
  });

  it("generates c4-agent/generated/flows.c4 for a tagged flow and reports it", async () => {
    write(
      "src/orders.ts",
      ORDERS_SOURCE.replace(
        '@likec4-rel stripe-api "charges the card"',
        '@likec4-rel stripe-api "charges the card" flow:"checkout":1 flowTitle:"Checkout Flow"',
      ),
    );
    const opts = resolveSyncOptions({ rootDir: dir, validate: false });
    const { report } = await runSync(opts, "2026-01-01T00:00:00.000Z");

    expect(report.flows).toEqual([{ id: "checkout", title: "Checkout Flow", stepCount: 1 }]);
    const flowsContent = readFileSync(join(dir, "c4-agent/generated/flows.c4"), "utf8");
    expect(flowsContent).toContain("dynamic view checkout {");
    expect(flowsContent).toContain("title 'Checkout Flow'");
    expect(flowsContent).toContain("orders-service -> stripe-api 'charges the card'");
  });

  it("resolves nested elements end-to-end: annotated parent, manual parent, unresolved parent, and a cycle", async () => {
    linkLocalLikeC4Bin(dir);
    write(
      "c4-agent/specification.c4",
      `specification {
  element container
  element softwareSystem
  element component

  relationship async {
    line dashed
  }
}
`,
    );
    write(
      "c4-agent/manual/cloud.c4",
      `model {
  cloud = softwareSystem 'Cloud' {
    description 'Hand-authored cloud system.'
  }
}
`,
    );
    write(
      "src/payments.ts",
      `/**
 * @likec4 container payments-service "Payments Service"
 */
export class PaymentsService {}
`,
    );
    write(
      "src/payment-validator.ts",
      `/**
 * @likec4 component payment-validator "Payment Validator" parent:payments-service
 */
export class PaymentValidator {}
`,
    );
    write(
      "src/cloud-worker.ts",
      `/**
 * @likec4 component cloud-worker "Cloud Worker" parent:cloud
 */
export class CloudWorker {}
`,
    );
    write(
      "src/orphan.ts",
      `/**
 * @likec4 component orphan-component "Orphan Component" parent:nonexistent-parent
 */
export class OrphanComponent {}
`,
    );
    write(
      "src/cycle-a.ts",
      `/**
 * @likec4 container cycle-a "Cycle A" parent:cycle-b
 */
export class CycleA {}
`,
    );
    write(
      "src/cycle-b.ts",
      `/**
 * @likec4 container cycle-b "Cycle B" parent:cycle-a
 */
export class CycleB {}
`,
    );

    const opts = resolveSyncOptions({ rootDir: dir, validate: true });
    const { report, exitCode } = await runSync(opts, "2026-01-01T00:00:00.000Z");

    const elementsContent = readFileSync(join(dir, "c4-agent/generated/elements.c4"), "utf8");

    // Annotated-parent nesting
    expect(elementsContent).toContain("extend payments-service {");
    expect(elementsContent).toContain("payment-validator = component 'Payment Validator'");

    // Manual-parent nesting
    expect(elementsContent).toContain("extend cloud {");
    expect(elementsContent).toContain("cloud-worker = component 'Cloud Worker'");

    // Unresolved parent: top-level, reported as an issue
    expect(elementsContent).toContain("orphan-component = component 'Orphan Component' {");
    expect(report.issues.unresolvedParents).toEqual([
      {
        id: "orphan-component",
        parent: "nonexistent-parent",
        sourceFile: "src/orphan.ts",
        sourceLine: 2,
      },
    ]);

    // Cycle: both top-level, reported as a single issue
    expect(elementsContent).toContain("cycle-a = container 'Cycle A' {");
    expect(elementsContent).toContain("cycle-b = container 'Cycle B' {");
    expect(report.issues.parentCycles).toEqual([
      {
        ids: ["cycle-a", "cycle-b"],
        sourceFile: "src/cycle-a.ts",
        sourceLine: 2,
      },
    ]);

    // The generated output validates under the real LikeC4 validator.
    expect(report.validate.ran).toBe(true);
    expect(report.validate.passed).toBe(true);
    expect(exitCode).toBe(0);
  }, 15000);

  it("reports no new/added items on a second run when a relationship targets a nested element (regression)", async () => {
    write(
      "src/validator.ts",
      `/**
 * @likec4 container payment-validator "Payment Validator" parent:stripe-api
 */
export class PaymentValidator {}
`,
    );
    write(
      "src/orders.ts",
      ORDERS_SOURCE.replace(
        '@likec4-rel stripe-api "charges the card"',
        '@likec4-rel payment-validator "double-checks card details"\n * @likec4-rel stripe-api "charges the card"',
      ),
    );
    const opts = resolveSyncOptions({ rootDir: dir, validate: false });
    await runSync(opts, "2026-01-01T00:00:00.000Z");
    const { report } = await runSync(opts, "2026-01-01T00:00:01.000Z");

    expect(report.elements.new).toHaveLength(0);
    expect(report.relationships.added).toHaveLength(0);
    expect(report.relationships.removed).toHaveLength(0);
    expect(report.write.changed).toBe(false);
  });

  it("drops a flow entirely when its only tagged relationship is excluded upstream", async () => {
    write(
      "src/orders.ts",
      ORDERS_SOURCE.replace(
        '@likec4-rel stripe-api "charges the card"',
        '@likec4-rel nonexistent-service "charges the card" flow:"checkout":1',
      ),
    );
    const opts = resolveSyncOptions({ rootDir: dir, validate: false });
    const { report } = await runSync(opts, "2026-01-01T00:00:00.000Z");

    expect(report.flows).toHaveLength(0);
    const flowsContent = readFileSync(join(dir, "c4-agent/generated/flows.c4"), "utf8");
    expect(flowsContent).not.toContain("dynamic view");
  });
});
