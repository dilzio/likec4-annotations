# Proposal

## Why

This repo currently has no CI/CD at all, and distributes both the CLI and
the Claude Code plugin via git only — `docs/development.md` and
`docs/cli-reference.md` explicitly document a pnpm git-subdirectory
workaround (`pnpm add github:.../#path:packages/cli`) as the *only* install
path, with no npm registry involved. Versions are kept in sync by hand
across three files (root `package.json`, `packages/cli/package.json`,
`.claude-plugin/marketplace.json`) and have already drifted once (a
`SKILL.md` carries `metadata.version: "2.0"` while everything else reads
`0.1.0`). There is no tag-triggered release process, no distinction between
a development build and a release build, and no documented way to test an
unreleased commit without hand-editing install commands.

We want real package distribution (npm for the CLI, a Claude Code
marketplace for the plugin) driven by pushing a semver git tag, with
automatic CI validation on every merge to `main`, and a documented way to
test any commit via direct source references before it's released.

## What Changes

- Introduce a single lockstep semver version shared by the CLI and the
  plugin. One git tag (`vX.Y.Z`) represents a release of both.
- Give the plugin its own `.claude-plugin/plugin.json` manifest carrying
  `name`/`version`/`description` — today only `.claude-plugin/marketplace.json`
  records a version for it.
- Flip `packages/cli/package.json` from `"private": true` to publishable,
  under the (confirmed available) unscoped name `likec4-agent`.
- Add a GitHub Actions workflow that runs build + test + typecheck for both
  packages on every pull request.
- Add a GitHub Actions workflow that runs the same build + test + typecheck
  on every merge to `main` and stamps a distinct dev-build version
  (`0.0.0-dev.<n>+<shortsha>` style, exact format finalized in design.md).
  This job **never publishes** to npm or the marketplace — it is CI
  validation only.
- Add a GitHub Actions workflow triggered by pushing a `v*` tag that:
  publishes `packages/cli` to npm, then creates a GitHub Release. It
  publishes the CLI **before** finalizing anything plugin-related, since
  the plugin's docs/tooling should only ever point at a CLI version that
  already exists on npm (sequencing only — the plugin keeps resolving the
  CLI dynamically via `npx`/`devDependency` at runtime, per
  `docs/development.md`'s existing "no pinned dependency" design, which is
  unchanged by this proposal). The release workflow does not write back to
  `main` — version numbers are expected to already be correct in the
  tagged commit (bumped via a normal reviewed PR before tagging).
- Document (not newly build) a source-reference testing recipe for both
  components: the CLI via pnpm's existing git-subdirectory + commit-pin
  syntax, and the plugin via `/plugin marketplace add OWNER/REPO#<ref>`,
  which resolves the plugin's relative-path source at that same pinned ref
  with no new tooling required.
- Rewrite `README.md`, `docs/development.md`, `docs/cli-reference.md`,
  `docs/claude-plugin.md`, and `docs/architecture.md` to describe npm/
  marketplace installation as the primary path, reposition the git-source
  install steps as the "test an unreleased commit" recipe, and document the
  new CI/release pipeline.
- **BREAKING**: the documented primary install method changes from
  pnpm git-subdirectory dependency to `npm install likec4-agent` /
  `/plugin marketplace add dilzio/likec4-annotations`. Existing consumers
  using the git-subdirectory method are unaffected functionally (it still
  works, per source-ref-testing), but it's no longer the recommended path.

## Capabilities

### New Capabilities
- `versioning-scheme`: defines the lockstep semver scheme shared by the CLI
  and plugin, where each component's version is recorded, and the distinct
  dev-build version format used by CI-only builds on `main`.
- `ci-release-workflows`: defines the three GitHub Actions workflows (PR
  checks, dev build on merge to `main`, tag-triggered release) — their
  triggers, what each does, and what each explicitly does not do (e.g. dev
  builds never publish).
- `cli-npm-distribution`: defines the CLI's npm package identity and the
  requirement that a release-tag push results in that exact version being
  published to npm.
- `plugin-marketplace-distribution`: defines the plugin's own manifest
  (`.claude-plugin/plugin.json`), its version tracking in the self-hosted
  marketplace, and the requirement that a release tag leaves the
  marketplace pointing at a consistent, matching version.
- `source-ref-testing`: defines the supported way to install/try the CLI
  and the plugin from an exact unreleased commit, without consuming a
  published package.

### Modified Capabilities
(none — the four existing specs, `cli-root-directory`, `dataflow-views`,
`nested-components`, and `project-init`, describe the LikeC4 modeling
domain and are unaffected by this build/release tooling change.)

## Impact

- **Files**: `packages/cli/package.json` (unprivatize), new
  `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` (gains a
  `version` kept in sync via lockstep), new `.github/workflows/*.yml` (PR
  checks, dev build, release), `README.md`, `docs/development.md`,
  `docs/cli-reference.md`, `docs/claude-plugin.md`, `docs/architecture.md`.
- **External systems**: npm registry (new publish target, requires an npm
  auth token as a repo secret), GitHub Releases.
- **Consumers**: anyone currently using the pnpm git-subdirectory install
  method keeps working: docs just stop recommending it as the primary path.
- **No runtime behavior change**: the CLI's sync pipeline, annotation
  grammar, and plugin command/skill logic are untouched. This is purely a
  build/versioning/distribution change.
