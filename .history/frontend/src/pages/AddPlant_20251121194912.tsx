import { useMemo, useState } from "react";
import "../css/AddPlant.css";
import { createPlant, createSensor, upsertThreshold } from "../lib/Api";

type PlantType = string;
type SensorType = "humidity" | "ph" | "temp" | "lux";
type ScheduleMode = "predefinida" | "horario" | "rango";

type SensorConfig = {
  id: string;
  type: SensorType;
  thresholdMin?: number;
  thresholdMax?: number;
  scheduleMode: ScheduleMode;
  everyHours?: number;
  fixedTimes?: string;
  rangeStart?: string;
  rangeEnd?: string;
  rangeCount?: number;
};

export default function AddPlant() {
  const [step, setStep] = useState<1 | 2>(1);
  const [plantId, setPlantId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // paso 1
  const [name, setName] = useState("");
  const [plantType, setPlantType] = useState<PlantType>("");

  // paso 2
  const [sensors, setSensors] = useState<SensorConfig[]>([]);
  const blankSensor: SensorConfig = useMemo(
    () => ({
      id: crypto.randomUUID(),
      type: "humidity",
      scheduleMode: "predefinida",
      everyHours: 2,
      thresholdMin: undefined,
      thresholdMax: undefined,
      fixedTimes: "",
      rangeStart: "",
      rangeEnd: "",
      rangeCount: 3,
    }),
    []
  );
  const [draft, setDraft] = useState<SensorConfig>(blankSensor);

  // crea planta real y avanza
  const handleCreatePlant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setBusy(true);
      setMsg("");
      const created = await createPlant({
        name: name.trim(),
        type: plantType || undefined,
      });
      setPlantId(created._id);
      setMsg("Planta creada");
      setStep(2);
    } catch (err: any) {
      setMsg(`Error: ${err.message ?? String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  // agrega sensor al borrador local
  const addSensor = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: SensorConfig = {
      ...draft,
      id: crypto.randomUUID(),
      everyHours:
        draft.scheduleMode === "predefinida" ? draft.everyHours : undefined,
      fixedTimes:
        draft.scheduleMode === "horario"
          ? (draft.fixedTimes || "").trim()
          : undefined,
      rangeStart: draft.scheduleMode === "rango" ? draft.rangeStart : undefined,
      rangeEnd: draft.scheduleMode === "rango" ? draft.rangeEnd : undefined,
      rangeCount: draft.scheduleMode === "rango" ? draft.rangeCount : undefined,
    };
    setSensors((prev) => [cleaned, ...prev]);
    setDraft(blankSensor);
  };

  const removeSensor = (id: string) =>
    setSensors((prev) => prev.filter((s) => s.id !== id));

  // crea sensores/umbrales y resetea
  const finish = async (withSensors: boolean) => {
    if (!plantId) {
      setMsg("Crea la planta primero");
      return;
    }
    if (!withSensors || sensors.length === 0) {
      setMsg("Planta guardada");
    } else {
      try {
        setBusy(true);
        for (const s of sensors) {
          const sensor = await createSensor(plantId, { type: s.type });
          if (
            typeof s.thresholdMin === "number" &&
            typeof s.thresholdMax === "number"
          ) {
            await upsertThreshold(sensor._id, {
              min: s.thresholdMin,
              max: s.thresholdMax,
              hysteresis: 0,
            });
          }
        }
        setMsg("Sensores agregados");
      } catch (e: any) {
        setMsg(`Error creando sensores: ${e.message ?? String(e)}`);
        return;
      } finally {
        setBusy(false);
      }
    }
    setStep(1);
    setPlantId(null);
    setName("");
    setPlantType("");
    setSensors([]);
    setDraft(blankSensor);
  };

  return (
    <section>
      <h1>Agregar planta</h1>
      {msg && <p className="hint">{msg}</p>}

      {step === 1 && (
        <form onSubmit={handleCreatePlant} className="form card">
          <h2>1) Datos de la planta</h2>

          <label>
            Nombre de la planta :
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ej: Albahaca N3"
              disabled={busy}
            />
          </label>

          <label>
            Tipo de planta :
            <input
              value={plantType}
              onChange={(e) => setPlantType(e.target.value)}
              placeholder="Ej: Tomate, Lechuga, etc."
              list="plantTypeSuggestions"
              disabled={busy}
            />
          </label>

          <div className="actions-row">
            <button type="submit" disabled={busy}>
              Continuar (Agregar sensores)
            </button>
            <button
              type="button"
              className="btn-secondary"
              title="Puedes editarla luego en 'Editar planta'"
              onClick={() => finish(false)}
              disabled={busy || !plantId}
            >
              Guardar sin sensores
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <>
          <div className="card">
            <h2>2) Agregar sensores</h2>
            <form onSubmit={addSensor} className="grid-2">
              <label>
                Tipo de sensor
                <select
                  value={draft.type}
                  onChange={(e) =>
                    setDraft({ ...draft, type: e.target.value as SensorType })
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
                  value={draft.thresholdMin ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      thresholdMin:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    })
                  }
                />
              </label>

              <label>
                Modo de muestreo
                <select
                  value={draft.scheduleMode}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      scheduleMode: e.target.value as ScheduleMode,
                    })
                  }
                >
                  <option value="predefinida">
                    Predefinida (cada N horas)
                  </option>
                  <option value="horario">Horario fijo</option>
                  <option value="rango">Rango de tiempo</option>
                </select>
              </label>

              <label>
                Umbral max.
                <input
                  type="number"
                  step="any"
                  value={draft.thresholdMax ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      thresholdMax:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    })
                  }
                />
              </label>

              {draft.scheduleMode === "predefinida" && (
                <label>
                  Cada N horas
                  <input
                    type="number"
                    min={1}
                    value={draft.everyHours ?? 2}
                    onChange={(e) =>
                      setDraft({ ...draft, everyHours: Number(e.target.value) })
                    }
                  />
                </label>
              )}

              {draft.scheduleMode === "horario" && (
                <label>
                  Horarios fijos (HH:MM, separados por coma)
                  <input
                    placeholder="07:30, 12:00, 20:00"
                    value={draft.fixedTimes || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, fixedTimes: e.target.value })
                    }
                  />
                </label>
              )}

              {draft.scheduleMode === "rango" && (
                <>
                  <label>
                    Inicio (HH:MM)
                    <input
                      value={draft.rangeStart || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, rangeStart: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Fin (HH:MM)
                    <input
                      value={draft.rangeEnd || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, rangeEnd: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Cantidad de mediciones
                    <input
                      type="number"
                      min={1}
                      value={draft.rangeCount ?? 3}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          rangeCount: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </>
              )}

              <div className="actions-row">
                <button type="submit">Agregar sensor</button>
              </div>
            </form>
          </div>

          <div className="card">
            <h2>Sensores agregados ({sensors.length})</h2>
            <ul className="sensor-list">
              {sensors.map((s) => (
                <li key={s.id}>
                  <b>{s.type.toUpperCase()}</b>
                  {typeof s.thresholdMin === "number" ||
                  typeof s.thresholdMax === "number" ? (
                    <>
                      {" "}
                      &nbsp; • Umbral: min {s.thresholdMin ?? "-"} max{" "}
                      {s.thresholdMax ?? "-"}
                    </>
                  ) : null}
                  <button className="btn-sm" onClick={() => removeSensor(s.id)}>
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
            <div className="actions-row">
              <button
                className="btn"
                onClick={() => finish(true)}
                disabled={busy}
              >
                Finalizar
              </button>
              <button
                className="btn-secondary"
                onClick={() => finish(false)}
                disabled={busy}
              >
                Finalizar sin sensores
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
