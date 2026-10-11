# Tasks

## 1. Types and grammar

- [x] 1.1 Add `flow?: string`, `step?: number`, `flowTitle?: string` to `ParsedRelationship` in
      `packages/cli/src/types.ts`; verify `tsc`/build still passes with the new optional fields
- [x] 1.2 Add `REL_FLOW_RE` (`flow:"<flowId>":<step>`) and `REL_FLOWTITLE_RE`
      (`flowTitle:"<title>"`) to `packages/cli/src/parser/grammar.ts` and update
      `GRAMMAR_SUMMARY`; verify with a focused unit test that both regexes match the documented
      shape and reject a non-numeric step

## 2. Parsing

- [x] 2.1 In `packages/cli/src/parser/parseAnnotations.ts`, strip and capture `flow:`/
      `flowTitle:` from the relationship tag's `remainder` the same way `REL_TECH_RE`/
      `REL_KIND_RE` already are, attaching the parsed values to the relationship; verify via
      `packages/cli/test/parser.test.ts` that a relationship with `flow:"checkout":2
      flowTitle:"Checkout Flow"` parses with those fields set
- [x] 2.2 Verify a relationship with unrecognized leftover text (e.g. a malformed `flow:` value,
      or a second `flow:` param) still falls through to the existing malformed-tag path, via a
      new parser test asserting it appears in `parsed.malformed`
- [x] 2.3 Verify a relationship with no `flow:` param parses identically to today (regression
      test: existing parser tests in `packages/cli/test/parser.test.ts` continue to pass
      unmodified)

## 3. Flow grouping and dynamic-view emission

- [x] 3.1 Create `packages/cli/src/model/flows.ts` exporting `buildFlows(validRelationships)`
      that groups relationships by `flow` id, sorts each group by `step` (tiebreak: `sourceFile`
      then `sourceLine`, with a warning on true duplicates), and resolves one title per flow
      (first `flowTitle` occurrence by scan order wins, fallback to flow id, warning on
      conflict); verify with unit tests covering ordering, tiebreaking, and title resolution
- [x] 3.2 Create `packages/cli/src/emit/flows.ts` exporting `emitFlows(flows)` that writes a
      `dynamic view <flowId> { title '<title>'; ... }` block per flow using `escapeSingleQuoted`
      for step labels (not `escapeDoubleQuoted`); verify with a unit test asserting the emitted
      block matches the worked "checkout" example from design.md, including correct quote
      escaping for a label containing an apostrophe
- [x] 3.3 Ensure `emitFlows` never emits a flow with zero steps (e.g. because every tagged
      relationship was filtered out upstream); verify with a unit test that an all-filtered flow
      produces no `dynamic view` block at all

## 4. Pipeline wiring and reporting

- [x] 4.1 In `packages/cli/src/commands/sync.ts`, call `buildFlows` and `emitFlows` after
      `resolveModel`, and write the result to `model/generated/flows.c4` alongside the existing
      two generated files; verify via `packages/cli/test/sync.integration.test.ts` that running
      `runSync` against a fixture with a tagged flow produces `model/generated/flows.c4`
- [x] 4.2 Add a `flows` section to `SyncReport` (`packages/cli/src/types.ts`) and populate it in
      `packages/cli/src/report/buildReport.ts` with each generated flow's id and step count;
      verify via an integration test asserting `report.flows` reflects the generated flow(s)

## 5. Documentation

- [x] 5.1 Update `packages/cli/docs/likec4-annotations.md`: document the `flow:`/`flowTitle:`
      params in the grammar section, add a worked dynamic-view example, and add a
      `model/generated/flows.c4` row to the generated-vs-hand-authored table; verify by reading
      the rendered doc for consistency with the actual emitter output from task 3.2

## 6. Demo validation

- [x] 6.1 Hand-edit `demo/examples/annotated/orders-service.ts` and
      `demo/examples/annotated/payments-service.ts` to tag the existing orders-service ->
      payments-service -> stripe-api and orders-service -> fulfillment-queue relationships as
      steps 1-3 of a `checkout` flow, per the worked example in design.md; verify the files still
      compile/typecheck as valid TypeScript
- [x] 6.2 Run `likec4-agent sync` against `demo/` and inspect `demo/model/generated/flows.c4`
      matches the expected 3-step `checkout` dynamic view
- [x] 6.3 Run `likec4 validate` against `demo/` and confirm it passes with the new dynamic view
      present (end-to-end proof that the emitted syntax is valid LikeC4)
