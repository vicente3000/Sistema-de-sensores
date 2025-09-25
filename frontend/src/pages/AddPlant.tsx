import { useState } from "react";

export default function AddPlant() {
    const [name, setName] = useState("");
    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert(`(Demo) Planta creada: ${name}`);
        setName("");
    };

    return (
        <section>
            <h1>Agregar planta</h1>
            <form onSubmit={onSubmit} className="form">
                <label>
                    Nombre de la planta
                    <input value={name} onChange={e => setName(e.target.value)} required />
                </label>
                <button type="submit">Crear</button>
            </form>
        </section>
    );
}
