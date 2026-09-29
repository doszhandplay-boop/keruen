/* 2. Поиск рейсов: маршрут, дата, список рейсов со свободными местами */
'use strict';
const Search = (() => {
  const state = { from: 'Шымкент', to: 'Алматы', date: Launch.dayOffset(0) };

  function find() {
    const db = Launch.db;
    return db.trips
      .filter(t => t.from === state.from && t.to === state.to && t.date === state.date)
      .filter(t => !Launch.isPast(t))
      .filter(t => { const d = db.drivers.find(x => x.id === t.driverId); return d && d.status === 'active'; })
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  const options = sel => Launch.cities.map(c => `<option${c === sel ? ' selected' : ''}>${c}</option>`).join('');

  function renderResults(el, onPick) {
    const db = Launch.db;
    const trips = find();
    if (!trips.length) {
      el.innerHTML = `<p class="empty">На эту дату рейсов нет. Выберите другой день или другое направление.</p>`;
      return;
    }
    el.innerHTML = `<div class="list">${trips.map(t => {
      const d = db.drivers.find(x => x.id === t.driverId);
      const free = t.seats - t.taken.length;
      return `<article class="trip">
        <div class="trip-time">${t.time}</div>
        <div class="trip-info"><strong>${Launch.esc(d.name)}</strong><span>${Launch.esc(d.car)}, свободно ${free} из ${t.seats}</span></div>
        <div class="trip-buy">
          <span class="price">${Launch.money(t.price)}</span>
          <button class="btn" data-trip="${t.id}" ${free ? '' : 'disabled'}>${free ? 'Выбрать места' : 'Мест нет'}</button>
        </div>
      </article>`;
    }).join('')}</div>`;
    el.querySelectorAll('[data-trip]').forEach(b => b.addEventListener('click', () => onPick(b.dataset.trip)));
  }

  function render(el, onPick) {
    const days = Array.from({ length: 7 }, (_, i) => Launch.dayOffset(i));
    el.innerHTML = `
      <section class="hero">
        <h1 class="route">
          <select id="s-from" aria-label="Откуда">${options(state.from)}</select>
          <button class="swap" id="s-swap" aria-label="Поменять города местами">⇄</button>
          <select id="s-to" aria-label="Куда">${options(state.to)}</select>
        </h1>
        <div class="days" role="group" aria-label="Дата поездки">
          ${days.map((d, i) => `<button class="day" data-date="${d}" aria-pressed="${d === state.date}">${i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : Launch.dateLabel(d)}</button>`).join('')}
        </div>
      </section>
      <div id="results"></div>`;
    const results = el.querySelector('#results');
    const refresh = () => renderResults(results, onPick);
    el.querySelector('#s-from').addEventListener('change', e => { state.from = e.target.value; refresh(); });
    el.querySelector('#s-to').addEventListener('change', e => { state.to = e.target.value; refresh(); });
    el.querySelector('#s-swap').addEventListener('click', () => {
      [state.from, state.to] = [state.to, state.from];
      el.querySelector('#s-from').value = state.from;
      el.querySelector('#s-to').value = state.to;
      refresh();
    });
    el.querySelectorAll('.day').forEach(b => b.addEventListener('click', () => {
      state.date = b.dataset.date;
      el.querySelectorAll('.day').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      refresh();
    }));
    refresh();
  }

  return { render, find };
})();
