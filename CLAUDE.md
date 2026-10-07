# like-c4-agent

## LikeC4 architecture model

This repo keeps a [LikeC4](https://likec4.dev) model in `model/` in sync with
the code via `@likec4` / `@likec4-rel` tags embedded in doc comments. See
`docs/likec4-annotations.md` for the tag grammar, and run the `/likec4-sync`
command (`.claude/skills/likec4-sync/SKILL.md`) to regenerate
`model/generated/*.c4` after annotating code.
