# Architecture

## Pipeline

```
  /likec4-sync                npx likec4-agent sync
  (Claude Code plugin)        (direct CLI)
         \                           /
          v                         v
        +-----------------------------------+
        |     likec4-agent sync pipeline     |
        |  discover -> parse -> resolve ->   |
        |              emit                  |
        +-----------------------------------+
             |                        |
             | reads                  | writes (only)
             v                        v
  +--------------------+   +--------------------------+
  | annotated source    |   | model/generated/*.c4      |
  | @likec4 tags,        |   | elements.c4               |
  | any language         |   | relationships.c4          |
  +--------------------+   +--------------------------+
             ^                        |
             | also reads             v
  +--------------------------+   likec4 validate
  | hand-authored, read-only |        |
  | specification.c4         |        v
  | manual/**, views/**      |   likec4 start / build
  +--------------------------+   (dev server / static site)
```

**Key design decision — the write boundary.** The CLI is only ever allowed
to write inside `<model-dir>/generated/`. It reads `model/manual/`,
`model/views/`, and `model/specification.c4` to resolve relationship targets
and check declared kinds, but never modifies them. This is what makes it
safe to re-run: there's no marker-comment parsing or diffing against prior
output to get wrong, because hand-authored files are categorically outside
the generator's reach.

**Why dangling relationships are dropped, not just warned about.** LikeC4's
own validator rejects a relationship whose target id isn't declared anywhere
in the model — it's a hard error, not a lint warning. So when an
`@likec4-rel` points at an id nothing declares yet, the CLI omits that one
line from the generated output (and says so in its report) rather than
emitting DSL that would fail `likec4 validate` on every single run. The same
applies to an undeclared element/relationship `kind`.

## Monorepo layout

```
like-c4-agent/
  packages/
    cli/               likec4-agent — the CLI, distributed via git (not published to npm)
    claude-plugin/      Claude Code plugin wrapping the CLI
  demo/                 Worked example consuming the CLI, not published
  .claude-plugin/
    marketplace.json     This repo as its own Claude Code plugin source
```

| Path | Purpose |
|---|---|
| `packages/cli` | The `likec4-agent` CLI. See [`docs/cli-reference.md`](cli-reference.md) for flags and the I/O contract. |
| `packages/cli/docs/likec4-annotations.md` | The tag grammar spec — bundled with the CLI, fixed by version. |
| `packages/claude-plugin` | The `/likec4-sync` Claude Code command + skill — a thin wrapper with no independent parsing/resolution judgment. See [`docs/claude-plugin.md`](claude-plugin.md) for install instructions. |
| `demo/` | A worked example with its own `model/specification.c4`, annotated source, and `package.json` depending on `likec4-agent` — proves the pipeline end to end and doubles as this repo's smoke test. |
| `.claude-plugin/marketplace.json` | Lets this repo be added as a Claude Code plugin source. |
