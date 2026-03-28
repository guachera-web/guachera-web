import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Tratamientos() {
  const [tratamientos, setTratamientos] = useState([])
  const [historico, setHistorico] = useState([])
  const [tab, setTab] = useState('activos')
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  // Soporta YYYY-MM-DD y DD/MM/YYYY
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

  async function cargar() {
    setLoading(true)

    const { data } = await supabase
      .from('tratamientos')
      .select(`
        *,
        terneros(caravana, corral),
        tratamiento_detalle(dosis, unidad, medicamento_id, medicamentos(nombre))
      `)
      .eq('establecimiento', 'tambo_1')
      .order('fecha_fin')

    if (data) {
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      const hace30 = new Date()
      hace30.setDate(hace30.getDate() - 30)
      hace30.setHours(0, 0, 0, 0)

      const activos = data.filter(t => {
        const fin = parseFecha(t.fecha_fin)
        return fin && fin >= hoy
      })

      const hist = data.filter(t => {
        const fin = parseFecha(t.fecha_fin)
        return fin && fin < hoy && fin >= hace30
      }).reverse()

      setTratamientos(activos)
      setHistorico(hist)
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
      const nombre = d.medicamentos?.nombre || '—'
      const dosis = d.dosis ? `${d.dosis} ${d.unidad || ''}`.trim() : ''
      return dosis ? `${nombre} ${dosis}` : nombre
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

  function fmtFecha(str) {
    const d = parseFecha(str)
    if (!d) return '—'
    return d.toLocaleDateString('es-AR')
  }

  if (loading) return <div className="loading">Cargando...</div>

  const lista = tab === 'activos' ? tratamientos : historico

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-left">
          <h2>Tratamientos</h2>
          <p>{tratamientos.length} activo{tratamientos.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

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
              </tr>
            </thead>
            <tbody>
              {lista.map(t => {
                const dr = diasRestantes(t.fecha_fin)
                const pct = tab === 'activos' ? progreso(t.fecha_inicio, t.fecha_fin) : 100
                const med = medicamentoLabel(t)
                return (
                  <tr key={t.id}>
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
