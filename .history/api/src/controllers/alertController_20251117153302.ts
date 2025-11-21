import { Request, Response } from 'express';
import { Alert } from '../models/alert.js';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../middlewares/error.js';

export const listAlerts = async (req: Request, res: Response) => {
  const { plantId, sensorId, from, to, limit, level, status } = req.query as Record<string, string | undefined>;
  const q: any = {};
  if (plantId) q.plantId = plantId;
  if (sensorId) q.sensorId = sensorId;
  if (level) q.level = level;
  if (status) q.status = status;
  if (from || to) {
    q.createdAt = {} as any;
    if (from) (q.createdAt as any).$gte = new Date(from);
    if (to) (q.createdAt as any).$lte = new Date(to);
  }
  const lim = Math.min(Number(limit ?? 50), 200);
  const items = await Alert.find(q).sort({ createdAt: -1 }).limit(lim).lean();
  return res.json(ok(items));
};

// marca una alerta como atendida (ack) y opcionalmente setea resolvedBy
export const ackAlert = async (req: Request, res: Response) => {
  const { id } = req.params as any;
  const by = (req.body?.by as string | undefined) || 'user';
  const doc = await Alert.findByIdAndUpdate(id, { acked: true, resolvedBy: by, ackedAt: new Date(), status: 'completado' }, { new: true }).lean();
  if (!doc) throw new HttpError(404, 'Alert not found');
  return res.json(ok(doc));
};

export const updateAlertStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body as { status?: string };
  if (!status || !['pendiente','en_progreso','completado'].includes(status)) {
    throw new HttpError(400, 'Invalid status');
  }
  const doc = await Alert.findByIdAndUpdate(id, { status }, { new: true }).lean();
  if (!doc) throw new HttpError(404, 'Alert not found');
  return res.json(ok(doc));
};
