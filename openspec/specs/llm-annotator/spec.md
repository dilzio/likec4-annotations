# llm-annotator Specification

## Purpose

Lets a developer point this tool at a codebase with no existing `@likec4` annotations
and get a reviewed, checkpointed first draft of element, relationship, and flow tags
written into their source, ready for the existing deterministic sync pipeline.

## Requirements

### Requirement: Repo Scan and Chunk Plan
The annotator SHALL scan the target codebase and produce an ordered chunk plan
(directory- or service-sized units of source files) before proposing any
element, relationship, or flow tag.

#### Scenario: Scan produces a complete chunk plan
- **WHEN** the annotator is run against a codebase
- **THEN** it produces a chunk plan that covers every source file discoverable
  under the same default exclusions used by `likec4-agent sync` (e.g.
  `node_modules`, `.git`, `dist`, build output, binary assets), in a
  deterministic processing order

### Requirement: Specification Taxonomy Checkpoint
The annotator SHALL propose a `model/specification.c4` element/relationship
kind taxonomy and SHALL NOT propose or write any element or relationship tag
until the user has explicitly approved (or edited) that taxonomy.

#### Scenario: Taxonomy approved before tagging begins
- **WHEN** the user approves the proposed taxonomy
- **THEN** the annotator proceeds to per-chunk tag proposals using only kinds
  present in the approved taxonomy

#### Scenario: Existing specification.c4 is present
- **WHEN** the target codebase already declares a `model/specification.c4`
- **THEN** the annotator proposes only additions needed for kinds it cannot
  already satisfy, reusing every existing declared kind rather than
  redefining or duplicating it

### Requirement: Per-Chunk Tag Checkpoint and Write
For each chunk in the plan, the annotator SHALL propose `@likec4` element tags
and `@likec4-rel` relationship tags grounded in the approved taxonomy, present
them for review, and SHALL only write tags into that chunk's source files
after explicit per-chunk approval.

#### Scenario: Chunk approved
- **WHEN** the user approves a chunk's proposed tags
- **THEN** the annotator writes those tags into that chunk's source files only,
  leaving every other chunk's files unmodified

#### Scenario: Chunk revision requested
- **WHEN** the user requests changes to a chunk's proposed tags
- **THEN** the annotator presents a revised proposal for that chunk and SHALL
  NOT write any file for that chunk until the revised proposal is approved

### Requirement: Element ID Stability Within a Run
Once the annotator assigns an id to an element, it SHALL reuse that exact id
for every later reference to that element within the same run, and SHALL NOT
reassign or rename it.

#### Scenario: Later chunk references an earlier element
- **WHEN** a relationship proposed in a later chunk targets an element tagged
  in an earlier, already-approved chunk
- **THEN** the proposed relationship references that element's exact
  previously assigned id

### Requirement: Flow Inference After Full Relationship Set
Only after every chunk's relationship tags are approved and written SHALL the
annotator infer flow groupings across the complete relationship set and
propose `flow:`/`flowTitle:` tags, presenting them for review and pruning
before writing any of them.

#### Scenario: Flow spans multiple chunks
- **WHEN** a plausible flow's steps are relationships that were tagged in two
  or more different chunks
- **THEN** the annotator only proposes that flow after all of the chunks
  contributing a step to it have been approved and written

#### Scenario: Proposed flow is pruned
- **WHEN** the user removes a proposed flow during the flow checkpoint
- **THEN** the annotator does not write any `flow:`/`flowTitle:` tag for that
  flow

### Requirement: Persistent Progress Manifest
The annotator SHALL maintain an on-disk progress manifest recording the
approved taxonomy, each chunk's status, and every assigned element id, updated
after each checkpoint, stored outside `model/generated/`, `model/manual/`, and
`model/views/`.

#### Scenario: Resuming a paused run
- **WHEN** a new session is started against a codebase with an existing
  progress manifest from a prior, incomplete run
- **THEN** the annotator resumes from the first incomplete chunk using the
  manifest's recorded taxonomy and assigned ids, without re-proposing already
  approved chunks

### Requirement: Grammar Conformance
Every tag the annotator writes SHALL conform to the `@likec4`/`@likec4-rel`
grammar bundled with the installed `likec4-agent` CLI, so that
`likec4-agent sync` can discover and resolve it without modification.

#### Scenario: Sync consumes annotator output unmodified
- **WHEN** `likec4-agent sync` is run against source files the annotator has
  written tags into
- **THEN** it discovers and resolves those tags with no malformed-tag warning
  attributable to the annotator's output

### Requirement: No Writes Without Checkpoint Approval
The annotator SHALL NOT write any taxonomy change, element/relationship tag,
flow tag, or progress manifest update to disk without a preceding explicit
user approval at the corresponding checkpoint.

#### Scenario: Unapproved chunk remains untouched
- **WHEN** a chunk's proposed tags have been presented but not yet approved
- **THEN** no source file in that chunk has been modified on disk
