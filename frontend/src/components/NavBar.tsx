import { Link, NavLink } from "react-router-dom";

export default function NavBar() {
    return (
        <header className="navbar">
            <Link to="/" className="brand">🌱 GreenData</Link>
            <nav>
                <NavLink to="/alertas">Alertas</NavLink>
                <NavLink to="/sensores">Datos de sensores</NavLink>
                <NavLink to="/agregar-planta">Agregar planta</NavLink>
            </nav>
        </header>
    );
}
