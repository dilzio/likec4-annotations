---
name: likec4-annotate
description: Interactively scan a codebase with no (or partial) @likec4 annotations and propose/write @likec4, @likec4-rel, and flow tags, with staged human checkpoints and a resumable progress manifest. Use when the user wants to bootstrap a LikeC4 model from an unannotated codebase, or says "likec4 annotate" or "annotate this codebase".
allowed-tools: Read, Write, Edit, Grep, Glob
license: MIT
metadata:
  version: "1.0"
---

Propose and write `@likec4`/`@likec4-rel`/`flow:`/`flowTitle:` tags into a
previously unannotated (or partially annotated) codebase, through a staged
workflow with an explicit human checkpoint before each write. **This skill
never runs `likec4-agent sync` and never edits
`c4-agent/generated/**`** — its job ends once tags are written into
source and reported; running sync to turn those tags into DSL is a separate,
explicit step the user takes afterward (directly, or via `/likec4-sync`).

Tags you write must conform exactly to the grammar in
`node_modules/likec4-agent/docs/likec4-annotations.md` (or, inside this
monorepo during development, `packages/cli/docs/likec4-annotations.md`) —
read it before proposing any tag if you have not already.

## Progress manifest

All state for a run lives in a single JSON file at
`c4-agent/.annotate/progress.json`, next to the model it is building.
This path is structurally excluded from `likec4-agent sync`'s own discovery
scan (same mechanism that excludes the whole model directory), so it can
never be mistaken for annotated source.

Schema (`schemaVersion: 1`):

```json
{
  "schemaVersion": 1,
  "taxonomy": {
    "approved": true,
    "kinds": ["softwareSystem", "container", "component"]
  },
  "chunks": [
    {
      "id": "packages/cli",
      "status": "pending",
      "assignedIds": []
    }
  ],
  "deferredRelationships": [
    {
      "sourceChunkId": "packages/cli",
      "sourceFile": "src/orders.ts",
      "sourceElementId": "orders-service",
      "label": "charges the customer's card",
      "technology": "REST/HTTPS",
      "kind": null,
      "confidence": "grounded",
      "targetHint": "payments client imported as '../payments/client'"
    }
  ],
  "flows": {
    "status": "pending"
  }
}
```

- `taxonomy.approved`: `false` until the user approves/edits the Stage 1
  proposal; `taxonomy.kinds` is the full set of element/relationship kinds
  the run may use (existing + newly approved).
- `chunks[].status`: one of `"pending"`, `"proposed"` (presented, not yet
  approved), `"done"` (tags written).
- `chunks[].assignedIds`: every element id assigned while tagging that
  chunk, in assignment order — the source of truth for id stability.
- `deferredRelationships[]`: relationships whose source chunk is already
  `"done"` but whose target wasn't yet assigned anywhere when that chunk was
  approved (see Stage 2 step 2's forward-reference handling). Each entry
  carries everything needed to write the `@likec4-rel` line later
  (`sourceFile`/`sourceElementId` to know where it attaches, `label`/
  `technology`/`kind`/`confidence` to know what to write) plus a
  `targetHint` describing what the target is believed to be, for matching
  against elements proposed in later chunks. Removed once resolved (written)
  or explicitly dropped.
- `flows.status`: `"pending"` until every chunk is `"done"`, then
  `"proposed"`, then `"done"` once approved flows are written.

## Stage 0 — Scan and chunk plan

1. Determine the target codebase root (the current working directory unless
   the user names another) and the model directory, which is always
   `<root>/c4-agent` — not independently configurable. If it doesn't exist
   yet, tell the user to run `likec4-agent init` first.

2. Scan for source files using the same default exclusions as
   `findAnnotatedFiles.ts` in the CLI: exclude `node_modules/**`, `.git/**`,
   `dist/**`, `coverage/**`, binary/lock assets (images, archives, fonts,
   media, `*.lock`), anything matched by the repo's `.gitignore`, and —
   same as `findAnnotatedFiles.ts` always excluding the whole model
   directory from its own scan — the entire model directory itself
   (`c4-agent/**`). The model directory's `.c4` files are read as input in
   Stage 1/2 (specification, manual, views), never chunked or tagged as
   source. Every file not excluded by one of these rules must be accounted
   for somewhere in the chunk plan — the plan is incomplete if any in-scope
   file is left out.

3. Build an ordered chunk plan: one chunk per directory containing a
   package/service manifest (`package.json`, `pyproject.toml`, `go.mod`, or
   equivalent) that has no other such manifest beneath it — i.e. the most
   deeply nested manifests, so each workspace/package in a monorepo is its
   own chunk rather than being swallowed by a root manifest that merely
   declares workspaces over them. Any in-scope file not under one of those
   chunk directories (including stray files next to a root-only manifest
   that owns no nested packages) falls into one additional chunk per
   top-level directory it lives in. If no manifest exists anywhere in the
   repo, fall back to one chunk per top-level directory. Order chunks
   deterministically (e.g. lexicographic by path) so reruns and resumes see
   the same plan.

4. Present the chunk plan to the user (chunk id = its root path, file count,
   a few representative file paths) and let them merge/split/reorder chunks
   before proceeding — the plan isn't final until the user accepts it.

5. Check for an existing `c4-agent/.annotate/progress.json`:
   - **Absent**: start fresh — write a new manifest with the accepted chunk
     plan (`chunks[].status: "pending"`, empty `assignedIds`), empty
     taxonomy (`approved: false`), and `flows.status: "pending"`.
   - **Present and `schemaVersion` matches (`1`)**: resume. Load its
     taxonomy and chunk statuses/assigned ids verbatim; reconcile against
     the freshly scanned chunk plan (new chunks not in the manifest are
     appended as `"pending"`; chunks already `"done"` or `"proposed"` are
     not re-planned). Skip straight to the first `"pending"` chunk (or
     Stage 1 if the taxonomy isn't approved yet; or the deferred-relationship
     sweep, Stage 2 step 5, if every chunk is `"done"` but
     `deferredRelationships[]` isn't empty; or Stage 3 if every chunk is
     `"done"` and `deferredRelationships[]` is empty but flows aren't).
   - **Present but malformed JSON, or `schemaVersion` doesn't match**: tell
     the user the existing manifest can't be resumed and why, then start
     fresh as above (do not fail/abort the run over a bad manifest).

## Stage 1 — Specification taxonomy checkpoint

**Nothing in Stage 2 or Stage 3 may run until this stage's taxonomy is
approved**, and the approved taxonomy must be recorded in the manifest
before any later checkpoint.

1. Read the target's existing `c4-agent/specification.c4` if present
   (via Read) to find every already-declared element and relationship kind.

2. Skim the chunk plan's files well enough to propose a taxonomy: for each
   kind of architectural unit you expect to tag (service, library,
   datastore, queue, external system, etc.) map it to an existing declared
   kind wherever one already fits. Only propose a *new* kind for something
   no existing declared kind can honestly represent — never redeclare or
   duplicate a kind that's already there.

3. Present the proposal as a diff against what already exists: "reusing
   `container`, `component`"; "proposing new kind `datastore`" (with a one-
   line rationale each). Explicitly ask the user to approve or edit it.

4. On edits, incorporate them and re-present until approved — do not
   proceed on an implicit or partial approval.

5. Once approved, write `taxonomy.approved: true` and the final
   `taxonomy.kinds` list into the manifest before presenting any chunk
   proposal (Stage 2 step 1 depends on this being saved first).

## Stage 2 — Per-chunk element and relationship tagging

Process chunks in the manifest's order, skipping any already `"done"`.

1. **Propose elements.** For each architecturally meaningful unit in the
   chunk (reuse the chunk's already-skimmed structure from Stage 0/1 as a
   starting point, then go deeper per-file as needed), propose an
   `@likec4 <kind> <id> ["<title>"] [technology:"<tech>"]` tag:
   - `<kind>` must already be in the manifest's approved `taxonomy.kinds` —
     never a kind outside that set.
   - `<id>` must be a new, stable identifier the first time it's assigned.
     If the unit corresponds to an element already assigned an id in an
     earlier chunk (per that chunk's `assignedIds` in the manifest), reuse
     that exact id instead of assigning a new one — ids are **never**
     reassigned or renamed once recorded.

2. **Propose relationships.** For each outgoing relationship from an
   element proposed in step 1, propose an
   `@likec4-rel <targetId> "<label>" [technology:"<tech>"] [kind:<relKind>]`
   tag, grounded in something Read/Grep-visible in this chunk's files: an
   import/require/from statement, a direct call-site reference, or a
   configured client/SDK usage naming the target. Do not propose a
   relationship from naming/prose intuition alone.
   - If you cannot find such corroboration for a relationship you still
     believe is architecturally real, propose it anyway but mark it
     inline in the review as low-confidence, e.g. `(inferred from naming
     only, no import found)`. **This marker is presentation-only** — never
     write it into the `@likec4-rel` tag itself.
   - A relationship's target id must already be knowable when this chunk
     is approved: an id assigned in this chunk, an id assigned in an
     earlier `"done"` chunk (reuse exactly, per the id-stability rule
     above), or an id that will only ever exist by hand in
     `c4-agent/manual/**` (e.g. an external system) — this skill does not
     require the target element to be tagged yet, only its id to be
     settled.
   - **Forward reference (target lives in a chunk not yet processed):**
     do not guess or pre-assign an id for it, and do not write this
     relationship into this chunk's files now. Instead, record it in the
     manifest's `deferredRelationships[]` (source file/element, label,
     technology, kind, confidence, and a `targetHint` describing what you
     believe the target to be) and mention it in this chunk's review as
     "deferred — target not yet tagged." It is resolved later, per step 3a
     below, once its target chunk is processed — never written as part of
     *this* chunk's approval.

3. **Present the chunk for review**: every proposed element and
   relationship tag, grouped by source file, with low-confidence
   relationships visibly flagged, plus any newly identified deferred
   relationships for this chunk. Ask for explicit approval.
   - **On approval**: write the proposed (non-deferred) tags into that
     chunk's source files only (via Edit, inserting into the nearest
     existing doc comment per the grammar, or a new doc comment immediately
     above the relevant code if none exists) — do not touch any other
     chunk's files, and write the tag lines exactly as grammar-valid
     `@likec4`/`@likec4-rel` lines with no confidence marker or other
     review-only annotation appended to them, even for a relationship that
     was flagged low-confidence in review. Then immediately update the
     manifest: append every newly assigned id to this chunk's
     `assignedIds`, append any newly identified forward references to
     `deferredRelationships[]`, and set this chunk's `status` to `"done"`.
   - **On requested changes**: revise the proposal per the feedback and
     re-present the same chunk; do not write any file for this chunk until
     a revision is explicitly approved. Mark the chunk `"proposed"` (not
     `"done"`) in the manifest while this loop is in progress, so a crash
     or pause mid-review resumes back into review, not past it.
   - Before presenting anything, re-confirm this chunk's `status` isn't
     already `"done"` from a prior session — if it is, skip it.

   **3a. Resolve deferred relationships targeting this chunk.** Immediately
   after this chunk's own elements are assigned (whether or not this chunk
   had any deferred relationships of its own), check
   `deferredRelationships[]` for entries whose `targetHint` matches an
   element just assigned here. For each match, propose the resolved
   `@likec4-rel` line (now with a real `<targetId>`) as part of *this*
   chunk's review, but note it will be written into its original
   `sourceFile` (an earlier, already-`"done"` chunk), not this chunk's
   files. On approval, write it there via Edit and remove the entry from
   `deferredRelationships[]`; on requested changes, revise and re-present
   before writing, same as any other proposal.

4. Move to the next `"pending"` chunk and repeat. Stage 2 is complete once
   every chunk in the manifest is `"done"`.

5. **Sweep remaining deferred relationships.** Once every chunk is `"done"`,
   any entries still left in `deferredRelationships[]` never matched an
   element anywhere in the plan. Present each to the user directly and ask
   how to resolve it: supply the real target id (e.g. it's actually meant
   to live in `c4-agent/manual/**`), or drop it. Write the resolved line (per
   step 3a) or remove the entry accordingly — `deferredRelationships[]`
   must be empty before Stage 3 begins.

## Stage 3 — Flow inference

**Do not begin this stage until every chunk's `status` is `"done"` and
`deferredRelationships[]` is empty** — flows may legitimately span
relationships written in different chunks, so inferring them early, or
before every forward reference is resolved, would miss or misorder steps.

1. Re-read every chunk's written `@likec4-rel` tags (the complete,
   already-approved relationship set — not just one chunk's) and look for
   plausible end-to-end flows: chains of relationships that plausibly
   represent one user- or system-triggered sequence, regardless of how many
   chunks/files their steps live in.

2. For each plausible flow, propose a `flowId`, an ordered list of steps
   (each an existing written relationship, by source `file:line` and its
   `targetId`), and a `flowTitle` guess. Present all proposed flows
   together for review before writing any of them.

3. Let the user prune (drop) or rename any proposed flow, and incorporate
   changes before finalizing.

4. For each **approved** flow only, write `flow:"<flowId>":<step>` (and
   `flowTitle:"<title>"` on exactly one step, per the grammar) onto each
   step's existing `@likec4-rel` line via Edit — do not add new
   relationships at this stage, only annotate ones already written in
   Stage 2. A pruned flow gets no tag written anywhere.

5. Once every approved flow is written, set `flows.status: "done"` in the
   manifest.

## Guardrails

- Never write to any file outside the chunk currently being approved in
  Stage 2, or outside the steps of a flow currently being approved in
  Stage 3 — one approval authorizes exactly the writes just presented for
  it, nothing ahead of it.
- Never write to `c4-agent/generated/**` — that directory is owned
  exclusively by `likec4-agent sync`.
- Never invoke `likec4-agent sync` (or any `npx likec4-agent` command) from
  this skill — handing off to sync is a separate, explicit step the user
  takes themselves once annotation is done.
- Never write a taxonomy change, element/relationship tag, flow tag, or
  manifest update to disk without the explicit approval described in the
  stage it belongs to.
- Never commit.
- Recommend the user run against a clean working tree (or a dedicated
  branch) before starting, so the resulting diff is easy to review — this
  skill does not stash or branch on its own behalf.
