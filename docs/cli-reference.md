# CLI reference

Deterministic CLI that syncs a [LikeC4](https://likec4.dev) architecture
model from `@likec4` / `@likec4-rel` code annotations. See
[`docs/annotations.md`](annotations.md) for the full tag grammar (bundled
with this CLI, not a per-repo editable file).

## Installing the CLI

Add it to your own project with pnpm's git-subdirectory syntax (this repo
distributes via git only — nothing is published to npm or any other
registry):

```bash
pnpm add github:dilzio/likec4-annotations#path:packages/cli
```

**First run fails on purpose — this is expected.** `packages/cli` needs to
run its `prepare` build script (there's no published registry tarball with
prebuilt output to install instead), and pnpm v10+ refuses to run any build
script for a git dependency until it's explicitly allow-listed. The command
above fails with `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED` and an error message
containing a ready-to-paste `allowBuilds` entry, keyed to the exact commit
pnpm resolved — something like:

```yaml
# pnpm-workspace.yaml
allowBuilds:
  likec4-agent@github.com/dilzio/likec4-annotations/<commit-sha>&path:packages/cli: true
```

Create (or add to) `pnpm-workspace.yaml` with that line, then re-run the
same `pnpm add` command — it now succeeds, because the resolved spec is on
the allowlist.

**This entry is pinned to a commit, not a version.** When this repo's
`main` moves forward and you run `pnpm update likec4-agent`, pnpm resolves a
new commit hash and the old `allowBuilds` entry no longer matches — the
install fails again with the same error, now showing the new hash. Repeat
the same two-step dance (paste the new entry, re-run) each time you update.

See the root [`README.md`](../README.md) Quickstart for the full install +
first-run walkthrough.

## Usage

```bash
npx likec4-agent sync
```

Discovers every `@likec4`/`@likec4-rel` tag under `--cwd` (default: current
directory), regenerates `<model-dir>/generated/elements.c4` and
`<model-dir>/generated/relationships.c4`, runs `likec4 validate`, and prints
a summary. Never writes outside `<model-dir>/generated/`, never commits.

### Flags

| Flag | Default | Purpose |
|---|---|---|
| `--cwd <path>` | `process.cwd()` | Root of the target repo |
| `--model-dir <path>` | `<cwd>/model` | Where `specification.c4`, `manual/`, `generated/`, `views/` live |
| `--format <json\|text>` | `text` | `text` prints a human report; `json` prints a single `SyncReport` object on stdout (progress goes to stderr) |
| `--include <glob>` | — | Restrict the scan (repeatable) |
| `--exclude <glob>` | — | Exclude from the scan (repeatable) |
| `--no-validate` | — | Skip the `likec4 validate` step |

### Exit codes

- `0` — sync ran and `likec4 validate` passed (or `--no-validate` was set)
- `1` — files were written but `likec4 validate` failed (files are left as
  written, not rolled back)
- `2` — the pipeline couldn't complete (bad `--model-dir`, internal error)
