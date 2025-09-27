import { useEffect, useMemo, useState } from "react";
import { socket } from "../services/socket";
import "../css/Alerts.css";

type SensorType = "humidity" | "ph" | "temp" | "lux";

type IncomingAlert = {
    id?: string;
    plantId: string;
    plantName?: string;
    sensorId: string;
    sensorType: SensorType;
    value: number;
    ts: string | number;            // ISO o epoch ms
    threshold?: { min?: number; max?: number };
};

// Tarjeta normalizada a nuestra UI
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

function toISO(ts: string | number) {
    return typeof ts === "number" ? new Date(ts).toISOString() : ts;
}

// Reglas: naranja si == umbral; roja si sobrepasa (max) o cae por debajo (min).
function computeLevel(value: number, th?: { min?: number; max?: number }): "orange" | "red" | null {
    if (!th) return null;
    if (typeof th.max === "number") {
        if (value > th.max)  return "red";
        if (value === th.max) return "orange";
    }
    if (typeof th.min === "number") {
        if (value < th.min)  return "red";
        if (value === th.min) return "orange";
    }
    return null;
}

export default function Alerts() {
    const [connected, setConnected] = useState(socket.connected);
    const [alerts, setAlerts] = useState<UiAlert[]>([]);
    const [limit, setLimit] = useState(50); // cuántas tarjetas mantener en memoria

    // Suscripción al socket
    useEffect(() => {
        const onConnect = () => setConnected(true);
        const onDisconnect = () => setConnected(false);

        const onIncoming = (msg: IncomingAlert) => {
            const level = computeLevel(msg.value, msg.threshold);
            if (!level) return;

            const ui: UiAlert = {
                id: msg.id || crypto.randomUUID(),
                plantId: msg.plantId,
                plantName: msg.plantName,
                sensorId: msg.sensorId,
                sensorType: msg.sensorType,
                value: msg.value,
                tsISO: toISO(msg.ts),
                level,
                threshold: msg.threshold,
            };

            setAlerts((prev) => {
                const next = [ui, ...prev];
                return next.length > limit ? next.slice(0, limit) : next;
            });
        };

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("alerts:new", onIncoming);

        // Limpieza
        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("alerts:new", onIncoming);
        };
    }, [limit]);

    const statusLabel = connected ? "Conectado" : "Desconectado";

    const counters = useMemo(() => {
        const red = alerts.filter(a => a.level === "red").length;
        const orange = alerts.filter(a => a.level === "orange").length;
        return { red, orange, total: alerts.length };
    }, [alerts]);

    return (
        <section>
            <h1>Alertas</h1>

            <div className="alerts-toolbar">
        <span className="badge" style={{opacity: .85}}>
          Estado Socket: {statusLabel}
        </span>

                <div className="actions">
                    <label>
                        Máx. tarjetas:&nbsp;
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
                Recientes: <b>{counters.total}</b> &middot;
                <span className="badge orange" style={{marginLeft:8}}>Naranja {counters.orange}</span> &nbsp;
                <span className="badge red">Roja {counters.red}</span>
            </p>

            <div className="alert-list">
                {alerts.map(a => (
                    <article
                        key={a.id}
                        className={`alert-card alert--${a.level}`}
                        title={`Threshold min=${a.threshold?.min ?? "—"} max=${a.threshold?.max ?? "—"}`}
                    >
                        <h3>
                            {a.plantName || a.plantId} · {a.sensorType.toUpperCase()}
                            &nbsp;
                            <span className={`badge ${a.level === "red" ? "red" : "orange"}`}>
                {a.level === "red" ? "Crítica" : "Límite"}
              </span>
                        </h3>
                        <div className="alert-meta">
                            Valor: <b>{a.value.toFixed(2)}</b>
                            &nbsp;•&nbsp; Umbral:
                            {typeof a.threshold?.min === "number" ? ` min ${a.threshold!.min}` : ""}
                            {typeof a.threshold?.max === "number" ? ` max ${a.threshold!.max}` : ""}
                            &nbsp;•&nbsp; {new Date(a.tsISO).toLocaleString()}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
