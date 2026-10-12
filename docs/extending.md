# Extending

- **New element/relationship kinds**: declare them in your repo's
  `model/specification.c4` first; the CLI flags any annotation using an
  undeclared kind rather than inventing one.
- **New languages**: the tag grammar matches on the literal strings
  `@likec4`/`@likec4-rel` regardless of comment delimiter, so JSDoc, Python
  docstrings/`#`-comments, and Go `//`-comments all work without changes to
  the CLI — see the Python/Go examples in
  `packages/cli/docs/likec4-annotations.md`.
- **Other coding agents**: the CLI is agent-agnostic by design. A new
  adapter (e.g. for Cursor) is a thin wrapper analogous to
  `packages/claude-plugin`, not a reimplementation of the parsing pipeline.
- **Scaffolding brand-new consumer repos**: out of scope for now — a
  `likec4-agent init` command is a deliberate follow-up, not yet built.
