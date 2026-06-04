import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Predictor from './pages/Predictor'

const NAV = [
  { id: 'dashboard', label: '📊 Dashboard OLAP' },
  { id: 'predictor', label: '🤖 Predictor ML' },
]

export default function App() {
  const [active, setActive] = useState('dashboard')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        height: 'var(--header-h)',
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 24,
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--accent)',
            animation: 'pulse-dot 2s infinite'
          }} />
          <span style={{ fontFamily: 'Fira Code', fontWeight: 700, fontSize: 15, color: 'var(--fg)' }}>
            airbnb<span style={{ color: 'var(--accent)' }}>_cdmx</span>.dm
          </span>
        </div>

        <nav style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setActive(n.id)} style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Fira Sans',
              fontSize: 13,
              fontWeight: active === n.id ? 600 : 400,
              background: active === n.id ? 'var(--accent2)' : 'transparent',
              color: active === n.id ? '#fff' : 'var(--muted-fg)',
              transition: 'var(--transition)',
            }}>
              {n.label}
            </button>
          ))}
        </nav>

        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted-fg)', fontFamily: 'Fira Code' }}>
          Inside Airbnb · CDMX · Sep 2025 · 27k listados
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, padding: '20px 24px' }}>
        {active === 'dashboard' ? <Dashboard /> : <Predictor />}
      </main>
    </div>
  )
}
