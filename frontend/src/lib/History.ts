import type { SensorType } from "./RealTime";

export type HistoryPoint = { tsISO: string; value: number };

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export async function fetchHistory(params: {
    plant: string; sensor: SensorType; limit: number;
}): Promise<HistoryPoint[]> {
    const url = new URL(`${API_BASE}/sensors/history`);
    url.searchParams.set("plant", params.plant);
    url.searchParams.set("sensor", params.sensor);
    url.searchParams.set("limit", String(params.limit));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}
