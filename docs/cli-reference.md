# CLI reference

Deterministic CLI that syncs a [LikeC4](https://likec4.dev) architecture
model from `@likec4` / `@likec4-rel` code annotations. See
[`docs/annotations.md`](annotations.md) for the full tag grammar (bundled
with this CLI, not a per-repo editable file).

## Installing the CLI

Install it from npm:

```bash
npm install likec4-agent
```

or run it without installing, via `npx`:

```bash
npx likec4-agent --version
```

See the root [`README.md`](../README.md) Quickstart for the full install +
first-run walkthrough.

Want to install the CLI from an exact, unreleased commit instead of the
latest npm release? See
[`docs/development.md`](development.md#testing-an-unreleased-commit).

## Usage

### `likec4-agent init`

```bash
npx likec4-agent init
```

Scaffolds a fresh `c4-agent/` directory under `--root-dir` (default: current
directory), containing a starter `specification.c4`, `views/landscape.c4`,
and `manual/external-systems.c4`. Greenfield-only: if `c4-agent/` already
exists, `init` exits non-zero without writing anything, the same way
`git init`/`npm init` refuse to clobber existing state.

#### Flags

| Flag | Default | Purpose |
|---|---|---|
| `--root-dir <path>` | `process.cwd()` | Root of the target repo; scaffolds `<root-dir>/c4-agent` |

#### Exit codes

- `0` — `c4-agent/` was created
- non-zero — `c4-agent/` already exists; nothing was written

### `likec4-agent sync`

```bash
npx likec4-agent sync
```

Discovers every `@likec4`/`@likec4-rel` tag under `--root-dir` (default:
current directory), regenerates `c4-agent/generated/elements.c4` and
`c4-agent/generated/relationships.c4`, runs `likec4 validate`, and prints
a summary. Never writes outside `c4-agent/generated/`, never commits.

#### Flags

| Flag | Default | Purpose |
|---|---|---|
| `--root-dir <path>` | `process.cwd()` | Root of the target repo; the model directory is always `<root-dir>/c4-agent` |
| `--format <json\|text>` | `text` | `text` prints a human report; `json` prints a single `SyncReport` object on stdout (progress goes to stderr) |
| `--include <glob>` | — | Restrict the scan (repeatable) |
| `--exclude <glob>` | — | Exclude from the scan (repeatable) |
| `--no-validate` | — | Skip the `likec4 validate` step |

#### Exit codes

- `0` — sync ran and `likec4 validate` passed (or `--no-validate` was set)
- `1` — files were written but `likec4 validate` failed (files are left as
  written, not rolled back)
- `2` — the pipeline couldn't complete (bad `--root-dir`, internal error)
