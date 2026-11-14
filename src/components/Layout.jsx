import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  Layers,
  Package,
  FileText,
  Users,
  Tag,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/categories', label: 'Categories', icon: Layers },
  { to: '/brands', label: 'Brands', icon: Tag },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/boq', label: 'BOQ Bills', icon: FileText },
  { to: '/users', label: 'Users', icon: Users, adminOnly: true },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <div className={`overlay ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">OI</div>
          <div>
            <strong>Orange Interior</strong>
            <small>Admin Console</small>
          </div>
        </div>
        <nav>
          {links
            .filter((l) => !l.adminOnly || isAdmin)
            .map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <l.icon size={18} />
                {l.label}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-foot">
          <div>{user?.name}</div>
          <div className="role">{user?.role}</div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10, color: '#f0e6dc' }} onClick={onLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div>
            <strong style={{ fontFamily: 'var(--display)' }}>Interior Works Studio</strong>
            <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>BOQ · Catalog · Insights</div>
          </div>
          <div className="actions">
            <NavLink to="/boq/new" className="btn btn-primary btn-sm">
              + New BOQ
            </NavLink>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
