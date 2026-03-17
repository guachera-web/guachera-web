import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

export default function Balance() {
  const [data, setData] = useState({ ingresos: 0, recria: 0, bajas: 0, activos: 0, motivosBaja: [] })
  const [loading, setLoading] = useState(true)
  const mesActual = new Date().toISOString().substring(0, 7)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data: terneros } = await supabase
      .from('terneros').select('*').eq('establecimiento', 'tambo_1')

    if (terneros) {
      const ingresos = terneros.filter(t => t.fecha_nacimiento?.startsWith(mesActual)).length
      const recria = terneros.filter(t => t.fecha_recria?.startsWith(mesActual)).length
      const bajasArr = terneros.filter(t => t.fecha_baja?.startsWith(mesActual))
      const activos = terneros.filter(t => !t.fecha_baja && !t.fecha_recria).length

      const motivosMap = {}
      bajasArr.forEach(b => {
        const m = b.motivo_baja || 'Sin motivo'
        motivosMap[m] = (motivosMap[m] || 0) + 1
      })
      const motivosBaja = Object.entries(motivosMap).map(([name, value]) => ({ name, value }))

      setData({ ingresos, recria, bajas: bajasArr.length, activos, motivosBaja })
    }
    setLoading(false)
  }

  const COLORS = ['#C0392B', '#E07B00', '#74ACDF', '#2D8C5A', '#888']

  if (loading) return <div className="loading">Cargando...</div>

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-left">
          <h2>Balance</h2>
          <p>{new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="two-col">
        <div>
          <div className="card">
            <div className="card-header"><span className="card-title">Movimiento del rodeo — Este mes</span></div>
            <div className="balance-row"><div><div className="balance-label">🐄 Ingresos</div><div className="balance-sub">Terneros ingresados al sistema</div></div><div className="balance-num" style={{ color: 'var(--verde)' }}>+{data.ingresos}</div></div>
            <div className="balance-row"><div><div className="balance-label">🌾 Altas a recría</div><div className="balance-sub">Completaron la etapa de guachera</div></div><div className="balance-num" style={{ color: 'var(--celeste-dark)' }}>+{data.recria}</div></div>
            <div className="balance-row"><div><div className="balance-label">💀 Bajas</div><div className="balance-sub">Muertes y descartes del mes</div></div><div className="balance-num" style={{ color: 'var(--rojo)' }}>−{data.bajas}</div></div>
            <div className="balance-row" style={{ background: '#FAFAF8', borderTop: '2px solid var(--border)' }}>
              <div><div className="balance-label">📊 Activos al día de hoy</div></div>
              <div className="balance-num">{data.activos}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Indicadores sanitarios</span></div>
            <div className="balance-row">
              <div><div className="balance-label">Tasa de mortalidad</div></div>
              <div className="balance-num" style={{ color: 'var(--rojo)', fontSize: 18 }}>
                {data.ingresos > 0 ? ((data.bajas / data.ingresos) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="balance-row">
              <div><div className="balance-label">% animales a recría</div></div>
              <div className="balance-num" style={{ color: 'var(--verde)', fontSize: 18 }}>
                {data.ingresos > 0 ? ((data.recria / data.ingresos) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </div>

        <div>
          {data.motivosBaja.length > 0 && (
            <div className="card">
              <div className="card-header"><span className="card-title">Bajas por motivo</span></div>
              <div style={{ padding: 16 }}>
                <PieChart width={260} height={200}>
                  <Pie data={data.motivosBaja} cx={110} cy={90} outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false} fontSize={11}>
                    {data.motivosBaja.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </div>
            </div>
          )}

          {data.motivosBaja.length === 0 && (
            <div className="card">
              <div className="empty"><div className="empty-icon">🎉</div>Sin bajas este mes</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
