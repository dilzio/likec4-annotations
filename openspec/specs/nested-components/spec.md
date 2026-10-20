# nested-components Specification

## Purpose

Lets an annotated element declare that it is nested inside another element,
so `likec4-agent sync` can generate real C4 containment hierarchy
(softwareSystem -> container -> component) instead of a flat list of
unrelated boxes.

## Requirements

### Requirement: Parent Declaration
The `@likec4` annotation SHALL accept an optional `parent:<id>` parameter
declaring that the annotated element is nested inside the element identified
by `<id>`. This parameter SHALL be independent of, and combinable with, the
existing `technology:` parameter.

#### Scenario: Element declares a parent
- **WHEN** an `@likec4` tag includes `parent:payments-service`
- **THEN** the resulting element is treated as nested inside the element
  whose id is `payments-service` in the generated model

### Requirement: Cross-File Parent Resolution
A `parent:<id>` reference SHALL resolve against the same combined id space
used for relationship target resolution today: other annotated elements
discovered anywhere in the codebase, and elements declared by hand in
`c4-agent/manual/**`, regardless of which file or discovery order the parent
and child are found in.

#### Scenario: Parent declared in a different file than its child
- **WHEN** a parent element is annotated in one file and a child element
  with `parent:<that-id>` is annotated in a different file
- **THEN** `likec4-agent sync` resolves the nesting and generates output in
  which the child is nested under the parent

#### Scenario: Parent is a hand-authored element
- **WHEN** an annotated element declares `parent:<id>` where `<id>` is an
  element declared by hand in `c4-agent/manual/**`
- **THEN** `likec4-agent sync` resolves the nesting against that
  hand-authored element without requiring it to be annotated in code

### Requirement: Dangling Parent Reference
If a `parent:<id>` reference does not resolve to any known element, the
annotated element SHALL still be generated as a top-level element (not
dropped), and the unresolved parent reference SHALL be reported as an issue
in the sync report, consistent with how a dangling relationship target is
reported today.

#### Scenario: Parent id does not resolve
- **WHEN** an `@likec4` tag declares `parent:<id>` and no element with that
  id exists anywhere in the resolved model
- **THEN** the element is generated at the top level of the model, and the
  sync report lists the unresolved parent reference as an issue

### Requirement: Parent Cycle Rejection
A chain of `parent:` references that loops back on itself SHALL be rejected:
every element participating in the cycle is generated as a top-level element
(not dropped), and the cycle SHALL be reported as an issue in the sync
report.

#### Scenario: Two elements declare each other as parent
- **WHEN** element A declares `parent:B` and element B declares `parent:A`
- **THEN** `likec4-agent sync` generates both A and B as top-level elements
  and reports the cycle as an issue, rather than failing or looping

### Requirement: Fully-Qualified Relationship Resolution for Nested Elements
A relationship whose source or target is a nested element SHALL resolve and
be emitted using that element's fully-qualified containment path when the
relationship is declared outside that element's own nesting scope, so the
generated model validates under the LikeC4 language's own path resolution
rules.

#### Scenario: Relationship into a nested element from outside its scope
- **WHEN** an element outside a nested element's containment scope declares
  an `@likec4-rel` targeting that nested element's id
- **THEN** the generated relationship references the nested element by its
  fully-qualified containment path, and the generated model passes
  `likec4 validate`

### Requirement: Non-Nested Elements Are Unaffected
An `@likec4` tag with no `parent:` parameter SHALL continue to be generated
as a top-level element exactly as it is today, with no behavior change.

#### Scenario: Element without a parent parameter
- **WHEN** an `@likec4` tag omits `parent:`
- **THEN** the generated element appears at the top level of the model,
  identical in shape to output generated before this capability existed

### Requirement: Composition Issues Are Observable
The sync report SHALL include unresolved parent references and parent
cycles as distinct, named issue categories, following the same reporting
shape as the existing undeclared-kind and dangling-target issue categories.

#### Scenario: Report includes composition issues
- **WHEN** a sync run encounters at least one unresolved parent reference or
  parent cycle
- **THEN** the sync report's issues include an entry identifying each
  affected element and the nature of the problem (unresolved parent, or
  cycle)
