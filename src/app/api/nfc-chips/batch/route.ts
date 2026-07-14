import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import NfcChip from "@/lib/models/NfcChip";
import { generateUniqueChipCodes } from "@/lib/chipCode";
import { getAppOrigin, tapUrl } from "@/lib/appUrl";

// POST /api/nfc-chips/batch
// Generates a batch of unclaimed chip codes. These codes are printed/encoded
// onto physical chips and shipped in retail packaging. A buyer later claims a
// code during mobile enrollment.
//
// Body: { count: number, prefix?: string }
// Returns: { batchId, count, codes: string[] }
export async function POST(req: NextRequest) {
  await connectDB();
  const { count, prefix } = await req.json();

  const qty = parseInt(String(count), 10);
  if (!qty || qty < 1 || qty > 5000) {
    return NextResponse.json(
      { error: "count must be between 1 and 5000" },
      { status: 400 }
    );
  }

  const cleanPrefix = (prefix || "LT").toString().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) || "LT";

  // batchId: timestamp-based, sortable, no external deps.
  const batchId = `batch_${Date.now()}`;

  // Generate a few extra to absorb any collisions with already-stored codes,
  // then insert with ordered:false so a rare duplicate doesn't abort the batch.
  let candidates = generateUniqueChipCodes(qty + Math.ceil(qty * 0.1) + 5, cleanPrefix);

  // Filter out any codes that already exist in the DB.
  const existing = await NfcChip.find({ chipUid: { $in: candidates } }).select("chipUid").lean();
  const existingSet = new Set(existing.map((c) => c.chipUid));
  candidates = candidates.filter((c) => !existingSet.has(c)).slice(0, qty);

  const docs = candidates.map((chipUid) => ({
    chipUid,
    batchId,
    claimed: false,
    customerId: null,
    customerName: null,
    status: "active" as const,
  }));

  await NfcChip.insertMany(docs, { ordered: false });

  return NextResponse.json(
    { batchId, count: docs.length, codes: candidates },
    { status: 201 }
  );
}

// GET /api/nfc-chips/batch                  -> list batches (summary)
// GET /api/nfc-chips/batch?batchId=...      -> codes for a batch (JSON)
// GET /api/nfc-chips/batch?batchId=...&format=csv -> CSV download
export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get("batchId");
  const format = searchParams.get("format");

  if (!batchId) {
    // Summary of all batches: id, total, claimed, createdAt.
    const batches = await NfcChip.aggregate([
      { $match: { batchId: { $ne: null } } },
      {
        $group: {
          _id: "$batchId",
          total: { $sum: 1 },
          claimed: { $sum: { $cond: ["$claimed", 1, 0] } },
          createdAt: { $min: "$createdAt" },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);
    return NextResponse.json({
      batches: batches.map((b) => ({
        batchId: b._id,
        total: b.total,
        claimed: b.claimed,
        unclaimed: b.total - b.claimed,
        createdAt: b.createdAt,
      })),
    });
  }

  const chips = await NfcChip.find({ batchId })
    .sort({ createdAt: 1 })
    .select("chipUid claimed claimedAt customerName")
    .lean();

  if (format === "csv") {
    // tap_url is the value to actually write onto each physical chip — the
    // bare code alone isn't enough to program one.
    const origin = getAppOrigin(req);
    const header = "chip_code,tap_url,claimed,claimed_at,customer";
    const rows = chips.map((c) => {
      const claimedAt = c.claimedAt ? new Date(c.claimedAt).toISOString() : "";
      const customer = (c.customerName || "").replace(/"/g, '""');
      return `${c.chipUid},${tapUrl(origin, c.chipUid)},${
        c.claimed ? "yes" : "no"
      },${claimedAt},"${customer}"`;
    });
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${batchId}.csv"`,
      },
    });
  }

  return NextResponse.json({ batchId, count: chips.length, chips });
}
