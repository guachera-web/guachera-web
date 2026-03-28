import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, sanos: 0, alerta: 0, critico: 0, enTrat: 0, recria: 0 })
  const [corrales, setCorrales] = useState([])
  const [alertas, setAlertas] = useState([])
  const [tratamientos, setTratamientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [resumenIA, setResumenIA] = useState('')
  const [loadingIA, setLoadingIA] = useState(false)
  const hoy = new Date().toISOString().split('T')[0]

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    try {
      const { data: terneros } = await supabase
        .from('terneros').select('*')
        .eq('establecimiento', 'tambo_1')

      if (terneros) {
        const activos = terneros.filter(t => !t.fecha_baja && !t.fecha_recria)
        const recria = terneros.filter(t => t.fecha_recria)
        setStats({
          total: activos.length,
          sanos: activos.filter(t => t.estado === 'SANO').length,
          alerta: activos.filter(t => t.estado === 'ALERTA').length,
          critico: activos.filter(t => t.estado === 'CRÍTICO').length,
          enTrat: activos.filter(t => t.estado === 'EN TRATAMIENTO').length,
          recria: recria.length,
        })

        const alertasList = activos.filter(t => t.estado === 'CRÍTICO' || t.estado === 'ALERTA')
        setAlertas(alertasList.sort((a, b) => {
          if (a.estado === 'CRÍTICO' && b.estado !== 'CRÍTICO') return -1
          if (b.estado === 'CRÍTICO' && a.estado !== 'CRÍTICO') return 1
          return 0
        }))

        const corralesMap = {}
        activos.forEach(t => {
          if (!corralesMap[t.corral]) corralesMap[t.corral] = { corral: t.corral, total: 0, critico: 0, alerta: 0, enTrat: 0 }
          corralesMap[t.corral].total++
          if (t.estado === 'CRÍTICO') corralesMap[t.corral].critico++
          if (t.estado === 'ALERTA') corralesMap[t.corral].alerta++
          if (t.estado === 'EN TRATAMIENTO') corralesMap[t.corral].enTrat++
        })
        setCorrales(Object.values(corralesMap).sort((a, b) => a.corral.localeCompare(b.corral)))
      }

      const { data: trats } = await supabase
        .from('tratamientos').select('*, terneros(caravana, corral)')
        .eq('establecimiento', 'tambo_1')
        .gte('fecha_fin', hoy)
        .order('fecha_fin')
      if (trats) setTratamientos(trats.slice(0, 5))

    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function generarResumenIA() {
    setLoadingIA(true)
    setResumenIA('')

    try {
      const key = import.meta.env.VITE_GEMINI_KEY=AIzaSyBNpWRiEEIh3c6KkKFFdIWeRbfziLZxXWo
      if (!key) {
        setResumenIA('API key no configurada.')
        setLoadingIA(false)
        return
      }

      const { data: terneros } = await supabase.from('terneros').select('*').eq('establecimiento', 'tambo_1')

      const activos = terneros?.filter(t => !t.fecha_baja && !t.fecha_recria) || []
      const mesActual = new Date().toISOString().substring(0, 7)
      const bajasMes = terneros?.filter(t => t.fecha_baja?.startsWith(mesActual)) || []
      const ingresosMes = terneros?.filter(t => t.fecha_nacimiento?.startsWith(mesActual)) || []

      const corralesMap = {}
      activos.forEach(t => {
        if (!corralesMap[t.corral]) corralesMap[t.corral] = { corral: t.corral, critico: 0, alerta: 0, total: 0 }
        corralesMap[t.corral].total++
        if (t.estado === 'CRÍTICO') corralesMap[t.corral].critico++
        if (t.estado === 'ALERTA') corralesMap[t.corral].alerta++
      })
      const corralesProblema = Object.values(corralesMap)
        .filter(c => c.critico > 0 || c.alerta > 0)
        .sort((a, b) => (b.critico * 2 + b.alerta) - (a.critico * 2 + a.alerta))

      const criticos = activos.filter(t => t.estado === 'CRÍTICO')
      const mortalidad = ingresosMes.length > 0
        ? ((bajasMes.length / ingresosMes.length) * 100).toFixed(1) : 0

      const prompt = `Sos un veterinario especialista en guacheras (cría de terneros). Analizá estos datos del día de hoy del Tambo Saifica y generá un resumen ejecutivo claro y útil en español, con tono profesional pero directo. Usá párrafos cortos. Destacá lo urgente primero.

DATOS DEL DÍA:
- Total activos en guachera: ${activos.length}
- Sanos: ${activos.filter(t => t.estado === 'SANO').length}
- En alerta: ${activos.filter(t => t.estado === 'ALERTA').length}
- Críticos: ${criticos.length}${criticos.length > 0 ? ` (caravanas: ${criticos.map(t => t.caravana).join(', ')})` : ''}
- En tratamiento: ${activos.filter(t => t.estado === 'EN TRATAMIENTO').length}

CORRALES CON PROBLEMAS:
${corralesProblema.length > 0 ? corralesProblema.map(c => `- Corral ${c.corral}: ${c.critico} críticos, ${c.alerta} alertas de ${c.total} animales`).join('\n') : '- Ninguno'}

MOVIMIENTO DEL MES:
- Ingresos: ${ingresosMes.length} terneros
- Bajas: ${bajasMes.length}
- Tasa de mortalidad: ${mortalidad}%

Generá el resumen en 3-5 párrafos cortos. No uses bullets. No inventes datos que no te di.`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
          }),
        }
      )

      const data = await response.json()
      const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar el resumen.'
      setResumenIA(texto)
    } catch (e) {
      setResumenIA('Error al generar el resumen. Intentá de nuevo.')
    }
    setLoadingIA(false)
  }

  function semaforo(c) {
    if (c.critico > 0) return 'sem-r'
    if (c.alerta > 0 || c.enTrat > 0) return 'sem-n'
    return 'sem-v'
  }

  function estadoChip(estado) {
    const map = { 'SANO': 'v', 'ALERTA': 'n', 'CRÍTICO': 'r', 'EN TRATAMIENTO': 'c' }
    return map[estado] || 'g'
  }

  if (loading) return <div className="loading">Cargando...</div>

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-left">
          <h2>Dashboard</h2>
          <p>{new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="topbar-right" style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={generarResumenIA} disabled={loadingIA}
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none' }}>
            {loadingIA ? '⏳ Analizando...' : '✨ Resumen IA'}
          </button>
          <button className="btn btn-primary" onClick={cargar}>↻ Actualizar</button>
        </div>
      </div>

      {(resumenIA || loadingIA) && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #8b5cf6', background: '#faf9ff' }}>
          <div className="card-header">
            <span className="card-title" style={{ color: '#6366f1' }}>✨ Análisis del día — IA</span>
            {resumenIA && (
              <button onClick={() => setResumenIA('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18 }}>
                ×
              </button>
            )}
          </div>
          <div style={{ padding: '12px 16px 16px' }}>
            {loadingIA ? (
              <div style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Analizando datos del tambo...</div>
            ) : (
              <div style={{ lineHeight: 1.7, color: 'var(--text)', fontSize: 14, whiteSpace: 'pre-wrap' }}>
                {resumenIA}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="stats-grid stats-6">
        <div className="stat-card"><div className="stat-lbl">🐄 Total activos</div><div className="stat-val">{stats.total}</div><div className="stat-sub">en guachera</div></div>
        <div className="stat-card v"><div className="stat-lbl">✓ Sanos</div><div className="stat-val">{stats.sanos}</div><div className="stat-sub">sin novedades</div></div>
        <div className="stat-card n"><div className="stat-lbl">⚠ Alerta</div><div className="stat-val">{stats.alerta}</div><div className="stat-sub">requieren atención</div></div>
        <div className="stat-card r"><div className="stat-lbl">🔴 Crítico</div><div className="stat-val">{stats.critico}</div><div className="stat-sub">intervención urgente</div></div>
        <div className="stat-card c"><div className="stat-lbl">💊 En trat.</div><div className="stat-val">{stats.enTrat}</div><div className="stat-sub">tratamiento activo</div></div>
        <div className="stat-card v"><div className="stat-lbl">🌾 Recría</div><div className="stat-val">{stats.recria}</div><div className="stat-sub">este mes</div></div>
      </div>

      <div className="two-col">
        <div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Semáforo sanitario — Corrales</span>
              <Link to="/corrales" className="card-action">Ver todos →</Link>
            </div>
            {corrales.length === 0 ? (
              <div className="empty"><div className="empty-icon">🏠</div>Sin datos de corrales aún</div>
            ) : (
              <table className="tabla">
                <thead><tr><th>Corral</th><th>Animales</th><th>Estado</th><th>Alertas</th></tr></thead>
                <tbody>
                  {corrales.map(c => (
                    <tr key={c.corral}>
                      <td><span className={`semaforo ${semaforo(c)}`}></span><strong>Corral {c.corral}</strong></td>
                      <td>{c.total}</td>
                      <td>
                        {c.critico > 0 && <span className="chip r">🔴 {c.critico} crítico{c.critico > 1 ? 's' : ''}</span>}
                        {c.alerta > 0 && <span className="chip n">⚠ {c.alerta} alerta{c.alerta > 1 ? 's' : ''}</span>}
                        {c.enTrat > 0 && <span className="chip c">💊 {c.enTrat} trat.</span>}
                        {c.critico === 0 && c.alerta === 0 && c.enTrat === 0 && <span className="chip v">✓ Todo ok</span>}
                      </td>
                      <td style={{ color: c.critico > 0 ? 'var(--rojo)' : c.alerta > 0 ? 'var(--naranja)' : 'var(--muted)', fontWeight: 700 }}>
                        {c.critico + c.alerta || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Alertas urgentes</span>
              <Link to="/alertas" className="card-action">Ver todas →</Link>
            </div>
            {alertas.length === 0 ? (
              <div className="empty"><div className="empty-icon">✅</div>Sin alertas hoy</div>
            ) : alertas.slice(0, 5).map(a => (
              <div key={a.id} className="alerta-item">
                <div className={`alerta-ico ${estadoChip(a.estado)}`}>
                  {a.estado === 'CRÍTICO' ? '🔴' : '⚠️'}
                </div>
                <div className="alerta-info">
                  <p>Caravana {a.caravana}</p>
                  <span>Corral {a.corral}</span>
                </div>
                <span className={`alerta-badge ab-${estadoChip(a.estado)}`}>{a.estado}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Tratamientos activos</span>
              <Link to="/tratamientos" className="card-action">Ver →</Link>
            </div>
            {tratamientos.length === 0 ? (
              <div className="empty"><div className="empty-icon">💊</div>Sin tratamientos activos</div>
            ) : tratamientos.map(t => {
              const diasRest = Math.ceil((new Date(t.fecha_fin) - new Date()) / 86400000)
              return (
                <div key={t.id} className="alerta-item">
                  <div className="alerta-ico c">💊</div>
                  <div className="alerta-info">
                    <p>Caravana {t.terneros?.caravana}</p>
                    <span>Vence {t.fecha_fin?.substring(0, 10)}</span>
                  </div>
                  <span className={`alerta-badge ${diasRest <= 1 ? 'ab-r' : 'ab-c'}`}>{diasRest}d</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
