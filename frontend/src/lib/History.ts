import type { SensorType } from "./RealTime";

export type HistoryPoint = { tsISO: string; value: number };

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

// pide historico al backend (api v1) y devuelve los puntos
export async function fetchHistory(params: {
    plant: string; sensor: SensorType; limit: number;
}): Promise<HistoryPoint[]> {
    const url = new URL(`${API_BASE}/api/v1/sensors/history`);
    url.searchParams.set("plant", params.plant);
    url.searchParams.set("sensor", params.sensor);
    url.searchParams.set("limit", String(params.limit));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return body.data ?? body;
}
