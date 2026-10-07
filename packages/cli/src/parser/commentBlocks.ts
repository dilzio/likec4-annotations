import { isElementTagLine, isRelationshipTagLine } from "./grammar.js";

export interface BlockLine {
  lineNumber: number;
  text: string;
}

export type CommentBlock = BlockLine[];

function buildLineOffsets(content: string): number[] {
  const offsets: number[] = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "\n") offsets.push(i + 1);
  }
  return offsets;
}

function offsetToLineNumber(offsets: number[], offset: number): number {
  let lo = 0;
  let hi = offsets.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (offsets[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

function stripBlockCommentMarker(line: string): string {
  return line
    .replace(/^\s*\/\*\*?/, "")
    .replace(/\*\/\s*$/, "")
    .replace(/^\s*\*\s?/, "")
    .trim();
}

function stripDocstringMarker(line: string): string {
  return line.replace(/^\s*("""|''')/, "").replace(/("""|''')\s*$/, "").trim();
}

function stripLineCommentMarker(line: string): string {
  return line.replace(/^\s*(\/\/|#)\s?/, "").trim();
}

/**
 * Extracts every comment block (JSDoc-style, Python docstring, or consecutive
 * line comments) from a file's content, with per-line comment markers
 * stripped and original 1-indexed line numbers preserved. Blocks containing
 * no @likec4/@likec4-rel tag line are discarded by the caller.
 */
export function extractCommentBlocks(content: string): CommentBlock[] {
  const lines = content.split("\n");
  const offsets = buildLineOffsets(content);
  const consumed = new Set<number>();
  const blocks: CommentBlock[] = [];

  const blockCommentRe = /\/\*\*?[\s\S]*?\*\//g;
  for (const match of content.matchAll(blockCommentRe)) {
    const startLine = offsetToLineNumber(offsets, match.index!);
    const endLine = offsetToLineNumber(offsets, match.index! + match[0].length - 1);
    const block: CommentBlock = [];
    for (let ln = startLine; ln <= endLine; ln++) {
      consumed.add(ln);
      block.push({ lineNumber: ln, text: stripBlockCommentMarker(lines[ln - 1]) });
    }
    blocks.push(block);
  }

  const docstringRe = /("""|''')[\s\S]*?\1/g;
  for (const match of content.matchAll(docstringRe)) {
    const startLine = offsetToLineNumber(offsets, match.index!);
    const endLine = offsetToLineNumber(offsets, match.index! + match[0].length - 1);
    if ([...Array(endLine - startLine + 1).keys()].some((i) => consumed.has(startLine + i))) continue;
    const block: CommentBlock = [];
    for (let ln = startLine; ln <= endLine; ln++) {
      consumed.add(ln);
      block.push({ lineNumber: ln, text: stripDocstringMarker(lines[ln - 1]) });
    }
    blocks.push(block);
  }

  let run: CommentBlock = [];
  const flushRun = () => {
    if (run.length > 0) blocks.push(run);
    run = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    if (consumed.has(lineNumber)) {
      flushRun();
      continue;
    }
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("#")) {
      run.push({ lineNumber, text: stripLineCommentMarker(lines[i]) });
    } else {
      flushRun();
    }
  }
  flushRun();

  return blocks.filter((block) =>
    block.some((l) => isElementTagLine(l.text) || isRelationshipTagLine(l.text)),
  );
}
