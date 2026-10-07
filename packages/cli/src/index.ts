#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { resolveSyncOptions } from "./config.js";
import { runSync } from "./commands/sync.js";
import { formatHuman } from "./report/formatHuman.js";
import { GRAMMAR_SUMMARY } from "./parser/grammar.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8")) as {
  version: string;
};

const program = new Command();

program
  .name("likec4-agent")
  .description("Sync a LikeC4 architecture model from @likec4 / @likec4-rel code annotations")
  .version(pkg.version)
  .addHelpText("after", `\n${GRAMMAR_SUMMARY}\n`);

program
  .command("sync")
  .description("Discover annotations, regenerate model/generated/*.c4, and validate")
  .option("--cwd <path>", "root of the target repo", process.cwd())
  .option("--model-dir <path>", "path to the model directory (default: <cwd>/model)")
  .option("--include <glob>", "restrict the scan to this glob (repeatable)", collect, [])
  .option("--exclude <glob>", "exclude this glob from the scan (repeatable)", collect, [])
  .option("--format <json|text>", "output format", "text")
  .option("--no-validate", "skip the `likec4 validate` step")
  .action(async (flags) => {
    const opts = resolveSyncOptions(flags);
    const now = new Date().toISOString();
    const { report, exitCode } = await runSync(opts, now);

    if (opts.format === "json") {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      process.stdout.write(`${formatHuman(report)}\n`);
    }

    process.exitCode = exitCode;
  });

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`likec4-agent: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 2;
});
