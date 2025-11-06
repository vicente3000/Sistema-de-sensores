import mongoose, { Schema, Document } from "mongoose";

export interface PlantDocument extends Document {
  name: string;
  type?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const plantSchema = new Schema<PlantDocument>({
  name: { type: String, required: true },
  type: { type: String },
}, { timestamps: true });

export const Plant = mongoose.model<PlantDocument>("Plant", plantSchema);
