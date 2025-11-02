import { Schema, model, Document, Types } from 'mongoose';

export interface IAlert extends Document {
  plantId: Types.ObjectId;
  sensorId: Types.ObjectId;
  value: number;
  message?: string;
  createdAt?: Date;
}

const alertSchema = new Schema<IAlert>({
  plantId: { type: Schema.Types.ObjectId, ref: 'Plant', required: true },
  sensorId: { type: Schema.Types.ObjectId, ref: 'Sensor', required: true },
  value: { type: Number, required: true },
  message: { type: String },
  createdAt: { type: Date, default: Date.now }
});

alertSchema.index({ plantId: 1, createdAt: -1 });

export const Alert = model<IAlert>('Alert', alertSchema);
