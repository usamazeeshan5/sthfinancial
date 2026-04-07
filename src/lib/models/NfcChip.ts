import mongoose, { Schema, Document } from "mongoose";

export interface INfcChip extends Document {
  chipUid: string;
  customerId: mongoose.Types.ObjectId | null;
  customerName: string | null;
  status: "active" | "disabled" | "lost";
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
    registeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.NfcChip ||
  mongoose.model<INfcChip>("NfcChip", NfcChipSchema);
