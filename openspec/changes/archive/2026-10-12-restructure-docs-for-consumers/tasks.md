# Tasks

## 1. Create the `/docs` folder

- [x] 1.1 Create `docs/architecture.md` with the pipeline diagram, the
      write-boundary and dangling-relationship design-decision prose
      (moved from current README "Architecture" section), and the
      monorepo layout table (link targets updated to
      `docs/cli-reference.md` / `docs/claude-plugin.md`) — verify by
      diffing its content against the corresponding README sections being
      removed in task 3.1, confirming nothing was dropped.
- [x] 1.2 Create `docs/usage.md` with the full Usage walkthrough (steps
      0-4: bootstrapping via `likec4-annotate`, annotating code, running
      sync, viewing the model, everyday workflow loop + idempotency note),
      generalizing the "view the model" commands to plain `likec4 start` /
      `likec4 build` with the `--workspace demo` variants kept as a
      parenthetical for this repo's own demo — verify by confirming every
      code block in the new file is a valid, runnable command (no leftover
      monorepo-only assumptions presented as the primary instruction).
- [x] 1.3 Create `docs/cli-reference.md` absorbing `packages/cli/README.md`'s
      flags table and exit codes, plus a short "installing the CLI" intro
      so the page is self-sufficient if reached directly — verify the
      flags table matches `packages/cli/README.md`'s current content
      exactly (no flags added, removed, or redescribed).
- [x] 1.4 Create `docs/claude-plugin.md` absorbing
      `packages/claude-plugin/README.md`'s content, with the real GitHub
      URL (`https://github.com/dilzio/likec4-annotations`) substituted for
      the `<git-url-of-this-repo>` placeholder in the install commands —
      verify by grepping the new file for `<git-url-of-this-repo>` and
      confirming zero matches.
- [x] 1.5 Create `docs/annotations.md` as a pointer page: what the tag
      grammar is, a link to `packages/cli/docs/likec4-annotations.md`, and
      a one-sentence explanation of why it's a pointer rather than a copy
      (pnpm subdirectory install confinement, per design.md Decision 2) —
      verify the link resolves to the existing file at that path.
- [x] 1.6 Create `docs/extending.md` with the current README "Extending"
      section moved near-verbatim (new kinds/languages, new agent
      adapters, future `likec4-agent init`) — verify by diffing against
      the README section being removed in task 3.1.
- [x] 1.7 Create `docs/development.md` with: build/test/typecheck commands
      and the rebuild-before-npx caveat (from current README
      "Installation" + "Development"), iterating on the Claude plugin
      locally via `/plugin marketplace add <path>` (from "Development"),
      and a reframed "why distribution is git-only" section that presents
      the pnpm recommendation as the supported path rather than restating
      the old "Known limitation" as still-blocking — verify by confirming
      every command in the file runs successfully from a clean checkout
      (`npm install`, `npm run build --workspace packages/cli`,
      `npm rebuild`, `npm run typecheck/test --workspace packages/cli`).
- [x] 1.8 Create `docs/README.md` as an index linking to every file above
      in reading order (architecture → usage → cli-reference →
      claude-plugin → annotations → extending → development) — verify all
      links resolve (no 404s when rendered on GitHub or via a local
      markdown link checker).

## 2. Validate the recommended install method

- [x] 2.1 From a scratch temp directory, run
      `pnpm add github:dilzio/likec4-annotations#path:packages/cli`
      against the real repo and confirm it succeeds, the `likec4-agent`
      bin resolves (`npx likec4-agent --version` inside that temp
      project), and `node_modules/likec4-agent/docs/likec4-annotations.md`
      is present — if it fails or the grammar file is missing, stop and
      follow design.md's Risk mitigation (fall back to documenting
      clone+build as the primary method) before continuing to section 3.
      **Outcome**: initial run against the then-current repo state failed
      (`dist/` missing — no `prepare` script existed to build it on a git
      install). Fixed by adding `"prepare": "npm run build"` to
      `packages/cli/package.json` (see 5.1). Re-validated against a local
      git fixture (not the pushed remote, to avoid pushing mid-implementation)
      using `git+file://` subdirectory syntax: surfaced a second,
      structural issue — pnpm v10+ refuses to run a git dependency's build
      script unless allow-listed in `pnpm-workspace.yaml`, keyed to the
      *exact resolved commit hash* (confirmed: a bare package-name entry
      and `--allow-build <pkg>` both fail to satisfy it). Per explicit user
      decision, the Quickstart keeps the pnpm command as the headline
      install but documents the two-step dance (install fails once →
      paste the hash-pinned `allowBuilds` entry from the error → re-run) —
      see `docs/cli-reference.md` "Installing the CLI" and
      `docs/development.md` "Why distribution is git-only". **Residual**:
      a live end-to-end confirmation against the actual pushed
      `github.com/dilzio/likec4-annotations` HEAD (as opposed to the local
      fixture) still needs to happen once this branch is pushed, since
      pushing mid-implementation was out of scope for this session.

## 3. Replace package READMEs with stubs

- [x] 3.1 Replace `packages/cli/README.md` with a 5-10 line stub pointing
      to `docs/cli-reference.md` — verify the stub file still exists (not
      deleted, since it's in `packages/cli/package.json`'s `files` field)
      and its link resolves. **Note**: linked via the absolute GitHub URL
      (`.../blob/main/docs/cli-reference.md`), not a relative path — a
      relative `../../docs/cli-reference.md` link would 404 once this
      stub ships inside `node_modules/likec4-agent/` without the rest of
      the monorepo.
- [x] 3.2 Replace `packages/claude-plugin/README.md` with a 5-10 line stub
      pointing to `docs/claude-plugin.md` — verify the stub's link
      resolves and the file still exists. Same absolute-URL reasoning as
      3.1.

## 4. Rewrite the root README

- [x] 4.1 Rewrite `README.md` per design.md's outline: title/pitch (fixing
      the "published npm package" mischaracterization), functional
      overview (trimmed "Functional scope" bullets + pointer to
      `docs/architecture.md`), Quickstart (Node ≥20 + pnpm prerequisite,
      the validated install command from task 2.1, optional Claude plugin
      install with the real GitHub URL, a minimal annotate→sync→view
      example), a "Learn more" section linking into `/docs`, and a
      one-line "Contributing" pointer to `docs/development.md` — verify
      the result is roughly 60-90 lines and every internal link resolves.
      **Outcome**: 78 lines; all internal links verified to resolve;
      Quickstart's install command includes a one-line note about the
      expected first-run `allowBuilds` failure, per task 2.1's finding.

## 5. Packaging metadata

- [x] 5.1 Add a `repository` field to `packages/cli/package.json`
      (`{"type": "git", "url": "git+https://github.com/dilzio/likec4-annotations.git", "directory": "packages/cli"}`)
      and `"private": true` — verify `npm run build --workspace packages/cli`
      and `npm test --workspace packages/cli` still pass after the change
      (confirms the new fields don't break the existing build/test
      pipeline). **Also added** `"prepare": "npm run build"` — not in the
      original task text, but required to fix the task 2.1 install
      blocker (see that task's outcome note); added with explicit user
      sign-off.
- [x] 5.2 Add a `repository` field to the root `package.json`
      (`{"type": "git", "url": "git+https://github.com/dilzio/likec4-annotations.git"}`)
      — verify `npm install` at the repo root still succeeds (confirms
      valid JSON and no workspace resolution regression). **Outcome**:
      verified, succeeds.

## 6. Cross-reference touch-ups

- [x] 6.1 Fix the "published npm package" wording in `CLAUDE.md` to match
      the README fix in task 4.1 — verify by grepping `CLAUDE.md` for
      "published" and confirming the remaining text accurately describes
      git-only distribution. **Outcome**: zero matches remain.
- [x] 6.2 Add the concrete pnpm install example
      (`pnpm add -D github:dilzio/likec4-annotations#path:packages/cli`)
      as an example alongside the existing "devDependency / git
      dependency" fallback guidance in
      `packages/claude-plugin/skills/likec4-sync/SKILL.md` step 1 — a
      one-sentence addition, not a rewrite — verify by re-reading the
      file's "Resolve the CLI" step and confirming the rest of the skill's
      guardrails/behavior are unchanged. **Outcome**: added inline to
      step 1's existing sentence; rest of the file unchanged.

## 7. Final verification sweep

- [x] 7.1 Grep the whole repo for `packages/cli/README.md` and
      `packages/claude-plugin/README.md` as link targets, and for any
      remaining `<git-url-of-this-repo>` placeholder text — verify zero
      matches outside the stub files themselves (which legitimately
      reference their own former content's new home). **Outcome**: zero
      matches anywhere outside `openspec/changes/` planning artifacts
      (and one historical `llm-workflow` tasks.md entry) — no live doc or
      source file references the old filenames or placeholder.
- [x] 7.2 Confirm `packages/cli/docs/likec4-annotations.md` was not moved,
      edited, or duplicated anywhere — verify with
      `git status`/`git diff` showing no changes under
      `packages/cli/docs/`. **Outcome**: confirmed, zero changes.
- [x] 7.3 Run `npm run typecheck --workspace packages/cli` and
      `npm test --workspace packages/cli` one final time after all changes
      — verify both pass, confirming the docs/packaging restructure made
      no accidental application-code changes. **Outcome**: both pass (45
      tests, 6 files).
