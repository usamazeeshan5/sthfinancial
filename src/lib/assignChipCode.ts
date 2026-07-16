import mongoose from "mongoose";
import NfcChip from "@/lib/models/NfcChip";

function escapeRegex(v: string): string {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Auto-generated codes minted at signup / admin-create that never corresponded
// to a physical tag. When a customer is reassigned to a real batch code, these
// are safe to delete rather than leave orphaned in the pool.
const VIRTUAL_BATCH_IDS = ["signup", "admin"];

type Result =
  | { ok: true; chipUid: string }
  | { ok: false; error: string; status: number };

// Assigns an existing (batch-generated) chip code to a customer, releasing
// whatever chip they currently hold. Shared by admin "Add Customer" and the
// customer detail "change code" action so both behave identically.
//
// Rules:
//  - The code must exist and be active.
//  - It must be unclaimed, or already belong to this same customer (no-op).
//  - The customer's previous chips are released: virtual auto-codes are deleted
//    (they were never physical tags); real batch codes are returned to the pool
//    as unclaimed so they can be reused.
export async function assignChipCode(
  rawCode: string,
  customerId: string,
  customerName: string
): Promise<Result> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Chip code is required.", status: 400 };

  const chip = await NfcChip.findOne({
    chipUid: new RegExp(`^${escapeRegex(code)}$`, "i"),
  });
  if (!chip) {
    return {
      ok: false,
      error: `No chip found with code "${code}". Generate it in a batch first.`,
      status: 404,
    };
  }
  if (chip.status !== "active") {
    return { ok: false, error: `Chip "${chip.chipUid}" is disabled.`, status: 409 };
  }
  if (chip.customerId && String(chip.customerId) !== String(customerId)) {
    return {
      ok: false,
      error: `Chip "${chip.chipUid}" is already assigned to ${
        chip.customerName || "another customer"
      }.`,
      status: 409,
    };
  }

  // Already this customer's chip — nothing to do.
  if (chip.customerId && String(chip.customerId) === String(customerId)) {
    return { ok: true, chipUid: chip.chipUid };
  }

  // Release the customer's current chips before claiming the new one.
  const existing = await NfcChip.find({ customerId });
  for (const old of existing) {
    if (old.batchId && VIRTUAL_BATCH_IDS.includes(old.batchId)) {
      await old.deleteOne();
    } else {
      old.customerId = null;
      old.customerName = null;
      old.claimed = false;
      old.claimedAt = null;
      await old.save();
    }
  }

  chip.customerId = new mongoose.Types.ObjectId(customerId);
  chip.customerName = customerName;
  chip.claimed = true;
  chip.claimedAt = new Date();
  await chip.save();

  return { ok: true, chipUid: chip.chipUid };
}
