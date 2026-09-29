/* 9. Запуск: база в браузере (localStorage), тестовые данные, общая статистика.
   Когда появится сервер, заменить load/save на запросы к API, остальной код не меняется. */
'use strict';
const Launch = (() => {
  const KEY = 'keruen_db_v1';
  const cities = ['Шымкент', 'Алматы', 'Астана', 'Туркестан', 'Тараз', 'Ташкент'];

  const pad = n => String(n).padStart(2, '0');
  const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dayOffset = n => { const d = new Date(); d.setDate(d.getDate() + n); return fmtDate(d); };
  const uid = p => p + Math.random().toString(36).slice(2, 8).toUpperCase();
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₸';
  const digits = s => String(s).replace(/\D/g, '').slice(-10);
  const DAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const dateLabel = s => {
    const [y, m, d] = s.split('-').map(Number);
    return `${DAYS[new Date(y, m - 1, d).getDay()]}, ${d} ${MONTHS[m - 1]}`;
  };
  const isPast = t => new Date(`${t.date}T${t.time}:00`) < new Date();

  const emptyDb = () => ({ drivers: [], trips: [], bookings: [], payouts: [] });

  // Тестовые водители. Замените их своими 5-6 реальными водителями в разделе «Админ».
  const DEMO = [
    { name: 'Ерлан (тест)',    car: 'Mercedes Sprinter', seats: 18, a: 'Шымкент', b: 'Алматы',    price: 9000,  times: ['20:00'] },
    { name: 'Бауыржан (тест)', car: 'Toyota Hiace',      seats: 14, a: 'Шымкент', b: 'Алматы',    price: 8500,  times: ['22:30'] },
    { name: 'Нурлан (тест)',   car: 'Mercedes Sprinter', seats: 18, a: 'Шымкент', b: 'Астана',    price: 16000, times: ['18:00'] },
    { name: 'Асхат (тест)',    car: 'Toyota Hiace',      seats: 14, a: 'Шымкент', b: 'Туркестан', price: 2500,  times: ['09:00', '15:00'] },
    { name: 'Серик (тест)',    car: 'Toyota Hiace',      seats: 14, a: 'Шымкент', b: 'Тараз',     price: 3500,  times: ['10:00'] },
    { name: 'Марат (тест)',    car: 'Toyota Hiace',      seats: 14, a: 'Шымкент', b: 'Ташкент',   price: 5500,  times: ['08:00'] },
  ];

  function addDriver(db, { name, phone, car, seats }) {
    const driver = { id: uid('D'), name, phone, car, seats: Number(seats), status: 'active' };
    db.drivers.push(driver);
    return driver;
  }

  function addWeekOfTrips(db, driver, a, b, price, times) {
    for (let day = 0; day < 7; day++) {
      for (const time of times) {
        for (const [from, to] of [[a, b], [b, a]]) {
          db.trips.push({ id: uid('T'), driverId: driver.id, from, to, date: dayOffset(day), time, price, seats: driver.seats, taken: [] });
        }
      }
    }
  }

  function seedDemo(db) {
    DEMO.forEach((cfg, i) => {
      const d = addDriver(db, { name: cfg.name, phone: `+7 700 000 00 0${i + 1}`, car: cfg.car, seats: cfg.seats });
      addWeekOfTrips(db, d, cfg.a, cfg.b, cfg.price, cfg.times);
    });
  }

  let db;
  function load() {
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db || !Array.isArray(db.drivers)) { db = emptyDb(); seedDemo(db); save(); }
    db.payouts = db.payouts || [];
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(db)); }
  function reset(kind) { db = emptyDb(); if (kind === 'demo') seedDemo(db); save(); }

  function stats() {
    const paid = db.bookings.filter(b => b.status === 'paid');
    return {
      bookings: paid.length,
      tickets: paid.reduce((s, b) => s + b.seats.length, 0),
      gmv: paid.reduce((s, b) => s + b.total, 0),
      income: paid.reduce((s, b) => s + b.commission, 0),
      drivers: db.drivers.filter(d => d.status === 'active').length,
      trips: db.trips.length,
    };
  }

  load();
  return { cities, uid, esc, money, digits, dayOffset, dateLabel, isPast, addDriver, addWeekOfTrips, save, reset, stats, get db() { return db; } };
})();
