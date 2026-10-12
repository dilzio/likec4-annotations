# Tasks

## 1. Grammar and Types

- [ ] 1.1 Add an optional `parent:<id>` capture group to `ELEMENT_TAG_RE` in
      `packages/cli/src/parser/grammar.ts`, independent of and combinable
      with the existing `technology:` group, and verify with new cases in
      `packages/cli/test/grammar.test.ts` (parent alone, parent + technology,
      no parent)
- [ ] 1.2 Add `parent?: string` to `ParsedElement` in `packages/cli/src/types.ts`,
      and extend `packages/cli/src/parser/parseAnnotations.ts` to populate it
      from the new capture group, verified by a parser test asserting the
      field is populated/undefined correctly

## 2. Manual-ID Path Awareness

- [ ] 2.1 Extend `packages/cli/src/model/manualIds.ts`'s extraction to track
      `{`/`}` nesting depth (ignoring braces inside quoted string literals)
      so each declared id's full dotted path is computed, not just its bare
      id, and verify with unit tests covering a flat manual file (today's
      shape, unchanged result) and a nested manual file fixture
- [ ] 2.2 Change `readManualIds`'s return shape to carry each id's resolved
      path alongside its bare id (or an equivalent id->path map), updating
      the one call site in `commands/sync.ts` accordingly, and verify
      `packages/cli/test/resolve.test.ts` still passes with the new shape

## 3. Resolution: Parent Graph, Cycles, Paths

- [ ] 3.1 In `packages/cli/src/model/resolve.ts`, build a parent-pointer map
      from valid elements' `parent` fields plus manual-declared ids/paths
      from task 2.2, and verify unit tests for: a parent resolving to another
      annotated element, a parent resolving to a manual element, and an
      element with no parent (unchanged behavior)
- [ ] 3.2 Add cycle detection over the parent-pointer map (DFS), emitting a
      `parentCycles` issue entry per cycle found and leaving every
      participating element un-nested (top-level), verified by a test with a
      two-element and a three-element cycle
- [ ] 3.3 Add unresolved-parent detection, emitting an `unresolvedParents`
      issue entry and leaving that element top-level (not dropped), verified
      by a test asserting the element still appears in `validElements`
- [ ] 3.4 Compute each valid element's fully-qualified dotted path (top-level
      elements: path equals id) from the cycle-free parent graph, and rewrite
      each valid relationship's `source`/`target` fields in place to the
      resolved path strings before `resolveModel` returns, verified by a test
      asserting a relationship into a nested element emits the
      fully-qualified path on its `target` field

## 4. Report Shape

- [ ] 4.1 Add `unresolvedParents` and `parentCycles` arrays to
      `SyncReport["issues"]` in `packages/cli/src/types.ts`, following the
      existing `danglingTargets`/`undeclaredKinds` shape, and wire
      `commands/sync.ts` / `report/buildReport.ts` to populate them from
      resolve.ts's output, verified by `packages/cli/test/sync.integration.test.ts`
      asserting both arrays appear (empty or populated) in a sync report
- [ ] 4.2 Update `report/formatHuman.ts` to render unresolved-parent and
      cycle issues in the human-readable report, matching the tone of
      existing dangling-target/undeclared-kind lines, verified by a snapshot
      or string-assertion test

## 5. Emission

- [ ] 5.1 In `packages/cli/src/emit/elements.ts`, split elements into
      top-level (no resolved parent) and nested (grouped by resolved parent
      path), keep the existing flat-block emission for top-level elements
      unchanged, and append one `extend <parent-path> { ... }` block per
      distinct parent (children sorted by id, parent groups sorted by path)
      for nested elements, verified by a test asserting byte-identical
      output for an all-flat input (no regression) and correct `extend`
      block shape for a nested input
- [ ] 5.2 Verify (read, no code change expected per design.md's "resolve
      once centrally" decision) that `emit/relationships.ts`,
      `emit/flows.ts`, and `model/flows.ts` correctly emit resolved paths
      purely because `resolve.ts` now rewrites `source`/`target` before they
      run - add a regression test in `packages/cli/test/flows.test.ts`
      confirming a flow step whose relationship targets a nested element
      emits the fully-qualified path with no changes to flow-building code

## 6. End-to-End Verification

- [ ] 6.1 Add a nested-element fixture to `packages/cli/test/sync.integration.test.ts`
      (an element with `parent:` pointing at another annotated element, one
      pointing at a `model/manual/**` element, one unresolved parent, and one
      two-element cycle) and verify the full `sync` pipeline produces the
      expected `elements.c4`, reports all four cases correctly, and the
      generated output passes `likec4 validate`
- [ ] 6.2 Add at least one nested element to `demo/` (e.g. a component nested
      inside an existing container) and verify
      `npm run likec4:validate --workspace demo` passes and
      `npm run likec4:sync --workspace demo` regenerates byte-identical
      output on a second run with no code changes (idempotency preserved)

## 7. Documentation

- [ ] 7.1 Update `packages/cli/docs/likec4-annotations.md` with the new
      `parent:` parameter, its resolution rules (including manual-element
      parents and graceful degradation on dangling/cycle), and a worked
      nested example, verified by confirming the documented example matches
      the behavior exercised in task 6.1's test fixture
- [ ] 7.2 Add a note to `openspec/changes/llm-workflow/design.md`'s
      Risks/Trade-offs (or a new note, if already added during exploration)
      confirming this capability now exists and that the annotator's
      taxonomy/tagging stages still need a follow-up revision to propose
      `parent:` assignments, verified by re-reading that file after the edit
