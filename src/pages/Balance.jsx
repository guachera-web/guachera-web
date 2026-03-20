import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { PieChart, Pie, Cell } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Balance() {
  const [data, setData] = useState({ ingresos: 0, recria: 0, bajas: 0, activos: 0, motivosBaja: [], bajasArr: [] })
  const [loading, setLoading] = useState(true)
  const mesActual = new Date().toISOString().substring(0, 7)
  const mesLabel = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

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

      setData({ ingresos, recria, bajas: bajasArr.length, activos, motivosBaja, bajasArr })
    }
    setLoading(false)
  }

  function exportarPDF() {
    const doc = new jsPDF()
    const mortalidad = data.ingresos > 0 ? ((data.bajas / data.ingresos) * 100).toFixed(1) : 0
    const pctRecria = data.ingresos > 0 ? ((data.recria / data.ingresos) * 100).toFixed(1) : 0

    // Header
    doc.setFillColor(58, 125, 181)
    doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('GUACHERA', 14, 12)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Balance mensual — ${mesLabel}`, 14, 20)
    doc.text('Tambo Saifica', 160, 20)

    // KPIs
    doc.setTextColor(26, 26, 26)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Movimiento del rodeo', 14, 38)

    autoTable(doc, {
      startY: 42,
      head: [['Indicador', 'Valor']],
      body: [
        ['Ingresos del mes', `+${data.ingresos} animales`],
        ['Altas a recria', `+${data.recria} animales`],
        ['Bajas (muertes/descartes)', `-${data.bajas} animales`],
        ['Activos al dia de hoy', `${data.activos} animales`],
      ],
      headStyles: { fillColor: [58, 125, 181], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
      alternateRowStyles: { fillColor: [245, 243, 238] },
      margin: { left: 14, right: 14 },
    })

    // Indicadores sanitarios
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Indicadores sanitarios', 14, doc.lastAutoTable.finalY + 12)

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 16,
      head: [['Indicador', 'Valor', 'Base de calculo']],
      body: [
        ['Tasa de mortalidad', `${mortalidad}%`, `${data.bajas} bajas / ${data.ingresos} ingresos`],
        ['Animales a recria', `${pctRecria}%`, `${data.recria} recrias / ${data.ingresos} ingresos`],
      ],
      headStyles: { fillColor: [58, 125, 181], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 10 },
      columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } },
      alternateRowStyles: { fillColor: [245, 243, 238] },
      margin: { left: 14, right: 14 },
    })

    // Bajas por motivo
    if (data.bajasArr.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('Detalle de bajas', 14, doc.lastAutoTable.finalY + 12)

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 16,
        head: [['Caravana', 'Corral', 'Fecha baja', 'Motivo']],
        body: data.bajasArr.map(b => [
          b.caravana || '—',
          `Corral ${b.corral}`,
          b.fecha_baja?.substring(0, 10) || '—',
          b.motivo_baja || 'Sin motivo',
        ]),
        headStyles: { fillColor: [58, 125, 181], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 10 },
        alternateRowStyles: { fillColor: [245, 243, 238] },
        margin: { left: 14, right: 14 },
      })
    }

    // Footer
    const pageH = doc.internal.pageSize.height
    doc.setFillColor(245, 243, 238)
    doc.rect(0, pageH - 14, 210, 14, 'F')
    doc.setTextColor(136, 136, 136)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('guachera-vercel.app', 14, pageH - 5)
    doc.text(`Generado el ${new Date().toLocaleDateString('es-AR')}`, 150, pageH - 5)

    doc.save(`guachera-balance-${mesActual}.pdf`)
  }

  const COLORS = ['#C0392B', '#E07B00', '#74ACDF', '#2D8C5A', '#888']
  if (loading) return <div className="loading">Cargando...</div>

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-left">
          <h2>Balance</h2>
          <p>{mesLabel}</p>
        </div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={exportarPDF}>📄 Exportar PDF</button>
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
          {data.motivosBaja.length > 0 ? (
            <div className="card">
              <div className="card-header"><span className="card-title">Bajas por motivo</span></div>
              <div style={{ padding: 16 }}>
                <PieChart width={260} height={200}>
                  <Pie data={data.motivosBaja} cx={110} cy={90} outerRadius={80} dataKey="value"
                    label={({ name, value }) => `${name} (${value})`} labelLine={false} fontSize={11}>
                    {data.motivosBaja.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="empty"><div className="empty-icon">🎉</div>Sin bajas este mes</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
