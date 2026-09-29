/* 4. Оплата: форма пассажира, удержание мест на 5 минут, оплата Kaspi Pay (пока имитация), возврат.
   Для настоящей оплаты: сервер создаёт счёт в Kaspi Pay, сайт ждёт подтверждения от сервера.
   Ключи Kaspi нельзя хранить в браузере. */
'use strict';
const Payment = (() => {
  const HOLD_SECONDS = 300;
  let timer = null;

  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  function createBooking(trip, seats, name, phone) {
    const db = Launch.db;
    if (seats.some(n => trip.taken.includes(n))) return { error: 'Одно из мест уже занято. Выберите места заново.' };
    const total = seats.length * trip.price;
    const { commission, driverShare } = Commission.calc(total);
    const booking = {
      id: Launch.uid('B'), code: 'KR-' + Launch.uid('').slice(0, 6),
      tripId: trip.id, seats: [...seats], name, phone, total, commission, driverShare,
      status: 'paid', boarded: false, createdAt: Date.now(),
    };
    trip.taken.push(...seats);
    db.bookings.push(booking);
    Launch.save();
    return { booking };
  }

  function refund(code) {
    const db = Launch.db;
    const b = db.bookings.find(x => x.code === code);
    if (!b || b.status !== 'paid') return false;
    const trip = db.trips.find(t => t.id === b.tripId);
    if (trip) trip.taken = trip.taken.filter(n => !b.seats.includes(n));
    b.status = 'refunded';
    Launch.save();
    return true;
  }

  function render(el, tripId, seats, cb) {
    stop();
    const db = Launch.db;
    const trip = db.trips.find(t => t.id === tripId);
    if (!trip || seats.some(n => trip.taken.includes(n))) { cb.onExpire('Места уже заняты. Выберите заново.'); return; }
    const total = seats.length * trip.price;
    let left = HOLD_SECONDS;

    el.innerHTML = `
      <div class="page-head">
        <div><h2>Оплата</h2><p>${trip.from} — ${trip.to}, ${Launch.dateLabel(trip.date)}, ${trip.time}. Места: ${seats.join(', ')}</p></div>
        <div class="price" id="hold" aria-live="off"></div>
      </div>
      <div class="panel">
        <div class="field"><label for="p-name">Имя пассажира</label><input id="p-name" autocomplete="name" placeholder="Например, Айдар"></div>
        <div class="field"><label for="p-phone">Телефон</label><input id="p-phone" type="tel" autocomplete="tel" placeholder="+7 7__ ___ __ __" inputmode="tel"></div>
        <p class="error" id="p-error" role="alert"></p>
        <div class="buybar" style="position:static;padding-bottom:0;margin-top:6px">
          <div><div class="muted">К оплате</div><div class="price" style="font-size:1.5rem">${Launch.money(total)}</div></div>
          <button class="btn" id="p-pay">Оплатить через Kaspi Pay</button>
        </div>
      </div>
      <a class="btn ghost small" href="#/seats/${trip.id}">Изменить места</a>`;

    const hold = el.querySelector('#hold');
    const tick = () => {
      hold.textContent = `Места удерживаются ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      if (left-- <= 0) { stop(); cb.onExpire('Время удержания мест вышло. Выберите места заново.'); }
    };
    tick();
    timer = setInterval(tick, 1000);

    const err = el.querySelector('#p-error');
    const payBtn = el.querySelector('#p-pay');
    payBtn.addEventListener('click', () => {
      const name = el.querySelector('#p-name').value.trim();
      const phone = el.querySelector('#p-phone').value.trim();
      if (name.length < 2) { err.textContent = 'Введите имя пассажира.'; return; }
      if (Launch.digits(phone).length < 10) { err.textContent = 'Введите телефон полностью, например +7 701 123 45 67.'; return; }
      err.textContent = '';
      payBtn.disabled = true;
      payBtn.textContent = 'Ждём подтверждения в Kaspi…';
      setTimeout(() => { // имитация ответа Kaspi Pay
        const res = createBooking(trip, seats, name, phone);
        if (res.error) { stop(); cb.onExpire(res.error); return; }
        stop();
        cb.onPaid(res.booking);
      }, 1400);
    });
  }

  return { render, stop, createBooking, refund };
})();
