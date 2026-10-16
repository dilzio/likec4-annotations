import { describe, expect, it } from "vitest";
import { createProgram } from "../src/index.js";

async function runArgs(args: string[]): Promise<{ exitCode: number; stderr: string }> {
  const program = createProgram();
  program.exitOverride();
  for (const cmd of program.commands) {
    cmd.exitOverride();
  }

  let stderr = "";
  program.configureOutput({
    writeErr: (str) => {
      stderr += str;
    },
  });

  try {
    await program.parseAsync(["node", "likec4-agent", ...args]);
    return { exitCode: 0, stderr };
  } catch (err) {
    const code = (err as { exitCode?: number }).exitCode ?? 1;
    return { exitCode: code, stderr };
  }
}

describe("removed flags are rejected", () => {
  it("rejects sync --cwd as an unknown option", async () => {
    const { exitCode, stderr } = await runArgs(["sync", "--cwd", "/tmp/some-repo"]);

    expect(exitCode).not.toBe(0);
    expect(stderr).toMatch(/unknown option.*--cwd/i);
  });

  it("rejects sync --model-dir as an unknown option", async () => {
    const { exitCode, stderr } = await runArgs(["sync", "--model-dir", "/tmp/some-repo"]);

    expect(exitCode).not.toBe(0);
    expect(stderr).toMatch(/unknown option.*--model-dir/i);
  });
});
