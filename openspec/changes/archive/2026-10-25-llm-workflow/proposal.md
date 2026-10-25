# Proposal

## Why

Today, every `@likec4`/`@likec4-rel` tag is hand-written — `likec4-agent sync` only
ever consumes annotations a developer already authored. That makes adoption on an
existing, unannotated codebase slow: someone has to manually read the whole thing
and decide what's an element, what's a relationship, and what kind each one is
before the deterministic sync pipeline has anything to work with. The killer
version of this tool lets a developer point it at a codebase cold and get a
useful first-draft model, with the existing CLI unchanged as the deterministic
backend that turns tags into DSL.

## What Changes

- New interactive Claude Code skill, `likec4-annotate`, that reads a previously
  unannotated (or partially annotated) codebase and proposes `@likec4`/
  `@likec4-rel`/`flow:`/`flowTitle:` tags to write into the developer's source
  files — a new capability, not an extension of the existing sync pipeline.
- Staged workflow with explicit human checkpoints before anything is written:
  1. Scan the repo and build a chunk plan (directory/service-sized units).
  2. Propose a `model/specification.c4` kind taxonomy and get it approved before
     any file is tagged (every later tag depends on this).
  3. Per chunk: propose element + relationship tags, get the chunk approved,
     then write tags into that chunk's source files.
  4. Once every chunk is tagged, infer flow groupings across the full
     relationship set (flows can span chunks/files) and get them approved
     (pruned/renamed as needed) before writing `flow:`/`flowTitle:` tags.
- Persistent on-disk progress manifest recording the confirmed taxonomy,
  per-chunk status, and assigned element ids, so a run can be paused and
  resumed from a later Claude Code session on a large codebase instead of
  starting over.
- No changes to `packages/cli`: the annotator only produces input (tagged
  source files) that the existing deterministic `discover -> parse -> resolve
  -> emit -> validate` pipeline already knows how to consume via
  `likec4-agent sync`.

## Capabilities

### New Capabilities
- `llm-annotator`: an interactive, checkpointed Claude Code skill that proposes
  and writes `@likec4`/`@likec4-rel`/flow tags across an unannotated codebase,
  with a resumable on-disk progress manifest, handing off to the existing
  `likec4-agent sync` CLI for deterministic model generation.

### Modified Capabilities
- None. `dataflow-views` (flow tag -> dynamic view generation) is unchanged;
  this change only adds a new producer of `flow:`/`flowTitle:` tags, consistent
  with that capability's existing contract.

## Impact

- New files under `packages/claude-plugin/skills/likec4-annotate/` (skill
  instructions) and `packages/claude-plugin/commands/likec4-annotate.md`
  (command entry point), following the existing `likec4-sync` skill/command
  pattern.
- New on-disk artifact: a progress manifest file (location/format to be fixed
  in design.md) that must stay clearly outside `model/generated/**`,
  `model/manual/**`, and `model/views/**` so it can't be confused with
  CLI-owned or hand-authored model files.
- No changes to `packages/cli/src/**`, its tests, or its published behavior.
- No changes to the `@likec4`/`@likec4-rel` tag grammar itself
  (`packages/cli/docs/likec4-annotations.md`) — the annotator must emit tags
  that already conform to it.
