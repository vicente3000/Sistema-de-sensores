import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "../css/SensorData.css";
import { fetchAgg, fetchDaily } from "../lib/History";
import { LiveClient, SensorType } from "../lib/RealTime";
import { Ring, createThrottler } from "../lib/Ring";

const SENSOR_LABEL: Record<SensorType, string> = {
  "soil-moisture": "Humedad del suelo",
  temperature: "Temperatura",
  lux: "Luminosidad",
  ph: "pH",
};

export default function SensorData() {
  const [plants, setPlants] = useState<Array<{ _id: string; name?: string }>>(
    []
  );
  const [sensors, setSensors] = useState<
    Array<{ _id: string; type: SensorType }>
  >([]);

  const [plant, setPlant] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sensor, setSensor] = useState<SensorType | "">("");
  const [step, setStep] = useState<"1m" | "5m" | "1h">("1m");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [fromAgg, setFromAgg] = useState<string>("");
  const [toAgg, setToAgg] = useState<string>("");
  const [daysDaily, setDaysDaily] = useState<number>(30);

  const ringRef = useRef(new Ring<{ tsLabel: string; value: number }>(100));
  const [last100, setLast100] = useState(ringRef.current.toArray());
  const renderThrottle = useRef(createThrottler(100));
  const liveRef = useRef<LiveClient | null>(null);
  const unsubRef = useRef<null | { unsubscribe: () => void }>(null);

  const [agg, setAgg] = useState<Array<{ tsISO: string; avg: number }>>([]);
  const [daily, setDaily] = useState<
    Array<{
      dayISO: string;
      min: number | null;
      avg: number | null;
      max: number | null;
    }>
  >([]);

  const API_URL = "http://localhost:3000/api/v1";

  // Cargar plantas
  useEffect(() => {
    const loadPlants = async () => {
      try {
        const res = await fetch(`${API_URL}/plants`);
        const json = await res.json();
        setPlants(json.data.items);
      } catch (err: any) {
        console.error("Error loading plants:", err);
      }
    };
    loadPlants();
  }, []);

  // Cargar sensores cuando cambia la planta
  useEffect(() => {
    if (!plant) {
      setSensors([]);
      setSensor("");
      return;
    }
    const loadSensors = async () => {
      try {
        const res = await fetch(`${API_URL}/plants/${plant}/sensors`);
        if (!res.ok) throw new Error(`Error fetching sensors: ${res.status}`);
        const json = await res.json();
        setSensors(json.data.items);
      } catch (e) {
        console.error("Error loading sensors:", e);
      }
    };
    loadSensors();
    setSensor("");
  }, [plant]);

  // Conectar socket live
  useEffect(() => {
    liveRef.current = new LiveClient();
    liveRef.current.connect();
    return () => liveRef.current?.disconnect();
  }, []);

  // Resuscripción live cuando cambian planta o sensor
  useEffect(() => {
    unsubRef.current?.unsubscribe?.();
    ringRef.current.clear();
    setLast100([]);
    setErr(null);

    if (!plant || !sensor) return;

    const s = liveRef.current!;
    unsubRef.current = s.subscribe(plant, sensor as SensorType, (p) => {
      const tsLabel = new Date(p.tsISO).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      ringRef.current.push({ tsLabel, value: p.value });
      renderThrottle.current(() => setLast100(ringRef.current.toArray()));
    });

    return () => {
      unsubRef.current?.unsubscribe?.();
      unsubRef.current = null;
    };
  }, [plant, sensor]);

  // Agregados por intervalo
  const loadAgg = async () => {
    if (!plant || !sensor) return;
    try {
      setLoading(true);
      setErr(null);
      const rows = await fetchAgg({
        plant,
        sensor: sensor as SensorType,
        step,
        from: fromAgg || undefined,
        to: toAgg || undefined,
      });
      setAgg(rows.map((r) => ({ tsISO: r.tsISO, avg: r.avg })));
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  // Resumen diario
  const loadDaily = async () => {
    if (!plant || !sensor) return;
    try {
      setLoading(true);
      setErr(null);
      const now = new Date();
      const from = new Date(now.getTime() - daysDaily * 24 * 60 * 60 * 1000);
      const rows = await fetchDaily({
        plant,
        sensor: sensor as SensorType,
        from: from.toISOString(),
        to: now.toISOString(),
      });
      setDaily(rows);
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  // Botón principal estilo "Aplicar filtros"
  const handleApplyFilters = async () => {
    if (!plant || !sensor) return;
    await Promise.all([loadAgg(), loadDaily()]);
  };

  const can = Boolean(plant && sensor) && !loading;

  const filteredPlants = plants.filter((p) =>
    (p.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentPlantName =
    plants.find((p) => p._id === plant)?.name || "Sin seleccionar";
  const currentSensorLabel =
    (sensor && SENSOR_LABEL[sensor as SensorType]) || "Sin seleccionar";

  return (
    <section className="sensor-page">
      <header className="sensor-header">
        <h1 className="sensor-title">Datos de sensores</h1>
        <p className="sensor-subtitle">
          Mostrando datos de <strong>{currentPlantName}</strong> – sensor{" "}
          <strong>{currentSensorLabel}</strong>
        </p>
      </header>

      {/* Barra de busqueda tipo tienda */}
      <div className="sensor-search-bar">
        <input
          type="text"
          placeholder="Buscar planta..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="sensor-search-input"
        />
      </div>

      {/* Filtros principales tipo ecommerce */}
      <div className="sensor-filters-bar">
        <div className="sensor-filter">
          <span className="sensor-filter-label">Planta</span>
          <select
            value={plant}
            onChange={(e) => setPlant(e.target.value)}
            className="sensor-filter-select"
          >
            <option value="">Todas las plantas</option>
            {filteredPlants.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sensor-filter">
          <span className="sensor-filter-label">Tipo de sensor</span>
          <select
            value={sensor}
            onChange={(e) => setSensor(e.target.value as SensorType)}
            disabled={!plant}
            className="sensor-filter-select"
          >
            <option value="">
              {plant ? "Todos los sensores" : "Selecciona una planta"}
            </option>
            {sensors.map((s) => (
              <option key={s._id} value={s.type}>
                {SENSOR_LABEL[s.type] ?? s.type}
              </option>
            ))}
          </select>
        </div>

        <div className="sensor-filter">
          <span className="sensor-filter-label">Intervalo</span>
          <select
            value={step}
            onChange={(e) => setStep(e.target.value as any)}
            className="sensor-filter-select"
          >
            <option value="1m">1 min</option>
            <option value="5m">5 min</option>
            <option value="1h">1 h</option>
          </select>
        </div>

        <div className="sensor-filter">
          <span className="sensor-filter-label">Últimos días</span>
          <select
            value={daysDaily}
            onChange={(e) => setDaysDaily(Number(e.target.value))}
            className="sensor-filter-select"
          >
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={90}>90 días</option>
          </select>
        </div>

        <div className="sensor-filter-button">
          <button
            className="sensor-apply-btn"
            onClick={handleApplyFilters}
            disabled={!can}
          >
            {loading ? "Cargando..." : "Aplicar filtros"}
          </button>
        </div>
      </div>

      {/* Filtros avanzados opcionales (rango fecha) */}
      <div className="sensor-advanced-filters">
        <div className="sensor-filter">
          <span className="sensor-filter-label">Desde</span>
          <input
            type="datetime-local"
            value={fromAgg}
            onChange={(e) => setFromAgg(e.target.value)}
            className="sensor-filter-input"
          />
        </div>
        <div className="sensor-filter">
          <span className="sensor-filter-label">Hasta</span>
          <input
            type="datetime-local"
            value={toAgg}
            onChange={(e) => setToAgg(e.target.value)}
            className="sensor-filter-input"
          />
        </div>
      </div>

      {err && <p className="error">{err}</p>}

      {/* Resultados */}
      <section className="sensor-results">
        <h2 className="sensor-results-title">Resultados</h2>

        {/* Live Chart */}
        <div className="chart-block">
          <h3>Últimos 100 valores (live)</h3>
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

        {/* Promedio por intervalo */}
        {agg.length > 0 && (
          <div className="chart-block">
            <h3>Promedio por intervalo ({step})</h3>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={agg}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tsISO" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avg"
                  name="Promedio"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Diario min/avg/max */}
        {daily.length > 0 && (
          <div className="chart-block">
            <h3>Resumen diario (min/avg/max)</h3>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dayISO" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="min"
                  name="Min"
                  fill="#1f6"
                  stroke="#1f6"
                  opacity={0.25}
                />
                <Area
                  type="monotone"
                  dataKey="avg"
                  name="Avg"
                  fill="#6cf"
                  stroke="#6cf"
                  opacity={0.25}
                />
                <Area
                  type="monotone"
                  dataKey="max"
                  name="Max"
                  fill="#f66"
                  stroke="#f66"
                  opacity={0.25}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </section>
  );
}
