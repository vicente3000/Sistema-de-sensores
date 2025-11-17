import express from "express";
import mongoose, { Types } from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectMongo } from "../database/mongoDB/config.js";
import { Alert } from "../models/alert.js";

describe("Alerts status workflow", () => {
  const app = express();
  app.use(express.json());
  let apiV1: any;

  beforeAll(async () => {
    // Aislar BD para evitar interferencias entre suites
    process.env.MONGO_URI =
      "mongodb://localhost:27017/greendata_test_alerts_status";
    await connectMongo();
    const mod = await import("../routes/v1/index.js");
    apiV1 = mod.default;
    app.use("/api/v1", apiV1);
  });

  afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
  });

  it("updates status via PATCH /alerts/:id/status and ack sets completado", async () => {
    const a = await Alert.create({
      plantId: new Types.ObjectId(),
      sensorId: new Types.ObjectId(),
      value: 99,
      level: "critica",
      status: "pendiente",
      createdAt: new Date("2025-11-01T00:00:00Z"),
    });

    const res1 = await request(app)
      .patch(`/api/v1/alerts/${String(a._id)}/status`)
      .send({ status: "en_progreso" });
    expect(res1.status).toBe(200);
    expect(res1.body.data.status).toBe("en_progreso");

    const res2 = await request(app)
      .patch(`/api/v1/alerts/${String(a._id)}/ack`)
      .send({ by: "tester" });
    expect(res2.status).toBe(200);
    expect(res2.body.data.status).toBe("completado");
  });
});
