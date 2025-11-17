import { useEffect, useMemo, useState } from "react";
import "../css/Alerts.css";
import {
  getPlant,
  listAlerts,
  listPlants,
  listSensors,
  updateAlertStatus,
} from "../lib/Api";
import { socket } from "../services/socket";

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
  level?: "normal" | "grave" | "critica";
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
  status: "pendiente" | "en_progreso" | "completado";
};

function toISO(ts: string | number) {
  return typeof ts === "number" ? new Date(ts).toISOString() : ts;
}

function computeLevel(
  value: number,
  th?: { min?: number; max?: number }
): "orange" | "red" | null {
  if (!th) return null;
  if (typeof th.max === "number") {
    if (value > th.max) return "red";
    if (value === th.max) return "orange";
  }
  if (typeof th.min === "number") {
    if (value < th.min) return "red";
    if (value === th.min) return "orange";
  }
  return null;
}

export default function Alerts() {
  const [connected, setConnected] = useState(socket.connected);
  const [alerts, setAlerts] = useState<UiAlert[]>([]);
  const [limit, setLimit] = useState(50);
  // filtros y tabla
  const [fPlant, setFPlant] = useState("");
  const [fSensor, setFSensor] = useState("");
  const [fLevel, setFLevel] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fFrom, setFFrom] = useState(""); // datetime-local
  const [fTo, setFTo] = useState("");
  const [rows, setRows] = useState<UiAlert[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  // opciones de autocompletado
  const [plantOptions, setPlantOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [sensorOptions, setSensorOptions] = useState<
    Array<{ id: string; type: SensorType }>
  >([]);
  // cache de nombres de plantas
  const [plantNames, setPlantNames] = useState<Record<string, string>>({});

  function displayPlant(id: string, fallback?: string) {
    const name = plantNames[id] || fallback || id;
    const max = 24;
    return name.length > max ? name.slice(0, max) + "..." : name;
  }

  async function ensurePlantNames(ids: string[]) {
    const toFetch = ids.filter((id) => !plantNames[id]);
    if (!toFetch.length) return;
    const updates: Record<string, string> = {};
    for (const id of toFetch) {
      try {
        const p = await getPlant(id);
        updates[id] = p.name;
      } catch {}
    }
    if (Object.keys(updates).length)
      setPlantNames((prev) => ({ ...prev, ...updates }));
  }

  // cargar plantas para autocompletar
  useEffect(() => {
    (async () => {
      try {
        const res = await listPlants({ limit: 100 });
        setPlantOptions(
          res.items.map((p: any) => ({ id: p._id, name: p.name }))
        );
      } catch {}
    })();
  }, []);

  // cargar sensores al elegir planta
  useEffect(() => {
    (async () => {
      if (!fPlant) {
        setSensorOptions([]);
        return;
      }
      try {
        const res = await listSensors(fPlant, { limit: 100 });
        setSensorOptions(
          res.items.map((s: any) => ({ id: s._id, type: s.type }))
        );
      } catch {
        setSensorOptions([]);
      }
    })();
  }, [fPlant]);

  // carga inicial
  useEffect(() => {
    (async () => {
      const rows = await listAlerts({ limit: 50 });
      const mapped: UiAlert[] = rows.map((r: any) => ({
        id: r._id,
        plantId: r.plantId,
        sensorId: r.sensorId,
        // ==============================================
        // CORRECCIÓN 1: Usar r.sensorType
        // ==============================================
        sensorType: r.sensorType || "humidity",
        value: r.value,
        tsISO: new Date(r.createdAt).toISOString(),
        level: r.level === "critica" ? "red" : "orange",
        status: r.status || "pendiente",
      }));
      setAlerts(mapped);
      // pre cargar nombres
      const uniq = Array.from(new Set(mapped.map((m) => m.plantId)));
      ensurePlantNames(uniq);
    })();
  }, []);

  // socket live
  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onIncoming = (msg: IncomingAlert) => {
      const level = msg.level
        ? msg.level === "critica"
          ? "red"
          : "orange"
        : computeLevel(msg.value, msg.threshold);
      if (!level) return;
      const ui: UiAlert = {
        id: msg.id || crypto.randomUUID(),
        plantId: msg.plantId,
        plantName: msg.plantName,
        sensorId: msg.sensorId,
        sensorType: msg.sensorType || "humidity",
        value: msg.value,
        tsISO: toISO(msg.ts),
        level,
        threshold: msg.threshold,
      };
      setAlerts((prev) => {
        const next = [ui, ...prev];
        return next.length > limit ? next.slice(0, limit) : next;
      });
      // fetch nombre si no lo tenemos
      if (!plantNames[msg.plantId] && !msg.plantName)
        ensurePlantNames([msg.plantId]);
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("alerts:new", onIncoming);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("alerts:new", onIncoming);
    };
  }, [limit]);

  const statusLabel = connected ? "Conectado" : "Desconectado";
  const counters = useMemo(
    () => ({
      red: alerts.filter((a) => a.level === "red").length,
      orange: alerts.filter((a) => a.level === "orange").length,
      total: alerts.length,
      pendientes: alerts.filter((a) => a.status === "pendiente").length,
      progreso: alerts.filter((a) => a.status === "en_progreso").length,
      completadas: alerts.filter((a) => a.status === "completado").length,
    }),
    [alerts]
  );

  return (
    <section>
      <h1>Alertas</h1>

      <div className="alerts-toolbar">
        <span className="badge" style={{ opacity: 0.85 }}>
          Estado Socket: {statusLabel}
        </span>
        <div className="actions">
          <label>
            Max. tarjetas:&nbsp;
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <button className="btn-sm" onClick={() => setAlerts([])}>
            Limpiar
          </button>
        </div>
      </div>

      <p className="alert-meta">
        Total: <b>{counters.total}</b> ·
        <span className="badge orange" style={{ marginLeft: 8 }}>
          Naranja {counters.orange}
        </span>
        &nbsp;
        <span className="badge red">Roja {counters.red}</span> ·
        <span className="badge alert-status-pend">
          Pendientes {counters.pendientes}
        </span>{" "}
        ·
        <span className="badge alert-status-prog">
          En progreso {counters.progreso}
        </span>{" "}
        ·
        <span className="badge alert-status-comp">
          Completadas {counters.completadas}
        </span>
      </p>

      <div className="alert-list">
        {alerts.map((a) => (
          <article key={a.id} className={`alert-card alert--${a.level}`}>
            <h3>
              {displayPlant(a.plantId, a.plantName)} -{" "}
              {a.sensorType.toUpperCase()}&nbsp;
              <span className={`badge ${a.level === "red" ? "red" : "orange"}`}>
                {a.level === "red" ? "Critica" : "Limite"}
              </span>
            </h3>
            <div className="alert-meta">
              Valor: <b>{a.value.toFixed(2)}</b>
              &nbsp; · &nbsp; Estado:
              <select
                className={`status-select status-${a.status}`}
                value={a.status}
                onChange={async (e) => {
                  const next = e.target.value as UiAlert["status"];
                  try {
                    await updateAlertStatus(a.id, next);
                    setAlerts((prev) =>
                      prev.map((x) =>
                        x.id === a.id ? { ...x, status: next } : x
                      )
                    );
                  } catch {}
                }}
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_progreso">En progreso</option>
                <option value="completado">Completado</option>
              </select>
              &nbsp; · &nbsp; Umbral:
              {typeof a.threshold?.min === "number"
                ? ` min ${a.threshold.min}`
                : ""}
              {typeof a.threshold?.max === "number"
                ? ` max ${a.threshold.max}`
                : ""}
              &nbsp; · &nbsp; {new Date(a.tsISO).toLocaleString()}
            </div>
          </article>
        ))}
      </div>

      {/* filtros y tabla de alertas */}
      <div className="filters filters-categories">
        <div className="field field-group">
          <label>Planta</label>
          <input
            list="plants-dl"
            placeholder="nombre o id"
            value={fPlant}
            onChange={(e) => setFPlant(e.target.value)}
          />
          <datalist id="plants-dl">
            {plantOptions.map((p) => (
              <option
                key={p.id}
                value={p.id}
                label={`${p.name} (${p.id.slice(0, 6)}...)`}
              ></option>
            ))}
          </datalist>
        </div>
        <div className="field field-group">
          <label>Sensor</label>
          <input
            list="sensors-dl"
            placeholder="id"
            value={fSensor}
            onChange={(e) => setFSensor(e.target.value)}
          />
          <datalist id="sensors-dl">
            {sensorOptions.map((s) => (
              <option
                key={s.id}
                value={s.id}
                label={`${s.type.toUpperCase()} (${s.id.slice(0, 6)}...)`}
              ></option>
            ))}
          </datalist>
        </div>
        <div className="field field-group">
          <label>Nivel</label>
          <select value={fLevel} onChange={(e) => setFLevel(e.target.value)}>
            <option value="">Todos</option>
            <option value="grave">Grave</option>
            <option value="critica">Critica</option>
          </select>
        </div>
        <div className="field field-group">
          <label>Estado</label>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_progreso">En progreso</option>
            <option value="completado">Completado</option>
          </select>
        </div>
        <div className="field">
          <label>Desde</label>
          <input
            type="datetime-local"
            value={fFrom}
            onChange={(e) => setFFrom(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Hasta</label>
          <input
            type="datetime-local"
            value={fTo}
            onChange={(e) => setFTo(e.target.value)}
          />
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <button
            onClick={async () => {
              const params: any = { limit: 200 };
              if (fPlant.trim()) params.plantId = fPlant.trim();
              if (fSensor.trim()) params.sensorId = fSensor.trim();
              if (fLevel) params.level = fLevel;
              const toIso = (v: string) =>
                v ? new Date(v).toISOString() : undefined;
              const fromISO = toIso(fFrom);
              const toISO = toIso(fTo);
              if (fromISO) params.from = fromISO;
              if (toISO) params.to = toISO;
              if (fStatus) params.status = fStatus;
              const apiRows = await listAlerts(params);
              const mapped: UiAlert[] = apiRows.map((r: any) => ({
                id: r._id,
                plantId: r.plantId,
                sensorId: r.sensorId,
                // ==============================================
                // CORRECCIÓN 2: Usar r.sensorType
                // ==============================================
                sensorType: r.sensorType || "humidity",
                value: r.value,
                tsISO: new Date(r.createdAt).toISOString(),
                level: r.level === "critica" ? "red" : "orange",
                status: r.status || "pendiente",
              }));
              setRows(mapped);
              setPage(1);
            }}
          >
            Buscar
          </button>
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <button
            className="btn-secondary"
            onClick={() => {
              setFPlant("");
              setFSensor("");
              setFLevel("");
              setFStatus("");
              setFFrom("");
              setFTo("");
              setRows([]);
              setPage(1);
            }}
          >
            Limpiar
          </button>
        </div>
      </div>

      <table className="alert-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Planta</th>
            <th>Sensor</th>
            <th>Nivel</th>
            <th>Valor</th>
            <th>Umbral</th>
          </tr>
        </thead>
        <tbody>
          {rows
            .slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
            .map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.tsISO).toLocaleString()}</td>
                <td>{r.plantId}</td>
                <td>{r.sensorId}</td>
                <td>
                  {r.level === "red" ? (
                    <>
                      <span className="level-dot level-red" />
                      Critica
                    </>
                  ) : (
                    <>
                      <span className="level-dot level-orange" />
                      Grave
                    </>
                  )}
                </td>
                <td>{r.value.toFixed(2)}</td>
                <td>
                  {r.threshold
                    ? `${
                        typeof r.threshold.min === "number"
                          ? "min " + r.threshold.min
                          : ""
                      } ${
                        typeof r.threshold.max === "number"
                          ? "max " + r.threshold.max
                          : ""
                      }`
                    : "-"}
                </td>
              </tr>
            ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="alert-meta">
                Sin resultados
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="pager">
        <div>
          <button
            className="btn"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <button
            className="btn"
            disabled={page * pageSize >= rows.length}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
        <div>
          <span className="muted">
            Mostrando {rows.length === 0 ? 0 : (page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, rows.length)} de {rows.length}
          </span>
          &nbsp; · &nbsp;
          <label>
            tamano&nbsp;
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
