import { Client } from 'cassandra-driver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Reemplazo de __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const initCassandra = async () => {
  try {
    console.log('🚀 Iniciando Cassandra...');

    const client = new Client({
      contactPoints: ['cassandra'], // coincide con el nombre del servicio en docker-compose
      localDataCenter: 'datacenter1', // debe coincidir con el DC real que Cassandra crea
      keyspace: 'greendata', // opcional, puedes crear el keyspace más tarde con init.cql
    });

    await client.connect();
    console.log('✅ Conectado a Cassandra');

    // Leer el init.cql desde la carpeta dist
    const initCqlPath = path.join(__dirname, 'init.cql');
    if (fs.existsSync(initCqlPath)) {
      const cql = fs.readFileSync(initCqlPath, 'utf-8');

      // Ejecutar queries del init.cql
      const queries = cql
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0);

      for (const query of queries) {
        await client.execute(query);
      }
      console.log('✅ Script init.cql ejecutado correctamente');
    } else {
      console.log('⚠️ init.cql no encontrado en dist, se omite ejecución de script');
    }

    return client;
  } catch (err) {
    console.error('❌ Error al iniciar Cassandra:', err);
    throw err;
  }
};
