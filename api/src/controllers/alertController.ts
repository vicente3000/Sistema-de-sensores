import { Request, Response } from 'express';
import { Alert } from '../models/alert.js';
import { ok } from '../utils/apiResponse.js';

export const listAlerts = async (req: Request, res: Response) => {
  const { plantId, sensorId, from, to, limit } = req.query as Record<string,string|undefined>;
  const q: any = {};
  if (plantId) q.plantId = plantId;
  if (sensorId) q.sensorId = sensorId;
  if (from || to) {
    q.createdAt = {} as any;
    if (from) (q.createdAt as any).$gte = new Date(from);
    if (to) (q.createdAt as any).$lte = new Date(to);
  }
  const lim = Math.min(Number(limit ?? 50), 200);
  const items = await Alert.find(q).sort({ createdAt: -1 }).limit(lim).lean();
  return res.json(ok(items));
};

