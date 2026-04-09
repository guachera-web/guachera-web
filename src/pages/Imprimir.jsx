import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Imprimir() {
  const [animales, setAnimales] = useState([])
  const [tratamientos, setTratamientos] = useState([])
  const [corralesDisponibles, setCorrelesDisponibles] = useState([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState(['CRÍTICO', 'ALERTA', 'EN TRATAMIENTO'])
  const [filtroCorral, setFiltroCorral] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  const hoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)

    const [{ data: terneros }, { data: trats }, { data: detalles }, { data: meds }] = await Promise.all([
      supabase.from('terneros').select('*').eq('establecimiento', 'tambo_1'),
      supabase.from('tratamientos').select('*').eq('establecimiento', 'tambo_1'),
      supabase.from('tratamiento_detalle').select('*').eq('establecimiento', 'tambo_1'),
      supabase.from('medicamentos').select('*').eq('establecimiento', 'tambo_1'),
    ])

    if (terneros) {
      const activos = terneros.filter(t => !t.fecha_baja && !t.fecha_recria)
      setAnimales(activos)
      const corrales = [...new Set(activos.map(t => t.corral))].sort()
      setCorrelesDisponibles(corrales)
    }

    if (trats && detalles && meds) {
      const hoyDate = new Date()
      hoyDate.setHours(0, 0, 0, 0)
      const medsMap = {}
      meds.forEach(m => { medsMap[m.id] = m })

      const activos = trats.filter(t => {
        if (!t.fecha_fin) return false
        const fin = new Date(t.fecha_fin)
        return fin >= hoyDate
      })

      setTratamientos(activos.map(t => ({
        ...t,
        detalles: detalles
          .filter(d => d.tratamiento_id === t.id)
          .map(d => ({ ...d, medicamento: medsMap[d.medicamento_id] }))
      })))
    }

    setLoading(false)
  }

  function toggleEstado(estado) {
    setFiltroEstado(prev =>
      prev.includes(estado) ? prev.filter(e => e !== estado) : [...prev, estado]
    )
  }

  function medLabel(terneroId) {
    const trat = tratamientos.find(t => t.ternero_id === terneroId)
    if (!trat || !trat.detalles?.length) return '—'
    return trat.detalles.map(d => {
      const nombre = d.medicamento?.nombre || '—'
      const dosis = d.dosis ? `${d.dosis} ${d.unidad || ''}`.trim() : ''
      return dosis ? `${nombre} ${dosis}` : nombre
    }).join(', ')
  }

  function diasRestantes(terneroId) {
    const trat = tratamientos.find(t => t.ternero_id === terneroId)
    if (!trat?.fecha_fin) return '—'
    const fin = new Date(trat.fecha_fin)
    const hoyDate = new Date()
    hoyDate.setHours(0, 0, 0, 0)
    return Math.ceil((fin - hoyDate) / 86400000)
  }

  function diasDeVida(fn) {
    if (!fn) return '—'
    return Math.floor((new Date() - new Date(fn)) / 86400000)
  }

  const lista = animales
    .filter(a => filtroEstado.includes(a.estado))
    .filter(a => filtroCorral === 'todos' || a.corral === filtroCorral)
    .filter(a => !busqueda || a.caravana?.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => {
      const order = { 'CRÍTICO': 0, 'ALERTA': 1, 'EN TRATAMIENTO': 2 }
      const diff = (order[a.estado] ?? 3) - (order[b.estado] ?? 3)
      if (diff !== 0) return diff
      return a.corral?.localeCompare(b.corral)
    })

  const estadoLabel = {
    'CRÍTICO': { icon: '🔴', color: '#c0392b', bg: '#fde8e8' },
    'ALERTA': { icon: '⚠️', color: '#e07b00', bg: '#fef3e2' },
    'EN TRATAMIENTO': { icon: '💊', color: '#1a6ea8', bg: '#e8f4fd' },
  }

  if (loading) return <div style={{ padding: 32, fontFamily: 'sans-serif' }}>Cargando...</div>

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f3ee; margin: 0; }
        @media print { body { background: white; } }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #1a6ea8; color: white; padding: 7px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 7px 10px; border-bottom: 1px solid #e5e3de; }
        tr:nth-child(even) td { background: #f9f8f5; }
        .empty-row td { color: #aaa; font-style: italic; text-align: center; padding: 16px; }
      `}</style>

      {/* Panel de filtros — no se imprime */}
      <div className="no-print" style={{ background: 'white', borderBottom: '1px solid #e5e3de', padding: '16px 32px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>

        <button onClick={() => window.history.back()}
          style={{ background: 'none', border: '1px solid #e5e3de', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
          ← Volver
        </button>

        <div style={{ fontWeight: 700, fontSize: 13, color: '#888', marginLeft: 4 }}>FILTRAR:</div>

        {/* Toggle estados */}
        {['CRÍTICO', 'ALERTA', 'EN TRATAMIENTO'].map(e => {
          const { icon, color, bg } = estadoLabel[e]
          const activo = filtroEstado.includes(e)
          return (
            <div key={e} onClick={() => toggleEstado(e)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: `2px solid ${activo ? color : '#e5e3de'}`, background: activo ? bg : 'white', color: activo ? color : '#aaa', userSelect: 'none' }}>
              {icon} {e}
            </div>
          )
        })}

        {/* Selector corral */}
        <select value={filtroCorral} onChange={e => setFiltroCorral(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e3de', fontSize: 13, background: 'white', cursor: 'pointer' }}>
          <option value="todos">Todos los corrales</option>
          {corralesDisponibles.map(c => (
            <option key={c} value={c}>Corral {c}</option>
          ))}
        </select>

        {/* Buscar caravana */}
        <input
          placeholder="🔍 Buscar caravana..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e3de', fontSize: 13, width: 180 }}
        />

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#888' }}>{lista.length} animales</span>
          <button onClick={() => window.print()}
            style={{ background: '#1a6ea8', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {/* Hoja imprimible */}
      <div style={{ maxWidth: 900, margin: '24px auto', padding: '24px 32px', background: 'white', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, borderBottom: '3px solid #1a6ea8', paddingBottom: 14 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#1a6ea8', letterSpacing: -0.5 }}>GUACHERA</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
              Tambo Saifica — {filtroCorral === 'todos' ? 'Todos los corrales' : `Corral ${filtroCorral}`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{hoy}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{lista.length} animales</div>
          </div>
        </div>

        {/* Tabla única ordenada por estado */}
        {lista.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#aaa', fontSize: 14 }}>
            Sin animales con los filtros seleccionados
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Estado</th>
                <th>Caravana</th>
                <th>Corral</th>
                <th>Días de vida</th>
                <th>Medicamento · Dosis</th>
                <th>Días trat.</th>
                <th>Observaciones</th>
                <th style={{ width: 28 }}>✓</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(a => {
                const { icon, color } = estadoLabel[a.estado] || { icon: '', color: '#333' }
                return (
                  <tr key={a.id}>
                    <td>
                      <span style={{ color, fontWeight: 700, fontSize: 12 }}>
                        {icon} {a.estado}
                      </span>
                    </td>
                    <td><strong>{a.caravana}</strong></td>
                    <td>Corral {a.corral}</td>
                    <td>{diasDeVida(a.fecha_nacimiento)}d</td>
                    <td style={{ fontSize: 11 }}>{a.estado === 'EN TRATAMIENTO' ? medLabel(a.id) : '—'}</td>
                    <td>{a.estado === 'EN TRATAMIENTO' ? `${diasRestantes(a.id)}d` : '—'}</td>
                    <td></td>
                    <td></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Footer */}
        <div style={{ marginTop: 30, paddingTop: 12, borderTop: '1px solid #e5e3de', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa' }}>
          <span>guachera-vercel.app</span>
          <span>Generado el {new Date().toLocaleDateString('es-AR')}</span>
        </div>
      </div>
    </>
  )
}
