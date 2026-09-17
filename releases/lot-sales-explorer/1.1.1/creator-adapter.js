(function (root) {
  'use strict';
  const reports = Object.freeze({ lots: 'All_Lots_All_Fields', subdivisions: 'All_Subdivisions', projects: 'All_Projects', builders: 'All_Builders' });
  const required = { lots: ['ID','Subdivision','Status','Close_Date','Purchase_Date','Base_Price','Lot_Size','Builder1'], subdivisions: ['ID','Project','Subdivision_Name','Territory'], projects: ['ID','Project_Name'], builders: ['ID','Builder_Name'] };
  const fields = { lots: required.lots.concat(['Lot_Code','Block','Lot_Number','Archived']), subdivisions: required.subdivisions, projects: required.projects, builders: required.builders };
  function failure(report, response) {
    const detail = response && (response.message || response.description || response.code);
    return new Error(report + ': ' + (detail || 'Creator did not return a readable response.'));
  }
  async function readAll(api, report, onProgress, requestedFields, options = {}) {
    const records = [], seen = new Set(), cursors = new Set();
    const check = () => { if (options.isCancelled && options.isCancelled()) throw new Error('Load superseded.'); };
    const query = options.criteria ? { criteria: options.criteria } : {};
    check();
    const countResponse = await api.getRecordCount({ report_name: report, ...query });
    check();
    const expected = Number(countResponse && countResponse.result && countResponse.result.records_count);
    if (!countResponse || String(countResponse.code) !== '3000' || !Number.isSafeInteger(expected) || expected < 0) throw failure(report, countResponse);
    function complete() {
      if (records.length !== expected) throw new Error(report + ': loaded ' + records.length + ' of ' + expected + ' records. Data changed or pagination was incomplete; refresh to retry.');
      return records;
    }
    let cursor = '';
    for (let page = 1; page <= 200; page++) {
      let response;
      check();
      const config = { report_name: report, max_records: 1000, field_config: 'custom', fields: requestedFields.join(','), ...query };
      if (cursor) config.record_cursor = cursor;
      try { response = await api.getRecords(config); }
      catch (e) { if (String(e && e.code) === '3100') return complete(); throw failure(report, e); }
      check();
      if (String(response && response.code) === '3100') return complete();
      if (!response || (response.code && String(response.code) !== '3000') || !Array.isArray(response.data)) throw failure(report, response);
      const rows = response.data;
      for (const row of rows) {
        const key = String(row.ID || '');
        if (!key) throw new Error(report + ': ID is missing.');
        if (seen.has(key)) throw new Error(report + ': duplicate records across pages. Refresh to load a consistent report.');
        seen.add(key); records.push(row);
      }
      if (onProgress) onProgress(report, records.length, expected);
      const next = response.record_cursor || (response.headers && response.headers.record_cursor) || '';
      if (!next) return complete();
      if (cursors.has(String(next))) throw new Error(report + ': Creator repeated a pagination cursor. Refresh to retry.');
      cursor = String(next); cursors.add(cursor);
    }
    throw new Error(report + ': report exceeds the supported 200,000 records; results were not displayed.');
  }
  function validate(key, rows) {
    if (!rows.length) return rows;
    const missing = required[key].filter(field => !rows.some(row => Object.prototype.hasOwnProperty.call(row, field)));
    if (missing.length) throw new Error(reports[key] + ': these fields are unavailable: ' + missing.join(', '));
    return rows;
  }
  function recentWindow(now = new Date()) {
    const year = now.getFullYear();
    const range = field => '(' + field + " >= '01/01/" + (year - 1) + "' && " + field + " < '01/01/" + (year + 1) + "')";
    // Creator's application date format is MM/dd/yyyy. Either date basis can be used immediately.
    return { from: (year - 1) + '-01', to: year + '-12', criteria: '(' + range('Close_Date') + ' || ' + range('Purchase_Date') + ')' };
  }
  async function loadReferences(api, options = {}) {
    const keys = ['subdivisions','projects'];
    const values = await Promise.all(keys.map(async key => validate(key, await readAll(api, reports[key], null, fields[key], options))));
    return Object.fromEntries(keys.map((key,i) => [key,values[i]]));
  }
  async function loadRecent(api, onProgress, options = {}) {
    const window = recentWindow(options.now), keys = Object.keys(reports);
    const values = await Promise.all(keys.map(async key => validate(key, await readAll(api, reports[key], onProgress, fields[key], { ...options, criteria: key === 'lots' ? window.criteria : '' }))));
    return { ...Object.fromEntries(keys.map((key, i) => [key, values[i]])), window };
  }
  async function loadHistory(api, onProgress, options = {}) {
    // Reconcile a complete snapshot before replacing the recent slice. Never publish a partial history.
    return validate('lots', await readAll(api, reports.lots, onProgress, fields.lots, options));
  }
  async function load(api, onProgress) {
    const keys = Object.keys(reports), values = await Promise.all(keys.map(key => readAll(api, reports[key], onProgress, fields[key])));
    const data = Object.fromEntries(keys.map((key, i) => [key, values[i]]));
    keys.forEach(key => {
      if (!data[key].length) return;
      const missing = required[key].filter(field => !data[key].some(row => Object.prototype.hasOwnProperty.call(row, field)));
      if (missing.length) throw new Error(reports[key] + ': add these fields to the report: ' + missing.join(', '));
    });
    return data;
  }
  root.LotSalesCreator = Object.freeze({ reports, readAll, load, loadRecent, loadHistory, loadReferences, recentWindow });
})(typeof window === 'undefined' ? globalThis : window);
