(function () {
  'use strict';
  let dashboard = 'sales';
  let connected = false;
  function show(name) {
    // Budgets is temporarily hidden, including its navigation and background requests.
    if (name !== 'sales') return;
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
  window.InsightsShell = Object.freeze({ show, current: () => dashboard, connected: () => connected,
    markConnected: () => { connected = true; window.dispatchEvent(new CustomEvent('insights:connected')); } });
})();
