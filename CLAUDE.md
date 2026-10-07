# like-c4-agent

This repo is the home of **likec4-agent**: a deterministic CLI
(`packages/cli`) plus a thin Claude Code plugin wrapper
(`packages/claude-plugin`) that sync a [LikeC4](https://likec4.dev)
architecture model from `@likec4`/`@likec4-rel` tags embedded in code doc
comments. The tag grammar is bundled with the CLI
(`packages/cli/docs/likec4-annotations.md`), not a per-repo editable file.

`demo/` is a worked example consuming the CLI like any real project would
— it is not part of the published package, and doubles as this repo's
end-to-end smoke test. See the root `README.md` for the full monorepo
layout and how to run things.
