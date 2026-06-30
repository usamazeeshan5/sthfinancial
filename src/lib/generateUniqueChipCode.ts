import NfcChip from "@/lib/models/NfcChip";
import { randomChipCode } from "@/lib/chipCode";

// Generates a chip code guaranteed to be unique against the DB. Shared by the
// mobile signup flow and the admin "Add Customer" flow so both behave the same.
export async function generateUniqueChipCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = randomChipCode();
    const exists = await NfcChip.exists({ chipUid: code });
    if (!exists) return code;
  }
  // Extremely unlikely fallback: append entropy.
  return `${randomChipCode()}-${Date.now().toString(36).toUpperCase()}`;
}
