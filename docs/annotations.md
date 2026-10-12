# Annotation tag grammar

The `@likec4` / `@likec4-rel` tag grammar is a minimal, comment-syntax-agnostic
convention: tags live inside doc comments you'd write anyway (JSDoc, Python
docstrings, Go line comments, etc.), not a separate metadata file. They
declare architecture elements and relationships that the CLI discovers,
resolves, and syncs into the generated LikeC4 model.

Full grammar, rules, and multi-language examples:
[`packages/cli/docs/likec4-annotations.md`](../packages/cli/docs/likec4-annotations.md).

That file is a pointer target, not duplicated content here, because it
ships inside the installed CLI package and is read at a fixed path by the
`likec4-annotate` skill — moving or copying it would risk drifting out of
sync with the version of the CLI actually installed.
