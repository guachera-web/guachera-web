import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Animal() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [animal, setAnimal] = useState(null)
  const [seguimientos, setSeguimientos] = useState([])
  const [tratamientos, setTratamientos] = useState([])
  const [medicamentos, setMedicamentos] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [id])

  async function cargar() {
    setLoading(true)

    const [{ data: ani }, { data: seg }, { data: trats }, { data: meds }] = await Promise.all([
      supabase.from('terneros').select('*').eq('id', id).single(),
      supabase.from('seguimiento_diario').select('*').eq('ternero_id', id).order('fecha', { ascending: false }),
      supabase.from('tratamientos').select('*').eq('ternero_id', id).order('fecha_inicio', { ascending: false }),
      supabase.from('medicamentos').select('*').eq('establecimiento', 'tambo_1'),
    ])

    if (ani) setAnimal(ani)
    if (seg) setSeguimientos(seg)

    if (trats && meds) {
      const medsMap = {}
      meds.forEach(m => { medsMap[m.id] = m })

      const { data: detalles } = await supabase
        .from('tratamiento_detalle')
        .select('*')
        .in('tratamiento_id', trats.map(t => t.id))

      const tratsConDetalle = trats.map(t => ({
        ...t,
        detalles: (detalles || [])
          .filter(d => d.tratamiento_id === t.id)
          .map(d => ({ ...d, medicamento: medsMap[d.medicamento_id] }))
      }))

      setTratamientos(tratsConDetalle)
      setMedicamentos(medsMap)
    }

    setLoading(false)
  }

  function diasDeVida(fn) {
    if (!fn) return '—'
    return Math.floor((new Date() - new Date(fn)) / 86400000)
  }

  function chipClass(estado) {
    const map = { 'SANO': 'v', 'ALERTA': 'n', 'CRÍTICO': 'r', 'EN TRATAMIENTO': 'c' }
    return map[estado] || 'g'
  }

  function fmtFecha(str) {
    if (!str) return '—'
    if (str.includes('-')) return new Date(str).toLocaleDateString('es-AR')
    return str
  }

  function iconoSintoma(valor) {
    if (!valor || valor === 'NORMAL' || valor === 'NO' || valor === '0') return null
    return '⚠️'
  }

  if (loading) return <div className="loading">Cargando...</div>
  if (!animal) return <div className="page"><div className="empty"><div className="empty-icon">🐄</div>Animal no encontrado</div></div>

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-left">
          <button onClick={() => navigate(-1)} className="btn"
            style={{ background: 'none', border: '1px solid var(--border)', marginRight: 12 }}>
            ← Volver
          </button>
          <div>
            <h2>Caravana {animal.caravana}</h2>
            <p>Corral {animal.corral} · {diasDeVida(animal.fecha_nacimiento)} días de vida</p>
          </div>
        </div>
        <div className="topbar-right">
          <span className={`chip ${chipClass(animal.estado)}`} style={{ fontSize: 14, padding: '6px 14px' }}>
            {animal.estado}
          </span>
        </div>
      </div>

      {/* Datos generales */}
      <div className="stats-grid stats-3" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-lbl">📅 Nacimiento</div>
          <div className="stat-val" style={{ fontSize: 20 }}>{fmtFecha(animal.fecha_nacimiento)}</div>
          <div className="stat-sub">{diasDeVida(animal.fecha_nacimiento)} días de vida</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">🏠 Corral</div>
          <div className="stat-val" style={{ fontSize: 20 }}>{animal.corral}</div>
          <div className="stat-sub">ubicación actual</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">💊 Tratamientos</div>
          <div className="stat-val" style={{ fontSize: 20 }}>{tratamientos.length}</div>
          <div className="stat-sub">en total</div>
        </div>
      </div>

      {/* Baja o recría */}
      {(animal.fecha_baja || animal.fecha_recria) && (
        <div className="card" style={{ marginBottom: 16, borderLeft: `4px solid ${animal.fecha_baja ? 'var(--rojo)' : 'var(--verde)'}` }}>
          <div style={{ padding: '12px 16px' }}>
            {animal.fecha_baja && (
              <p><strong>💀 Baja:</strong> {fmtFecha(animal.fecha_baja)} — {animal.motivo_baja || 'Sin motivo registrado'}</p>
            )}
            {animal.fecha_recria && (
              <p><strong>🌾 Alta a recría:</strong> {fmtFecha(animal.fecha_recria)}</p>
            )}
          </div>
        </div>
      )}

      <div className="two-col">
        {/* Seguimiento diario */}
        <div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">📋 Seguimiento diario ({seguimientos.length} registros)</span>
            </div>
            {seguimientos.length === 0 ? (
              <div className="empty"><div className="empty-icon">📋</div>Sin registros de seguimiento</div>
            ) : seguimientos.map(s => (
              <div key={s.id} style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                background: s.estado === 'CRÍTICO' ? '#fff5f5' : s.estado === 'ALERTA' ? '#fffbf0' : undefined
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: 14 }}>{fmtFecha(s.fecha)}</strong>
                  {s.estado && <span className={`chip ${chipClass(s.estado)}`}>{s.estado}</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6, fontSize: 13 }}>
                  {s.temperatura && (
                    <div style={{ color: s.temperatura > 39.5 ? 'var(--rojo)' : 'var(--text)' }}>
                      🌡️ Temp: <strong>{s.temperatura}°C</strong>
                    </div>
                  )}
                  {s.mat_fecal && s.mat_fecal !== 'NORMAL' && (
                    <div>⚠️ Mat. fecal: <strong>{s.mat_fecal}</strong></div>
                  )}
                  {s.respiratorio && s.respiratorio !== 'NORMAL' && (
                    <div>⚠️ Resp.: <strong>{s.respiratorio}</strong></div>
                  )}
                  {s.ombligo && s.ombligo !== 'NORMAL' && (
                    <div>⚠️ Ombligo: <strong>{s.ombligo}</strong></div>
                  )}
                  {s.calostrado && <div>🍼 Calostrado: <strong>{s.calostrado}</strong></div>}
                  {s.toma_sustituto && <div>🥛 Sustituto: <strong>{s.toma_sustituto}</strong></div>}
                  {s.atb > 0 && <div>💊 ATB: <strong>{s.atb}</strong></div>}
                  {s.suero > 0 && <div>💉 Suero: <strong>{s.suero}</strong></div>}
                </div>
                {s.observaciones && (
                  <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                    📝 {s.observaciones}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tratamientos */}
        <div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">💊 Historial de tratamientos</span>
            </div>
            {tratamientos.length === 0 ? (
              <div className="empty"><div className="empty-icon">💊</div>Sin tratamientos registrados</div>
            ) : tratamientos.map(t => {
              const hoy = new Date()
              hoy.setHours(0, 0, 0, 0)
              const fin = t.fecha_fin ? new Date(t.fecha_fin) : null
              const activo = fin && fin >= hoy
              return (
                <div key={t.id} style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  borderLeft: `3px solid ${activo ? 'var(--celeste)' : 'var(--border)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {fmtFecha(t.fecha_inicio)} → {fmtFecha(t.fecha_fin)}
                    </span>
                    <span className={`chip ${activo ? 'c' : 'g'}`}>{activo ? 'Activo' : 'Finalizado'}</span>
                  </div>
                  {t.detalles?.length > 0 ? t.detalles.map((d, i) => (
                    <div key={i} style={{ fontSize: 14, fontWeight: 600 }}>
                      {d.medicamento?.nombre || '—'} · {d.dosis} {d.unidad}
                    </div>
                  )) : (
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>Sin detalle de medicamento</div>
                  )}
                  {t.dias && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{t.dias} días de tratamiento</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
