// Fee math for LoveTap tips.
//
// The tipper covers all costs so the worker nets EXACTLY the displayed tip.
// Square deducts its processing fee from the whole charged amount, and LoveTap
// takes its application fee out of the same charge — so the amount charged must
// be grossed up to cover both:
//
//   Total = (Tip + Square_fixed + LoveTap_fee) / (1 - Square_percent)
//   Worker net = Total - (Square_percent * Total + Square_fixed) - LoveTap_fee = Tip
//
// All amounts are handled in integer cents. The total is rounded UP to the cent
// so any rounding difference lands in the worker's favour (never short).
//
// Square's card-not-present rate is kept here as the single source of truth.
// (Making these admin-configurable, plus international-card treatment, is a
// later enhancement — this module intentionally uses the standard US rate.)
export const SQUARE_PERCENT = 0.029; // 2.9%
export const SQUARE_FIXED_CENTS = 30; // $0.30

export interface FeeBreakdown {
  tipCents: number; // what the worker nets
  appFeeCents: number; // LoveTap's application fee (its revenue)
  totalCents: number; // what the tipper is charged
  serviceFeeCents: number; // totalCents - tipCents (shown to the tipper)
}

// Compute the gross-up. `tipCents` is the displayed tip; `appFeeCents` is
// LoveTap's application fee for this transaction (may be 0).
export function computeFee(tipCents: number, appFeeCents: number): FeeBreakdown {
  const numerator = tipCents + SQUARE_FIXED_CENTS + Math.max(0, appFeeCents);
  const totalCents = Math.ceil(numerator / (1 - SQUARE_PERCENT));
  return {
    tipCents,
    appFeeCents: Math.max(0, appFeeCents),
    totalCents,
    serviceFeeCents: totalCents - tipCents,
  };
}

// LoveTap's application fee (its own cut) for a given tip, from the configured
// platform percentage + flat fee. Integer cents.
export function computeAppFeeCents(
  tipCents: number,
  platformPercent: number,
  platformFlat: number
): number {
  const cents =
    Math.round(tipCents * ((platformPercent || 0) / 100)) +
    Math.round((platformFlat || 0) * 100);
  return Math.max(0, cents);
}

export const toCents = (dollars: number) => Math.round(dollars * 100);
export const toDollars = (cents: number) => Math.round(cents) / 100;
