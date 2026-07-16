import mongoose, { Schema, Document } from "mongoose";

export interface IFeeConfig extends Document {
  flatFee: number;
  percentageFee: number;
  // Platform fee (the operator's own cut). Collected from each payment via
  // Square's app_fee_money and settled into the PLATFORM's Square account,
  // separately from the processing fee above. Defaults to 0 so nothing is
  // taken until it's explicitly configured.
  platformPercentageFee: number;
  platformFlatFee: number;
  updatedAt: Date;
}

const FeeConfigSchema = new Schema<IFeeConfig>(
  {
    flatFee: { type: Number, required: true, default: 0.3 },
    percentageFee: { type: Number, required: true, default: 3.9 },
    platformPercentageFee: { type: Number, required: true, default: 0 },
    platformFlatFee: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.FeeConfig ||
  mongoose.model<IFeeConfig>("FeeConfig", FeeConfigSchema);
