# like-c4-agent

AI-annotation-driven [LikeC4](https://likec4.dev) architecture modeling.
Annotate your code with lightweight `@likec4` tags in existing doc comments,
and **`likec4-agent`** — a deterministic CLI, with a thin Claude Code plugin
wrapper — reads them to generate and keep a LikeC4 model (and its diagrams)
in sync with the real code. No build step or CI dependency required; run it
on demand from the command line or from Claude Code.

This repo is the home of the tool itself (the CLI + the Claude plugin), not
a single consumer of it. `demo/` is a worked example, kept separate from
the published package.

## Functional scope

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
- **Agent-agnostic by design**: the CLI does the real work; a Claude Code
  plugin is the first adapter, but other coding agents can get their own
  thin wrapper over the same CLI.
- **Out of scope (v1)**: no git hook or CI trigger — sync is manual. No
  cross-file relationship attachment — a relationship's source is always the
  element declared in the same comment block. No automatic commits — you
  review the diff. No `likec4-agent init` yet for scaffolding brand-new
  consumer repos.

## Architecture

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
    cli/               likec4-agent — the published npm package
    claude-plugin/      Claude Code plugin wrapping the CLI
  demo/                 Worked example consuming the CLI, not published
  .claude-plugin/
    marketplace.json     This repo as its own Claude Code plugin source
```

| Path | Purpose |
|---|---|
| `packages/cli` | The `likec4-agent` CLI. See [`packages/cli/README.md`](packages/cli/README.md) for flags and the I/O contract. |
| `packages/cli/docs/likec4-annotations.md` | The tag grammar spec — bundled with the CLI, fixed by version. |
| `packages/claude-plugin` | The `/likec4-sync` Claude Code command + skill — a thin wrapper with no independent parsing/resolution judgment. See [`packages/claude-plugin/README.md`](packages/claude-plugin/README.md) for install instructions. |
| `demo/` | A worked example with its own `model/specification.c4`, annotated source, and `package.json` depending on `likec4-agent` — proves the pipeline end to end and doubles as this repo's smoke test. |
| `.claude-plugin/marketplace.json` | Lets this repo be added as a Claude Code plugin source. |

## Installation

Requires Node.js 20+.

```bash
npm install
npm run build --workspace packages/cli
npm rebuild   # relinks the likec4-agent bin now that dist/ exists
```

(`npm rebuild` is needed because npm only links a workspace package's `bin`
entry once its target file exists — `dist/index.js` doesn't exist until
after the first build.)

Verify the install:

```bash
npx likec4-agent --version
npm run likec4:validate --workspace demo   # should report the demo model as valid
```

## Usage

### 1. Annotate your code

Add `@likec4` / `@likec4-rel` tags inside a doc comment near the code that
represents an architectural element — delimiter-agnostic, so this works in
JSDoc, Python docstrings, Go line comments, or any other comment style:

```ts
/**
 * Accepts incoming order requests, validates them, charges the
 * customer, and publishes a fulfillment event once payment succeeds.
 *
 * @likec4 container orders-service "Orders Service" technology:"Node.js, Express"
 * @likec4-rel payments-service "charges the customer's card" technology:"REST/HTTPS"
 * @likec4-rel fulfillment-queue "publishes OrderPlaced event" technology:"SQS" kind:async
 */
export class OrdersService { ... }
```

Full grammar, rules, and multi-language (TS/Python/Go) examples:
[`packages/cli/docs/likec4-annotations.md`](packages/cli/docs/likec4-annotations.md).

If an element is external (a third-party system with no code in this repo —
e.g. Stripe, SQS), declare it by hand in `model/manual/external-systems.c4`
instead of annotating anything — see
[`demo/model/manual/external-systems.c4`](demo/model/manual/external-systems.c4)
for a worked example.

### 2. Run the sync

From the command line, against any repo:

```bash
npx likec4-agent sync --cwd <path-to-your-repo>
```

Or, in Claude Code, once the plugin is installed (see "Distribution"
below):

```
/likec4-sync
```

Either way, this discovers every `@likec4`/`@likec4-rel` tag, regenerates
`<model-dir>/generated/elements.c4` and `<model-dir>/generated/relationships.c4`,
runs `likec4 validate`, and prints a summary: new elements, orphaned
elements (annotation removed — flagged, not silently deleted), relationships
added/removed, dangling relationship targets, and any undeclared kind. It
never touches `model/manual/`, `model/views/`, or `model/specification.c4`,
and never commits — review the diff yourself (`git diff -- model/generated`).

Full flag reference (`--cwd`, `--model-dir`, `--format json|text`,
`--include`/`--exclude`, `--no-validate`, exit codes):
[`packages/cli/README.md`](packages/cli/README.md).

### 3. View the model

```bash
npm run likec4:dev --workspace demo      # live-reloading dev server with interactive diagrams
npm run likec4:build --workspace demo    # static site in demo/dist/likec4
```

### 4. Everyday workflow

```
edit code + @likec4 tags  →  likec4-agent sync (CLI or /likec4-sync)  →  review `git diff`  →  commit
```

Re-running sync is idempotent: with no annotation changes, it produces
byte-identical generated files.

## Development

Working on the CLI or plugin itself (as opposed to consuming them):

```bash
npm run typecheck --workspace packages/cli   # tsc --noEmit
npm test --workspace packages/cli            # vitest: parser, resolve, emit, integration
npm run build --workspace packages/cli       # rebuild dist/ before testing via npx
```

After changing `packages/cli/src/**`, rebuild before re-running
`npx likec4-agent` or `npm run likec4:sync --workspace demo` — the installed
bin points at the built `dist/index.js`, not the TypeScript source.

To iterate on the Claude plugin against this exact checkout, without any
git URL or published package:

```
/plugin marketplace add <path-to-this-repo>
/plugin install likec4-agent@likec4-agent-marketplace
```

A local path source is live — edits under `packages/claude-plugin/`
(including `SKILL.md`) take effect on the next invocation, no reinstall
needed. `claude plugin validate packages/claude-plugin` and
`claude plugin validate .` check the plugin/marketplace manifests directly.

## Distribution

For now this is an internal tool: a private GitHub repo, installed via git
(no published registry yet). The CLI and the Claude plugin are versioned
together in this monorepo but distributed independently — the plugin has no
pinned dependency on the CLI; it shells out to whatever `likec4-agent` the
*target* repo resolves via `npx`/`devDependency`, and checks the CLI
report's `schemaVersion` to catch drift.

To install the Claude plugin from this repo:

```
/plugin marketplace add <git-url-of-this-repo>
/plugin install likec4-agent@likec4-agent-marketplace
```

**Known limitation**: plain `npm install git+https://...` installs a git
repo's root `package.json`, and vanilla npm has no built-in subdirectory
selector for `packages/cli`. This doesn't affect `demo/` (a workspace-local
symlink) but needs a resolution (e.g. a release step publishing a dedicated
branch) before external consultant repos can `npm install` `packages/cli`
directly from this monorepo's git URL.

## Extending

- **New element/relationship kinds**: declare them in your repo's
  `model/specification.c4` first; the CLI flags any annotation using an
  undeclared kind rather than inventing one.
- **New languages**: the tag grammar matches on the literal strings
  `@likec4`/`@likec4-rel` regardless of comment delimiter, so JSDoc, Python
  docstrings/`#`-comments, and Go `//`-comments all work without changes to
  the CLI — see the Python/Go examples in
  `packages/cli/docs/likec4-annotations.md`.
- **Other coding agents**: the CLI is agent-agnostic by design. A new
  adapter (e.g. for Cursor) is a thin wrapper analogous to
  `packages/claude-plugin`, not a reimplementation of the parsing pipeline.
- **Scaffolding brand-new consumer repos**: out of scope for now — a
  `likec4-agent init` command is a deliberate follow-up, not yet built.
