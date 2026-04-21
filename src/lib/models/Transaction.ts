import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  amount: number;
  fee: number;
  totalCharged: number;
  status: "pending" | "processed" | "deposited" | "failed";
  luqraRefId?: string;
  luqraPaymentIntentId?: string;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    customerName: { type: String, required: true },
    amount: { type: Number, required: true },
    fee: { type: Number, required: true },
    totalCharged: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "processed", "deposited", "failed"],
      default: "pending",
    },
    luqraRefId: { type: String, unique: true, sparse: true },
    luqraPaymentIntentId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

export default mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);
