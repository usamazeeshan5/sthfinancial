// Generates human-readable, unambiguous NFC chip codes.
//
// Format: LT-XXXXXX (e.g. LT-7K9M2Q) — 6 random characters after the LT- brand
// prefix. The alphabet excludes easily-confused characters (0/O, 1/I/L) so codes
// are safe to print on packaging and read back by hand. Codes are looked up
// case-insensitively and the route accepts variable-length codes, so future
// batches can use longer codes without affecting existing pendants.

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 6;

export function randomChipCode(prefix = "LT"): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${prefix}-${out}`;
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
