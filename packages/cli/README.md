# likec4-agent

Deterministic CLI that syncs a [LikeC4](https://likec4.dev) architecture
model from `@likec4` / `@likec4-rel` code annotations. See
[`docs/likec4-annotations.md`](docs/likec4-annotations.md) for the full tag
grammar (bundled with this CLI, not a per-repo editable file).

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
