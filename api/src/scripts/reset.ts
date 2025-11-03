import 'dotenv/config';
import mongoose from 'mongoose';
import { connectMongo } from '../database/mongoDB/config.js';
import { initCassandra } from '../database/cassandra/config.js';

async function resetMongo() {
  await connectMongo();
  const db = mongoose.connection.db;
  if (!db) return;
  const name = db.databaseName;
  await db.dropDatabase();
  console.log('🗑️  MongoDB dropDatabase:', name);
  await mongoose.disconnect();
}

async function resetCassandra() {
  try {
    const cass = await initCassandra();
    await cass.execute('TRUNCATE greendata.readings');
    console.log('🗑️  Cassandra TRUNCATE greendata.readings');
  } catch (e) {
    console.warn('⚠️ Cassandra no disponible, se omite TRUNCATE');
  }
}

async function run() {
  await resetMongo();
  await resetCassandra();
  console.log('✅ Reset completado');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Reset error', err);
  process.exit(1);
});

