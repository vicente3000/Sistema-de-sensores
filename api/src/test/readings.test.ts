import request from 'supertest';
import express from 'express';
import { describe, it, expect, beforeAll, vi } from 'vitest';

// Fake Cassandra client
const fakeClient = {
  execute: vi.fn(async () => ({ rows: [] })),
  batch: vi.fn(async () => ({})),
};

// Mock Cassandra config before importing router
vi.mock('../database/cassandra/config.js', () => {
  return {
    getCassandra: () => fakeClient,
    initCassandra: async () => fakeClient,
  };
});

describe('Readings ingest & history (mocked Cassandra)', () => {
  const app = express();
  app.use(express.json());
  let apiV1: any;

  beforeAll(async () => {
    const mod = await import('../routes/v1/index.js');
    apiV1 = mod.default;
    app.use('/api/v1', apiV1);
  });

  it('POST /readings inserts one', async () => {
    fakeClient.execute.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/v1/readings').send({
      plant: 'p1', sensorType: 'humidity', sensorId: 's1', value: 12.3,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.inserted).toBe(1);
    expect(fakeClient.execute).toHaveBeenCalledTimes(1);
  });

  it('POST /readings/batch inserts many', async () => {
    fakeClient.batch.mockResolvedValueOnce({});
    const res = await request(app).post('/api/v1/readings/batch').send({
      readings: [
        { plant: 'p1', sensorType: 'humidity', sensorId: 's1', value: 1 },
        { plant: 'p1', sensorType: 'humidity', sensorId: 's2', value: 2 },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.inserted).toBe(2);
    expect(fakeClient.batch).toHaveBeenCalledTimes(1);
  });

  it('GET /sensors/history returns formatted points', async () => {
    // First call returns 2 rows
    const row = (ts: Date, v: number) => ({ get: (k: string) => (k === 'ts' ? ts : v) } as any);
    fakeClient.execute.mockResolvedValueOnce({ rows: [row(new Date('2025-11-03T00:00:00Z'), 10), row(new Date('2025-11-03T00:01:00Z'), 20)] } as any);
    // Subsequent calls empty
    fakeClient.execute.mockResolvedValue({ rows: [] });

    const res = await request(app).get('/api/v1/sensors/history')
      .query({ plant: 'p1', sensor: 'humidity', limit: 100, maxPoints: 2 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('tsISO');
    expect(res.body.data[0]).toHaveProperty('value');
  });
});
