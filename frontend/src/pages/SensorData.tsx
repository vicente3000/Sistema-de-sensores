import { useMemo, useState } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import "../css/SensorData.css";

type SensorType = "humidity" | "ph" | "temp" | "lux";

export default function SensorData() {
    const [selectedPlant, setSelectedPlant] = useState<string>("");
    const [selectedSensor, setSelectedSensor] = useState<SensorType | "">("");


    const [chunkSize, setChunkSize] = useState<number>(10_000);
    const [requested, setRequested] = useState(false);
    const [loading, setLoading] = useState(false);

    const sampleData = useMemo(() => {
        const now = Date.now();
        const len = 30_000;
        return Array.from({ length: len }).map((_, i) => {
            const ts = new Date(now - (len - 1 - i) * 60_000);
            return {
                tsISO: ts.toISOString(),
                tsLabel: ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                value: 50 + 15 * Math.sin(i / 20) + Math.random() * 10,
            };
        });
    }, []);

    // Siempre mostramos últimos 100
    const last100 = useMemo(() => sampleData.slice(-100), [sampleData]);

    // Para histórico (solo se usa si requested === true)
    const lastChunk = useMemo(() => sampleData.slice(-chunkSize), [sampleData, chunkSize]);

    // Agregado diario: se calcula SOLO cuando requested
    const dailyAgg = useMemo(() => {
        if (!requested) return [];
        const byDay = new Map<string, { sum: number; count: number; min: number; max: number }>();
        for (const p of lastChunk) {
            const ymd = p.tsISO.slice(0, 10);
            const cur = byDay.get(ymd) ?? { sum: 0, count: 0, min: Infinity, max: -Infinity };
            cur.sum += p.value;
            cur.count += 1;
            cur.min = Math.min(cur.min, p.value);
            cur.max = Math.max(cur.max, p.value);
            byDay.set(ymd, cur);
        }
        return Array.from(byDay.entries())
            .sort((a, b) => (a[0] < b[0] ? -1 : 1))
            .map(([ymd, { sum, count, min, max }]) => ({
                day: ymd,
                dayLabel: new Date(ymd).toLocaleDateString(),
                avg: sum / count,
                min,
                max,
            }));
    }, [lastChunk, requested]);


    //cambiar esto en bakcend
    const handleLoad = async () => {
        setLoading(true);
        await new Promise((r) => setTimeout(r, 800));
        setRequested(true);
        setLoading(false);
    };

    const canRequest = Boolean(selectedPlant && selectedSensor) && !loading;

    return (
        <section>
            <h1>Datos de sensores</h1>

            {/* Filtros */}
            <div className="filters">
                <label>
                    Planta
                    <select
                        value={selectedPlant}
                        onChange={(e) => {
                            setSelectedPlant(e.target.value);
                            setSelectedSensor("");
                            setRequested(false);
                        }}
                    >
                        <option value="">— Selecciona una planta —</option>
                        <option value="p1">Planta 1</option>
                        <option value="p2">Planta 2</option>
                        <option value="p3">Planta 3</option>
                    </select>
                </label>

                <label>
                    Sensor
                    <select
                        value={selectedSensor}
                        onChange={(e) => {
                            setSelectedSensor(e.target.value as SensorType);
                            setRequested(false);
                        }}
                        disabled={!selectedPlant}
                    >
                        <option value="">— Selecciona un sensor —</option>
                        <option value="humidity">Humedad</option>
                        <option value="ph">pH</option>
                        <option value="temp">Temperatura</option>
                        <option value="lux">Luminosidad</option>
                    </select>
                </label>

                <label>
                    Ventana cruda (histórico)
                    <select
                        value={chunkSize}
                        onChange={(e) => {
                            setChunkSize(Number(e.target.value));
                            setRequested(false);
                        }}
                    >
                        <option value={10_000}>10.000</option>
                        <option value={20_000}>20.000</option>
                        <option value={30_000}>30.000</option>
                    </select>
                </label>

                <button
                    className="btn"
                    onClick={handleLoad}
                    disabled={!canRequest}
                    title={!canRequest ? "Selecciona planta y sensor" : "Cargar datos históricos"}
                >
                    {loading ? "Cargando…" : "Cargar datos históricos"}
                </button>
            </div>

            <div className="chart-block">
                <h2>Últimos 100 valores</h2>
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
