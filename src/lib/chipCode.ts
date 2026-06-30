// Generates human-readable, unambiguous NFC chip codes.
//
// Format: LT-XXXX-XXXX (e.g. LT-7F3K-9QH2)
// The alphabet excludes easily-confused characters (0/O, 1/I/L) so codes are
// safe to print on packaging and read back by hand.

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function randomChipCode(prefix = "LT"): string {
  const block = (len: number) => {
    let out = "";
    for (let i = 0; i < len; i++) {
      out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    return out;
  };
  return `${prefix}-${block(4)}-${block(4)}`;
}

// Generates `count` unique codes in one batch. Uniqueness is checked locally;
// the DB unique index on chipUid is the final guard against collisions.
export function generateUniqueChipCodes(count: number, prefix = "LT"): string[] {
  const set = new Set<string>();
  let guard = 0;
  while (set.size < count && guard < count * 50) {
    set.add(randomChipCode(prefix));
    guard++;
  }
  return Array.from(set);
}

// Normalizes a code a buyer types in (trim, uppercase, collapse spaces). We do
// NOT strip dashes so the stored format and the entered format stay consistent.
export function normalizeChipCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}
