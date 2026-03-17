import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Corrales() {
  const [corrales, setCorrales] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('terneros').select('*').eq('establecimiento', 'tambo_1')
    if (data) {
      const activos = data.filter(t => !t.fecha_baja && !t.fecha_recria)
      const map = {}
      activos.forEach(t => {
        if (!map[t.corral]) map[t.corral] = []
        map[t.corral].push(t)
      })
      setCorrales(map)
    }
    setLoading(false)
  }

  function semaforo(animales) {
    if (animales.some(a => a.estado === 'CRÍTICO')) return 'sem-r'
    if (animales.some(a => a.estado === 'ALERTA' || a.estado === 'EN TRATAMIENTO')) return 'sem-n'
    return 'sem-v'
  }

  function chipClass(estado) {
    const map = { 'SANO': 'v', 'ALERTA': 'n', 'CRÍTICO': 'r', 'EN TRATAMIENTO': 'c' }
    return map[estado] || 'g'
  }

  function diasDeVida(fn) {
    if (!fn) return '—'
    return Math.floor((new Date() - new Date(fn)) / 86400000)
  }

  if (loading) return <div className="loading">Cargando...</div>

  const keys = Object.keys(corrales).sort()

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-left">
          <h2>Corrales</h2>
          <p>{keys.length} corrales · {Object.values(corrales).flat().length} animales activos</p>
        </div>
      </div>
      {keys.length === 0 ? (
        <div className="empty"><div className="empty-icon">🏠</div>Sin corrales aún. Sincronizá la app primero.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {keys.map(corral => {
            const animales = corrales[corral]
            const criticos = animales.filter(a => a.estado === 'CRÍTICO').length
            const alertas = animales.filter(a => a.estado === 'ALERTA').length
            return (
              <div key={corral} className="card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <span className="card-title">
                    <span className={`semaforo ${semaforo(animales)}`}></span>
                    Corral {corral}
                  </span>
                  {criticos > 0 && <span className="alerta-badge ab-r">{criticos} crítico{criticos > 1 ? 's' : ''}</span>}
                  {criticos === 0 && alertas > 0 && <span className="alerta-badge ab-n">{alertas} alerta{alertas > 1 ? 's' : ''}</span>}
                  {criticos === 0 && alertas === 0 && <span className="alerta-badge ab-v">Todo ok</span>}
                </div>
                <table className="tabla">
                  <thead><tr><th>Caravana</th><th>Días</th><th>Estado</th></tr></thead>
                  <tbody>
                    {animales.sort((a, b) => {
                      const order = { 'CRÍTICO': 0, 'ALERTA': 1, 'EN TRATAMIENTO': 2, 'SANO': 3 }
                      return (order[a.estado] ?? 4) - (order[b.estado] ?? 4)
                    }).map(a => (
                      <tr key={a.id}>
                        <td><strong>{a.caravana}</strong></td>
                        <td>{diasDeVida(a.fecha_nacimiento)}</td>
                        <td><span className={`chip ${chipClass(a.estado)}`}>{a.estado}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
