import { useEffect, useMemo, useState } from "react";
import { ConfirmModal } from "../components/ConfirmModal";
import "../css/Plants.css";
import {
  createPlant,
  createSensor,
  deletePlant,
  deleteSensor,
  getThreshold,
  listPlants,
  listSensors,
  updatePlant,
  upsertThreshold,
} from "../lib/Api";

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
  // formulario crear planta integrado
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    type: "plant" | "sensor";
    plantId?: string;
    sensorId?: string;
  }>({ open: false, type: "plant" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [msg, setMsg] = useState("");

  // borrador para agregar sensor (solo tipo, umbrales se crean en 0 y se editan abajo)
  const [sensorDraft, setSensorDraft] = useState<{
    type: SensorType;
  }>({ type: "humidity" });

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

  const editingPlant = useMemo(
    () => plants.find((p) => p.id === editingId) ?? null,
    [plants, editingId]
  );

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
      // nos quedamos en la vista de edicion
    } catch (e: any) {
      setMsg(`Error: ${e.message ?? String(e)}`);
    }
  };

  const removeSensor = (plantId: string, sensorId: string) => {
    setConfirm({ open: true, type: "sensor", plantId, sensorId });
  };

  const addSensor = async (plantId: string) => {
    try {
      const s = await createSensor(plantId, { type: sensorDraft.type });
      // crear umbrales por defecto en 0
      await upsertThreshold(s._id, { min: 0, max: 0, hysteresis: 0 });
      setPlants((prev) =>
        prev.map((p) =>
          p.id === plantId
            ? {
                ...p,
                sensors: [
                  {
                    id: s._id,
                    type: s.type as SensorType,
                    thresholdMin: 0,
                    thresholdMax: 0,
                  },
                  ...p.sensors,
                ],
              }
            : p
        )
      );
      setSensorDraft({ type: "humidity" });
      setMsg("Sensor creado (umbrales 0)");
    } catch (e: any) {
      setMsg(`Error creando sensor: ${e.message ?? String(e)}`);
    }
  };

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

  const removePlant = (id: string) => {
    setConfirm({ open: true, type: "plant", plantId: id });
  };

  const handleConfirm = async () => {
    const { type, plantId, sensorId } = confirm;
    setConfirm({ ...confirm, open: false });
    try {
      if (type === "plant" && plantId) {
        await deletePlant(plantId);
        setPlants((prev) => prev.filter((p) => p.id !== plantId));
        if (editingId === plantId) cancelEdit();
        setMsg("Planta eliminada");
      } else if (type === "sensor" && plantId && sensorId) {
        await deleteSensor(sensorId);
        setPlants((prev) =>
          prev.map((p) =>
            p.id === plantId
              ? { ...p, sensors: p.sensors.filter((s) => s.id !== sensorId) }
              : p
          )
        );
        setMsg("Sensor eliminado");
      }
    } catch (e: any) {
      setMsg(`Error: ${e.message ?? String(e)}`);
    }
  };

  const handleCancel = () => setConfirm({ ...confirm, open: false });

  const createPlantInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      setCreating(true);
      const created = await createPlant({
        name: newName.trim(),
        type: newType.trim() || undefined,
      });
      setPlants((prev) => [
        {
          id: created._id,
          name: created.name,
          type: created.type,
          createdAt: created.createdAt,
          sensors: [],
        },
        ...prev,
      ]);
      setMsg("Planta creada");
      setNewName("");
      setNewType("");
    } catch (e: any) {
      setMsg(`Error creando planta: ${e.message ?? String(e)}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <section>
      <h1>Plantas</h1>
      {msg && <p className="muted">{msg}</p>}

      <div className="plants-toolbar">
        <form
          onSubmit={createPlantInline}
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            className="search"
            placeholder="Nombre nueva planta"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={creating}
          />
          <input
            className="search"
            style={{ maxWidth: 240 }}
            placeholder="Tipo (opcional)"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            disabled={creating}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={creating || !newName.trim()}
          >
            Agregar planta
          </button>
        </form>
        <input
          className="search"
          placeholder="Buscar por nombre o tipo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
      </div>

      {editingPlant ? (
        <>
          <button className="btn-secondary back-button" onClick={cancelEdit}>
            Volver al listado
          </button>

          <article className="plant-edit-panel">
            <div className="edit-header">
              <div>
                <h2>{editingPlant.name}</h2>
                <div className="muted sm">
                  {editingPlant.type ? `${editingPlant.type} · ` : ""}
                  {editingPlant.sensors.length} sensores
                </div>
              </div>
            </div>

            <div className="edit-grid">
              <section className="subcard">
                <h3>Datos básicos</h3>
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
                  <button
                    className="btn-primary"
                    onClick={() => savePlantBasics(editingPlant.id)}
                  >
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
                  className="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    addSensor(editingPlant.id);
                  }}
                >
                  <label>
                    Tipo
                    <select
                      value={sensorDraft.type}
                      onChange={(e) =>
                        setSensorDraft({ type: e.target.value as SensorType })
                      }
                    >
                      <option value="humidity">Humedad</option>
                      <option value="ph">pH</option>
                      <option value="temp">Temperatura</option>
                      <option value="lux">Luminosidad</option>
                    </select>
                  </label>
                  <div className="actions-row">
                    <button type="submit" className="btn-primary">
                      Agregar sensor
                    </button>
                  </div>
                </form>
                <p className="muted" style={{ marginTop: 8 }}>
                  Los umbrales se crean en 0 y puedes editarlos abajo.
                </p>
              </section>

              <section className="subcard col-span-2">
                <h3>Editar umbrales</h3>
                <ul className="sensor-list compact">
                  {editingPlant.sensors.map((s) => (
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
                                pp.id === editingPlant.id
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
                                pp.id === editingPlant.id
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
                          onClick={() => saveThreshold(editingPlant.id, s.id)}
                        >
                          Guardar
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => removeSensor(editingPlant.id, s.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </li>
                  ))}
                  {editingPlant.sensors.length === 0 && (
                    <li className="muted">Sin sensores</li>
                  )}
                </ul>
              </section>
            </div>
          </article>
        </>
      ) : (
        <ul className="plants-list">
          {filtered.map((p) => (
            <li key={p.id} className="plant-row">
              <div className="plant-row-name">
                <span className="plant-name-main">{p.name}</span>
                {p.type && <span className="pill">{p.type}</span>}
                <span className="muted sm">{p.sensors.length} sensores</span>
              </div>
              <div className="plant-row-actions">
                <button className="btn-primary" onClick={() => startEdit(p)}>
                  Editar planta
                </button>
                <button
                  className="btn-danger"
                  onClick={() => removePlant(p.id)}
                >
                  Eliminar planta
                </button>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="plant-row">
              <span className="muted">No hay plantas que coincidan</span>
            </li>
          )}
        </ul>
      )}
      <ConfirmModal
        open={confirm.open}
        title={confirm.type === "plant" ? "Eliminar planta" : "Eliminar sensor"}
        message={
          confirm.type === "plant"
            ? "¿Seguro que quieres eliminar esta planta? Esto también elimina sus sensores y umbrales."
            : "¿Seguro que quieres eliminar este sensor y su umbral asociado?"
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </section>
  );
}

// Modal global integrado
export function PlantsConfirmModalWrapper() {
  return null;
}
