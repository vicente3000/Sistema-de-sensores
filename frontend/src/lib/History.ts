import type { SensorType } from "./RealTime";

export type HistoryPoint = { tsISO: string; value: number };
export type AggPoint = { tsISO: string; avg: number; min: number | null; max: number | null; count: number };
export type DailyPoint = { dayISO: string; min: number | null; avg: number | null; max: number | null; count: number };

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

// historico crudo (limite)
export async function fetchHistory(params: { plant: string; sensor: SensorType; limit: number; }): Promise<HistoryPoint[]> {
  const url = new URL(`${API_BASE}/api/v1/sensors/history`);
  url.searchParams.set("plant", params.plant);
  url.searchParams.set("sensor", params.sensor);
  url.searchParams.set("limit", String(params.limit));
  const res = await fetch(url.toString()); if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json(); return body.data ?? body;
}

// agregados por paso fijo
export async function fetchAgg(params: { plant: string; sensor: SensorType; step: '1m'|'5m'|'1h'; from?: string; to?: string; }): Promise<AggPoint[]> {
  const url = new URL(`${API_BASE}/api/v1/sensors/history/agg`);
  url.searchParams.set("plant", params.plant);
  url.searchParams.set("sensor", params.sensor);
  url.searchParams.set("step", params.step);
  if (params.from) url.searchParams.set("from", params.from);
  if (params.to) url.searchParams.set("to", params.to);
  const res = await fetch(url.toString()); if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json(); return body.data ?? body;
}

// agregados diarios min/avg/max
export async function fetchDaily(params: { plant: string; sensor: SensorType; from: string; to: string; }): Promise<DailyPoint[]> {
  const url = new URL(`${API_BASE}/api/v1/sensors/daily`);
  url.searchParams.set("plant", params.plant);
  url.searchParams.set("sensor", params.sensor);
  url.searchParams.set("from", params.from);
  url.searchParams.set("to", params.to);
  const res = await fetch(url.toString()); if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json(); return body.data ?? body;
}
