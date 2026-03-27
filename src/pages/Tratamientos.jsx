import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Tratamientos() {
  const [tratamientos, setTratamientos] = useState([])
  const [historico, setHistorico] = useState([])
  const [tab, setTab] = useState('activos')
  const [loading, setLoading] = useState(true)
  const hoy = new Date().toISOString().split('T')[0]

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)

    // Activos
    const { data: activos } = await supabase
      .from('tratamientos')
      .select(`
        *,
        terneros(caravana, corral),
        tratamiento_detalle(dosis, unidad, medicamento_id, medicamentos(nombre))
      `)
      .eq('establecimiento', 'tambo_1')
      .gte('fecha_fin', hoy)
      .order('fecha_fin')

    // Histórico (últimos 30 días)
    const hace30 = new Date()
    hace30.setDate(hace30.getDate() - 30)
    const hace30str = hace30.toISOString().split('T')[0]

    const { data: hist } = await supabase
      .from('tratamientos')
      .select(`
        *,
        terneros(caravana, corral),
        tratamiento_detalle(dosis, unidad, medicamento_id, medicamentos(nombre))
      `)
      .eq('establecimiento', 'tambo_1')
      .lt('fecha_fin', hoy)
      .gte('fecha_fin', hace30str)
      .order('fecha_fin', { ascending: false })

    if (activos) setTratamientos(activos)
    if (hist) setHistorico(hist)
    setLoading(false)
  }

  function diasRestantes(fechaFin) {
    return Math.ceil((new Date(fechaFin) - new Date()) / 86400000)
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
    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    const hoyD = new Date()
    const total = (fin - inicio) / 86400000
    const transcurrido = (hoyD - inicio) / 86400000
    return Math.min(100, Math.max(0, Math.round((transcurrido / total) * 100)))
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
                    <td>
                      <span style={{ fontWeight: 600 }}>{med}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="chip c">{t.dias || '—'}d</span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>
                      {t.fecha_inicio?.substring(0, 10) || '—'}
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>
                      {t.fecha_fin?.substring(0, 10) || '—'}
                    </td>
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
                      <td>
                        <span className="chip g">Finalizado</span>
                      </td>
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
