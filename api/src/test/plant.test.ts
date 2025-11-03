import request from "supertest";
import express from "express";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import plantRoute from "../routes/plantRoute.js";
import { connectMongo } from "../database/mongoDB/config.js";
import mongoose from "mongoose";

// Crear app temporal para test
const app = express();
app.use(express.json());
app.use("/plants", plantRoute);

beforeAll(async () => {
  await connectMongo();
});

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase();
  await mongoose.disconnect();
});

describe("POST /plants/add", () => {
  it("debería crear una planta sin sensores", async () => {
    const payload = {
      plant: { name: "Albahaca Test" },
      sensors: [],
    };

    const res = await request(app).post("/plants/add").send(payload);

    expect(res.status).toBe(201);
    expect(res.body.plant.name).toBe("Albahaca Test");
    expect(res.body.plant.sensors.length).toBe(0);
  });

  it("debería crear una planta con sensores", async () => {
    const payload = {
      plant: { name: "Tomate Test", type: "Tomate" },
      sensors: [
        {
          id: "sensor-1",
          type: "humidity",
          scheduleMode: "predefinida",
          everyHours: 2,
        },
      ],
    };

    const res = await request(app).post("/plants/add").send(payload);

    expect(res.status).toBe(201);
    expect(res.body.plant.name).toBe("Tomate Test");
    expect(res.body.plant.type).toBe("Tomate");
    expect(res.body.plant.sensors.length).toBe(1);
    expect(res.body.plant.sensors[0].type).toBe("humidity");
  });
});
