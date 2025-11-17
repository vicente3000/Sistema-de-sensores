import request from 'supertest';
import express from 'express';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectMongo } from '../database/mongoDB/config.js';
import mongoose from 'mongoose';

describe('Sensors & Thresholds', () => {
  const app = express();
  app.use(express.json());

  let apiV1: any;

  beforeAll(async () => {
    // Aislar BD para evitar interferencias entre suites ejecutadas en paralelo por workers
    process.env.MONGO_URI = 'mongodb://localhost:27017/greendata_test_sensor_threshold';
    await connectMongo();
    // Import diferido para permitir ESM y rutas
    const mod = await import('../routes/v1/index.js');
    apiV1 = mod.default;
    app.use('/api/v1', apiV1);
  });

  afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
  });

  it('create sensor, upsert/get/delete threshold', async () => {
    // Create plant
    const plantRes = await request(app)
      .post('/api/v1/plants')
      .send({ name: 'Test Plant', type: 'X' });
    expect(plantRes.status).toBe(201);
    const plantId = plantRes.body.data._id as string;

    // Create sensor
    const sensorRes = await request(app)
      .post(`/api/v1/plants/${plantId}/sensors`)
      .send({ type: 'humidity' });
    expect(sensorRes.status).toBe(201);
    const sensorId = sensorRes.body.data._id as string;

    // Upsert threshold
    const putTh = await request(app)
      .put(`/api/v1/sensors/${sensorId}/threshold`)
      .send({ min: 30, max: 70, hysteresis: 2 });
    expect(putTh.status).toBe(200);
    expect(putTh.body.data.min).toBe(30);

    // Get threshold
    const getTh = await request(app).get(`/api/v1/sensors/${sensorId}/threshold`);
    expect(getTh.status).toBe(200);
    expect(getTh.body.data.max).toBe(70);

    // Delete threshold
    const delTh = await request(app).delete(`/api/v1/sensors/${sensorId}/threshold`);
    expect(delTh.status).toBe(200);

    // Delete sensor
    const delSensor = await request(app).delete(`/api/v1/sensors/${sensorId}`);
    expect(delSensor.status).toBe(200);
  });
});

