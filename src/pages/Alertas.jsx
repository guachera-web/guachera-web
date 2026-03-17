import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Alertas() {
  const [criticos, setCriticos] = useState([])
  const [alertas, setAlertas] = useState([])
  const [tratVencen, setTratVencen] = useState([])
  const [loading, setLoading] = useState(true)
  const hoy = new Date().toISOString().split('T')[0]

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('terneros').select('*').eq('establecimiento', 'tambo_1')
    if (data) {
      const activos = data.filter(t => !t.fecha_baja && !t.fecha_recria)
      setCriticos(activos.filter(t => t.estado === 'CRÍTICO'))
      setAlertas(activos.filter(t => t.estado === 'ALERTA'))
    }
    const { data: trats } = await supabase
      .from('tratamientos').select('*, terneros(caravana, corral)')
      .eq('establecimiento', 'tambo_1')
      .lte('fecha_fin', hoy)
      .gte('fecha_fin', hoy)
    if (trats) setTratVencen(trats)
    setLoading(false)
  }

  function diasDeVida(fn) {
    if (!fn) return '—'
    return Math.floor((new Date() - new Date(fn)) / 86400000)
  }

  if (loading) return <div className="loading">Cargando...</div>

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-left">
          <h2>Alertas del día</h2>
          <p>{criticos.length + alertas.length} animales requieren atención</p>
        </div>
      </div>

      <div className="two-col">
        <div>
          <div className="card">
            <div className="card-header"><span className="card-title">🔴 Críticos — Intervención urgente</span></div>
            {criticos.length === 0 ? (
              <div className="empty"><div className="empty-icon">✅</div>Sin animales críticos</div>
            ) : criticos.map(a => (
              <div key={a.id} className="alerta-item">
                <div className="alerta-ico r">🔴</div>
                <div className="alerta-info">
                  <p>Caravana {a.caravana} · Corral {a.corral}</p>
                  <span>{diasDeVida(a.fecha_nacimiento)} días de vida</span>
                </div>
                <span className="alerta-badge ab-r">CRÍTICO</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">⚠️ Alertas — Seguimiento cercano</span></div>
            {alertas.length === 0 ? (
              <div className="empty"><div className="empty-icon">✅</div>Sin alertas</div>
            ) : alertas.map(a => (
              <div key={a.id} className="alerta-item">
                <div className="alerta-ico n">⚠️</div>
                <div className="alerta-info">
                  <p>Caravana {a.caravana} · Corral {a.corral}</p>
                  <span>{diasDeVida(a.fecha_nacimiento)} días de vida</span>
                </div>
                <span className="alerta-badge ab-n">ALERTA</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header"><span className="card-title">💊 Tratamientos que vencen hoy</span></div>
            {tratVencen.length === 0 ? (
              <div className="empty"><div className="empty-icon">✅</div>Ninguno vence hoy</div>
            ) : tratVencen.map(t => (
              <div key={t.id} className="alerta-item">
                <div className="alerta-ico c">💊</div>
                <div className="alerta-info">
                  <p>Caravana {t.terneros?.caravana}</p>
                  <span>Vence hoy</span>
                </div>
                <span className="alerta-badge ab-r">HOY</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
