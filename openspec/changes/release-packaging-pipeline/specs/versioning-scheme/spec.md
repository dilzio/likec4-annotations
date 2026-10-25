# Spec Delta

## Purpose

Defines the single lockstep semver version shared by the CLI and the
Claude plugin, where that version is recorded, and the distinct version
format used by CI-only development builds on `main`.

## ADDED Requirements

### Requirement: Lockstep semver across CLI and plugin
The CLI and the Claude plugin SHALL share one semver version at any given
commit. That version SHALL be recorded identically in
`packages/cli/package.json`, `.claude-plugin/plugin.json`, and the plugin's
entry in `.claude-plugin/marketplace.json`.

#### Scenario: Version bump commit updates all three files
- **WHEN** a maintainer prepares a release by bumping the version
- **THEN** `packages/cli/package.json`, `.claude-plugin/plugin.json`, and
  the plugin entry's `version` field in `.claude-plugin/marketplace.json`
  SHALL all read the same semver value in that commit

### Requirement: Release tag must match the committed version
A release SHALL only proceed when the pushed tag's version exactly matches
the version recorded in `packages/cli/package.json` at the tagged commit.

#### Scenario: Tag does not match committed version
- **WHEN** a tag `vX.Y.Z` is pushed whose `X.Y.Z` does not equal
  `packages/cli/package.json`'s version at that commit
- **THEN** the release process SHALL fail before publishing anything and
  SHALL report the mismatch

### Requirement: Distinct dev-build version scheme
Builds produced automatically on merge to `main` SHALL be stamped with a
version format distinct from released semver, sorting as a prerelease
relative to any real release, and never colliding with or being mistaken
for a released version.

#### Scenario: Dev build on merge to main
- **WHEN** a commit is merged to `main` that is not itself a tagged release
  commit
- **THEN** CI SHALL compute a dev-build version distinct from any released
  semver, derived from a build/run identifier and the commit SHA (for
  example `0.0.0-dev.<n>+<shortsha>`)
