import { useEffect, useMemo, useState } from "react";
import "../css/Plants.css";
import {
  createSensor,
  deletePlant,
  deleteSensor,
  getThreshold,
  listPlants,
  listSensors,
  updatePlant,
  upsertThreshold,
} from "../lib/Api";

// tipos ui
type SensorType = "humidity" | "ph" | "temp" | "lux";
type SensorUI = {
  id: string;
  type: SensorType;
  thresholdMin?: number;
  thresholdMax?: number;
};
type PlantUI = {
  id: string;
  name: string;
  type?: string;
  createdAt?: string;
  sensors: SensorUI[];
};

export default function Plants() {
  const [plants, setPlants] = useState<PlantUI[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [msg, setMsg] = useState("");

  // draft para alta de sensor
  const [sensorDraft, setSensorDraft] = useState<{
    type: SensorType;
    thresholdMin?: number;
    thresholdMax?: number;
  }>({ type: "humidity" });

  // carga plantas + sensores/umbrales para mostrar listado como antes
  useEffect(() => {
    (async () => {
      const res = await listPlants({ limit: 100 });
      const base = res.items.map((p) => ({
        id: p._id,
        name: p.name,
        type: p.type,
        createdAt: p.createdAt,
        sensors: [] as SensorUI[],
      }));
      setPlants(base);
      for (const bp of base) {
        try {
          const sres = await listSensors(bp.id, { limit: 100 });
          const rows: SensorUI[] = [];
          for (const s of sres.items) {
            let th = null;
            try {
              th = await getThreshold(s._id);
            } catch {}
            rows.push({
              id: s._id,
              type: s.type as SensorType,
              thresholdMin: th?.min,
              thresholdMax: th?.max,
            });
          }
          setPlants((prev) =>
            prev.map((p) => (p.id === bp.id ? { ...p, sensors: rows } : p))
          );
        } catch {}
      }
    })();
  }, []);

  const filtered = useMemo(
    () =>
      plants.filter((p) =>
        (p.name + " " + (p.type ?? ""))
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [plants, search]
  );

  // inicia edicion
  const startEdit = (p: PlantUI) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditType(p.type ?? "");
    setSensorDraft({ type: "humidity" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditType("");
    setSensorDraft({ type: "humidity" });
  };

  // guarda cambios basicos
  const savePlantBasics = async (id: string) => {
    try {
      const upd = await updatePlant(id, {
        name: editName.trim() || undefined,
        type: editType.trim() || undefined,
      });
      setPlants((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, name: upd.name, type: upd.type } : p
        )
      );
      setMsg("Planta actualizada");
    } catch (e: any) {
      setMsg(`Error: ${e.message ?? String(e)}`);
    }
    cancelEdit();
  };

  // elimina sensor
  const removeSensor = async (plantId: string, sensorId: string) => {
    if (!confirm("Eliminar sensor?")) return;
    try {
      await deleteSensor(sensorId);
      setPlants((prev) =>
        prev.map((p) =>
          p.id === plantId
            ? { ...p, sensors: p.sensors.filter((s) => s.id !== sensorId) }
            : p
        )
      );
    } catch (e: any) {
      setMsg(`Error: ${e.message ?? String(e)}`);
    }
  };

  // agrega sensor y umbral opcional
  const addSensor = async (plantId: string) => {
    try {
      const s = await createSensor(plantId, { type: sensorDraft.type });
      if (
        typeof sensorDraft.thresholdMin === "number" &&
        typeof sensorDraft.thresholdMax === "number"
      ) {
        await upsertThreshold(s._id, {
          min: sensorDraft.thresholdMin,
          max: sensorDraft.thresholdMax,
          hysteresis: 0,
        });
      }
      setPlants((prev) =>
        prev.map((p) =>
          p.id === plantId
            ? {
                ...p,
                sensors: [
                  {
                    id: s._id,
                    type: s.type as SensorType,
                    thresholdMin: sensorDraft.thresholdMin,
                    thresholdMax: sensorDraft.thresholdMax,
                  },
                  ...p.sensors,
                ],
              }
            : p
        )
      );
      setSensorDraft({ type: "humidity" });
      setMsg("Sensor creado");
    } catch (e: any) {
      setMsg(`Error creando sensor: ${e.message ?? String(e)}`);
    }
  };

  // guarda umbral existente
  const saveThreshold = async (plantId: string, sensorId: string) => {
    const plant = plants.find((p) => p.id === plantId);
    if (!plant) return;
    const s = plant.sensors.find((x) => x.id === sensorId);
    if (!s) return;
    if (
      typeof s.thresholdMin !== "number" ||
      typeof s.thresholdMax !== "number"
    ) {
      setMsg("Completa min y max");
      return;
    }
    try {
      await upsertThreshold(sensorId, {
        min: s.thresholdMin,
        max: s.thresholdMax,
        hysteresis: 0,
      });
      setMsg("Umbral guardado");
    } catch (e: any) {
      setMsg(`Error umbral: ${e.message ?? String(e)}`);
    }
  };

  const removePlant = async (id: string) => {
    if (!confirm("Eliminar planta?")) return;
    try {
      await deletePlant(id);
      setPlants((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      setMsg(`Error: ${e.message ?? String(e)}`);
    }
  };

  return (
    <section>
      <h1>Plantas</h1>
      {msg && <p className="muted">{msg}</p>}

      <div className="plants-toolbar">
        <input
          className="search"
          placeholder="Buscar por nombre o tipo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="plants-grid">
        {filtered.map((p) => {
          const isEditing = editingId === p.id;
          return (
            <article key={p.id} className="plant-card">
              {!isEditing ? (
                <>
                  <div className="plant-header">
                    <h3 className="plant-title">{p.name}</h3>
                    <div className="plant-meta">
                      {p.type ? (
                        <span className="pill">{p.type}</span>
                      ) : (
                        <span className="pill muted">Sin tipo</span>
                      )}
                      <span className="pill">{p.sensors.length} sensores</span>
                      <span className="muted sm">
                        Creada:{" "}
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleString()
                          : "-"}
                      </span>
                    </div>
                  </div>
                  <ul className="sensor-list compact">
                    {p.sensors.map((s) => (
                      <li key={s.id} className="sensor-item">
                        <div>
                          <b>{s.type.toUpperCase()}</b> ·
                          {s.thresholdMin !== undefined
                            ? ` min ${s.thresholdMin}`
                            : ""}{" "}
                          {s.thresholdMax !== undefined
                            ? ` max ${s.thresholdMax}`
                            : ""}
                        </div>
                        <button
                          className="btn-danger"
                          onClick={() => removeSensor(p.id, s.id)}
                        >
                          Eliminar
                        </button>
                      </li>
                    ))}
                    {p.sensors.length === 0 && (
                      <li className="muted">Sin sensores</li>
                    )}
                  </ul>
                  <div className="actions-row">
                    <button onClick={() => startEdit(p)}>Editar</button>
                    <button
                      className="btn-secondary"
                      onClick={() => removePlant(p.id)}
                    >
                      Eliminar planta
                    </button>
                  </div>
                </>
              ) : (
                <div className="edit-grid">
                  <section className="subcard">
                    <h3>Datos basicos</h3>
                    <div className="form grid-2">
                      <label>
                        Nombre
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </label>
                      <label>
                        Tipo (libre)
                        <input
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          placeholder="Ej: Tomate"
                        />
                      </label>
                    </div>
                    <div className="actions-row">
                      <button onClick={() => savePlantBasics(p.id)}>
                        Guardar cambios
                      </button>
                      <button className="btn-secondary" onClick={cancelEdit}>
                        Cancelar
                      </button>
                    </div>
                  </section>

                  <section className="subcard">
                    <h3>Agregar sensor</h3>
                    <form
                      className="form grid-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        addSensor(p.id);
                      }}
                    >
                      <label>
                        Tipo
                        <select
                          value={sensorDraft.type}
                          onChange={(e) =>
                            setSensorDraft({
                              ...sensorDraft,
                              type: e.target.value as SensorType,
                            })
                          }
                        >
                          <option value="humidity">Humedad</option>
                          <option value="ph">pH</option>
                          <option value="temp">Temperatura</option>
                          <option value="lux">Luminosidad</option>
                        </select>
                      </label>
                      <label>
                        Umbral min.
                        <input
                          type="number"
                          step="any"
                          value={sensorDraft.thresholdMin ?? ""}
                          onChange={(e) =>
                            setSensorDraft({
                              ...sensorDraft,
                              thresholdMin:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        Umbral max.
                        <input
                          type="number"
                          step="any"
                          value={sensorDraft.thresholdMax ?? ""}
                          onChange={(e) =>
                            setSensorDraft({
                              ...sensorDraft,
                              thresholdMax:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <div className="actions-row">
                        <button type="submit">Agregar sensor</button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setSensorDraft({ type: "humidity" })}
                        >
                          Limpiar
                        </button>
                      </div>
                    </form>
                  </section>

                  <section className="subcard col-span-2">
                    <h3>Editar umbrales</h3>
                    <ul className="sensor-list compact">
                      {p.sensors.map((s) => (
                        <li key={s.id} className="sensor-item">
                          <div>
                            <b>{s.type.toUpperCase()}</b>
                          </div>
                          <div className="sensor-controls">
                            <span className="muted">min</span>
                            <input
                              type="number"
                              step="any"
                              value={s.thresholdMin ?? ""}
                              onChange={(e) =>
                                setPlants((prev) =>
                                  prev.map((pp) =>
                                    pp.id === p.id
                                      ? {
                                          ...pp,
                                          sensors: pp.sensors.map((ss) =>
                                            ss.id === s.id
                                              ? {
                                                  ...ss,
                                                  thresholdMin:
                                                    e.target.value === ""
                                                      ? undefined
                                                      : Number(e.target.value),
                                                }
                                              : ss
                                          ),
                                        }
                                      : pp
                                  )
                                )
                              }
                            />
                            <span className="muted">max</span>
                            <input
                              type="number"
                              step="any"
                              value={s.thresholdMax ?? ""}
                              onChange={(e) =>
                                setPlants((prev) =>
                                  prev.map((pp) =>
                                    pp.id === p.id
                                      ? {
                                          ...pp,
                                          sensors: pp.sensors.map((ss) =>
                                            ss.id === s.id
                                              ? {
                                                  ...ss,
                                                  thresholdMax:
                                                    e.target.value === ""
                                                      ? undefined
                                                      : Number(e.target.value),
                                                }
                                              : ss
                                          ),
                                        }
                                      : pp
                                  )
                                )
                              }
                            />
                            <button
                              className="btn-secondary"
                              onClick={() => saveThreshold(p.id, s.id)}
                            >
                              Guardar
                            </button>
                            <button
                              className="btn-danger"
                              onClick={() => removeSensor(p.id, s.id)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </li>
                      ))}
                      {p.sensors.length === 0 && (
                        <li className="muted">Sin sensores</li>
                      )}
                    </ul>
                  </section>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
