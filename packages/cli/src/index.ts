#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { resolveInitOptions, resolveSyncOptions } from "./config.js";
import { runSync } from "./commands/sync.js";
import { runInit } from "./commands/init.js";
import { formatHuman } from "./report/formatHuman.js";
import { GRAMMAR_SUMMARY } from "./parser/grammar.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8")) as {
  version: string;
};

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name("likec4-agent")
    .description("Sync a LikeC4 architecture model from @likec4 / @likec4-rel code annotations")
    .version(pkg.version)
    .addHelpText("after", `\n${GRAMMAR_SUMMARY}\n`);

  program
    .command("sync")
    .description("Discover annotations, regenerate c4-agent/generated/*.c4, and validate")
    .option("--root-dir <path>", "root of the target repo", process.cwd())
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

  program
    .command("init")
    .description("Scaffold a fresh c4-agent/ directory at the project root")
    .option("--root-dir <path>", "root of the target repo", process.cwd())
    .action((flags) => {
      const opts = resolveInitOptions(flags);
      const result = runInit(opts);

      if (result.exitCode === 0) {
        process.stdout.write(`Scaffolded ${result.modelDir}\n`);
      } else {
        process.stderr.write(`likec4-agent init: ${result.error}\n`);
      }

      process.exitCode = result.exitCode;
    });

  return program;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createProgram()
    .parseAsync(process.argv)
    .catch((err) => {
      process.stderr.write(`likec4-agent: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 2;
    });
}
