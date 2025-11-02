import express from "express";
import dotenv from "dotenv";
import { connectMongo } from "./database/mongoDB/config.js";
import { initCassandra } from "./database/cassandra/config.js";
import plantRoute from "./routes/plantRoute";

// Cargar variables de entorno (.env)
dotenv.config();

// Crear aplicación Express
const app = express();

// Middleware básico
app.use(express.json());

// Puerto desde variable de entorno o 3000 por defecto
const PORT = process.env.PORT || 3000;

// Inicialización principal
async function startServer() {
  try {
    console.log("🚀 Iniciando conexiones...");

    await connectMongo();
    await initCassandra();

    app.listen(PORT, () => {
      console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
}

//Rutas

app.use("/plants", plantRoute);

startServer();

