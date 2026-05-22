import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  amount: number;
  fee: number;
  totalCharged: number;
  status: "quoted" | "pending" | "processed" | "deposited" | "failed";
  quoteId?: string;
  squarePaymentId?: string;
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
      enum: ["quoted", "pending", "processed", "deposited", "failed"],
      default: "quoted",
    },
    quoteId: { type: String, unique: true, sparse: true },
    squarePaymentId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

export default mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);
