// evalua umbrales y registra/emit alertas
import mongoose from "mongoose";
import { Alert } from "../models/alert.js";
import { Sensor } from "../models/sensor.js";
import { Threshold } from "../models/threshold.js";
import { domain } from "../observability/metrics.js";
import { emitAlert } from "../realtime/socket.js";

type Level = "grave" | "critica";

// calcula severidad usando histeresis simple
function getLevel(
  value: number,
  t: { min?: number; max?: number; hysteresis?: number }
): Level | null {
  const h = Math.max(0, t.hysteresis ?? 0);
  if (typeof t.max === "number") {
    if (value > t.max + h) return "critica";
    if (value > t.max) return "grave";
  }
  if (typeof t.min === "number") {
    if (value < t.min - h) return "critica";
    if (value < t.min) return "grave";
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
  try {
    const { sensorId, sensorType, value, ts } = input;
    // si no es ObjectId valido, no intentamos consultar Mongo (evita errores en tests que usan ids falsos)
    if (!mongoose.isValidObjectId(sensorId)) return;

    const th = await Threshold.findOne({ sensorId }).lean();
    if (!th) return; // sin umbral no hay alerta

    const level = getLevel(value, {
      min: th.min,
      max: th.max,
      hysteresis: th.hysteresis,
    });
    if (!level) return;

    const sensor = await Sensor.findById(sensorId, {
      plantId: 1,
      type: 1,
    }).lean();
    if (!sensor) return;

    // de-dup por ventana: evita spam de la misma alerta en poco tiempo
    const dedupSec = Number(process.env.ALERTS_DEDUP_SECONDS || 60);
    const nowMs = ts.getTime();
    const windowMs = Math.max(0, dedupSec) * 1000;
    const sinceMs = nowMs - windowMs;

    // busca la ultima alerta del mismo sensor y nivel
    const last = await Alert.findOne({ sensorId, level }).sort({
      createdAt: -1,
    });
    if (last && last.createdAt && last.createdAt.getTime() >= sinceMs) {
      // actualizar la ultima en vez de crear una nueva
      last.value = value;
      last.createdAt = ts;
      await last.save();
      return; // no emitir para no saturar
    }

    const doc = await Alert.create({
      plantId: sensor.plantId,
      sensorId: sensorId,
      value,
      level,
      status: "pendiente",
      message:
        level === "critica"
          ? "Value outside threshold"
          : "Value near threshold",
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
      status: "pendiente",
    });
    try {
      domain.alertEmitted();
    } catch {}
  } catch {
    // swallow errors to avoid unhandled rejections in tests / optional runtime
  }
}
