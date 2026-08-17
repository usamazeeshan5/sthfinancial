import mongoose, { Schema, Document } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  bankAccountStatus: "connected" | "pending" | "disconnected";
  squareMerchantId?: string;
  squareAccessToken?: string;
  squareRefreshToken?: string;
  squareTokenExpiresAt?: Date | null;
  squareLocationId?: string | null;
  // Whether the connected Square location can actually take card payments.
  // New sellers only get CREDIT_CARD_PROCESSING once they finish Square's
  // account activation (identity/business/bank). Until then no card, Apple Pay
  // or Google Pay works, so we must not present a broken tip page.
  squareCardProcessing?: boolean;
  squareLocationCountry?: string | null;
  squareLocationCurrency?: string | null;
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
    squareMerchantId: { type: String, default: null },
    squareAccessToken: { type: String, default: null, select: false },
    squareRefreshToken: { type: String, default: null, select: false },
    squareTokenExpiresAt: { type: Date, default: null },
    squareLocationId: { type: String, default: null },
    squareCardProcessing: { type: Boolean, default: false },
    squareLocationCountry: { type: String, default: null },
    squareLocationCurrency: { type: String, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Customer ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);
