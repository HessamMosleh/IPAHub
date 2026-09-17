/**
 * Whether the bill attached to one row has settled.
 *
 * Shared by every billable row — membership requests, document requests and
 * event registrations — because all three are paid through the same checkout.
 * `NONE` is not "unpaid": it means nothing is owed, which is why it is the
 * default and why a free item never enters `PENDING`.
 *
 * This is the state machine. The `Payment` collection is the ledger, and it is
 * what dates and attributes the money — these three values cannot.
 */
export enum PaymentStatus {
  NONE = 'none',
  PENDING = 'pending',
  PAID = 'paid',
}
