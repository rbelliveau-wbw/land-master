/* Presentation adapter for the existing read-only Deluge summary.
 * The native HTML owns every count, date, scope and progress value. Never join
 * schedules by Builder name or recompute business math here. Unsupported native
 * content returns false so the caller can keep its isolated HTML fallback.
 */
(function (global) {
  'use strict';

  const TAGS = new Set(['style', 'div', 'table', 'tbody', 'tr', 'td', 'b']);
  const COLORS = new Set(['#0d5bd7', '#b8860b', '#f6a6a6', '#edf2fb']);
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
  const views = new WeakMap();

  function parse(html) {
    if (typeof html !== 'string' || !html.trim()) throw new Error('Missing native summary.');
    // Reject resource/script-bearing tags before creating even an inert document.
    for (const match of html.matchAll(/<\/?\s*([a-z][\w:-]*)\b/gi)) {
      if (!TAGS.has(match[1].toLowerCase())) throw new Error('Unsupported native tag.');
    }
    const document = new global.DOMParser().parseFromString(html, 'text/html');
    document.querySelectorAll('style').forEach(node => node.remove());
    const covered = new Set();
    function text(node) {
      if (!node) throw new Error('Missing native field.');
      const walker = document.createTreeWalker(node, 4);
      while (walker.nextNode()) covered.add(walker.currentNode);
      return normalize(node.textContent);
    }
    function direct(node, className, optional) {
      const matches = [...node.children].filter(child => child.classList.contains(className));
      if (optional && !matches.length) return null;
      if (matches.length !== 1) throw new Error('Unsupported native section.');
      return matches[0];
    }
    function descendant(node, className) {
      const matches = node.querySelectorAll('.' + className);
      if (matches.length !== 1) throw new Error('Unsupported native field.');
      return matches[0];
    }
    function rows(table) {
      const result = [...table.rows].map(row => {
        if (row.cells.length !== 2 || [...row.cells].some(cell => cell.tagName !== 'TD')) throw new Error('Unsupported native table.');
        return {label: text(row.cells[0]), value: text(row.cells[1])};
      });
      if (!result.length || result.some(row => !row.label)) throw new Error('Missing native rows.');
      return result;
    }
    function gradient(node) {
      const match = (node.getAttribute('style') || '').trim().match(/^background\s*:\s*linear-gradient\(\s*90deg\s*,([^)]+)\)\s*;?$/i);
      if (!match) throw new Error('Unsupported native progress.');
      const stops = match[1].split(',').map(stop => {
        const found = stop.trim().match(/^(#[a-f\d]{6})\s+(\d+(?:\.\d+)?)%$/i);
        if (!found || !COLORS.has(found[1].toLowerCase()) || Number(found[2]) > 100) throw new Error('Unsupported native progress stop.');
        return found[1].toLowerCase() + ' ' + found[2] + '%';
      });
      if (stops.length < 3) throw new Error('Incomplete native progress.');
      return 'linear-gradient(90deg,' + stops.join(',') + ')';
    }
    function progress(node) {
      const wrapper = direct(node, 'fm-progress-wrap'), meta = direct(wrapper, 'fm-progress-meta');
      const expected = direct(meta, 'fm-progress-expected', true);
      return {label: text(direct(node, 'fm-progress-label')), background: gradient(direct(wrapper, 'fm-progress')), sold: text(direct(meta, 'fm-progress-sold')), expected: expected ? text(expected) : ''};
    }
    function month(node) {
      const head = direct(node, 'fm-month-head'), status = direct(head, 'fm-month-status');
      const track = direct(node, 'fm-month-track'), fill = direct(track, 'fm-month-fill');
      const width = (fill.getAttribute('style') || '').trim().match(/^width\s*:\s*(\d+(?:\.\d+)?)%\s*;?$/i);
      const now = track.getAttribute('aria-valuenow');
      if (!width || Number(width[1]) > 100 || !/^\d+(?:\.\d+)?$/.test(now || '') || Number(now) > 100 || track.getAttribute('aria-valuemin') !== '0' || track.getAttribute('aria-valuemax') !== '100') throw new Error('Unsupported native month meter.');
      return {label: text(direct(head, 'fm-month-label')), status: text(status), over: status.classList.contains('fm-month-status-over'), width: width[1] + '%', now, ariaLabel: track.getAttribute('aria-label') || '', ariaText: track.getAttribute('aria-valuetext') || ''};
    }
    function recent(node) {
      const grid = direct(node, 'fm-mini-grid');
      const result = [...grid.children].map(item => {
        if (!item.classList.contains('fm-mini')) throw new Error('Unsupported native recent sales.');
        return {label: text(direct(item, 'fm-mini-k')), value: text(direct(item, 'fm-mini-v'))};
      });
      if (result.length !== 4) throw new Error('Incomplete native recent sales.');
      return {title: text(direct(node, 'fm-card-title')), rows: result};
    }
    function schedule(node) {
      const head = direct(node, 'fm-builder-head'), identity = direct(head, 'fm-builder-title-wrap'), stat = direct(head, 'fm-builder-stat');
      const contract = direct(node, 'fm-contract-scope', true);
      return {
        name: text(direct(identity, 'fm-builder-name')),
        obligation: text(direct(identity, 'fm-builder-sub')),
        balance: {label: text(direct(stat, 'fm-builder-stat-k')), value: text(direct(stat, 'fm-builder-stat-v')), negative: stat.classList.contains('fm-builder-stat-neg')},
        progress: progress(node), month: month(direct(node, 'fm-month')),
        terms: rows(direct(node, 'fm-table')), recent: recent(node),
        contract: contract ? {title: text(direct(contract, 'fm-card-title')), obligation: text(direct(contract, 'fm-builder-sub')), progress: progress(contract), terms: rows(direct(contract, 'fm-table'))} : null
      };
    }

    const sections = document.querySelectorAll('.fm-section');
    if (sections.length !== 1) throw new Error('Unsupported native subdivision layout.');
    const section = sections[0], head = direct(section, 'fm-section-head');
    const headLeft = direct(head, 'fm-head-left'), identity = direct(headLeft, 'fm-title-block'), stat = direct(headLeft, 'fm-top-stat');
    const grid = direct(section, 'fm-grid'), facts = direct(grid, 'fm-card'), schedules = direct(grid, 'fm-builder-grid');
    const badge = direct(head, 'fm-badge'), empty = direct(schedules, 'fm-empty', true);
    const model = {
      name: text(direct(identity, 'fm-section-title')), meta: text(direct(identity, 'fm-section-meta')), badge: text(badge),
      balance: {label: text(direct(stat, 'fm-top-stat-k')), value: text(direct(stat, 'fm-top-stat-v')), negative: stat.classList.contains('fm-top-stat-neg')},
      factsTitle: text(direct(facts, 'fm-card-title')), facts: rows(direct(facts, 'fm-table')),
      schedules: [...schedules.children].filter(node => node.classList.contains('fm-builder-card')).map(schedule),
      empty: empty ? text(empty) : ''
    };
    if ((!model.schedules.length && !empty) || (model.schedules.length && empty)) throw new Error('Unsupported native schedules.');
    const walker = document.createTreeWalker(document.body, 4);
    while (walker.nextNode()) {
      if (normalize(walker.currentNode.textContent) && !covered.has(walker.currentNode)) throw new Error('Unmapped native summary information.');
    }
    return model;
  }

  function build(model, document, inventory) {
    const element = (tag, className, value) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (value !== undefined) node.textContent = value;
      return node;
    };
    function nativeValue(tag, className, row) {
      const node = element(tag, className, row.value || '—');
      node.dataset.nativeLabel = row.label;
      node.dataset.nativeValue = row.value;
      node.setAttribute('aria-label', row.label + ': ' + (row.value || 'Not set'));
      return node;
    }
    function balance(data, className) {
      const node = element('div', className + (data.negative ? ' negative' : ''));
      node.append(element('span', className + '-label', data.label), element('strong', className + '-value', data.value));
      return node;
    }
    function progress(data) {
      const node = element('div', 'fs-progress'), track = element('div', 'fs-progress-track'), meta = element('div', 'fs-progress-meta');
      track.style.background = data.background;
      track.setAttribute('aria-hidden', 'true');
      meta.append(element('span', 'fs-progress-sales', data.sold));
      if (data.expected) meta.append(element('span', 'fs-expected', data.expected));
      node.append(element('div', 'fs-progress-label', data.label), track, meta);
      return node;
    }
    function month(data) {
      const node = element('div', 'fs-month'), head = element('div', 'fs-month-head'), track = element('div', 'fs-month-track'), fill = element('div', 'fs-month-fill');
      head.append(element('span', 'fs-month-label', data.label), element('strong', 'fs-month-status' + (data.over ? ' over' : ''), data.status));
      track.setAttribute('role', 'progressbar');
      track.setAttribute('aria-label', data.ariaLabel || data.label + ' sold');
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', '100');
      track.setAttribute('aria-valuenow', data.now);
      track.setAttribute('aria-valuetext', data.ariaText || data.status);
      fill.style.width = data.width;
      track.append(fill);
      node.append(head, track);
      return node;
    }
    function terms(source) {
      const list = element('dl', 'fs-terms'), pending = source.slice();
      const byLabel = label => pending.find(row => row.label === label);
      const remove = row => { pending.splice(pending.indexOf(row), 1); };
      function grouped(title, rows) {
        const field = element('div', 'fs-term'), values = element('dd', 'fs-term-values');
        field.append(element('dt', 'fs-term-label', title), values);
        rows.forEach(row => {
          const units = /\(Lots\)$/.test(row.label) ? ' lots' : /\(Days\)$/.test(row.label) ? ' days' : '';
          const value = nativeValue('span', units ? 'fs-term-pace' : 'fs-term-date', row);
          if (units) value.append(document.createTextNode(units));
          values.append(value);
          remove(row);
        });
        list.append(field);
      }
      ['Initial Closing', 'Second Closing', 'Subsequent Closings'].forEach(label => {
        const rows = [byLabel(label + ' Date'), byLabel(label + ' (Lots)'), byLabel(label + ' (Days)')].filter(Boolean);
        if (rows.length) grouped(label, rows);
      });
      const lastDate = byLabel('Last Takedown Date'), lastLots = byLabel('Last Take (Lots)');
      const closeDate = byLabel('Last Closing Date'), closeLots = byLabel('Last Closing (Lots)');
      // Preserve native term order after the compact Initial/Second/Subsequent pairs.
      for (const row of pending.slice()) {
        if (!pending.includes(row)) continue;
        if (row === lastDate && lastLots) grouped('Last Takedown', [lastDate, lastLots]);
        else if (row === closeDate && closeLots) grouped('Last Closing', [closeDate, closeLots]);
        else grouped(row.label, [row]);
      }
      return list;
    }
    function recent(data) {
      const node = element('section', 'fs-recent'), list = element('dl', 'fs-sales');
      node.append(element('h5', 'fs-recent-title', data.title), list);
      data.rows.forEach(row => {
        const item = element('div', 'fs-sale');
        item.append(element('dt', 'fs-sale-label', row.label), nativeValue('dd', 'fs-sale-value', row));
        list.append(item);
      });
      return node;
    }
    function contract(data) {
      const node = element('details', 'fs-contract'), summary = element('summary', 'fs-contract-title');
      const periods = ['Last 30 Day Sales', 'Last 90 Day Sales', 'Last 6 Month Sales', 'Last 12 Month Sales'];
      const sales = periods.map(label => data.terms.find(row => row.label === label)).filter(Boolean);
      node.open = false;
      summary.append(element('span', '', data.title), element('span', 'fs-contract-count', data.obligation));
      node.append(summary, progress(data.progress), terms(data.terms.filter(row => !sales.includes(row))));
      if (sales.length) node.append(recent({title: 'Recent Sales · Whole Contract', rows: sales}));
      return node;
    }

    const root = element('div', 'fs-summary'), heading = element('header', 'fs-heading'), identity = element('div', 'fs-identity');
    const nameRow = model.facts.find(row => row.label === 'Subdivision Name'), codeRow = model.facts.find(row => row.label === 'Subdivision Code');
    const name = element('h2', 'fs-name', model.name), meta = element('div', 'fs-meta', model.meta);
    // Name and code stay in the heading instead of being duplicated in facts.
    if (nameRow && nameRow.value === model.name) { name.dataset.nativeLabel = nameRow.label; name.dataset.nativeValue = nameRow.value; }
    if (codeRow && (!codeRow.value || model.meta.includes(codeRow.value))) { meta.dataset.nativeLabel = codeRow.label; meta.dataset.nativeValue = codeRow.value; }
    identity.append(name, meta, element('span', 'fs-badge', model.badge));
    heading.append(identity, balance(model.balance, 'fs-balance'));
    const facts = element('dl', 'fs-facts');
    facts.setAttribute('aria-label', model.factsTitle);
    // Keep six lot/date metrics together, then company/county as the context row.
    const orderedFacts = model.facts.filter(row => !['Company', 'County'].includes(row.label)).concat(model.facts.filter(row => ['Company', 'County'].includes(row.label)));
    orderedFacts.forEach(row => {
      if ((row === nameRow && name.dataset.nativeLabel) || (row === codeRow && meta.dataset.nativeLabel)) return;
      const item = element('div', 'fs-fact' + (row.label === 'Company' ? ' fs-fact--company' : row.label === 'County' ? ' fs-fact--county' : ''));
      item.append(element('dt', 'fs-fact-label', row.label), nativeValue('dd', 'fs-fact-value', row));
      facts.append(item);
    });
    const schedulesHeading = element('div', 'fs-schedules-heading');
    schedulesHeading.append(element('h3', '', 'Builder schedules'), element('span', 'fs-schedule-count', 'All ' + model.schedules.length + ' schedule' + (model.schedules.length === 1 ? '' : 's')));
    const cards = element('div', 'fs-cards'), nameCounts = new Map(), namePositions = new Map();
    model.schedules.forEach(data => nameCounts.set(data.name, (nameCounts.get(data.name) || 0) + 1));
    model.schedules.forEach((data, index) => {
      const card = element('article', 'fs-card'), head = element('header', 'fs-card-head'), identity = element('div', 'fs-card-identity');
      card.dataset.scheduleIndex = String(index);
      identity.append(element('h4', 'fs-builder-name', data.name || 'Builder not set'), element('div', 'fs-obligation', data.obligation));
      if (nameCounts.get(data.name) > 1) {
        const position = (namePositions.get(data.name) || 0) + 1;
        namePositions.set(data.name, position);
        identity.append(element('span', 'fs-schedule-order', 'Schedule ' + position + ' of ' + nameCounts.get(data.name)));
      }
      head.append(identity, balance(data.balance, 'fs-card-balance'));
      card.append(head, progress(data.progress), month(data.month), terms(data.terms), recent(data.recent));
      if (data.contract) card.append(contract(data.contract));
      cards.append(card);
    });
    const titleContext=element('dl','fs-title-context');
    titleContext.setAttribute('aria-label','Subdivision company and county');
    for(const contextFact of [...facts.querySelectorAll('.fs-fact--company,.fs-fact--county')]) titleContext.append(contextFact);
    if(titleContext.childElementCount) identity.append(titleContext);
    const titleHead=element('div','fs-title-head');
    titleHead.append(identity,heading.lastChild);
    heading.replaceChildren(titleHead,facts);
    const overview = element('div', 'fs-overview');
    const lotCard = element('aside', 'fs-lot-card');
    lotCard.setAttribute('aria-label', 'Subdivision lot status, all dates');
    const lotHead = element('header', 'subdivision-card-head');
    lotHead.append(element('h3', '', model.name), element('p', '', inventory && inventory.territory || 'Lot status · All dates'));
    const lotBody = element('div', 'subdivision-card-body');
    lotCard.append(lotHead, lotBody);
    const statuses = ['Total', 'Sold', 'Scheduled', 'Contracted', 'Open'];
    const valid = inventory && inventory.counts && Array.isArray(inventory.builders) && statuses.every(status => Number.isSafeInteger(inventory.counts[status]) && inventory.counts[status] >= 0);
    if (valid) {
      const counts = inventory.counts, grid = element('div', 'subdivision-card-grid all-lots-grid');
      statuses.forEach(status => {
        const item = element('div', 'subdivision-card-stat is-' + status.toLowerCase());
        item.append(element('span', '', status), element('strong', '', counts[status].toLocaleString('en-US')));
        grid.append(item);
      });
      lotBody.append(grid);
      const track = element('div', 'subdivision-card-progress-track');
      track.setAttribute('aria-label', counts.Sold + ' sold, ' + counts.Scheduled + ' scheduled, ' + counts.Contracted + ' contracted, ' + counts.Open + ' open out of ' + counts.Total);
      ['Sold', 'Scheduled', 'Contracted'].forEach(status => {
        const segment = element('span', 'progress-' + status.toLowerCase());
        segment.style.width = (counts.Total ? counts[status] / counts.Total * 100 : 0).toFixed(2) + '%';
        track.append(segment);
      });
      lotBody.append(track);
      const breakdown = element('div', 'subdivision-progress-breakdown'), table = element('table', 'builder-matrix');
      table.setAttribute('aria-label', 'Builder lots by status');
      const head = element('thead'), labels = element('tr');
      ['Builder', 'Total', 'Sold', 'Scheduled', 'Contracted'].forEach(label => {
        const cell = element('th', 'is-' + label.toLowerCase(), label);
        cell.scope = 'col'; labels.append(cell);
      });
      head.append(labels);
      const body = element('tbody');
      inventory.builders.slice().sort((a, b) => String(a.builder).localeCompare(String(b.builder))).forEach(row => {
        const tr = element('tr'), builder = element('th'), fullName = String(row.builder || 'Unassigned'), chars = Array.from(fullName);
        builder.scope = 'row'; builder.title = fullName; builder.setAttribute('aria-label', fullName);
        builder.append(element('span', 'builder-matrix-name', chars.length > 23 ? chars.slice(0, 23).join('') + '...' : fullName));
        tr.append(builder);
        ['total', 'Sold', 'Scheduled', 'Contracted'].forEach(status => tr.append(element('td', 'is-' + status.toLowerCase(), Number(row[status] || 0).toLocaleString('en-US'))));
        body.append(tr);
      });
      table.append(head, body); breakdown.append(table); lotBody.append(breakdown);
      if (!inventory.builders.length) lotBody.append(element('p', 'builder-matrix-empty', 'No builder takedowns yet.'));
    } else lotBody.append(element('p', 'builder-matrix-empty', 'Lot status unavailable.'));
    const schedulePanel = element('section', 'fs-schedules');
    schedulePanel.append(schedulesHeading, cards);
    overview.append(lotCard, schedulePanel);
    root.append(heading, overview);
    if (model.empty) cards.append(element('div', 'fs-empty', model.empty));
    return root;
  }

  function render(html, host, inventory) {
    try {
      if (!host || !host.ownerDocument || typeof host.replaceChildren !== 'function') return false;
      const model = parse(html), result = build(model, host.ownerDocument, inventory);
      // HTML exposes no record IDs. Carry disclosure state only when the complete
      // ordered structural fingerprint agrees; never reconcile by Builder name.
      const signature = JSON.stringify([model.name, model.meta, model.schedules.map(row => [row.name, row.obligation, row.terms, row.contract ? [row.contract.title, row.contract.obligation, row.contract.terms.filter(term => !/Sales$|^Lots Expected$/.test(term.label))] : null])]);
      if (views.get(host) === signature) {
        const oldCards = host.querySelectorAll('.fs-card'), newCards = result.querySelectorAll('.fs-card');
        newCards.forEach((card, index) => {
          const oldContract = oldCards[index] && oldCards[index].querySelector('.fs-contract'), newContract = card.querySelector('.fs-contract');
          if (oldContract && newContract) newContract.open = oldContract.open;
        });
      }
      host.replaceChildren(result);
      views.set(host, signature);
      return true;
    } catch (error) {
      // Existing native summary remains available in the caller's sandbox iframe.
      return false;
    }
  }

  global.ForecastSummary = Object.freeze({render});
})(window);
