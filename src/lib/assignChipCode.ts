import mongoose from "mongoose";
import NfcChip from "@/lib/models/NfcChip";

function escapeRegex(v: string): string {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Result =
  | { ok: true; chipUid: string }
  | { ok: false; error: string; status: number };

// Atomically claims an unclaimed chip code for a customer and ADDS it to their
// account (a customer may own multiple LoveTaps). Shared by web activation and
// admin "add customer with code".
//
// Atomicity: the claim is a single conditional update on { customerId: null },
// so if two people tap and claim the same code simultaneously, exactly one
// succeeds — the other gets an "already assigned" error. A product therefore
// always has at most one current owner.
//
// Codes are immutable: this never changes a chip's code, and it does not touch
// the customer's other chips.
export async function assignChipCode(
  rawCode: string,
  customerId: string,
  customerName: string
): Promise<Result> {
  const code = rawCode.trim();
  if (!code) return { ok: false, error: "Chip code is required.", status: 400 };

  const codeRegex = new RegExp(`^${escapeRegex(code)}$`, "i");

  // Atomic claim: only succeeds if the chip exists, is active, and is currently
  // unclaimed. The single-document conditional update is the concurrency guard.
  const claimed = await NfcChip.findOneAndUpdate(
    { chipUid: codeRegex, status: "active", customerId: null },
    {
      $set: {
        customerId: new mongoose.Types.ObjectId(customerId),
        customerName,
        claimed: true,
        claimedAt: new Date(),
      },
    },
    { new: true }
  );

  if (claimed) return { ok: true, chipUid: claimed.chipUid };

  // The claim didn't take — figure out why so we can return a precise error.
  const existing = await NfcChip.findOne({ chipUid: codeRegex });
  if (!existing) {
    return {
      ok: false,
      error: `No chip found with code "${code}". Generate it in a batch first.`,
      status: 404,
    };
  }
  if (existing.status !== "active") {
    return { ok: false, error: `Chip "${existing.chipUid}" is disabled.`, status: 409 };
  }
  if (existing.customerId && String(existing.customerId) === String(customerId)) {
    // Already this customer's chip — treat as a successful no-op.
    return { ok: true, chipUid: existing.chipUid };
  }
  return {
    ok: false,
    error: `Chip "${existing.chipUid}" is already assigned to ${
      existing.customerName || "another account"
    }.`,
    status: 409,
  };
}
