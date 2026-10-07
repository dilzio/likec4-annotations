import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSync } from "../src/commands/sync.js";
import { resolveSyncOptions } from "../src/config.js";

let dir: string;

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
  write("model/specification.c4", SPEC);
  write("model/manual/external-systems.c4", MANUAL);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("runSync integration", () => {
  it("discovers a new element and relationship on first run", async () => {
    write("src/orders.ts", ORDERS_SOURCE);
    const opts = resolveSyncOptions({ cwd: dir, validate: false });
    const { report, exitCode } = await runSync(opts, "2026-01-01T00:00:00.000Z");

    expect(exitCode).toBe(0);
    expect(report.elements.new.map((e) => e.id)).toEqual(["orders-service"]);
    expect(report.relationships.added).toHaveLength(1);
    expect(report.write.changed).toBe(true);

    const elementsContent = readFileSync(join(dir, "model/generated/elements.c4"), "utf8");
    expect(elementsContent).toContain("orders-service = container 'Orders Service'");
  });

  it("is idempotent on a second run with no code changes", async () => {
    write("src/orders.ts", ORDERS_SOURCE);
    const opts = resolveSyncOptions({ cwd: dir, validate: false });
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
    const opts = resolveSyncOptions({ cwd: dir, validate: false });
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
    const opts = resolveSyncOptions({ cwd: dir, validate: false });
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
    const elementsContent = readFileSync(join(dir, "model/generated/elements.c4"), "utf8");
    expect(elementsContent).not.toContain("orders-service");
  });

  it("flags a dangling relationship target", async () => {
    write(
      "src/orders.ts",
      ORDERS_SOURCE.replace("stripe-api", "nonexistent-service"),
    );
    const opts = resolveSyncOptions({ cwd: dir, validate: false });
    const { report } = await runSync(opts, "2026-01-01T00:00:00.000Z");

    expect(report.issues.danglingTargets).toHaveLength(1);
    expect(report.issues.danglingTargets[0].target).toBe("nonexistent-service");
    expect(report.relationships.added).toHaveLength(0);
  });
});
