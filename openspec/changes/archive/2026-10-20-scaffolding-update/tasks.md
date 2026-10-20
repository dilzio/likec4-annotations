# Tasks

## 1. Root-dir flag consolidation

- [x] 1.1 In `packages/cli/src/types.ts`, replace `SyncOptions.cwd` with
      `rootDir`, keep `modelDir` on the resolved options object as a derived
      field (not a raw input), and add an `InitOptions` type of
      `{ rootDir: string }`. Verify the package still builds (`tsc --noEmit`).
- [x] 1.2 In `packages/cli/src/config.ts`, update `RawSyncFlags` to accept
      `rootDir?: string` (drop `cwd?`/`modelDir?`), resolve
      `rootDir = resolve(flags.rootDir ?? process.cwd())`, and derive
      `modelDir = \`${rootDir}/c4-agent\``. Add a `resolveInitOptions` helper
      that resolves just `{ rootDir }` with the same default. Verify with
      unit tests covering the default (`process.cwd()`) and an explicit
      `--root-dir` override for both resolvers.
- [x] 1.3 In `packages/cli/src/index.ts`, replace `sync`'s `--cwd`/
      `--model-dir` options with a single `--root-dir <path>` option
      (default `process.cwd()`). Verify by running
      `likec4-agent sync --help` and confirming `--root-dir` is listed and
      `--cwd`/`--model-dir` are not.

## 2. `init` command

- [x] 2.1 Create `packages/cli/src/commands/init.ts` exporting
      `runInit(opts: InitOptions)` that checks
      `existsSync(join(opts.rootDir, "c4-agent"))` and, if true, returns a
      non-zero result without writing any file. Verify with a unit test:
      running `runInit` twice against the same temp directory leaves the
      first run's files byte-for-byte unchanged and the second call reports
      failure.
- [x] 2.2 Implement the three scaffolded file writers in `init.ts`
      (`specification.c4`, `views/landscape.c4`,
      `manual/external-systems.c4`) with the exact content defined in the
      `project-init` spec and proposal.md. Verify with a unit test asserting
      each file's contents and that `manual/relationships.c4` is NOT
      created.
- [x] 2.3 Register the `init` command in `index.ts` with the shared
      `--root-dir <path>` option, wired to `runInit`. Verify by running
      `likec4-agent init` in an empty temp directory: exit code 0 and all
      three files exist at the expected paths.
- [x] 2.4 Run `likec4 validate` against a freshly-`init`'d directory (no
      annotated source yet) to confirm the scaffolded files alone form a
      valid LikeC4 model. Verify: `likec4 validate` exits 0.

## 3. Update existing pipeline code and tests for the new flag

- [x] 3.1 Audit `discovery/findAnnotatedFiles.ts` and
      `report/buildReport.ts` for any direct references to the old
      `cwd`/`modelDir` option names and update them to read from the
      resolved `SyncOptions` shape from task 1.1. Verify existing unit tests
      (`resolve.test.ts`, `emit.test.ts`, `flows.test.ts`) still pass
      unmodified.
- [x] 3.2 Update `packages/cli/test/sync.integration.test.ts` to call
      `resolveSyncOptions({ rootDir: dir, validate: false })` and write
      fixtures under `c4-agent/` instead of `model/`. Verify: the test suite
      passes.
- [x] 3.3 Add a test asserting that `likec4-agent sync --cwd <path>` and
      `likec4-agent sync --model-dir <path>` are rejected as unknown
      options. Verify: the test asserts a non-zero exit and an
      unknown-option error for each removed flag.

## 4. Migrate `demo/` to the new layout

- [x] 4.1 Recreate `demo/model/**`'s contents under `demo/c4-agent/**`
      (`specification.c4`, `manual/external-systems.c4`,
      `manual/relationships.c4`, `views/landscape.c4`, `generated/*`) and
      remove `demo/model/`. Verify: `demo/model/` no longer exists and
      `demo/c4-agent/` contains the same file contents at the new paths.
- [x] 4.2 Run `likec4-agent sync` and `likec4 validate` against the migrated
      `demo/` and confirm the generated output matches the pre-migration
      content (modulo path references). Verify:
      `npm run likec4:sync --workspace demo` and
      `npm run likec4:validate --workspace demo` both exit 0.
- [x] 4.3 Run `likec4 build` against the migrated `demo/` to confirm LikeC4
      discovers `.c4` files under `c4-agent/` with no `likec4.config.json`
      changes needed. Verify: `npm run likec4:build --workspace demo`
      succeeds and produces the `landscape` and `checkout` views.

## 5. Documentation

- [x] 5.1 Update `README.md`'s quickstart to reference `likec4-agent init`
      and `c4-agent/` instead of a hand-created `model/specification.c4`.
      Verify: no remaining references to hand-creating `model/specification.c4`
      as a prerequisite.
- [x] 5.2 Update `docs/usage.md` to start the walkthrough with
      `likec4-agent init`, and update its `model/**`, `--cwd`, and
      `--model-dir` references to `c4-agent/` and `--root-dir`. Verify:
      `grep -n "model/" docs/usage.md` returns no stale references.
- [x] 5.3 Update `docs/cli-reference.md`'s flag table to show `--root-dir`
      (removing `--cwd`/`--model-dir`) and document the new `init` command's
      flags and exit codes. Verify: the flag table lists `--root-dir` only.
- [x] 5.4 Update `docs/architecture.md`'s pipeline diagram and monorepo
      layout table to reference `c4-agent/` instead of `model/`. Verify:
      `grep -n "model/" docs/architecture.md` returns no stale references.
- [x] 5.5 Update `packages/cli/docs/likec4-annotations.md`'s references to
      `model/specification.c4`, `model/generated/**`, and `model/manual/**`
      to their `c4-agent/` equivalents. Verify:
      `grep -n "model/" packages/cli/docs/likec4-annotations.md` returns no
      stale references.
- [x] 5.6 Update `packages/claude-plugin/skills/likec4-sync/SKILL.md` and
      `packages/claude-plugin/skills/likec4-annotate/SKILL.md` for any
      `model/`-path references, including the annotate skill's
      `<model-dir>/.annotate/progress.json` manifest path wording. Verify:
      `grep -rn "model/" packages/claude-plugin/` returns no stale
      references.
