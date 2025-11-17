import { Schema, model, Document, Types } from 'mongoose';

export interface IAlert extends Document {
  plantId: Types.ObjectId;
  sensorId: Types.ObjectId;
  value: number;
  message?: string;
  level: 'normal' | 'grave' | 'critica';
  // nuevo flujo de estado
  status: 'pendiente' | 'en_progreso' | 'completado';
  acked?: boolean; // legado
  resolvedBy?: string; // legado
  ackedAt?: Date; // legado
  createdAt?: Date;
}

const alertSchema = new Schema<IAlert>({
  plantId: { type: Schema.Types.ObjectId, ref: 'Plant', required: true },
  sensorId: { type: Schema.Types.ObjectId, ref: 'Sensor', required: true },
  value: { type: Number, required: true },
  message: { type: String },
  level: { type: String, enum: ['normal', 'grave', 'critica'], default: 'normal', index: true },
  status: { type: String, enum: ['pendiente', 'en_progreso', 'completado'], default: 'pendiente', index: true },
  acked: { type: Boolean, default: false },
  resolvedBy: { type: String },
  ackedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

alertSchema.index({ plantId: 1, createdAt: -1 });
alertSchema.index({ plantId: 1, level: 1, createdAt: -1 });
alertSchema.index({ sensorId: 1, createdAt: -1 });
alertSchema.index({ plantId: 1, status: 1, createdAt: -1 });

// TTL opcional para recorte automatico
const ttlSeconds = (() => {
  const sec = Number(process.env.ALERTS_TTL_SECONDS || 0);
  if (Number.isFinite(sec) && sec > 0) return Math.floor(sec);
  const days = Number(process.env.ALERTS_TTL_DAYS || 0);
  if (Number.isFinite(days) && days > 0) return Math.floor(days * 86400);
  return 0;
})();
if (ttlSeconds > 0) {
  alertSchema.index({ createdAt: 1 }, { expireAfterSeconds: ttlSeconds });
}

export const Alert = model<IAlert>('Alert', alertSchema);
