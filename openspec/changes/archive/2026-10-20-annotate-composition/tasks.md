# Tasks

## 1. Progress manifest schema

- [x] 1.1 Add `compositionPass.status` (`"pending"` | `"proposed"` | `"done"`) to the progress manifest schema documented in `SKILL.md`'s "Progress manifest" section, defaulting to `"pending"` when absent (so a manifest written before this change resumes correctly), and verify the updated schema block and its field-by-field description are consistent with the new Stage 2.5 instructions written in task 3

## 2. Stage 1 — taxonomy default

- [x] 2.1 Update Stage 1 step 2 so the proposed taxonomy omits `softwareSystem` by default, and add a sub-step that checks `c4-agent/manual/**` for an existing `softwareSystem` element before presenting the proposal, including it only when one is found; verify by re-reading the updated Stage 1 section against `specs/llm-annotator/spec.md`'s "Specification Taxonomy Checkpoint" scenarios (no existing system -> omitted; existing system -> included)

## 3. Stage 2 — granularity default

- [x] 3.1 Update Stage 2 step 1 ("Propose elements") to state the one-element-per-chunk default and the grounded-relationship-evidence bar for splitting a sub-part into its own element, reusing the same grep/import evidence standard Stage 2 step 2 already requires for relationships; verify against `specs/llm-annotator/spec.md`'s "Element Granularity Default" scenarios

## 4. New Stage 2.5 — composition pass

- [x] 4.1 Write the new "Stage 2.5 — Composition pass" section in `SKILL.md`, placed after Stage 2's deferred-relationship sweep (step 5) and before Stage 3, stating its precondition (every chunk `"done"`, `deferredRelationships[]` empty - same precondition Stage 3 already states) and that it runs exactly once per run
- [x] 4.2 Write the composition test instructions (peer / nest / fold-back, per `specs/llm-annotator/spec.md`'s "Composition Pass" requirement), the one-level nesting depth default with its same-test-recursion exception, and the stronger grep-grounded evidence bar for cross-chunk `parent:` candidates
- [x] 4.3 Write the composition-pass checkpoint: present every proposed `parent:` edge (and every proposed fold-back) together in one review, write `parent:<id>` into the approved elements' tags via Edit on approval, and remove a fold-back's element/tag entirely on approval of that proposal; explicitly state this checkpoint's authority to modify an already-`"done"` chunk's file for exactly the edits it presents, as a stated exception to the "never write outside the chunk currently being approved" guardrail
- [x] 4.4 Update the manifest-write step to set `compositionPass.status` through `"pending"` -> `"proposed"` -> `"done"`, matching the chunk/flow status lifecycle already used elsewhere in the manifest
- [x] 4.5 Update Stage 0 step 5's resume logic so a manifest with every chunk `"done"`, `deferredRelationships[]` empty, and `compositionPass.status` not `"done"` resumes directly into Stage 2.5 (mirroring the existing resume branch for Stage 3); verify by re-reading the updated resume logic against `specs/llm-annotator/spec.md`'s "Resuming after chunks are done but composition pass is pending" scenario
- [x] 4.6 Update the "Guardrails" section to list the Stage 2.5 write exception alongside the existing chunk/flow write-scope guardrail, and verify the whole file still reads as one coherent set of guardrails with no contradiction between sections

## 5. Library and dependency handling

- [x] 5.1 Update Stage 2 step 2 ("Propose relationships") with the third-party-vs-first-party handling from `specs/llm-annotator/spec.md`'s "Library and Dependency Handling" requirement: no element/relationship for a generic third-party dependency with no external counterpart, and a relationship to the external service's id (never the SDK) for a third-party client/SDK; verify against that requirement's four scenarios

## 6. Command file check

- [x] 6.1 Confirm `packages/claude-plugin/commands/likec4-annotate.md` needs no changes (it only points to `SKILL.md` and names no stages) - no edit required, just verify this by reading the file

## 7. End-to-end verification

- [x] 7.1 Walked through Stage 0-2.5 by hand (per the updated `SKILL.md`) against a scratch fixture seeded from `demo/examples/annotated`'s four files with annotations stripped, plus a shared `retry-utils.ts` (multi-consumer first-party module) and a `lodash` import (generic third-party utility) added to exercise paths the original four files don't reach. Confirmed: (a) `c4-agent/manual/**` in the fixture has the same `#external` `stripe-api`/`fulfillment-queue` systems as the real demo, and Stage 1 correctly omitted `softwareSystem` from the taxonomy (per the `#external`-exclusion fix below); (b) Stage 2 produced one element per chunk by default, splitting out only sub-parts with their own grounded relationships; (c) Stage 2.5's three-way test (peer/nest/fold-back) all fired correctly on this fixture. **Found and fixed two real bugs in the composition test via this verification** (see design.md's "Decisions" section and the two added spec scenarios under "Composition Pass"): (1) `c4-agent/manual/**`'s pre-existing `#external` softwareSystem declarations (used for modeling third-party dependencies) were incorrectly counting as the "multi-system" signal in Stage 1 - fixed by excluding `#external` declarations from that check; (2) the original nest rule (`parent:A` for X's sole referencer A) produced a structurally invalid model whenever A's relationship to X was a direct `@likec4-rel` - which is always the case, since that's what makes X exclusive to A in the first place. Fixed by having the composition pass drop that now-redundant relationship line alongside adding `parent:A`, rather than falling back to peer (which would have made nesting unreachable).
- [x] 7.2 Built `packages/cli` locally (`npm install` + `npm run build`), ran `likec4-agent sync --root-dir <fixture>` and `likec4 validate <fixture>` against the hand-walked fixture from 7.1. First pass failed validation ("Invalid parent-child relationship") - this is what surfaced bug (2) above. After the fix, `sync` produced a well-formed `extend orders-service { payments-service = container ... }` block with `orders-service.payments-service -> stripe-api` / `-> retry-utils` as fully-qualified relationship paths, and `likec4 validate` passed clean (`✓ Valid (6 files)`).
- [x] 7.3 Confirmed on the same fixture: `retry-utils` (first-party, called by both `orders-service` and `payments-service`) ended up a peer element with no `parent:`, related to each consumer via its own `@likec4-rel`. `lodash`'s `round` import (generic third-party utility, no external counterpart) produced no element and no relationship in the generated output - confirmed via the `sync` summary (`Undeclared kinds (omitted): none`, `Dangling relationship targets (omitted): none`, and no `lodash`/`round` mention anywhere in `elements.c4`/`relationships.c4`).
