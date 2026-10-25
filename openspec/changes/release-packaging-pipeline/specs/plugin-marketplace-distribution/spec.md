# Spec Delta

## Purpose

Defines the plugin's own manifest identity and the guarantee that the
self-hosted marketplace always reflects the plugin's current lockstep
version.

## ADDED Requirements

### Requirement: Plugin has its own manifest
`packages/claude-plugin` SHALL have a `.claude-plugin/plugin.json` manifest
declaring its `name`, `version`, and `description`. Its `version` SHALL
equal the lockstep version defined by the versioning-scheme capability at
every commit.

#### Scenario: Manifest version matches release
- **WHEN** a release `vX.Y.Z` is published
- **THEN** `packages/claude-plugin/.claude-plugin/plugin.json`'s `version`
  field SHALL read `X.Y.Z`

### Requirement: Marketplace entry matches the plugin's own version
The root `.claude-plugin/marketplace.json` plugin entry's `version` field
SHALL match `packages/claude-plugin/.claude-plugin/plugin.json`'s `version`
at every commit on `main`.

#### Scenario: Marketplace install resolves the current release
- **WHEN** a user runs `/plugin marketplace add dilzio/likec4-annotations`
  followed by `/plugin install likec4-agent@likec4-agent-marketplace` at a
  commit on `main`
- **THEN** the installed plugin's reported version SHALL match the
  marketplace entry's recorded `version`
