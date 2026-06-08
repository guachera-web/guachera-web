import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts'

const PERIODOS = [
  { label: 'Último mes', value: 30 },
  { label: 'Últimos 3 meses', value: 90 },
  { label: 'Últimos 6 meses', value: 180 },
  { label: 'Este año', value: 365 },
]

const COLORES = ['#1A6EA8', '#2D6A4F', '#E07B00', '#C0392B', '#74ACDF', '#8B5CF6', '#10B981', '#F59E0B']

export default function Estadisticas() {
  const [periodo, setPeriodo] = useState(30)
  const [loading, setLoading] = useState(true)

  // Datos
  const [evolucionEstados, setEvolucionEstados] = useState([])
  const [medicamentosMasUsados, setMedicamentosMasUsados] = useState([])
  const [motivosBaja, setMotivosBaja] = useState([])
  const [diasPorCorral, setDiasPorCorral] = useState([])
  const [resumen, setResumen] = useState({ totalTratamientos: 0, totalBajas: 0, promedioTemp: 0, totalAlertas: 0 })

  useEffect(() => { cargar() }, [periodo])

  async function cargar() {
    setLoading(true)

    const desde = new Date()
    desde.setDate(desde.getDate() - periodo)
    const desdeStr = desde.toISOString().split('T')[0]

    const [
      { data: terneros },
      { data: seguimientos },
      { data: tratamientos },
      { data: detalles },
      { data: medicamentos },
    ] = await Promise.all([
      supabase.from('terneros').select('*').eq('establecimiento', 'tambo_1'),
      supabase.from('seguimiento_diario').select('*').eq('establecimiento', 'tambo_1').gte('fecha', desdeStr),
      supabase.from('tratamientos').select('*').eq('establecimiento', 'tambo_1').gte('fecha_inicio', desdeStr),
      supabase.from('tratamiento_detalle').select('*').eq('establecimiento', 'tambo_1'),
      supabase.from('medicamentos').select('*').eq('establecimiento', 'tambo_1'),
    ])

    const medsMap = {}
    medicamentos?.forEach(m => { medsMap[m.id] = m.nombre })

    // ── EVOLUCIÓN DE ESTADOS POR SEMANA
    if (seguimientos) {
      const semanas = {}
      seguimientos.forEach(s => {
        const d = new Date(s.fecha)
        const lunes = new Date(d)
        lunes.setDate(d.getDate() - d.getDay() + 1)
        const key = lunes.toISOString().split('T')[0]
        if (!semanas[key]) semanas[key] = { semana: key, SANO: 0, ALERTA: 0, CRÍTICO: 0, 'EN TRATAMIENTO': 0 }
        if (s.estado) semanas[key][s.estado] = (semanas[key][s.estado] || 0) + 1
      })
      const evol = Object.values(semanas).sort((a, b) => a.semana.localeCompare(b.semana))
      evol.forEach(e => {
        const d = new Date(e.semana)
        e.label = `${d.getDate()}/${d.getMonth() + 1}`
      })
      setEvolucionEstados(evol)
    }

    // ── MEDICAMENTOS MÁS USADOS
    if (detalles && tratamientos) {
      const tratIds = new Set(tratamientos.map(t => t.id))
      const conteo = {}
      detalles.filter(d => tratIds.has(d.tratamiento_id)).forEach(d => {
        const nombre = medsMap[d.medicamento_id] || 'Desconocido'
        conteo[nombre] = (conteo[nombre] || 0) + 1
      })
      const meds = Object.entries(conteo)
        .map(([nombre, usos]) => ({ nombre: nombre.length > 20 ? nombre.substring(0, 18) + '…' : nombre, usos }))
        .sort((a, b) => b.usos - a.usos)
        .slice(0, 8)
      setMedicamentosMasUsados(meds)
    }

    // ── MOTIVOS DE BAJA
    if (terneros) {
      const bajas = terneros.filter(t => {
        if (!t.fecha_baja) return false
        return t.fecha_baja >= desdeStr
      })
      const conteo = {}
      bajas.forEach(b => {
        const m = b.motivo_baja || 'Sin motivo'
        conteo[m] = (conteo[m] || 0) + 1
      })
      setMotivosBaja(Object.entries(conteo).map(([name, value]) => ({ name, value })))

      // ── DÍAS PROMEDIO EN GUACHERA POR CORRAL
      const recrias = terneros.filter(t => t.fecha_recria && t.fecha_nacimiento && t.fecha_recria >= desdeStr)
      const porCorral = {}
      recrias.forEach(t => {
        const dias = Math.floor((new Date(t.fecha_recria) - new Date(t.fecha_nacimiento)) / 86400000)
        if (!porCorral[t.corral]) porCorral[t.corral] = { dias: [], corral: t.corral }
        porCorral[t.corral].dias.push(dias)
      })
      const diasCorral = Object.values(porCorral)
        .map(c => ({
          corral: `C${c.corral}`,
          promedio: Math.round(c.dias.reduce((a, b) => a + b, 0) / c.dias.length),
          animales: c.dias.length,
        }))
        .sort((a, b) => a.corral.localeCompare(b.corral))
        .slice(0, 10)
      setDiasPorCorral(diasCorral)

      // ── RESUMEN
      const totalBajas = bajas.length
      const totalTratamientos = tratamientos?.length || 0
      const temps = seguimientos?.filter(s => s.temperatura).map(s => s.temperatura) || []
      const promedioTemp = temps.length > 0
        ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)
        : 0
      const totalAlertas = seguimientos?.filter(s => s.estado === 'ALERTA' || s.estado === 'CRÍTICO').length || 0
      setResumen({ totalTratamientos, totalBajas, promedioTemp, totalAlertas })
    }

    setLoading(false)
  }

  const tooltipStyle = { background: '#fff', border: '1px solid #e5e3de', borderRadius: 8, fontSize: 12 }

  if (loading) return <div className="loading">Cargando estadísticas...</div>

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-left">
          <h2>Estadísticas</h2>
          <p>Análisis sanitario del establecimiento</p>
        </div>
        <div className="topbar-right" style={{ display: 'flex', gap: 6 }}>
          {PERIODOS.map(p => (
            <button key={p.value} onClick={() => setPeriodo(p.value)}
              className="btn"
              style={{
                background: periodo === p.value ? '#1A6EA8' : 'var(--bg)',
                color: periodo === p.value ? '#fff' : 'var(--text)',
                border: `1px solid ${periodo === p.value ? '#1A6EA8' : 'var(--border)'}`,
                fontSize: 12, padding: '6px 12px'
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="stats-grid stats-4" style={{ marginBottom: 16 }}>
        <div className="stat-card c">
          <div className="stat-lbl">💊 Tratamientos</div>
          <div className="stat-val">{resumen.totalTratamientos}</div>
          <div className="stat-sub">en el período</div>
        </div>
        <div className="stat-card r">
          <div className="stat-lbl">💀 Bajas</div>
          <div className="stat-val">{resumen.totalBajas}</div>
          <div className="stat-sub">en el período</div>
        </div>
        <div className="stat-card n">
          <div className="stat-lbl">⚠️ Registros con alerta</div>
          <div className="stat-val">{resumen.totalAlertas}</div>
          <div className="stat-sub">seguimientos</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">🌡️ Temp. promedio</div>
          <div className="stat-val">{resumen.promedioTemp}</div>
          <div className="stat-sub">°C registrado</div>
        </div>
      </div>

      {/* Evolución de estados */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">📈 Evolución sanitaria por semana</span>
        </div>
        <div style={{ padding: '8px 16px 16px' }}>
          {evolucionEstados.length === 0 ? (
            <div className="empty"><div className="empty-icon">📊</div>Sin datos en el período</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={evolucionEstados} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="ALERTA" stroke="#E07B00" strokeWidth={2} dot={false} name="Alerta" />
                <Line type="monotone" dataKey="CRÍTICO" stroke="#C0392B" strokeWidth={2} dot={false} name="Crítico" />
                <Line type="monotone" dataKey="EN TRATAMIENTO" stroke="#1A6EA8" strokeWidth={2} dot={false} name="En tratamiento" />
                <Line type="monotone" dataKey="SANO" stroke="#2D6A4F" strokeWidth={1.5} dot={false} name="Sano" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="two-col">
        {/* Medicamentos más usados */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">💊 Medicamentos más usados</span>
          </div>
          <div style={{ padding: '8px 16px 16px' }}>
            {medicamentosMasUsados.length === 0 ? (
              <div className="empty"><div className="empty-icon">💊</div>Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={medicamentosMasUsados} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} usos`, 'Cantidad']} />
                  <Bar dataKey="usos" fill="#1A6EA8" radius={[0, 4, 4, 0]}>
                    {medicamentosMasUsados.map((_, i) => (
                      <Cell key={i} fill={COLORES[i % COLORES.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Motivos de baja */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">💀 Motivos de baja</span>
          </div>
          <div style={{ padding: '8px 16px 16px' }}>
            {motivosBaja.length === 0 ? (
              <div className="empty"><div className="empty-icon">🎉</div>Sin bajas en el período</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={motivosBaja} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                      label={({ name, value }) => `${name} (${value})`} labelLine={false} fontSize={10}>
                      {motivosBaja.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <table className="tabla" style={{ marginTop: 8 }}>
                  <tbody>
                    {motivosBaja.map((m, i) => (
                      <tr key={i}>
                        <td>
                          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: COLORES[i % COLORES.length], marginRight: 6 }} />
                          {m.name}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{m.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Días promedio en guachera por corral */}
      {diasPorCorral.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <span className="card-title">🌾 Días promedio en guachera hasta recría — por corral</span>
          </div>
          <div style={{ padding: '8px 16px 16px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={diasPorCorral} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
                <XAxis dataKey="corral" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle}
                  formatter={(v, n, p) => [`${v} días (${p.payload.animales} animales)`, 'Promedio']} />
                <Bar dataKey="promedio" fill="#2D6A4F" radius={[4, 4, 0, 0]} name="Días prom." />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
