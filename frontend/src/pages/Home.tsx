import { Link } from "react-router-dom";
import "../css/Home.css";


export default function Home() {
    return (
        <section className="home">
            <img
                src="public%20/LogoInicio.jpg"
                alt="GreenData Logo"
                className="home-logo"
            />
            <h1 className="home-title">🌱 Bienvenido a GreenData</h1>
            <p className="home-subtitle">
                Plataforma para monitorear plantas en tiempo real
            </p>
        </section>
    );
}
