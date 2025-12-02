import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStoryRegistration extends Document {
  cid: string;
  title?: string | null;
  ipId: string;
  txHash?: string | null;
  cidHash?: string | null;
  anchorTxHash?: string | null;
  anchorConfirmedAt?: Date | null;
  createdAt: Date;
}

const StoryRegistrationSchema = new Schema<IStoryRegistration>(
  {
    cid: { type: String, required: true, index: true },
    title: { type: String, required: false },
    ipId: { type: String, required: true },
    txHash: { type: String, required: false },
    cidHash: { type: String, required: false, index: true },
    anchorTxHash: { type: String, required: false },
    anchorConfirmedAt: { type: Date, required: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const StoryRegistration: Model<IStoryRegistration> =
  (mongoose.models.StoryRegistration as Model<IStoryRegistration>) ||
  mongoose.model<IStoryRegistration>("StoryRegistration", StoryRegistrationSchema);

export default StoryRegistration;
