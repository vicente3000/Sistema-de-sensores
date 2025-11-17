import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

export default function NavBar() {
  const getInitialTheme = (): "light" | "dark" => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? "dark" : "light";
  };

  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        🌱 GreenData
      </Link>
      <div className="right">
        <nav>
          <NavLink to="/alertas">Alertas</NavLink>
          <NavLink to="/sensores">Datos de sensores</NavLink>
          <NavLink to={"/plantas"}>Plantas</NavLink>
        </nav>
        <button
          className="theme-toggle"
          title={theme === "dark" ? "Cambiar a claro" : "Cambiar a oscuro"}
          aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          onClick={toggleTheme}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}
