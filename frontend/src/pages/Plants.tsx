import { useMemo, useState } from "react";
import "../css/Plants.css";

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

type Plant = {
    id: string;
    name: string;
    type?: string;
    sensors: SensorConfig[];
    createdAt: string; // ISO
};

export default function Plants() {



    //demo
    const initial: Plant[] = useMemo(
        () => [
            {
                id: crypto.randomUUID(),
                name: "Albahaca N°3",
                type: "Hierba",
                createdAt: new Date().toISOString(),
                sensors: [
                    {
                        id: crypto.randomUUID(),
                        type: "humidity",
                        thresholdMin: 35,
                        thresholdMax: 70,
                        scheduleMode: "predefinida",
                        everyHours: 2
                    },
                    {
                        id: crypto.randomUUID(),
                        type: "temp",
                        thresholdMin: 10,
                        thresholdMax: 30,
                        scheduleMode: "horario",
                        fixedTimes: "07:30, 12:00, 20:00"
                    }
                ]
            },
            {
                id: crypto.randomUUID(),
                name: "Tomate Patio",
                type: "Tomate",
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                sensors: [
                    {
                        id: crypto.randomUUID(),
                        type: "ph",
                        thresholdMin: 5.5,
                        thresholdMax: 7.0,
                        scheduleMode: "rango",
                        rangeStart: "06:00",
                        rangeEnd: "12:00",
                        rangeCount: 3
                    }
                ]
            }
        ],
        []
    );

    const [plants, setPlants] = useState<Plant[]>(initial);
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);

    // Drafts para edición/alta de sensor
    const [editName, setEditName] = useState("");
    const [editType, setEditType] = useState("");

    const blankSensor: SensorConfig = {
        id: "",
        type: "humidity",
        scheduleMode: "predefinida",
        everyHours: 2,
        thresholdMin: undefined,
        thresholdMax: undefined,
        fixedTimes: "",
        rangeStart: "",
        rangeEnd: "",
        rangeCount: 3
    };
    const [sensorDraft, setSensorDraft] = useState<SensorConfig>(blankSensor);

    const filtered = useMemo(
        () =>
            plants.filter(p =>
                (p.name + " " + (p.type ?? "")).toLowerCase().includes(search.toLowerCase())
            ),
        [plants, search]
    );

    const startEdit = (p: Plant) => {
        setEditingId(p.id);
        setEditName(p.name);
        setEditType(p.type ?? "");
        setSensorDraft({ ...blankSensor, id: crypto.randomUUID() });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName("");
        setEditType("");
        setSensorDraft(blankSensor);
    };

    const savePlantBasics = (id: string) => {
        setPlants(prev =>
            prev.map(p =>
                p.id === id ? { ...p, name: editName.trim() || p.name, type: editType.trim() || undefined } : p
            )
        );
        cancelEdit();
    };

    const removeSensor = (plantId: string, sensorId: string) => {
        setPlants(prev =>
            prev.map(p =>
                p.id === plantId ? { ...p, sensors: p.sensors.filter(s => s.id !== sensorId) } : p
            )
        );
    };

    const addSensor = (plantId: string) => {
        const cleaned: SensorConfig = {
            ...sensorDraft,
            id: crypto.randomUUID(),
            everyHours: sensorDraft.scheduleMode === "predefinida" ? sensorDraft.everyHours : undefined,
            fixedTimes: sensorDraft.scheduleMode === "horario" ? (sensorDraft.fixedTimes || "").trim() : undefined,
            rangeStart: sensorDraft.scheduleMode === "rango" ? sensorDraft.rangeStart : undefined,
            rangeEnd: sensorDraft.scheduleMode === "rango" ? sensorDraft.rangeEnd : undefined,
            rangeCount: sensorDraft.scheduleMode === "rango" ? sensorDraft.rangeCount : undefined
        };
        setPlants(prev =>
            prev.map(p => (p.id === plantId ? { ...p, sensors: [cleaned, ...p.sensors] } : p))
        );
        setSensorDraft({ ...blankSensor, id: crypto.randomUUID() });
    };

    return (
        <section>
            <h1>Plantas</h1>

            <div className="plants-toolbar">
                <input
                    className="search"
                    placeholder="Buscar por nombre o tipo…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="plants-grid">
                {filtered.map(p => {
                    const isEditing = editingId === p.id;
                    return (
                        <article key={p.id} className="plant-card">
                            {!isEditing ? (
                                <>
                                    <div className="plant-header">
                                        <h3 className="plant-title">{p.name}</h3>
                                        <div className="plant-meta">
                                            {p.type ? <span className="pill">{p.type}</span> : <span className="pill muted">Sin tipo</span>}
                                            <span className="pill">{p.sensors.length} sensores</span>
                                            <span className="muted sm">
                        Creada: {new Date(p.createdAt).toLocaleString()}
                      </span>
                                        </div>
                                    </div>

                                    <ul className="sensor-list compact">
                                        {p.sensors.map(s => (
                                            <li key={s.id} className="sensor-item">
                                                <div>
                                                    <b>{s.type.toUpperCase()}</b> ·
                                                    {s.thresholdMin !== undefined ? ` min ${s.thresholdMin}` : ""}{" "}
                                                    {s.thresholdMax !== undefined ? ` max ${s.thresholdMax}` : ""}{" "}
                                                    ·{" "}
                                                    {s.scheduleMode === "predefinida" && `Cada ${s.everyHours} h`}
                                                    {s.scheduleMode === "horario" && `Horas: ${s.fixedTimes}`}
                                                    {s.scheduleMode === "rango" && `De ${s.rangeStart} a ${s.rangeEnd} (${s.rangeCount})`}
                                                </div>
                                                <button className="btn-danger" onClick={() => removeSensor(p.id, s.id)}>
                                                    Eliminar
                                                </button>
                                            </li>
                                        ))}
                                        {p.sensors.length === 0 && <li className="muted">Sin sensores</li>}
                                    </ul>

                                    <div className="actions-row">
                                        <button onClick={() => startEdit(p)}>Editar</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3>Editar planta</h3>
                                    <div className="grid-2">
                                        <label>
                                            Nombre
                                            <input value={editName} onChange={e => setEditName(e.target.value)} />
                                        </label>
                                        <label>
                                            Tipo (libre)
                                            <input value={editType} onChange={e => setEditType(e.target.value)} placeholder="Ej: Tomate" />
                                        </label>
                                    </div>

                                    <h4 style={{marginTop:12}}>Agregar sensor</h4>
                                    <form
                                        className="grid-2"
                                        onSubmit={e => {
                                            e.preventDefault();
                                            addSensor(p.id);
                                        }}
                                    >
                                        <label>
                                            Tipo
                                            <select
                                                value={sensorDraft.type}
                                                onChange={e => setSensorDraft({ ...sensorDraft, type: e.target.value as SensorType })}
                                            >
                                                <option value="humidity">Humedad</option>
                                                <option value="ph">pH</option>
                                                <option value="temp">Temperatura</option>
                                                <option value="lux">Luminosidad</option>
                                            </select>
                                        </label>

                                        <label>
                                            Modo
                                            <select
                                                value={sensorDraft.scheduleMode}
                                                onChange={e =>
                                                    setSensorDraft({ ...sensorDraft, scheduleMode: e.target.value as ScheduleMode })
                                                }
                                            >
                                                <option value="predefinida">Predefinida</option>
                                                <option value="horario">Horario</option>
                                                <option value="rango">Rango</option>
                                            </select>
                                        </label>

                                        <label>
                                            Umbral mín.
                                            <input
                                                type="number"
                                                step="any"
                                                value={sensorDraft.thresholdMin ?? ""}
                                                onChange={e =>
                                                    setSensorDraft({
                                                        ...sensorDraft,
                                                        thresholdMin: e.target.value === "" ? undefined : Number(e.target.value)
                                                    })
                                                }
                                            />
                                        </label>

                                        <label>
                                            Umbral máx.
                                            <input
                                                type="number"
                                                step="any"
                                                value={sensorDraft.thresholdMax ?? ""}
                                                onChange={e =>
                                                    setSensorDraft({
                                                        ...sensorDraft,
                                                        thresholdMax: e.target.value === "" ? undefined : Number(e.target.value)
                                                    })
                                                }
                                            />
                                        </label>

                                        {sensorDraft.scheduleMode === "predefinida" && (
                                            <label>
                                                Cada N horas
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={sensorDraft.everyHours ?? 2}
                                                    onChange={e => setSensorDraft({ ...sensorDraft, everyHours: Number(e.target.value) })}
                                                />
                                            </label>
                                        )}

                                        {sensorDraft.scheduleMode === "horario" && (
                                            <label className="col-span-2">
                                                Horas fijas (coma-separadas)
                                                <input
                                                    type="text"
                                                    value={sensorDraft.fixedTimes ?? ""}
                                                    onChange={e => setSensorDraft({ ...sensorDraft, fixedTimes: e.target.value })}
                                                    placeholder="07:30, 11:00, 20:15"
                                                />
                                            </label>
                                        )}

                                        {sensorDraft.scheduleMode === "rango" && (
                                            <>
                                                <label>
                                                    Inicio
                                                    <input
                                                        type="time"
                                                        value={sensorDraft.rangeStart ?? ""}
                                                        onChange={e => setSensorDraft({ ...sensorDraft, rangeStart: e.target.value })}
                                                    />
                                                </label>
                                                <label>
                                                    Fin
                                                    <input
                                                        type="time"
                                                        value={sensorDraft.rangeEnd ?? ""}
                                                        onChange={e => setSensorDraft({ ...sensorDraft, rangeEnd: e.target.value })}
                                                    />
                                                </label>
                                                <label>
                                                    Lecturas
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={sensorDraft.rangeCount ?? 3}
                                                        onChange={e => setSensorDraft({ ...sensorDraft, rangeCount: Number(e.target.value) })}
                                                    />
                                                </label>
                                            </>
                                        )}

                                        <div className="actions-row col-span-2">
                                            <button type="submit">Agregar sensor</button>
                                            <button type="button" className="btn-secondary" onClick={() => setSensorDraft({ ...blankSensor, id: crypto.randomUUID() })}>
                                                Limpiar
                                            </button>
                                        </div>
                                    </form>

                                    <div className="actions-row">
                                        <button onClick={() => savePlantBasics(p.id)}>Guardar cambios</button>
                                        <button className="btn-secondary" onClick={cancelEdit}>Cancelar</button>
                                    </div>
                                </>
                            )}
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
