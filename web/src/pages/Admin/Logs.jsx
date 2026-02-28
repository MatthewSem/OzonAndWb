import { useState, useEffect } from 'react';

const API = '/api';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/activation-logs`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { setLogs(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const formatDate = (d) => d ? new Date(d).toLocaleString('ru') : '—';

  return (
    <div className='products-page'>
      <h1>Лог активаций</h1>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>Кто получил доступ по заказу и когда</p>

      {loading ? (
        <p className="muted">Загрузка…</p>
      ) : logs.length === 0 ? (
        <p className="muted">Активаций пока не было.</p>
      ) : (
        <div className='table-container'>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Номер заказа</th>
                  <th>Товар</th>
                  <th>ID пользователя</th>
                  <th>Источник</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td>{formatDate(l.activated_at)}</td>
                    <td><code>{l.order_number}</code></td>
                    <td>{l.product_name || '—'}</td>
                    <td>{l.telegram_user_id || '—'}</td>
                    <td>{l.telegram_username || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
