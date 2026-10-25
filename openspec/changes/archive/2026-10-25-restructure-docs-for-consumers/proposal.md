# Proposal

## Why

The root `README.md` currently serves two audiences at once — a developer
who wants to *consume* `likec4-agent` in their own project, and a
contributor working on this monorepo itself — and leads with neither. Its
283 lines mix the functional pitch with local build steps, plugin-dev
iteration instructions, and a "known limitation" callout about npm install
that's really an internal packaging gap. A developer evaluating whether to
adopt this tool has to read past all of that to find out what it does and
how to install it. Separately, installation instructions don't point at
this repo's actual distribution channel (`https://github.com/dilzio/likec4-annotations`,
git-only — nothing is published to npm or any other registry), and one
doc (`packages/cli/docs/likec4-annotations.md`) and its packaging
constraints aren't reflected anywhere in how the docs are organized.

## What Changes

- Rewrite root `README.md` to lead with a functional overview and a
  Quickstart (install + basic usage) aimed at external consumers, trimmed
  from ~283 lines to roughly 60-90.
- Create a new root-level `/docs` folder housing the deep-dive content
  currently inline in README (architecture/design decisions, full usage
  walkthrough, CLI flag reference, Claude plugin reference, extending
  guide, contributor/development guide), plus a new pointer page for the
  annotation tag grammar.
- Fold `packages/cli/README.md` and `packages/claude-plugin/README.md`
  into `/docs` (as `docs/cli-reference.md` and `docs/claude-plugin.md`),
  replacing both package-local files with short stubs that point into
  `/docs` rather than deleting them outright.
- Recommend pnpm's git-subdirectory dependency syntax
  (`pnpm add github:dilzio/likec4-annotations#path:packages/cli`) as the
  supported way to install the CLI into another project, replacing the
  prior "known limitation" framing (plain `npm install git+https://...`
  has no subdirectory selector and can't target `packages/cli`).
- Add a `repository` field to `packages/cli/package.json` (with
  `directory: "packages/cli"`) and to the root `package.json`.
- **BREAKING (packaging)**: add `"private": true` to
  `packages/cli/package.json`. This is intentional — it blocks an
  accidental `npm publish` of the sub-package, which nothing currently
  prevents, consistent with the git-only distribution intent. Anyone who
  was (against intent) publishing this package to a registry would be
  blocked; no such publish is known to occur today.
- Fix the "published npm package" mischaracterization of `packages/cli` in
  README and `CLAUDE.md` (it has never been published; it's installed
  directly from this GitHub repo).
- Add the concrete pnpm install example to
  `packages/claude-plugin/skills/likec4-sync/SKILL.md`'s CLI-resolution
  fallback guidance (one sentence, not a rewrite).

Out of scope: the `"<TODO: consulting company name>"` placeholders in
`.claude-plugin/marketplace.json` and
`packages/claude-plugin/.claude-plugin/plugin.json` are left untouched —
unrelated to this change.

## Capabilities

### New Capabilities

None — this change restructures documentation and packaging metadata only.
It introduces no new user-facing behavior, CLI flags, annotation grammar,
or plugin capability.

### Modified Capabilities

None — no spec-level (externally observable) behavior of any existing
capability (`dataflow-views`, `llm-annotator`, or the in-flight
`nested-components`) changes. The CLI's sync pipeline, the annotation
grammar, and the Claude plugin's skills/commands behave identically before
and after this change; only where their documentation lives, and how the
CLI package's metadata/installation is described, changes.

This change sets `skip_specs: true` in `.openspec.yaml` accordingly.

## Impact

- **Affected files**: `README.md` (full rewrite), new `docs/*.md` files
  (architecture, usage, cli-reference, claude-plugin, annotations,
  extending, development, plus a `docs/README.md` index),
  `packages/cli/README.md` and `packages/claude-plugin/README.md`
  (replaced with stubs), `packages/cli/package.json` and root
  `package.json` (packaging metadata), `CLAUDE.md` (wording fix),
  `packages/claude-plugin/skills/likec4-sync/SKILL.md` (one-sentence
  addition).
- **Not affected**: `packages/cli/docs/likec4-annotations.md` (the tag
  grammar spec) stays exactly where it is — it ships inside the installed
  CLI package and is read at a fixed path by the `likec4-annotate` skill;
  moving it would silently break that guarantee under a pnpm
  subdirectory install. `packages/claude-plugin/skills/likec4-annotate/SKILL.md`,
  `commands/*.md`, `demo/`, and all application code are untouched.
- **Dependencies/systems**: no new runtime dependency. The CLI's
  `peerDependencies`/`dependencies` are unchanged. The only new external
  expectation introduced is that consumers who want to install the CLI as
  a dependency of their own project need pnpm (not npm/yarn) for the
  git-subdirectory install path; this repo's own dev tooling remains
  npm-based and is unaffected.
- **In-flight OpenSpec changes**: `openspec/changes/support-nested-components/`
  has a pending (unchecked) task to update
  `packages/cli/docs/likec4-annotations.md`'s content later. Since that
  file isn't moving or being edited by this change, there's no conflict —
  noted only as a sequencing awareness for whoever lands both changes.
