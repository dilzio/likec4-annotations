# Spec Delta

## Purpose

Defines the supported way to install and try the CLI and the plugin from
an exact, unreleased commit — directly from source, without consuming a
published package.

## ADDED Requirements

### Requirement: CLI installable from an exact commit
The documented pnpm git-subdirectory install syntax, pinned to a specific
commit SHA, SHALL remain a supported way to install an unreleased build of
the CLI directly from source without requiring an npm publish.

#### Scenario: Install the CLI at a specific commit
- **WHEN** a developer runs
  `pnpm add github:dilzio/likec4-annotations#<commit-sha>&path:packages/cli`
- **THEN** pnpm SHALL build and install the CLI exactly as it existed at
  that commit

### Requirement: Plugin installable from an exact ref
Adding the marketplace pinned to a specific git ref or commit SHALL install
the plugin exactly as it existed at that ref, without requiring a release
tag.

#### Scenario: Install the plugin from a branch or commit
- **WHEN** a developer runs
  `/plugin marketplace add dilzio/likec4-annotations#<ref>` followed by
  `/plugin install likec4-agent@likec4-agent-marketplace`
- **THEN** the installed plugin SHALL reflect `packages/claude-plugin`'s
  content exactly as of that ref
