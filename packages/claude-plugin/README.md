# likec4-agent (Claude Code plugin)

Thin Claude Code wrapper around the [`likec4-agent`](../cli) CLI. Provides
the `/likec4-sync` command and `likec4-sync` skill, which run
`npx likec4-agent sync` in the target repo and relay its report — all
parsing/resolution logic lives in the CLI, not here.

## Install

```
/plugin marketplace add <git-url-of-this-repo>
/plugin install likec4-agent@likec4-agent-marketplace
```

Requires the target repo to have `likec4-agent` installed (as a
`devDependency`, or resolvable via `npx`).
