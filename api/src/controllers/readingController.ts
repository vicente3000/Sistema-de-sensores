import { Request, Response } from 'express';
import { initCassandra } from '../database/cassandra/config.js';
import { ok } from '../utils/apiResponse.js';
import { types } from 'cassandra-driver';
import type { ReadingInput } from '../schemas/readingSchemas.js';
import mongoose from 'mongoose';
import { Sensor } from '../models/sensor.js';
import { HttpError } from '../middlewares/error.js';
import { emitSensorData } from '../realtime/socket.js';
import { processReadingAlert } from '../services/alertService.js';

function parseTs(ts?: string | number): Date {
  if (ts === undefined) return new Date();
  if (typeof ts === 'number') {
    // heurística: epoch ms vs s
    return new Date(ts > 1e12 ? ts : ts * 1000);
  }
  return new Date(ts);
}

function toParams(r: ReadingInput) {
  const ts = parseTs(r.ts);
  const ymd = types.LocalDate.fromDate(ts);
  return [r.plant, r.sensorType, ymd, ts, r.sensorId, r.value] as const;
}

export const postReading = async (req: Request, res: Response) => {
  const strict = process.env.READINGS_STRICT_VALIDATE === '1';
  const validate = strict || String(req.query.validate || '').trim() === '1';
  if (validate) {
    if (!mongoose.isValidObjectId(req.body.sensorId)) {
      throw new HttpError(400, 'Invalid sensorId');
    }
    const sensor = await Sensor.findById(req.body.sensorId).lean();
    if (!sensor) throw new HttpError(400, 'Unknown sensorId');
    if (sensor.type !== req.body.sensorType) throw new HttpError(400, 'sensorType mismatch with Sensor document');
  }
  const client = await initCassandra();
  const q = 'INSERT INTO greendata.readings (plant_id, sensor_type, ymd, ts, sensor_id, value) VALUES (?,?,?,?,?,?)';
  const params = toParams(req.body);
  await client.execute(q, [...params], { prepare: true });
  // emite dato live y procesa alerta en background
  try {
    const tsISO = parseTs(req.body.ts).toISOString();
    emitSensorData(req.body.plant, req.body.sensorType, tsISO, req.body.value);
    void processReadingAlert({ sensorId: req.body.sensorId, sensorType: req.body.sensorType, value: req.body.value, ts: new Date(tsISO) });
  } catch {}
  return res.status(201).json(ok({ inserted: 1 }));
};

export const postReadingsBatch = async (req: Request, res: Response) => {
  const strict = process.env.READINGS_STRICT_VALIDATE === '1';
  const validate = strict || String(req.query.validate || '').trim() === '1';
  const maxBatch = Number(process.env.READINGS_MAX_BATCH ?? 1000);
  if (validate) {
    // Validar todos los sensores primero
    const ids = Array.from(new Set((req.body.readings ?? []).map((r: ReadingInput) => r.sensorId)));
    for (const id of ids) {
      if (!mongoose.isValidObjectId(id)) {
        throw new HttpError(400, `Invalid sensorId ${id}`);
      }
    }
    const sensors = await Sensor.find({ _id: { $in: ids } }).lean();
    const map = new Map(sensors.map(s => [String(s._id), s] as const));
    for (const r of req.body.readings ?? []) {
      const s = map.get(r.sensorId);
      if (!s) throw new HttpError(400, `Unknown sensorId ${r.sensorId}`);
      if (s.type !== r.sensorType) throw new HttpError(400, `sensorType mismatch for ${r.sensorId}`);
    }
  }
  const items: ReadingInput[] = req.body.readings ?? [];
  if (items.length > maxBatch) {
    throw new HttpError(400, `Batch too large. Max is ${maxBatch}`);
  }
  const client = await initCassandra();
  const q = 'INSERT INTO greendata.readings (plant_id, sensor_type, ymd, ts, sensor_id, value) VALUES (?,?,?,?,?,?)';

  if (items.length === 1) {
    const params = toParams(items[0]);
    await client.execute(q, [...params], { prepare: true });
    return res.status(201).json(ok({ inserted: 1 }));
  }

  const queries = items.map((r) => ({ query: q, params: [...toParams(r)] }));
  await client.batch(queries, { prepare: true });
  // emite datos live y procesa alertas por cada item
  try {
    for (const r of items) {
      const ts = parseTs(r.ts);
      emitSensorData(r.plant, r.sensorType, ts.toISOString(), r.value);
      void processReadingAlert({ sensorId: r.sensorId, sensorType: r.sensorType, value: r.value, ts });
    }
  } catch {}
  return res.status(201).json(ok({ inserted: items.length }));
};
