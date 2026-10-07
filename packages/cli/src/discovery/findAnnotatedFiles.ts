import { readFileSync, existsSync } from "node:fs";
import { relative } from "node:path";
import fg from "fast-glob";
import ignore from "ignore";

const DEFAULT_EXCLUDES = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/coverage/**",
  "**/*.{png,jpg,jpeg,gif,ico,svg,pdf,zip,tar,gz,woff,woff2,ttf,eot,mp4,mp3,lock}",
];

export interface DiscoveryOptions {
  cwd: string;
  modelDir: string;
  include: string[];
  exclude: string[];
}

export interface DiscoveredFile {
  absolutePath: string;
  relativePath: string;
  content: string;
}

export async function findAnnotatedFiles(opts: DiscoveryOptions): Promise<{
  filesScanned: number;
  annotated: DiscoveredFile[];
}> {
  const modelDirRelative = relative(opts.cwd, opts.modelDir).split(/[\\/]/).join("/");
  const ignorePatterns = [...DEFAULT_EXCLUDES, `${modelDirRelative}/**`, ...opts.exclude];

  const ig = ignore();
  const gitignorePath = `${opts.cwd}/.gitignore`;
  if (existsSync(gitignorePath)) {
    ig.add(readFileSync(gitignorePath, "utf8"));
  }

  const patterns = opts.include.length > 0 ? opts.include : ["**/*"];
  const candidates = await fg(patterns, {
    cwd: opts.cwd,
    dot: false,
    ignore: ignorePatterns,
    onlyFiles: true,
    followSymbolicLinks: false,
  });

  const filtered = candidates.filter((p) => !ig.ignores(p));
  const annotated: DiscoveredFile[] = [];

  for (const relativePath of filtered) {
    const absolutePath = `${opts.cwd}/${relativePath}`;
    let content: string;
    try {
      content = readFileSync(absolutePath, "utf8");
    } catch {
      continue;
    }
    if (content.includes("@likec4")) {
      annotated.push({ absolutePath, relativePath, content });
    }
  }

  return { filesScanned: filtered.length, annotated };
}
