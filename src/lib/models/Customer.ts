import mongoose, { Schema, Document } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  bankAccountStatus: "connected" | "pending" | "disconnected";
  bankAccount?: {
    accountHolder: string;
    routingNumber: string;
    accountNumber: string;
  };
  active: boolean;
  createdAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    bankAccountStatus: {
      type: String,
      enum: ["connected", "pending", "disconnected"],
      default: "pending",
    },
    bankAccount: {
      accountHolder: { type: String },
      routingNumber: { type: String },
      accountNumber: { type: String },
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Customer ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);
