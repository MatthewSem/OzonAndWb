import { Routes, Route, Link } from 'react-router-dom';
import Landing from './pages/Landing';
import AdminLayout from './pages/Admin/AdminLayout';
import Products from './pages/Admin/Products';
import Orders from './pages/Admin/Orders';
import Logs from './pages/Admin/Logs';
import { ScrollToTop } from './ScrollRestoration';

function App() {
  return (
    <>
    <ScrollToTop />
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminIndex />} />
        <Route path="products" element={<Products />} />
        <Route path="orders" element={<Orders />} />
        <Route path="logs" element={<Logs />} />
      </Route>
    </Routes>
    </>
  );
}

function AdminIndex() {
  return (
    <div className="admin-dashboard">
      <h1>Обзор</h1>
      <div className="admin-cards">
        <Link to="/admin/products" className="admin-card">
          <h2>Товары</h2>
          <p>Название, ссылка, артикулы для Ozon и WB</p>
        </Link>
        <Link to="/admin/orders" className="admin-card">
          <h2>Заказы</h2>
          <p>Добавление и просмотр заказов</p>
        </Link>
        <Link to="/admin/logs" className="admin-card">
          <h2>Лог активаций</h2>
          <p>Кто получил доступ и когда</p>
        </Link>
      </div>
    </div>
  );
}

export default App;
