import { useState } from 'react'
import axios from 'axios'

const API = '/api'

const BARRIOS = [
  'Cuauhtémoc','Benito Juárez','Miguel Hidalgo','Álvaro Obregón',
  'Coyoacán','Tlalpan','Xochimilco','Iztapalapa','Gustavo A. Madero',
  'Azcapotzalco','Cuajimalpa de Morelos','Iztacalco','Tláhuac',
  'Magdalena Contreras','Milpa Alta','Venustiano Carranza'
]

const TIPOS = ['Entire home/apt', 'Private room', 'Shared room', 'Hotel room']

const Field = ({ label, children, hint }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <label style={{ fontSize: 11, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </label>
    {children}
    {hint && <span style={{ fontSize: 10, color: 'var(--border)' }}>{hint}</span>}
  </div>
)

const inputStyle = {
  background: 'var(--muted)', border: '1px solid var(--border)',
  borderRadius: 6, padding: '7px 10px', color: 'var(--fg)',
  fontFamily: 'Fira Sans', fontSize: 13, outline: 'none',
  width: '100%'
}

export default function Predictor() {
  const [form, setForm] = useState({
    neighbourhood: 'Cuauhtémoc',
    room_type: 'Entire home/apt',
    minimum_nights: 1,
    number_of_reviews: 20,
    reviews_per_month: 1.5,
    calculated_host_listings_count: 1,
    availability_365: 180,
    number_of_reviews_ltm: 8,
    latitude: 19.42,
    longitude: -99.13,
    price: 1200,
  })
  // Nota: number_of_reviews, reviews_per_month y availability_365 se usan
  // solo para el modelo de regresion (precio). El modelo de superhost usa
  // price, minimum_nights, calculated_host_listings_count, number_of_reviews_ltm
  // para evitar data leakage (esas 3 variables definen is_superhost).
  const [resultPrecio, setResultPrecio] = useState(null)
  const [resultSH, setResultSH] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const predict = async () => {
    setLoading(true)
    setError(null)
    try {
      const [rp, rs] = await Promise.all([
        axios.post(`${API}/predict/precio`, {
          neighbourhood: form.neighbourhood,
          room_type: form.room_type,
          minimum_nights: +form.minimum_nights,
          number_of_reviews: +form.number_of_reviews,
          reviews_per_month: +form.reviews_per_month,
          calculated_host_listings_count: +form.calculated_host_listings_count,
          availability_365: +form.availability_365,
          number_of_reviews_ltm: +form.number_of_reviews_ltm,
          latitude: +form.latitude,
          longitude: +form.longitude,
        }),
        axios.post(`${API}/predict/superhost`, {
          price: +form.price,
          neighbourhood: form.neighbourhood,
          room_type: form.room_type,
          minimum_nights: +form.minimum_nights,
          calculated_host_listings_count: +form.calculated_host_listings_count,
          number_of_reviews_ltm: +form.number_of_reviews_ltm,
        })
      ])
      setResultPrecio(rp.data)
      setResultSH(rs.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  const ResultBox = ({ title, children, accent }) => (
    <div style={{
      background: 'var(--card)',
      border: `1px solid ${accent ? 'var(--accent)' : 'var(--accent2)'}`,
      borderRadius: 'var(--radius)', padding: 20,
    }}>
      <div style={{ fontSize: 11, color: 'var(--muted-fg)', textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )

  return (
    <div className="fade-in" style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: 'Fira Code', fontSize: 18, color: 'var(--fg)', marginBottom: 4 }}>
          🤖 Predictor ML — Inferencia en vivo
        </h2>
        <p style={{ color: 'var(--muted-fg)', fontSize: 13 }}>
          Ingresa las características de un listado para obtener el precio estimado y si calificaría como Superhost.
          Las predicciones se generan en tiempo real por el backend FastAPI.
        </p>
      </div>

      {/* Formulario */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: 20,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16
      }}>
        <Field label="Barrio (alcaldía)">
          <select value={form.neighbourhood} onChange={e => set('neighbourhood', e.target.value)} style={inputStyle}>
            {BARRIOS.map(b => <option key={b}>{b}</option>)}
          </select>
        </Field>

        <Field label="Tipo de habitación">
          <select value={form.room_type} onChange={e => set('room_type', e.target.value)} style={inputStyle}>
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Precio actual (MXN)" hint="Usado solo para predicción de Superhost">
          <input type="number" value={form.price} onChange={e => set('price', e.target.value)} style={inputStyle} min={0} />
        </Field>

        <Field label="Noches mínimas">
          <input type="number" value={form.minimum_nights} onChange={e => set('minimum_nights', e.target.value)} style={inputStyle} min={1} />
        </Field>

        <Field label="Número de reseñas">
          <input type="number" value={form.number_of_reviews} onChange={e => set('number_of_reviews', e.target.value)} style={inputStyle} min={0} />
        </Field>

        <Field label="Reseñas por mes">
          <input type="number" value={form.reviews_per_month} onChange={e => set('reviews_per_month', e.target.value)} style={inputStyle} min={0} step={0.1} />
        </Field>

        <Field label="Propiedades del host">
          <input type="number" value={form.calculated_host_listings_count} onChange={e => set('calculated_host_listings_count', e.target.value)} style={inputStyle} min={1} />
        </Field>

        <Field label="Disponibilidad (días/año)">
          <input type="number" value={form.availability_365} onChange={e => set('availability_365', e.target.value)} style={inputStyle} min={0} max={365} />
        </Field>

        <Field label="Reseñas últimos 12 meses">
          <input type="number" value={form.number_of_reviews_ltm} onChange={e => set('number_of_reviews_ltm', e.target.value)} style={inputStyle} min={0} />
        </Field>

        <Field label="Latitud" hint="CDMX: ~19.42">
          <input type="number" value={form.latitude} onChange={e => set('latitude', e.target.value)} style={inputStyle} step={0.001} />
        </Field>

        <Field label="Longitud" hint="CDMX: ~-99.13">
          <input type="number" value={form.longitude} onChange={e => set('longitude', e.target.value)} style={inputStyle} step={0.001} />
        </Field>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button onClick={predict} disabled={loading} style={{
            width: '100%', padding: '10px 0',
            background: loading ? 'var(--border)' : 'var(--accent2)',
            color: '#fff', border: 'none', borderRadius: 7,
            fontFamily: 'Fira Code', fontWeight: 600, fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'var(--transition)',
          }}>
            {loading ? 'Calculando...' : '⚡ Predecir'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#1a0a0a', border: '1px solid var(--destructive)',
          borderRadius: 8, padding: 14, color: 'var(--destructive)', fontSize: 13
        }}>
          ⚠️ {error} — ¿Está el backend corriendo en localhost:8000?
        </div>
      )}

      {/* Resultados */}
      {(resultPrecio || resultSH) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="fade-in">
          {resultPrecio && (
            <ResultBox title="Predicción de Precio (Regresión)">
              <div style={{ fontFamily: 'Fira Code', fontSize: 38, fontWeight: 700, color: 'var(--accent2)' }}>
                ${resultPrecio.precio_predicho_mxn.toLocaleString()}
                <span style={{ fontSize: 16, color: 'var(--muted-fg)', marginLeft: 8 }}>MXN/noche</span>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>
                  Modelo: <strong style={{ color: 'var(--fg)' }}>{resultPrecio.modelo}</strong>
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>
                  R² test: <strong style={{ color: 'var(--fg)' }}>{resultPrecio.r2_test}</strong>
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>
                  RMSE: <strong style={{ color: 'var(--fg)' }}>${resultPrecio.rmse_test.toLocaleString()}</strong>
                </span>
              </div>
            </ResultBox>
          )}

          {resultSH && (
            <ResultBox title="Predicción Superhost (Clasificación)" accent={resultSH.es_superhost}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 40 }}>{resultSH.es_superhost ? '⭐' : '👤'}</span>
                <div>
                  <div style={{
                    fontFamily: 'Fira Code', fontSize: 24, fontWeight: 700,
                    color: resultSH.es_superhost ? 'var(--accent)' : 'var(--muted-fg)'
                  }}>
                    {resultSH.es_superhost ? 'SUPERHOST' : 'No Superhost'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginTop: 4 }}>
                    Probabilidad: <strong style={{ color: 'var(--fg)', fontFamily: 'Fira Code' }}>
                      {(resultSH.probabilidad * 100).toFixed(1)}%
                    </strong>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>
                  Modelo: <strong style={{ color: 'var(--fg)' }}>{resultSH.modelo}</strong>
                </span>
              </div>
              {/* Barra de probabilidad */}
              <div style={{ marginTop: 12, background: 'var(--muted)', borderRadius: 4, height: 6 }}>
                <div style={{
                  width: `${resultSH.probabilidad * 100}%`,
                  height: '100%',
                  background: resultSH.es_superhost ? 'var(--accent)' : 'var(--accent2)',
                  borderRadius: 4,
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </ResultBox>
          )}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--muted-fg)', padding: '4px 0' }}>
        ⚠️ Limitación: el precio tiene distribución asimétrica (skewed right), por lo que el modelo puede
        subestimar propiedades de lujo. El R² refleja rendimiento promedio en el rango típico $500–$3,000 MXN.
      </div>
    </div>
  )
}
