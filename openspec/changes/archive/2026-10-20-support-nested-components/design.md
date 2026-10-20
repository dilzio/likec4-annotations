# Design

## Context

See `proposal.md` - Why for motivation. Relevant current state, confirmed by
running the actually-installed LikeC4 validator (v1.59.4) against hand-built
fixtures rather than assumed from memory:

- LikeC4 supports nesting via literal nested braces (`a = kind 'X' { b = kind
  'Y' } }`) **and** via `extend <fully.qualified.path> { ... }`, which lets a
  completely different file attach children to an already-declared parent.
  Both forms resolve independent of file order or declaration order across
  the whole workspace (verified with a 3-file fixture where a grandchild's
  `extend` block was processed before its own parent's `extend` block).
- A relationship whose source or target lives inside a nested scope only
  resolves when referenced by its **fully-qualified dotted path**
  (`cloud.backend.api`); the bare id (`api`) fails to resolve from outside
  that scope.
- `packages/cli`'s pipeline is entirely custom: `grammar.ts` is a hand-rolled
  regex parser, `manualIds.ts` extracts ids from `c4-agent/manual/**` with a
  single-line regex, and `likec4` itself is only a **peer dependency**,
  shelled out to via `child_process` in `runLikeC4Validate.ts` purely for the
  final `validate` step - the CLI never imports LikeC4's own parser/model
  APIs. This design preserves that boundary rather than introducing a hard
  dependency on LikeC4's internals.
- `emit/flows.ts` and `model/flows.ts` consume `ParsedRelationship.source`/
  `.target` directly, with no independent id lookup of their own - whatever
  resolve.ts puts in those fields is what gets emitted into both
  `relationships.c4` and `flows.c4`.

## Goals / Non-Goals

**Goals:**
- Resolve and validate `parent:` references using the same combined id space
  (annotated + `c4-agent/manual/**`) already used for relationship targets.
- Emit containment using `extend` blocks so cross-file/cross-chunk nesting
  works without needing a topological sort or single-pass tree assembly.
- Make fully-qualified-path resolution a single, central step so
  `relationships.c4` and `flows.c4` need zero code changes to correctly
  reference nested elements.

**Non-Goals:**
- Importing LikeC4's own parser/langium APIs as a dependency - the custom
  regex/scan approach is preserved, consistent with the existing CLI design.
- General-purpose parsing of arbitrary hand-authored LikeC4 syntax in
  `c4-agent/manual/**` (e.g. braces inside string literals or block comments) -
  the manual-id scanner is a best-effort, brace-depth-aware extension of
  today's shallow regex, not a full grammar implementation.
- Any change to the `flow:`/`flowTitle:` grammar, or to `emit/flows.ts` /
  `model/flows.ts` themselves (see path-resolution decision below for why).
- Updating the `llm-workflow` annotator to propose `parent:` - tracked as a
  documented follow-up there, not part of this change.

## Decisions

### Element tag's optional params become order-independent, not positionally fixed
`ELEMENT_TAG_RE` today matches `kind`, `id`, optional `title`, and optional
`technology:"..."` as a single fixed-order regex - it has never had to
support two independent optional named params before. Adding `parent:<id>`
makes the element tag face the same problem `@likec4-rel` already solved:
strip each optional param out of a remainder string regardless of the order
they appear in (see `REL_TECH_RE`/`REL_KIND_RE`/`REL_FLOW_RE`/
`REL_FLOWTITLE_RE` in `grammar.ts`). `@likec4` adopts the same
remainder-extraction approach for `technology:` and `parent:`, so both can
appear in either order on the tag line.
**Why:** consistency with how `@likec4-rel` already parses its own multiple
optional params, and it doesn't force annotation authors to memorize a
required param sequence.
**Alternative considered:** keep the single fixed-order regex and add
`parent:` as a new trailing optional group after `technology:`. Rejected -
forces a specific param order with no benefit, and diverges from the pattern
already established for relationship tags.

### Resolve parent, then rewrite relationship endpoints to full paths centrally
`resolve.ts` gains a path-resolution pass: after validating elements and
relationships as it does today, it builds a parent-pointer map (from
`parent:` across annotated elements, with manual-declared elements as
possible roots), detects cycles via DFS, and computes each element's
fully-qualified dotted path (a top-level element's path is just its own id).
It then rewrites each valid relationship's `source`/`target` fields in place
to the resolved path strings before returning.
**Why centrally, once:** `emit/flows.ts` and `model/flows.ts` already consume
`ParsedRelationship.source`/`.target` verbatim with no id logic of their own.
Resolving paths once in `resolve.ts` means both `relationships.c4` and
`flows.c4` get correct nested references with **no code changes** to either
file - confirmed by reading both and seeing they do no independent
resolution.
**Alternative considered:** resolving paths separately inside each emitter.
Rejected - duplicates resolution logic in two places and risks the two
emitters disagreeing on an element's path.

### Emit containment as `extend` blocks appended to `elements.c4`, not a new file
Elements with a resolved parent are grouped by that parent's fully-qualified
path and emitted as `extend <path> { child = kind '...' { ... } }` blocks,
appended after the existing flat top-level blocks in the same generated
`elements.c4` - no new generated file. Parent groups are ordered by the
parent's path, and children within a group by id, preserving the existing
idempotent/byte-identical-reruns guarantee.
**Why `extend` over literal nested braces:** elements are discovered
independently across files/chunks in a single flat pass; `extend` lets each
discovered child attach to its parent without the emitter needing to
assemble one actual nested tree structure first - confirmed order-independent
against the real validator.
**Alternative considered:** building a literal nested tree and emitting
single nested blocks per root. Rejected - requires assembling and
threading tree structure through emission for no behavioral benefit, since
`extend` is proven to work regardless of file/order.

### Dangling parent and cycles degrade gracefully, like dangling relationship targets
An unresolved `parent:` or a detected cycle does not drop the element or fail
the run - the element is emitted at the top level (parent reference
ignored) and the issue is reported, mirroring the existing dangling-target
and undeclared-kind handling. `SyncReport.issues` gains two new arrays
(`unresolvedParents`, `parentCycles`) alongside the existing ones.
**Alternative considered:** failing the sync run on a cycle. Rejected -
inconsistent with this pipeline's established "never let a bad annotation
break the whole run" posture.

### Manual-id extraction becomes brace-depth-aware, not a new parser dependency
`manualIds.ts`'s regex-per-line extraction is extended to track `{`/`}`
depth (ignoring braces inside quoted string literals) so it can compute each
hand-authored element's nesting path, not just its bare id. This stays a
lightweight custom scanner, consistent with `grammar.ts`'s existing approach,
rather than adopting LikeC4's own parser.
**Alternative considered:** importing LikeC4's langium-based parser for
`c4-agent/manual/**` to get exact nesting for free. Rejected for this change -
`likec4` is deliberately kept as a peer/shell-out-only dependency
(`runLikeC4Validate.ts`); pulling its parser in as a hard dependency is a
bigger architectural shift than this feature needs, and the brace-depth scan
covers every nesting shape already used in this repo's own `c4-agent/manual/**`
(and the fixtures this change adds alongside it).

## Risks / Trade-offs

- **Brace-depth scanner mis-parses unusual hand-written `c4-agent/manual/**`
  content** (e.g. a brace inside a block comment) -> Mitigated by scope:
  `c4-agent/manual/**` is small and human-reviewed, and a mis-parse surfaces as
  a reported dangling-parent/cycle issue rather than silent corruption, the
  same safety net as today's dangling-target handling.
- **Computing fully-qualified paths requires resolving parents before
  children** -> Mitigated by resolving the whole parent-pointer graph in
  one pass with cycle detection before any path string is computed, not
  incrementally per element.
- **This change doesn't make the `llm-workflow` annotator composition-aware**
  -> Accepted and explicitly out of scope (see Non-Goals); tracked as a
  documented follow-up in that change's own design.md.

## Migration Plan

Purely additive to the grammar and emitted output shape - no existing
`@likec4` tag's behavior changes, and no existing generated file's prior
content becomes invalid. Nothing to roll back beyond reverting the change
itself.
