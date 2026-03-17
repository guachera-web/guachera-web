import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Animales() {
  const [animales, setAnimales] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('terneros').select('*')
      .eq('establecimiento', 'tambo_1')
      .order('corral')
    if (data) setAnimales(data)
    setLoading(false)
  }

  const activos = animales.filter(t => !t.fecha_baja && !t.fecha_recria)
  const filtrados = activos.filter(t => {
    const matchFiltro = filtro === 'todos' || t.estado?.toLowerCase().includes(filtro)
    const matchBusqueda = t.caravana?.toLowerCase().includes(busqueda.toLowerCase())
    return matchFiltro && matchBusqueda
  })

  function chipClass(estado) {
    const map = { 'SANO': 'v', 'ALERTA': 'n', 'CRÍTICO': 'r', 'EN TRATAMIENTO': 'c' }
    return map[estado] || 'g'
  }

  function diasDeVida(fn) {
    if (!fn) return '—'
    return Math.floor((new Date() - new Date(fn)) / 86400000)
  }

  if (loading) return <div className="loading">Cargando...</div>

  const conteos = {
    todos: activos.length,
    crítico: activos.filter(t => t.estado === 'CRÍTICO').length,
    alerta: activos.filter(t => t.estado === 'ALERTA').length,
    tratamiento: activos.filter(t => t.estado === 'EN TRATAMIENTO').length,
    sano: activos.filter(t => t.estado === 'SANO').length,
  }

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-left">
          <h2>Animales</h2>
          <p>{activos.length} activos en guachera</p>
        </div>
        <div className="topbar-right">
          <input className="search-bar" placeholder="🔍 Buscar por caravana..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      <div className="filter-tabs">
        {[
          { key: 'todos', label: `Todos (${conteos.todos})` },
          { key: 'crítico', label: `🔴 Crítico (${conteos['crítico']})` },
          { key: 'alerta', label: `⚠️ Alerta (${conteos.alerta})` },
          { key: 'tratamiento', label: `💊 En trat. (${conteos.tratamiento})` },
          { key: 'sano', label: `✓ Sanos (${conteos.sano})` },
        ].map(f => (
          <div key={f.key} className={`filter-tab${filtro === f.key ? ' active' : ''}`} onClick={() => setFiltro(f.key)}>{f.label}</div>
        ))}
      </div>

      <div className="card">
        {filtrados.length === 0 ? (
          <div className="empty"><div className="empty-icon">🐄</div>Sin animales con ese filtro</div>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Caravana</th><th>Corral</th><th>Días de vida</th><th>Estado</th><th>Fecha nacimiento</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(a => (
                <tr key={a.id}>
                  <td><strong>{a.caravana}</strong></td>
                  <td>Corral {a.corral}</td>
                  <td>{diasDeVida(a.fecha_nacimiento)}</td>
                  <td><span className={`chip ${chipClass(a.estado)}`}>{a.estado}</span></td>
                  <td>{a.fecha_nacimiento?.substring(0, 10) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
