import { useMemo, useState } from "react";
import "../css/AddPlant.css";

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

    // Paso 1
    const [name, setName] = useState("");
    const [plantType, setPlantType] = useState<PlantType>(""); // texto libre

    // Paso 2
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

    const handleCreatePlant = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        // tipo puede ser vacío (si no lo quiere indicar)
        setStep(2);
    };

    const addSensor = (e: React.FormEvent) => {
        e.preventDefault();
        const cleaned: SensorConfig = {
            ...draft,
            id: crypto.randomUUID(),
            everyHours: draft.scheduleMode === "predefinida" ? draft.everyHours : undefined,
            fixedTimes: draft.scheduleMode === "horario" ? (draft.fixedTimes || "").trim() : undefined,
            rangeStart: draft.scheduleMode === "rango" ? draft.rangeStart : undefined,
            rangeEnd: draft.scheduleMode === "rango" ? draft.rangeEnd : undefined,
            rangeCount: draft.scheduleMode === "rango" ? draft.rangeCount : undefined,
        };
        setSensors((prev) => [cleaned, ...prev]);
        setDraft(blankSensor);
    };

    const removeSensor = (id: string) => setSensors((prev) => prev.filter((s) => s.id !== id));

    const finish = (withSensors: boolean) => {
        const payload = {
            plant: { name, type: plantType || undefined },
            sensors: withSensors ? sensors : [],
        };
        alert("(Demo) Se enviaría al backend:\n" + JSON.stringify(payload, null, 2));
        setStep(1);
        setName("");
        setPlantType("");
        setSensors([]);
        setDraft(blankSensor);
    };

    return (
        <section>
            <h1>Agregar planta</h1>

            {step === 1 && (
                <form onSubmit={handleCreatePlant} className="form card">
                    <h2>1) Datos de la planta</h2>

                    <label>
                        Nombre de la planta :
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="Ej: Albahaca N°3"
                        />
                    </label>

                    <label>
                        Tipo de planta   :
                        <input
                            value={plantType}
                            onChange={(e) => setPlantType(e.target.value)}
                            placeholder="Ej: Tomate, Lechuga, etc."
                            list="plantTypeSuggestions"
                        />
                    </label>

                    <div className="actions-row">
                        <button type="submit">Continuar (Agregar sensores)</button>
                        <button
                            type="button"
                            className="btn-secondary"
                            title="Puedes editarla luego en 'Editar planta'"
                            onClick={() => finish(false)}
                        >
                            Guardar sin sensores
                        </button>
                    </div>
                </form>
            )}

            {step === 2 && (
                <>
                    <div className="card">
                        <h2>2) Agregar sensores (opcional)</h2>
                        <p className="muted">
                            Puedes agregar 0 o más sensores. Cada sensor debe tener su umbral y programación.
                        </p>

                        <form onSubmit={addSensor} className="grid-2">
                            <label>
                                Tipo de sensor
                                <select
                                    value={draft.type}
                                    onChange={(e) => setDraft({ ...draft, type: e.target.value as SensorType })}
                                >
                                    <option value="humidity">Humedad</option>
                                    <option value="ph">pH</option>
                                    <option value="temp">Temperatura</option>
                                    <option value="lux">Luminosidad</option>
                                </select>
                            </label>

                            <label>
                                Umbral mín. (opcional)
                                <input
                                    type="number"
                                    step="any"
                                    value={draft.thresholdMin ?? ""}
                                    onChange={(e) =>
                                        setDraft({
                                            ...draft,
                                            thresholdMin: e.target.value === "" ? undefined : Number(e.target.value),
                                        })
                                    }
                                    placeholder="p.ej. 30"
                                />
                            </label>

                            <label>
                                Umbral máx. (opcional)
                                <input
                                    type="number"
                                    step="any"
                                    value={draft.thresholdMax ?? ""}
                                    onChange={(e) =>
                                        setDraft({
                                            ...draft,
                                            thresholdMax: e.target.value === "" ? undefined : Number(e.target.value),
                                        })
                                    }
                                    placeholder="p.ej. 70"
                                />
                            </label>

                            <label>
                                Modo de programación
                                <select
                                    value={draft.scheduleMode}
                                    onChange={(e) => setDraft({ ...draft, scheduleMode: e.target.value as ScheduleMode })}
                                >
                                    <option value="predefinida">Predefinida (cada N horas)</option>
                                    <option value="horario">Por horario específico</option>
                                    <option value="rango">Rangos (repetición uniforme)</option>
                                </select>
                            </label>

                            {draft.scheduleMode === "predefinida" && (
                                <label>
                                    Cada N horas
                                    <input
                                        type="number"
                                        min={1}
                                        value={draft.everyHours ?? 2}
                                        onChange={(e) => setDraft({ ...draft, everyHours: Number(e.target.value) })}
                                        placeholder="Ej: 2"
                                    />
                                </label>
                            )}

                            {draft.scheduleMode === "horario" && (
                                <label className="col-span-2">
                                    Horas fijas (coma-separadas)
                                    <input
                                        type="text"
                                        value={draft.fixedTimes ?? ""}
                                        onChange={(e) => setDraft({ ...draft, fixedTimes: e.target.value })}
                                        placeholder="Ej: 07:30, 11:00, 20:15"
                                    />
                                </label>
                            )}

                            {draft.scheduleMode === "rango" && (
                                <>
                                    <label>
                                        Inicio
                                        <input
                                            type="time"
                                            value={draft.rangeStart ?? ""}
                                            onChange={(e) => setDraft({ ...draft, rangeStart: e.target.value })}
                                        />
                                    </label>
                                    <label>
                                        Fin
                                        <input
                                            type="time"
                                            value={draft.rangeEnd ?? ""}
                                            onChange={(e) => setDraft({ ...draft, rangeEnd: e.target.value })}
                                        />
                                    </label>
                                    <label>
                                        Lecturas en el rango
                                        <input
                                            type="number"
                                            min={1}
                                            value={draft.rangeCount ?? 3}
                                            onChange={(e) => setDraft({ ...draft, rangeCount: Number(e.target.value) })}
                                            placeholder="Ej: 3"
                                        />
                                    </label>
                                </>
                            )}

                            <div className="actions-row col-span-2">
                                <button type="submit">Agregar sensor</button>
                                <button type="button" className="btn-secondary" onClick={() => setDraft(blankSensor)}>
                                    Limpiar formulario
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="card">
                        <h3>Sensores agregados ({sensors.length})</h3>
                        {sensors.length === 0 ? (
                            <p className="muted">Aún no agregas sensores.</p>
                        ) : (
                            <ul className="sensor-list">
                                {sensors.map((s) => (
                                    <li key={s.id} className="sensor-item">
                                        <div>
                                            <b>{s.type.toUpperCase()}</b> · umbral:
                                            {s.thresholdMin !== undefined ? ` min ${s.thresholdMin}` : ""}
                                            {s.thresholdMax !== undefined ? ` max ${s.thresholdMax}` : ""}{" "}
                                            ·{" "}
                                            {s.scheduleMode === "predefinida" && `Cada ${s.everyHours} h`}
                                            {s.scheduleMode === "horario" && `Horas: ${s.fixedTimes}`}
                                            {s.scheduleMode === "rango" && `De ${s.rangeStart} a ${s.rangeEnd} (${s.rangeCount})`}
                                        </div>
                                        <button className="btn-danger" onClick={() => removeSensor(s.id)}>
                                            Eliminar
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="actions-row">
                            <button onClick={() => finish(true)}>Finalizar y guardar</button>
                            <button className="btn-secondary" onClick={() => finish(false)}>
                                Guardar sin sensores
                            </button>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
