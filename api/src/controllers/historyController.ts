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

// downsampling fijo por paso 1m/5m/1h en rango de fechas
export const getAggregatedHistory = async (req: Request, res: Response) => {
  const plant = String(req.query.plant || '');
  const sensor = String(req.query.sensor || '');
  const step = String(req.query.step || '1m'); // '1m' | '5m' | '1h'
  const fromParam = req.query.from;
  const toParam = req.query.to;
  if (!plant || !sensor) return res.status(400).json({ error: 'Missing plant or sensor' });

  const bucketMs = step === '1h' ? 3600000 : step === '5m' ? 5 * 60000 : 60000;
  let client = getCassandra(); if (!client) client = await initCassandra();

  let from = parseTs(fromParam) ?? new Date(Date.now() - 3600000);
  let to = parseTs(toParam) ?? new Date();
  if (from.getTime() > to.getTime()) { const t = from; from = to; to = t; }

  const ymdList = makeYmdList(from, to, 31);
  const q = `SELECT ts, value FROM greendata.readings WHERE plant_id = ? AND sensor_type = ? AND ymd = ?`;
  const buckets = new Map<number, { sum: number; min: number; max: number; count: number }>();
  for (const ymd of ymdList) {
    const rs = await client!.execute(q, [plant, sensor, ymd], { prepare: true });
    for (const r of rs.rows) {
      const ts = r.get('ts') as Date; const v = r.get('value') as number;
      if (ts < from || ts > to) continue;
      const k = Math.floor(ts.getTime() / bucketMs) * bucketMs;
      const cur = buckets.get(k) || { sum: 0, min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY, count: 0 };
      cur.sum += v; cur.count += 1; cur.min = Math.min(cur.min, v); cur.max = Math.max(cur.max, v);
      buckets.set(k, cur);
    }
  }
  const data = Array.from(buckets.entries())
    .sort((a,b) => a[0]-b[0])
    .map(([k, { sum, min, max, count }]) => ({ tsISO: new Date(k).toISOString(), avg: sum / count, min: isFinite(min)?min:null, max: isFinite(max)?max:null, count }));
  return res.json(ok(data));
};

// agregados diarios precomputados (min/avg/max/count)
export const getDailyAggregates = async (req: Request, res: Response) => {
  const plant = String(req.query.plant || '');
  const sensor = String(req.query.sensor || '');
  const fromParam = req.query.from; const toParam = req.query.to;
  if (!plant || !sensor) return res.status(400).json({ error: 'Missing plant or sensor' });
  let client = getCassandra(); if (!client) client = await initCassandra();

  let from = parseTs(fromParam) ?? new Date();
  let to = parseTs(toParam) ?? from;
  if (from.getTime() > to.getTime()) { const t = from; from = to; to = t; }
  const ymdList = makeYmdList(from, to, 90);
  const selDaily = 'SELECT min, avg, max, count FROM greendata.readings_daily WHERE plant_id = ? AND sensor_type = ? AND ymd = ?';
  const insDaily = 'INSERT INTO greendata.readings_daily (plant_id, sensor_type, ymd, min, avg, max, count) VALUES (?,?,?,?,?,?,?)';
  const selDayRaw = 'SELECT ts, value FROM greendata.readings WHERE plant_id = ? AND sensor_type = ? AND ymd = ?';

  const out: Array<{ dayISO: string; min: number|null; avg: number|null; max: number|null; count: number }>=[];
  for (const ymd of ymdList) {
    let min: number|null = null, avg: number|null = null, max: number|null = null; let count = 0;
    const rs = await client.execute(selDaily, [plant, sensor, ymd], { prepare: true });
    if (rs.rowLength && rs.rows[0]) {
      const r = rs.rows[0]; min = r.get('min') as number | null; avg = r.get('avg') as number | null; max = r.get('max') as number | null; count = Number(r.get('count') ?? 0);
    } else {
      // calcular desde lecturas y persistir
      let sum = 0; let c = 0; let mn = Number.POSITIVE_INFINITY; let mx = Number.NEGATIVE_INFINITY;
      const raw = await client.execute(selDayRaw, [plant, sensor, ymd], { prepare: true });
      for (const row of raw.rows) {
        const v = row.get('value') as number; sum += v; c++; if (v<mn) mn=v; if (v>mx) mx=v;
      }
      if (c>0) { min = mn; max = mx; avg = sum / c; count = c; await client.execute(insDaily, [plant, sensor, ymd, min, avg, max, count], { prepare: true }); }
      else { min = null; max = null; avg = null; count = 0; }
    }
    const dayISO = ymd.toString(); // LocalDate -> yyyy-mm-dd
    out.push({ dayISO, min, avg, max, count });
  }
  return res.json(ok(out));
};
