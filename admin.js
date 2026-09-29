/* 8. Админка: сводка продаж, прогноз дохода, водители, брони, возвраты, управление данными.
   Пароль ниже защищает только от случайных заходов. Настоящая защита возможна только на сервере. */
'use strict';
const Admin = (() => {
  const PASS = 'keruen';
  let unlocked = sessionStorage.getItem('keruen_admin') === '1';

  function renderGate(el, rerender) {
    el.innerHTML = `
      <div class="page-head"><div><h2>Админка</h2><p>Только для команды Керуен.</p></div></div>
      <div class="panel">
        <div class="field"><label for="a-pass">Пароль</label><input id="a-pass" type="password" autocomplete="current-password"></div>
        <p class="error" id="a-err" role="alert"></p>
        <button class="btn" id="a-go">Войти</button>
      </div>`;
    const go = () => {
      if (el.querySelector('#a-pass').value === PASS) { unlocked = true; sessionStorage.setItem('keruen_admin', '1'); rerender(); }
      else el.querySelector('#a-err').textContent = 'Неверный пароль.';
    };
    el.querySelector('#a-go').addEventListener('click', go);
    el.querySelector('#a-pass').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }

  function forecastHtml() {
    return `
      <div class="panel">
        <h3>Прогноз дохода Керуен в месяц</h3>
        <div class="row">
          <div class="field"><label for="f-dr">Водителей</label><input id="f-dr" type="number" min="1" value="6"></div>
          <div class="field"><label for="f-tr">Рейсов в неделю у каждого</label><input id="f-tr" type="number" min="1" value="7"></div>
          <div class="field"><label for="f-se">Мест в машине</label><input id="f-se" type="number" min="1" value="14"></div>
          <div class="field"><label for="f-fi">Заполнение, %</label><input id="f-fi" type="number" min="1" max="100" value="60"></div>
          <div class="field"><label for="f-pr">Цена билета, ₸</label><input id="f-pr" type="number" min="500" step="500" value="9000"></div>
        </div>
        <p id="f-out" class="price" style="font-size:1.2rem" aria-live="polite"></p>
      </div>`;
  }

  function render(el) {
    if (!unlocked) { renderGate(el, () => render(el)); return; }
    const db = Launch.db;
    const s = Launch.stats();
    const bookings = [...db.bookings].reverse().slice(0, 20);

    el.innerHTML = `
      <div class="page-head"><div><h2>Админка</h2><p>Комиссия ${Commission.RATE * 100}% с каждого билета.</p></div>
        <button class="btn ghost small" id="a-lock">Выйти</button></div>
      <div class="stats">
        <div class="stat hl"><b>${Launch.money(s.income)}</b><span>Доход Керуен (комиссия)</span></div>
        <div class="stat"><b>${Launch.money(s.gmv)}</b><span>Оборот билетов</span></div>
        <div class="stat"><b>${s.tickets}</b><span>Продано мест</span></div>
        <div class="stat"><b>${s.bookings}</b><span>Покупок</span></div>
        <div class="stat"><b>${s.drivers}</b><span>Активных водителей</span></div>
        <div class="stat"><b>${s.trips}</b><span>Рейсов в базе</span></div>
      </div>
      ${forecastHtml()}
      <div class="panel">
        <h3>Водители</h3>
        ${db.drivers.length ? `<div class="tablewrap"><table>
          <thead><tr><th>Имя</th><th>Телефон</th><th>Машина</th><th>Статус</th><th>К выплате</th><th></th></tr></thead>
          <tbody>${db.drivers.map(d => `<tr>
            <td>${Launch.esc(d.name)}</td><td class="mono">${Launch.esc(d.phone)}</td><td>${Launch.esc(d.car)}, ${d.seats}</td>
            <td><span class="tag ${d.status === 'active' ? 'on' : 'off'}">${d.status === 'active' ? 'Активен' : 'Заблокирован'}</span></td>
            <td class="mono">${Launch.money(Commission.balance(d.id))}</td>
            <td><button class="btn ghost small" data-toggle="${d.id}">${d.status === 'active' ? 'Заблокировать' : 'Разблокировать'}</button></td></tr>`).join('')}</tbody>
        </table></div>` : `<p class="empty">Водителей нет. Добавьте первого ниже.</p>`}
      </div>
      <div class="panel">
        <h3>Добавить водителя и рейсы на 7 дней</h3>
        <div class="row">
          <div class="field"><label for="w-name">Имя</label><input id="w-name"></div>
          <div class="field"><label for="w-phone">Телефон</label><input id="w-phone" type="tel"></div>
          <div class="field"><label for="w-car">Машина</label><input id="w-car" placeholder="Toyota Hiace"></div>
          <div class="field"><label for="w-seats">Мест</label><input id="w-seats" type="number" min="4" max="60" value="14"></div>
          <div class="field"><label for="w-from">Откуда</label><select id="w-from">${Launch.cities.map(c => `<option>${c}</option>`).join('')}</select></div>
          <div class="field"><label for="w-to">Куда</label><select id="w-to">${Launch.cities.map((c, i) => `<option${i === 1 ? ' selected' : ''}>${c}</option>`).join('')}</select></div>
          <div class="field"><label for="w-price">Цена места, ₸</label><input id="w-price" type="number" min="500" step="100" value="9000"></div>
          <div class="field"><label for="w-times">Время выезда через запятую</label><input id="w-times" value="20:00"></div>
        </div>
        <p class="error" id="w-err" role="alert"></p>
        <button class="btn" id="w-add">Добавить</button>
      </div>
      <div class="panel">
        <h3>Последние покупки</h3>
        ${bookings.length ? `<div class="tablewrap"><table>
          <thead><tr><th>Код</th><th>Пассажир</th><th>Рейс</th><th>Места</th><th>Сумма</th><th>Комиссия</th><th></th></tr></thead>
          <tbody>${bookings.map(b => { const t = db.trips.find(x => x.id === b.tripId); return `<tr>
            <td class="mono">${b.code}</td><td>${Launch.esc(b.name)}</td><td>${t ? `${t.from} — ${t.to}, ${Launch.dateLabel(t.date)}` : ''}</td>
            <td>${b.seats.join(', ')}</td><td class="mono">${Launch.money(b.total)}</td><td class="mono">${Launch.money(b.commission)}</td>
            <td>${b.status === 'paid' ? `<button class="btn danger small" data-refund="${b.code}">Вернуть</button>` : '<span class="tag">Возвращён</span>'}</td></tr>`; }).join('')}</tbody>
        </table></div>` : `<p class="empty">Покупок пока нет.</p>`}
      </div>
      <div class="panel">
        <h3>Данные</h3>
        <p class="muted" style="margin-bottom:12px">Данные хранятся в этом браузере. Перед питчем очистите тестовые покупки и заведите реальных водителей.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn ghost" id="a-demo">Загрузить тестовых водителей</button>
          <button class="btn danger" id="a-clear">Очистить всё</button>
        </div>
      </div>`;

    const q = sel => el.querySelector(sel);
    q('#a-lock').addEventListener('click', () => { unlocked = false; sessionStorage.removeItem('keruen_admin'); render(el); });
    el.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => {
      const d = db.drivers.find(x => x.id === b.dataset.toggle);
      d.status = d.status === 'active' ? 'blocked' : 'active';
      Launch.save(); render(el);
    }));
    el.querySelectorAll('[data-refund]').forEach(b => b.addEventListener('click', () => {
      if (confirm('Вернуть билет и освободить места?')) { Payment.refund(b.dataset.refund); render(el); }
    }));
    q('#a-demo').addEventListener('click', () => {
      if (confirm('Все данные будут заменены тестовыми. Продолжить?')) { Launch.reset('demo'); render(el); }
    });
    q('#a-clear').addEventListener('click', () => {
      if (confirm('Удалить всех водителей, рейсы и покупки?')) { Launch.reset('empty'); render(el); }
    });
    q('#w-add').addEventListener('click', () => {
      const name = q('#w-name').value.trim(), phone = q('#w-phone').value.trim(), car = q('#w-car').value.trim();
      const seats = Number(q('#w-seats').value), from = q('#w-from').value, to = q('#w-to').value;
      const price = Number(q('#w-price').value);
      const times = q('#w-times').value.split(',').map(x => x.trim()).filter(Boolean);
      const err = q('#w-err');
      if (!name || !car) { err.textContent = 'Укажите имя и машину.'; return; }
      if (Launch.digits(phone).length < 10) { err.textContent = 'Введите телефон водителя полностью.'; return; }
      if (from === to) { err.textContent = 'Города должны отличаться.'; return; }
      if (!(price >= 500) || !(seats >= 4)) { err.textContent = 'Проверьте цену и число мест.'; return; }
      if (!times.length || times.some(t => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t))) { err.textContent = 'Время в формате 20:00, несколько через запятую.'; return; }
      const d = Launch.addDriver(db, { name, phone, car, seats });
      Launch.addWeekOfTrips(db, d, from, to, price, times);
      Launch.save(); render(el);
    });

    const calc = () => {
      const v = id => Number(q(id).value) || 0;
      const f = Commission.forecast({ drivers: v('#f-dr'), tripsPerWeek: v('#f-tr'), seats: v('#f-se'), fillPercent: v('#f-fi'), price: v('#f-pr') });
      q('#f-out').textContent = `${f.tickets} билетов в месяц, оборот ${Launch.money(f.gmv)}, доход Керуен ${Launch.money(f.income)}`;
    };
    ['#f-dr', '#f-tr', '#f-se', '#f-fi', '#f-pr'].forEach(id => q(id).addEventListener('input', calc));
    calc();
  }

  return { render };
})();
