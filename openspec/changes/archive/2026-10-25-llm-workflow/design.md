# Design

## Context

See `proposal.md` - Why for motivation. Relevant current state:

- `packages/cli` is a deterministic TypeScript pipeline
  (`discover -> parse -> resolve -> emit -> validate`) that only ever reads
  tags a human already wrote, and only ever writes inside
  `<model-dir>/generated/`.
- `packages/claude-plugin` today has exactly one skill, `likec4-sync`
  (`packages/claude-plugin/skills/likec4-sync/SKILL.md`), which is a thin,
  judgment-free relay: it runs the CLI and formats its JSON report. It adds
  no code to `packages/cli`.
- The `@likec4`/`@likec4-rel` grammar (`packages/cli/docs/likec4-annotations.md`)
  is fixed by CLI version and out of scope to change here.
- `findAnnotatedFiles.ts` already excludes `<model-dir>/**` from its own
  discovery scan, which means any file placed inside the model directory is
  structurally invisible to `likec4-agent sync`'s tag discovery.

## Goals / Non-Goals

**Goals:**
- Define the `llm-annotator` skill as a pure prompt/instruction artifact
  (markdown), matching the shape of the existing `likec4-sync` skill, with no
  new code in `packages/cli`.
- Fix the concrete shape of the progress manifest (location, schema) so tasks
  can be written against it directly.
- Resolve how relationship/flow proposals get grounded and how uncertainty is
  surfaced, since both affect what the checkpoint review step actually shows.

**Non-Goals:**
- Changing `packages/cli`'s pipeline, grammar, or write boundary in any way.
- Building a standalone/headless annotator package (rejected earlier in favor
  of validating the idea as an interactive skill first; a future change can
  revisit this).
- Automating the handoff into `likec4-agent sync` - the annotator's job ends
  once tags are written and reported; running sync remains a separate,
  explicit step.

## Decisions

### No new TypeScript package - markdown skill only
The entire `llm-annotator` capability is implemented as
`packages/claude-plugin/skills/likec4-annotate/SKILL.md` +
`packages/claude-plugin/commands/likec4-annotate.md`, following the existing
`likec4-sync` pattern exactly. All "logic" - scanning, chunk planning,
taxonomy/tag/flow proposal, manifest read/write - is expressed as staged
instructions the Claude Code agent executes with its own Read/Write/Grep
tools inside the session.
**Alternative considered:** a deterministic helper CLI (e.g.
`packages/annotator-helper`) to manage manifest I/O and chunk planning
programmatically. Rejected for v1: there's no deterministic logic complex
enough yet to justify it (chunk planning and manifest I/O are simple JSON
read/writes), and it would duplicate the "two parts" boundary the user
explicitly wants to keep at (LLM annotator) <-> (deterministic CLI), not
introduce a third, in-between piece.

### Progress manifest: `<model-dir>/.annotate/progress.json`
A single JSON file co-located with the model it's building. Chosen because
`findAnnotatedFiles.ts` already excludes the entire model directory from tag
discovery, so placing it there guarantees `likec4-agent sync` can never
mistake it for source and never scan it - no new exclusion rule needed in the
CLI. Schema (fixed by the skill instructions, not by code):
```json
{
  "schemaVersion": 1,
  "taxonomy": { "approved": true, "kinds": ["..."] },
  "chunks": [
    { "id": "packages/cli", "status": "done", "assignedIds": ["orders-service"] }
  ],
  "flows": { "status": "pending" }
}
```
**Alternative considered:** storing state under `.claude/` (Claude-Code-specific
convention). Rejected: the manifest describes progress on the *model*, not on
the coding session, and keeping it next to `model/` makes it visible and
meaningful to anyone looking at the repo, not just Claude Code.

### Relationship/flow grounding: grep-visible evidence, no new dependency
Before proposing a relationship, the skill instructions require the agent to
corroborate it with something grep/read-visible in the chunk's files (an
import/require/from statement, a direct call-site reference, a configured
client/SDK usage) rather than proposing a relationship from prose/naming
intuition alone. This uses the skill's existing Read/Grep tool access -no new
static-analysis dependency or package.
**Alternative considered:** building or adopting a real static-analysis tool
(import graph / call graph) to ground relationships mechanically. Rejected for
v1: significant new scope (per-language tooling), and the per-chunk human
checkpoint already required by the spec is the primary safety net; grep-level
corroboration raises proposal quality cheaply without that investment.

### Confidence is surfaced in the proposal, never in the written tag
When the skill cannot find grep-visible corroboration for a proposed
relationship or flow step, it still proposes it but marks it inline in the
chat-presented review (e.g. "inferred from naming only, no import found") so
the user knows which lines deserve closer scrutiny. This marker is never
written into the `@likec4-rel`/`flow:` tag itself - the grammar is fixed and
unaffected by this change.
**Alternative considered:** omitting low-confidence relationships entirely.
Rejected: silently dropping them would understate the model (missing edges
are harder to notice than wrong ones flagged for review) and removes
information the user might actually be able to confirm instantly.

### Chunk plan default: one chunk per top-level package/service directory
Default chunking walks the repo's package boundaries (e.g. each
`package.json`/`pyproject.toml`/`go.mod` directory, or each top-level
directory when no such manifest exists), presented as part of the Stage 0
scan output for the user to adjust before Stage 1 begins.
**Alternative considered:** fixed-size chunking (e.g. N files per chunk).
Rejected: package/service boundaries are far more likely to align with what a
reviewer can meaningfully reason about in one checkpoint than an arbitrary
file count.

## Risks / Trade-offs

- **Hallucinated elements/relationships despite grounding** -> Mitigated by
  the mandatory per-chunk and per-flow checkpoints (spec requirements) plus
  the confidence marker on ungrounded proposals; residual risk accepted the
  same way any human-reviewed step is.
- **Manifest schema drift across skill versions** -> Mitigated by the fixed
  `schemaVersion` field; the skill instructions must check it on resume and
  fall back to a fresh scan (not a crash) on mismatch or malformed JSON.
- **Large monorepos still exceeding a comfortable session/context budget even
  when chunked** -> Mitigated by resumability (progress manifest) and by
  letting the user adjust chunk granularity at the Stage 0 checkpoint; not
  fully eliminated by design.
- **Working tree conflicts if the developer edits files mid-run** -> Not
  prevented by the skill; instructions should recommend running against a
  clean working tree (or a dedicated branch) so the generated diff is easy to
  review, consistent with how `likec4-sync` already expects the user to
  review `git diff` themselves.
- **This skill doesn't propose `parent:` (composition) assignments** -> The
  `nested-components` capability (`openspec/changes/support-nested-components`)
  now exists: `@likec4` supports a `parent:<id>` parameter so
  `likec4-agent sync` can generate real C4 containment (System -> Container ->
  Component) instead of a flat list. This skill's taxonomy/tagging stages
  were scoped and implemented before that capability landed, so they still
  only propose flat elements and relationships. Proposing `parent:`
  assignments (e.g. inferring that a discovered component lives inside an
  already-tagged container) is tracked as a follow-up revision to this
  skill's Stage 1 (tagging) instructions, not part of this change.

## Migration Plan

Purely additive - no existing behavior changes, nothing to migrate or roll
back. The new skill/command files can be removed with no effect on
`packages/cli` or the existing `likec4-sync` skill.
