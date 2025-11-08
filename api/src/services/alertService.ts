// evalua umbrales y registra/emit alertas
import { Threshold } from '../models/threshold.js';
import { Alert } from '../models/alert.js';
import { Sensor } from '../models/sensor.js';
import { emitAlert } from '../realtime/socket.js';

type Level = 'grave' | 'critica';

// calcula severidad usando histeresis simple
function getLevel(value: number, t: { min?: number; max?: number; hysteresis?: number }): Level | null {
  const h = Math.max(0, t.hysteresis ?? 0);
  if (typeof t.max === 'number') {
    if (value > t.max + h) return 'critica';
    if (value > t.max) return 'grave';
  }
  if (typeof t.min === 'number') {
    if (value < (t.min - h)) return 'critica';
    if (value < t.min) return 'grave';
  }
  return null;
}

// procesa una lectura: verifica threshold, guarda alerta y emite realtime
export async function processReadingAlert(input: {
  sensorId: string;
  sensorType: string;
  value: number;
  ts: Date;
}) {
  const { sensorId, sensorType, value, ts } = input;
  const th = await Threshold.findOne({ sensorId }).lean();
  if (!th) return; // sin umbral no hay alerta

  const level = getLevel(value, { min: th.min, max: th.max, hysteresis: th.hysteresis });
  if (!level) return;

  const sensor = await Sensor.findById(sensorId, { plantId: 1, type: 1 }).lean();
  if (!sensor) return;

  const doc = await Alert.create({
    plantId: sensor.plantId,
    sensorId: sensorId,
    value,
    level,
    message: level === 'critica' ? 'Value outside threshold' : 'Value near threshold',
    createdAt: ts,
  });

  emitAlert({
    id: String(doc._id),
    plantId: String(sensor.plantId),
    sensorId: sensorId,
    sensorType,
    value,
    ts: ts.toISOString(),
    threshold: { min: th.min, max: th.max, hysteresis: th.hysteresis },
    level,
  });
}

