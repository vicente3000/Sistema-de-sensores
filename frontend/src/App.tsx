import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import Alerts from "./pages/Alerts";
import SensorData from "./pages/SensorData";
import AddPlant from "./pages/AddPlant";

export default function App() {
    return (
        <>
            <NavBar />
            <main className="container">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/alertas" element={<Alerts />} />
                    <Route path="/sensores" element={<SensorData />} />
                    <Route path="/agregar-planta" element={<AddPlant />} />
                </Routes>
            </main>
        </>
    );
}
