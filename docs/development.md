# Development

Working on this repo itself — the CLI or the Claude plugin — as opposed to
consuming them in another project.

## Build, test, typecheck

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

```bash
npm run typecheck --workspace packages/cli   # tsc --noEmit
npm test --workspace packages/cli            # vitest: parser, resolve, emit, integration
```

After changing `packages/cli/src/**`, rebuild before re-running
`npx likec4-agent` or `npm run likec4:sync --workspace demo` — the installed
bin points at the built `dist/index.js`, not the TypeScript source.

## Iterating on the Claude plugin locally

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

## Distribution and release

The CLI and the Claude plugin are versioned together in this monorepo —
one semver version, recorded identically in `packages/cli/package.json`,
`packages/claude-plugin/.claude-plugin/plugin.json`, and the plugin's entry
in `.claude-plugin/marketplace.json` — but distributed independently. The
plugin has no pinned dependency on the CLI; it shells out to whatever
`likec4-agent` the *target* repo resolves via `npx`/`devDependency`, and
checks the CLI report's `schemaVersion` to catch drift.

- The CLI is published to npm as [`likec4-agent`](https://www.npmjs.com/package/likec4-agent).
- The plugin is distributed via this repo's self-hosted Claude Code
  marketplace (`.claude-plugin/marketplace.json`).

**Keeping the three version files in sync.** `scripts/check-version-sync.mjs`
reads all three files and fails with a clear message if any version
differs, or if either manifest is missing a required field. Run it with
`npm run check:versions`. It runs in both the pull-request and release
workflows below — there's no shared build tool that generates one file
from another; a maintainer bumping a release edits all three in one PR.

**Releasing.** A release is just pushing a `vX.Y.Z` tag on a commit whose
version files already read `X.Y.Z`:

1. In a normal reviewed PR, bump the version in all three files to the
   same `X.Y.Z` (`npm run check:versions` should pass).
2. Merge to `main`.
3. `git tag vX.Y.Z && git push origin vX.Y.Z`.

Pushing the tag triggers `.github/workflows/release.yml`, which verifies
the tag matches the committed version, builds and tests `packages/cli`,
publishes it to npm, validates the plugin/marketplace manifests, and
creates a GitHub Release with auto-generated notes. It never commits or
pushes back to `main` — if the tag doesn't match, nothing is published.

This workflow needs a repository secret, **`NPM_TOKEN`** (an npm
automation token with publish rights for `likec4-agent`), configured
before it can succeed.

**CI on every pull request and every merge to `main`.**
`.github/workflows/pr-checks.yml` builds, type-checks, tests, and runs
`check:versions` on every pull request targeting `main`.
`.github/workflows/dev-build.yml` runs the same checks on every merge to
`main` and stamps a dev-build version
(`<package.json version>-dev.<run_number>+<shortsha>`), uploading
`packages/cli/dist` as a workflow artifact. It never publishes to npm and
never writes to `.claude-plugin/marketplace.json` — it's CI validation
only, not a release channel.

## Testing an unreleased commit

To try the CLI or the plugin as they exist at an exact commit, before
there's a release tag for it:

**CLI**, via pnpm's git-subdirectory syntax, pinned to a commit SHA:

```bash
pnpm add github:dilzio/likec4-annotations#<commit-sha>&path:packages/cli
```

Plain `npm install git+https://github.com/dilzio/likec4-annotations.git`
installs the monorepo root's `package.json` (no useful `bin`), not
`packages/cli` — vanilla npm has no subdirectory selector for a git
dependency. pnpm's `#<commit-sha>&path:<subdir>` syntax (pnpm v9+) resolves
a package from a subdirectory of a cloned monorepo at an exact commit.

This install fails on the first attempt (expected) because pnpm v10+ blocks
`packages/cli`'s `prepare` build script for git dependencies until it's
allow-listed by exact commit hash. The error is
`ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`, with a ready-to-paste `allowBuilds`
entry:

```yaml
# pnpm-workspace.yaml
allowBuilds:
  likec4-agent@github.com/dilzio/likec4-annotations/<commit-sha>&path:packages/cli: true
```

Add that line, then re-run the same `pnpm add` command — it now succeeds.
Updating to a different commit repeats the same two-step dance, since the
allowlist entry is pinned to the exact commit hash, not a version.

**Plugin**, via the marketplace pinned to a ref:

```
/plugin marketplace add dilzio/likec4-annotations#<ref>
/plugin install likec4-agent@likec4-agent-marketplace
```

`<ref>` is a branch or tag name (confirmed against Claude Code's plugin
marketplace reference — the marketplace-level `#ref` does not accept a raw
commit SHA, only a branch or tag). Since this repo's marketplace entry
uses a relative-path `source` (`./packages/claude-plugin`), it resolves
within whatever ref Claude Code fetched, so the installed plugin reflects
`packages/claude-plugin`'s content exactly as of that ref — push a
throwaway branch at the commit you want to test if you need something more
precise than an existing tag.
