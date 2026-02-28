import { useEffect, useState } from 'react';
import './ClaimForm.css';

const API = '/api';

export default function ClaimForm() {
  const [marketplace, setMarketplace] = useState('ozon');
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('claim_access');
    if (saved) {
      setResult(JSON.parse(saved));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const num = orderNumber.trim();
    if (!num) return;

    setLoading(true);

    // Временно сохраняем старый результат, чтобы блок не исчезал мгновенно
    const previousResult = result;

    // Очищаем результат сразу не нужно, просто можно слегка затушевать
    setResult(null);

    try {
      const checkRes = await fetch(`${API}/claim/check-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: num }),
      });
      const check = await checkRes.json();

      // Добавляем искусственную задержку
      setTimeout(() => {
        if (!check.found) {
          setResult({ type: 'error', message: 'Заказ не найден. Проверьте номер и попробуйте снова.' });
          setLoading(false);
          return;
        }

        if (check.activated) {
          setResult({ type: 'warning', message: 'Доступ по этому заказу уже был выдан ранее.' });
          setLoading(false);
          return;
        }

        if (!check.has_link) {
          setResult({ type: 'error', message: 'У этого заказа не привязан товар. Обратитесь в поддержку.' });
          setLoading(false);
          return;
        }

        // Активация заказа
        fetch(`${API}/claim/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: check.order_id, source: 'web' }),
        })
          .then(res => res.json())
          .then(activate => {
            if (!activate.success) {
              setResult({ type: 'warning', message: activate.message || 'Не удалось выдать доступ.' });
            } else {
              const successData = {
                type: 'success',
                product_name: activate.product_name,
                link: activate.link,
              };
              setResult(successData);
              localStorage.setItem('claim_access', JSON.stringify(successData));
            }
            setLoading(false);
          });

      }, 800); // задержка 800 мс, можно настроить
    } catch (err) {
      setTimeout(() => {
        setResult({ type: 'error', message: 'Ошибка соединения. Попробуйте позже.' });
        setLoading(false);
      }, 800);
    }
  };

  return (
    <div className="claim-form-block">
      <h2>Получить доступ</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label>Маркетплейс</label>
          <select value={marketplace} onChange={(e) => setMarketplace(e.target.value)}>
            <option value="ozon">Ozon</option>
            <option value="wildberries">Wildberries</option>
          </select>
        </div>
        <div className="form-row">
          <label>Номер заказа</label>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Например: 12345-678901"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Проверка…' : 'Получить ссылку'}
        </button>
      </form>


      {result && (
        <div className={`claim-result claim-result--${result.type}`}>
          {result.type === 'success' ? (
            <>
              <p className="claim-result-title">✅ Доступ выдан!</p>
              <p className="claim-result-product">{result.product_name}</p>
              <a href={result.link} target="_blank" rel="noreferrer" className="claim-link">
                Открыть ссылку на файл →
              </a>
            </>
          ) : (
            <p>{result.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
