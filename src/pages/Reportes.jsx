import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Reportes() {
  const [stats, setStats] = useState({ promDias: 0, mortalidad: 0, recria: 0 })
  const [corralesData, setCorralesData] = useState([])
  const [loading, setLoading] = useState(true)
  const mesLabel = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const mesActual = new Date().toISOString().substring(0, 7)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data: terneros } = await supabase.from('terneros').select('*').eq('establecimiento', 'tambo_1')

    if (terneros) {
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
        ? ((bajasMes.length / ingresosMes.length) * 100).toFixed(1) : 0

      const corralesMap = {}
      activos.forEach(t => {
        if (!corralesMap[t.corral]) corralesMap[t.corral] = { corral: t.corral, total: 0, sanos: 0, critico: 0, alerta: 0, bajas: 0 }
        corralesMap[t.corral].total++
        if (t.estado === 'SANO') corralesMap[t.corral].sanos++
        if (t.estado === 'CRÍTICO') corralesMap[t.corral].critico++
        if (t.estado === 'ALERTA') corralesMap[t.corral].alerta++
      })
      bajasMes.forEach(t => { if (corralesMap[t.corral]) corralesMap[t.corral].bajas++ })

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

  function exportarPDF() {
    const doc = new jsPDF()

    // Header
    doc.setFillColor(58, 125, 181)
    doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('GUACHERA', 14, 12)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Reporte mensual — ${mesLabel}`, 14, 20)
    doc.text('Tambo Saifica', 160, 20)

    // KPIs
    doc.setTextColor(26, 26, 26)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Indicadores del mes', 14, 38)

    autoTable(doc, {
      startY: 42,
      head: [['Indicador', 'Valor']],
      body: [
        ['Promedio dias en guachera hasta recria', `${stats.promDias} dias`],
        ['Tasa de mortalidad', `${stats.mortalidad}%`],
        ['Animales que pasaron a recria', `${stats.recria} animales`],
      ],
      headStyles: { fillColor: [58, 125, 181], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
      alternateRowStyles: { fillColor: [245, 243, 238] },
      margin: { left: 14, right: 14 },
    })

    // Rendimiento por corral
    if (corralesData.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('Rendimiento por corral', 14, doc.lastAutoTable.finalY + 12)

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 16,
        head: [['Corral', 'Animales', '% Sanos', 'Criticos', 'Alertas', 'Bajas', 'Rendimiento']],
        body: corralesData.map(c => {
          const pct = c.total > 0 ? Math.round((c.sanos / c.total) * 100) : 0
          const rend = rendimiento(c)
          return [
            `Corral ${c.corral}`,
            c.total,
            `${pct}%`,
            c.critico || '—',
            c.alerta || '—',
            c.bajas || '—',
            rend.label,
          ]
        }),
        headStyles: { fillColor: [58, 125, 181], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 10 },
        columnStyles: {
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center' },
          6: { halign: 'center', fontStyle: 'bold' },
        },
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

    doc.save(`guachera-reportes-${mesActual}.pdf`)
  }

  if (loading) return <div className="loading">Cargando...</div>

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-left">
          <h2>Reportes</h2>
          <p>Analisis del mes actual</p>
        </div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={exportarPDF}>📄 Exportar PDF</button>
        </div>
      </div>

      <div className="stats-grid stats-3">
        <div className="stat-card c"><div className="stat-lbl">Prom. dias en guachera</div><div className="stat-val">{stats.promDias}</div><div className="stat-sub">hasta recria</div></div>
        <div className="stat-card r"><div className="stat-lbl">Tasa de mortalidad</div><div className="stat-val">{stats.mortalidad}<span style={{ fontSize: 18 }}>%</span></div><div className="stat-sub">este mes</div></div>
        <div className="stat-card v"><div className="stat-lbl">Animales a recria</div><div className="stat-val">{stats.recria}</div><div className="stat-sub">completaron la etapa</div></div>
      </div>

      {corralesData.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">Rendimiento por corral</span></div>
          <table className="tabla">
            <thead>
              <tr><th>Corral</th><th>Animales</th><th>% Sanos</th><th>Criticos</th><th>Alertas</th><th>Bajas mes</th><th>Rendimiento</th></tr>
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
