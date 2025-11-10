// api client simple para UI
export type PlantDoc = { _id: string; name: string; type?: string; createdAt?: string };
export type SensorDoc = { _id: string; plantId: string; type: 'humidity'|'ph'|'temp'|'lux'; unit?: string; createdAt?: string };
export type ThresholdDoc = { _id?: string; sensorId: string; min: number; max: number; hysteresis?: number } | null;
export type AlertDoc = { _id: string; plantId: string; sensorId: string; value: number; level: 'normal'|'grave'|'critica'; createdAt: string };

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000';
const v1 = (p: string) => `${API_BASE}/api/v1${p}`;

async function http<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${text}`);
  }
  const body = await res.json().catch(() => null);
  return (body?.data ?? body) as T;
}

// plantas
export async function listPlants(params?: { q?: string; limit?: number; offset?: number }) {
  const url = new URL(v1('/plants'));
  if (params?.q) url.searchParams.set('q', params.q);
  if (params?.limit) url.searchParams.set('limit', String(params.limit));
  if (params?.offset) url.searchParams.set('offset', String(params.offset));
  return http<{ items: PlantDoc[]; total: number; limit: number; offset: number }>(url.toString());
}

export async function createPlant(input: { name: string; type?: string }) {
  return http<PlantDoc>(v1('/plants'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function getPlant(id: string) {
  return http<PlantDoc>(v1(`/plants/${id}`));
}

export async function updatePlant(id: string, input: { name?: string; type?: string }) {
  return http<PlantDoc>(v1(`/plants/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function deletePlant(id: string) {
  return http<{ deleted: true }>(v1(`/plants/${id}`), { method: 'DELETE' });
}

// sensores
export async function listSensors(plantId: string, params?: { type?: SensorDoc['type']; limit?: number; offset?: number }) {
  const url = new URL(v1(`/plants/${plantId}/sensors`));
  if (params?.type) url.searchParams.set('type', params.type);
  if (params?.limit) url.searchParams.set('limit', String(params.limit));
  if (params?.offset) url.searchParams.set('offset', String(params.offset));
  return http<{ items: SensorDoc[]; total: number; limit: number; offset: number }>(url.toString());
}

export async function createSensor(plantId: string, input: { type: SensorDoc['type']; unit?: string }) {
  return http<SensorDoc>(v1(`/plants/${plantId}/sensors`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function deleteSensor(sensorId: string) {
  return http<{ deleted: true }>(v1(`/sensors/${sensorId}`), { method: 'DELETE' });
}

// threshold
export async function getThreshold(sensorId: string): Promise<ThresholdDoc> {
  try {
    return await http<ThresholdDoc>(v1(`/sensors/${sensorId}/threshold`));
  } catch (e: any) {
    if (String(e.message).startsWith('HTTP 404')) return null;
    throw e;
  }
}

export async function upsertThreshold(sensorId: string, input: { min: number; max: number; hysteresis?: number }) {
  return http<ThresholdDoc>(v1(`/sensors/${sensorId}/threshold`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

// alertas
export async function listAlerts(params?: { plantId?: string; sensorId?: string; from?: string; to?: string; level?: 'normal'|'grave'|'critica'; limit?: number }) {
  const url = new URL(v1('/alerts'));
  if (params?.plantId) url.searchParams.set('plantId', params.plantId);
  if (params?.sensorId) url.searchParams.set('sensorId', params.sensorId);
  if (params?.from) url.searchParams.set('from', params.from);
  if (params?.to) url.searchParams.set('to', params.to);
  if (params?.level) url.searchParams.set('level', params.level);
  if (params?.limit) url.searchParams.set('limit', String(params.limit));
  return http<AlertDoc[]>(url.toString());
}
