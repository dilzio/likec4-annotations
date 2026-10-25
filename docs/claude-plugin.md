# Claude Code plugin

Thin Claude Code wrapper around the [`likec4-agent`](cli-reference.md) CLI.
Provides:

- `/likec4-sync` (skill `likec4-sync`): runs `npx likec4-agent sync` in the
  target repo and relays its report — all parsing/resolution logic lives in
  the CLI, not here.
- `/likec4-annotate` (skill `likec4-annotate`): an interactive, checkpointed
  workflow that scans a codebase with no (or partial) `@likec4` annotations
  and proposes/writes `@likec4`/`@likec4-rel`/flow tags for explicit
  approval, with a resumable on-disk progress manifest. See
  [`skills/likec4-annotate/SKILL.md`](../packages/claude-plugin/skills/likec4-annotate/SKILL.md)
  for the full staged workflow. It never runs `likec4-agent sync` itself —
  use `/likec4-sync` afterward to turn the written tags into the model.

## Install

```
/plugin marketplace add dilzio/likec4-annotations
/plugin install likec4-agent@likec4-agent-marketplace
```

This resolves the plugin at its most recently released version (see
`.claude-plugin/plugin.json`). Requires the target repo to have
`likec4-agent` installed (as a `devDependency`, or resolvable via `npx`).

Want to try the plugin as it exists at an exact, unreleased commit or
branch instead of the latest release? See
[`docs/development.md`](development.md#testing-an-unreleased-commit).
