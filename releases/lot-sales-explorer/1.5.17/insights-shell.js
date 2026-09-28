(function () {
  'use strict';
  let dashboard = null;
  let connected = false;
  let access = null;
  function setAccess(next, error = '') {
    access = next;
    const sales = !!next?.lotSalesDashboard;
    document.querySelector('[data-dashboard="sales"]').hidden = !sales;
    document.getElementById('salesDashboard').hidden = !sales;
    document.getElementById('budgetsDashboard').hidden = true;
    const message = document.getElementById('dashboardAccessMessage');
    message.hidden = sales;
    document.getElementById('dashboardAccessText').textContent = error || (next ? 'Contact your administrator to be granted access to dashboards.' : 'Checking dashboard access…');
    dashboard = sales ? 'sales' : null;
  }
  function show(name) {
    // Budgets is temporarily hidden, including its navigation and background requests.
    if (name !== 'sales' || !access?.lotSalesDashboard) return;
    dashboard = name;
    document.querySelectorAll('[data-dashboard]').forEach(button => {
      const active = button.dataset.dashboard === name;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    document.getElementById('salesDashboard').hidden = name !== 'sales';
    document.getElementById('budgetsDashboard').hidden = name !== 'budgets';
    document.getElementById('refresh').title = name === 'budgets' ? 'Refresh budgets' : 'Refresh lot sales';
    document.getElementById('refresh').setAttribute('aria-label', document.getElementById('refresh').title);
    window.dispatchEvent(new CustomEvent('insights:dashboard', { detail: name }));
  }
  document.querySelectorAll('[data-dashboard]').forEach(button => button.addEventListener('click', () => show(button.dataset.dashboard)));
  window.InsightsShell = Object.freeze({ show, setAccess, access: () => access, current: () => dashboard, connected: () => connected,
    markConnected: () => { connected = true; window.dispatchEvent(new CustomEvent('insights:connected')); } });
})();
