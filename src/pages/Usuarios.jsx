import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', pin: '' })
  const [error, setError] = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('establecimiento', 'tambo_1')
      .order('created_at')
    if (data) setUsuarios(data)
    setLoading(false)
  }

  async function guardar() {
    setError('')
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.')
    if (!/^\d{4}$/.test(form.pin)) return setError('El PIN debe ser exactamente 4 dígitos.')

    const pinExiste = usuarios.some(u => u.pin === form.pin)
    if (pinExiste) return setError('Ese PIN ya está en uso. Elegí otro.')

    setGuardando(true)
    const { error: err } = await supabase.from('usuarios').insert({
      nombre: form.nombre.trim(),
      pin: form.pin,
      activo: true,
      establecimiento: 'tambo_1',
    })
    setGuardando(false)

    if (err) return setError('Error al guardar: ' + err.message)
    setForm({ nombre: '', pin: '' })
    setMostrarForm(false)
    cargar()
  }

  async function toggleActivo(usuario) {
    await supabase
      .from('usuarios')
      .update({ activo: !usuario.activo })
      .eq('id', usuario.id)
    setUsuarios(prev =>
      prev.map(u => u.id === usuario.id ? { ...u, activo: !u.activo } : u)
    )
  }

  function cancelar() {
    setForm({ nombre: '', pin: '' })
    setError('')
    setMostrarForm(false)
  }

  if (loading) return <div className="loading">Cargando...</div>

  const activos = usuarios.filter(u => u.activo).length

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-left">
          <h2>Usuarios</h2>
          <p>{activos} operario{activos !== 1 ? 's' : ''} activo{activos !== 1 ? 's' : ''} · {usuarios.length} en total</p>
        </div>
        <div className="topbar-right">
          {!mostrarForm && (
            <button className="btn btn-primary" onClick={() => setMostrarForm(true)}>
              + Nuevo usuario
            </button>
          )}
        </div>
      </div>

      {/* Formulario nuevo usuario */}
      {mostrarForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Nuevo operario</span>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>NOMBRE</label>
              <input
                className="search-bar"
                style={{ width: 200 }}
                placeholder="Ej: Juan Pérez"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && guardar()}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>PIN (4 dígitos)</label>
              <input
                className="search-bar"
                style={{ width: 120 }}
                placeholder="1234"
                maxLength={4}
                value={form.pin}
                onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                onKeyDown={e => e.key === 'Enter' && guardar()}
              />
            </div>
            <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando...' : '✓ Guardar'}
            </button>
            <button className="btn" onClick={cancelar} style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              Cancelar
            </button>
          </div>
          {error && (
            <div style={{ padding: '8px 16px 12px', color: 'var(--rojo)', fontSize: 13 }}>
              ⚠ {error}
            </div>
          )}
        </div>
      )}

      {/* Lista de usuarios */}
      <div className="card">
        {usuarios.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👤</div>
            Sin operarios registrados
          </div>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>PIN</th>
                <th>Estado</th>
                <th>Desde</th>
                <th style={{ textAlign: 'center' }}>Acceso</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} style={{ opacity: u.activo ? 1 : 0.5 }}>
                  <td>
                    <strong>{u.nombre}</strong>
                    {u.pin === '1234' && u.nombre === 'Admin' && (
                      <span className="chip c" style={{ marginLeft: 8, fontSize: 10 }}>ADMIN</span>
                    )}
                  </td>
                  <td>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: 15,
                      letterSpacing: 4,
                      color: 'var(--text)',
                      fontWeight: 700
                    }}>
                      {u.pin}
                    </span>
                  </td>
                  <td>
                    <span className={`chip ${u.activo ? 'v' : 'g'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('es-AR') : '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div
                      onClick={() => toggleActivo(u)}
                      title={u.activo ? 'Desactivar' : 'Activar'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        width: 44,
                        height: 24,
                        borderRadius: 12,
                        background: u.activo ? 'var(--verde)' : 'var(--border)',
                        position: 'relative',
                        transition: 'background 0.2s',
                        flexShrink: 0,
                      }}
                    >
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: '#fff',
                        position: 'absolute',
                        left: u.activo ? 23 : 3,
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
