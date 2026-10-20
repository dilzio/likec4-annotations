# Spec Delta

## MODIFIED Requirements

### Requirement: Specification Taxonomy Checkpoint
The annotator SHALL propose a `c4-agent/specification.c4` element/relationship
kind taxonomy and SHALL NOT propose or write any element or relationship tag
until the user has explicitly approved (or edited) that taxonomy. The
proposed taxonomy SHALL NOT include `softwareSystem` as an available kind
unless `c4-agent/manual/**` already declares at least one non-`#external`
`softwareSystem` element, signaling that this codebase is one of several
systems in a shared model. An existing `#external` `softwareSystem` element
does not count toward this signal - it models a third-party dependency
outside this codebase, the same hand-authored pattern available regardless
of whether this repo is single- or multi-system, and so is not evidence of
the latter.

#### Scenario: Taxonomy approved before tagging begins
- **WHEN** the user approves the proposed taxonomy
- **THEN** the annotator proceeds to per-chunk tag proposals using only kinds
  present in the approved taxonomy

#### Scenario: Existing specification.c4 is present
- **WHEN** the target codebase already declares a `c4-agent/specification.c4`
- **THEN** the annotator proposes only additions needed for kinds it cannot
  already satisfy, reusing every existing declared kind rather than
  redefining or duplicating it

#### Scenario: No existing software system declared
- **WHEN** `c4-agent/manual/**` contains no non-`#external` `softwareSystem`
  element
- **THEN** the proposed taxonomy omits `softwareSystem`, and the annotator's
  top-level proposed elements are `container`/`component`-kinded with no
  enclosing system

#### Scenario: Existing software system signals a multi-system model
- **WHEN** `c4-agent/manual/**` already declares at least one non-`#external`
  `softwareSystem` element
- **THEN** the proposed taxonomy includes `softwareSystem` as an available
  kind

#### Scenario: Only external software systems declared
- **WHEN** `c4-agent/manual/**` declares one or more `softwareSystem`
  elements, all tagged `#external`, and no non-`#external` `softwareSystem`
  element
- **THEN** the proposed taxonomy omits `softwareSystem`, the same as if none
  were declared at all

### Requirement: Persistent Progress Manifest
The annotator SHALL maintain an on-disk progress manifest recording the
approved taxonomy, each chunk's status, every assigned element id, and the
composition pass's status, updated after each checkpoint, stored outside
`c4-agent/generated/`, `c4-agent/manual/`, and `c4-agent/views/`.

#### Scenario: Resuming a paused run
- **WHEN** a new session is started against a codebase with an existing
  progress manifest from a prior, incomplete run
- **THEN** the annotator resumes from the first incomplete chunk using the
  manifest's recorded taxonomy and assigned ids, without re-proposing already
  approved chunks

#### Scenario: Resuming after chunks are done but composition pass is pending
- **WHEN** a new session is started against a codebase whose progress
  manifest shows every chunk `done` but the composition pass not yet
  completed
- **THEN** the annotator resumes directly at the composition pass without
  re-proposing any chunk's elements or relationships

## ADDED Requirements

### Requirement: Element Granularity Default
When proposing elements for a chunk, the annotator SHALL default to one
element per chunk (package/service directory), and SHALL propose a
sub-element only when that sub-part has relationships of its own - calls out
to, or is called by, something other than what its sibling sub-parts relate
to - grounded the same way any other proposed relationship is grounded.

#### Scenario: Chunk with no internal relationship distinctions
- **WHEN** a chunk's files have no grep-visible relationships that
  distinguish one file/class from another within the chunk
- **THEN** the annotator proposes a single element for the whole chunk,
  rather than one element per file or class

#### Scenario: Chunk with a distinguishable sub-part
- **WHEN** a file or class within a chunk has its own grounded relationship
  (e.g. it alone imports/calls something no sibling in the chunk does, or it
  alone is imported/called by something outside the chunk)
- **THEN** the annotator proposes that file/class as its own element,
  separate from the chunk's representative element

### Requirement: Composition Pass
After every chunk in the progress manifest reaches `done`, and before the
run's closing summary, the annotator SHALL run a single composition pass
over the complete accumulated set of proposed elements and relationships,
SHALL propose `parent:<id>` for elements that pass the composition test
below, and SHALL NOT write any `parent:` value to a source file without
explicit approval at a dedicated composition-pass checkpoint.

Composition test, applied per candidate element X with apparent sole owner A:
- If X is referenced by more than one other element in the complete
  accumulated model, X SHALL be left without a `parent:` (a peer element,
  related only via `@likec4-rel`).
- Otherwise, if X has at least one grounded relationship of its own beyond
  its relationship to A (something X calls, or something that calls X,
  other than A), the annotator SHALL propose `parent:A` for X. If a direct
  `@likec4-rel` relationship already exists between X and A (in either
  direction) - the common case, since that relationship is typically what
  established X's exclusive ownership by A in the first place - the
  annotator SHALL also propose removing that relationship line as part of
  the same composition-pass checkpoint: LikeC4 rejects a direct relationship
  between a parent and its own child, and the containment expressed by
  `parent:A` already conveys the association, so the separate edge becomes
  both redundant and invalid once nesting is applied.
- Otherwise (X has exactly one relationship, to A, and no relationships of
  its own), the annotator SHALL propose folding X back into A - removing X as
  a separate element - rather than proposing `parent:A`.

Nesting depth defaults to one level beyond an element's base chunk element;
the annotator SHALL only propose a second level of nesting on a candidate
that itself independently passes the composition test against its own
proposed parent.

A `parent:` candidate whose proposed parent is outside the candidate's own
chunk SHALL require at least one grep-visible (import/call-site) relationship
grounding the ownership, not inferred from naming or directory proximity
alone.

#### Scenario: Composition pass runs once, after all chunks
- **WHEN** every chunk in the progress manifest has status `done`
- **THEN** the annotator runs the composition pass before presenting the
  run's closing summary, and does not propose any `parent:` value during an
  individual chunk's own checkpoint

#### Scenario: Element referenced by exactly one other element
- **WHEN** a proposed element X is targeted by exactly one other element's
  relationship, and X has at least one relationship of its own to something
  besides that element
- **THEN** the annotator proposes `parent:<the-one-caller's-id>` for X at the
  composition-pass checkpoint

#### Scenario: Sole owner already has a direct relationship with the candidate
- **WHEN** a proposed element X has exactly one other element A referencing
  it, X has at least one relationship of its own beyond its relationship to
  A, and a direct `@likec4-rel` relationship already exists between X and A
  (in either direction)
- **THEN** the annotator proposes `parent:A` for X and also proposes removing
  the direct relationship between X and A, both at the same composition-pass
  checkpoint

#### Scenario: Element referenced by more than one other element
- **WHEN** a proposed element X is targeted by relationships from two or more
  distinct other elements
- **THEN** the annotator does not propose a `parent:` for X, leaving its
  existing `@likec4-rel` relationships unchanged

#### Scenario: Element with a single caller and no independent relationships
- **WHEN** a proposed element X has exactly one relationship in the
  accumulated model, targeting (or targeted by) a single other element A,
  and no other relationship
- **THEN** the annotator proposes folding X back into A instead of proposing
  `parent:A`

#### Scenario: Composition proposal rejected at checkpoint
- **WHEN** the user rejects or edits a proposed `parent:` assignment at the
  composition-pass checkpoint
- **THEN** the annotator does not write that `parent:` value to the
  corresponding source file

### Requirement: Library and Dependency Handling
When a chunk's grounded relationships reference a third-party package (code
outside the annotated codebase, not itself annotatable), the annotator SHALL
apply the following before proposing any element or relationship for it:
- If the package has no externally-observable counterpart (a generic
  utility/library dependency with no "other side", e.g. a data-structure or
  formatting library), the annotator SHALL NOT propose any element or
  relationship for it.
- If the package is a client/SDK whose calls cross a real network or process
  boundary to an external service, the annotator SHALL propose a
  relationship whose target is that external service's id (resolved against
  `c4-agent/manual/**`, consistent with existing external-system handling),
  and SHALL NOT propose an element for the SDK/client package itself.

First-party code (inside the annotated codebase) otherwise follows the
Element Granularity Default and Composition Pass requirements above: used by
a single consumer, it is folded in or nested per the composition test; used
by two or more consumers, it is proposed as a peer element.

#### Scenario: Generic third-party utility dependency
- **WHEN** a chunk's code imports a third-party utility library with no
  external service on the other side of the call
- **THEN** the annotator proposes no element and no relationship referencing
  that library

#### Scenario: Third-party SDK fronting an external service
- **WHEN** a chunk's code uses a third-party client/SDK to call an external
  service
- **THEN** the annotator proposes a relationship from the chunk's element to
  the external service's id, and proposes no element for the SDK/client
  package itself

#### Scenario: First-party library used by a single consumer
- **WHEN** a first-party package is only ever referenced by one other
  proposed element and has no relationships of its own
- **THEN** the annotator folds it into that consumer rather than proposing
  it as a separate element

#### Scenario: First-party library used by multiple consumers
- **WHEN** a first-party package is referenced by two or more distinct
  proposed elements
- **THEN** the annotator proposes it as its own peer element, related to
  each consumer via `@likec4-rel`, with no `parent:`
