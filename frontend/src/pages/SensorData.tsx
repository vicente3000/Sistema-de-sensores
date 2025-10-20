import { useEffect, useMemo, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "../css/SensorData.css";
import { LiveClient, SensorType } from "../lib/RealTime";
import { Ring, createThrottler } from "../lib/Ring";
import { fetchHistory } from "../lib/History";

export default function SensorData() {
    const [selectedPlant, setSelectedPlant] = useState<string>("");
    const [selectedSensor, setSelectedSensor] = useState<SensorType | "">("");
    const [chunkSize, setChunkSize] = useState<number>(10_000);
    const [requested, setRequested] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // buffer y estado renderizable
    const ringRef = useRef(new Ring<{ tsLabel: string; value: number }>(100));
    const [last100, setLast100] = useState(ringRef.current.toArray());

    // throttle de render a ~10 fps para no saturar
    const renderThrottle = useRef(createThrottler(100));

    // cliente live
    const liveRef = useRef<LiveClient | null>(null);
    const unsubRef = useRef<null | { unsubscribe: () => void }>(null);

    // conectar/desconectar socket
    useEffect(() => {
        liveRef.current = new LiveClient(); // usa VITE_SOCKET_URL
        liveRef.current.connect();
        return () => {
            unsubRef.current?.unsubscribe?.();
            liveRef.current?.disconnect();
        };
    }, []);

    // (re) suscripción al cambiar filtros
    useEffect(() => {
        unsubRef.current?.unsubscribe?.();
        ringRef.current.clear();
        setLast100([]);
        setRequested(false);
        setError(null);

        if (!selectedPlant || !selectedSensor) return;

        const live = liveRef.current!;
        unsubRef.current = live.subscribe(selectedPlant, selectedSensor as SensorType, (p) => {
            const tsLabel = new Date(p.tsISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            ringRef.current.push({ tsLabel, value: p.value });
            renderThrottle.current(() => setLast100(ringRef.current.toArray()));
        });

        return () => {
            unsubRef.current?.unsubscribe?.();
            unsubRef.current = null;
        };
    }, [selectedPlant, selectedSensor]);

    // histórico  agregado diario
    const handleLoad = async () => {
        if (!selectedPlant || !selectedSensor) return;
        try {
            setLoading(true);
            setError(null);
            const raw = await fetchHistory({
                plant: selectedPlant,
                sensor: selectedSensor as SensorType,
                limit: chunkSize,
            });

            const byDay = new Map<string, { sum: number; count: number; min: number; max: number }>();
            for (const p of raw) {
                const ymd = p.tsISO.slice(0, 10);
                const cur = byDay.get(ymd) ?? { sum: 0, count: 0, min: Infinity, max: -Infinity };
                cur.sum += p.value; cur.count++; cur.min = Math.min(cur.min, p.value); cur.max = Math.max(cur.max, p.value);
                byDay.set(ymd, cur);
            }
            setDailyAgg(Array.from(byDay.entries())
                .sort((a, b) => (a[0] < b[0] ? -1 : 1))
                .map(([ymd, { sum, count, min, max }]) => ({
                    day: ymd,
                    dayLabel: new Date(ymd).toLocaleDateString(),
                    avg: sum / count, min, max,
                })));
            setRequested(true);
        } catch (e: any) {
            setError(e.message ?? String(e));
            setRequested(false);
        } finally {
            setLoading(false);
        }
    };

    const [dailyAgg, setDailyAgg] = useState<Array<{ day: string; dayLabel: string; avg: number; min: number; max: number }>>([]);
    const canRequest = Boolean(selectedPlant && selectedSensor) && !loading;

    return (
        <section>
            <h1>Datos de sensores</h1>

            <div className="filters">
                <label>
                    Planta
                    <select value={selectedPlant} onChange={(e) => { setSelectedPlant(e.target.value); setSelectedSensor(""); }}>
                        <option value="">— Selecciona una planta —</option>
                        <option value="p1">Planta 1</option>
                        <option value="p2">Planta 2</option>
                        <option value="p3">Planta 3</option>
                    </select>
                </label>

                <label>
                    Sensor
                    <select value={selectedSensor} onChange={(e) => setSelectedSensor(e.target.value as SensorType)} disabled={!selectedPlant}>
                        <option value="">— Selecciona un sensor —</option>
                        <option value="humidity">Humedad</option>
                        <option value="ph">pH</option>
                        <option value="temp">Temperatura</option>
                        <option value="lux">Luminosidad</option>
                    </select>
                </label>

                <label>
                    Ventana cruda (histórico)
                    <select value={chunkSize} onChange={(e) => setChunkSize(Number(e.target.value))}>
                        <option value={10_000}>10.000</option>
                        <option value={20_000}>20.000</option>
                        <option value={30_000}>30.000</option>
                    </select>
                </label>

                <button className="btn" onClick={handleLoad} disabled={!canRequest}
                        title={!canRequest ? "Selecciona planta y sensor" : "Cargar datos históricos"}>
                    {loading ? "Cargando…" : "Cargar datos históricos"}
                </button>
            </div>

            {error && <p className="error">{error}</p>}

            <div className="chart-block">
                <h2>Últimos 100 valores (live)</h2>
                <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={last100}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="tsLabel" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="value" name="Valor" dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {!selectedPlant || !selectedSensor ? (
                <p className="hint">Selecciona <b>planta</b> y <b>sensor</b> para habilitar el histórico.</p>
            ) : !requested ? (
                <p className="hint">Pulsa <b>Cargar datos históricos</b> para ver el agregado diario.</p>
            ) : null}

            {requested && (
                <div className="chart-block">
                    <h2>Histórico ({dailyAgg.length} días)</h2>
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={dailyAgg}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="dayLabel" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="avg" name="Promedio diario" dot={false} />
                            <Line type="monotone" dataKey="min" name="Mín" dot={false} />
                            <Line type="monotone" dataKey="max" name="Máx" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </section>
    );
}
