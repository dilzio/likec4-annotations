# Annotation tag grammar

The `@likec4` / `@likec4-rel` tag grammar is a minimal, comment-syntax-agnostic
convention: tags live inside doc comments you'd write anyway (JSDoc, Python
docstrings, Go line comments, etc.), not a separate metadata file. They
declare architecture elements and relationships that the CLI discovers,
resolves, and syncs into the generated LikeC4 model.

Full grammar, rules, and multi-language examples:
[`packages/cli/docs/likec4-annotations.md`](../packages/cli/docs/likec4-annotations.md).

