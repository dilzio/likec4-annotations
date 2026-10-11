# Design

## Context

See `proposal.md` - Why for motivation. Relevant current state:

- `packages/cli/src/commands/sync.ts` pipeline: `findAnnotatedFiles` -> `extractCommentBlocks` ->
  `parseCommentBlock` (per block) -> `resolveModel` -> `emitElements`/`emitRelationships` -> write
  `model/generated/{elements,relationships}.c4` -> optional `likec4 validate` -> `buildReport`.
- `@likec4-rel` grammar is matched by `REL_TAG_HEAD_RE` (target + label) in
  `packages/cli/src/parser/grammar.ts`, then an optional `remainder` is checked against
  `REL_TECH_RE` and `REL_KIND_RE`; anything left over after stripping known params is treated as
  malformed (`packages/cli/src/parser/parseAnnotations.ts`).
- `resolveModel` (`packages/cli/src/model/resolve.ts`) filters relationships whose source element
  had an undeclared kind, whose own `kind:` is undeclared, or whose target id isn't in the
  model — producing `validRelationships`.
- Emitters (`packages/cli/src/emit/elements.ts`, `relationships.ts`) use `escapeSingleQuoted` for
  single-quoted LikeC4 string literals and `escapeDoubleQuoted` for the double-quoted
  relationship label; both from `packages/cli/src/emit/escape.ts`.
- The upstream `likec4` package (v1.59.4, already a peer dependency) supports a `dynamic view
  <id> { ... }` DSL construct, confirmed from its compiled source
  (`node_modules/likec4/dist/chunks/sequence-view.mjs`, `node_modules/@likec4/core/dist/types/index.d.mts`).
  Its step/label printer uses single-quoted string escaping, not the double-quoted convention
  `emitRelationships` uses for static relationship labels today.

## Goals / Non-Goals

**Goals:**
- Prove the annotation grammar + deterministic CLI pipeline can turn step-tagged relationships
  into a valid, `likec4 validate`-passing `dynamic view`.
- Keep the change additive and low-risk: existing annotations without `flow:`/`flowTitle:`
  produce byte-identical output to today.

**Non-Goals:**
- Any LLM-driven inference of flows or flow step order (separate, later effort — see
  proposal.md Impact).
- A standalone `@likec4-flow` declaration tag, or any mechanism for flow metadata beyond a title.
- Detecting collisions between a flow id and a hand-authored view id under `model/views/**`.
- Any out-of-band/sidecar annotation mechanism.

## Decisions

**Extend `@likec4-rel` with `flow:`/`flowTitle:` params, rather than a new `@likec4-flow` tag.**
This matches the existing pattern of bracketed params (`technology:"..."`, `kind:...`) on the
same tag, and needs no new parser branch, no new resolution pass, and no cross-block attachment
logic (which the grammar doc already scopes out for v1). A standalone flow-declaration tag would
be cleaner if flows later need richer metadata (owner, description, multiple titles merged from
several sources) — revisit then.

**Bundle flow id and step into one param, `flow:"<flowId>":<step>`, rather than two separate
params.** A relationship that declares a step without a flow id (or vice versa) is meaningless;
bundling them makes that state unrepresentable instead of requiring extra validation.

**Resolve flow title by "first occurrence wins", not by requiring it on every step or rejecting
duplicates.** Matches the project's general bias toward deterministic-but-permissive behavior
(see how `resolveModel` already drops-and-warns rather than hard-fails on dangling targets).
Requiring title agreement across every tagged line would make the annotation grammar brittle to
innocent copy-paste variance across files.

**Group and order flows from `resolved.validRelationships` (post-`resolveModel`), not from the
raw parsed list.** This guarantees a flow can never reference a relationship that didn't make it
into the model for other reasons (dangling target, undeclared kind) — see the spec requirement
"Flow membership respects existing relationship validity". It also means flow building is a pure
function of already-validated data, with no new validation logic duplicated.

**Never emit a `dynamic view` with zero steps.** `likec4 validate` fails the entire model on any
single malformed file (confirmed: `runLikeC4Validate` runs over the whole workspace, not per
file), so a reachable path to an invalid empty view would be a regression for elements and
relationships too, not just the new feature. Checked at emit time, not parse time, since a flow
can only be known to be empty after `resolveModel` has run.

**New generated file `model/generated/flows.c4`, not appended to `relationships.c4`.** Keeps each
generated file single-purpose and matches the project's existing per-concern file split
(`elements.c4` vs `relationships.c4`). `runLikeC4Validate` already validates the whole
`model/generated/` directory, so no wiring change is needed to pick up the new file.

**Use `escapeSingleQuoted` for dynamic-view step labels, diverging from `emitRelationships`'s
double-quoted label convention.** This is dictated by the upstream LikeC4 dynamic-view printer
format, not a stylistic choice — using double-quote escaping here would be accepted by our own
emitter but could produce output LikeC4's parser doesn't expect for this specific block type.

## Risks / Trade-offs

- **[Risk]** A single malformed `flows.c4` could fail `likec4 validate` for the whole model,
  regressing elements/relationships validation too. → **Mitigation**: only ever emit
  well-formed, non-empty dynamic views (see Decisions above); add an integration test asserting
  `likec4 validate` still passes when a flow has to be dropped entirely.
- **[Risk]** A relationship tagged with two flows, or a flow id colliding with a hand-authored
  view id, could silently produce confusing output. → **Mitigation**: the former is explicitly
  unparseable by the single-capture `flow:` regex and surfaces as a malformed tag (see spec);
  the latter is accepted as a known, documented gap for this slice (no scanner exists for
  `model/views/**` ids today — building one is out of scope here).
- **[Trade-off]** Bundling id+step into one param is slightly less readable than two separate
  params for a human skimming the tag, but removes an entire class of "step without flow"
  inconsistency the parser would otherwise need to validate.

## Migration Plan

Purely additive — no existing annotations change meaning, no existing generated file's content
changes shape for inputs that don't use the new params. Rollout is: ship the parser/emitter
changes, update the bundled grammar doc, hand-annotate the demo as a worked example, and verify
`likec4-agent sync && likec4 validate` against the demo. No feature flag or staged rollout is
needed since the new behavior only activates when a relationship is explicitly tagged with
`flow:`.
