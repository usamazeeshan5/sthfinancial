import mongoose, { Schema, Document } from "mongoose";

export interface INfcChip extends Document {
  chipUid: string;
  customerId: mongoose.Types.ObjectId | null;
  customerName: string | null;
  status: "active" | "disabled" | "lost";
  claimed: boolean;
  claimedAt: Date | null;
  batchId: string | null;
  registeredAt: Date;
}

const NfcChipSchema = new Schema<INfcChip>(
  {
    chipUid: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null },
    customerName: { type: String, default: null },
    status: {
      type: String,
      enum: ["active", "disabled", "lost"],
      default: "active",
    },
    // Whether this chip has been claimed by (linked to) a customer. Chips
    // generated in a batch start unclaimed and become claimed when a buyer
    // enters the code during enrollment (or when an admin links it manually).
    claimed: { type: Boolean, default: false },
    claimedAt: { type: Date, default: null },
    // Groups chips produced in the same batch-generate run, so the codes for a
    // production run can be exported together.
    batchId: { type: String, default: null, index: true },
    registeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.NfcChip ||
  mongoose.model<INfcChip>("NfcChip", NfcChipSchema);
