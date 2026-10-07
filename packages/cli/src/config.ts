import { resolve } from "node:path";
import type { SyncOptions } from "./types.js";

export interface RawSyncFlags {
  cwd?: string;
  modelDir?: string;
  include?: string[];
  exclude?: string[];
  format?: string;
  validate?: boolean;
}

export function resolveSyncOptions(flags: RawSyncFlags): SyncOptions {
  const cwd = resolve(flags.cwd ?? process.cwd());
  const modelDir = resolve(flags.modelDir ?? `${cwd}/model`);
  const format = flags.format === "json" ? "json" : "text";
  return {
    cwd,
    modelDir,
    include: flags.include ?? [],
    exclude: flags.exclude ?? [],
    format,
    validate: flags.validate ?? true,
  };
}
