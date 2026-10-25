# Tasks

## 1. Skill Scaffolding

- [x] 1.1 Create `packages/claude-plugin/skills/likec4-annotate/SKILL.md` with
      frontmatter (`name`, `description`, `allowed-tools`, `license`,
      `metadata.version`) matching the shape of
      `packages/claude-plugin/skills/likec4-sync/SKILL.md`, and verify
      `claude plugin validate packages/claude-plugin` passes
- [x] 1.2 Create `packages/claude-plugin/commands/likec4-annotate.md` that
      points at the new skill, matching
      `packages/claude-plugin/commands/likec4-sync.md`'s one-line pattern, and
      verify `claude plugin validate .` passes

## 2. Stage 0 - Scan and Chunk Plan

- [x] 2.1 Write the SKILL.md instructions for scanning the target codebase
      (reusing the same default exclusions as
      `packages/cli/src/discovery/findAnnotatedFiles.ts`:
      `node_modules`, `.git`, `dist`, `coverage`, binary assets, `.gitignore`
      entries) and producing an ordered chunk plan (one chunk per top-level
      package/service manifest, or per top-level directory if none), and
      verify by running the skill against `demo/` and confirming the
      presented chunk plan covers every source file under `demo/`
- [x] 2.2 Write instructions to check for an existing
      `<model-dir>/.annotate/progress.json`: if present and its
      `schemaVersion` matches, resume from the first incomplete chunk using
      its recorded taxonomy/assigned ids; if absent, malformed, or a
      schema-version mismatch, start a fresh scan instead of failing, and
      verify both branches manually (fresh run vs. resumed run against a
      hand-crafted manifest fixture)
- [x] 2.3 Define and document the manifest JSON schema (`schemaVersion`,
      `taxonomy`, `chunks[]`, `flows`) directly in SKILL.md per design.md's
      "Progress manifest" decision, and verify a sample manifest written
      during a test run matches the documented shape

## 3. Stage 1 - Specification Taxonomy Checkpoint

- [x] 3.1 Write instructions to read any existing `model/specification.c4`
      (via Read) and propose only the additional kinds needed, reusing every
      existing declared kind, and verify by running against `demo/model` (which
      already has a `specification.c4`) and confirming the proposal reuses its
      kinds rather than redeclaring them
- [x] 3.2 Write instructions that require explicit user approval (or edits) of
      the proposed taxonomy before any element/relationship proposal is made,
      and record the approved taxonomy into the progress manifest, and verify
      by confirming no chunk proposal is presented before approval in a manual
      run

## 4. Stage 2 - Per-Chunk Element and Relationship Tagging

- [x] 4.1 Write instructions to propose `@likec4` element tags per chunk,
      assigning each a stable id, and to persist newly assigned ids into the
      progress manifest immediately upon chunk approval, and verify ids
      assigned in one chunk are never reassigned when referenced from a later
      chunk (manual run across at least two chunks with a cross-chunk
      reference)
- [x] 4.2 Write instructions to propose `@likec4-rel` relationship tags,
      requiring grep/read-visible corroboration (import/require/from
      statement, direct call-site, or configured client usage) per
      design.md's grounding decision, marking any proposal lacking such
      corroboration inline in the review (not in the written tag) as
      low-confidence, and verify both a grounded and an ungrounded example
      are visibly distinguished in a manual run
- [x] 4.3 Write instructions requiring explicit per-chunk approval before
      writing anything, writing only that chunk's source files on approval,
      and supporting a revise-and-represent loop on requested changes, and
      verify (manual run) that an unapproved chunk leaves its files
      unmodified on disk
- [x] 4.4 Write instructions to update the progress manifest's chunk status
      to done immediately after a chunk's files are written, and verify by
      inspecting the manifest after a manual chunk approval

## 5. Stage 3 - Flow Inference

- [x] 5.1 Write instructions that only begin flow inference once every
      planned chunk's status is done in the progress manifest, scanning the
      complete written relationship set for plausible flow groupings
      (including those spanning multiple chunks/files), and verify with a
      manual fixture containing a flow whose two steps live in different
      chunks
- [x] 5.2 Write instructions to present proposed flows (with `flowTitle`
      guesses) for review, supporting pruning and renaming before any write,
      and to write `flow:`/`flowTitle:` tags only for approved flows, and
      verify a pruned flow produces no corresponding tag in any file

## 6. Guardrails and Grammar Conformance

- [x] 6.1 Write an explicit guardrails section in SKILL.md: never write
      outside the chunk/stage currently being approved, never touch
      `model/generated/**` directly, never auto-invoke `likec4-agent sync`,
      never commit - matching the tone of
      `packages/claude-plugin/skills/likec4-sync/SKILL.md`'s guardrails
- [x] 6.2 Verify end-to-end grammar conformance: run the annotator skill
      against a small unannotated fixture, then run
      `npx likec4-agent sync --format json` against the result and confirm
      it discovers and resolves the written tags with no malformed-tag
      warnings attributable to the annotator

## 7. Documentation

- [x] 7.1 Update the root `README.md` "Usage" section to mention the
      `likec4-annotate` skill as the entry point for a previously
      unannotated codebase, before the existing "1. Annotate your code" step,
      and verify the new section renders correctly and links resolve
- [x] 7.2 Update `packages/claude-plugin/README.md` to list the new skill
      alongside `likec4-sync`, and verify install instructions still match
      the actual files present in the package
