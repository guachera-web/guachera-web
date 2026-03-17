import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Recria() {
  const [animales, setAnimales] = useState([])
  const [loading, setLoading] = useState(true)
  const mesActual = new Date().toISOString().substring(0, 7)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('terneros').select('*')
      .eq('establecimiento', 'tambo_1')
      .not('fecha_recria', 'is', null)
      .order('fecha_recria', { ascending: false })
    if (data) setAnimales(data)
    setLoading(false)
  }

  function diasEnGuachera(fn, fr) {
    if (!fn || !fr) return '—'
    return Math.floor((new Date(fr) - new Date(fn)) / 86400000)
  }

  const esteMes = animales.filter(a => a.fecha_recria?.startsWith(mesActual))
  const promDias = esteMes.length > 0
    ? Math.round(esteMes.reduce((sum, a) => sum + (diasEnGuachera(a.fecha_nacimiento, a.fecha_recria) || 0), 0) / esteMes.length)
    : 0

  if (loading) return <div className="loading">Cargando...</div>

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-left">
          <h2>Recría</h2>
          <p>{esteMes.length} animales este mes · {animales.length} en total</p>
        </div>
      </div>

      <div className="stats-grid stats-3">
        <div className="stat-card v"><div className="stat-lbl">Este mes</div><div className="stat-val">{esteMes.length}</div><div className="stat-sub">altas a recría</div></div>
        <div className="stat-card c"><div className="stat-lbl">Prom. días guachera</div><div className="stat-val">{promDias}</div><div className="stat-sub">días hasta recría</div></div>
        <div className="stat-card"><div className="stat-lbl">Total histórico</div><div className="stat-val">{animales.length}</div><div className="stat-sub">animales a recría</div></div>
      </div>

      <div className="card">
        {animales.length === 0 ? (
          <div className="empty"><div className="empty-icon">🌾</div>Sin animales en recría aún</div>
        ) : (
          <table className="tabla">
            <thead>
              <tr><th>Caravana</th><th>Corral</th><th>Nacimiento</th><th>Alta recría</th><th>Días en guachera</th></tr>
            </thead>
            <tbody>
              {animales.map(a => (
                <tr key={a.id}>
                  <td><strong>{a.caravana}</strong></td>
                  <td>Corral {a.corral}</td>
                  <td>{a.fecha_nacimiento?.substring(0, 10) || '—'}</td>
                  <td>{a.fecha_recria?.substring(0, 10) || '—'}</td>
                  <td><span className="chip v">{diasEnGuachera(a.fecha_nacimiento, a.fecha_recria)} días</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
