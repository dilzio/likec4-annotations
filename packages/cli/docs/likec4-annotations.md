# `@likec4` Annotation Convention

This grammar is bundled with — and fixed by — your installed version of the
`likec4-agent` CLI. It is **not** a per-repo editable file: every repo using
a given `likec4-agent` version gets the exact same tag vocabulary. If you
need new fields or kinds, request them upstream rather than hand-editing a
local copy of this document (there isn't one to edit — this copy ships
inside `node_modules/likec4-agent/docs/`).

Run `likec4-agent sync` to regenerate `c4-agent/generated/elements.c4`,
`c4-agent/generated/relationships.c4`, and `c4-agent/generated/flows.c4` from
these tags.

## Grammar

```
@likec4 <kind> <id> ["<title>"] [technology:"<tech>"] [parent:<id>]
@likec4-rel <targetId> "<label>" [technology:"<tech>"] [kind:<relKind>] [flow:"<flowId>":<step>] [flowTitle:"<title>"]
```

- `<kind>` must be one declared in your repo's `c4-agent/specification.c4`
  (e.g. `person`, `softwareSystem`, `container`, `component` — whatever
  your project declares).
- `<id>` and `<targetId>` follow LikeC4 identifier rules: letters, digits,
  hyphens, and underscores; no leading digit, no periods.
- `<title>` is optional; if omitted, the id is used as the title.
- `technology:"..."` and `parent:<id>` are both optional on `@likec4` and
  independent of each other — either, both (in any order), or neither may
  appear.
- `parent:<id>` declares that the annotated element is nested inside the
  element identified by `<id>`, reflecting real C4 containment (e.g. a
  `component` nested inside a `container`) instead of a flat list of
  unrelated elements. `<id>` resolves against the same combined id space
  used for `@likec4-rel` targets: other annotated elements anywhere in the
  codebase, and elements declared by hand in `c4-agent/manual/**` — the
  parent doesn't need to be declared in the same file, or even in annotated
  code at all.
  - If `<id>` doesn't resolve to any known element, the annotated element is
    still generated — at the top level, as if `parent:` were omitted — and
    the unresolved reference is reported as an issue in the sync report.
  - If a chain of `parent:` references loops back on itself (e.g. A's parent
    is B and B's parent is A), every element in the cycle is generated at
    the top level and the cycle is reported as an issue, rather than
    failing the sync run.
  - A relationship whose source or target is a nested element is resolved
    and emitted using that element's fully-qualified dotted path
    (`payments-service.payment-validator`) whenever the relationship isn't
    declared from inside that element's own nesting scope — which, in
    practice, is every relationship this CLI emits, since
    `c4-agent/generated/relationships.c4` always declares relationships at
    the top level of the model, never nested inside another element's
    block. Note that LikeC4 itself rejects a relationship directly between
    a parent and its own immediate child (it considers that connection
    already expressed by the containment).
- `kind:<relKind>` is optional on `@likec4-rel` and must be a relationship
  kind declared in `c4-agent/specification.c4`. Omit it for a plain
  relationship.
- `flow:"<flowId>":<step>` is optional on `@likec4-rel` and marks the
  relationship as step `<step>` (an integer) of the named flow `<flowId>`.
  Every relationship tagged with the same `<flowId>` across the codebase
  becomes one step of a single generated LikeC4 dynamic view, ordered by
  `<step>` ascending. A relationship dropped by the usual resolution rules
  (dangling target, undeclared kind) is dropped from its flow too.
- `flowTitle:"<title>"` is optional on `@likec4-rel` and sets the display
  title of the flow named by that line's `flow:` param. It only needs to
  appear on one relationship in the flow; if present on more than one with
  different values, the first occurrence (by file scan order) wins and
  sync reports a warning. If absent everywhere, the flow id is used as the
  title.
- The element's `description` is **not** a separate tag — it is taken
  verbatim from the prose of the same doc comment, above the tags.
- Every `@likec4-rel` line attaches to the nearest preceding `@likec4` tag
  in the **same comment block**. One block declares exactly one element and
  zero or more outgoing relationships from it. Attaching a relationship to
  an element declared in a different file/block is out of scope for v1.

The tag syntax itself is independent of comment delimiters (`/** */`, `#`,
`//`, `"""`) — `likec4-agent` matches on the literal strings `@likec4` /
`@likec4-rel` wherever they appear, so the same grammar works across
languages.

## Examples

### TypeScript (JSDoc)

```ts
/**
 * Accepts incoming order requests, validates them, charges the
 * customer, and publishes a fulfillment event once payment succeeds.
 *
 * @likec4 container orders-service "Orders Service" technology:"Node.js, Express"
 * @likec4-rel payments-service "charges the customer's card" technology:"REST/HTTPS"
 * @likec4-rel fulfillment-queue "publishes OrderPlaced event" technology:"SQS" kind:async
 */
export class OrdersService {
  async placeOrder(order: Order) { /* ... */ }
}
```

Generates (in `c4-agent/generated/`):

```
model {
  orders-service = container 'Orders Service' {
    technology 'Node.js, Express'
    description 'Accepts incoming order requests, validates them, charges the customer, and publishes a fulfillment event once payment succeeds.'
  }
}
```

```
model {
  orders-service -> payments-service "charges the customer's card" 'REST/HTTPS' // src/orders-service.ts:6
  orders-service -[async]-> fulfillment-queue "publishes OrderPlaced event" 'SQS' // src/orders-service.ts:7
}
```

### Python (docstring)

```python
def handle_webhook(payload: dict) -> None:
    """
    Receives Stripe webhook events and updates payment status.

    @likec4 component payment-webhook-handler "Payment Webhook Handler" technology:"Python/FastAPI"
    @likec4-rel orders-service "notifies order of payment result" technology:"internal event bus"
    """
```

### Go (line comments)

```go
// Client wraps calls to the third-party Stripe payment API.
//
// @likec4 component stripe-client "Stripe Client" technology:"Go"
// @likec4-rel stripe-api "charges card" technology:"HTTPS/REST" kind:external
func NewStripeClient() *Client { ... }
```

Here `stripe-api` has no annotated code backing it — it would be declared
by hand in `c4-agent/manual/external-systems.c4` as a `softwareSystem` tagged
`#external`. `likec4-agent` resolves the relationship target against the
full model but never writes the element itself.

### Nested elements (composition) example

Tag an element with `parent:<id>` to nest it inside another element,
expressing real C4 containment (System -> Container -> Component) instead of
a flat list of boxes.

```ts
/**
 * Charges customer payment methods via the Stripe API.
 *
 * @likec4 container payments-service "Payments Service" technology:"Node.js, Express"
 * @likec4-rel stripe-api "charges card" technology:"HTTPS/REST"
 */
export class PaymentsService {}

/**
 * Validates card details before a charge is attempted.
 *
 * @likec4 component payment-validator "Payment Validator" technology:"TypeScript" parent:payments-service
 */
export class PaymentValidator {}
```

Generates (in `c4-agent/generated/elements.c4`), with the nested element
attached to its parent via an `extend` block rather than literal nested
braces — so a parent and child discovered independently, in any file or
order, still attach correctly:

```
model {
  payments-service = container 'Payments Service' {
    technology 'Node.js, Express'
    description 'Charges customer payment methods via the Stripe API.'
  }

  extend payments-service {
    payment-validator = component 'Payment Validator' {
      technology 'TypeScript'
      description 'Validates card details before a charge is attempted.'
    }
  }
}
```

A relationship declared *into* `payment-validator` from outside
`payments-service` (e.g. from `orders-service`) is emitted using its
fully-qualified path, since `relationships.c4` always declares relationships
at the top level:

```
model {
  orders-service -> payments-service.payment-validator "double-checks card details" // src/orders-service.ts:7
}
```

`parent:<id>` also resolves against a hand-authored element in
`c4-agent/manual/**` — e.g. `parent:cloud` nests under a `cloud` system
declared by hand, with no annotated code backing `cloud` itself, the same
way a dangling-free relationship target can be hand-authored today. A
`parent:` that doesn't resolve, or that forms a cycle, doesn't drop the
element or fail the sync — it's generated at the top level instead, and
reported as an issue (`unresolvedParents` / `parentCycles` in
`--format json`'s `issues`).

### Dataflow (dynamic view) example

Tag relationships with `flow:"<flowId>":<step>` to have `likec4-agent sync`
generate a LikeC4 dynamic view tracing that flow — no hand-authored view
file needed.

```ts
/**
 * @likec4 container orders-service "Orders Service" technology:"Node.js, Express"
 * @likec4-rel payments-service "charges the customer's card" technology:"REST/HTTPS" flow:"checkout":1 flowTitle:"Checkout Flow"
 */
export class OrdersService {}

/**
 * @likec4 container payments-service "Payments Service" technology:"Node.js, Express"
 * @likec4-rel stripe-api "charges card" technology:"HTTPS/REST" flow:"checkout":2
 */
export class PaymentsService {}
```

Generates (in `c4-agent/generated/flows.c4`):

```
views {
  dynamic view checkout {
    title 'Checkout Flow'

    orders-service -> payments-service 'charges the customer\'s card' // src/orders-service.ts:3
    payments-service -> stripe-api 'charges card' // src/payments-service.ts:3
  }
}
```

Step labels use single-quoted LikeC4 string literals (matching the
upstream dynamic-view DSL), unlike the double-quoted labels in
`relationships.c4`. A flow with no surviving steps (every tagged
relationship was dropped by the usual resolution rules) produces no
`dynamic view` block at all, since an empty one is invalid LikeC4.

## Generated vs. hand-authored files

| Path | Owner | Notes |
|---|---|---|
| `c4-agent/generated/elements.c4` | `likec4-agent sync` | Fully rewritten every run |
| `c4-agent/generated/relationships.c4` | `likec4-agent sync` | Fully rewritten every run |
| `c4-agent/generated/flows.c4` | `likec4-agent sync` | Fully rewritten every run; one `dynamic view` per `flow:` id |
| `c4-agent/manual/**` | You | External systems/actors and relationships with no single owning annotation |
| `c4-agent/views/**` | You | All `view { ... }` definitions |
| `c4-agent/specification.c4` | You | Element/relationship kinds, tags, styles |

`likec4-agent sync` only ever writes inside `c4-agent/generated/**`. It reads
the rest of `c4-agent/**.c4` to resolve relationship target ids and validate
declared kinds, but never modifies it.
