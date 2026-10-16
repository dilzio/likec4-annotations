import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveInitOptions, resolveSyncOptions } from "../src/config.js";

describe("resolveSyncOptions", () => {
  it("defaults rootDir to process.cwd() and derives modelDir", () => {
    const opts = resolveSyncOptions({});
    expect(opts.rootDir).toBe(resolve(process.cwd()));
    expect(opts.modelDir).toBe(`${opts.rootDir}/c4-agent`);
  });

  it("resolves an explicit --root-dir override", () => {
    const opts = resolveSyncOptions({ rootDir: "/tmp/some-repo" });
    expect(opts.rootDir).toBe(resolve("/tmp/some-repo"));
    expect(opts.modelDir).toBe(`${opts.rootDir}/c4-agent`);
  });
});

describe("resolveInitOptions", () => {
  it("defaults rootDir to process.cwd()", () => {
    const opts = resolveInitOptions({});
    expect(opts.rootDir).toBe(resolve(process.cwd()));
  });

  it("resolves an explicit --root-dir override", () => {
    const opts = resolveInitOptions({ rootDir: "/tmp/some-repo" });
    expect(opts.rootDir).toBe(resolve("/tmp/some-repo"));
  });
});
