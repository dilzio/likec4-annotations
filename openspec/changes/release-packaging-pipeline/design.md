# Design

## Context

See `proposal.md` - Why for motivation. Relevant current-state facts that
shape this design:

- No `.github/workflows/` exist at all today — this is greenfield CI.
- `packages/cli/package.json` is `"private": true`, builds via `tsup` to
  `dist/`, already has a correct `bin`/`files`/`repository` shape for npm
  publishing — only the `private` flag and version need to change.
- `packages/claude-plugin` has no `package.json` and no
  `.claude-plugin/plugin.json`. The only place its version lives today is
  `.claude-plugin/marketplace.json`'s `plugins[0].version` field (which
  already exists as a field, currently `"0.1.0"`).
- The root `.claude-plugin/marketplace.json` plugin entry's `source` is the
  relative path `"./packages/claude-plugin"`. Per confirmed research, when
  `/plugin marketplace add OWNER/REPO#<ref>` fetches the manifest at a
  pinned git ref, a relative-path `source` resolves within that same
  fetched ref automatically — no separate per-plugin ref/sha pinning is
  needed for this repo's layout.
- No git tags exist yet (`git tag -l` is empty) — there is no prior release
  to be compatible with.
- The CLI's npm registry name `likec4-agent` is confirmed unclaimed.

## Goals / Non-Goals

**Goals:**
- A release triggered purely by pushing a `v*` tag, with no CI commit-back
  to `main`.
- A dev-build job on every merge to `main` that validates but never
  publishes.
- Keep the three version-bearing files (`packages/cli/package.json`,
  `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`) in sync
  by CI-enforced check, not by a shared build tool dependency.

**Non-Goals:**
- Independent per-package versioning or changelogs (e.g. Changesets). The
  two packages are tightly coupled (plugin is a thin wrapper with no
  independent logic) and already de facto lockstep — adding a
  multi-package release tool would be more machinery than this repo needs.
- Auto-publishing a `next`/`dev` npm dist-tag on every merge (rejected
  during exploration: source-ref installs already cover "try an unreleased
  commit," so a moving public prerelease channel would be redundant
  surface area).
- Changing how the plugin resolves the CLI at runtime (stays dynamic via
  `npx`/`devDependency` + `schemaVersion` check, per
  `docs/development.md`). This design only changes *when CLI the plugin's
  release is allowed to finish publishing*, not how the plugin invokes it.

## Decisions

### Dev-build version format
`<version-in-package.json>-dev.<run_number>+<shortsha>` — e.g. if
`packages/cli/package.json` currently reads `0.1.0`, a dev build on main
is stamped `0.1.0-dev.42+gabc1234`. This is computed entirely in the CI
job (an env var / step output), never written back to any file.

**Why not `0.0.0-dev...`:** basing the prerelease off the *actual* current
version makes it sort correctly as "older than the next real release of
this line" under semver, and makes the stamped version meaningful at a
glance (which release it's ahead of). Alternatives considered: a bare
run-number scheme (`build-42`) — rejected, not semver-comparable;
`git describe --tags` — rejected since there are no tags yet and won't be
meaningful until after the first release.

### Where sync is enforced
No shared tool resolves a single "the version" — each of the three files
keeps its own literal version string, and **CI checks they're equal**
(a single script, e.g. `scripts/check-version-sync.mjs`, run in both the
PR-checks and release workflows). A maintainer bumping a release edits all
three in one PR; the check is what prevents drift (which has already
happened once, informally, with `SKILL.md`'s stray `metadata.version:
"2.0"`).

**Why not a single source-of-truth file read by the others at build time:**
`.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` are
static manifests Claude Code reads directly off disk/git — they can't be
generated at install time the way `packages/cli`'s build step could inject
a version. Keeping all three as plain committed literals, checked for
equality, is simpler than templating two of the three and leaving one
literal.

### Release workflow does not write back to main
Version bumps happen in a normal reviewed PR merged to `main` *before*
tagging. The tag-push workflow only reads the tagged commit, verifies
`packages/cli/package.json`'s version equals the tag, and publishes. This
avoids needing release-workflow write access to `main` (no bot commits, no
risk of a CI push racing a human push, no branch-protection carve-out
needed).

### Publish ordering within the release workflow
1. Verify tag == committed version (fail fast, publishes nothing).
2. Build + test `packages/cli`.
3. `npm publish` (CLI).
4. Validate plugin/marketplace manifest shape and version-sync (see
   below).
5. Create the GitHub Release (using GitHub's native auto-generated release
   notes from merged PRs since the last tag — no changelog tooling needed).

Step 4 runs *after* npm publish, gating the GitHub Release: if npm publish
fails, nothing is released, and the plugin side of the release is never
considered final. This is what "publish ordering" (confirmed during
exploration) means concretely — not a pinned runtime dependency, just this
sequencing.

### Plugin/marketplace validation in CI uses plain JSON checks, not the `claude` CLI
`docs/development.md` already documents `claude plugin validate
packages/claude-plugin` and `claude plugin validate .` as the local dev
workflow. Whether the `claude` CLI can run unauthenticated in a headless
GitHub Actions runner is unconfirmed. Rather than leave that as an open
risk that could block the release workflow, this design uses a small
Node script that checks: `.claude-plugin/plugin.json` and
`.claude-plugin/marketplace.json` parse as valid JSON, contain the
required fields (`name`, `version`, `description` / `plugins[].version`),
and that all three version strings match. `claude plugin validate` remains
the recommended *local* pre-commit check (documented, not CI-enforced).

### First release is `v0.1.0`
Since no tags exist and all three files already read `0.1.0`, the first
release needs no version-bump PR — just creating `.claude-plugin/plugin.json`
at `0.1.0` (new file) and confirming `marketplace.json` already matches,
then tagging. This is called out explicitly so implementation doesn't
invent an unnecessary `v1.0.0` bump.

## Risks / Trade-offs

- **[Risk]** A maintainer tags a commit without bumping all three version
  files first → **Mitigation**: the release workflow's first step is the
  version-sync + tag-match check; it fails before publishing anything.
- **[Risk]** `npm publish` partially succeeds in some edge case (npm's
  publish is effectively atomic per-version, but version collisions can
  happen if a tag is re-pushed) → **Mitigation**: npm rejects re-publishing
  an existing version outright; document that a bad release requires a new
  patch version + tag, not a re-push of the same tag.
- **[Trade-off]** No automatic dev-channel npm package means "try the
  latest main" always requires a source checkout (pnpm git-subdir or
  plugin marketplace pinned to a branch), never a plain `npm install`.
  Accepted — this was the explicit choice in exploration to keep dev
  builds CI-only.
- **[Trade-off]** Hand-rolled version-sync check instead of an established
  tool (Changesets, Lerna) means less tooling to learn, but also less
  built-in changelog generation. Accepted given the two-package, lockstep,
  low-release-frequency scope of this repo.

## Migration Plan

1. Flip `packages/cli/package.json` to publishable (remove `private`,
   confirm `name`/`files`/`bin` already correct — they are).
2. Add `.claude-plugin/plugin.json` (new file) at version `0.1.0`.
3. Confirm `.claude-plugin/marketplace.json`'s `plugins[0].version` already
   reads `0.1.0` (it does).
4. Add `scripts/check-version-sync.mjs` (or similar) used by both the
   PR-checks and release workflows.
5. Add the three workflow files under `.github/workflows/`.
6. A human configures an `NPM_TOKEN` repository secret (npm automation
   token with publish rights) — required before the release workflow can
   succeed; out of scope for this change's code, called out as a task.
7. Rewrite the five documentation files listed in the proposal's Impact
   section.
8. Push the `v0.1.0` tag to exercise the release workflow end to end for
   the first time.

**Rollback:** the release workflow never writes to `main`, so there's
nothing to roll back there. If a tag is pushed in error before step 6
(no `NPM_TOKEN` yet), the npm publish step fails cleanly and no GitHub
Release is created — delete the bad tag and re-push once the secret is
configured. If an already-published npm version is wrong, standard `npm
unpublish` (within npm's 72-hour window) or publishing a corrective patch
version are the only options — no special tooling is added for this.

## Open Questions

- Exact CI runner OS/Node version matrix beyond "Node 20, ubuntu-latest" —
  safely deferrable; today's `engines.node: ">=20"` and single-platform
  `tsup` build give no reason to expect multi-OS/multi-Node testing is
  needed, but this can be widened later without touching specs or the
  task breakdown.
- Whether commit SHAs (vs. only branches/tags) work in
  `/plugin marketplace add OWNER/REPO#<ref>` is unconfirmed by Claude Code's
  docs. Does not change the design (same mechanism either way) — worth a
  one-time manual verification when writing the source-ref-testing docs,
  noted as a task.
