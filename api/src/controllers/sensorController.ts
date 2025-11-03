import { Request, Response } from 'express';
import { Sensor } from '../models/sensor.js';
import { Threshold } from '../models/threshold.js';
import { Plant } from '../models/Plant.js';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../middlewares/error.js';

export const listSensorsByPlant = async (req: Request, res: Response) => {
  const { plantId } = req.params;
  const exists = await Plant.exists({ _id: plantId });
  if (!exists) throw new HttpError(404, 'Plant not found');
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const offset = Math.max(Number(req.query.offset ?? 0), 0);
  const type = (req.query.type as string | undefined);
  const q: any = { plantId };
  if (type) q.type = type;
  const [items, total] = await Promise.all([
    Sensor.find(q).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Sensor.countDocuments(q)
  ]);
  return res.json(ok({ items, total, limit, offset }));
};

export const createSensor = async (req: Request, res: Response) => {
  const { plantId } = req.params;
  const plant = await Plant.findById(plantId);
  if (!plant) throw new HttpError(404, 'Plant not found');
  const sensor = await Sensor.create({ plantId, type: req.body.type, unit: req.body.unit });
  return res.status(201).json(ok(sensor));
};

export const getSensor = async (req: Request, res: Response) => {
  const sensor = await Sensor.findById(req.params.sensorId).lean();
  if (!sensor) throw new HttpError(404, 'Sensor not found');
  return res.json(ok(sensor));
};

export const updateSensor = async (req: Request, res: Response) => {
  const { sensorId } = req.params;
  const update: any = {};
  if (typeof req.body.type === 'string') update.type = req.body.type;
  if (typeof req.body.unit === 'string') update.unit = req.body.unit;
  const sensor = await Sensor.findByIdAndUpdate(sensorId, update, { new: true }).lean();
  if (!sensor) throw new HttpError(404, 'Sensor not found');
  return res.json(ok(sensor));
};

export const deleteSensor = async (req: Request, res: Response) => {
  const { sensorId } = req.params;
  const sensor = await Sensor.findByIdAndDelete(sensorId).lean();
  if (!sensor) throw new HttpError(404, 'Sensor not found');
  await Threshold.deleteMany({ sensorId });
  return res.json(ok({ deleted: true }));
};
