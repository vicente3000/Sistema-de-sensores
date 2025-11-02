import { Schema, model, Document } from 'mongoose';

export interface IPlant extends Document {
  name: string;
  location?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const plantSchema = new Schema<IPlant>({
  name: { type: String, required: true },
  location: { type: String },
}, { timestamps: true });

export const Plant = model<IPlant>('Plant', plantSchema);
