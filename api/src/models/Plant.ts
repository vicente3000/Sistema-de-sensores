import mongoose, { Schema, Document } from "mongoose";

export interface PlantDocument extends Document {
  name: string;
  type?: string;
  sensors: {
    id: string;
    type: string;
    thresholdMin?: number;
    thresholdMax?: number;
    scheduleMode: string;
    everyHours?: number;
    fixedTimes?: string;
    rangeStart?: string;
    rangeEnd?: string;
    rangeCount?: number;
  }[];
}

const sensorSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  thresholdMin: Number,
  thresholdMax: Number,
  scheduleMode: { type: String, required: true },
  everyHours: Number,
  fixedTimes: String,
  rangeStart: String,
  rangeEnd: String,
  rangeCount: Number,
});

const plantSchema = new Schema<PlantDocument>({
  name: { type: String, required: true },
  type: { type: String },
  sensors: [sensorSchema],
});

export const Plant = mongoose.model<PlantDocument>("Plant", plantSchema);
