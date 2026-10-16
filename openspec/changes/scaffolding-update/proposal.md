# Proposal

## Why

Today there is no scaffolding step: a repo adopting `likec4-agent` must hand-author
`model/specification.c4`, `model/views/**`, and `model/manual/**` before `sync`
produces anything useful, and the CLI exposes two separate flags (`--cwd`,
`--model-dir`) for locating those files with no fixed, predictable location. A
single `init` command that scaffolds a fixed, well-known directory removes that
manual setup step for new projects and gives every command one clear,
root-relative place to look.

## What Changes

- Add a new `likec4-agent init` command that scaffolds a fresh `c4-agent/`
  directory at the project root. It is greenfield-only: if `c4-agent/` already
  exists, `init` errors out (non-zero exit) without writing anything, the same
  way `git init`/`npm init` refuse to clobber existing state.
- `init` creates three starter files:
  - `c4-agent/specification.c4` — a basic set of element kinds
    (`person`, `softwareSystem`, `container`, `component`), an `async`
    relationship kind, and an `external` tag, matching the shape already
    proven out in `demo/model/specification.c4`.
  - `c4-agent/views/landscape.c4` — a starter `landscape` view (`include *`).
  - `c4-agent/manual/external-systems.c4` — an empty `model { }` block with
    comments instructing the user how to hand-declare external systems (and,
    since no separate `manual/relationships.c4` is scaffolded, cross-cutting
    relationships belong here too).
- **BREAKING**: Replace `sync`'s existing `--cwd` and `--model-dir` flags with
  a single `--root-dir` flag, defaulting to `process.cwd()`. The model
  directory is no longer an independently relocatable path — it is always
  `<root-dir>/c4-agent`.
- `init` accepts the same `--root-dir` flag (same default), so both commands
  agree on where the project root is.
- Update `demo/` to the new `c4-agent/` layout, and update this repo's docs
  (`README.md`, `docs/usage.md`, `docs/cli-reference.md`,
  `docs/architecture.md`, `packages/cli/docs/likec4-annotations.md`, both
  Claude Code plugin skills) to reference `c4-agent/` and `--root-dir` instead
  of `model/`, `--cwd`, and `--model-dir`.
- Out of scope: migrating existing `model/`-based projects. `init` only
  creates a new project layout; there is no automated conversion of an
  existing `model/` directory to `c4-agent/`.

## Capabilities

### New Capabilities
- `project-init`: the `likec4-agent init` command — scaffolds a fresh
  `c4-agent/` directory with starter `specification.c4`, `views/landscape.c4`,
  and `manual/external-systems.c4` files, refusing to run if the target
  directory already exists.
- `cli-root-directory`: the `--root-dir` flag shared by `init` and `sync`,
  and the fixed `<root-dir>/c4-agent` location convention that replaces the
  previous independently-configurable `--cwd`/`--model-dir` pair.

### Modified Capabilities
(none — `dataflow-views` is unaffected by this change)

## Impact

- `packages/cli/src/index.ts` — register the new `init` command; update
  `sync`'s flag definitions.
- `packages/cli/src/config.ts` — flag resolution (`--root-dir` replaces
  `--cwd`/`--model-dir`).
- `packages/cli/src/types.ts` — `SyncOptions` shape change.
- `packages/cli/src/commands/sync.ts` — derive the model directory from
  `rootDir` + `c4-agent` instead of a standalone `modelDir` option.
- New `packages/cli/src/commands/init.ts` and the starter file templates it
  writes.
- `demo/` — migrate from `model/` to `c4-agent/` so the demo keeps working as
  this repo's end-to-end smoke test under the new defaults.
- Docs: `README.md`, `docs/usage.md`, `docs/cli-reference.md`,
  `docs/architecture.md`, `packages/cli/docs/likec4-annotations.md`,
  `packages/claude-plugin/skills/likec4-sync/SKILL.md`,
  `packages/claude-plugin/skills/likec4-annotate/SKILL.md`.
- Coordination note: the in-flight `support-nested-components` change's delta
  spec text references `model/manual/**` literally. This change does not edit
  that change's artifacts; the reference will need reconciling with whichever
  of the two changes lands second.
