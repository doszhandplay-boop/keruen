/* 7. Комиссия: 10% с каждого билета, баланс водителя, выплаты, прогноз дохода для питча */
'use strict';
const Commission = (() => {
  const RATE = 0.10;

  function calc(total) {
    const commission = Math.round(total * RATE);
    return { commission, driverShare: total - commission };
  }

  const bookingsOf = driverId => {
    const db = Launch.db;
    const tripIds = new Set(db.trips.filter(t => t.driverId === driverId).map(t => t.id));
    return db.bookings.filter(b => b.status === 'paid' && tripIds.has(b.tripId));
  };

  const earned = driverId => bookingsOf(driverId).reduce((s, b) => s + b.driverShare, 0);
  const paidOut = driverId => Launch.db.payouts.filter(p => p.driverId === driverId).reduce((s, p) => s + p.amount, 0);
  const balance = driverId => earned(driverId) - paidOut(driverId);

  function payout(driverId) {
    const amount = balance(driverId);
    if (amount <= 0) return null;
    const p = { id: Launch.uid('P'), driverId, amount, date: new Date().toISOString() };
    Launch.db.payouts.push(p);
    Launch.save();
    return p;
  }

  // Прогноз: сколько Керуен зарабатывает в месяц при заданных допущениях
  function forecast({ drivers, tripsPerWeek, seats, fillPercent, price }) {
    const ticketsPerMonth = drivers * tripsPerWeek * 4.3 * seats * (fillPercent / 100);
    const gmv = ticketsPerMonth * price;
    return { tickets: Math.round(ticketsPerMonth), gmv, income: gmv * RATE };
  }

  return { RATE, calc, balance, earned, paidOut, payout, bookingsOf, forecast };
})();
