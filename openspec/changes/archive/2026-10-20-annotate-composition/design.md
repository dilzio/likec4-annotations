# Design

## Context

See `proposal.md` - Why for motivation. Relevant current state in
`packages/claude-plugin/skills/likec4-annotate/SKILL.md`:

- The skill runs four stages: Stage 0 (scan + chunk plan, one chunk per
  deepest package/service manifest directory), Stage 1 (taxonomy
  checkpoint), Stage 2 (per-chunk element + relationship tagging, with a
  `deferredRelationships[]` mechanism for forward references and a final
  sweep once every chunk is `"done"`), Stage 3 (flow inference, which
  explicitly waits until every chunk is `"done"` and `deferredRelationships[]`
  is empty, for the same whole-model-knowledge reason this change's
  composition pass needs to wait).
- All state lives in `c4-agent/.annotate/progress.json` (`schemaVersion: 1`),
  resumable by chunk status.
- `parent:<id>` (the `nested-components` capability) is implemented in
  `packages/cli` - kind-agnostic, resolved against the full known id space
  (annotated + `c4-agent/manual/**`), degrades to top-level + a reported issue
  on a dangling or cyclic reference. None of that resolution/validation
  behavior changes here; this change only affects what the skill proposes.
- `llm-annotator` (this skill's own capability) is synced into
  `openspec/specs/llm-annotator/spec.md` (created from `llm-workflow`'s
  delta, then merged with this change's own delta, via `/opsx:sync`) - this
  change's MODIFIED/ADDED requirements are written against that same
  baseline.

## Goals / Non-Goals

**Goals:**
- Give the skill a concrete, evidence-based rule for when to propose
  `parent:`, when to fold a candidate element back into its sole caller
  instead, and when to leave an element as a peer.
- Fix the skill's taxonomy default so `softwareSystem` isn't proposed for a
  single-system repo by default.
- Fix the skill's granularity default so not every file/class becomes its
  own element.
- Fit the above into the existing stage/checkpoint/manifest structure with
  minimal disruption - one new stage, not a rewrite.

**Non-Goals:**
- No change to `packages/cli`, the `@likec4`/`@likec4-rel`/`parent:` grammar,
  or sync-time resolution/validation - all of that is already correct and
  out of scope.
- No change to Stage 3 (flow inference) behavior or ordering relative to
  Stage 2 - flows reference relationships by their already-stable element
  ids, which nesting does not change.
- Not archiving the `llm-workflow` change itself (moving it under
  `openspec/changes/archive/`) - its spec content is already synced into
  `openspec/specs/llm-annotator/spec.md`, which is what this change's specs
  build on; archiving the change is a separate, orthogonal step.

## Decisions

### New Stage 2.5 ("Composition pass"), not inline per-chunk decisions
Placed after Stage 2 completes (every chunk `"done"`, `deferredRelationships[]`
empty) and before Stage 3, as its own stage with its own checkpoint, mirroring
how Stage 3 already waits on the same precondition for the same reason: the
exclusivity test ("is X referenced by more than one other element?") needs
the complete accumulated relationship set, which isn't available mid-Stage-2.
**Alternative considered:** decide `parent:` inline per chunk, best-effort,
revisited later if invalidated. Rejected: this means per-chunk approval could
silently become wrong once a later chunk is tagged, undermining the "an
approval authorizes exactly the writes just presented for it" guardrail the
skill already states for Stage 2/3.
**Alternative considered:** fold composition into Stage 3 (flow inference)
since both wait on the same precondition. Rejected: flows and containment
are orthogonal concerns (a flow is a sequence of relationships; composition
is a containment edge) and conflating their checkpoints would make either
proposal harder to review in isolation. Ordering between the new stage and
Stage 3 is otherwise arbitrary since neither reads the other's output -
placed before Stage 3 only so the written model's structure is settled
before flow steps are presented over it.

### Composition test: exclusivity + independent-relationship evidence
Three-way test per candidate (peer / nest / fold-back) rather than a single
exclusivity check, because exclusivity alone over-nests: a element with
exactly one caller but no relationships of its own was probably mis-split in
Stage 2 (should never have been its own element) rather than being a true
composition child. Requiring independent grounded relationships as the
second condition keeps `parent:` reserved for elements that are both
exclusively owned and architecturally substantial enough to be worth modeling
as nested rather than collapsed.
**Alternative considered:** nest on exclusivity alone (any single-caller
element gets `parent:`). Rejected: produces noisy, overly deep nesting for
every internal helper class, defeating the purpose of a default.

**Drop the redundant relationship when nesting under the sole owner it came
from.** LikeC4 rejects a direct `@likec4-rel` relationship between a parent
and its own child (confirmed empirically against `packages/cli` +
`likec4 validate` while verifying this change: nesting an element under its
literal sole caller, when that caller also has a direct relationship to/from
it, produces an "Invalid parent-child relationship" error regardless of the
relationship's direction). Since exclusivity (the first test condition) is,
in practice, always established by exactly such a direct relationship -
that's how the annotator knows A references X in the first place - a naive
fallback to "leave X as a peer whenever this conflict exists" would make the
nest branch unreachable for the ordinary case the whole feature exists to
handle (X's sole referencer being its direct caller). Instead, the
composition-pass checkpoint proposes both edits together: add `parent:A` to
X, and remove the now-redundant direct relationship between X and A - once
nesting conveys the containment, the separate edge is both duplicate
information and invalid DSL. The conflict check does *not* gate the
fold-back branch - a candidate with no independent relationships still folds
back into A regardless of whether a direct relationship exists between them,
since folding removes X (and that relationship) entirely anyway. Note this
means the composition-pass checkpoint can modify an already-`"done"` chunk's
relationship tags, not just add `parent:` - already covered by the stated
guardrail exception for this checkpoint (see Decisions below).
**Alternative considered:** leave X as a peer whenever this conflict exists
(simpler rule, no relationship-removal mechanism needed). Rejected: analysis
during verification showed this makes `parent:` unreachable in the single
most common shape (X created in Stage 2 specifically because of its
relationship to its only caller) - the one case this change most needs to
handle. This also explains why the pre-existing hand-authored
`payment-validator` example nests under `payments-service` (a third element
with no direct relationship to it) rather than under its actual sole caller
`orders-service` - nesting under the literal caller would have hit this same
conflict and, under the rejected alternative, stayed a peer.

### Granularity default: one element per chunk, split only on evidence
Reuses Stage 0's existing chunk boundary (already computed, already a
package/service seam) as the default element boundary too, rather than
introducing a second, independent notion of "architecturally meaningful
unit." Splitting requires the same grep-grounded evidence bar Stage 2 step 2
already applies to relationships, so the new rule is additive to an existing
pattern rather than a new verification mechanism.
**Alternative considered:** leave "architecturally meaningful unit" as
freeform judgment (status quo). Rejected: this is the ambiguity motivating
the whole change - a default is the point.

### Taxonomy default: no `softwareSystem` unless signaled by `c4-agent/manual/**`
Checked during Stage 1 (which already reads existing declarations) by
scanning `c4-agent/manual/**` for an existing non-`#external` `softwareSystem`
element before presenting the taxonomy proposal. Kept as part of Stage 1
rather than a new stage since it's a small, local addition to an existing
checkpoint. An existing `#external` `softwareSystem` (the established pattern
for modeling a third-party dependency, e.g. `demo/c4-agent/manual/external-
systems.c4`'s `stripe-api`) is excluded from this check: it says nothing
about whether *this* codebase is part of a multi-system model, and almost
every annotated repo will have at least one once it models any external
service - counting it would make the "no `softwareSystem` by default" rule a
no-op for exactly the common case it's meant to cover.
**Alternative considered:** make this a user-facing prompt every run ("is
this part of a multi-system model?"). Rejected: the signal is already
mechanically checkable from `c4-agent/manual/**`, and the confirmed scope
(single-repo/single-system usage) means asking every run would be a
no-op question nearly always answered "no."

## Risks / Trade-offs

- **Composition-pass checkpoint adds one more review step to an already
  multi-checkpoint workflow** -> Mitigated by batching all proposed `parent:`
  edges into one presentation (not one checkpoint per element), consistent
  with how Stage 3 already batches all proposed flows into one review.
- **Fold-back proposals, and nest proposals that drop a now-redundant
  relationship (removing an already-"done" chunk's element or relationship
  tag) touch a chunk whose own Stage 2 checkpoint already passed** -> This
  is a deliberate, scoped exception to the "never write outside the
  chunk/flow currently being approved" guardrail, authorized specifically by
  the composition-pass checkpoint for exactly the edits it presents; the
  skill instructions must state this exception explicitly so it isn't read
  as contradicting the existing guardrail.

## Migration Plan

Purely additive to the skill's instructions - no code, no manifest
`schemaVersion` bump beyond adding a `compositionPass` status field (new,
defaults absent/pending on older manifests, so a resumed run from a prior
schema simply treats composition as not yet started). No rollback concerns
beyond reverting the SKILL.md/command file changes.
