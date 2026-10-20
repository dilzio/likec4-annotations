/**
 * Validates card details before a charge is attempted.
 *
 * @likec4 component payment-validator "Payment Validator" technology:"TypeScript" parent:payments-service
 */
export class PaymentValidator {
  validate(cardNumber: string): boolean {
    return cardNumber.length > 0;
  }
}
