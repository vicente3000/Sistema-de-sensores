import { useEffect, useMemo, useState } from "react";
import { socket } from "../services/socket";
import { listAlerts } from "../lib/Api";
import "../css/Alerts.css";

type SensorType = "humidity" | "ph" | "temp" | "lux";

type IncomingAlert = {
    id?: string;
    plantId: string;
    plantName?: string;
    sensorId: string;
    sensorType?: SensorType;
    value: number;
    ts: string | number;
    threshold?: { min?: number; max?: number };
    level?: 'normal'|'grave'|'critica';
};

type UiAlert = {
    id: string;
    plantId: string;
    plantName?: string;
    sensorId: string;
    sensorType: SensorType;
    value: number;
    tsISO: string;
    level: "orange" | "red";
    threshold?: { min?: number; max?: number };
};

function toISO(ts: string | number) { return typeof ts === "number" ? new Date(ts).toISOString() : ts; }

function computeLevel(value: number, th?: { min?: number; max?: number }): "orange" | "red" | null {
    if (!th) return null;
    if (typeof th.max === "number") { if (value > th.max) return "red"; if (value === th.max) return "orange"; }
    if (typeof th.min === "number") { if (value < th.min) return "red"; if (value === th.min) return "orange"; }
    return null;
}

export default function Alerts() {
    const [connected, setConnected] = useState(socket.connected);
    const [alerts, setAlerts] = useState<UiAlert[]>([]);
    const [limit, setLimit] = useState(50);

    // carga inicial
    useEffect(() => {
        (async () => {
            const rows = await listAlerts({ limit: 50 });
            const mapped: UiAlert[] = rows.map((r: any) => ({
                id: r._id,
                plantId: r.plantId,
                sensorId: r.sensorId,
                sensorType: 'humidity',
                value: r.value,
                tsISO: new Date(r.createdAt).toISOString(),
                level: r.level === 'critica' ? 'red' : 'orange',
            }));
            setAlerts(mapped);
        })();
    }, []);

    // socket live
    useEffect(() => {
        const onConnect = () => setConnected(true);
        const onDisconnect = () => setConnected(false);
        const onIncoming = (msg: IncomingAlert) => {
            const level = msg.level ? (msg.level === 'critica' ? 'red' : 'orange') : computeLevel(msg.value, msg.threshold);
            if (!level) return;
            const ui: UiAlert = {
                id: msg.id || crypto.randomUUID(),
                plantId: msg.plantId,
                plantName: msg.plantName,
                sensorId: msg.sensorId,
                sensorType: (msg.sensorType || 'humidity'),
                value: msg.value,
                tsISO: toISO(msg.ts),
                level,
                threshold: msg.threshold,
            };
            setAlerts(prev => {
                const next = [ui, ...prev];
                return next.length > limit ? next.slice(0, limit) : next;
            });
        };
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('alerts:new', onIncoming);
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('alerts:new', onIncoming);
        };
    }, [limit]);

    const statusLabel = connected ? "Conectado" : "Desconectado";
    const counters = useMemo(() => ({
        red: alerts.filter(a => a.level === 'red').length,
        orange: alerts.filter(a => a.level === 'orange').length,
        total: alerts.length
    }), [alerts]);

    return (
        <section>
            <h1>Alertas</h1>

            <div className="alerts-toolbar">
                <span className="badge" style={{opacity: .85}}>Estado Socket: {statusLabel}</span>
                <div className="actions">
                    <label>
                        Max. tarjetas:&nbsp;
                        <select value={limit} onChange={e => setLimit(Number(e.target.value))}>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </label>
                    <button className="btn-sm" onClick={() => setAlerts([])}>Limpiar</button>
                </div>
            </div>

            <p className="alert-meta">
                Recientes: <b>{counters.total}</b> ·
                <span className="badge orange" style={{marginLeft:8}}>Naranja {counters.orange}</span>&nbsp;
                <span className="badge red">Roja {counters.red}</span>
            </p>

            <div className="alert-list">
                {alerts.map(a => (
                    <article key={a.id} className={`alert-card alert--${a.level}`}>
                        <h3>
                            {a.plantName || a.plantId} - {a.sensorType.toUpperCase()}&nbsp;
                            <span className={`badge ${a.level === 'red' ? 'red' : 'orange'}`}>
                                {a.level === 'red' ? 'Critica' : 'Limite'}
                            </span>
                        </h3>
                        <div className="alert-meta">
                            Valor: <b>{a.value.toFixed(2)}</b>
                            &nbsp; · &nbsp; Umbral:
                            {typeof a.threshold?.min === 'number' ? ` min ${a.threshold.min}` : ''}
                            {typeof a.threshold?.max === 'number' ? ` max ${a.threshold.max}` : ''}
                            &nbsp; · &nbsp; {new Date(a.tsISO).toLocaleString()}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

