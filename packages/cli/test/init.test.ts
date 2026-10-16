import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInit } from "../src/commands/init.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "likec4-agent-init-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("runInit", () => {
  it("scaffolds c4-agent/ with the three starter files and exits 0", () => {
    const result = runInit({ rootDir: dir });

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(dir, "c4-agent", "specification.c4"))).toBe(true);
    expect(existsSync(join(dir, "c4-agent", "views", "landscape.c4"))).toBe(true);
    expect(existsSync(join(dir, "c4-agent", "manual", "external-systems.c4"))).toBe(true);
  });

  it("does not scaffold a manual/relationships.c4 file", () => {
    runInit({ rootDir: dir });

    expect(existsSync(join(dir, "c4-agent", "manual", "relationships.c4"))).toBe(false);
  });

  it("writes the expected specification, view, and manual content", () => {
    runInit({ rootDir: dir });

    const specification = readFileSync(join(dir, "c4-agent", "specification.c4"), "utf8");
    expect(specification).toContain("element person");
    expect(specification).toContain("element softwareSystem");
    expect(specification).toContain("element container");
    expect(specification).toContain("element component");
    expect(specification).toContain("relationship async");
    expect(specification).toContain("tag external");

    const landscape = readFileSync(join(dir, "c4-agent", "views", "landscape.c4"), "utf8");
    expect(landscape).toContain("view landscape");
    expect(landscape).toContain("include *");

    const externalSystems = readFileSync(
      join(dir, "c4-agent", "manual", "external-systems.c4"),
      "utf8",
    );
    expect(externalSystems).toContain("model {\n}");
    expect(externalSystems).toMatch(/hand-declare|Declare external systems/i);
  });

  it("fails without writing when c4-agent/ already exists, and leaves it untouched", () => {
    const first = runInit({ rootDir: dir });
    expect(first.exitCode).toBe(0);

    const before = readFileSync(join(dir, "c4-agent", "specification.c4"), "utf8");

    const second = runInit({ rootDir: dir });
    expect(second.exitCode).not.toBe(0);

    const after = readFileSync(join(dir, "c4-agent", "specification.c4"), "utf8");
    expect(after).toBe(before);
  });
});
