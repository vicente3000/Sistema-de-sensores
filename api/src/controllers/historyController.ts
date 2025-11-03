import { Request, Response } from 'express';
import { getCassandra, initCassandra } from '../database/cassandra/config.js';
import { ok } from '../utils/apiResponse.js';
import { types } from 'cassandra-driver';

// Devuelve últimos N puntos del día actual para una planta/sensor
function parseTs(input: unknown): Date | null {
  if (typeof input === 'number') return new Date(input > 1e12 ? input : input * 1000);
  if (typeof input === 'string') return new Date(input);
  return null;
}

function makeYmdList(from: Date, to: Date, maxDays = 31): types.LocalDate[] {
  const dayMs = 24 * 60 * 60 * 1000;
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  const days = Math.min(Math.floor((end.getTime() - start.getTime()) / dayMs) + 1, maxDays);
  const res: types.LocalDate[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * dayMs);
    res.push(types.LocalDate.fromDate(d));
  }
  return res;
}

function downsample(points: Array<{ ts: Date; value: number }>, maxPoints: number): Array<{ tsISO: string; value: number }>{
  const n = points.length;
  if (n <= maxPoints) return points.map(p => ({ tsISO: p.ts.toISOString(), value: p.value }));
  const bucketSize = Math.ceil(n / maxPoints);
  const out: Array<{ tsISO: string; value: number }> = [];
  for (let i = 0; i < n; i += bucketSize) {
    const slice = points.slice(i, i + bucketSize);
    const avg = slice.reduce((s, p) => s + p.value, 0) / slice.length;
    out.push({ tsISO: slice[0].ts.toISOString(), value: avg });
  }
  return out;
}

export const getSensorHistory = async (req: Request, res: Response) => {
  const plant = String(req.query.plant || '');
  const sensor = String(req.query.sensor || '');
  const limit = Math.min(Number(req.query.limit ?? 10000), 50000);
  const maxPoints = Math.min(Number(req.query.maxPoints ?? limit), 50000);
  const fromParam = req.query.from;
  const toParam = req.query.to;

  if (!plant || !sensor) {
    return res.status(400).json({ error: 'Missing plant or sensor' });
  }

  let client = getCassandra();
  if (!client) client = await initCassandra();

  const now = new Date();
  let from = parseTs(fromParam) ?? now;
  let to = parseTs(toParam) ?? from;
  if (from.getTime() > to.getTime()) {
    const tmp = from; from = to; to = tmp;
  }

  // Construir lista de particiones por día (máximo 31 días)
  const ymdList = makeYmdList(from, to, 31);
  // Si no hay from/to, cubrir desfase horario probando ayer/hoy/mañana
  if (!fromParam && !toParam && ymdList.length === 1) {
    const yesterday = types.LocalDate.fromDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    const tomorrow = types.LocalDate.fromDate(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    ymdList.push(yesterday, tomorrow);
  }

  const query = `SELECT ts, value FROM greendata.readings WHERE plant_id = ? AND sensor_type = ? AND ymd = ?`;
  const raw: Array<{ ts: Date; value: number }> = [];
  for (const ymd of ymdList) {
    const rs = await client!.execute(query, [plant, sensor, ymd], { prepare: true });
    for (const r of rs.rows) raw.push({ ts: r.get('ts') as Date, value: r.get('value') as number });
    if (raw.length >= limit) break;
  }

  // Ordenar ascendente por ts para facilitar gráficos
  raw.sort((a, b) => a.ts.getTime() - b.ts.getTime());
  const data = downsample(raw.slice(-limit), maxPoints);
  return res.json(ok(data));
};
