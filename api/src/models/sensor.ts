import { Schema, model, Document, Types } from 'mongoose';

export interface ISensor extends Document {
  plantId: Types.ObjectId;
  type: string;
  unit?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const sensorSchema = new Schema<ISensor>({
  plantId: { type: Schema.Types.ObjectId, ref: 'Plant', required: true },
  type: { type: String, required: true },
  unit: { type: String },
}, { timestamps: true });

export const Sensor = model<ISensor>('Sensor', sensorSchema);