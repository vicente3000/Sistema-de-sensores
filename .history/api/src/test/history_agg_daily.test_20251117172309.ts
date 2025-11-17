import request from 'supertest';
import express from 'express';
import { describe, it, expect, beforeAll, vi } from 'vitest';

// Fake Cassandra client
const fakeClient = {
  execute: vi.fn(async () => ({ rows: [] })),
};

vi.mock('../database/cassandra/config.js', () => {
  return {
    getCassandra: () => fakeClient,
    initCassandra: async () => fakeClient,
  };
});

describe('Aggregated history and daily aggregates', () => {
  const app = express();
  app.use(express.json());
  let apiV1: any;

  beforeAll(async () => {
    const mod = await import('../routes/v1/index.js');
    apiV1 = mod.default;
    app.use('/api/v1', apiV1);
  });

  it('GET /sensors/history/agg returns aggregated buckets', async () => {
    const row = (ts: Date, v: number) => ({ get: (k: string) => (k === 'ts' ? ts : v) } as any);
    // prepare rows across a small range to build a few buckets
    fakeClient.execute.mockResolvedValueOnce({ rows: [
      row(new Date('2025-11-03T00:00:00Z'), 10),
      row(new Date('2025-11-03T00:01:00Z'), 20),
      row(new Date('2025-11-03T00:02:00Z'), 30),
    ] } as any);
    // next partitions empty
    fakeClient.execute.mockResolvedValue({ rows: [] });

    const res = await request(app).get('/api/v1/sensors/history/agg')
      .query({ plant: 'p1', sensor: 'humidity', step: '1m', from: '2025-11-03T00:00:00Z', to: '2025-11-03T00:05:00Z' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toHaveProperty('tsISO');
    expect(res.body.data[0]).toHaveProperty('avg');
  });

  it('GET /sensors/daily returns daily aggregates', async () => {
    const makeDaily = (min: number, avg: number, max: number, count: number) => ({
      get: (k: string) => ({ min, avg, max, count } as any)[k]
    } as any);
    // first call: daily row exists
    fakeClient.execute.mockResolvedValueOnce({ rows: [makeDaily(1, 2.5, 4, 10)] } as any);
    // next calls empty
    fakeClient.execute.mockResolvedValue({ rows: [] });

    const res = await request(app).get('/api/v1/sensors/daily')
      .query({ plant: 'p1', sensor: 'humidity', from: '2025-11-03T00:00:00Z', to: '2025-11-03T23:59:59Z' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toHaveProperty('dayISO');
    expect(res.body.data[0]).toHaveProperty('avg');
  });
});
