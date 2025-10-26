import { Schema, model, Document, Types } from 'mongoose';

export interface IThreshold extends Document {
  sensorId: Types.ObjectId;
  min: number;
  max: number;
  hysteresis?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const thresholdSchema = new Schema<IThreshold>({
  sensorId: { type: Schema.Types.ObjectId, ref: 'Sensor', required: true },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  hysteresis: { type: Number, default: 0 },
}, { timestamps: true });

thresholdSchema.index({ sensorId: 1 });

export const Threshold = model<IThreshold>('Threshold', thresholdSchema);
