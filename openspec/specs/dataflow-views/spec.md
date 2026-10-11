# dataflow-views Specification

## Purpose

Lets a developer tag relationships between annotated elements as ordered steps of a named flow,
and have `likec4-agent sync` deterministically generate a LikeC4 dynamic ("dataflow") view from
those steps, without hand-authoring any view file.

## Requirements

### Requirement: Annotate a relationship as a flow step
The `@likec4-rel` annotation SHALL accept an optional `flow:"<flowId>":<step>` parameter
declaring that the relationship is step `<step>` of the flow identified by `<flowId>`, and an
optional `flowTitle:"<title>"` parameter giving that flow a display title. Both params SHALL be
independent of, and combinable with, the existing `technology:` and `kind:` params.

#### Scenario: Relationship tagged with flow membership and step order
- **WHEN** a `@likec4-rel` tag includes `flow:"checkout":2`
- **THEN** the parsed relationship records flow id `checkout` and step `2`

#### Scenario: Relationship tagged with a flow title
- **WHEN** a `@likec4-rel` tag includes `flowTitle:"Checkout Flow"` alongside a `flow:` param
- **THEN** the parsed relationship records flow title `Checkout Flow` for that flow id

#### Scenario: Relationship with no flow param is unaffected
- **WHEN** a `@likec4-rel` tag omits `flow:`
- **THEN** the relationship parses exactly as it did before this change, with no flow membership

#### Scenario: Malformed flow parameter is flagged, not silently dropped
- **WHEN** a `@likec4-rel` tag contains text that looks like a `flow:` parameter but does not
  match the `flow:"<flowId>":<step>` shape (for example, a non-numeric step or a second `flow:`
  parameter on the same line)
- **THEN** sync reports the line as a malformed tag, the same way other malformed relationship
  tags are reported today, and does not emit a partial or guessed flow membership

### Requirement: Generate one dynamic view per flow
Running `likec4-agent sync` SHALL generate a dynamic view for every distinct flow id found across
all valid, resolved relationships, containing that flow's steps ordered by ascending step number,
written to a generated file the tool owns.

#### Scenario: Sync emits an ordered dynamic view
- **WHEN** relationships tagged `flow:"checkout":1`, `flow:"checkout":2`, and `flow:"checkout":3`
  exist across one or more annotated files
- **THEN** `likec4-agent sync` generates a `checkout` dynamic view whose steps appear in the order
  1, 2, 3, regardless of the order the source files were scanned in

#### Scenario: Flow title resolution
- **WHEN** exactly one relationship in a flow carries a `flowTitle:` value
- **THEN** the generated dynamic view uses that value as its title

#### Scenario: Missing flow title falls back to the flow id
- **WHEN** no relationship in a flow carries a `flowTitle:` value
- **THEN** the generated dynamic view's title is the flow id

#### Scenario: Conflicting flow titles are resolved deterministically
- **WHEN** two relationships in the same flow carry different `flowTitle:` values
- **THEN** sync uses the first occurrence (by file scan order) as the title and reports a warning
  about the conflict; it does not fail the run

#### Scenario: Duplicate step numbers within a flow are resolved deterministically
- **WHEN** two relationships in the same flow are both tagged with the same step number
- **THEN** sync breaks the tie deterministically (by source file, then source line) and reports a
  warning; it does not fail the run

### Requirement: Flow membership respects existing relationship validity
A relationship excluded from the model by existing resolution rules (dangling target, undeclared
relationship kind, or source element with an undeclared kind) SHALL also be excluded from any
flow it was tagged with, consistent with how it is excluded from `relationships.c4` today.

#### Scenario: A relationship with a dangling target is dropped from its flow
- **WHEN** a relationship tagged `flow:"checkout":2` targets an id that is not declared anywhere
  in the model
- **THEN** that relationship does not appear in the generated `checkout` dynamic view, and is
  reported under the existing dangling-target issue, not as a separate flow-specific error

### Requirement: Generated dynamic views are always valid
`likec4-agent sync` SHALL never write a dynamic view with zero steps, since an empty dynamic view
is invalid in the underlying LikeC4 model format and would break validation for the entire model.

#### Scenario: A flow whose only tagged relationship was dropped produces no view
- **WHEN** every relationship tagged with a given flow id is excluded per the requirement above
- **THEN** sync does not emit a dynamic view for that flow id at all

### Requirement: Sync report includes flow summary
The sync report SHALL include a summary of generated flows (flow count and step count per flow)
alongside the existing element and relationship summaries, so flow generation is observable the
same way element/relationship generation is today.

#### Scenario: Report reflects generated flows
- **WHEN** `likec4-agent sync` generates one or more dynamic views
- **THEN** the sync report includes an entry for each generated flow with its id and step count
