import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import Alerts from "./pages/Alerts";
import SensorData from "./pages/SensorData";
import Plants from "./pages/Plants";

export default function App() {
    return (
        <>
            <NavBar />
            <main className="container">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/alertas" element={<Alerts />} />
                    <Route path="/sensores" element={<SensorData />} />
                    {/* Ruta removida: agregar planta ahora integrado en /plantas */}
                    <Route path="/plantas" element={<Plants />} />
                </Routes>
            </main>
        </>
    );
}
