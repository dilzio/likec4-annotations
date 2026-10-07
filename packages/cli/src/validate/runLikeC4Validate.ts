import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface ValidateResult {
  ran: boolean;
  passed: boolean | null;
  rawOutput?: string;
  exitCode?: number;
}

export async function runLikeC4Validate(cwd: string): Promise<ValidateResult> {
  const localBin = `${cwd}/node_modules/.bin/likec4`;
  const [command, args] = existsSync(localBin)
    ? [localBin, ["validate"]]
    : ["npx", ["--yes", "likec4", "validate"]];

  try {
    const { stdout, stderr } = await execFileAsync(command, args, { cwd });
    return { ran: true, passed: true, rawOutput: `${stdout}${stderr}`, exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      ran: true,
      passed: false,
      rawOutput: `${e.stdout ?? ""}${e.stderr ?? ""}`,
      exitCode: typeof e.code === "number" ? e.code : 1,
    };
  }
}
