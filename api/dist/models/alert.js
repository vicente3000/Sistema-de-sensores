import { Schema, model } from 'mongoose';
const alertSchema = new Schema({
    plantId: { type: Schema.Types.ObjectId, ref: 'Plant', required: true },
    sensorId: { type: Schema.Types.ObjectId, ref: 'Sensor', required: true },
    value: { type: Number, required: true },
    message: { type: String },
    level: { type: String, enum: ['normal', 'grave', 'critica'], default: 'normal', index: true },
    createdAt: { type: Date, default: Date.now }
});
alertSchema.index({ plantId: 1, createdAt: -1 });
alertSchema.index({ plantId: 1, level: 1, createdAt: -1 });
export const Alert = model('Alert', alertSchema);
