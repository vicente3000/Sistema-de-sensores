import { Request, Response } from 'express';
import { initCassandra } from '../database/cassandra/config.js';
import { ok } from '../utils/apiResponse.js';
import { types } from 'cassandra-driver';
import type { ReadingInput } from '../schemas/readingSchemas.js';

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
  const client = await initCassandra();
  const q = 'INSERT INTO greendata.readings (plant_id, sensor_type, ymd, ts, sensor_id, value) VALUES (?,?,?,?,?,?)';
  const params = toParams(req.body);
  await client.execute(q, [...params], { prepare: true });
  return res.status(201).json(ok({ inserted: 1 }));
};

export const postReadingsBatch = async (req: Request, res: Response) => {
  const client = await initCassandra();
  const q = 'INSERT INTO greendata.readings (plant_id, sensor_type, ymd, ts, sensor_id, value) VALUES (?,?,?,?,?,?)';
  const items: ReadingInput[] = req.body.readings ?? [];

  if (items.length === 1) {
    const params = toParams(items[0]);
    await client.execute(q, [...params], { prepare: true });
    return res.status(201).json(ok({ inserted: 1 }));
  }

  const queries = items.map((r) => ({ query: q, params: [...toParams(r)] }));
  await client.batch(queries, { prepare: true });
  return res.status(201).json(ok({ inserted: items.length }));
};

