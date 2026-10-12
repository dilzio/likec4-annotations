# like-c4-agent

AI-annotation-driven [LikeC4](https://likec4.dev) architecture modeling.
Annotate your code with lightweight `@likec4` tags in existing doc comments,
and **`likec4-agent`** — a deterministic CLI, with a thin Claude Code plugin
wrapper — reads them to generate and keep a LikeC4 model (and its diagrams)
in sync with the real code. No build step or CI dependency required; run it
on demand from the command line or from Claude Code. The CLI is distributed
from this repo via git (not published to npm or any other registry).

## What it does

- **Annotation convention**: a minimal, comment-syntax-agnostic tag grammar
  (`@likec4`, `@likec4-rel`) that lives inside doc comments you'd write
  anyway — not a separate metadata file. Bundled with the CLI, fixed by
  version, not a per-repo editable file.
- **Deterministic sync**: the `likec4-agent` CLI discovers annotations,
  parses them, resolves ids/kinds, and regenerates the LikeC4 model —
  callable directly, or via the thin `/likec4-sync` Claude Code
  command/skill that just runs the CLI and relays its report.
- **Safe merging**: generated DSL lives in its own files that the CLI fully
  owns; anything you author by hand (external systems, views, styling) lives
  in separate files the CLI only ever reads, never writes.
- **Validation, not guesswork**: every sync run ends with `likec4 validate`,
  so a broken annotation (bad kind, unresolvable relationship target) is
  caught immediately rather than silently producing a bad diagram.

See [`docs/architecture.md`](docs/architecture.md) for the pipeline diagram
and design decisions behind it.

## Quickstart

Requires Node.js 20+ and [pnpm](https://pnpm.io).

```bash
pnpm add github:dilzio/likec4-annotations#path:packages/cli
```

This fails on the first run — that's expected. pnpm needs an
`allowBuilds` entry before it'll run the CLI's build step for a git
dependency; the error message tells you exactly what to paste into
`pnpm-workspace.yaml`. Full walkthrough:
[`docs/cli-reference.md`](docs/cli-reference.md#installing-the-cli).

Optionally, install the Claude Code plugin for `/likec4-sync` and
`/likec4-annotate`:

```
/plugin marketplace add https://github.com/dilzio/likec4-annotations
/plugin install likec4-agent@likec4-agent-marketplace
```

Then, in any repo with a `model/specification.c4`:

```bash
# annotate your code with @likec4 / @likec4-rel tags (or run /likec4-annotate
# in Claude Code to bootstrap tags on an unannotated codebase), then:
npx likec4-agent sync
npx likec4 start   # live-reloading dev server with interactive diagrams
```

## Learn more

- [`docs/usage.md`](docs/usage.md) — the full annotate → sync → view
  walkthrough.
- [`docs/cli-reference.md`](docs/cli-reference.md) — flags, exit codes,
  installing the CLI standalone.
- [`docs/claude-plugin.md`](docs/claude-plugin.md) — the Claude Code
  plugin's commands and install.
- [`docs/annotations.md`](docs/annotations.md) — the tag grammar.
- [`docs/architecture.md`](docs/architecture.md) — the sync pipeline and
  monorepo layout.
- [`docs/extending.md`](docs/extending.md) — new kinds, new languages, new
  agent adapters.

## Contributing

Working on this repo itself? See [`docs/development.md`](docs/development.md).
