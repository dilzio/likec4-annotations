# Proposal

## Why

`nested-components` added an optional `parent:<id>` parameter that lets
`likec4-agent sync` resolve and emit real C4 containment (`softwareSystem` ->
`container` -> `component`) instead of a flat list of elements, with cycle
detection and graceful degradation already handled deterministically in
`packages/cli`. Its own proposal explicitly deferred teaching the
`likec4-annotate` skill when to propose `parent:` as a documented follow-up.
That skill today has no granularity guidance, no concept of composition
("has-a"/ownership) versus plain usage, and no rule for when a
`softwareSystem` wrapper is worth introducing - so it would either never
propose nesting at all, or propose it inconsistently. This change closes that
gap by giving the annotator a concrete, evidence-based decision procedure.

## What Changes

- Stage 1 (taxonomy proposal) no longer offers `softwareSystem` as an
  available kind by default; it's only proposed if `c4-agent/manual/**`
  already declares one, signaling this repo is one of several systems in a
  shared model.
- Stage 2 (per-chunk tagging) gets a concrete default for "architecturally
  meaningful unit": one element per chunk/package by default, splitting a
  sub-part into its own element only when it has grounded relationships of
  its own, distinct from its siblings.
- A new composition-pass stage runs once, after every chunk reaches `done` in
  the progress manifest: it reads the full accumulated element/relationship
  graph and applies an exclusivity test (sole caller + independent
  relationships of its own) to decide which elements get `parent:` proposed,
  presented at one dedicated review checkpoint. This is deliberately a
  separate, later stage rather than an inline per-chunk decision, since the
  exclusivity test needs whole-model knowledge a single chunk doesn't have.
- Library/dependency handling is formalized: third-party packages with no
  "other side" (e.g. a generic utility library) are never tagged at all;
  third-party client SDKs fronting a real external service resolve to
  modeling that service (the existing hand-authored `c4-agent/manual/**`
  `#external` pattern), never the SDK itself; first-party code used by a
  single consumer folds into it or nests under it per the exclusivity test;
  first-party code used by multiple consumers is proposed as a peer element.
- Progress manifest schema gains a place to record composition-pass status
  (so a resumed run knows whether the composition pass has already run for
  the current set of approved chunks).

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `llm-annotator`: adds the composition-pass requirement, the per-chunk
  granularity default, the taxonomy default change (no `softwareSystem`
  unless signaled by `c4-agent/manual/**`), and the library/dependency
  handling rules, on top of the capability's existing requirements (synced
  into `openspec/specs/llm-annotator/spec.md` via `/opsx:sync`, sourced from
  `llm-workflow`).

## Impact

- `packages/claude-plugin/skills/likec4-annotate/SKILL.md` - Stage 1 taxonomy
  instructions, Stage 2 granularity instructions, new composition-pass stage
  and its checkpoint, progress manifest schema note.
- `packages/claude-plugin/commands/likec4-annotate.md` - update the stage
  list/summary if it documents the skill's stages.
- Depends on `nested-components` (the `parent:` grammar/resolution/emission,
  archived as `support-nested-components`), which is now present on this
  branch after rebasing onto `origin/main` - end-to-end verification against
  generated `extend` blocks is unblocked.
- No changes to `packages/cli`, the `@likec4`/`@likec4-rel` grammar, or the
  `dataflow-views`/flow-inference behavior.
