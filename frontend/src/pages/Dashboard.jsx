import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts'
import KpiCard from '../components/KpiCard'

const API = '/api'

const COLORS = ['#3B82F6','#22C55E','#D97706','#EF4444','#8B5CF6','#06B6D4']

const Card = ({ title, children, style = {} }) => (
  <div style={{
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: 'var(--card-pad)',
    ...style
  }}>
    {title && (
      <h3 style={{
        fontFamily: 'Fira Code', fontSize: 13, fontWeight: 600,
        color: 'var(--muted-fg)', marginBottom: 14,
        textTransform: 'uppercase', letterSpacing: '0.06em'
      }}>
        {title}
      </h3>
    )}
    {children}
  </div>
)

const Loader = () => (
  <div style={{ color: 'var(--muted-fg)', fontSize: 13, padding: 24, textAlign: 'center' }}>
    Cargando datos del warehouse...
  </div>
)

export default function Dashboard() {
  const [kpis, setKpis] = useState(null)
  const [barrios, setBarrios] = useState([])
  const [tipos, setTipos] = useState([])
  const [superhosts, setSuperhosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      axios.get(`${API}/olap/kpis`),
      axios.get(`${API}/olap/precio-por-barrio?limit=12`),
      axios.get(`${API}/olap/listados-por-tipo`),
      axios.get(`${API}/olap/superhosts-por-barrio?limit=10`),
    ])
      .then(([k, b, t, s]) => {
        setKpis(k.data)
        setBarrios(b.data)
        setTipos(t.data)
        setSuperhosts(s.data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />
  if (error) return (
    <div style={{
      background: '#1a0a0a', border: '1px solid var(--destructive)',
      borderRadius: 'var(--radius)', padding: 20, color: 'var(--destructive)'
    }}>
      ⚠️ Error conectando con el backend: {error}<br />
      <span style={{ color: 'var(--muted-fg)', fontSize: 12 }}>
        Asegúrate de que el backend está corriendo: <code>uvicorn main:app --reload</code>
      </span>
    </div>
  )

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KpiCard label="Total listados" value={kpis?.total_listados?.toLocaleString()} accent />
        <KpiCard label="Precio mediano" value={`$${kpis?.precio_mediano_global?.toLocaleString()}`} sub="MXN / noche" />
        <KpiCard label="Precio promedio" value={`$${kpis?.precio_promedio_global?.toLocaleString()}`} sub="MXN / noche" />
        <KpiCard label="% Superhosts" value={`${kpis?.pct_superhosts}%`} sub="del total" />
        <KpiCard label="Barrios" value={kpis?.total_barrios} />
        <KpiCard label="Disponibilidad" value={`${kpis?.disponibilidad_promedio}d`} sub="promedio / año" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Precio por barrio */}
        <Card title="Precio mediano por barrio (Top 12)">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={barrios} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fill: 'var(--muted-fg)', fontSize: 11 }}
                tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="barrio_nombre" width={130}
                tick={{ fill: 'var(--muted-fg)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--fg)', fontFamily: 'Fira Code' }}
                formatter={(v) => [`$${v.toLocaleString()} MXN`, 'Precio mediano']}
              />
              <Bar dataKey="precio_mediano" radius={[0, 4, 4, 0]}>
                {barrios.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Superhosts por barrio */}
        <Card title="% Superhosts por barrio (Top 10)">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={superhosts} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fill: 'var(--muted-fg)', fontSize: 11 }}
                tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="barrio_nombre" width={130}
                tick={{ fill: 'var(--muted-fg)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--fg)', fontFamily: 'Fira Code' }}
                formatter={(v) => [`${v}%`, '% Superhost']}
              />
              <Bar dataKey="pct_superhost" fill="#22C55E" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Tipos de habitacion */}
      <Card title="Distribucion por tipo de habitacion">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {tipos.map((t, i) => (
            <div key={t.tipo_nombre} style={{
              flex: '1 1 200px',
              background: 'var(--muted)', borderRadius: 8,
              padding: '14px 16px',
              borderLeft: `3px solid ${COLORS[i % COLORS.length]}`
            }}>
              <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginBottom: 6 }}>
                {t.tipo_nombre}
              </div>
              <div style={{ fontFamily: 'Fira Code', fontSize: 20, fontWeight: 700, color: COLORS[i % COLORS.length] }}>
                {t.total_listados.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>
                Mediana: <strong style={{ color: 'var(--fg)' }}>${t.precio_mediano.toLocaleString()}</strong> MXN
                &nbsp;·&nbsp; Reseñas/mes: <strong style={{ color: 'var(--fg)' }}>{t.resenas_por_mes_prom}</strong>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ fontSize: 11, color: 'var(--muted-fg)', textAlign: 'right' }}>
        Datos consultados en tiempo real desde DuckDB warehouse · Airbnb CDMX Sep 2025
      </div>
    </div>
  )
}
