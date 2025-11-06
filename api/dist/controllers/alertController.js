import { Alert } from '../models/alert.js';
import { ok } from '../utils/apiResponse.js';
export const listAlerts = async (req, res) => {
    const { plantId, sensorId, from, to, limit, level } = req.query;
    const q = {};
    if (plantId)
        q.plantId = plantId;
    if (sensorId)
        q.sensorId = sensorId;
    if (level)
        q.level = level;
    if (from || to) {
        q.createdAt = {};
        if (from)
            q.createdAt.$gte = new Date(from);
        if (to)
            q.createdAt.$lte = new Date(to);
    }
    const lim = Math.min(Number(limit ?? 50), 200);
    const items = await Alert.find(q).sort({ createdAt: -1 }).limit(lim).lean();
    return res.json(ok(items));
};
