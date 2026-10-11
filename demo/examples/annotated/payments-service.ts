/**
 * Charges customer payment methods via the Stripe API and records
 * the resulting transaction.
 *
 * @likec4 container payments-service "Payments Service" technology:"Node.js, Express"
 * @likec4-rel stripe-api "charges card" technology:"HTTPS/REST" flow:"checkout":2
 * @likec4-rel logging-service "log the payment" technology:"GRPC" flow:"checkout":4
 */
export class PaymentsService {
  async charge(customerId: string, amountCents: number) {
    // Delegate to the Stripe API and persist the transaction result.
  }
}
