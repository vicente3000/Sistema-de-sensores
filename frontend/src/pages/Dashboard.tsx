import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type Alert = { id: string; plant: string; level: 'ok'|'warn'|'crit'; message: string; at: string }
type Point = { t: string; temp: number; humidity: number }

export default function Dashboard() {
    // Mock KPIs
    const [kpis] = useState([
        { title: 'Plantas', value: 42 },
        { title: 'Sensores online', value: 97 },
        { title: 'Alertas 24h', value: 12 },
        { title: 'Críticas', value: 2 },
    ])

    // Mock serie
    const data: Point[] = useMemo(() => {
        // genera 24 puntos
        const arr: Point[] = []
        for (let i = 0; i < 24; i++) {
            arr.push({
                t: `${String(i).padStart(2,'0')}:00`,
                temp: 18 + Math.sin(i/3)*3 + (Math.random()*0.6-0.3),
                humidity: 40 + Math.cos(i/4)*10 + (Math.random()*2-1),
            })
        }
        return arr
    }, [])

    // Mock alertas
    const [alerts] = useState<Alert[]>([
        { id: 'a1', plant: 'Tomate #12', level: 'crit', message: 'Humedad < 15%', at: '12:41' },
        { id: 'a2', plant: 'Lechuga #05', level: 'warn', message: 'pH fuera de rango', at: '12:11' },
        { id: 'a3', plant: 'Fresa #02', level: 'ok', message: 'Recuperada', at: '11:58' },
    ])

    return (
        <div className="container">
            <Header />

            <div className="card-grid">
                {kpis.map(k => (
                    <div key={k.title} className="card">
                        <h3>{k.title}</h3>
                        <div className="value">{k.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid-2">
                <div className="panel">
                    <h2>Lecturas últimas 24h</h2>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                                <CartesianGrid stroke="#1f2937" />
                                <XAxis dataKey="t" tick={{ fontSize: 12 }} />
                                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                                <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }} />
                                <Line yAxisId="left" type="monotone" dataKey="temp" dot={false} strokeWidth={2} />
                                <Line yAxisId="right" type="monotone" dataKey="humidity" dot={false} strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="panel">
                    <h2>Alertas recientes</h2>
                    <table className="table">
                        <thead>
                        <tr>
                            <th>Hora</th><th>Planta</th><th>Estado</th><th>Mensaje</th>
                        </tr>
                        </thead>
                        <tbody>
                        {alerts.map(a => (
                            <tr key={a.id}>
                                <td>{a.at}</td>
                                <td>{a.plant}</td>
                                <td><span className={`badge ${a.level}`}>{a.level.toUpperCase()}</span></td>
                                <td>{a.message}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function Header() {
    const [filter, setFilter] = useState('')
    return (
        <div className="header">
            <h1>GreenData · Dashboard</h1>
            <div className="right">
                <input className="input" placeholder="Filtrar planta…" value={filter} onChange={e=>setFilter(e.target.value)} />
                <button className="button" onClick={()=>alert('Acción rápida 🙂')}>Acción</button>
            </div>
        </div>
    )
}
