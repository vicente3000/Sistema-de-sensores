import express from "express";
import dotenv from "dotenv";
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import { connectMongo } from "./database/mongoDB/config.js";
import { initCassandra } from "./database/cassandra/config.js";
import apiV1 from "./routes/v1/index.js";
import legacyPlantRoute from "./routes/plantRoute.js";
import { errorHandler, notFound } from './middlewares/error.js';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

// Cargar variables de entorno (.env)
dotenv.config();

// Crear aplicación Express
const app = express();

// Middlewares básicos
app.use(express.json());
const isProd = process.env.NODE_ENV === 'production';
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: isProd ? allowedOrigin : '*' }));
app.use(helmet());
// Logger JSON con request id
app.use((req, _res, next) => {
  const id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  (req as any).id = id;
  const log = { t: new Date().toISOString(), id, method: req.method, url: req.url };
  console.log(JSON.stringify(log));
  next();
});

// Puerto desde variable de entorno o 3000 por defecto
const PORT = process.env.PORT || 3000;

// Inicialización principal
async function startServer() {
  try {
    console.log("🚀 Iniciando conexiones...");

    await connectMongo();
    // Cassandra es opcional para endpoints CRUD; inicializa si hay variables definidas
    try { await initCassandra(); } catch { console.warn('⚠️ Cassandra no disponible (solo afectará /sensors/history)'); }

    app.listen(PORT, () => {
      console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
}

// Rutas API v1
app.use("/api/v1", apiV1);
// Compatibilidad legado (simulador Python): POST /plants/add
app.use("/plants", legacyPlantRoute);
// Healthcheck (profundo)
import mongoose from 'mongoose';
import { getCassandra } from './database/cassandra/config.js';
app.get('/health', async (_req, res) => {
  const health: any = { ok: true, mongo: { ok: false }, cassandra: { ok: false } };
  try {
    // Mongo
    await mongoose.connection.db?.admin().ping();
    health.mongo.ok = true;
  } catch { health.ok = false; }
  try {
    const client = getCassandra();
    if (client) {
      await client.execute('SELECT now() FROM system.local');
      health.cassandra.ok = true;
    }
  } catch { health.ok = false; }
  res.json(health);
});
// Swagger UI (documentación)
if (!isProd || process.env.ENABLE_DOCS === '1') {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const openapiPath = path.join(__dirname, '..', 'openapi.yaml');
    const spec = YAML.parse(fs.readFileSync(openapiPath, 'utf8'));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
    app.get('/openapi.json', (_req, res) => res.json(spec));
    console.log('📘 Docs disponibles en /docs');
  } catch (e) {
    console.warn('⚠️ No se pudo cargar OpenAPI (openapi.yaml)');
  }
}
// Manejo 404 y errores
app.use(notFound);
app.use(errorHandler);

startServer();

