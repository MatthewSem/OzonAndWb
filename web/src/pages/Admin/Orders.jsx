import { useState, useEffect } from 'react';
import './Orders.css';

const API = '/api';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [search, setSearch] = useState('');
  const [marketplace, setMarketplace] = useState('');
  const [form, setForm] = useState({ order_number: '', product_id: '', marketplace: 'ozon' });
  const [bulkText, setBulkText] = useState('');
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (marketplace) params.set('marketplace', marketplace);
    const [ordersRes, productsRes] = await Promise.all([
      fetch(`${API}/orders?${params}`, { credentials: 'include' }),
      fetch(`${API}/products`, { credentials: 'include' }),
    ]);
    const ordersData = await ordersRes.json();
    const productsData = await productsRes.json();
    setOrders(Array.isArray(ordersData) ? ordersData : []);
    setProducts(Array.isArray(productsData) ? productsData : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, marketplace]);

  const submit = async (e) => {
    e.preventDefault();
    await fetch(`${API}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...form, product_id: form.product_id || null }),
    });
    setModal(false);
    setForm({ order_number: '', product_id: '', marketplace: 'ozon' });
    load();
  };

  const submitBulk = async (e) => {
    e.preventDefault();
    const lines = bulkText.trim().split(/\n/).filter(Boolean);
    const items = lines.map((line) => {
      const parts = line.split(/\s+/);
      const order_number = parts[0];
      const product_id = parts[1] ? parseInt(parts[1]) : null;
      const marketplace = parts[2] || 'ozon';
      return { order_number, product_id, marketplace };
    });
    await fetch(`${API}/orders/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(items),
    });
    setBulkMode(false);
    setBulkText('');
    load();
  };

  // 🔄 Синхронизация маркетплейсов
  const syncOrders = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/orders/sync`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      alert(`Синхронизация завершена!\nOzon: ${data.ozon_new_orders || 0}\nWB: ${data.wb_new_orders || 0}`);
      load();
    } catch (e) {
      alert('Ошибка при синхронизации: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('ru') : '—';

  return (
    <div className="products-page">
      <div className="page-header">
        <h1>Заказы</h1>
        <div className="header-actions">
          {/* <button className="btn btn-secondary" onClick={() => setBulkMode(true)}>Массовое добавление</button> */}
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Добавить заказ</button>
          <button
            className="btn btn-secondary"
            onClick={syncOrders}
            disabled={syncing}
            style={{ marginLeft: '0.5rem' }}
          >
            {syncing ? 'Синхронизация…' : 'Синхронизировать'}
          </button>
        </div>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Поиск по номеру"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={marketplace} onChange={(e) => setMarketplace(e.target.value)}>
          <option value="">Все маркетплейсы</option>
          <option value="ozon">Ozon</option>
          <option value="wildberries">Wildberries</option>
        </select>
      </div>

      {loading ? (
        <p className="muted">Загрузка…</p>
      ) : orders.length === 0 ? (
        <p className="muted">Заказов нет.</p>
      ) : (
        <div className='table-container'>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Номер заказа</th>
                  <th>Товар</th>
                  <th>Маркетплейс</th>
                  <th>Активирован</th>
                  <th>Создан</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td><code>{o.order_number}</code></td>
                    <td>{o.product_name || '—'}</td>
                    <td>{o.marketplace}</td>
                    <td><span className={`badge ${o.was_activated ? 'success' : 'warning'}`}>{o.was_activated ? 'Да' : 'Нет'}</span></td>
                    <td>{formatDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Новый заказ</h2>
            <form onSubmit={submit}>
              <div className="form-row">
                <label>Номер заказа</label>
                <input value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} required />
              </div>
              <div className="form-row">
                <label>Товар</label>
                <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
                  <option value="">— Не привязан</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>Маркетплейс</label>
                <select value={form.marketplace} onChange={(e) => setForm({ ...form, marketplace: e.target.value })}>
                  <option value="ozon">Ozon</option>
                  <option value="wildberries">Wildberries</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary">Добавить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {bulkMode && (
        <div className="modal-overlay" onClick={() => setBulkMode(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2>Массовое добавление</h2>
            <p className="muted mb">Формат: номер_заказа [product_id] [marketplace]. Одна строка — один заказ.</p>
            <form onSubmit={submitBulk}>
              <div className="form-row">
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={12}
                  placeholder={'12345-678901 1 ozon\n98765-432100 2 wildberries'}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setBulkMode(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary">Добавить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
