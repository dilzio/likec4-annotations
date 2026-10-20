# project-init Specification

## Purpose

Lets a developer bootstrap a new `likec4-agent` project in one command by
scaffolding the `c4-agent/` directory and its starter specification, view,
and manual files, removing the need to hand-author them before the first
`sync`.

## Requirements

### Requirement: `init` scaffolds the project directory
The `likec4-agent init` command SHALL create a `c4-agent/` directory at the
resolved root directory, containing `specification.c4`, `views/landscape.c4`,
and `manual/external-systems.c4`.

#### Scenario: Fresh project
- **WHEN** `likec4-agent init` is run in a directory with no existing
  `c4-agent/` directory
- **THEN** the command creates `c4-agent/specification.c4`,
  `c4-agent/views/landscape.c4`, and `c4-agent/manual/external-systems.c4`,
  and exits 0

### Requirement: `init` never overwrites an existing directory
If `c4-agent/` already exists at the resolved root directory,
`likec4-agent init` SHALL exit with a non-zero status and SHALL NOT write,
modify, or delete any file.

#### Scenario: Existing c4-agent directory
- **WHEN** `likec4-agent init` is run in a directory where `c4-agent/`
  already exists
- **THEN** the command exits non-zero, prints an error indicating the
  directory already exists, and leaves every existing file under
  `c4-agent/` unchanged

### Requirement: Scaffolded specification taxonomy
The generated `c4-agent/specification.c4` SHALL declare the element kinds
`person`, `softwareSystem`, `container`, and `component`, an `async`
relationship kind, and an `external` tag.

#### Scenario: Default specification content
- **WHEN** `likec4-agent init` scaffolds a new project
- **THEN** `c4-agent/specification.c4` declares `person`, `softwareSystem`,
  `container`, and `component` elements, the `async` relationship kind, and
  the `external` tag, and the file is a syntactically valid LikeC4
  specification block

### Requirement: Scaffolded landscape view
The generated `c4-agent/views/landscape.c4` SHALL define a view named
`landscape` that includes every element in the model.

#### Scenario: Default landscape view
- **WHEN** `likec4-agent init` scaffolds a new project
- **THEN** `c4-agent/views/landscape.c4` defines a `landscape` view with
  `include *`

### Requirement: Scaffolded external-systems manual file
The generated `c4-agent/manual/external-systems.c4` SHALL contain an empty
`model { }` block plus comments instructing the user how to hand-declare
external systems and cross-cutting relationships. `likec4-agent init` SHALL
NOT scaffold a separate `manual/relationships.c4` file.

#### Scenario: Default external-systems file
- **WHEN** `likec4-agent init` scaffolds a new project
- **THEN** `c4-agent/manual/external-systems.c4` contains an empty
  `model { }` block and comments explaining how to hand-declare external
  systems and relationships, and no `c4-agent/manual/relationships.c4` file
  is created
