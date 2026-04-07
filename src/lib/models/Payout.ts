import mongoose, { Schema, Document } from "mongoose";

export interface IPayout extends Document {
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  amount: number;
  status: "scheduled" | "completed" | "failed";
  scheduledAt: Date;
  completedAt: Date | null;
}

const PayoutSchema = new Schema<IPayout>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    customerName: { type: String, required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["scheduled", "completed", "failed"],
      default: "scheduled",
    },
    scheduledAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Payout ||
  mongoose.model<IPayout>("Payout", PayoutSchema);
