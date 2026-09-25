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
        price: numeric(r.Base_Price), interest: numeric(r.Interest1), escalator: numeric(r.Escalator), notes: text(r.Notes),
        width: numeric(r.Lot_Size), code: text(r.Lot_Code), block: text(r.Block), lot: text(r.Lot_Number),
        archived: r.Archived === true || /^(true|yes)$/i.test(text(r.Archived)), missingSubdivision: !sub
      };
    });
  }
  const METRICS = {
    avgPriceFF: { label: 'Average Base $/FF', kind: 'currency', description: 'Mean of each eligible lot’s Base Price ÷ front footage.' },
    avgTotalPriceFF: { label: 'Average Price $/FF', kind: 'currency', description: 'Mean of each eligible lot’s (Base Price + Interest) ÷ front footage. Blank interest counts as zero; escalator percentage is shown separately.' },
    weightedPriceFF: { label: 'Weighted $/FF', kind: 'currency', description: 'Total Base Price ÷ total front footage, using lots with both values.' },
    count: { label: 'Lot Count', kind: 'count', description: 'Number of lots in the selected status and date range.' },
    avgPrice: { label: 'Average Base Price', kind: 'currency', description: 'Average recorded Base Price; taxes, fees and interest are excluded.' },
    totalPrice: { label: 'Total Base Price', kind: 'currency', description: 'Sum of recorded Base Price; taxes, fees and interest are excluded.' }
  };
  const totalPrice = row => row.price === null || row.price < 0 ? null : row.price + (row.interest ?? 0);
  function subdivisionCounts(rows) {
    const counts = new Map();
    rows.forEach(row => {
      const key = row.subdivisionId;
      if (!counts.has(key)) counts.set(key, { total: 0, sold: 0, contracted: 0, open: 0 });
      const count = counts.get(key);
      count.total++;
      if (row.status === 'Sold') count.sold++;
      else if (row.status === 'Contracted') count.contracted++;
      else count.open++;
    });
    return counts;
  }
  function stats(rows) {
    const priced = rows.filter(r => r.price !== null && r.price >= 0), sized = rows.filter(r => r.width !== null && r.width > 0);
    const eligible = priced.filter(r => r.width !== null && r.width > 0), totalEligible = rows.filter(r => totalPrice(r) !== null && totalPrice(r) >= 0 && r.width !== null && r.width > 0), sum = (xs, fn) => xs.reduce((n, r) => n + fn(r), 0);
    return { count: rows.length, priced: priced.length, eligible: eligible.length, missingPriceFF: rows.length - eligible.length,
      avgPriceFF: eligible.length ? sum(eligible, r => r.price / r.width) / eligible.length : null,
      avgTotalPriceFF: totalEligible.length ? sum(totalEligible, r => totalPrice(r) / r.width) / totalEligible.length : null,
      missingTotalPriceFF: rows.length - totalEligible.length,
      weightedPriceFF: eligible.length ? sum(eligible, r => r.price) / sum(eligible, r => r.width) : null,
      avgPrice: priced.length ? sum(priced, r => r.price) / priced.length : null,
      totalPrice: priced.length ? sum(priced, r => r.price) : null,
      avgWidth: sized.length ? sum(sized, r => r.width) / sized.length : null };
  }
  function inScope(r, f) {
    const match = (many, one, value) => Array.isArray(many) ? !many.length || many.includes(value) : !one || value === one;
    return match(f.projectIds, f.projectId, r.projectId) && match(f.territories, f.territory, r.territory)
      && match(f.builderIds, f.builderId, r.builderId) && (!f.excludeBuilders || !r.excludedBuilder)
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
    const groupBy = ['project', 'territory', 'builder'].includes(f.groupBy) ? f.groupBy : 'project';
    const scoped = rows.filter(r => inScope(r, f)), population = scoped.filter(r => r.status === f.status);
    const dateField = f.dateField === 'purchaseDate' ? 'purchaseDate' : 'closeDate';
    const dates = population.map(r => r[dateField]).filter(Boolean).sort();
    const today = new Date(), currentMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    const from = f.from || (dates[0] || currentMonth).slice(0, 7), to = f.to || (dates[dates.length - 1] || currentMonth).slice(0, 7);
    const months = monthRange(from, to), filtered = population.filter(r => r[dateField] && r[dateField].slice(0, 7) >= from && r[dateField].slice(0, 7) <= to);
    const firstSales = new Map();
    scoped.filter(r => r.status === 'Sold' && r.closeDate).forEach(r => {
      const key = JSON.stringify([r.subdivisionId, groupBy === 'builder' ? r.builderId || r.builder : '']);
      if (!firstSales.has(key) || r.closeDate < firstSales.get(key)) firstSales.set(key, r.closeDate);
    });
    const groups = new Map();
    filtered.forEach(r => {
      const key = JSON.stringify([r.subdivisionId, groupBy === 'builder' ? r.builderId || r.builder : '']);
      if (!groups.has(key)) groups.set(key, { id: r.subdivisionId, name: r.subdivision, territory: r.territory, project: r.project, projectId: r.projectId, builder: r.builder, builderId: r.builderId, lots: [], buckets: new Map() });
      const group = groups.get(key), month = r[dateField].slice(0, 7);
      group.lots.push(r); if (!group.buckets.has(month)) group.buckets.set(month, []); group.buckets.get(month).push(r);
    });
    const result = [...groups.values()].map(g => ({ ...g,
      groupId: groupBy === 'project' ? g.projectId || g.project : groupBy === 'builder' ? g.builderId || g.builder : g.territory,
      groupName: groupBy === 'project' ? g.project : groupBy === 'builder' ? g.builder : g.territory,
      firstSale: firstSales.get(JSON.stringify([g.id, groupBy === 'builder' ? g.builderId || g.builder : ''])) || null,
      stats: stats(g.lots), cells: new Map([...g.buckets].map(([month, lots]) => [month, stats(lots)])) }));
    result.sort((a, b) => a.groupName.localeCompare(b.groupName) || a.name.localeCompare(b.name, undefined, { numeric: true }));
    return { rows: result, lots: filtered, months, from, to, stats: stats(filtered), missingDates: population.filter(r => !r[dateField]).length, dateField, status: f.status, groupBy };
  }
  function csv(rows) {
    return '\uFEFF' + rows.map(row => row.map(value => {
      let s = value == null ? '' : String(value);
      if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    }).join(',')).join('\r\n');
  }
  function sortDetailLots(lots, dateField) {
    const field = dateField === 'purchaseDate' ? 'purchaseDate' : 'closeDate';
    return lots.slice().sort((a, b) => a.builder.localeCompare(b.builder) ||
      (b[field] || '').localeCompare(a[field] || '') || a.code.localeCompare(b.code));
  }
  function reportSelection(rows, filters) {
    const requested = filters.statuses?.length ? filters.statuses : ['Sold','Contracted'];
    const statuses = ['Sold','Contracted'].filter(status => requested.includes(status));
    if (!statuses.length) throw new Error('Choose Sold or Contracted.');
    let reports = statuses.map(status => report(rows, {...filters,status}));
    const populated = reports.filter(r => r.lots.length), ranges = populated.length ? populated : reports;
    const from = filters.from || ranges.map(r=>r.from).sort()[0], to = filters.to || ranges.map(r=>r.to).sort().at(-1);
    reports = statuses.map(status => report(rows, {...filters,status,from,to}));
    return { reports, statuses, status:statuses.join(' & '), dateField:reports[0].dateField, groupBy:reports[0].groupBy, from, to, months:monthRange(from,to),
      rows:reports.flatMap(r=>r.rows.map(row=>({...row,status:r.status,key:JSON.stringify([r.status,row.id,r.groupBy === 'builder' ? row.groupId : ''])}))),
      lots:reports.flatMap(r=>r.lots), missingDates:reports.reduce((n,r)=>n+r.missingDates,0) };
  }
  root.LotSalesModel = Object.freeze({ text, id, numeric, date, normalize, totalPrice, subdivisionCounts, stats, report, reportSelection, sortDetailLots, monthRange, metrics: METRICS, csv });
})(typeof window === 'undefined' ? globalThis : window);
