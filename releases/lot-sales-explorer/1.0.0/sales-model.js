/* Pure report model: no Creator SDK, DOM, network, or mutable application state. */
(function (root) {
  'use strict';
  const text = value => value == null ? '' : typeof value === 'object' ? String(value.display_value || value.zc_display_value || value.Name || '') : String(value);
  const id = value => value == null ? '' : typeof value === 'object' ? String(value.ID || value.id || '') : String(value);
  function numeric(value) {
    if (value == null || String(value).trim() === '') return null;
    const n = Number(String(value).replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  function date(value) {
    const s = text(value).trim();
    if (!s) return null;
    let y, m, d, parts;
    if ((parts = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/))) [, y, m, d] = parts;
    else if ((parts = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s.*)?$/))) [, m, d, y] = parts;
    else if ((parts = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s.*)?$/))) {
      d = parts[1]; y = parts[3]; m = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(parts[2].toLowerCase()) + 1;
    } else return null;
    y = Number(y); m = Number(m); d = Number(d);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return y >= 1900 && dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? dt.toISOString().slice(0, 10) : null;
  }
  const mapById = rows => new Map((rows || []).map(r => [id(r.ID), r]));
  function normalize(data) {
    const subdivisions = mapById(data.subdivisions), projects = mapById(data.projects), builders = mapById(data.builders), seen = new Set();
    return (data.lots || []).filter(r => {
      const key = id(r.ID);
      if (!key) throw new Error('A lot record is missing its ID. Check the Lots report fields.');
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).map(r => {
      const subdivisionId = id(r.Subdivision), sub = subdivisions.get(subdivisionId), projectId = id(sub && sub.Project), project = projects.get(projectId);
      const builderId = id(r.Builder1), builder = builders.get(builderId), builderName = text(builder && builder.Builder_Name) || text(r.Builder1);
      return {
        id: id(r.ID), subdivisionId, subdivision: text(sub && sub.Subdivision_Name) || text(r.Subdivision) || 'Unknown subdivision',
        projectId, project: text(project && project.Project_Name) || text(sub && sub.Project) || 'Unknown project',
        territory: text(sub && sub.Territory) || 'Unassigned', builderId, builder: builderName || 'Unassigned',
        excludedBuilder: !builderName.trim() || /^(other|placeholder)$/i.test(builderName.trim()),
        status: text(r.Status), closeDate: date(r.Close_Date), purchaseDate: date(r.Purchase_Date),
        price: numeric(r.Base_Price), width: numeric(r.Lot_Size), code: text(r.Lot_Code), block: text(r.Block), lot: text(r.Lot_Number),
        archived: r.Archived === true || /^(true|yes)$/i.test(text(r.Archived)), missingSubdivision: !sub
      };
    });
  }
  const METRICS = {
    avgPriceFF: { label: 'Average $/FF', kind: 'currency', description: 'Mean of each eligible lot’s Base Price ÷ front footage.' },
    weightedPriceFF: { label: 'Weighted $/FF', kind: 'currency', description: 'Total Base Price ÷ total front footage, using lots with both values.' },
    count: { label: 'Lot count', kind: 'count', description: 'Number of lots in the selected status and date range.' },
    avgPrice: { label: 'Average base price', kind: 'currency', description: 'Average recorded Base Price; taxes, fees and interest are excluded.' },
    totalPrice: { label: 'Total base price', kind: 'currency', description: 'Sum of recorded Base Price; taxes, fees and interest are excluded.' }
  };
  function stats(rows) {
    const priced = rows.filter(r => r.price !== null && r.price >= 0), sized = rows.filter(r => r.width !== null && r.width > 0);
    const eligible = priced.filter(r => r.width !== null && r.width > 0), sum = (xs, fn) => xs.reduce((n, r) => n + fn(r), 0);
    return { count: rows.length, priced: priced.length, eligible: eligible.length, missingPriceFF: rows.length - eligible.length,
      avgPriceFF: eligible.length ? sum(eligible, r => r.price / r.width) / eligible.length : null,
      weightedPriceFF: eligible.length ? sum(eligible, r => r.price) / sum(eligible, r => r.width) : null,
      avgPrice: priced.length ? sum(priced, r => r.price) / priced.length : null,
      totalPrice: priced.length ? sum(priced, r => r.price) : null,
      avgWidth: sized.length ? sum(sized, r => r.width) / sized.length : null };
  }
  function inScope(r, f) {
    return (!f.projectId || r.projectId === f.projectId) && (!f.territory || r.territory === f.territory)
      && (!f.builderId || r.builderId === f.builderId) && (!f.excludeBuilders || !r.excludedBuilder)
      && (!f.search || (r.subdivision + ' ' + r.project + ' ' + r.code).toLowerCase().includes(f.search.toLowerCase()));
  }
  function monthRange(from, to) {
    if (!/^\d{4}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}$/.test(to || '') || from > to) throw new Error('Choose a valid month range.');
    if (![from,to].every(value => Number(value.slice(0,4)) >= 1900 && Number(value.slice(5)) >= 1 && Number(value.slice(5)) <= 12)) throw new Error('Choose a valid month range.');
    const start = Number(from.slice(0, 4)) * 12 + Number(from.slice(5)) - 1, end = Number(to.slice(0, 4)) * 12 + Number(to.slice(5)) - 1;
    if (end - start > 1199) throw new Error('Choose a range of 100 years or less.');
    return Array.from({ length: end - start + 1 }, (_, i) => { const n = end - i; return Math.floor(n / 12) + '-' + String(n % 12 + 1).padStart(2, '0'); });
  }
  function report(rows, filters) {
    const f = { status: 'Sold', dateField: 'closeDate', excludeBuilders: false, ...filters };
    const scoped = rows.filter(r => inScope(r, f)), population = scoped.filter(r => r.status === f.status);
    const dateField = f.dateField === 'purchaseDate' ? 'purchaseDate' : 'closeDate';
    const dates = population.map(r => r[dateField]).filter(Boolean).sort();
    const today = new Date(), currentMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    const from = f.from || (dates[0] || currentMonth).slice(0, 7), to = f.to || (dates[dates.length - 1] || currentMonth).slice(0, 7);
    const months = monthRange(from, to), filtered = population.filter(r => r[dateField] && r[dateField].slice(0, 7) >= from && r[dateField].slice(0, 7) <= to);
    const firstSales = new Map();
    scoped.filter(r => r.status === 'Sold' && r.closeDate).forEach(r => { if (!firstSales.has(r.subdivisionId) || r.closeDate < firstSales.get(r.subdivisionId)) firstSales.set(r.subdivisionId, r.closeDate); });
    const groups = new Map();
    filtered.forEach(r => {
      if (!groups.has(r.subdivisionId)) groups.set(r.subdivisionId, { id: r.subdivisionId, name: r.subdivision, territory: r.territory, project: r.project, lots: [], buckets: new Map() });
      const group = groups.get(r.subdivisionId), month = r[dateField].slice(0, 7);
      group.lots.push(r); if (!group.buckets.has(month)) group.buckets.set(month, []); group.buckets.get(month).push(r);
    });
    const result = [...groups.values()].map(g => ({ ...g, firstSale: firstSales.get(g.id) || null, stats: stats(g.lots), cells: new Map([...g.buckets].map(([month, lots]) => [month, stats(lots)])) }));
    result.sort((a, b) => a.territory.localeCompare(b.territory) || a.name.localeCompare(b.name, undefined, { numeric: true }));
    return { rows: result, lots: filtered, months, from, to, stats: stats(filtered), missingDates: population.filter(r => !r[dateField]).length, dateField, status: f.status };
  }
  function csv(rows) {
    return '\uFEFF' + rows.map(row => row.map(value => {
      let s = value == null ? '' : String(value);
      if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    }).join(',')).join('\r\n');
  }
  root.LotSalesModel = Object.freeze({ text, id, numeric, date, normalize, stats, report, monthRange, metrics: METRICS, csv });
})(typeof window === 'undefined' ? globalThis : window);
