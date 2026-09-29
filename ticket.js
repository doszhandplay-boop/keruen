/* 5. QR-билет: показ билета, поиск по телефону, проверка кода водителем при посадке */
'use strict';
const Ticket = (() => {
  function render(el, booking) {
    const db = Launch.db;
    const trip = db.trips.find(t => t.id === booking.tripId);
    const driver = trip && db.drivers.find(d => d.id === trip.driverId);
    if (!trip) { el.innerHTML = `<p class="empty">Билет не найден.</p>`; return; }
    const refunded = booking.status !== 'paid';
    el.innerHTML = `
      <div class="ticket" role="group" aria-label="Билет ${booking.code}">
        <div class="ticket-top">
          <div class="ticket-route">${trip.from}<br>${trip.to}</div>
          <dl class="ticket-meta">
            <div><dt>Дата</dt><dd>${Launch.dateLabel(trip.date)}</dd></div>
            <div><dt>Отправление</dt><dd>${trip.time}</dd></div>
            <div><dt>Места</dt><dd>${booking.seats.join(', ')}</dd></div>
            <div><dt>Пассажир</dt><dd>${Launch.esc(booking.name)}</dd></div>
            <div><dt>Водитель</dt><dd>${Launch.esc(driver ? driver.name : '')}</dd></div>
            <div><dt>Оплачено</dt><dd>${Launch.money(booking.total)}</dd></div>
          </dl>
        </div>
        <div class="ticket-cut"></div>
        <div class="ticket-bottom">
          <div class="qr" id="qr"></div>
          <div>
            <div class="ticket-code">${booking.code}</div>
            <p style="color:#6b685f;font-size:.9rem;margin-top:6px">${refunded ? 'Билет возвращён, посадка невозможна.' : booking.boarded ? 'Посадка отмечена.' : 'Покажите QR-код водителю при посадке.'}</p>
          </div>
        </div>
      </div>
      <p class="muted" style="text-align:center;margin-top:16px">Сделайте скриншот билета или найдите его позже по номеру телефона в разделе «Мои билеты».</p>`;
    const box = el.querySelector('#qr');
    if (typeof QRCode !== 'undefined' && !refunded) {
      new QRCode(box, { text: 'KERUEN:' + booking.code, width: 160, height: 160, colorDark: '#141414', colorLight: '#FBF8EF' });
    } else if (!refunded) {
      box.textContent = booking.code;
    }
  }

  function verify(code, driverId) {
    const db = Launch.db;
    const clean = String(code).trim().toUpperCase().replace(/^KERUEN:/, '');
    const b = db.bookings.find(x => x.code === clean);
    if (!b) return { ok: false, msg: 'Билет не найден. Проверьте код.' };
    if (b.status !== 'paid') return { ok: false, msg: 'Билет возвращён.' };
    const trip = db.trips.find(t => t.id === b.tripId);
    if (driverId && trip && trip.driverId !== driverId) return { ok: false, msg: 'Этот билет на рейс другого водителя.' };
    if (b.boarded) return { ok: false, msg: `${b.name} уже отмечен на посадке.` };
    b.boarded = true;
    Launch.save();
    return { ok: true, msg: `Можно сажать: ${b.name}, места ${b.seats.join(', ')}.` };
  }

  function renderLookup(el, onOpen) {
    el.innerHTML = `
      <div class="page-head"><div><h2>Мои билеты</h2><p>Введите телефон, который указали при покупке.</p></div></div>
      <div class="panel">
        <div class="field"><label for="l-phone">Телефон</label><input id="l-phone" type="tel" placeholder="+7 7__ ___ __ __" inputmode="tel"></div>
        <button class="btn" id="l-find">Найти билеты</button>
      </div>
      <div id="l-out"></div>`;
    const out = el.querySelector('#l-out');
    el.querySelector('#l-find').addEventListener('click', () => {
      const d = Launch.digits(el.querySelector('#l-phone').value);
      if (d.length < 10) { out.innerHTML = `<p class="error">Введите телефон полностью.</p>`; return; }
      const db = Launch.db;
      const list = db.bookings.filter(b => Launch.digits(b.phone) === d).reverse();
      if (!list.length) { out.innerHTML = `<p class="empty">Билетов на этот номер нет.</p>`; return; }
      out.innerHTML = `<div class="list">${list.map(b => {
        const t = db.trips.find(x => x.id === b.tripId);
        return `<article class="trip" style="grid-template-columns:1fr auto">
          <div><strong>${t ? `${t.from} — ${t.to}` : 'Рейс'}</strong><div class="muted">${t ? `${Launch.dateLabel(t.date)}, ${t.time}` : ''}. Места: ${b.seats.join(', ')}. ${b.status === 'paid' ? '' : 'Возвращён.'}</div></div>
          <button class="btn ghost small" data-code="${b.code}">Открыть</button></article>`;
      }).join('')}</div>`;
      out.querySelectorAll('[data-code]').forEach(btn => btn.addEventListener('click', () => onOpen(btn.dataset.code)));
    });
  }

  return { render, verify, renderLookup };
})();
