import 'dotenv/config';
import { connectMongo } from '../database/mongoDB/config.js';
import { Plant } from '../models/Plant.js';
import { Sensor } from '../models/sensor.js';
import { Threshold } from '../models/threshold.js';
import { initCassandra } from '../database/cassandra/config.js';
import { types } from 'cassandra-driver';

async function run() {
  await connectMongo();
  const [p] = await Plant.create([{ name: 'Albahaca Demo', type: 'Hierba' }]);
  const s = await Sensor.create({ plantId: p._id, type: 'humidity', unit: '%' });
  await Threshold.create({ sensorId: s._id, min: 30, max: 70, hysteresis: 2 });

  try {
    const cass = await initCassandra();
    const now = new Date();
    const ymd = types.LocalDate.fromDate(now);
    const q = 'INSERT INTO greendata.readings (plant_id, sensor_type, ymd, ts, sensor_id, value) VALUES (?,?,?,?,?,?)';
    const values = [
      ['p1', 'humidity', ymd, new Date(now.getTime() - 5 * 60 * 1000), 's1', 42.5],
      ['p1', 'humidity', ymd, new Date(now.getTime() - 2 * 60 * 1000), 's1', 44.2],
    ] as const;
    for (const v of values) {
      await cass.execute(q, [...v], { prepare: true });
    }
  } catch (err) {
    console.warn('⚠️ Cassandra no disponible, se omite seed de lecturas');
  }
  console.log('✅ Seed completado:', { plantId: String((p as any)._id), sensorId: String((s as any)._id) });
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Seed error', err);
  process.exit(1);
});
