import { readFileSync, existsSync } from "node:fs";
import fg from "fast-glob";

/** Extracts every `id = kind ...` element declaration's id from a .c4 file's content. */
export function extractDeclaredIds(content: string): string[] {
  const ids: string[] = [];
  for (const match of content.matchAll(/^\s*([A-Za-z][\w-]*)\s*=\s*[A-Za-z]/gm)) {
    ids.push(match[1]);
  }
  return ids;
}

export async function readManualIds(manualDir: string): Promise<string[]> {
  if (!existsSync(manualDir)) return [];
  const files = await fg(["**/*.c4"], { cwd: manualDir, onlyFiles: true });
  const ids: string[] = [];
  for (const file of files) {
    const content = readFileSync(`${manualDir}/${file}`, "utf8");
    ids.push(...extractDeclaredIds(content));
  }
  return ids;
}
