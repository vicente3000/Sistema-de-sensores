import { getCassandra, initCassandra } from '../database/cassandra/config.js';
import { ok } from '../utils/apiResponse.js';
// Devuelve últimos N puntos del día actual para una planta/sensor
export const getSensorHistory = async (req, res) => {
    const plant = String(req.query.plant || '');
    const sensor = String(req.query.sensor || '');
    const limit = Math.min(Number(req.query.limit ?? 10000), 50000);
    if (!plant || !sensor) {
        return res.status(400).json({ error: 'Missing plant or sensor' });
    }
    let client = getCassandra();
    if (!client)
        client = await initCassandra();
    const today = new Date();
    const ymd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const query = 'SELECT ts, value FROM readings WHERE plant_id = ? AND sensor_type = ? AND ymd = ? LIMIT ?';
    const result = await client.execute(query, [plant, sensor, ymd, limit], { prepare: true });
    const data = result.rows.map(r => ({ tsISO: r.get('ts').toISOString(), value: r.get('value') }));
    return res.json(ok(data));
};
