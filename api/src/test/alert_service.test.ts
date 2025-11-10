import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { connectMongo } from '../database/mongoDB/config.js';
import { Plant } from '../models/Plant.js';
import { Sensor } from '../models/sensor.js';
import { Threshold } from '../models/threshold.js';
import { Alert } from '../models/alert.js';
import { processReadingAlert } from '../services/alertService.js';

describe('alertService dedup', () => {
  let plantId: any; let sensorId: any;

  beforeAll(async () => {
    process.env.ALERTS_DEDUP_SECONDS = '5';
    await connectMongo();
  });

  afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Plant.deleteMany({});
    await Sensor.deleteMany({});
    await Threshold.deleteMany({});
    await Alert.deleteMany({});

    const p = await Plant.create({ name: 'P', type: 'X' });
    const s = await Sensor.create({ plantId: p._id, type: 'humidity' });
    await Threshold.create({ sensorId: s._id, min: 30, max: 70, hysteresis: 0 });
    plantId = p._id; sensorId = s._id;
  });

  it('creates one alert and dedups within window', async () => {
    const base = new Date('2025-11-08T00:00:00Z');
    await processReadingAlert({ sensorId: String(sensorId), sensorType: 'humidity', value: 85, ts: base });
    await processReadingAlert({ sensorId: String(sensorId), sensorType: 'humidity', value: 86, ts: new Date(base.getTime() + 3000) });
    const count = await Alert.countDocuments({ sensorId, level: 'critica' });
    expect(count).toBe(1);
  });

  it('creates a new alert after window', async () => {
    const base = new Date('2025-11-08T00:00:00Z');
    await processReadingAlert({ sensorId: String(sensorId), sensorType: 'humidity', value: 85, ts: base });
    await processReadingAlert({ sensorId: String(sensorId), sensorType: 'humidity', value: 86, ts: new Date(base.getTime() + 6000) });
    const count = await Alert.countDocuments({ sensorId, level: 'critica' });
    expect(count).toBe(2);
  });
});

