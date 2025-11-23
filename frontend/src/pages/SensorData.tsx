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
  const [plants, setPlants] = useState<Array<{ _id: string; name?: string }>>([]);
  const [sensors, setSensors] = useState<Array<{ _id: string; type: SensorType }>>([]);

  const [plant, setPlant] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [step, setStep] = useState<"1m" | "5m" | "1h">("1m");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [fromAgg, setFromAgg] = useState("");
  const [toAgg, setToAgg] = useState("");
  const [daysDaily, setDaysDaily] = useState(30);

  // MODO DE VISUALIZACIÓN: live | historical
  const [mode, setMode] = useState<"live" | "historical">("live");

  const opId = useRef(0);

  const ringsRef = useRef<Record<SensorType, Ring<{ tsLabel: string; value: number }>>>({});
  const [last100Map, setLast100Map] = useState<Record<SensorType, any[]>>({});

  const liveRef = useRef<LiveClient | null>(null);
  const unsubRef = useRef<Record<SensorType, { unsubscribe: () => void } | null>>({});

  const [agg, setAgg] = useState<Record<SensorType, Array<{ tsISO: string; avg: number }>>>({});
  const [daily, setDaily] = useState<
    Record<
      SensorType,
      Array<{ dayISO: string; min: number | null; avg: number | null; max: number | null }>
    >
  >({});

  const renderThrottle = useRef(createThrottler(100));

  const API_URL = "http://localhost:3000/api/v1";

  // Cargar plantas
  useEffect(() => {
    const loadPlants = async () => {
      try {
        const res = await fetch(`${API_URL}/plants`);
        const json = await res.json();
        setPlants(json.data.items);
      } catch (err) {
        console.error("Error loading plants:", err);
      }
    };
    loadPlants();
  }, []);

  // Cargar sensores cuando cambia planta
  useEffect(() => {
    if (!plant) {
      setSensors([]);
      return;
    }

    const loadSensors = async () => {
      try {
        const res = await fetch(`${API_URL}/plants/${plant}/sensors`);
        const json = await res.json();
        setSensors(json.data.items);
      } catch (err) {
        console.error("Error loading sensors:", err);
      }
    };
    loadSensors();
  }, [plant]);

  // Conectar socket
  useEffect(() => {
    liveRef.current = new LiveClient();
    liveRef.current.connect();
    return () => liveRef.current?.disconnect();
  }, []);

  // Suscripciones LIVE solo si el modo es live
  useEffect(() => {
    opId.current++;

    // cancelar subs anteriores
    Object.values(unsubRef.current).forEach((u) => u?.unsubscribe());
    unsubRef.current = {};
    ringsRef.current = {};
    setLast100Map({});
    setErr(null);

    if (!plant || sensors.length === 0 || mode !== "live") return;

    const myOp = opId.current;
    const client = liveRef.current!;

    sensors.forEach((s) => {
      const t = s.type;

      ringsRef.current[t] = new Ring(100);

      unsubRef.current[t] = client.subscribe(plant, t, (p) => {
        if (myOp !== opId.current) return;

        const tsLabel = new Date(p.tsISO).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        ringsRef.current[t].push({ tsLabel, value: p.value });

        renderThrottle.current(() => {
          if (myOp !== opId.current) return;

          const map: any = {};
          (Object.keys(ringsRef.current) as SensorType[]).forEach((k) => {
            map[k] = ringsRef.current[k].toArray();
          });
          setLast100Map(map);
        });
      });
    });

    return () => {
      Object.values(unsubRef.current).forEach((u) => u?.unsubscribe());
      unsubRef.current = {};
    };
  }, [plant, sensors, mode]);

  // Carga histórica
  const loadAllAgg = async () => {
    const myOp = opId.current;

    const tasks = sensors.map(async (s) => {
      const rows = await fetchAgg({
        plant,
        sensor: s.type,
        step,
        from: fromAgg || undefined,
        to: toAgg || undefined,
      });
      return { type: s.type, rows };
    });

    const arr = await Promise.all(tasks);
    if (myOp !== opId.current) return;

    const obj: any = {};
    arr.forEach(({ type, rows }) => {
      obj[type] = rows;
    });
    setAgg(obj);
  };

  const loadAllDaily = async () => {
    const myOp = opId.current;
    const now = new Date();
    const from = new Date(now.getTime() - daysDaily * 86400000);

    const tasks = sensors.map(async (s) => {
      const rows = await fetchDaily({
        plant,
        sensor: s.type,
        from: from.toISOString(),
        to: now.toISOString(),
      });
      return { type: s.type, rows };
    });

    const arr = await Promise.all(tasks);
    if (myOp !== opId.current) return;

    const obj: any = {};
    arr.forEach(({ type, rows }) => {
      obj[type] = rows;
    });
    setDaily(obj);
  };

  const handleApplyFilters = async () => {
    if (!plant) return;

    setLoading(true);
    setErr(null);
    setMode("historical");

    opId.current++;

    try {
      await Promise.all([loadAllAgg(), loadAllDaily()]);
    } finally {
      setLoading(false);
    }
  };

  const returnToLive = () => {
    opId.current++;
    setMode("live");
    setAgg({});
    setDaily({});
  };

  const filteredPlants = plants.filter((p) =>
    (p.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentPlantName =
    plants.find((p) => p._id === plant)?.name || "Sin seleccionar";

  return (
    <section className="sensor-page">
      <header className="sensor-header">
        <h1 className="sensor-title">Datos de sensores</h1>
        <p className="sensor-subtitle">
          Mostrando datos de <strong>{currentPlantName}</strong> — modo{" "}
          <strong>{mode === "live" ? "LIVE" : "HISTÓRICO"}</strong>
        </p>
      </header>

      {/* Búsqueda */}
      <div className="sensor-search-bar">
        <input
          type="text"
          placeholder="Buscar planta..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="sensor-search-input"
        />
      </div>

      {/* Filtros superiores */}
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

        <button
          className="sensor-apply-btn"
          disabled={!plant || loading}
          onClick={handleApplyFilters}
        >
          {loading ? "Cargando..." : "Mostrar Históricos"}
        </button>
      </div>

      {/* Botón VOLVER A LIVE */}
      {mode === "historical" && (
        <div className="sensor-filter-button" style={{ marginTop: "10px" }}>
          <button className="sensor-apply-btn" onClick={returnToLive}>
            Volver a mostrar Live
          </button>
        </div>
      )}

      {/* Filtros avanzados */}
      {mode === "historical" && (
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
      )}

      {/* Error */}
      {err && <p className="error">{err}</p>}

      <section className="sensor-results">
        <h2 className="sensor-results-title">
          {mode === "live" ? "Datos en vivo" : "Datos históricos"}
        </h2>

        {sensors.map((s) => {
          const t = s.type;

          return (
            <div key={s._id} className="sensor-block">
              <h2>{SENSOR_LABEL[t]}</h2>

              {/* LIVE */}
              {mode === "live" && (
                <div className="chart-block">
                  <h3>Live (últimos 100)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={last100Map[t] || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="tsLabel" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line dataKey="value" stroke="#4af" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* HISTÓRICO */}
              {mode === "historical" && (
                <>
                  {agg[t]?.length > 0 && (
                    <div className="chart-block">
                      <h3>Promedio por intervalo</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={agg[t]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="tsISO" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line dataKey="avg" stroke="#6c6" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {daily[t]?.length > 0 && (
                    <div className="chart-block">
                      <h3>Resumen diario</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={daily[t]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="dayISO" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area dataKey="min" fill="#1f6" stroke="#1f6" opacity={0.4} />
                          <Area dataKey="avg" fill="#6cf" stroke="#6cf" opacity={0.4} />
                          <Area dataKey="max" fill="#f66" stroke="#f66" opacity={0.4} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </section>
    </section>
  );
}
