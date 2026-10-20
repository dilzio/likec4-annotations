export const GRAMMAR_SUMMARY = `
@likec4 <kind> <id> ["<title>"] [technology:"<tech>"] [parent:<id>]
@likec4-rel <targetId> "<label>" [technology:"<tech>"] [kind:<relKind>] [flow:"<flowId>":<step>] [flowTitle:"<title>"]

See docs/likec4-annotations.md (bundled with this CLI) for the full grammar.
`.trim();

const ID_PATTERN = "[A-Za-z][A-Za-z0-9_-]*";
const QUOTED = '"(?:[^"\\\\]|\\\\.)*"';

export const ELEMENT_TAG_HEAD_RE = new RegExp(
  `^@likec4\\s+(?<kind>${ID_PATTERN})\\s+(?<id>${ID_PATTERN})` +
    `(?:\\s+"(?<title>(?:[^"\\\\]|\\\\.)*)")?` +
    `\\s*(?<rest>.*)$`,
);

export const ELEMENT_PARENT_RE = new RegExp(`parent:(${ID_PATTERN})`);

export const REL_TAG_HEAD_RE = new RegExp(
  `^@likec4-rel\\s+(?<targetId>${ID_PATTERN})\\s+"(?<label>(?:[^"\\\\]|\\\\.)*)"\\s*(?<rest>.*)$`,
);

export const REL_TECH_RE = /technology:"((?:[^"\\]|\\.)*)"/;
export const REL_KIND_RE = /kind:([A-Za-z][A-Za-z0-9_-]*)/;
export const REL_FLOW_RE = new RegExp(`flow:"(${ID_PATTERN})":(\\d+)`);
export const REL_FLOWTITLE_RE = /flowTitle:"((?:[^"\\]|\\.)*)"/;

export function unescapeQuoted(value: string): string {
  return value.replace(/\\(.)/g, "$1");
}

/** True if the line (after stripping comment markers) starts an element tag. */
export function isElementTagLine(line: string): boolean {
  return /^@likec4\s+/.test(line) && !isRelationshipTagLine(line);
}

/** True if the line (after stripping comment markers) starts a relationship tag. */
export function isRelationshipTagLine(line: string): boolean {
  return /^@likec4-rel\s+/.test(line);
}
