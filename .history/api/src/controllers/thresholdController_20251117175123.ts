import { Request, Response } from 'express';
import { Threshold } from '../models/threshold.js';
import { Sensor } from '../models/sensor.js';
import mongoose from 'mongoose';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../middlewares/error.js';

export const getThreshold = async (req: Request, res: Response) => {
  const { sensorId } = req.params;
  const doc = await Threshold.findOne({ sensorId }).lean();
  if (!doc) throw new HttpError(404, 'Threshold not found');
  return res.json(ok(doc));
};

export const upsertThreshold = async (req: Request, res: Response) => {
  const { sensorId } = req.params;
  const sid = mongoose.isValidObjectId(sensorId) ? new mongoose.Types.ObjectId(sensorId) : sensorId;
  const sensorExists = await Sensor.exists({ _id: sid as any });
  if (!sensorExists) throw new HttpError(404, 'Sensor not found');
  const { min, max, hysteresis } = req.body;
  const doc = await Threshold.findOneAndUpdate(
    { sensorId },
    { sensorId, min, max, hysteresis: hysteresis ?? 0 },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return res.status(200).json(ok(doc));
};

export const deleteThreshold = async (req: Request, res: Response) => {
  const { sensorId } = req.params;
  const result = await Threshold.findOneAndDelete({ sensorId }).lean();
  if (!result) throw new HttpError(404, 'Threshold not found');
  return res.json(ok({ deleted: true }));
};

