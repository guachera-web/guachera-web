import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const TIPOS = [
  { value: 'descorne', label: '🔪 Descorne', color: '#E07B00' },
  { value: 'vacunacion', label: '💉 Vacunación', color: '#2D6A4F' },
  { value: 'recria', label: '🌾 Recría', color: '#1A6EA8' },
  { value: 'desparasitacion', label: '🧪 Desparasitación', color: '#8B5CF6' },
  { value: 'revision', label: '🔍 Revisión', color: '#E07B00' },
  { value: 'general', label: '📋 General', color: '#888' },
]

function colorTipo(tipo) {
  return TIPOS.find(t => t.value === tipo)?.color || '#888'
}
function labelTipo(tipo) {
  return TIPOS.find(t => t.value === tipo)?.label || tipo
}

export default function Calendario() {
  const [tareas, setTareas] = useState([])
  const [corrales, setCorrales] = useState([])
  const [animales, setAnimales] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [mesActual, setMesActual] = useState(new Date())
  const [diaSeleccionado, setDiaSeleccionado] = useState(null)
  const [filtro, setFiltro] = useState('pendientes')

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    titulo: '',
    descripcion: '',
    tipo: 'general',
    asignacion: 'todos', // 'todos', 'corral', 'animal'
    corral: '',
    ternero_id: '',
    caravana: '',
  })

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const [{ data: t }, { data: terneros }] = await Promise.all([
      supabase.from('tareas').select('*').eq('establecimiento', 'tambo_1').order('fecha'),
      supabase.from('terneros').select('id, caravana, corral').eq('establecimiento', 'tambo_1')
        .is('fecha_baja', null).is('fecha_recria', null).order('corral'),
    ])
    if (t) setTareas(t)
    if (terneros) {
      setAnimales(terneros)
      const cs = [...new Set(terneros.map(a => a.corral))].sort()
      setCorrales(cs)
    }
    setLoading(false)
  }

  async function guardar() {
    if (!form.titulo.trim()) return
    if (!form.fecha) return
    setGuardando(true)

    const payload = {
      fecha: form.fecha,
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      tipo: form.tipo,
      todos: form.asignacion === 'todos',
      corral: form.asignacion === 'corral' ? form.corral : null,
      ternero_id: form.asignacion === 'animal' ? parseInt(form.ternero_id) || null : null,
      caravana: form.asignacion === 'animal' ? form.caravana : null,
      completada: false,
      establecimiento: 'tambo_1',
    }

    await supabase.from('tareas').insert(payload)
    setForm({
      fecha: new Date().toISOString().split('T')[0],
      titulo: '', descripcion: '', tipo: 'general',
      asignacion: 'todos', corral: '', ternero_id: '', caravana: '',
    })
    setMostrarForm(false)
    setGuardando(false)
    cargar()
  }

  async function toggleCompletada(tarea) {
    await supabase.from('tareas').update({ completada: !tarea.completada }).eq('id', tarea.id)
    setTareas(prev => prev.map(t => t.id === tarea.id ? { ...t, completada: !t.completada } : t))
  }

  async function eliminar(id) {
    await supabase.from('tareas').delete().eq('id', id)
    setTareas(prev => prev.filter(t => t.id !== id))
  }

  // Calendario
  function diasDelMes() {
    const year = mesActual.getFullYear()
    const month = mesActual.getMonth()
    const primer = new Date(year, month, 1)
    const ultimo = new Date(year, month + 1, 0)
    const dias = []
    // Padding inicio (lunes = 0)
    let dow = primer.getDay()
    dow = dow === 0 ? 6 : dow - 1
    for (let i = 0; i < dow; i++) dias.push(null)
    for (let d = 1; d <= ultimo.getDate(); d++) dias.push(d)
    return dias
  }

  function tareasDelDia(dia) {
    if (!dia) return []
    const key = `${mesActual.getFullYear()}-${String(mesActual.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    return tareas.filter(t => t.fecha === key)
  }

  function fmtFecha(str) {
    if (!str) return '—'
    const [y, m, d] = str.split('-')
    return `${d}/${m}/${y}`
  }

  function asignacionLabel(t) {
    if (t.todos) return 'Todos los animales'
    if (t.corral) return `Corral ${t.corral}`
    if (t.caravana) return `Caravana ${t.caravana}`
    return '—'
  }

  const hoy = new Date().toISOString().split('T')[0]
  const mesLabel = mesActual.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  const tareasFiltradas = tareas.filter(t => {
    if (filtro === 'pendientes') return !t.completada
    if (filtro === 'hoy') return t.fecha === hoy && !t.completada
    if (filtro === 'completadas') return t.completada
    return true
  })

  const tareasHoy = tareas.filter(t => t.fecha === hoy && !t.completada)

  if (loading) return <div className="loading">Cargando...</div>

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-left">
          <h2>Calendario de tareas</h2>
          <p>{tareasHoy.length > 0 ? `${tareasHoy.length} tarea${tareasHoy.length !== 1 ? 's' : ''} para hoy` : 'Sin tareas para hoy'}</p>
        </div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => setMostrarForm(true)}>+ Nueva tarea</button>
        </div>
      </div>

      {/* Tareas de hoy */}
      {tareasHoy.length > 0 && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fff8f0', border: '1px solid var(--naranja)', borderRadius: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--naranja)', marginBottom: 8 }}>📅 Tareas de hoy</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tareasHoy.map(t => (
              <div key={t.id} style={{ background: 'white', border: `1px solid ${colorTipo(t.tipo)}`, borderRadius: 8, padding: '6px 12px', fontSize: 13 }}>
                <span style={{ color: colorTipo(t.tipo), fontWeight: 700 }}>{labelTipo(t.tipo)}</span>
                {' · '}{t.titulo}
                {' · '}<span style={{ color: 'var(--muted)' }}>{asignacionLabel(t)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulario nueva tarea */}
      {mostrarForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Nueva tarea</span>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>FECHA</label>
                <input type="date" className="search-bar" value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>TÍTULO</label>
                <input className="search-bar" placeholder="Ej: Vacunación IBR" value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>TIPO</label>
                <select className="search-bar" value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>DESCRIPCIÓN (opcional)</label>
              <input className="search-bar" placeholder="Detalles adicionales..." value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>ASIGNAR A</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { value: 'todos', label: '🐄 Todos' },
                  { value: 'corral', label: '🏠 Corral' },
                  { value: 'animal', label: '🏷️ Animal' },
                ].map(op => (
                  <button key={op.value} onClick={() => setForm(f => ({ ...f, asignacion: op.value }))}
                    className="btn" style={{
                      background: form.asignacion === op.value ? '#1A6EA8' : 'var(--bg)',
                      color: form.asignacion === op.value ? '#fff' : 'var(--text)',
                      border: `1px solid ${form.asignacion === op.value ? '#1A6EA8' : 'var(--border)'}`,
                    }}>
                    {op.label}
                  </button>
                ))}
              </div>
              {form.asignacion === 'corral' && (
                <select className="search-bar" value={form.corral}
                  onChange={e => setForm(f => ({ ...f, corral: e.target.value }))}>
                  <option value="">Seleccioná un corral</option>
                  {corrales.map(c => <option key={c} value={c}>Corral {c}</option>)}
                </select>
              )}
              {form.asignacion === 'animal' && (
                <select className="search-bar" value={form.ternero_id}
                  onChange={e => {
                    const animal = animales.find(a => a.id === parseInt(e.target.value))
                    setForm(f => ({ ...f, ternero_id: e.target.value, caravana: animal?.caravana || '' }))
                  }}>
                  <option value="">Seleccioná un animal</option>
                  {animales.map(a => <option key={a.id} value={a.id}>Caravana {a.caravana} — Corral {a.corral}</option>)}
                </select>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : '✓ Guardar'}
              </button>
              <button className="btn" onClick={() => setMostrarForm(false)}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="two-col">
        {/* Calendario visual */}
        <div className="card">
          <div className="card-header">
            <button onClick={() => setMesActual(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '0 8px' }}>‹</button>
            <span className="card-title" style={{ textTransform: 'capitalize' }}>{mesLabel}</span>
            <button onClick={() => setMesActual(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '0 8px' }}>›</button>
          </div>
          <div style={{ padding: '8px 12px 16px' }}>
            {/* Cabecera días */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted)', padding: '4px 0' }}>{d}</div>
              ))}
            </div>
            {/* Días */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {diasDelMes().map((dia, i) => {
                if (!dia) return <div key={`empty-${i}`} />
                const tareasDia = tareasDelDia(dia)
                const keyDia = `${mesActual.getFullYear()}-${String(mesActual.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
                const esHoy = keyDia === hoy
                const seleccionado = diaSeleccionado === keyDia
                return (
                  <div key={dia} onClick={() => setDiaSeleccionado(seleccionado ? null : keyDia)}
                    style={{
                      padding: '6px 4px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                      background: seleccionado ? '#1A6EA8' : esHoy ? '#EBF4FB' : 'transparent',
                      border: esHoy ? '1px solid #1A6EA8' : '1px solid transparent',
                      transition: 'all 0.1s',
                    }}>
                    <div style={{ fontSize: 13, fontWeight: esHoy ? 800 : 400, color: seleccionado ? '#fff' : esHoy ? '#1A6EA8' : 'var(--text)' }}>{dia}</div>
                    {tareasDia.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2, flexWrap: 'wrap' }}>
                        {tareasDia.slice(0, 3).map((t, idx) => (
                          <div key={idx} style={{ width: 6, height: 6, borderRadius: '50%', background: t.completada ? '#ccc' : colorTipo(t.tipo) }} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Tareas del día seleccionado */}
            {diaSeleccionado && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>
                  {fmtFecha(diaSeleccionado)}
                </div>
                {tareasDelDia(parseInt(diaSeleccionado.split('-')[2])).length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Sin tareas este día</div>
                ) : tareasDelDia(parseInt(diaSeleccionado.split('-')[2])).map(t => (
                  <div key={t.id} style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ color: colorTipo(t.tipo), fontWeight: 700 }}>{labelTipo(t.tipo)}</span>
                      {' · '}{t.titulo}
                    </div>
                    <span style={{ color: 'var(--muted)', fontSize: 11 }}>{asignacionLabel(t)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lista de tareas */}
        <div>
          <div className="filter-tabs" style={{ marginBottom: 12 }}>
            {[
              { key: 'hoy', label: `Hoy (${tareas.filter(t => t.fecha === hoy && !t.completada).length})` },
              { key: 'pendientes', label: `Pendientes (${tareas.filter(t => !t.completada).length})` },
              { key: 'completadas', label: `Completadas (${tareas.filter(t => t.completada).length})` },
            ].map(f => (
              <div key={f.key} className={`filter-tab${filtro === f.key ? ' active' : ''}`} onClick={() => setFiltro(f.key)}>
                {f.label}
              </div>
            ))}
          </div>

          <div className="card">
            {tareasFiltradas.length === 0 ? (
              <div className="empty"><div className="empty-icon">📅</div>Sin tareas</div>
            ) : tareasFiltradas.map(t => (
              <div key={t.id} style={{
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'flex-start', gap: 12,
                opacity: t.completada ? 0.5 : 1,
                borderLeft: `3px solid ${colorTipo(t.tipo)}`,
              }}>
                <input type="checkbox" checked={t.completada} onChange={() => toggleCompletada(t)}
                  style={{ marginTop: 2, cursor: 'pointer', width: 16, height: 16, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14, textDecoration: t.completada ? 'line-through' : 'none' }}>
                        {t.titulo}
                      </span>
                      <span className="chip" style={{ marginLeft: 8, fontSize: 10, background: colorTipo(t.tipo) + '22', color: colorTipo(t.tipo), border: 'none' }}>
                        {labelTipo(t.tipo)}
                      </span>
                    </div>
                    <button onClick={() => eliminar(t.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, padding: 0, flexShrink: 0 }}>
                      ×
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                    📅 {fmtFecha(t.fecha)} · {asignacionLabel(t)}
                  </div>
                  {t.descripcion && (
                    <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 4, fontStyle: 'italic' }}>
                      {t.descripcion}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
