import type { CommentBlock } from "./commentBlocks.js";
import type { MalformedTag, ParsedElement, ParsedRelationship } from "../types.js";
import {
  ELEMENT_TAG_RE,
  REL_KIND_RE,
  REL_TAG_HEAD_RE,
  REL_TECH_RE,
  isElementTagLine,
  isRelationshipTagLine,
  unescapeQuoted,
} from "./grammar.js";

export interface ParsedBlock {
  element: ParsedElement | null;
  relationships: ParsedRelationship[];
  malformed: MalformedTag[];
}

export function parseCommentBlock(block: CommentBlock, sourceFile: string): ParsedBlock {
  const proseLines: string[] = [];
  const malformed: MalformedTag[] = [];
  let element: ParsedElement | null = null;
  const relationships: ParsedRelationship[] = [];
  let seenElementLine = false;

  for (const line of block) {
    if (isElementTagLine(line.text)) {
      seenElementLine = true;
      const match = ELEMENT_TAG_RE.exec(line.text);
      if (!match || !match.groups) {
        malformed.push({ sourceFile, sourceLine: line.lineNumber, rawText: line.text });
        continue;
      }
      if (element) {
        // A second @likec4 in the same block is out of grammar scope; ignore it.
        continue;
      }
      const { kind, id, title, tech } = match.groups;
      element = {
        id,
        kind,
        title: title ? unescapeQuoted(title) : id,
        technology: tech ? unescapeQuoted(tech) : undefined,
        description: proseLines.join(" ").trim() || undefined,
        sourceFile,
        sourceLine: line.lineNumber,
      };
      continue;
    }

    if (isRelationshipTagLine(line.text)) {
      const headMatch = REL_TAG_HEAD_RE.exec(line.text);
      if (!headMatch || !headMatch.groups) {
        malformed.push({ sourceFile, sourceLine: line.lineNumber, rawText: line.text });
        continue;
      }
      const { targetId, label, rest } = headMatch.groups;
      let remainder = rest;
      const techMatch = REL_TECH_RE.exec(remainder);
      if (techMatch) remainder = remainder.replace(REL_TECH_RE, "");
      const kindMatch = REL_KIND_RE.exec(remainder);
      if (kindMatch) remainder = remainder.replace(REL_KIND_RE, "");
      if (remainder.trim().length > 0) {
        malformed.push({ sourceFile, sourceLine: line.lineNumber, rawText: line.text });
        continue;
      }
      relationships.push({
        source: "", // filled in by caller once the block's element id is known
        target: targetId,
        label: unescapeQuoted(label),
        technology: techMatch ? unescapeQuoted(techMatch[1]) : undefined,
        kind: kindMatch ? kindMatch[1] : undefined,
        sourceFile,
        sourceLine: line.lineNumber,
      });
      continue;
    }

    if (!seenElementLine && line.text.trim().length > 0) {
      proseLines.push(line.text.trim());
    }
  }

  // Description is prose above the tags, but we only know the full prose
  // once we've scanned every line — re-join in case relationships appeared
  // before we finished accumulating (shouldn't happen per grammar, but be safe).
  if (element && !element.description && proseLines.length > 0) {
    element.description = proseLines.join(" ").trim() || undefined;
  }

  if (element) {
    for (const rel of relationships) rel.source = element.id;
  } else {
    // No valid element in this block: its relationships have no source to
    // attach to and must not be emitted.
    relationships.length = 0;
  }

  return { element, relationships, malformed };
}
