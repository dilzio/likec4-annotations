---
name: likec4-sync
description: Regenerate the LikeC4 model's generated files from @likec4 code annotations by running the likec4-agent CLI. Use when the user wants to sync, regenerate, or update the LikeC4 architecture model from code, or says "likec4 sync" or "sync the model".
allowed-tools: Bash(npx likec4-agent:*), Bash(npx --no-install likec4-agent:*), Read
license: MIT
metadata:
  version: "2.0"
---

Regenerate `<model-dir>/generated/elements.c4` and
`<model-dir>/generated/relationships.c4` by running the `likec4-agent` CLI,
then relay its report to the user. **This skill has no independent parsing
or resolution judgment of its own** — discovery, parsing, id resolution,
kind validation, DSL emission, and validation are all handled by the CLI.
Your job is to run it and present what it already computed.

## Steps

1. **Resolve the CLI.** Try `npx --no-install likec4-agent --version`. If
   that fails, try `npx --yes likec4-agent@<pinned-version-if-known>
   --version`. If neither resolves, tell the user the CLI isn't installed
   in this repo and suggest adding it as a `devDependency` (or a git
   dependency, per their install method) — do not fall back to parsing
   annotations yourself.

2. **Run the sync.** Execute:
   ```bash
   npx likec4-agent sync --format json
   ```
   stdout is a single JSON `SyncReport` object; stderr carries any progress
   logging. Parse stdout as JSON.

3. **Check `schemaVersion`.** If it's not a version this skill recognizes
   (currently `1`), stop and tell the user the installed CLI's report
   format doesn't match what this skill expects — don't guess at fields
   that might not mean what they used to.

4. **Render a report** purely by formatting fields already present in the
   JSON (don't re-derive anything):
   - New elements (id, kind, `file:line`)
   - Elements orphaned (annotation gone — the underlying code may have
     moved/renamed rather than been deleted, so don't phrase this as a
     deletion)
   - Relationships added/removed
   - Dangling relationship targets (the CLI already omitted these from the
     generated files)
   - Annotations using an undeclared kind (the CLI already omitted these)
   - Malformed tag lines, if any
   - Whether `likec4 validate` passed
   - Confirmation that `model/manual/**` and `model/views/**` were not
     touched (the CLI structurally never writes there)
   - Do **not** commit anything — leave the working tree diff for the user
     to review.

5. **On exit code 1** (files were written but `likec4 validate` failed):
   still produce the report above, but lead with the raw validator output
   from the JSON's `validate.rawOutput` field, and make clear the generated
   files were written anyway (not rolled back) so the user can inspect
   `git diff`.

6. **On exit code 2 or a command-not-found failure:** explain that the CLI
   could not complete the pipeline (or isn't resolvable) — do not attempt
   to fall back to manually grepping/parsing annotations yourself.

## Guardrails

- Never edit `model/generated/**`, `model/manual/**`, `model/views/**`, or
  `model/specification.c4` directly — the CLI is the only thing that
  writes `model/generated/**`, and nothing should write the rest.
- Don't reimplement what the CLI does. If its output looks wrong, that's a
  CLI bug to report/fix upstream, not something to work around by parsing
  annotations yourself in this skill.
- Never commit.
