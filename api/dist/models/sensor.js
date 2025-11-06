import { Schema, model } from 'mongoose';
const sensorSchema = new Schema({
    plantId: { type: Schema.Types.ObjectId, ref: 'Plant', required: true },
    type: { type: String, required: true },
    unit: { type: String },
    meta: { type: Schema.Types.Mixed },
}, { timestamps: true });
sensorSchema.index({ plantId: 1 });
export const Sensor = model('Sensor', sensorSchema);
