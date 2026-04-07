import mongoose, { Schema, Document } from "mongoose";

export interface IFeeConfig extends Document {
  flatFee: number;
  percentageFee: number;
  updatedAt: Date;
}

const FeeConfigSchema = new Schema<IFeeConfig>(
  {
    flatFee: { type: Number, required: true, default: 0.3 },
    percentageFee: { type: Number, required: true, default: 3.9 },
  },
  { timestamps: true }
);

export default mongoose.models.FeeConfig ||
  mongoose.model<IFeeConfig>("FeeConfig", FeeConfigSchema);
