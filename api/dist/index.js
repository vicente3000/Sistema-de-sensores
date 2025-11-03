import express from "express";
import dotenv from "dotenv";
import cors from 'cors';
import helmet from 'helmet';
import { connectMongo } from "./database/mongoDB/config.js";
import { initCassandra } from "./database/cassandra/config.js";
import apiV1 from "./routes/v1/index.js";
import { errorHandler, notFound } from './middlewares/error.js';
// Cargar variables de entorno (.env)
dotenv.config();
// Crear aplicación Express
const app = express();
// Middlewares básicos
app.use(express.json());
app.use(cors({ origin: process.env.SOCKET_IO_CORS_ORIGIN || '*' }));
app.use(helmet());
// Logger muy simple
app.use((req, _res, next) => { console.log(`${req.method} ${req.url}`); next(); });
// Puerto desde variable de entorno o 3000 por defecto
const PORT = process.env.PORT || 3000;
// Inicialización principal
async function startServer() {
    try {
        console.log("🚀 Iniciando conexiones...");
        await connectMongo();
        // Cassandra es opcional para endpoints CRUD; inicializa si hay variables definidas
        try {
            await initCassandra();
        }
        catch {
            console.warn('⚠️ Cassandra no disponible (solo afectará /sensors/history)');
        }
        app.listen(PORT, () => {
            console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error("❌ Error al iniciar el servidor:", error);
        process.exit(1);
    }
}
// Rutas API v1
app.use("/api/v1", apiV1);
// Healthcheck
app.get('/health', (_req, res) => res.json({ ok: true }));
// Manejo 404 y errores
app.use(notFound);
app.use(errorHandler);
startServer();
