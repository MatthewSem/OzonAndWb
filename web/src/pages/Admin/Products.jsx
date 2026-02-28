import { useState, useEffect } from 'react';
import './Products.css';

const API = '/api';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', link: '', marketplace_type: '', external_id: '' });

  const load = async () => {
    setLoading(true);
    const res = await fetch(`${API}/products`, { credentials: 'include' });
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const method = modal?.id ? 'PATCH' : 'POST';
    const url = modal?.id ? `${API}/products/${modal.id}` : `${API}/products`;
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(form),
    });
    setModal(null);
    setForm({ name: '', link: '', marketplace_type: '', external_id: '' });
    load();
  };

  const openEdit = (p) => {
    setModal({ id: p.id });
    setForm({ name: p.name, link: p.link, marketplace_type: p.marketplace_type || '', external_id: p.external_id || '' });
  };

  return (
    <div className="products-page">
      <div className="page-header">
        <h1>Товары</h1>
        <button className="btn btn-primary" onClick={() => {
          setModal({});
          setForm({ name: '', link: '', marketplace_type: '', external_id: '' });
        }}>
          + Добавить товар
        </button>
      </div>

      {loading ? (
        <p className="muted">Загрузка…</p>
      ) : products.length === 0 ? (
        <p className="muted">Товаров пока нет. Добавьте первый.</p>
      ) : (
        <div className='table-container'>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Название</th>
                  <th>Маркетплейс</th>
                  <th>Артикул (external_id)</th>
                  <th>Ссылка</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.name}</td>
                    <td>{p.marketplace_type || '—'}</td>
                    <td>{p.external_id || '—'}</td>
                    <td><a href={p.link} target="_blank" rel="noreferrer">{p.link.slice(0, 40)}…</a></td>
                    <td><button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Изменить</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal !== null && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal.id ? 'Редактировать товар' : 'Новый товар'}</h2>
            <form onSubmit={submit}>
              <div className="form-row">
                <label>Название</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-row">
                <label>Ссылка (Яндекс.Диск и т.п.)</label>
                <input type="url" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} required />
              </div>
              <div className="form-row">
                <label>Маркетплейс (ozon / wildberries)</label>
                <select value={form.marketplace_type} onChange={(e) => setForm({ ...form, marketplace_type: e.target.value })}>
                  <option value="">—</option>
                  <option value="ozon">Ozon</option>
                  <option value="wildberries">Wildberries</option>
                </select>
              </div>
              <div className="form-row">
                <label>Артикул для автопривязки</label>
                <input value={form.external_id} onChange={(e) => setForm({ ...form, external_id: e.target.value })} placeholder="offer_id / supplierArticle" />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Отмена</button>
                <button type="submit" className="btn btn-primary">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
