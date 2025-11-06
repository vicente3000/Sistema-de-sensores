import { Schema, model } from 'mongoose';
const thresholdSchema = new Schema({
    sensorId: { type: Schema.Types.ObjectId, ref: 'Sensor', required: true },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    hysteresis: { type: Number, default: 0 },
}, { timestamps: true });
thresholdSchema.index({ sensorId: 1 });
export const Threshold = model('Threshold', thresholdSchema);
