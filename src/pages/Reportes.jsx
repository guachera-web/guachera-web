import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function Reportes() {
  const [stats, setStats] = useState({ promDias: 0, mortalidad: 0, costoAnimal: 0, recria: 0 })
  const [corralesData, setCorralesData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data: terneros } = await supabase.from('terneros').select('*').eq('establecimiento', 'tambo_1')

    if (terneros) {
      const mesActual = new Date().toISOString().substring(0, 7)
      const activos = terneros.filter(t => !t.fecha_baja && !t.fecha_recria)
      const recriaMes = terneros.filter(t => t.fecha_recria?.startsWith(mesActual))
      const bajasMes = terneros.filter(t => t.fecha_baja?.startsWith(mesActual))
      const ingresosMes = terneros.filter(t => t.fecha_nacimiento?.startsWith(mesActual))

      const promDias = recriaMes.length > 0
        ? Math.round(recriaMes.reduce((s, a) => {
            if (!a.fecha_nacimiento || !a.fecha_recria) return s
            return s + Math.floor((new Date(a.fecha_recria) - new Date(a.fecha_nacimiento)) / 86400000)
          }, 0) / recriaMes.length)
        : 0

      const mortalidad = ingresosMes.length > 0
        ? ((bajasMes.length / ingresosMes.length) * 100).toFixed(1)
        : 0

      // Rendimiento por corral
      const corralesMap = {}
      activos.forEach(t => {
        if (!corralesMap[t.corral]) corralesMap[t.corral] = { corral: t.corral, total: 0, sanos: 0, critico: 0, alerta: 0, bajas: 0 }
        corralesMap[t.corral].total++
        if (t.estado === 'SANO') corralesMap[t.corral].sanos++
        if (t.estado === 'CRÍTICO') corralesMap[t.corral].critico++
        if (t.estado === 'ALERTA') corralesMap[t.corral].alerta++
      })
      bajasMes.forEach(t => {
        if (corralesMap[t.corral]) corralesMap[t.corral].bajas++
      })

      setStats({ promDias, mortalidad, recria: recriaMes.length })
      setCorralesData(Object.values(corralesMap).sort((a, b) => a.corral.localeCompare(b.corral)))
    }
    setLoading(false)
  }

  function rendimiento(c) {
    const pct = c.total > 0 ? (c.sanos / c.total) * 100 : 0
    if (pct >= 80 && c.bajas === 0) return { label: 'Excelente', cls: 'ex' }
    if (pct >= 60) return { label: 'Bueno', cls: 'bu' }
    return { label: 'Regular', cls: 're' }
  }

  if (loading) return <div className="loading">Cargando...</div>

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-left">
          <h2>Reportes</h2>
          <p>Análisis del mes actual</p>
        </div>
      </div>

      <div className="stats-grid stats-3">
        <div className="stat-card c"><div className="stat-lbl">Prom. días en guachera</div><div className="stat-val">{stats.promDias}</div><div className="stat-sub">hasta recría</div></div>
        <div className="stat-card r"><div className="stat-lbl">Tasa de mortalidad</div><div className="stat-val">{stats.mortalidad}<span style={{ fontSize: 18 }}>%</span></div><div className="stat-sub">este mes</div></div>
        <div className="stat-card v"><div className="stat-lbl">Animales a recría</div><div className="stat-val">{stats.recria}</div><div className="stat-sub">completaron la etapa</div></div>
      </div>

      {corralesData.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">Rendimiento por corral</span></div>
          <table className="tabla">
            <thead>
              <tr><th>Corral</th><th>Animales</th><th>% Sanos</th><th>Críticos</th><th>Alertas</th><th>Bajas mes</th><th>Rendimiento</th></tr>
            </thead>
            <tbody>
              {corralesData.map(c => {
                const pct = c.total > 0 ? Math.round((c.sanos / c.total) * 100) : 0
                const rend = rendimiento(c)
                return (
                  <tr key={c.corral}>
                    <td><strong>Corral {c.corral}</strong></td>
                    <td>{c.total}</td>
                    <td>
                      <div className="prog-bar" style={{ width: 80 }}>
                        <div className="prog-fill" style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--verde)' : pct >= 50 ? 'var(--celeste)' : 'var(--naranja)' }}></div>
                      </div>
                      {' '}{pct}%
                    </td>
                    <td style={{ color: c.critico > 0 ? 'var(--rojo)' : 'var(--muted)' }}>{c.critico || '—'}</td>
                    <td style={{ color: c.alerta > 0 ? 'var(--naranja)' : 'var(--muted)' }}>{c.alerta || '—'}</td>
                    <td style={{ color: c.bajas > 0 ? 'var(--rojo)' : 'var(--muted)' }}>{c.bajas || '—'}</td>
                    <td><span className={`badge ${rend.cls}`}>{rend.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
