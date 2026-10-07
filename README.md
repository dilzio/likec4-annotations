# like-c4-agent

AI-annotation-driven [LikeC4](https://likec4.dev) architecture modeling.
Annotate your code with lightweight `@likec4` tags in existing doc comments,
and a Claude Code skill reads them to generate and keep a LikeC4 model (and
its diagrams) in sync with the real code — on demand, with no build step or
CI dependency required.

## Functional scope

- **Annotation convention**: a minimal, comment-syntax-agnostic tag grammar
  (`@likec4`, `@likec4-rel`) that lives inside doc comments you'd write
  anyway — not a separate metadata file.
- **AI-driven sync**: a Claude Code skill/slash command (`/likec4-sync`) that
  discovers annotations across the repo, reads the surrounding code, and
  regenerates the LikeC4 model from them.
- **Safe merging**: generated DSL lives in its own files that the skill fully
  owns; anything you author by hand (external systems, views, styling) lives
  in separate files the skill only ever reads, never writes.
- **Validation, not guesswork**: every sync run ends with `likec4 validate`,
  so a broken annotation (bad kind, unresolvable relationship target) is
  caught immediately rather than silently producing a bad diagram.
- **Out of scope (v1)**: no git hook or CI trigger — sync is manual. No
  cross-file relationship attachment — a relationship's source is always the
  element declared in the same comment block. No automatic commits — you
  review the diff.

## Architecture

```
+-----------------------------+       +---------------------------------+
|  Annotated source code      |       |  LikeC4 model (model/**.c4)      |
|  (any language)             |       |                                  |
|                              |       |  specification.c4   (hand)       |
|  /** @likec4 container ... | | ----> |  generated/*.c4      (AI-owned)  |
|   *  @likec4-rel ...       | |       |  manual/*.c4         (hand)      |
|   */                        |       |  views/*.c4          (hand)       |
+-----------------------------+       +---------------------------------+
            ^                                        |
            | reads code, writes generated/* only    v
            |                              +-------------------+
   /likec4-sync (Claude Code skill)  ------>  likec4 validate    |
            |                              +-------------------+
            |                                        |
            v                                        v
   docs/likec4-annotations.md              likec4 start / build
   (tag grammar, source of truth)          (dev server / static site)
```

**Key design decision — the write boundary.** The sync skill is only ever
allowed to write inside `model/generated/`. It reads `model/manual/`,
`model/views/`, and `model/specification.c4` to resolve relationship targets
and check declared kinds, but never modifies them. This is what makes it
safe to re-run: there's no marker-comment parsing or diffing against prior
output to get wrong, because hand-authored files are categorically outside
the generator's reach.

**Why dangling relationships are dropped, not just warned about.** LikeC4's
own validator rejects a relationship whose target id isn't declared anywhere
in the model — it's a hard error, not a lint warning. So when an
`@likec4-rel` points at an id nothing declares yet, the skill omits that one
line from the generated output (and says so in its report) rather than
emitting DSL that would fail `likec4 validate` on every single run.

### Directory layout

| Path | Owner | Purpose |
|---|---|---|
| `package.json` | — | `likec4` devDependency + npm scripts |
| `likec4.config.json` | — | LikeC4 project config |
| `model/specification.c4` | You | Element kinds (`person`, `softwareSystem`, `container`, `component`), relationship kinds (`async`), tags |
| `model/generated/elements.c4` | `/likec4-sync` | Elements discovered from `@likec4` tags — fully rewritten every run |
| `model/generated/relationships.c4` | `/likec4-sync` | Relationships discovered from `@likec4-rel` tags — fully rewritten every run |
| `model/manual/external-systems.c4` | You | Third-party systems/actors with no annotated code of their own |
| `model/manual/relationships.c4` | You | Cross-cutting relationships not implied by a single annotation |
| `model/views/landscape.c4` | You | All `view { ... }` definitions |
| `docs/likec4-annotations.md` | You | The tag grammar spec — single source of truth, read fresh by the skill every run |
| `examples/annotated/*.ts` | — | Minimal worked example proving the pipeline end to end |
| `.claude/skills/likec4-sync/SKILL.md` | — | The sync skill's full step-by-step instructions |
| `.claude/commands/likec4-sync.md` | — | Slash-command wrapper for the skill |

## Installation

Requires Node.js 20+.

```bash
npm install
```

This installs the `likec4` CLI (bundles the language server, CLI, and Vite
plugin — no other `@likec4/*` packages are needed directly).

Verify the install:

```bash
npx likec4 --version
npm run likec4:validate   # should report the hand-authored model skeleton as valid
```

## Usage

### 1. Annotate your code

Add `@likec4` / `@likec4-rel` tags inside a doc comment near the code that
represents an architectural element:

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
[`docs/likec4-annotations.md`](docs/likec4-annotations.md).

If an element is external (a third-party system with no code in this repo —
e.g. Stripe, SQS), declare it by hand in `model/manual/external-systems.c4`
instead of annotating anything:

```
model {
  stripe-api = softwareSystem 'Stripe API' {
    #external
    description 'Third-party payment processor.'
    technology 'HTTPS/REST'
  }
}
```

### 2. Run the sync

In Claude Code:

```
/likec4-sync
```

This discovers every `@likec4`/`@likec4-rel` tag in the repo, regenerates
`model/generated/elements.c4` and `model/generated/relationships.c4`, runs
`likec4 validate`, and prints a summary: new elements, orphaned elements
(annotation removed — flagged, not silently deleted), relationships
added/removed, dangling relationship targets, and any undeclared kind. It
never touches `model/manual/`, `model/views/`, or `model/specification.c4`,
and never commits — review the diff yourself (`git diff -- model/generated`).

### 3. View the model

```bash
npm run likec4:dev      # live-reloading dev server with interactive diagrams
npm run likec4:build    # static site in ./dist/likec4
```

### 4. Everyday workflow

```
edit code + @likec4 tags  →  /likec4-sync  →  review `git diff`  →  commit
```

Re-running `/likec4-sync` is idempotent: with no annotation changes, it
produces byte-identical generated files.

## Extending

- **New element/relationship kinds**: declare them in `model/specification.c4`
  first; the skill flags any annotation using an undeclared kind rather than
  inventing one.
- **New languages**: the tag grammar matches on the literal strings
  `@likec4`/`@likec4-rel` regardless of comment delimiter, so JSDoc, Python
  docstrings/`#`-comments, and Go `//`-comments all work without changes to
  the skill — see the Python/Go examples in `docs/likec4-annotations.md`.
- **Automating the trigger**: v1 is manual by design. If sync volume grows
  enough to want a git hook or CI job, keep the skill's extraction
  prompt-driven as long as practical — only introduce a deterministic
  parser script if re-reading whole files each run becomes a real cost, and
  even then let Claude keep owning the JSON→DSL authoring and judgment
  calls (new vs. renamed vs. orphaned).
