# `@likec4` Annotation Convention

This repo keeps its [LikeC4](https://likec4.dev) architecture model in sync with
the code by reading tags embedded in existing doc comments. Run the
`/likec4-sync` command (see `.claude/skills/likec4-sync/SKILL.md`) to regenerate
`model/generated/elements.c4` and `model/generated/relationships.c4` from these
tags.

## Grammar

```
@likec4 <kind> <id> ["<title>"] [technology:"<tech>"]
@likec4-rel <targetId> "<label>" [technology:"<tech>"] [kind:<relKind>]
```

- `<kind>` must be one declared in `model/specification.c4` (currently `person`,
  `softwareSystem`, `container`, `component`).
- `<id>` and `<targetId>` follow LikeC4 identifier rules: letters, digits,
  hyphens, and underscores; no leading digit, no periods.
- `<title>` is optional; if omitted, the id is used as the title.
- `technology:"..."` is optional on both tags.
- `kind:<relKind>` is optional on `@likec4-rel` and must be a relationship kind
  declared in `model/specification.c4` (currently `async`). Omit it for a plain
  relationship.
- The element's `description` is **not** a separate tag — it is taken verbatim
  from the prose of the same doc comment, above the tags.
- Every `@likec4-rel` line attaches to the nearest preceding `@likec4` tag in
  the **same comment block**. One block declares exactly one element and zero
  or more outgoing relationships from it. Attaching a relationship to an
  element declared in a different file/block is out of scope for v1.

The tag syntax itself is independent of comment delimiters (`/** */`, `#`,
`//`) — the sync skill matches on the literal strings `@likec4` / `@likec4-rel`
wherever they appear, so the same grammar works across languages.

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

Generates (in `model/generated/`):

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
  orders-service -> payments-service "charges the customer's card" 'REST/HTTPS' // examples/annotated/orders-service.ts:6
  orders-service -[async]-> fulfillment-queue "publishes OrderPlaced event" 'SQS' // examples/annotated/orders-service.ts:7
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

Here `stripe-api` has no annotated code backing it — it would be declared by
hand in `model/manual/external-systems.c4` as a `softwareSystem` tagged
`#external`. The sync skill resolves the relationship target against the full
model but never writes the element itself.

## Generated vs. hand-authored files

| Path | Owner | Notes |
|---|---|---|
| `model/generated/elements.c4` | `likec4-sync` skill | Fully rewritten every run |
| `model/generated/relationships.c4` | `likec4-sync` skill | Fully rewritten every run |
| `model/manual/**` | You | External systems/actors and relationships with no single owning annotation |
| `model/views/**` | You | All `view { ... }` definitions |
| `model/specification.c4` | You | Element/relationship kinds, tags, styles |

The skill only ever writes inside `model/generated/**`. It reads the rest of
`model/**.c4` to resolve relationship target ids, but never modifies it.
