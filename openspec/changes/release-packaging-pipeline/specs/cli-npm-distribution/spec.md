# Spec Delta

## Purpose

Defines the CLI's identity as a publishable npm package and the guarantee
that a release tag results in that exact version being available on npm.

## ADDED Requirements

### Requirement: CLI published as an installable npm package
`packages/cli` SHALL be publishable to the public npm registry under the
package name `likec4-agent`, SHALL NOT be marked `private`, and
`npm install likec4-agent` SHALL be the primary supported way to obtain the
CLI.

#### Scenario: Fresh npm install after a release
- **WHEN** a user runs `npm install likec4-agent` after version `X.Y.Z` has
  been released
- **THEN** npm SHALL install `likec4-agent@X.Y.Z` with a working
  `likec4-agent` bin entry

#### Scenario: Running the CLI via npx
- **WHEN** a user runs `npx likec4-agent --version` after a release
- **THEN** the reported version SHALL match the most recently published
  release's semver
