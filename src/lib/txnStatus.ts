// Transaction status groupings.
//
// A "quoted" transaction is created on EVERY tip-page load (create-intent needs
// a record to charge against later), so most transactions in the DB are just
// abandoned quotes. They must never show in logs or count toward tallies.

// Real, completed transactions — money actually moved. Shown in logs/lists and
// counted as the transaction count.
export const COMPLETED_STATUSES = [
  "processed",
  "deposited",
  "refunded",
  "disputed",
] as const;

// Successful, non-reversed money — used for tip/fee/earnings sums.
export const EARNING_STATUSES = ["processed", "deposited"] as const;

// Noise to hide from every log/list (unpaid quotes + failed attempts).
export const HIDDEN_STATUSES = ["quoted", "failed"] as const;
