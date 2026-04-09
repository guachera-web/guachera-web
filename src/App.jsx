import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Corrales from './pages/Corrales'
import Animales from './pages/Animales'
import Animal from './pages/Animal'
import Alertas from './pages/Alertas'
import Tratamientos from './pages/Tratamientos'
import Recria from './pages/Recria'
import Balance from './pages/Balance'
import Reportes from './pages/Reportes'
import Usuarios from './pages/Usuarios'
import Imprimir from './pages/Imprimir'
import './App.css'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊', section: 'Principal' },
  { to: '/corrales', label: 'Corrales', icon: '🏠' },
  { to: '/animales', label: 'Animales', icon: '🐄' },
  { to: '/alertas', label: 'Alertas', icon: '⚠️', badge: true, section: 'Clínico' },
  { to: '/tratamientos', label: 'Tratamientos', icon: '💊' },
  { to: '/recria', label: 'Recría', icon: '🌾' },
  { to: '/balance', label: 'Balance', icon: '⚖️', section: 'Gestión' },
  { to: '/reportes', label: 'Reportes', icon: '📈' },
  { to: '/usuarios', label: 'Usuarios', icon: '👥', section: 'Administración' },
]

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon"><span>G</span></div>
            <h1>Guachera</h1>
            <p>Panel veterinario</p>
          </div>
          <nav className="sidebar-nav">
            {nav.map((item) => (
              <div key={item.to}>
                {item.section && <div className="nav-label">{item.section}</div>}
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="tambo-badge">
              <div className="tambo-avatar">T</div>
              <div className="tambo-info">
                <p>Tambo Saifica</p>
                <span><span className="sync-dot"></span> En línea</span>
              </div>
            </div>
          </div>
        </aside>
        <main className="main">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/corrales" element={<Corrales />} />
            <Route path="/animales" element={<Animales />} />
            <Route path="/animales/:id" element={<Animal />} />
            <Route path="/alertas" element={<Alertas />} />
            <Route path="/tratamientos" element={<Tratamientos />} />
            <Route path="/recria" element={<Recria />} />
            <Route path="/balance" element={<Balance />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/imprimir" element={<Imprimir />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
