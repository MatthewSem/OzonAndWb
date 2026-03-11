import ChatWidget from './ChatWidget';
import ClaimForm from './ClaimForm';
import './Landing.css';
import { useEffect, useState } from 'react';

export default function Landing() {
  const [active, setActive] = useState('top')
  const [open, setOpen] = useState(false)
  const [marketplace, setMarketplace] = useState("ozon");
  const [claimAttempts, setClaimAttempts] = useState(0);

  useEffect(() => {
    const sections = document.querySelectorAll('section')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id)
          }
        })
      },
      {
        threshold: 0.6,
      }
    )

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()

  }, [])
  

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : 'auto'
  }, [open])

  return (
    <div className="landing">
      <header className="landing-header">
        <nav>
          <span className="logo">Полезные чертежи</span>
          <div className='menu desktop'>
            <a href="#top" className={active === 'top' ? 'active admin-link' : 'admin-link'}>Главная</a>
            <a href="#steps" className={active === 'steps' ? 'active admin-link' : 'admin-link'}>Инструкция</a>
            <a href="#telegram" className={active === 'telegram' ? 'active admin-link' : 'admin-link'}>Подписаться</a>
          </div>

          <div
            className={`burger-landing ${open ? 'open' : ''}`}
            onClick={() => setOpen(!open)}
          >
            <span />
            <span />
            <span />
          </div>
        </nav>
      </header>

      {/* Затемнение */}
      <div
        className={`overlay ${open ? 'show' : ''}`}
        onClick={() => setOpen(false)}
      />

      {/* Мобильное меню */}
      <div className={`mobile-menu ${open ? 'open' : ''}`}>
        <a href="#top" onClick={() => setOpen(false)}>Главная</a>
        <a href="#steps" onClick={() => setOpen(false)}>Инструкция</a>
        <a href="#telegram" onClick={() => setOpen(false)}>Подписаться</a>
      </div>

      <div className='scroll-container'>
        <ChatWidget claimAttempts={claimAttempts}/>
        <main className="landing-main" >
          <section id="top">
            <h1>Получите свой цифровой продукт</h1>
            <p className="lead">
              Вы купили цифровой товар на Ozon или Wildberries?<br />
              Введите номер заказа ниже и получите ссылку на файл.
            </p>


            <ClaimForm setClaimAttempts={setClaimAttempts}/>
          </section>

          <section className="landing-steps-container" id="steps">

            
            {marketplace === "ozon" && (
              <div className="landing-steps">

                <div className="step">
                  <span className="step-num">1</span>
                  <h3>Найдите номер заказа Ozon</h3>
                  <p>Откройте в личном кабинете раздел «Заказы». Номер заказа указан в правом верхнем углу.</p>
                </div>

                <div className="step">
                  <span className="step-num">2</span>
                  <h3>Введите номер заказа</h3>
                  <p>Введите номер заказа Ozon в форму проверки.</p>
                </div>

                <div className="step">
                  <span className="step-num">3</span>
                  <h3>Получите ссылку на файл</h3>
                  <p>После проверки заказа появится ссылка на скачивание файла.</p>
                </div>

              </div>
            )}

            {marketplace === "wb" && (
              <div className="landing-steps">

                <div className="step">
                  <span className="step-num">1</span>
                  <h3>Отправьте скриншот покупки</h3>
                  <p>Пришлите скриншот покупки в чат техподдержки. На скриншоте должна быть видна дата выкупа (раздел «Покупки»).</p>
                </div>

                <div className="step">
                  <span className="step-num">2</span>
                  <h3>Дождитесь проверки</h3>
                  <p>Поддержка проверит покупку и подготовит ссылку на файл.</p>
                </div>

                <div className="step">
                  <span className="step-num">3</span>
                  <h3>Получите ссылку на файл</h3>
                  <p>После проверки поддержка отправит вам ссылку на скачивание файла</p>
                </div>

              </div>
            )}

            <div className="marketplace-switch">
              <button
                className={`marketplace-badge ozon ${marketplace === "ozon" ? "active" : ""}`}
                onClick={() => setMarketplace("ozon")}
              >
                Ozon
              </button>
              <button
                className={`marketplace-badge wb ${marketplace === "wb" ? "active" : ""}`}
                onClick={() => setMarketplace("wb")}
              >
                Wildberries
              </button>
            </div>
          </section>

          <section className="tg-section" id="telegram">
            <div className="tg-card">
              <div className="tg-content">
                <h3>📢 Больше полезных материалов в Telegram</h3>
                <p>
                  Новые чертежи, обновления и идеи для дачи публикуем в нашем канале.
                </p>
              </div>
              <a
                href="https://t.me/cherteji777"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                Перейти в канал
              </a>
            </div>
          </section>
        </main>

        <footer className="landing-footer">
          <p>Доступ выдаётся только по номеру реального заказа. Один заказ = одна выдача.</p>
        </footer>
      </div>
    </div>
  );
}
