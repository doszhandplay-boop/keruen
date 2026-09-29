/* Маршруты: связывает все модули в один сайт */
'use strict';
(() => {
  const view = document.getElementById('view');
  let pending = null; // выбранный рейс и места между экранами

  function go(hash) { location.hash = hash; }

  function route() {
    Payment.stop();
    const [, page = '', arg] = (location.hash || '#/').split('/');
    let nav = 'search';

    if (page === 'seats' && arg) {
      Seats.render(view, arg, seats => { pending = { tripId: arg, seats }; go('#/pay'); });
    } else if (page === 'pay') {
      if (!pending) { go('#/'); return; }
      Payment.render(view, pending.tripId, pending.seats, {
        onPaid: b => { pending = null; go('#/ticket/' + b.code); },
        onExpire: msg => { pending = null; alert(msg); go('#/'); },
      });
    } else if (page === 'ticket' && arg) {
      nav = 'tickets';
      const b = Launch.db.bookings.find(x => x.code === arg);
      if (b) Ticket.render(view, b); else view.innerHTML = `<p class="empty">Билет не найден.</p>`;
    } else if (page === 'tickets') {
      nav = 'tickets';
      Ticket.renderLookup(view, code => go('#/ticket/' + code));
    } else if (page === 'driver') {
      nav = 'driver';
      Driver.render(view);
    } else if (page === 'admin') {
      nav = 'admin';
      Admin.render(view);
    } else {
      Search.render(view, id => go('#/seats/' + id));
    }

    document.querySelectorAll('[data-nav]').forEach(a => {
      if (a.dataset.nav === nav) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);
  route();
})();
