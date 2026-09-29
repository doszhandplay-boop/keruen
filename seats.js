/* 3. Выбор мест: схема салона, занятые места, итоговая цена */
'use strict';
const Seats = (() => {
  const MAX = 5;

  function render(el, tripId, onNext) {
    const db = Launch.db;
    const trip = db.trips.find(t => t.id === tripId);
    if (!trip) {
      el.innerHTML = `<p class="empty">Рейс не найден.</p><a class="btn ghost" href="#/">К поиску</a>`;
      return;
    }
    const driver = db.drivers.find(d => d.id === trip.driverId);
    const chosen = new Set();
    const rows = Math.ceil(trip.seats / 4);
    let grid = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 5; c++) {
        if (c === 2) { grid += '<span></span>'; continue; }
        const n = r * 4 + (c < 2 ? c : c - 1) + 1;
        if (n > trip.seats) { grid += '<span></span>'; continue; }
        const taken = trip.taken.includes(n);
        grid += `<button class="seat${taken ? ' taken' : ''}" data-n="${n}" aria-pressed="false" aria-label="Место ${n}${taken ? ', занято' : ''}" ${taken ? 'disabled' : ''}>${n}</button>`;
      }
    }
    el.innerHTML = `
      <div class="page-head">
        <div>
          <h2>${trip.from} — ${trip.to}</h2>
          <p>${Launch.dateLabel(trip.date)}, ${trip.time}. ${Launch.esc(driver.name)}, ${Launch.esc(driver.car)}</p>
        </div>
        <a class="btn ghost small" href="#/">Другой рейс</a>
      </div>
      <div class="bus">
        <div class="bus-front">Водитель</div>
        <div class="seatgrid">${grid}</div>
      </div>
      <div class="legend"><span>Свободно</span><span>Ваш выбор</span><span>Занято</span></div>
      <div class="buybar">
        <div><div id="sum-seats" class="muted">Выберите места, не больше ${MAX}</div><div id="sum-total" class="price"></div></div>
        <button class="btn" id="go" disabled>Перейти к оплате</button>
      </div>`;
    const go = el.querySelector('#go');
    const update = () => {
      const list = [...chosen].sort((a, b) => a - b);
      el.querySelector('#sum-seats').textContent = list.length ? `Места: ${list.join(', ')}` : `Выберите места, не больше ${MAX}`;
      el.querySelector('#sum-total').textContent = list.length ? Launch.money(list.length * trip.price) : '';
      go.disabled = !list.length;
    };
    el.querySelectorAll('.seat:not(.taken)').forEach(b => b.addEventListener('click', () => {
      const n = Number(b.dataset.n);
      if (chosen.has(n)) chosen.delete(n);
      else if (chosen.size < MAX) chosen.add(n);
      b.setAttribute('aria-pressed', String(chosen.has(n)));
      update();
    }));
    go.addEventListener('click', () => onNext([...chosen].sort((a, b) => a - b)));
  }

  return { render, MAX };
})();
