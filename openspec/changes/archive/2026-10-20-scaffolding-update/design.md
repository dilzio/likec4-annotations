# Design

## Context

Today `packages/cli/src/types.ts`'s `SyncOptions` carries `cwd` and `modelDir`
as two independently-resolved fields. `config.ts`'s `resolveSyncOptions`
defaults `modelDir` to `<cwd>/model`, and `commands/sync.ts` derives
`specificationPath`, `manualDir`, and `generatedDir` from `opts.modelDir`.
`discovery/findAnnotatedFiles.ts` separately needs both `opts.cwd` and
`opts.modelDir` to compute the glob that excludes the model directory from
the annotation scan. There is no `init` command today — see proposal.md for
why that's a gap worth closing, and the `project-init` /
`cli-root-directory` specs for the exact behavior being added.

## Goals / Non-Goals

**Goals:**
- Add an `init` command whose own implementation pattern mirrors the
  existing `sync` command (a `runX(opts)` function in `commands/`, thin
  commander wiring in `index.ts`).
- Consolidate `--cwd`/`--model-dir` into a single `--root-dir` with minimal
  disruption to the internal pipeline code that already consumes a
  `modelDir`-shaped value (`sync.ts`, `findAnnotatedFiles.ts`,
  `buildReport.ts`).

**Non-Goals:**
- No automated conversion of an existing `model/` directory to `c4-agent/`
  (greenfield only, per proposal).
- No interactive prompts or project-specific customization of scaffolded
  content — the three starter files are static templates, consistent with
  this CLI's deterministic, non-AI-driven design.
- No change to annotation grammar, resolution, or `dataflow-views` behavior.

## Decisions

**`SyncOptions`/`InitOptions` carry `rootDir`, with `modelDir` derived, not
configurable.** `resolveSyncOptions` resolves `rootDir = resolve(flags.rootDir
?? process.cwd())` and computes `modelDir = \`${rootDir}/c4-agent\`` once,
internally — `sync.ts` keeps building `specificationPath`/`manualDir`/
`generatedDir` off `opts.modelDir` exactly as it does today, since that field
still exists on the resolved options object, it's just no longer populated
from an independent flag. This keeps the diff to `config.ts`, `types.ts`, and
`index.ts`'s flag definitions, rather than touching every downstream
consumer of `modelDir`.
  - *Alternative considered*: keep a standalone `--model-dir` flag and just
    change its default. Rejected — the proposal's decision is that
    `c4-agent` is a fixed convention, not a relocatable path, and keeping an
    override flag would contradict that.

**`init` is a new sibling command module.** `packages/cli/src/commands/init.ts`
exports `runInit(opts: { rootDir: string })`, following the same shape as
`runSync`. `index.ts` registers an `init` command with a `--root-dir <path>`
option (default `process.cwd()`), resolved through a small
`resolveInitOptions` helper in `config.ts` alongside `resolveSyncOptions` —
`init` doesn't need `include`/`exclude`/`format`/`validate`, so it gets its
own narrower resolver rather than reusing `resolveSyncOptions`.

**Existence check is directory-level, not file-level.** `init` checks
`existsSync(join(rootDir, "c4-agent"))` once and, if true, exits non-zero
with an error before writing anything — it does not inspect individual files
inside an existing `c4-agent/`. This matches `git init`/`npm init`'s refusal
behavior and keeps the check simple and exactly aligned with the
`project-init` spec's wording ("if `c4-agent/` already exists").

**Scaffolded content is static, embedded template strings.** The three
starter files (`specification.c4`, `views/landscape.c4`,
`manual/external-systems.c4`) are fixed strings written via
`mkdirSync(..., { recursive: true })` + `writeFileSync`, mirroring
`sync.ts`'s existing file-writing style. Content matches what's specified in
`project-init`'s spec and proposal.md, not derived from `package.json` or
any other project metadata.

**Flags are removed, not deprecated.** `--cwd` and `--model-dir` are dropped
outright rather than kept as deprecated aliases. This repo distributes only
via git (no published registry version to preserve compatibility for, per
the root `README.md`), so there's no installed-base reason to carry forward
a transitional alias.

## Risks / Trade-offs

- **[Breaking change for anyone already scripting `--cwd`/`--model-dir`]** →
  Acceptable pre-1.0 for a git-distributed tool with no registry install
  base; called out as **BREAKING** in the proposal and documented in the
  CLI reference.
- **[`demo/` and docs drift out of sync with the new defaults if not updated
  together]** → `tasks.md` includes migrating `demo/` to the `c4-agent/`
  layout and updating every doc that references `model/`, `--cwd`, or
  `--model-dir`, verified by re-running `likec4-agent sync` and
  `likec4 validate` against the migrated demo.
- **[The in-flight `support-nested-components` change's delta spec text
  references `model/manual/**` literally]** → Not resolved here; flagged in
  proposal.md's Impact section for manual reconciliation whichever change
  lands second.

## Migration Plan

This is a new CLI feature, not a deployed service, so there's no
rollout/rollback in the traditional sense. The one migration inside this
repo is `demo/`: its existing `model/**` tree is manually restructured to
`c4-agent/**` (same file contents, new paths) as part of this change's
tasks, and `demo/package.json`'s `likec4:sync` script is re-verified against
the new `--root-dir`-based defaults. No conversion tooling is built for
external consumers' existing `model/` directories.
