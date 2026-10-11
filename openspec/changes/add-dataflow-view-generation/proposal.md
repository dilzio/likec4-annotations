# Proposal

## Why

The project's long-term goal is for a developer to point `likec4-agent` at a codebase and get
an accurate C4 model and views, including dataflow-style diagrams of how data moves through the
system. Today the CLI only ever emits static `elements.c4`/`relationships.c4` — it never
generates any view, and the `@likec4-rel` annotation grammar has no way to express that a
relationship is one step in a named, ordered flow. Meanwhile the upstream `likec4` package
(already a peer dependency) ships a mature `dynamic view` construct — ordered steps between
elements rendered as a sequence diagram — that nothing in this repo uses yet.

Before investing in the harder, fuzzier work of teaching an LLM to explore unfamiliar code and
author annotations (a separate, later effort), we need to prove the annotation grammar and
deterministic CLI pipeline can faithfully turn hand-authored, step-tagged relationships into a
valid, renderable LikeC4 dynamic view. This is a thin vertical slice that de-risks the grammar
design before the LLM-authoring work depends on it.

## What Changes

- Extend the `@likec4-rel` annotation with two new optional params: `flow:"<flowId>":<step>`
  (flow membership + order) and `flowTitle:"<title>"` (flow display title).
- Extend the parser (`packages/cli/src/parser/grammar.ts`,
  `packages/cli/src/parser/parseAnnotations.ts`) to recognize and attach these params to parsed
  relationships.
- Add a new model step that groups resolved relationships by flow id, orders them by step number,
  and resolves one title per flow.
- Add a new emitter that writes `model/generated/flows.c4`, containing one `dynamic view` block
  per flow, generated alongside the existing `elements.c4`/`relationships.c4`.
- Wire the new step into the `sync` command pipeline (`packages/cli/src/commands/sync.ts`).
- Extend `SyncReport` with a `flows` section (count, steps) for parity with the existing
  `elements`/`relationships` report sections.
- Document the new grammar and generated-file ownership in
  `packages/cli/docs/likec4-annotations.md`.
- Hand-annotate the existing demo chain (`orders-service` -> `payments-service` -> `stripe-api`,
  `orders-service` -> `fulfillment-queue`) as a worked "checkout" flow example, to validate the
  feature end-to-end against a real `likec4 validate` run.
- No breaking changes: `flow`/`flowTitle` are optional params on an existing tag, and the new
  generated file is additive. Annotations without them behave exactly as before.

## Capabilities

### New Capabilities
- `dataflow-views`: deterministic generation of LikeC4 `dynamic view` blocks from step-ordered
  `@likec4-rel` annotations — the grammar extension, parsing, flow grouping/ordering, and
  dynamic-view emission.

### Modified Capabilities
<!-- No existing capability specs are modified. This repo has no prior OpenSpec specs captured
     for the existing elements/relationships sync behavior, so there is nothing to amend. -->

## Impact

- **Code**: `packages/cli/src/types.ts`, `packages/cli/src/parser/grammar.ts`,
  `packages/cli/src/parser/parseAnnotations.ts`, `packages/cli/src/model/flows.ts` (new),
  `packages/cli/src/emit/flows.ts` (new), `packages/cli/src/commands/sync.ts`,
  `packages/cli/src/report/buildReport.ts`.
- **Docs**: `packages/cli/docs/likec4-annotations.md`.
- **Demo/fixtures**: `demo/examples/annotated/orders-service.ts`,
  `demo/examples/annotated/payments-service.ts`.
- **Tests**: `packages/cli/test/parser.test.ts`, `packages/cli/test/emit.test.ts`,
  `packages/cli/test/sync.integration.test.ts`.
- **Dependencies**: none new — `likec4` is already a peer dependency and already supports
  `dynamic view` syntax.
- **Out of scope**: the LLM code-exploration/annotation-authoring skill; a standalone
  `@likec4-flow` declaration tag; flow-id vs. hand-authored-view-id collision detection; any
  out-of-band/sidecar annotation mechanism.
