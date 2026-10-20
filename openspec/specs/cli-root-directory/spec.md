# cli-root-directory Specification

## Purpose

Establishes a single, shared `--root-dir` flag that both `init` and `sync`
use to resolve the project root and the fixed `c4-agent/` location beneath
it, replacing the prior independently-configurable `--cwd`/`--model-dir`
pair.

## Requirements

### Requirement: Single root-dir flag replaces cwd and model-dir
Both the `init` and `sync` commands SHALL accept a `--root-dir <path>` flag
and SHALL NOT accept `--cwd` or `--model-dir`.

#### Scenario: root-dir flag accepted
- **WHEN** `likec4-agent sync --root-dir <path>` or
  `likec4-agent init --root-dir <path>` is run
- **THEN** the command resolves its target repo root to `<path>`

#### Scenario: removed flags rejected
- **WHEN** `likec4-agent sync --cwd <path>` or
  `likec4-agent sync --model-dir <path>` is run
- **THEN** the command reports an unknown-option error rather than silently
  accepting the flag

### Requirement: root-dir defaults to the current working directory
When `--root-dir` is omitted, both commands SHALL resolve the root
directory to `process.cwd()`.

#### Scenario: Default root
- **WHEN** `likec4-agent sync` is run with no `--root-dir` flag
- **THEN** the command resolves its root directory to the current working
  directory

### Requirement: Model directory is fixed relative to root-dir
The model directory used by `sync` and scaffolded by `init` SHALL always be
`<root-dir>/c4-agent` and SHALL NOT be independently configurable.

#### Scenario: Model directory location
- **WHEN** `likec4-agent sync --root-dir /repo` is run
- **THEN** the command reads specification/manual/views from, and writes
  generated output to, paths under `/repo/c4-agent`
