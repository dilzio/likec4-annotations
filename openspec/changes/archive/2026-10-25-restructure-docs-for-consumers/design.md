# Design

## Context

See `proposal.md` - Why/What Changes for motivation. Relevant current-state
constraints that shape this design:

- `packages/cli/package.json`'s `files` field (`["dist", "docs", "README.md"]`)
  determines what a `pnpm pack`/publish would include, but this project
  distributes via git only (no registry publish) — so for the chosen
  install method, what actually ships to a consumer is governed by how
  that install method resolves a git dependency, not by `files`.
- The `likec4-annotate` Claude skill reads the tag grammar spec at a path
  relative to the installed CLI (`packages/cli/docs/likec4-annotations.md`
  in this repo, `node_modules/likec4-agent/docs/likec4-annotations.md`
  once installed) — this path is load-bearing, not just documentation.
- This repo's own dev tooling is npm (root `package-lock.json`, npm
  workspaces). The pnpm recommendation below is for external consumers
  only and doesn't change how this repo itself is built/tested.
- git remote `origin` is `git@github.com:dilzio/likec4-annotations.git`,
  confirming `https://github.com/dilzio/likec4-annotations` as the
  canonical repo URL for all install instructions.

## Goals / Non-Goals

**Goals:**
- A root `README.md` an external developer can read top-to-bottom in a
  couple of minutes and come away knowing what the tool does and how to
  install/run it.
- A `/docs` folder that holds everything else, discoverable from README,
  without breaking the one file (`packages/cli/docs/likec4-annotations.md`)
  that has a hard packaging/runtime constraint.
- Installation instructions that describe a method that actually works
  today, not an aspirational one.

**Non-Goals:**
- No change to the CLI's behavior, flags, exit codes, or the annotation
  grammar itself.
- No change to how this repo's own contributors build/test (still npm).
- No resolution of the `.claude-plugin/marketplace.json` /
  `plugin.json` TODO placeholders (out of scope, see proposal).
- No npm registry publish step is introduced; git/GitHub remains the only
  distribution channel.

## Decisions

### 1. Install method: pnpm git-subdirectory syntax, not plain npm

**Decision**: Recommend `pnpm add github:dilzio/likec4-annotations#path:packages/cli`
as the supported way to add the CLI as a dependency of another project.

**Why**: Plain `npm install git+https://github.com/dilzio/likec4-annotations.git`
has no subdirectory selector — it would install the monorepo root
(`private: true`, no useful `bin`), not `packages/cli`. pnpm supports a
`#path:<subdir>` fragment on git dependencies (added in pnpm v9) that
resolves a package from a subdirectory of a cloned monorepo, running that
subdirectory's build/prepare scripts as needed.

**Alternatives considered**:
- *Document "clone the whole repo and run it directly"* — technically
  always works, but doesn't satisfy "use this tooling in their own
  project" as a dependency; relegated to `docs/development.md` as the
  contributor path, not the consumer Quickstart.
- *Publish a dedicated release branch/tag containing only `packages/cli`'s
  contents at its root* — would let plain `npm install` work, but is a
  release-engineering change (CI, branch maintenance) well beyond a docs
  restructure. Noted as a possible future follow-up, not pursued here.
- *Wait for npm to support git-subdirectory installs* — not on any known
  npm roadmap; not viable.

### 2. The tag grammar spec stays in `packages/cli/docs/`, not `/docs/`

**Decision**: `packages/cli/docs/likec4-annotations.md` is not moved. The
new `docs/annotations.md` is a pointer page (what the grammar is, a link
to the real file, and a one-sentence explanation of why it's a pointer)
rather than a relocated or duplicated copy.

**Why**: Verified against pnpm's own issue tracker (`pnpm/tasks#82`, a
security fix) that a `#path:` git-subdirectory install confines the
resolved package strictly to files within that subdirectory of the
cloned repo — intermediate-symlink escapes were treated as a
vulnerability and patched. A file living at the repo root (`/docs/...`)
would not be present inside a consumer's
`node_modules/likec4-agent/` after a pnpm subdirectory install, silently
breaking the `likec4-annotate` skill's fixed-path read of the grammar
spec and the "bundled with the CLI, fixed by version" guarantee the
project already documents.

**Alternatives considered**:
- *Move it to `/docs/` and add a build step to copy it back into
  `packages/cli/docs/` before install* — doesn't work: pnpm's
  subdirectory confinement happens as part of resolving/cloning the
  dependency, before any of the subdirectory's own scripts run, so a
  "copy from `../../docs`" step in `packages/cli`'s `prepare` script
  would have nothing to copy from by the time it runs.
  - Pnpm's resolution behavior, including the confinement fix, is only
    confirmed from its GitHub issue tracker, not primary docs
    (`pnpm.io` doesn't document the exact mechanics) — if this turns out
    to be wrong in practice, the fallback is alternative 2 (symlink)
    below, or dropping the pnpm recommendation per Decision 1's second
    alternative. Flagged as a residual risk in Risks/Trade-offs.
- *Symlink `packages/cli/docs/likec4-annotations.md` to a root
  `/docs/likec4-annotations.md`* — git-portable in principle, but adds
  cross-platform fragility (Windows git symlink support is inconsistent)
  for a single file, and still leaves the same "does pnpm's subdirectory
  resolution follow or dereference symlinks pointing outside the
  subpath" uncertainty that motivated this decision in the first place.
- *Duplicate the content in both locations* — rejected: guarantees drift
  between two copies of a spec the project explicitly calls "fixed by
  version."

### 3. Package-owned READMEs become stubs, not deletions

**Decision**: `packages/cli/README.md` and `packages/claude-plugin/README.md`
are replaced with short (5-10 line) files pointing into `/docs`
(`docs/cli-reference.md`, `docs/claude-plugin.md`), rather than deleted.

**Why**: `packages/cli/README.md` is listed in `packages/cli/package.json`'s
`files` field and is physically present inside every pnpm subdirectory
install — a stub means a consumer who ends up browsing
`node_modules/likec4-agent/` finds a pointer instead of nothing, and
avoids touching `files` or `.gitignore`-style allowlists at all. For both
packages, GitHub auto-renders a folder's `README.md` when browsing that
folder on github.com — a developer evaluating `packages/cli` or
`packages/claude-plugin` directly on GitHub before installing anything
gets a real landing page.

**Alternatives considered**: delete outright and update the handful of
inbound links (root README's layout table, any cross-references) to point
straight at `/docs`. Rejected per the "nothing to see" / `files`-field
reasons above; the maintenance cost of a 5-line stub is negligible next
to the lost signal of an empty folder.

### 4. Contributor content gets its own doc, with no README section

**Decision**: Build/test/typecheck commands, iterating on the Claude
plugin locally, and the distribution/packaging rationale move to
`docs/development.md`. README keeps at most a one-line pointer
("Working on this repo itself? See `docs/development.md`."), not a
"Development" heading with inline commands.

**Why**: Confirmed directly with the user — the Quickstart's audience is
an external consumer; mixing in contributor workflow undermines "lead
with a functional overview and quickstart" for that audience.

### 5. `packages/cli/package.json` gets `private: true`

**Decision**: Add `"private": true` to `packages/cli/package.json`.

**Why**: Root `package.json`'s `private: true` does not cascade to
workspace sub-packages — nothing today stops
`npm publish --workspace packages/cli` from succeeding, which would
contradict the explicit git-only distribution intent. `private: true` is
the correct blocking mechanism (`npm publish` hard-refuses it); a
`publishConfig` entry only configures how a publish behaves if attempted,
it doesn't prevent one.

**Alternatives considered**: `publishConfig.registry` pointing at a
nonexistent registry — rejected, it degrades the failure mode (a
confusing network/auth error) instead of a clear "private package" error.

## Risks / Trade-offs

- **[Risk]** pnpm's subdirectory-confinement behavior was verified via
  its GitHub issue tracker (a security-fix discussion), not primary
  `pnpm.io` documentation, and the install-time build/prepare-script
  behavior for git subdirectory deps has open issues upstream (e.g.
  lockfile `path` fragments being dropped, built output sometimes
  missing). → **Mitigation**: the Quickstart should be validated against
  a real `pnpm add github:dilzio/likec4-annotations#path:packages/cli`
  install as part of this change's tasks, before merging; if it doesn't
  work as expected, fall back to documenting clone+build (Decision 1's
  first alternative) rather than shipping unverified install
  instructions.
- **[Risk]** Moving content out of README into `/docs` increases the
  number of files a future doc update has to touch, and stale
  cross-links (e.g. a doc page linking to another doc page under the old
  README-relative path) are an easy mistake. → **Mitigation**: tasks.md
  includes a final grep sweep for `packages/cli/README.md` /
  `packages/claude-plugin/README.md` as link targets and for leftover
  `<git-url-of-this-repo>` placeholder text.
- **[Risk]** `packages/cli/package.json` gaining `private: true` is
  listed as **BREAKING (packaging)** in the proposal — if any
  undocumented process does publish this package today (e.g. a manual
  release step not visible in `.github/` since no CI exists), this would
  break it. → **Mitigation**: no publish automation was found anywhere in
  the repo (`.github/` doesn't exist); flagged in the proposal so the
  user can object before this lands if such a process exists outside the
  repo.

## Migration Plan

This is additive/organizational, not a runtime migration:
1. Create all `docs/*.md` files first (content copied/adapted from
   existing sources) so no link is ever briefly broken.
2. Replace the two package READMEs with stubs.
3. Rewrite root `README.md` to the new outline, pointing at `/docs`.
4. Apply packaging changes (`repository`, `private: true`).
5. Apply the small cross-reference wording fixes (`CLAUDE.md`,
   `likec4-sync/SKILL.md`).
6. Grep sweep for stale links/placeholders; manually verify the pnpm
   install command against the real repo (see Risks).

No rollback mechanism beyond normal git revert is needed — no data
migration, no runtime behavior change, no user-facing state.

## Open Questions

None — the one genuine unknown (whether pnpm's subdirectory install
behaves exactly as understood from secondary sources) is resolved by
verifying it as a task before merging, not deferred past this change;
see Risks/Trade-offs and tasks.md.
