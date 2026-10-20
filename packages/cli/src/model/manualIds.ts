import { readFileSync, existsSync } from "node:fs";
import fg from "fast-glob";

const DECL_RE = /^\s*([A-Za-z][\w-]*)\s*=\s*[A-Za-z]/;

/** Replaces the contents of quoted string literals with spaces so brace counting ignores them. */
function stripQuotedLiterals(line: string): string {
  return line.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, (m) => " ".repeat(m.length));
}

/** Extracts every `id = kind ...` element declaration's id from a .c4 file's content. */
export function extractDeclaredIds(content: string): string[] {
  const ids: string[] = [];
  for (const match of content.matchAll(/^\s*([A-Za-z][\w-]*)\s*=\s*[A-Za-z]/gm)) {
    ids.push(match[1]);
  }
  return ids;
}

/**
 * Extracts every `id = kind ...` element declaration's id and its fully-qualified
 * dotted path, tracking `{`/`}` nesting depth (ignoring braces inside quoted string
 * literals) so a declaration nested inside another element's block resolves to
 * `parent.child` rather than just `child`.
 */
export function extractDeclaredIdsWithPaths(content: string): Array<{ id: string; path: string }> {
  const results: Array<{ id: string; path: string }> = [];
  const stack: Array<string | null> = [];

  for (const rawLine of content.split("\n")) {
    const stripped = stripQuotedLiterals(rawLine);
    const declMatch = DECL_RE.exec(rawLine);

    if (declMatch) {
      const id = declMatch[1];
      const parentPath = stack.filter((entry): entry is string => entry !== null).join(".");
      results.push({ id, path: parentPath ? `${parentPath}.${id}` : id });
    }

    let consumedDeclBrace = false;
    for (const char of stripped) {
      if (char === "{") {
        if (declMatch && !consumedDeclBrace) {
          stack.push(declMatch[1]);
          consumedDeclBrace = true;
        } else {
          stack.push(null);
        }
      } else if (char === "}") {
        stack.pop();
      }
    }
  }

  return results;
}

/** Reads every `.c4` file under `manualDir` and returns a map of declared id -> its fully-qualified dotted path. */
export async function readManualIds(manualDir: string): Promise<Map<string, string>> {
  const idPaths = new Map<string, string>();
  if (!existsSync(manualDir)) return idPaths;
  const files = await fg(["**/*.c4"], { cwd: manualDir, onlyFiles: true });
  for (const file of files) {
    const content = readFileSync(`${manualDir}/${file}`, "utf8");
    for (const { id, path } of extractDeclaredIdsWithPaths(content)) {
      idPaths.set(id, path);
    }
  }
  return idPaths;
}
