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

## Why distribution is git-only

This repo distributes via git only — nothing is published to npm or any
other registry. The CLI and the Claude plugin are versioned together in
this monorepo but distributed independently — the plugin has no pinned
dependency on the CLI; it shells out to whatever `likec4-agent` the
*target* repo resolves via `npx`/`devDependency`, and checks the CLI
report's `schemaVersion` to catch drift.

The supported way for an external project to add the CLI as a dependency
is pnpm's git-subdirectory syntax:

```bash
pnpm add github:dilzio/likec4-annotations#path:packages/cli
```

Plain `npm install git+https://github.com/dilzio/likec4-annotations.git`
installs the monorepo root's `package.json` (`private: true`, no useful
`bin`), not `packages/cli` — vanilla npm has no subdirectory selector for a
git dependency. pnpm's `#path:<subdir>` fragment (added in pnpm v9) resolves
a package from a subdirectory of a cloned monorepo instead.

This install fails on the first attempt (expected) because pnpm v10+ blocks
`packages/cli`'s `prepare` build script for git dependencies until it's
allow-listed by exact commit hash — see
[`docs/cli-reference.md`](cli-reference.md#installing-the-cli) for the
two-step `allowBuilds` workaround.

To install the Claude plugin from this repo:

```
/plugin marketplace add https://github.com/dilzio/likec4-annotations
/plugin install likec4-agent@likec4-agent-marketplace
```
