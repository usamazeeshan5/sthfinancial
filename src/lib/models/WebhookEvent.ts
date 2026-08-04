import mongoose, { Schema, Document } from "mongoose";

// Records every Square webhook event we've already processed, so redelivered
// events (Square may send the same event more than once) are ignored. The
// unique index on eventId is the dedupe guard.
export interface IWebhookEvent extends Document {
  eventId: string;
  type: string;
  processedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>({
  eventId: { type: String, required: true, unique: true },
  type: { type: String },
  processedAt: { type: Date, default: Date.now },
});

export default mongoose.models.WebhookEvent ||
  mongoose.model<IWebhookEvent>("WebhookEvent", WebhookEventSchema);
