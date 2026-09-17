(function () {
  'use strict';
  const M = window.LotSalesModel, $ = id => document.getElementById(id);
  const state = { lots: [], report: null, loaded: false, busy: false, monthOffset: 0, collapsed: new Set(), detailLots: [], detailOffset: 0, log: [] };
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = value => value === null || value === undefined ? '—' : '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const decimal = value => value === null || value === undefined ? '—' : value.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const integer = value => value.toLocaleString('en-US');
  const monthLabel = month => new Date(month + '-01T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const dateLabel = date => date ? date.slice(5, 7) + '/' + date.slice(8) + '/' + date.slice(2, 4) : '—';
  const valueLabel = (s, metric) => !s || s[metric] === null ? '—' : metric === 'count' ? integer(s.count) : money(s[metric]);
  function log(message) { state.log.push(new Date().toISOString() + ' ' + message); if (state.log.length > 60) state.log.shift(); }
  function notice(message, error) { $('notice').hidden = !message; $('notice').textContent = message; $('notice').classList.toggle('error', !!error); }
  function selectedFilters() { return { projectId: $('project').value, territory: $('territory').value, builderId: $('builder').value,
    search: $('search').value.trim(), status: $('status').value, dateField: $('dateField').value, excludeBuilders: $('excludeBuilders').checked,
    from: $('period').value === 'all' ? '' : $('from').value, to: $('period').value === 'all' ? '' : $('to').value }; }
  function applyPeriod() {
    const period = $('period').value, now = new Date(), y = now.getFullYear(), m = now.getMonth();
    const key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (period !== 'custom' && period !== 'all') { $('to').value = key(now); $('from').value = key(new Date(y, period === 'ytd' ? 0 : m - Number(period) + 1, 1)); }
    $('from').disabled = period === 'all'; $('to').disabled = period === 'all';
  }
  function options(control, entries, empty) {
    const previous = control.value;
    control.innerHTML = '<option value="">' + esc(empty) + '</option>' + entries.map(([value, label]) => '<option value="' + esc(value) + '">' + esc(label) + '</option>').join('');
    if (entries.some(([value]) => value === previous)) control.value = previous;
  }
  function fillFilters() {
    const entries = (key, label) => [...new Map(state.lots.map(r => [r[key], r[label]])).entries()].filter(([id]) => id).sort((a, b) => a[1].localeCompare(b[1]));
    options($('territory'), entries('territory', 'territory'), 'All territories');
    options($('project'), entries('projectId', 'project'), 'All projects');
    options($('builder'), entries('builderId', 'builder'), 'All builders');
    const projectScope = new URLSearchParams(location.search).get('projectId');
    if (projectScope) {
      if (!entries('projectId', 'project').some(([id]) => id === projectScope)) $('project').add(new Option('Unavailable project', projectScope));
      $('project').value = projectScope;
    }
  }
  function blank(title, subtitle) {
    $('matrixHead').innerHTML = ''; $('matrixBody').innerHTML = ''; $('matrixFoot').innerHTML = '';
    $('empty').hidden = false; $('empty').innerHTML = '<div class="empty-symbol" aria-hidden="true">▥</div><h2>' + esc(title) + '</h2><p>' + esc(subtitle) + '</p>';
    $('export').disabled = true;
  }
  function render() {
    if (!state.loaded) return;
    let r;
    try { r = M.report(state.lots, selectedFilters()); } catch (error) { state.report = null; blank('Check the selected dates', error.message); $('summary').textContent = 'Invalid date range'; notice(error.message, true); return; }
    notice(''); state.report = r;
    if ($('period').value === 'all') { $('from').value = r.from; $('to').value = r.to; }
    const metric = $('metric').value, def = M.metrics[metric], months = r.months.slice(state.monthOffset, state.monthOffset + 13);
    const filters = selectedFilters(), dateName = r.dateField === 'closeDate' ? 'Close date' : 'Purchase date';
    $('scopeLabel').textContent = ($('project').value ? $('project').selectedOptions[0].text : 'All projects') + ' · ' + r.status + ' lots · ' + monthLabel(r.from) + ' – ' + monthLabel(r.to);
    document.querySelectorAll('[data-metric]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.metric === metric || b.dataset.metric === 'avgPriceFF' && metric === 'weightedPriceFF')));
    $('metric').title = def.description;
    $('summary').innerHTML = '<span><b>' + integer(r.stats.count) + '</b> ' + (r.status === 'Sold' ? 'lots sold' : 'contracted lots') + '</span><span><b>' + integer(r.rows.length) + '</b> subdivisions</span><span><b>' + valueLabel(r.stats, 'avgPriceFF') + '</b> avg $/FF</span><span><b>' + money(r.stats.totalPrice) + '</b> base price</span><span class="summary-scope">' + esc(dateName.toUpperCase()) + ' · NEWEST FIRST</span>';
    $('definition').textContent = def.description; $('definition').title = 'Base price only; excludes taxes, fees and interest. Archived lots are included in historical results. First sale uses all close dates within the current territory/project/builder/search filters. Average front footage uses the selected status and period.';
    $('quality').textContent = [r.stats.missingPriceFF ? integer(r.stats.missingPriceFF) + ' lots without usable $/FF' : '', r.missingDates ? integer(r.missingDates) + ' lots missing ' + dateName.toLowerCase() : ''].filter(Boolean).join(' · ');
    $('newer').disabled = state.monthOffset === 0; $('older').disabled = state.monthOffset + 13 >= r.months.length;
    $('monthPage').textContent = r.months.length > 13 ? (state.monthOffset + 1) + '–' + Math.min(state.monthOffset + 13, r.months.length) + ' of ' + r.months.length + ' months' : r.months.length + ' months';
    if (!r.rows.length) { blank('No lots match these filters', r.missingDates ? 'Matching lots have no usable ' + dateName.toLowerCase() + ' in this period.' : 'Try another period, status, project, or builder.'); return; }
    $('empty').hidden = true; $('export').disabled = false;
    $('matrixHead').innerHTML = '<tr><th class="sticky" scope="col">Subdivision</th><th scope="col" title="Earliest Sold close date, across all dates, within current scope filters">First lot sale<small>All dates</small></th><th scope="col" title="Mean positive front footage for lots in this period">Avg front ft<small>Selected period</small></th><th scope="col" class="period-total" title="Calculated over the entire selected period, including offscreen months">Period<small>' + esc(def.label) + '</small></th>' + months.map(m => '<th scope="col">' + esc(monthLabel(m).split(' ')[0]) + '<small>' + m.slice(0, 4) + '</small></th>').join('') + '</tr>';
    const territories = new Map(); r.rows.forEach(row => { if (!territories.has(row.territory)) territories.set(row.territory, []); territories.get(row.territory).push(row); });
    const max = Math.max(1, ...r.rows.flatMap(row => months.map(m => (row.cells.get(m) || {})[metric] || 0)));
    function cell(stats, row, month, total) {
      if (!stats || !stats.count) return '<td class="missing' + (total ? ' period-total' : '') + '">' + (metric === 'count' ? '0' : '—') + '</td>';
      const v = stats[metric], shading = $('heat').checked && !total && v !== null ? ' style="background:rgba(18,131,145,' + (0.025 + (v / max) * .1).toFixed(3) + ')"' : '';
      const title = stats.count + ' lots · ' + stats.eligible + ' with usable $/FF · Click for lot detail';
      return '<td' + (total ? ' class="period-total"' : '') + shading + '><button class="cell-button" data-subdivision="' + esc(row.id) + '" data-month="' + esc(month || '') + '" title="' + esc(title) + '" aria-label="' + esc(row.name + ', ' + (month ? monthLabel(month) : 'selected period') + ', ' + def.label + ' ' + valueLabel(stats, metric) + ', ' + stats.count + ' lots') + '">' + valueLabel(stats, metric) + '</button></td>';
    }
    let html = '';
    territories.forEach((rows, territory) => {
      if ($('sort').value === 'count') rows.sort((a, b) => b.stats.count - a.stats.count || a.name.localeCompare(b.name));
      if ($('sort').value === 'price') rows.sort((a, b) => (b.stats.avgPriceFF ?? -1) - (a.stats.avgPriceFF ?? -1) || a.name.localeCompare(b.name));
      const closed = state.collapsed.has(territory), count = rows.reduce((n, row) => n + row.stats.count, 0);
      html += '<tr class="territory"><th scope="rowgroup"><button class="territory-toggle" data-territory="' + esc(territory) + '" aria-expanded="' + !closed + '"><span aria-hidden="true">' + (closed ? '▸' : '▾') + '</span>' + esc(territory) + '</button></th><th colspan="' + (months.length + 3) + '">' + rows.length + ' subdivisions · ' + integer(count) + ' lots</th></tr>';
      if (!closed) rows.forEach(row => { html += '<tr><td class="sticky" title="' + esc(row.project) + '">' + esc(row.name) + '</td><td class="identity">' + dateLabel(row.firstSale) + '</td><td class="identity">' + decimal(row.stats.avgWidth) + '</td>' + cell(row.stats, row, '', true) + months.map(month => cell(row.cells.get(month), row, month, false)).join('') + '</tr>'; });
    });
    $('matrixBody').innerHTML = html;
    $('matrixFoot').innerHTML = '<tr><td class="sticky">All filtered lots</td><td>—</td><td>' + decimal(r.stats.avgWidth) + '</td><td class="period-total">' + valueLabel(r.stats, metric) + '</td>' + months.map(month => '<td>' + valueLabel(M.stats(r.lots.filter(lot => lot[r.dateField].slice(0, 7) === month)), metric) + '</td>').join('') + '</tr>';
    $('collapse').textContent = [...territories.keys()].every(t => state.collapsed.has(t)) ? 'Expand all' : 'Collapse all';
    if (state.lots.some(lot => lot.missingSubdivision)) notice('Some lots reference subdivisions unavailable to you. Those rows are labeled Unknown or Unassigned.');
  }
  function update() { state.monthOffset = 0; render(); }
  function saveCsv(filename, rows) {
    const url = URL.createObjectURL(new Blob([M.csv(rows)], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a');
    a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportMatrix() {
    const r = state.report, metric = $('metric').value;
    if (!r) return;
    const value = stats => !stats ? (metric === 'count' ? 0 : '') : stats[metric] === null ? '' : Math.round(stats[metric] * 100) / 100;
    const rows = [['Land Master Insights', M.metrics[metric].label], ['Status', r.status, 'Date basis', r.dateField === 'closeDate' ? 'Close Date' : 'Purchase Date'], ['From', r.from, 'To', r.to],
      ['Territory', 'Subdivision', 'Project', 'First lot sale (all dates)', 'Average front ft (selected period)', 'Period ' + M.metrics[metric].label, ...r.months]];
    r.rows.forEach(row => rows.push([row.territory, row.name, row.project, row.firstSale, row.stats.avgWidth, value(row.stats), ...r.months.map(month => value(row.cells.get(month)))]));
    rows.push(['All filtered lots', '', '', '', r.stats.avgWidth, value(r.stats), ...r.months.map(month => value(M.stats(r.lots.filter(l => l[r.dateField].slice(0, 7) === month))))]);
    saveCsv('lot-sales-' + r.from + '-to-' + r.to + '.csv', rows);
  }
  function detailRows() {
    const rows = state.detailLots.slice(state.detailOffset, state.detailOffset + 100);
    $('detailBody').innerHTML = rows.map(l => '<tr><td>' + esc(l.code || ('Block ' + l.block + ' · Lot ' + l.lot)) + '</td><td>' + esc(l.builder) + '</td><td>' + esc(l.status) + '</td><td>' + dateLabel(l.closeDate) + '</td><td>' + dateLabel(l.purchaseDate) + '</td><td>' + decimal(l.width) + '</td><td>' + money(l.price) + '</td><td>' + money(l.price !== null && l.price >= 0 && l.width > 0 ? l.price / l.width : null) + '</td></tr>').join('');
    $('detailPage').textContent = (state.detailOffset + 1) + '–' + Math.min(state.detailOffset + 100, state.detailLots.length) + ' of ' + state.detailLots.length + ' lots';
    $('detailPrev').disabled = state.detailOffset === 0; $('detailNext').disabled = state.detailOffset + 100 >= state.detailLots.length;
  }
  function openDetail(subdivision, month) {
    const r = state.report, row = r.rows.find(row => row.id === subdivision);
    if (!row) return;
    state.detailLots = row.lots.filter(l => !month || l[r.dateField].slice(0, 7) === month).slice().sort((a, b) => b[r.dateField].localeCompare(a[r.dateField]) || a.code.localeCompare(b.code));
    state.detailOffset = 0; $('detailTitle').textContent = row.name;
    $('detailEyebrow').textContent = row.territory.toUpperCase() + ' / LOT DETAIL';
    $('detailMeta').textContent = (month ? monthLabel(month) : monthLabel(r.from) + ' – ' + monthLabel(r.to)) + ' · ' + r.status + ' · ' + state.detailLots.length + ' lots';
    detailRows(); $('detail').showModal();
  }
  async function load() {
    if (state.busy) return;
    state.busy = true; state.loaded = false; state.report = null; $('refresh').disabled = true; $('export').disabled = true;
    $('connection').textContent = 'Loading…'; $('summary').textContent = 'Loading complete report…'; notice(''); blank('Loading your sales data', 'Fetching lots and their project relationships.');
    const progress = {};
    try {
      const data = await LotSalesCreator.load(ZOHO.CREATOR.DATA, (report, count) => { progress[report] = count; $('connection').textContent = 'Loading ' + integer(Object.values(progress).reduce((n, x) => n + x, 0)) + ' records…'; });
      state.lots = M.normalize(data); state.loaded = true; state.monthOffset = 0; fillFilters(); render();
      const runtime = LMRuntime.current(); $('connection').textContent = runtime.environment === 'PRODUCTION' ? '● Live' : '● ' + runtime.environment;
      $('updated').textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' · ' + integer(state.lots.length) + ' lots loaded · Read-only';
      log('Loaded ' + state.lots.length + ' lots, ' + data.subdivisions.length + ' subdivisions.');
    } catch (error) {
      const message = error && error.message || String(error); log('Load failed: ' + message); $('connection').textContent = 'Load failed'; $('summary').textContent = 'Report unavailable';
      blank('Unable to load the report', 'Refresh to retry. Open Diagnostics for the report or field that needs attention.'); notice(message, true);
      LMCriticalErrors.breadcrumb('error', 'Lot sales report load failed', { message }, false);
    } finally { state.busy = false; $('refresh').disabled = false; }
  }
  ['territory','project','builder','status','dateField','excludeBuilders'].forEach(id => $(id).addEventListener('change', update));
  ['metric','heat','sort'].forEach(id => $(id).addEventListener('change', render));
  ['from','to'].forEach(id => $(id).addEventListener('change', () => { $('period').value = 'custom'; update(); }));
  $('period').addEventListener('change', () => { applyPeriod(); update(); });
  let searchTimer; $('search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(update, 160); });
  document.querySelectorAll('[data-metric]').forEach(b => b.addEventListener('click', () => { $('metric').value = b.dataset.metric; render(); }));
  $('collapse').addEventListener('click', () => { const all = [...new Set((state.report && state.report.rows || []).map(r => r.territory))]; if (all.every(t => state.collapsed.has(t))) state.collapsed.clear(); else all.forEach(t => state.collapsed.add(t)); render(); });
  $('matrixBody').addEventListener('click', e => { const territory = e.target.closest('[data-territory]'), cell = e.target.closest('[data-subdivision]');
    if (territory) { const name = territory.dataset.territory; if (state.collapsed.has(name)) state.collapsed.delete(name); else state.collapsed.add(name); render(); }
    if (cell) openDetail(cell.dataset.subdivision, cell.dataset.month);
  });
  $('newer').addEventListener('click', () => { state.monthOffset = Math.max(0, state.monthOffset - 13); render(); });
  $('older').addEventListener('click', () => { state.monthOffset += 13; render(); });
  $('closeDetail').addEventListener('click', () => $('detail').close());
  $('detailPrev').addEventListener('click', () => { state.detailOffset -= 100; detailRows(); });
  $('detailNext').addEventListener('click', () => { state.detailOffset += 100; detailRows(); });
  $('exportDetail').addEventListener('click', () => saveCsv('lot-sales-detail.csv', [['Lot','Subdivision','Project','Territory','Builder','Status','Close date','Purchase date','Front ft','Base price','Base $/FF'], ...state.detailLots.map(l => [l.code,l.subdivision,l.project,l.territory,l.builder,l.status,l.closeDate,l.purchaseDate,l.width,l.price,l.price !== null && l.price >= 0 && l.width > 0 ? l.price / l.width : ''])]));
  $('export').addEventListener('click', exportMatrix);
  $('reset').addEventListener('click', () => { ['territory','project','builder','search'].forEach(id => $(id).value = ''); $('status').value = 'Sold'; $('dateField').value = 'closeDate'; $('period').value = '13'; $('excludeBuilders').checked = true; $('metric').value = 'avgPriceFF'; $('sort').value = 'name'; state.collapsed.clear(); applyPeriod(); update(); });
  $('audit').addEventListener('click', () => { $('auditText').textContent = 'Land Master Insights v1.0.1\n' + JSON.stringify(LMRuntime.current(), null, 2) + '\n\n' + state.log.join('\n'); $('diagnostics').showModal(); });
  $('closeAudit').addEventListener('click', () => $('diagnostics').close());
  $('refresh').addEventListener('click', load);
  applyPeriod();
  async function start() {
    if (window.parent === window && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      $('connection').textContent = 'Creator widget'; $('summary').textContent = 'Ready to connect'; $('refresh').disabled = true;
      blank('Ready for Land Master', 'Add this URL as an externally hosted widget in Zoho Creator to load your live lot sales.'); return;
    }
    try { if (!window.ZOHO || !ZOHO.CREATOR || !ZOHO.CREATOR.DATA) throw new Error('Creator SDK is unavailable.'); await initializeSalesCreator(); configureSalesReporter(); await load(); }
    catch (error) { $('connection').textContent = 'Not connected'; log(error.message); blank('Open inside Land Master', 'Live data is available when this page runs as a Zoho Creator widget.'); notice(error.message, true); }
  }
  start();
})();
