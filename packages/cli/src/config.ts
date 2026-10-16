import { resolve } from "node:path";
import type { InitOptions, SyncOptions } from "./types.js";

export interface RawSyncFlags {
  rootDir?: string;
  include?: string[];
  exclude?: string[];
  format?: string;
  validate?: boolean;
}

export interface RawInitFlags {
  rootDir?: string;
}

export function resolveSyncOptions(flags: RawSyncFlags): SyncOptions {
  const rootDir = resolve(flags.rootDir ?? process.cwd());
  const modelDir = `${rootDir}/c4-agent`;
  const format = flags.format === "json" ? "json" : "text";
  return {
    rootDir,
    modelDir,
    include: flags.include ?? [],
    exclude: flags.exclude ?? [],
    format,
    validate: flags.validate ?? true,
  };
}

export function resolveInitOptions(flags: RawInitFlags): InitOptions {
  const rootDir = resolve(flags.rootDir ?? process.cwd());
  return { rootDir };
}
