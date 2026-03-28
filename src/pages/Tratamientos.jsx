import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Tratamientos() {
  const [tratamientos, setTratamientos] = useState([])
  const [historico, setHistorico] = useState([])
  const [todosIds, setTodosIds] = useState({}) // ternero_id -> cantidad de tratamientos últimos 30d
  const [tab, setTab] = useState('activos')
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  function parseFecha(str) {
    if (!str) return null
    if (str.includes('-')) {
      const d = new Date(str)
      return isNaN(d) ? null : d
    }
    if (str.includes('/')) {
      const [d, m, y] = str.split('/')
      if (!d || !m || !y) return null
      return new Date(`${y}-${m}-${d}`)
    }
    return null
  }

  function fmtFecha(str) {
    const d = parseFecha(str)
    if (!d) return '—'
    return d.toLocaleDateString('es-AR')
  }

  function diasEnTratamiento(fechaInicio) {
    const inicio = parseFecha(fechaInicio)
    if (!inicio) return 0
    return Math.floor((new Date() - inicio) / 86400000)
  }

  async function cargar() {
    setLoading(true)

    const [{ data: trats }, { data: detalles }, { data: meds }] = await Promise.all([
      supabase.from('tratamientos').select('*, terneros(caravana, corral)').eq('establecimiento', 'tambo_1').order('fecha_fin'),
      supabase.from('tratamiento_detalle').select('*').eq('establecimiento', 'tambo_1'),
      supabase.from('medicamentos').select('*').eq('establecimiento', 'tambo_1'),
    ])

    if (trats) {
      const medsMap = {}
      meds?.forEach(m => { medsMap[m.id] = m })

      const data = trats.map(t => ({
        ...t,
        tratamiento_detalle: (detalles || [])
          .filter(d => d.tratamiento_id === t.id)
          .map(d => ({ ...d, medicamento: medsMap[d.medicamento_id] || null }))
      }))

      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      const hace30 = new Date()
      hace30.setDate(hace30.getDate() - 30)
      hace30.setHours(0, 0, 0, 0)

      // Contar cuántos tratamientos tuvo cada ternero en los últimos 30 días
      const conteo = {}
      data.forEach(t => {
        const inicio = parseFecha(t.fecha_inicio)
        if (inicio && inicio >= hace30) {
          conteo[t.ternero_id] = (conteo[t.ternero_id] || 0) + 1
        }
      })
      setTodosIds(conteo)

      setTratamientos(data.filter(t => {
        const fin = parseFecha(t.fecha_fin)
        return fin && fin >= hoy
      }))

      setHistorico(data.filter(t => {
        const fin = parseFecha(t.fecha_fin)
        return fin && fin < hoy && fin >= hace30
      }).reverse())
    }
    setLoading(false)
  }

  function diasRestantes(fechaFin) {
    const fin = parseFecha(fechaFin)
    if (!fin) return 0
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    return Math.ceil((fin - hoy) / 86400000)
  }

  function medicamentoLabel(t) {
    const det = t.tratamiento_detalle
    if (!det || det.length === 0) return '—'
    return det.map(d => {
      const nombre = d.medicamento?.nombre || '—'
      const dosis = d.dosis ? `${d.dosis} ${d.unidad || ''}`.trim() : ''
      return dosis ? `${nombre} · ${dosis}` : nombre
    }).join(', ')
  }

  function progreso(fechaInicio, fechaFin) {
    const inicio = parseFecha(fechaInicio)
    const fin = parseFecha(fechaFin)
    if (!inicio || !fin) return 0
    const hoy = new Date()
    const total = (fin - inicio) / 86400000
    const transcurrido = (hoy - inicio) / 86400000
    return Math.min(100, Math.max(0, Math.round((transcurrido / total) * 100)))
  }

  if (loading) return <div className="loading">Cargando...</div>

  const lista = tab === 'activos' ? tratamientos : historico

  // Conteo de alertas para mostrar en el header
  const repiten = tratamientos.filter(t => (todosIds[t.ternero_id] || 0) > 1).length
  const largos = tratamientos.filter(t => diasEnTratamiento(t.fecha_inicio) > 7).length

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-left">
          <h2>Tratamientos</h2>
          <p>{tratamientos.length} activo{tratamientos.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Alertas de atención */}
      {(repiten > 0 || largos > 0) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {repiten > 0 && (
            <div style={{
              background: '#fff8f0', border: '1px solid var(--naranja)',
              borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ fontSize: 18 }}>🔁</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--naranja)' }}>
                  {repiten} animal{repiten !== 1 ? 'es' : ''} con tratamiento repetido
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Recibieron más de un tratamiento en los últimos 30 días</div>
              </div>
            </div>
          )}
          {largos > 0 && (
            <div style={{
              background: '#fff0f0', border: '1px solid var(--rojo)',
              borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ fontSize: 18 }}>⏰</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--rojo)' }}>
                  {largos} animal{largos !== 1 ? 'es' : ''} con tratamiento prolongado
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Llevan más de 7 días en tratamiento</div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="filter-tabs">
        <div className={`filter-tab${tab === 'activos' ? ' active' : ''}`} onClick={() => setTab('activos')}>
          💊 Activos ({tratamientos.length})
        </div>
        <div className={`filter-tab${tab === 'historico' ? ' active' : ''}`} onClick={() => setTab('historico')}>
          📋 Últimos 30 días ({historico.length})
        </div>
      </div>

      <div className="card">
        {lista.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">💊</div>
            {tab === 'activos' ? 'Sin tratamientos activos' : 'Sin tratamientos en los últimos 30 días'}
          </div>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Caravana</th>
                <th>Corral</th>
                <th>Medicamento · Dosis</th>
                <th>Días</th>
                <th>Inicio</th>
                <th>Fin</th>
                {tab === 'activos' ? <th>Progreso</th> : <th>Estado</th>}
                <th>Atención</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(t => {
                const dr = diasRestantes(t.fecha_fin)
                const pct = tab === 'activos' ? progreso(t.fecha_inicio, t.fecha_fin) : 100
                const med = medicamentoLabel(t)
                const repite = (todosIds[t.ternero_id] || 0) > 1
                const largo = diasEnTratamiento(t.fecha_inicio) > 7
                return (
                  <tr key={t.id} style={{ background: repite || largo ? '#fffbf5' : undefined }}>
                    <td><strong>{t.terneros?.caravana || '—'}</strong></td>
                    <td>Corral {t.terneros?.corral || '—'}</td>
                    <td><span style={{ fontWeight: 600 }}>{med}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="chip c">{t.dias || '—'}d</span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{fmtFecha(t.fecha_inicio)}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{fmtFecha(t.fecha_fin)}</td>
                    {tab === 'activos' ? (
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="prog-bar" style={{ width: 70, flexShrink: 0 }}>
                            <div className="prog-fill" style={{
                              width: `${pct}%`,
                              background: dr <= 1 ? 'var(--rojo)' : dr <= 3 ? 'var(--naranja)' : 'var(--celeste)'
                            }} />
                          </div>
                          <span className={`chip ${dr <= 1 ? 'r' : dr <= 3 ? 'n' : 'c'}`} style={{ whiteSpace: 'nowrap' }}>
                            {dr}d
                          </span>
                        </div>
                      </td>
                    ) : (
                      <td><span className="chip g">Finalizado</span></td>
                    )}
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {repite && <span title="Tratamiento repetido en 30 días" style={{ fontSize: 16, cursor: 'default' }}>🔁</span>}
                        {largo && <span title={`${diasEnTratamiento(t.fecha_inicio)} días en tratamiento`} style={{ fontSize: 16, cursor: 'default' }}>⏰</span>}
                        {!repite && !largo && <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
