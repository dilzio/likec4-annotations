# Spec Delta

## Purpose

Defines the three automated GitHub Actions workflows that validate pull
requests, build `main` on every merge, and publish a release when a semver
tag is pushed — including what each is explicitly forbidden from doing.

## ADDED Requirements

### Requirement: Pull request validation workflow
Every pull request SHALL trigger a workflow that builds, type-checks, and
tests `packages/cli`, and validates the plugin and marketplace manifests,
reporting pass/fail on the pull request before merge.

#### Scenario: Pull request opened or updated
- **WHEN** a pull request is opened or pushed to
- **THEN** CI SHALL run build, typecheck, and test for `packages/cli`, SHALL
  validate the plugin and marketplace manifest files, and SHALL report the
  result as a required check on the pull request

### Requirement: Dev build on merge to main never publishes
Merging to `main` SHALL automatically trigger a build that compiles,
type-checks, and tests both components and stamps the dev-build version
defined by the versioning-scheme capability. This workflow SHALL NOT
publish anything to npm and SHALL NOT modify the marketplace.

#### Scenario: Commit merged to main
- **WHEN** a commit is merged to `main`
- **THEN** CI SHALL run build, test, and typecheck and record a dev-build
  version, and SHALL NOT run `npm publish` or write to
  `.claude-plugin/marketplace.json`

### Requirement: Tag-triggered release workflow
Pushing a tag matching `v*` SHALL trigger a release workflow that verifies
the tag matches the committed version, publishes `packages/cli` to npm,
then creates a GitHub Release referencing that tag. This workflow SHALL NOT
commit or push changes back to `main`.

#### Scenario: Valid release tag pushed
- **WHEN** a maintainer pushes a tag `vX.Y.Z` on a commit whose version
  files already read `X.Y.Z`
- **THEN** the release workflow SHALL publish `packages/cli` version
  `X.Y.Z` to npm before performing any plugin-related release step, and
  SHALL then create a GitHub Release for that tag

#### Scenario: npm publish fails
- **WHEN** the npm publish step fails during a release run
- **THEN** the release workflow SHALL stop before any plugin-related
  release step and SHALL NOT create a GitHub Release
