import 'dotenv/config';
import { connectMongo } from '../database/mongoDB/config.js';
import { Plant } from '../models/Plant.js';
import { Sensor } from '../models/sensor.js';
import { Threshold } from '../models/threshold.js';
import { initCassandra } from '../database/cassandra/config.js';
import { types } from 'cassandra-driver';

async function seedMongo() {
  await connectMongo();
  await Plant.deleteMany({});
  await Sensor.deleteMany({});
  await Threshold.deleteMany({});

  const plants = await Plant.insertMany([
    { name: 'Albahaca Demo', type: 'Hierba' },
    { name: 'Tomate Demo', type: 'Hortaliza' },
    { name: 'Lechuga Demo', type: 'Hortaliza' },
  ]);

  const sensors: any[] = [];
  for (const p of plants) {
    sensors.push(
      await Sensor.create({ plantId: p._id, type: 'humidity', unit: '%' }),
      await Sensor.create({ plantId: p._id, type: 'temp', unit: 'C' }),
    );
  }

  for (const s of sensors) {
    if (s.type === 'humidity') await Threshold.create({ sensorId: s._id, min: 30, max: 70, hysteresis: 2 });
    if (s.type === 'temp') await Threshold.create({ sensorId: s._id, min: 10, max: 30, hysteresis: 1 });
  }

  return { plants, sensors };
}

async function seedCassandra() {
  try {
    const cass = await initCassandra();
    // limpiar tabla
    await cass.execute('TRUNCATE greendata.readings');
    const now = new Date();
    const ymd = types.LocalDate.fromDate(now);
    const q = 'INSERT INTO greendata.readings (plant_id, sensor_type, ymd, ts, sensor_id, value) VALUES (?,?,?,?,?,?)';
    const baseTs = now.getTime() - 60 * 60 * 1000; // última hora
    for (let i = 0; i < 120; i++) { // cada 30s, 120 puntos ~ 1h
      const ts = new Date(baseTs + i * 30 * 1000);
      const valH = 40 + Math.sin(i / 10) * 10 + Math.random() * 2; // humedad
      const valT = 22 + Math.cos(i / 15) * 3 + Math.random(); // temp
      await cass.execute(q, ['p1', 'humidity', ymd, ts, 's1', valH], { prepare: true });
      await cass.execute(q, ['p1', 'temp', ymd, ts, 's2', valT], { prepare: true });
    }
    console.log('✅ Seed Cassandra demo completado');
  } catch (e) {
    console.warn('⚠️ Cassandra no disponible, se omite seed demo de lecturas');
  }
}

async function run() {
  const { plants, sensors } = await seedMongo();
  console.log('✅ Seed Mongo demo', { plants: plants.length, sensors: sensors.length });
  await seedCassandra();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Seed demo error', err);
  process.exit(1);
});

