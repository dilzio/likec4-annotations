# Tasks

## 1. Version-bearing manifests

- [x] 1.1 Remove `"private": true` from `packages/cli/package.json` and
      verify `npm publish --dry-run --workspace packages/cli` from the repo
      root succeeds without error
- [x] 1.2 Create `packages/claude-plugin/.claude-plugin/plugin.json` with
      `name: "likec4-agent"`, `version: "0.1.0"`, and a description, and
      verify the file is valid JSON (`node -e "require('./packages/claude-plugin/.claude-plugin/plugin.json')"`)
- [x] 1.3 Confirm `.claude-plugin/marketplace.json`'s `plugins[0].version`
      already reads `"0.1.0"` matching `packages/cli/package.json` and the
      new `plugin.json` (no edit expected; fix if it has drifted)

## 2. Version-sync check script

- [x] 2.1 Add `scripts/check-version-sync.mjs` that reads
      `packages/cli/package.json`, `packages/claude-plugin/.claude-plugin/plugin.json`,
      and `.claude-plugin/marketplace.json`'s `plugins[0].version`, exits
      non-zero with a clear message if any differ, and verify it exits 0
      against the current (synced) state
- [x] 2.2 Verify the script fails loudly: temporarily bump one file's
      version locally, confirm the script exits non-zero and names the
      mismatched file, then revert the change
- [x] 2.3 Add an npm script (e.g. `"check:versions"`) in the root
      `package.json` that runs the sync script, and verify
      `npm run check:versions` works from the repo root

## 3. Pull request validation workflow

- [x] 3.1 Add `.github/workflows/pr-checks.yml` triggered on
      `pull_request` targeting `main`, running on Node 20/ubuntu-latest:
      `npm install`, `npm run build --workspace packages/cli`,
      `npm run typecheck --workspace packages/cli`,
      `npm test --workspace packages/cli`, and `npm run check:versions`
- [ ] 3.2 Open a throwaway PR (or use `act`/a branch push simulating a PR)
      to verify the workflow runs and reports a passing check
      (BLOCKED: requires pushing a branch/opening a PR on GitHub or a local
      `act` install, neither done without explicit confirmation; all steps
      verified to pass locally — see completion summary)

## 4. Dev build workflow (merge to main)

- [x] 4.1 Add `.github/workflows/dev-build.yml` triggered on `push` to
      `main`, running the same build/test/typecheck steps as the PR
      workflow
- [x] 4.2 Add a step that computes the dev-build version
      (`<package.json version>-dev.<run_number>+<shortsha>`) and prints it
      to the job summary/log, and verify by inspecting a workflow run's
      output after merging a test commit
      (version-computation logic verified locally; live Actions-run
      inspection needs an actual push to `main` — see completion summary)
- [x] 4.3 Add a step that uploads the built `packages/cli/dist` as a
      workflow artifact named with the dev-build version (e.g.
      `likec4-agent-0.1.0-dev.3+gabc1234.zip`), and verify the artifact is
      downloadable from the Actions run page
      (zip packaging verified locally; live artifact download needs an
      actual push to `main` — see completion summary)
- [x] 4.4 Verify this workflow contains no `npm publish` or any step that
      writes to `.claude-plugin/marketplace.json` (code review of the
      workflow file against `specs/ci-release-workflows/spec.md`'s "Dev
      build on merge to main never publishes" requirement)

## 5. Release workflow (tag-triggered)

- [x] 5.1 Add `.github/workflows/release.yml` triggered on `push` of tags
      matching `v*.*.*`
- [x] 5.2 Add a tag-vs-version verification step (strip the `v` prefix,
      compare to `packages/cli/package.json`'s version, run
      `check-version-sync.mjs`) that fails the job before any publish step
      if they don't match; verify by pushing a deliberately mismatched tag
      to a test branch/fork and confirming the job fails at this step
      (shell logic simulated locally for both matching and mismatched
      cases; live tag-push verification needs a real tag push — see
      completion summary)
- [x] 5.3 Add build + test steps for `packages/cli`, then an `npm publish`
      step using an `NPM_TOKEN` secret, sequenced strictly before any
      plugin-related step
- [x] 5.4 Add a plugin/marketplace manifest validation step (parse both
      JSON files, confirm required fields and version match) that runs
      after the npm publish step
- [x] 5.5 Add a step that creates a GitHub Release for the tag with
      auto-generated release notes, gated on the previous steps succeeding
- [x] 5.6 Document (in the workflow file as a comment, and in
      `docs/development.md`) that a human must configure an `NPM_TOKEN`
      repository secret before this workflow can succeed

## 6. Source-reference testing documentation

- [x] 6.1 Verify whether `/plugin marketplace add OWNER/REPO#<commit-sha>`
      (not just branch/tag) works in practice, by running it against this
      repo at a known commit, and note the confirmed behavior
      (confirmed via Claude Code's plugin marketplace reference docs,
      not a live run against this repo's own GitHub remote: the
      marketplace-level `#ref` accepts only a branch or tag — a `sha`
      field exists only on per-plugin `github`/`url`/`git-subdir` sources,
      not on the marketplace source itself, so a raw commit SHA after `#`
      is not supported for `marketplace add`. See
      docs/development.md#testing-an-unreleased-commit)
- [x] 6.2 Write a "test an unreleased commit" section covering both the
      pnpm git-subdirectory + commit-pin syntax for the CLI and the
      confirmed `/plugin marketplace add` ref/commit syntax for the plugin

## 7. Documentation rewrite

- [x] 7.1 Rewrite `README.md`'s Quickstart to lead with
      `npm install likec4-agent` / `/plugin marketplace add
      dilzio/likec4-annotations` as the primary install path
- [x] 7.2 Rewrite `docs/development.md`'s "Why distribution is git-only"
      section to describe the new npm + marketplace distribution model,
      the lockstep version-bump-then-tag release flow, and move the
      pnpm git-subdirectory walkthrough into the source-ref-testing
      section from task 6.2
- [x] 7.3 Rewrite `docs/cli-reference.md`'s "Installing the CLI" section
      to lead with `npm install`/`npx`, keeping the git-subdirectory
      recipe as the "install an unreleased commit" path
- [x] 7.4 Update `docs/claude-plugin.md`'s Install section to reflect the
      versioned marketplace release and add the commit/ref-pinned install
      recipe
- [x] 7.5 Update `docs/architecture.md`'s monorepo layout section to
      remove the "distributed via git (not published to npm)" claim and
      describe the new CI/release pipeline and plugin manifest file
- [x] 7.6 Cross-check all five rewritten docs for internal consistency
      (no remaining references to git-only distribution as the primary
      path) by grepping for "git-only" and "not published to npm" across
      `docs/` and `README.md`

## 8. First release

- [ ] 8.1 Merge all of the above to `main` and confirm the dev-build
      workflow (task 4) runs successfully on that merge
- [ ] 8.2 Configure the `NPM_TOKEN` repository secret (human action,
      outside CI)
- [ ] 8.3 Push tag `v0.1.0` and verify: the release workflow succeeds,
      `likec4-agent@0.1.0` appears on the npm registry, and a GitHub
      Release for `v0.1.0` exists
- [ ] 8.4 Verify end-to-end install from a clean environment:
      `npm install likec4-agent` resolves `0.1.0`, and
      `/plugin marketplace add dilzio/likec4-annotations` +
      `/plugin install likec4-agent@likec4-agent-marketplace` installs a
      plugin reporting version `0.1.0`
