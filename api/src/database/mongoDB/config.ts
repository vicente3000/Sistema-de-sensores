import mongoose from "mongoose";

export async function connectMongo(): Promise<void> {
  const candidates: string[] = [];
  if (process.env.MONGO_URI) candidates.push(process.env.MONGO_URI);
  // Fallbacks locales comunes
  candidates.push(
    "mongodb://localhost:27017/greendata",
    "mongodb://127.0.0.1:27017/greendata",
    "mongodb://localhost:27017/sensores"
  );

  let lastErr: unknown = null;
  for (const uri of candidates) {
    try {
      await mongoose.connect(uri);
      console.log("✅ Conectado a MongoDB", uri);
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  console.error("❌ Error al conectar a MongoDB:", lastErr);
  throw lastErr;
}

export default mongoose;
