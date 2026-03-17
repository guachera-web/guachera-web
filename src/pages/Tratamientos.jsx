import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Tratamientos() {
  const [tratamientos, setTratamientos] = useState([])
  const [loading, setLoading] = useState(true)
  const hoy = new Date().toISOString().split('T')[0]

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('tratamientos')
      .select('*, terneros(caravana, corral)')
      .eq('establecimiento', 'tambo_1')
      .gte('fecha_fin', hoy)
      .order('fecha_fin')
    if (data) setTratamientos(data)
    setLoading(false)
  }

  function diasRestantes(fechaFin) {
    return Math.ceil((new Date(fechaFin) - new Date()) / 86400000)
  }

  if (loading) return <div className="loading">Cargando...</div>

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-left">
          <h2>Tratamientos</h2>
          <p>{tratamientos.length} activos</p>
        </div>
      </div>

      <div className="card">
        {tratamientos.length === 0 ? (
          <div className="empty"><div className="empty-icon">💊</div>Sin tratamientos activos</div>
        ) : (
          <table className="tabla">
            <thead>
              <tr><th>Caravana</th><th>Corral</th><th>Inicio</th><th>Fin</th><th>Días restantes</th></tr>
            </thead>
            <tbody>
              {tratamientos.map(t => {
                const dr = diasRestantes(t.fecha_fin)
                return (
                  <tr key={t.id}>
                    <td><strong>{t.terneros?.caravana || '—'}</strong></td>
                    <td>Corral {t.terneros?.corral || '—'}</td>
                    <td>{t.fecha_inicio?.substring(0, 10) || '—'}</td>
                    <td>{t.fecha_fin?.substring(0, 10) || '—'}</td>
                    <td><span className={`chip ${dr <= 1 ? 'r' : dr <= 3 ? 'n' : 'c'}`}>{dr} día{dr !== 1 ? 's' : ''}</span></td>
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
