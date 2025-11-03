import { Sensor } from '../models/sensor.js';
import { Threshold } from '../models/threshold.js';
import { Plant } from '../models/Plant.js';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../middlewares/error.js';
export const listSensorsByPlant = async (req, res) => {
    const { plantId } = req.params;
    const exists = await Plant.exists({ _id: plantId });
    if (!exists)
        throw new HttpError(404, 'Plant not found');
    const items = await Sensor.find({ plantId }).sort({ createdAt: -1 }).lean();
    return res.json(ok(items));
};
export const createSensor = async (req, res) => {
    const { plantId } = req.params;
    const plant = await Plant.findById(plantId);
    if (!plant)
        throw new HttpError(404, 'Plant not found');
    const sensor = await Sensor.create({ plantId, type: req.body.type, unit: req.body.unit });
    return res.status(201).json(ok(sensor));
};
export const getSensor = async (req, res) => {
    const sensor = await Sensor.findById(req.params.sensorId).lean();
    if (!sensor)
        throw new HttpError(404, 'Sensor not found');
    return res.json(ok(sensor));
};
export const updateSensor = async (req, res) => {
    const { sensorId } = req.params;
    const update = {};
    if (typeof req.body.type === 'string')
        update.type = req.body.type;
    if (typeof req.body.unit === 'string')
        update.unit = req.body.unit;
    const sensor = await Sensor.findByIdAndUpdate(sensorId, update, { new: true }).lean();
    if (!sensor)
        throw new HttpError(404, 'Sensor not found');
    return res.json(ok(sensor));
};
export const deleteSensor = async (req, res) => {
    const { sensorId } = req.params;
    const sensor = await Sensor.findByIdAndDelete(sensorId).lean();
    if (!sensor)
        throw new HttpError(404, 'Sensor not found');
    await Threshold.deleteMany({ sensorId });
    return res.json(ok({ deleted: true }));
};
