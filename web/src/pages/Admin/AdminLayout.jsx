import { useState, useEffect } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import Login from './Login';
import './Admin.css';
import { ScrollToTopAdmin } from '../../ScrollRestoration';

const API = '/api';

export default function AdminLayout() {
  const [authState, setAuthState] = useState('checking');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/auth/check`, { credentials: 'include' })
      .then((res) => res.ok ? setAuthState('loggedIn') : setAuthState('guest'))
      .catch(() => setAuthState('guest'));
  }, []);

  // Блокируем скролл только на мобильном при открытом меню
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [sidebarOpen]);

  const handleLogout = () => {
    fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }).then(() => {
      setAuthState('guest');
      navigate('/admin');
    });
  };

  if (authState === 'checking') {
    return (
      <div className="admin-layout">
        <div className="admin-content">Проверка доступа…</div>
      </div>
    );
  }

  if (authState === 'guest') {
    return <Login onSuccess={() => setAuthState('loggedIn')} />;
  }

  return (
    <div className="admin-layout">

      {/* Overlay (mobile only) */}
      <div
        className={`admin-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>

        <div className="admin-top">
          <button
            className="burger close-btn"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        <Link to="/" className="admin-back">
            На главную
          </Link>

        <nav className="admin-nav" onClick={() => setSidebarOpen(false)}>
          <NavLink to="/admin" end>Обзор</NavLink>
          <NavLink to="/admin/products">Товары</NavLink>
          <NavLink to="/admin/orders">Заказы</NavLink>
          <NavLink to="/admin/logs">Лог активаций</NavLink>
        </nav>

        <button
          type="button"
          className="admin-logout"
          onClick={handleLogout}
        >
          Выйти
        </button>
      </aside>

      <main className="admin-content" id='admin-content'>
        <ScrollToTopAdmin wait={100} />

        {/* Burger (mobile only) */}
        {!sidebarOpen && (
          <button
          className="burger floating"
          onClick={() => setSidebarOpen(true)}
          >
          ☰
          </button>
        )}
        

        <Outlet />
      </main>
    </div>
  );
}