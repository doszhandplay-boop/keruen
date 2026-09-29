/* 6. Кабинет водителя: рейсы, продано мест, баланс, выплата, отметка пассажиров по коду.
   Вход сейчас выбором из списка. Для продакшена нужен вход по SMS-коду на сервере. */
'use strict';
const Driver = (() => {
  let currentId = sessionStorage.getItem('keruen_driver');

  function renderLogin(el) {
    const drivers = Launch.db.drivers.filter(d => d.status === 'active');
    el.innerHTML = `
      <div class="page-head"><div><h2>Кабинет водителя</h2><p>Добавляйте рейсы, следите за продажами и выплатами.</p></div></div>
      <div class="panel">
        ${drivers.length ? `
        <div class="field"><label for="d-pick">Кто вы</label>
          <select id="d-pick">${drivers.map(d => `<option value="${d.id}">${Launch.esc(d.name)}, ${Launch.esc(d.phone)}</option>`).join('')}</select></div>
        <button class="btn" id="d-login">Войти</button>` : `<p class="empty">Водителей пока нет. Добавьте их в разделе «Админ».</p>`}
      </div>`;
    const btn = el.querySelector('#d-login');
    if (btn) btn.addEventListener('click', () => {
      currentId = el.querySelector('#d-pick').value;
      sessionStorage.setItem('keruen_driver', currentId);
      render(el);
    });
  }

  function renderCabinet(el, me) {
    const db = Launch.db;
    const paid = Commission.bookingsOf(me.id);
    const sold = paid.reduce((s, b) => s + b.seats.length, 0);
    const balance = Commission.balance(me.id);
    const trips = db.trips.filter(t => t.driverId === me.id && !Launch.isPast(t))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 30);
    const cityOpts = sel => Launch.cities.map(c => `<option${c === sel ? ' selected' : ''}>${c}</option>`).join('');

    el.innerHTML = `
      <div class="page-head">
        <div><h2>${Launch.esc(me.name)}</h2><p>${Launch.esc(me.car)}, ${me.seats} мест. Комиссия Керуен ${Commission.RATE * 100}% с каждого билета.</p></div>
        <button class="btn ghost small" id="d-out">Выйти</button>
      </div>
      <div class="stats">
        <div class="stat hl"><b>${Launch.money(balance)}</b><span>К выплате</span></div>
        <div class="stat"><b>${sold}</b><span>Продано мест</span></div>
        <div class="stat"><b>${Launch.money(Commission.earned(me.id))}</b><span>Заработано всего</span></div>
      </div>
      <div class="panel">
        <h3>Выплата</h3>
        <button class="btn" id="d-payout" ${balance > 0 ? '' : 'disabled'}>Запросить выплату ${balance > 0 ? Launch.money(balance) : ''}</button>
        <p class="muted" id="d-payout-msg" style="margin-top:10px"></p>
      </div>
      <div class="panel">
        <h3>Посадка</h3>
        <div class="row">
          <div class="field"><label for="d-code">Код билета (KR-XXXXXX)</label><input id="d-code" autocapitalize="characters" placeholder="KR-AB12CD"></div>
        </div>
        <button class="btn" id="d-check">Проверить билет</button>
        <p id="d-check-msg" style="margin-top:10px" role="status"></p>
      </div>
      <div class="panel">
        <h3>Добавить рейс</h3>
        <div class="row">
          <div class="field"><label for="n-from">Откуда</label><select id="n-from">${cityOpts('Шымкент')}</select></div>
          <div class="field"><label for="n-to">Куда</label><select id="n-to">${cityOpts('Алматы')}</select></div>
          <div class="field"><label for="n-date">Дата</label><input id="n-date" type="date" value="${Launch.dayOffset(1)}"></div>
          <div class="field"><label for="n-time">Время</label><input id="n-time" type="time" value="20:00"></div>
          <div class="field"><label for="n-price">Цена места, ₸</label><input id="n-price" type="number" min="500" step="100" value="9000"></div>
        </div>
        <p class="error" id="n-err" role="alert"></p>
        <button class="btn" id="n-add">Добавить рейс</button>
      </div>
      <div class="panel">
        <h3>Ближайшие рейсы</h3>
        ${trips.length ? `<div class="tablewrap"><table>
          <thead><tr><th>Дата</th><th>Маршрут</th><th>Продано</th><th>Цена</th></tr></thead>
          <tbody>${trips.map(t => `<tr><td>${Launch.dateLabel(t.date)}, ${t.time}</td><td>${t.from} — ${t.to}</td><td>${t.taken.length} из ${t.seats}</td><td class="mono">${Launch.money(t.price)}</td></tr>`).join('')}</tbody>
        </table></div>` : `<p class="empty">Рейсов нет. Добавьте первый выше.</p>`}
      </div>`;

    el.querySelector('#d-out').addEventListener('click', () => { currentId = null; sessionStorage.removeItem('keruen_driver'); render(el); });
    el.querySelector('#d-payout').addEventListener('click', () => {
      const p = Commission.payout(me.id);
      if (p) { render(el); el.querySelector('#d-payout-msg').textContent = `Запрос на ${Launch.money(p.amount)} создан.`; }
    });
    el.querySelector('#d-check').addEventListener('click', () => {
      const r = Ticket.verify(el.querySelector('#d-code').value, me.id);
      const msg = el.querySelector('#d-check-msg');
      msg.textContent = r.msg;
      msg.className = r.ok ? 'status-ok' : 'status-bad';
    });
    el.querySelector('#n-add').addEventListener('click', () => {
      const from = el.querySelector('#n-from').value, to = el.querySelector('#n-to').value;
      const date = el.querySelector('#n-date').value, time = el.querySelector('#n-time').value;
      const price = Number(el.querySelector('#n-price').value);
      const err = el.querySelector('#n-err');
      if (from === to) { err.textContent = 'Города отправления и прибытия должны отличаться.'; return; }
      if (!date || !time) { err.textContent = 'Укажите дату и время.'; return; }
      if (!(price >= 500)) { err.textContent = 'Цена должна быть не меньше 500 ₸.'; return; }
      const trip = { id: Launch.uid('T'), driverId: me.id, from, to, date, time, price, seats: me.seats, taken: [] };
      if (Launch.isPast(trip)) { err.textContent = 'Это время уже прошло.'; return; }
      db.trips.push(trip);
      Launch.save();
      render(el);
    });
  }

  function render(el) {
    const me = Launch.db.drivers.find(d => d.id === currentId && d.status === 'active');
    if (!me) { currentId = null; renderLogin(el); } else renderCabinet(el, me);
  }

  return { render };
})();
