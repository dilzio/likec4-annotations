# Usage

## 0. Bootstrapping an unannotated codebase

Starting from a codebase with no (or only partial) `@likec4` tags? Use the
interactive `likec4-annotate` Claude Code skill instead of hand-writing every
tag yourself: it scans the target codebase, proposes a chunk plan and a
`model/specification.c4` taxonomy, then walks through each chunk proposing
`@likec4`/`@likec4-rel` tags (and, once every chunk is tagged, `flow:`/
`flowTitle:` tags) for your explicit approval before writing anything. A
resumable on-disk progress manifest (`<model-dir>/.annotate/progress.json`)
lets a large codebase be annotated across multiple sessions.

```
/likec4-annotate
```

It never runs `likec4-agent sync` itself and never touches
`<model-dir>/generated/**` — once it's done proposing and writing tags,
continue with step 2 below to turn them into the model. See
[`packages/claude-plugin/skills/likec4-annotate/SKILL.md`](../packages/claude-plugin/skills/likec4-annotate/SKILL.md)
for the full staged workflow.

## 1. Annotate your code

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
[`packages/cli/docs/likec4-annotations.md`](../packages/cli/docs/likec4-annotations.md).

If an element is external (a third-party system with no code in this repo —
e.g. Stripe, SQS), declare it by hand in `model/manual/external-systems.c4`
instead of annotating anything — see
[`demo/model/manual/external-systems.c4`](../demo/model/manual/external-systems.c4)
for a worked example.

## 2. Run the sync

From the command line, against any repo:

```bash
npx likec4-agent sync --cwd <path-to-your-repo>
```

Or, in Claude Code, once the plugin is installed (see
[`docs/claude-plugin.md`](claude-plugin.md)):

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
[`docs/cli-reference.md`](cli-reference.md).

## 3. View the model

```bash
npx likec4 start   # live-reloading dev server with interactive diagrams
npx likec4 build   # static site in ./dist/likec4
```

(For this repo's own demo: `npm run likec4:dev --workspace demo` and
`npm run likec4:build --workspace demo`.)

## 4. Everyday workflow

```
edit code + @likec4 tags  →  likec4-agent sync (CLI or /likec4-sync)  →  review `git diff`  →  commit
```

Re-running sync is idempotent: with no annotation changes, it produces
byte-identical generated files.
