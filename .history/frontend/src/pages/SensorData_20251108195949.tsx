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

// pagina de datos con live + agregados
export default function SensorData() {
  const [plant, setPlant] = useState("");
  const [sensor, setSensor] = useState<SensorType | "">("");
  const [step, setStep] = useState<"1m" | "5m" | "1h">("1m");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // rango para agregados
  const [fromAgg, setFromAgg] = useState<string>("");
  const [toAgg, setToAgg] = useState<string>("");
  // rango diario (dias)
  const [daysDaily, setDaysDaily] = useState<number>(30);

  // live buffer 100 puntos
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

  // conectar socket
  useEffect(() => {
    liveRef.current = new LiveClient();
    liveRef.current.connect();
    return () => liveRef.current?.disconnect();
  }, []);

  // resuscripcion live
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

  // agregados por intervalo
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

  // resumen diario
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

  const can = Boolean(plant && sensor) && !loading;

  return (
    <section>
      <h1>Datos de sensores</h1>

      {/* fila superior: 1, 2 y 3 */}
      <div className="filters-row-top">
        {/* 1) Planta */}
        <div className="fieldset fieldset-small">
          <h3 className="subtitle">1) Planta</h3>
          <p className="note">Selecciona la planta</p>
          <label>
            <span className="label-caption">Planta seleccionada</span>
            <select
              value={plant}
              onChange={(e) => {
                setPlant(e.target.value);
                setSensor("");
              }}
            >
              <option value="">Selecciona</option>
              <option value="p1">Planta 1</option>
              <option value="p2">Planta 2</option>
              <option value="p3">Planta 3</option>
            </select>
          </label>
        </div>

        {/* 2) Sensor */}
        <div className="fieldset fieldset-small">
          <h3 className="subtitle">2) Sensor</h3>
          <p className="note">Selecciona el tipo de sensor</p>
          <label>
            <span className="label-caption">Sensor seleccionado</span>
            <select
              value={sensor}
              onChange={(e) => setSensor(e.target.value as SensorType)}
              disabled={!plant}
            >
              <option value="">Selecciona</option>
              <option value="humidity">Humedad</option>
              <option value="ph">pH</option>
              <option value="temp">Temperatura</option>
              <option value="lux">Luminosidad</option>
            </select>
          </label>
        </div>

        {/* 3) Promedio por intervalo */}
        <div className="fieldset fieldset-wide">
          <h3 className="subtitle">3) Promedio por intervalo</h3>
          <p className="note">
            Agrupa lecturas por intervalo y calcula promedio. Usa un rango de
            fechas opcional.
          </p>
          <div className="filters-inner">
            <label>
              Intervalo
              <select
                value={step}
                onChange={(e) => setStep(e.target.value as any)}
              >
                <option value="1m">1 min</option>
                <option value="5m">5 min</option>
                <option value="1h">1 h</option>
              </select>
            </label>
            <label>
              Desde
              <input
                type="datetime-local"
                value={fromAgg}
                onChange={(e) => setFromAgg(e.target.value)}
              />
            </label>
            <label>
              Hasta
              <input
                type="datetime-local"
                value={toAgg}
                onChange={(e) => setToAgg(e.target.value)}
              />
            </label>
            <div style={{ alignSelf: "end" }}>
              <button className="btn" onClick={loadAgg} disabled={!can}>
                {loading ? "Cargando..." : "Ver promedio"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* fila inferior: 4) resumen diario */}
      <div className="filters-row-bottom">
        <div className="fieldset fieldset-full">
          <h3 className="subtitle">4) Resumen diario</h3>
          <p className="note">
            Calcula min/avg/max por dia para un rango de N dias hacia atras.
          </p>
          <div className="filters-inner">
            <label>
              Dias
              <select
                value={daysDaily}
                onChange={(e) => setDaysDaily(Number(e.target.value))}
              >
                <option value={7}>7</option>
                <option value={30}>30</option>
                <option value={90}>90</option>
              </select>
            </label>
            <div style={{ alignSelf: "end" }}>
              <button className="btn" onClick={loadDaily} disabled={!can}>
                {loading ? "Cargando..." : "Ver resumen"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {err && <p className="error">{err}</p>}

      <div className="chart-block">
        <h2>Ultimos 100 valores (live)</h2>
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

      {agg.length > 0 && (
        <div className="chart-block">
          <h2>Promedio por intervalo ({step})</h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={agg}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tsISO" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avg" name="Promedio" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {daily.length > 0 && (
        <div className="chart-block">
          <h2>Diario (min/avg/max)</h2>
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
  );
}
