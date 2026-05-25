import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import mongoose from "mongoose";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}

await mongoose.connect(process.env.MONGODB_URI);

const NfcChipSchema = new mongoose.Schema(
  { chipUid: String, customerId: mongoose.Schema.Types.ObjectId, customerName: String, status: String },
  { collection: "nfcchips", timestamps: true }
);
const FeeConfigSchema = new mongoose.Schema(
  { flatFee: { type: Number, required: true, default: 0.3 }, percentageFee: { type: Number, required: true, default: 3.9 } },
  { collection: "feeconfigs", timestamps: true }
);
const TransactionSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    customerName: { type: String, required: true },
    amount: { type: Number, required: true },
    fee: { type: Number, required: true },
    totalCharged: { type: Number, required: true },
    status: { type: String, enum: ["quoted","pending","processed","deposited","failed"], default: "quoted" },
    quoteId: { type: String, unique: true, sparse: true },
    squarePaymentId: { type: String, unique: true, sparse: true },
  },
  { collection: "transactions", timestamps: true }
);

const NfcChip = mongoose.model("NfcChip", NfcChipSchema);
const FeeConfig = mongoose.model("FeeConfig", FeeConfigSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);

const chipUid = "04:A2:3B:C1:00:01";
const amount = 1;

try {
  const chip = await NfcChip.findOne({ chipUid, status: "active" });
  console.log("chip:", chip && { chipUid: chip.chipUid, customerId: String(chip.customerId), customerName: chip.customerName });

  let feeConfig = await FeeConfig.findOne();
  console.log("feeConfig:", feeConfig && { flatFee: feeConfig.flatFee, percentageFee: feeConfig.percentageFee });
  if (!feeConfig) {
    feeConfig = await FeeConfig.create({ flatFee: 0.3, percentageFee: 3.9 });
  }

  const fee = Math.round((amount * (feeConfig.percentageFee / 100) + feeConfig.flatFee) * 100) / 100;
  const totalCharged = Math.round((amount + fee) * 100) / 100;

  const quoteId = randomUUID();
  console.log("creating txn:", { amount, fee, totalCharged, quoteId });

  const txn = await Transaction.create({
    customerId: chip.customerId,
    customerName: chip.customerName || "",
    amount,
    fee,
    totalCharged,
    status: "quoted",
    quoteId,
  });
  console.log("CREATED:", { quoteId, amount, fee, totalCharged, customerName: chip.customerName, _id: String(txn._id) });
} catch (e) {
  console.error("FAILED:", e?.name, e?.message);
  if (e?.errors) console.error("validation:", Object.fromEntries(Object.entries(e.errors).map(([k,v]) => [k, v.message])));
} finally {
  await mongoose.disconnect();
}
