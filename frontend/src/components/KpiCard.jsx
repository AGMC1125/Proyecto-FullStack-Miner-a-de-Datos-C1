export default function KpiCard({ label, value, sub, accent = false }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: `1px solid ${accent ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      padding: 'var(--card-pad)',
      display: 'flex', flexDirection: 'column', gap: 4,
      minWidth: 140,
    }}>
      <span style={{ fontSize: 11, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <span style={{
        fontSize: 26, fontFamily: 'Fira Code', fontWeight: 700,
        color: accent ? 'var(--accent)' : 'var(--fg)',
        lineHeight: 1.1
      }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{sub}</span>}
    </div>
  )
}
