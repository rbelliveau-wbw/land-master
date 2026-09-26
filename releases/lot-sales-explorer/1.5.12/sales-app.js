(function () {
  'use strict';
  const M = window.LotSalesModel, $ = id => document.getElementById(id);
  const state = { lots: [], report: null, loaded: false, busy: false, collapsed: new Set(), detailLots: [], detailOffset: 0, cardRowKey: '', log: [], historyReady: false, historyError: null, generation: 0, references: null, window: null, scoped: false };
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = value => value === null || value === undefined ? '—' : '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const moneyFF = value => value === null || value === undefined ? '—' : '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const percent = value => value === null || value === undefined ? '—' : value.toLocaleString('en-US', { maximumFractionDigits: 2 }) + '%';
  const decimal = value => value === null || value === undefined ? '—' : value.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const integer = value => value.toLocaleString('en-US');
  const monthLabel = month => new Date(month + '-01T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  function renderFilterSummary() {
    const selected = id => [...$(id).selectedOptions].filter(option => option.value).map(option => option.text);
    const scope = (id, single, plural) => { const values = selected(id); return values.length === 1 ? single + ': ' + values[0] : values.length > 1 ? values.length + ' ' + plural : ''; };
    const statuses = selected('status');
    const period = $('period').value === 'all' ? 'All history' : $('from').value && $('to').value ? monthLabel($('from').value) + ' – ' + monthLabel($('to').value) : 'Choose date range';
    const chips = [statuses.length ? statuses.join(' & ') + ' lots' : 'All statuses', period, $('dateField').selectedOptions[0]?.text || 'Close Date',
      scope('territory', 'Territory', 'territories'), scope('project', 'Project', 'projects'), scope('builder', 'Builder', 'builders'),
      $('excludeBuilders').checked ? 'Unassigned / Other / Placeholder excluded' : 'Unassigned / Other / Placeholder included'].filter(Boolean);
    $('filterSummary').innerHTML = chips.map(value => '<span class="sales-filter-chip">' + esc(value) + '</span>').join('');
  }
  const dateLabel = date => date ? date.slice(5, 7) + '/' + date.slice(8) + '/' + date.slice(2, 4) : '—';
  const valueLabel = (s, metric) => metric === 'count' ? s && s.count ? integer(s.count) : '' : !s || s[metric] === null ? '—' : money(s[metric]);
  function bucketByMonth(lots, dateField) {
    const buckets = new Map();
    lots.forEach(lot => {
      const month = lot[dateField]?.slice(0, 7);
      if (!month) return;
      if (!buckets.has(month)) buckets.set(month, []);
      buckets.get(month).push(lot);
    });
    return buckets;
  }
  function log(message) { state.log.push(new Date().toISOString() + ' ' + message); if (state.log.length > 60) state.log.shift(); }
  function notice(message, error) { $('notice').hidden = !message; $('notice').textContent = message; $('notice').classList.toggle('error', !!error); }
  function selectedFilters() { return { projectIds: InsightsControls.values($('project')), territories: InsightsControls.values($('territory')), builderIds: InsightsControls.values($('builder')),
    search: $('search').value.trim(), statuses: InsightsControls.values($('status')), dateField: $('dateField').value, groupBy: $('groupBy').value, excludeBuilders: $('excludeBuilders').checked,
    from: $('period').value === 'all' ? '' : $('from').value, to: $('period').value === 'all' ? '' : $('to').value }; }
  function applyPeriod() {
    const period = $('period').value, now = new Date(), y = now.getFullYear(), m = now.getMonth();
    const key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (['twoYears','currentYear','previousYear'].includes(period)) { $('from').value = (period === 'currentYear' ? y : y - 1) + '-01'; $('to').value = (period === 'previousYear' ? y - 1 : y) + '-12'; }
    else if (period !== 'custom' && period !== 'all') { $('to').value = key(now); $('from').value = key(new Date(y, period === 'ytd' ? 0 : m - Number(period) + 1, 1)); }
    $('from').disabled = period === 'all'; $('to').disabled = period === 'all'; InsightsControls.syncAll();
  }
  function options(control, entries, empty) {
    const previous = InsightsControls.values(control);
    control.innerHTML = '<option value="" hidden>' + esc(empty) + '</option>' + entries.map(([value, label]) => '<option value="' + esc(value) + '">' + esc(label) + '</option>').join('');
    previous.filter(value => !entries.some(([id]) => id === value)).forEach(value => control.add(new Option('Unavailable selection', value)));
    InsightsControls.setValues(control,previous);
  }
  function fillFilters() {
    const refs = state.references;
    const sorted = rows => rows.sort((a, b) => a[1].localeCompare(b[1]));
    const projects = sorted(refs.projects.map(r => [M.id(r.ID), M.text(r.Project_Name)]));
    options($('territory'), sorted([...new Set(refs.subdivisions.map(r => M.text(r.Territory) || 'Unassigned'))].map(t => [t, t])), 'All territories');
    options($('project'), projects, 'All projects');
    options($('builder'), sorted(refs.builders.filter(r => M.text(r.Type1) === 'Builder').map(r => [M.id(r.ID), M.text(r.Builder_Name) || 'Unassigned'])), 'All builders');
    const projectScope = !state.scoped && new URLSearchParams(location.search).get('projectId');
    state.scoped = true;
    if (projectScope) {
      if (!projects.some(([id]) => id === projectScope)) $('project').add(new Option('Unavailable project', projectScope));
      InsightsControls.setValues($('project'),[projectScope]);
    }
  }
  function blank(title, subtitle, rangeText = 'Loading months…') {
    $('matrixHead').innerHTML = ''; $('matrixBody').innerHTML = ''; $('matrixFoot').innerHTML = '';
    $('empty').hidden = false; $('empty').innerHTML = '<div class="empty-symbol" aria-hidden="true">▥</div><h2>' + esc(title) + '</h2><p>' + esc(subtitle) + '</p>';
    $('export').disabled = true; $('monthPage').textContent = rangeText;
  }
  function render() {
    hideSubdivisionCard();
    InsightsControls.syncAll();
    renderFilterSummary();
    if (!state.loaded) return;
    historyStatus();
    const f = selectedFilters();
    if (!state.historyReady && ($('period').value === 'all' || f.from < state.window.from || f.to > state.window.to)) {
      state.report = null; $('summary').textContent = 'Waiting for complete history';
      blank(state.historyError ? 'Historical data unavailable' : 'Historical data is still loading', 'Current and previous year are ready. Your selected view will appear when history finishes.'); return;
    }
    let r;
    try { if ($('period').value !== 'all' && (!f.from || !f.to)) throw new Error('Choose both a start and end month.'); r = M.reportSelection(state.lots, selectedFilters()); } catch (error) { state.report = null; blank('Check the selected dates', error.message); $('summary').textContent = 'Invalid date range'; notice(error.message, true); return; }
    notice(''); state.report = r;
    if ($('period').value === 'all') { $('from').value = r.from; $('to').value = r.to; InsightsControls.syncAll(); renderFilterSummary(); }
    const metric = $('metric').value, def = M.metrics[metric], months = r.months;
    const filters = selectedFilters(), dateName = r.dateField === 'closeDate' ? 'Close date' : 'Purchase date';
    $('scopeLabel').textContent = (filters.projectIds.length === 1 ? [...$('project').selectedOptions].find(o=>o.value)?.text : filters.projectIds.length ? filters.projectIds.length + ' projects' : 'All projects') + ' · ' + r.status + ' lots · ' + monthLabel(r.from) + ' – ' + monthLabel(r.to);
    $('metric').title = def.description;
    $('summary').textContent = r.reports.map(part => part.status + ': ' + integer(part.stats.count) + ' lots across ' + integer(new Set(part.rows.map(row => row.id)).size) + ' subdivisions').join('. ');
    $('definition').textContent = def.description; $('definition').title = def.description + ' Archived lots are included in historical results. First sale uses all close dates within the current territory/project/builder/search filters. Average front footage uses the selected status and period.';
    const perFootMetric = ['avgPriceFF','avgTotalPriceFF','weightedPriceFF'].includes(metric);
    const missingMetric = metric === 'avgTotalPriceFF' ? 'missingTotalPriceFF' : 'missingPriceFF';
    $('quality').textContent = [perFootMetric && r.reports.some(part=>part.stats[missingMetric]) ? integer(r.reports.reduce((n,part)=>n+part.stats[missingMetric],0)) + ' lots without usable $/FF' : '', state.historyReady && r.missingDates ? integer(r.missingDates) + ' lots missing ' + dateName.toLowerCase() : ''].filter(Boolean).join(' · ');
    $('monthPage').textContent = months.length ? monthLabel(months[months.length - 1]) + ' – ' + monthLabel(months[0]) + ' · ' + months.length + ' months' : 'No months to show';
    if (!r.rows.length) { blank('No lots match these filters', r.missingDates ? 'Matching lots have no usable ' + dateName.toLowerCase() + ' in this period.' : 'Try another period, status, project, or builder.', $('monthPage').textContent); return; }
    $('empty').hidden = true; $('export').disabled = !state.historyReady; $('export').title = state.historyReady ? 'Export all selected months' : 'Available when historical data finishes loading';
    $('matrixHead').innerHTML = '<tr><th class="sticky" scope="col"><span id="groupBySlot" class="sales-header-picker"></span></th><th scope="col" title="Earliest Sold close date, across all dates, within current scope filters">First Lot Sale<small>All dates</small></th><th scope="col" title="Mean positive front footage for lots in this period">Avg Front Ft<small>Selected range</small></th><th scope="col" class="period-total" title="Calculated over the entire selected range, including offscreen months"><span id="metricSlot" class="sales-header-picker"></span></th>' + months.map(m => '<th scope="col">' + esc(monthLabel(m).split(' ')[0]) + '<small>' + m.slice(0, 4) + '</small></th>').join('') + '</tr>';
    InsightsControls.placePicker('groupBy', $('groupBySlot'));
    InsightsControls.placePicker('metric', $('metricSlot'));
    const groups = new Map(), allCounts = state.historyReady ? M.subdivisionCounts(state.lots) : null;
    r.rows.forEach(row => { const key = JSON.stringify([row.status,row.groupId]); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(row); });
    let max = 1;
    r.rows.forEach(row => row.cells.forEach(stats => { max = Math.max(max, stats[metric] || 0); }));
    function cell(stats, row, month, total) {
      if (!stats || !stats.count) return '<td class="missing' + (total ? ' period-total' : '') + '">' + (metric === 'count' ? '' : '—') + '</td>';
      const v = stats[metric], shading = !total && v !== null ? ' style="background:rgba(18,131,145,' + (0.025 + (v / max) * .1).toFixed(3) + ')"' : '';
      const title = stats.count + ' lots · ' + stats.eligible + ' with usable $/FF · Click for lot detail';
      return '<td' + (total ? ' class="period-total"' : '') + shading + '><button class="cell-button" data-subdivision="' + esc(row.key) + '" data-month="' + esc(month || '') + '" title="' + esc(title) + '" aria-label="' + esc(row.name + ', ' + (month ? monthLabel(month) : 'selected period') + ', ' + def.label + ' ' + valueLabel(stats, metric) + ', ' + stats.count + ' lots') + '">' + valueLabel(stats, metric) + '</button></td>';
    }
    let html = '';
    groups.forEach((rows, group) => {
      const closed = state.collapsed.has(group), count = rows.reduce((n, row) => n + row.stats.count, 0);
      const groupLabel = esc((r.statuses.length > 1 ? rows[0].status + ' · ' : '') + rows[0].groupName);
      const groupCount = new Set(rows.map(row => row.id)).size + ' subdivisions · ' + integer(count) + ' lots';
      const groupLots = closed ? rows.flatMap(row => row.lots) : null;
      const groupStats = closed ? M.stats(groupLots) : null;
      const groupMonths = closed ? bucketByMonth(groupLots, r.dateField) : null;
      const groupFirstSale = closed && state.historyReady ? rows.map(row => row.firstSale).filter(Boolean).sort()[0] || null : null;
      html += '<tr class="territory' + (closed ? ' is-collapsed' : '') + '"><th scope="rowgroup" class="sticky"><button class="territory-toggle" data-group="' + esc(group) + '" aria-expanded="' + !closed + '"><span aria-hidden="true">' + (closed ? '▸' : '▾') + '</span>' + groupLabel + '</button>' + (closed ? '<small class="sales-group-count">' + groupCount + '</small>' : '') + '</th>' +
        (closed ? '<td class="identity">' + (state.historyReady ? dateLabel(groupFirstSale) : state.historyError ? 'Unavailable' : 'Loading…') + '</td><td class="identity">' + decimal(groupStats.avgWidth) + '</td><td class="period-total">' + valueLabel(groupStats, metric) + '</td>' + months.map(month => '<td>' + valueLabel(groupMonths.has(month) ? M.stats(groupMonths.get(month)) : null, metric) + '</td>').join('') : '<th colspan="' + (months.length + 3) + '">' + groupCount + '</th>') + '</tr>';
      if (!closed) rows.forEach(row => {
        const counts = allCounts?.get(row.id);
        const soldOut = counts && counts.total > 0 && counts.sold === counts.total;
        const badge = soldOut ? '<span class="sold-out-badge" title="Sold Out" aria-label="Sold Out"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5 8 14l8-8"/></svg></span>' : '';
        html += '<tr><td class="sticky"><button class="subdivision-counts" data-card="' + esc(row.key) + '" aria-label="Subdivision details for ' + esc(row.name) + '" aria-haspopup="dialog" aria-expanded="false">' + esc(row.name) + '</button>' + badge + (r.statuses.length > 1 ? '<small class="status-tag">' + esc(row.status) + '</small>' : '') + '</td><td class="identity">' + (state.historyReady ? dateLabel(row.firstSale) : state.historyError ? 'Unavailable' : 'Loading…') + '</td><td class="identity">' + decimal(row.stats.avgWidth) + '</td>' + cell(row.stats, row, '', true) + months.map(month => cell(row.cells.get(month), row, month, false)).join('') + '</tr>';
      });
    });
    $('matrixBody').innerHTML = html;
    $('matrixFoot').innerHTML = r.reports.map(part => {
      const partMonths = bucketByMonth(part.lots, r.dateField);
      return '<tr><td class="sticky">' + esc(part.status) + ' totals</td><td>—</td><td>' + decimal(part.stats.avgWidth) + '</td><td class="period-total">' + valueLabel(part.stats, metric) + '</td>' + months.map(month => '<td>' + valueLabel(partMonths.has(month) ? M.stats(partMonths.get(month)) : null, metric) + '</td>').join('') + '</tr>';
    }).join('');
    if (state.lots.some(lot => lot.missingSubdivision)) notice('Some lots reference subdivisions unavailable to you. Those rows are labeled Unknown or Unassigned.');
  }
  function update() { hideSubdivisionCard(); render(); }
  function saveCsv(filename, rows) {
    const url = URL.createObjectURL(new Blob([M.csv(rows)], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a');
    a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportMatrix() {
    const r = state.report, metric = $('metric').value;
    if (!r || !state.historyReady) return;
    const value = stats => !stats || metric === 'count' && !stats.count || stats[metric] === null ? '' : Math.round(stats[metric] * 100) / 100;
    const rows = [['Land Master Insights', M.metrics[metric].label], ['Status', r.status, 'Date Basis', r.dateField === 'closeDate' ? 'Close Date' : 'Purchase Date'], ['Group By', $('groupBy').selectedOptions[0].text, 'From', r.from, 'To', r.to],
      ['Status', 'Group', 'Territory', 'Subdivision', 'Project', 'Builder', 'First Lot Sale (all dates)', 'Average Front Ft (selected period)', 'Period ' + M.metrics[metric].label, ...r.months]];
    r.rows.forEach(row => rows.push([row.status, row.groupName, row.territory, row.name, row.project, r.groupBy === 'builder' ? row.builder : '', row.firstSale, row.stats.avgWidth, value(row.stats), ...r.months.map(month => value(row.cells.get(month)))]));
    r.reports.forEach(part => rows.push([part.status + ' totals', '', '', '', '', '', '', part.stats.avgWidth, value(part.stats), ...r.months.map(month => value(M.stats(part.lots.filter(l => l[r.dateField].slice(0, 7) === month))))]));
    saveCsv('lot-sales-' + r.from + '-to-' + r.to + '.csv', rows);
  }
  function detailRows() {
    const rows = state.detailLots.slice(state.detailOffset, state.detailOffset + 100);
    const dateField = state.report.dateField, dateName = dateField === 'closeDate' ? 'Close Date' : 'Purchase Date';
    let previousBuilder = null, previousDate = null;
    $('detailBody').innerHTML = rows.map(l => {
      const total = M.totalPrice(l), validWidth = l.width !== null && l.width > 0;
      const builderChanged = l.builder !== previousBuilder, selectedDate = l[dateField] || '';
      const builderHeading = builderChanged ? '<tr class="detail-group"><th colspan="14" scope="rowgroup">' + esc(l.builder) + '</th></tr>' : '';
      const dateHeading = builderChanged || selectedDate !== previousDate ? '<tr class="detail-date-group"><th colspan="14" scope="rowgroup">' + dateName + ' · ' + (selectedDate ? dateLabel(selectedDate) : 'No date') + '</th></tr>' : '';
      previousBuilder = l.builder; previousDate = selectedDate;
      return builderHeading + dateHeading + '<tr><td>' + esc(l.code || ('Block ' + l.block + ' · Lot ' + l.lot)) + '</td><td>' + esc(l.builder) + '</td><td>' + esc(l.status) + '</td><td>' + dateLabel(l.closeDate) + '</td><td>' + dateLabel(l.purchaseDate) + '</td><td>' + decimal(l.width) + '</td><td>' + money(l.price) + '</td><td>' + moneyFF(l.price !== null && l.price >= 0 && validWidth ? l.price / l.width : null) + '</td><td>' + money(l.interest) + '</td><td>' + moneyFF(l.interest !== null && validWidth ? l.interest / l.width : null) + '</td><td>' + percent(l.escalator) + '</td><td>' + money(total) + '</td><td>' + moneyFF(total !== null && total >= 0 && validWidth ? total / l.width : null) + '</td><td class="lot-notes">' + esc(l.notes || '—') + '</td></tr>';
    }).join('');
    $('detailPage').textContent = (state.detailOffset + 1) + '–' + Math.min(state.detailOffset + 100, state.detailLots.length) + ' of ' + state.detailLots.length + ' lots';
    $('detailPrev').disabled = state.detailOffset === 0; $('detailNext').disabled = state.detailOffset + 100 >= state.detailLots.length;
  }
  function openDetail(subdivision, month) {
    const r = state.report, row = r.rows.find(row => row.key === subdivision);
    if (!row) return;
    state.detailLots = M.sortDetailLots(row.lots.filter(l => !month || l[r.dateField].slice(0, 7) === month), r.dateField);
    state.detailOffset = 0; $('detailTitle').textContent = row.name;
    $('detailEyebrow').textContent = row.territory.toUpperCase() + ' / LOT DETAIL';
    $('detailMeta').textContent = (month ? monthLabel(month) : monthLabel(r.from) + ' – ' + monthLabel(r.to)) + ' · ' + row.status + ' · ' + state.detailLots.length + ' lots';
    detailRows(); $('detail').showModal();
  }
  let cardTrigger = null, cardHideTimer = null, triggerHovered = false, cardHovered = false, cardKeyboardFocus = false, lastPointerDown = 0;
  function cancelCardHide() { clearTimeout(cardHideTimer); cardHideTimer = null; }
  function hideSubdivisionCard() {
    cancelCardHide();
    $('subdivisionCard').hidden = true;
    if (cardTrigger) cardTrigger.setAttribute('aria-expanded', 'false');
    cardTrigger = null;
    triggerHovered = false; cardHovered = false; cardKeyboardFocus = false;
    state.cardRowKey = '';
  }
  function scheduleCardHide() {
    cancelCardHide();
    cardHideTimer = setTimeout(() => {
      if (triggerHovered || cardHovered || (cardKeyboardFocus && (document.activeElement === cardTrigger || $('subdivisionCard').contains(document.activeElement)))) return;
      hideSubdivisionCard();
    }, 220);
  }
  function positionSubdivisionCard() {
    if (!cardTrigger || $('subdivisionCard').hidden) return;
    const card = $('subdivisionCard'), anchor = cardTrigger.getBoundingClientRect(), margin = 12, gap = 10;
    const width = card.offsetWidth, height = card.offsetHeight;
    const left = Math.max(margin, Math.min(anchor.left, innerWidth - width - margin));
    const below = anchor.bottom + gap, above = anchor.top - height - gap;
    const top = below + height <= innerHeight - margin ? below : above >= margin ? above : Math.max(margin, Math.min(below, innerHeight - height - margin));
    card.style.left = Math.round(left) + 'px'; card.style.top = Math.round(top) + 'px';
  }
  function openSubdivisionCard(key, trigger) {
    const row = state.report?.rows.find(item => item.key === key);
    if (!row || !trigger) { hideSubdivisionCard(); return; }
    cancelCardHide();
    if (cardTrigger && cardTrigger !== trigger) cardTrigger.setAttribute('aria-expanded', 'false');
    cardTrigger = trigger; cardTrigger.setAttribute('aria-expanded', 'true');
    state.cardRowKey = key;
    const counts = state.historyReady ? M.subdivisionCounts(state.lots).get(row.id) : null;
    const field = state.report.dateField === 'closeDate' ? 'Close Date' : 'Purchase Date';
    const lastDate = row.lots.map(lot => lot[state.report.dateField]).filter(Boolean).sort().at(-1);
    const builders = new Set(row.lots.map(lot => lot.builderId || lot.builder));
    const item = (label, value) => '<div class="subdivision-card-stat"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong></div>';
    $('subdivisionCardTitle').textContent = row.name;
    $('subdivisionCardContext').textContent = row.project + ' · ' + row.territory + (state.report.groupBy === 'builder' ? ' · ' + row.builder : '');
    $('subdivisionCardBody').innerHTML = '<section><div class="subdivision-card-section-head"><h3>All Lots</h3><span>Complete History</span></div><div class="subdivision-card-grid all-lots-grid">' +
      (counts ? item('Total', integer(counts.total)) + item('Sold', integer(counts.sold)) + item('Contracted', integer(counts.contracted)) + item('Open', integer(counts.open)) : '<p>' + (state.historyError ? 'All-lot counts unavailable' : 'All-lot counts loading') + '</p>') +
      '</div>' + (counts && counts.total ? '<div class="subdivision-card-progress" role="img" aria-label="' + esc(counts.sold + ' of ' + counts.total + ' lots sold') + '"><span style="width:' + (counts.sold / counts.total * 100).toFixed(1) + '%"></span></div>' : '') + '</section><section><div class="subdivision-card-section-head"><h3>Selected View</h3><span>' + esc(row.status + ' · ' + monthLabel(state.report.from) + ' – ' + monthLabel(state.report.to)) + '</span></div><div class="subdivision-card-grid">' +
      item('Lots', integer(row.stats.count)) + item('Builders', integer(builders.size)) + item('Average Front Ft', decimal(row.stats.avgWidth)) + item('Average Base $/FF', moneyFF(row.stats.avgPriceFF)) +
      item('Total Base Price', money(row.stats.totalPrice)) + item('Latest ' + field, dateLabel(lastDate)) + item('First Lot Sale', state.historyReady ? dateLabel(row.firstSale) : state.historyError ? 'Unavailable' : 'Loading…') +
      '</div></section>';
    $('subdivisionCard').hidden = false;
    positionSubdivisionCard();
  }
  function historyStatus() {
    $('historyBanner').hidden = state.historyReady || !state.loaded;
    $('historyBanner').classList.toggle('loading', !state.historyError);
    $('historyBanner').classList.toggle('failed', !!state.historyError);
    $('retryHistory').hidden = !state.historyError;
    $('historyMessage').textContent = state.historyError ? 'Historical data could not load. Current and previous year are available.' : 'Historical data loading · Current and previous year are ready to explore.';
    $('exportDetail').disabled = !state.historyReady;
  }
  async function history(generation) {
    state.historyError = null; historyStatus();
    try {
      const lots = await LotSalesCreator.loadHistory(ZOHO.CREATOR.DATA, (report, count, total) => {
        if (generation !== state.generation) return;
        $('historyMessage').textContent = 'Historical data loading · ' + integer(count) + ' / ' + integer(total) + ' lots · You can keep exploring.';
      }, { isCancelled: () => generation !== state.generation });
      if (generation !== state.generation) return;
      state.lots = M.normalize({ ...state.references, lots }); state.historyReady = true;
      const scroll = document.querySelector('.matrix-scroll'), left = scroll.scrollLeft, top = scroll.scrollTop;
      render(); scroll.scrollLeft = left; scroll.scrollTop = top;
      $('updated').textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' · ' + integer(state.lots.length) + ' lots · All history loaded';
      // Open drilldowns keep their original snapshot until closed; refreshing never changes rows under the pointer.
      if ($('detail').open) $('detailMeta').textContent += ' · Snapshot from opening';
      log('Complete history loaded: ' + state.lots.length + ' lots.');
    } catch (error) {
      if (generation !== state.generation) return;
      state.historyError = error.message; log('History failed: ' + error.message); render();
      $('historyBanner').title = error.message;
    }
  }
  async function load() {
    const generation = ++state.generation;
    state.busy = true; state.loaded = false; state.historyReady = false; state.historyError = null; state.report = null;
    $('refresh').disabled = true; $('export').disabled = true; $('historyBanner').hidden = true;
    if ($('detail').open) $('detail').close();
    hideSubdivisionCard();
    $('connection').textContent = 'Loading…'; $('summary').textContent = 'Loading current and previous year…'; notice(''); blank('Loading recent sales', 'Current and previous calendar years load first.');
    try {
      const data = await LotSalesCreator.loadRecent(ZOHO.CREATOR.DATA, null, { isCancelled: () => generation !== state.generation });
      if (generation !== state.generation) return;
      state.references = data; state.window = data.window;
      state.lots = M.normalize(data); state.loaded = true; fillFilters(); render();
      const runtime = LMRuntime.current(); $('connection').textContent = runtime.environment === 'PRODUCTION' ? '● Live' : '● ' + runtime.environment;
      $('updated').textContent = integer(state.lots.length) + ' recent lots loaded · Read-only';
      log('Recent years loaded: ' + state.lots.length + ' lots.');
      window.dispatchEvent(new CustomEvent('insights:ready', { detail: { subdivisions: data.subdivisions, projects: data.projects } }));
      void history(generation);
    } catch (error) {
      if (generation !== state.generation) return;
      const message = error && error.message || String(error); log('Load failed: ' + message); $('connection').textContent = 'Load failed'; $('summary').textContent = 'Report unavailable';
      blank('Unable to load the report', 'Refresh to retry. Open Diagnostics for details.'); notice(message, true);
      LMCriticalErrors.breadcrumb('error', 'Lot sales report load failed', { message }, false);
    } finally { if (generation === state.generation) { state.busy = false; $('refresh').disabled = false; } }
  }
  ['territory','project','builder','dateField','excludeBuilders','groupBy'].forEach(id => $(id).addEventListener('change', () => { if (id === 'groupBy') state.collapsed.clear(); update(); }));
  $('status').addEventListener('change', () => { if (InsightsControls.values($('status')).includes('Contracted')) $('dateField').value = 'purchaseDate'; update(); });
  $('metric').addEventListener('change', render);
  ['from','to'].forEach(id => $(id).addEventListener('change', () => { $('period').value = 'custom'; update(); }));
  $('period').addEventListener('change', () => { applyPeriod(); update(); if ($('period').value === 'custom') { setPanel('allFilters', 'moreFilters', true); queueMicrotask(() => $('fromPicker').focus()); } });
  let searchTimer; $('search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(update, 160); });
  $('matrixBody').addEventListener('click', e => { const group = e.target.closest('[data-group]'), cell = e.target.closest('[data-subdivision]'), card = e.target.closest('[data-card]');
    if (group) { const name = group.dataset.group; if (state.collapsed.has(name)) state.collapsed.delete(name); else state.collapsed.add(name); render(); }
    if (cell) openDetail(cell.dataset.subdivision, cell.dataset.month);
    if (card && (e.detail === 0 || matchMedia('(hover: none)').matches)) { openSubdivisionCard(card.dataset.card, card); if (e.detail === 0) { cardKeyboardFocus = true; $('viewSubdivisionLots').focus(); } }
  });
  $('matrixBody').addEventListener('pointerover', e => { const trigger = e.target.closest('[data-card]'); if (trigger && e.pointerType !== 'touch' && !trigger.contains(e.relatedTarget)) { triggerHovered = true; cardKeyboardFocus = false; openSubdivisionCard(trigger.dataset.card, trigger); } });
  $('matrixBody').addEventListener('pointerout', e => { const trigger = e.target.closest('[data-card]'); if (trigger && !trigger.contains(e.relatedTarget)) { triggerHovered = false; scheduleCardHide(); } });
  let suppressCardFocus = false;
  $('matrixBody').addEventListener('focusin', e => { const trigger = e.target.closest('[data-card]'); if (trigger && !suppressCardFocus && Date.now() - lastPointerDown > 500) { cardKeyboardFocus = true; openSubdivisionCard(trigger.dataset.card, trigger); } });
  $('matrixBody').addEventListener('focusout', e => { if (e.target.closest('[data-card]')) scheduleCardHide(); });
  $('subdivisionCard').addEventListener('pointerenter', () => { cardHovered = true; cancelCardHide(); });
  $('subdivisionCard').addEventListener('pointerleave', () => { cardHovered = false; scheduleCardHide(); });
  $('subdivisionCard').addEventListener('focusin', cancelCardHide);
  $('subdivisionCard').addEventListener('focusout', scheduleCardHide);
  document.addEventListener('pointerdown', e => { lastPointerDown = Date.now(); cardKeyboardFocus = false; if (!$('subdivisionCard').hidden && !cardTrigger?.contains(e.target) && !$('subdivisionCard').contains(e.target)) hideSubdivisionCard(); });
  document.querySelector('.matrix-scroll').addEventListener('scroll', hideSubdivisionCard, { passive: true });
  window.addEventListener('resize', hideSubdivisionCard);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('subdivisionCard').hidden) { hideSubdivisionCard(); e.stopPropagation(); } });
  $('closeDetail').addEventListener('click', () => $('detail').close());
  $('closeSubdivisionCard').addEventListener('click', () => { const trigger = cardTrigger; hideSubdivisionCard(); suppressCardFocus = true; trigger?.focus(); queueMicrotask(() => { suppressCardFocus = false; }); });
  $('viewSubdivisionLots').addEventListener('click', () => { const key = state.cardRowKey; hideSubdivisionCard(); openDetail(key, ''); });
  $('detailPrev').addEventListener('click', () => { state.detailOffset -= 100; detailRows(); });
  $('detailNext').addEventListener('click', () => { state.detailOffset += 100; detailRows(); });
  $('exportDetail').addEventListener('click', () => saveCsv('lot-sales-detail.csv', [['Lot','Subdivision','Project','Territory','Builder','Status','Close Date','Purchase Date','Front Ft','Base Price','Base $/FF','Interest','Interest $/FF','Escalator %','Total Price','Price $/FF','Notes'], ...state.detailLots.map(l => { const total = M.totalPrice(l), validWidth = l.width !== null && l.width > 0; return [l.code,l.subdivision,l.project,l.territory,l.builder,l.status,l.closeDate,l.purchaseDate,l.width,l.price,l.price !== null && l.price >= 0 && validWidth ? l.price / l.width : '',l.interest,l.interest !== null && validWidth ? l.interest / l.width : '',l.escalator,total,total !== null && total >= 0 && validWidth ? total / l.width : '',l.notes]; })]));
  $('export').addEventListener('click', exportMatrix);
  function setPanel(toggleId, panelId, open) {
    $(panelId).hidden = !open;
    $(toggleId).setAttribute('aria-expanded', String(open));
    $('salesDashboard').querySelector('.sales-filters').classList.toggle('is-expanded', open);
  }
  $('allFilters').addEventListener('click', () => setPanel('allFilters', 'moreFilters', $('moreFilters').hidden));
  $('reset').addEventListener('click', () => { ['territory','project','builder'].forEach(id => InsightsControls.setValues($(id),[])); $('search').value = ''; InsightsControls.setValues($('status'),['Sold']); $('dateField').value = 'closeDate'; $('groupBy').value = 'project'; $('period').value = 'twoYears'; $('excludeBuilders').checked = true; $('metric').value = 'avgPriceFF'; state.collapsed.clear(); applyPeriod(); update(); });
  $('audit').addEventListener('click', () => { $('auditText').textContent = 'Land Master Insights v1.5.12\n' + JSON.stringify(LMRuntime.current(), null, 2) + '\n\n' + state.log.join('\n'); $('diagnostics').showModal(); });
  $('closeAudit').addEventListener('click', () => $('diagnostics').close());
  $('refresh').addEventListener('click', () => { if (InsightsShell.current() === 'sales') void load(); });
  $('retryHistory').addEventListener('click', () => { if (state.loaded && state.historyError) void history(state.generation); });
  applyPeriod();
  async function start() {
    if (window.parent === window && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      $('connection').textContent = 'Creator widget'; $('summary').textContent = 'Ready to connect'; $('refresh').disabled = true;
      blank('Ready for Land Master', 'Add this URL as an externally hosted widget in Zoho Creator to load your live lot sales.'); return;
    }
    try { if (!window.ZOHO || !ZOHO.CREATOR || !ZOHO.CREATOR.DATA) throw new Error('Creator SDK is unavailable.'); await initializeSalesCreator(); configureSalesReporter(); InsightsShell.markConnected(); await load(); }
    catch (error) { $('connection').textContent = 'Not connected'; log(error.message); blank('Open inside Land Master', 'Live data is available when this page runs as a Zoho Creator widget.'); notice(error.message, true); }
  }
  start();
})();
