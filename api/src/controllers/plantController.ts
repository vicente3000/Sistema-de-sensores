import { Request, Response } from "express";
import { Plant } from "../models/Plant.js";
import { Sensor } from "../models/sensor.js";
import { Threshold } from "../models/threshold.js";
import { ok } from "../utils/apiResponse.js";
import { HttpError } from "../middlewares/error.js";

export const listPlants = async (req: Request, res: Response) => {
  const q = (req.query.q as string | undefined)?.trim();
  const limit = Number(req.query.limit ?? 20);
  const offset = Number(req.query.offset ?? 0);
  const filter = q ? { $or: [ { name: { $regex: q, $options: 'i' } }, { type: { $regex: q, $options: 'i' } } ] } : {};
  const [items, total] = await Promise.all([
    Plant.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Plant.countDocuments(filter)
  ]);
  return res.json(ok({ items, total, limit, offset }));
};

export const createPlant = async (req: Request, res: Response) => {
  const { name, type } = req.body;
  const plant = await Plant.create({ name, type });
  return res.status(201).json(ok(plant));
};

export const getPlant = async (req: Request, res: Response) => {
  const plant = await Plant.findById(req.params.id).lean();
  if (!plant) throw new HttpError(404, 'Plant not found');
  return res.json(ok(plant));
};

export const updatePlant = async (req: Request, res: Response) => {
  const { id } = req.params;
  const update: any = {};
  if (typeof req.body.name === 'string') update.name = req.body.name;
  if (typeof req.body.type === 'string') update.type = req.body.type;
  const plant = await Plant.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!plant) throw new HttpError(404, 'Plant not found');
  return res.json(ok(plant));
};

export const deletePlant = async (req: Request, res: Response) => {
  const { id } = req.params;
  const plant = await Plant.findByIdAndDelete(id).lean();
  if (!plant) throw new HttpError(404, 'Plant not found');
  // cascada: borrar sensores y thresholds
  const sensors = await Sensor.find({ plantId: id }, { _id: 1 }).lean();
  const sensorIds = sensors.map(s => s._id);
  await Sensor.deleteMany({ plantId: id });
  if (sensorIds.length) await Threshold.deleteMany({ sensorId: { $in: sensorIds } });
  return res.json(ok({ deleted: true }));
};

// Ruta de compatibilidad con payload legado { plant, sensors[] }
export const legacyAddPlant = async (req: Request, res: Response) => {
  const { plant, sensors } = req.body as { plant: { name: string; type?: string }, sensors?: Array<any> };
  if (!plant || !plant.name) throw new HttpError(400, 'El nombre de la planta es obligatorio');
  const created = await Plant.create({ name: plant.name, type: plant.type });
  // Crear sensores asociados si vienen
  const createdSensors = Array.isArray(sensors) && sensors.length
    ? await Sensor.insertMany(sensors.map(s => ({ plantId: created._id, type: s.type, unit: undefined })))
    : [];
  // Respuesta compatible con UI de demo
  return res.status(201).json({ message: 'Planta creada correctamente', plant: { ...created.toJSON(), sensors: createdSensors } });
};
