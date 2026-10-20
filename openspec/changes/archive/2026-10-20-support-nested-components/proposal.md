# Proposal

## Why

Every element `likec4-agent sync` generates today is a flat, independent
top-level block — there is no way to express that a `container` lives inside
a `softwareSystem`, or a `component` lives inside a `container`. That's the
core structural idea C4 (and LikeC4) models are built on — the System
Context -> Container -> Component zoom levels are containment levels, not
just differently-named boxes connected by arrows. Without it, `container`
and `component` carry a kind label but none of the hierarchy that makes those
kinds meaningful, and every future feature that assumes real C4 structure
(including the cold-start LLM annotator in `llm-workflow`) inherits that gap.

## What Changes

- New optional `parent:<id>` parameter on the `@likec4` tag, declaring that
  the annotated element is nested inside the element identified by
  `<id>`. Independent of, and combinable with, the existing `technology:`
  parameter.
- `likec4-agent sync` resolves `parent:` against the full known id space
  (other annotated elements, plus ids declared in `c4-agent/manual/**` and
  `c4-agent/specification.c4`), the same cross-file resolution already done for
  relationship targets today.
- Cycle detection: a parent chain that loops back on itself (A parent of B,
  B parent of A) is rejected the same way a dangling relationship target is
  today — dropped from generated output with a reported issue, not a hard
  crash.
- Generated output expresses nesting using LikeC4's `extend <dotted.path> { }`
  block form (verified against the installed LikeC4 validator) rather than
  literal nested braces, so elements discovered independently across
  different files/chunks can still attach to an already-declared parent
  without the emitter needing to assemble one single nested tree.
- Relationships whose source or target is a nested element resolve and emit
  using that element's fully-qualified dotted path when referenced from
  outside its own containment scope, matching what the LikeC4 language
  itself requires.
- No changes to the `flow:`/`flowTitle:` grammar or the `dataflow-views`
  capability's behavior — flow steps continue to reference elements by
  whatever id/path resolves them, nested or not.

## Capabilities

### New Capabilities
- `nested-components`: lets `@likec4` declare an element as nested inside
  another via `parent:<id>`, and has `likec4-agent sync` resolve, validate
  (including cycle rejection), and emit that containment using LikeC4's
  `extend` block form so generated output reflects true C4 hierarchy instead
  of a flat list of elements.

### Modified Capabilities
- None. This is purely additive to the `@likec4` grammar and the sync
  pipeline's resolution/emission; no existing requirement's behavior changes
  for annotations that don't use `parent:`.

## Impact

- `packages/cli/src/parser/grammar.ts` — new `parent:` capture group on the
  element tag regex.
- `packages/cli/src/types.ts` — `ParsedElement` gains an optional `parent`
  field.
- `packages/cli/src/model/resolve.ts` — parent-id resolution against the
  combined declared-id space, plus cycle detection.
- `packages/cli/src/model/manualIds.ts` — must capture nesting depth / full
  dotted path for ids declared in `c4-agent/manual/**`, not just bare ids, so a
  hand-authored element can be a resolvable parent or a cross-scope
  relationship target.
- `packages/cli/src/emit/elements.ts` — group-by-parent emission using
  `extend` blocks instead of the current flat sorted loop; relationship
  emission in `relationships.ts` needs the same dotted-path awareness for
  nested sources/targets.
- `packages/cli/docs/likec4-annotations.md` — grammar doc gets the new
  `parent:` parameter and a nested example.
- `demo/` — worked example gets at least one nested element to exercise and
  document the feature end-to-end.
- Out of scope for this change: the `llm-workflow` annotator skill does not
  get updated here to propose `parent:` assignments — that is explicitly
  deferred as a documented follow-up once this capability exists (see
  `openspec/changes/llm-workflow/design.md`).
