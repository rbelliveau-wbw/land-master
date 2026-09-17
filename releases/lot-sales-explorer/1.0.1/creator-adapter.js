(function (root) {
  'use strict';
  const reports = Object.freeze({ lots: 'All_Lots_All_Fields', subdivisions: 'All_Subdivisions', projects: 'All_Projects', builders: 'All_Builders' });
  const required = { lots: ['ID','Subdivision','Status','Close_Date','Purchase_Date','Base_Price','Lot_Size','Builder1'], subdivisions: ['ID','Project','Subdivision_Name','Territory'], projects: ['ID','Project_Name'], builders: ['ID','Builder_Name'] };
  const fields = { lots: required.lots.concat(['Lot_Code','Block','Lot_Number','Archived']), subdivisions: required.subdivisions, projects: required.projects, builders: required.builders };
  function failure(report, response) {
    const detail = response && (response.message || response.description || response.code);
    return new Error(report + ': ' + (detail || 'Creator did not return a readable response.'));
  }
  async function readAll(api, report, onProgress, requestedFields) {
    const records = [], seen = new Set(), cursors = new Set();
    const countResponse = await api.getRecordCount({ report_name: report });
    const expected = Number(countResponse && countResponse.result && countResponse.result.records_count);
    if (!countResponse || String(countResponse.code) !== '3000' || !Number.isSafeInteger(expected) || expected < 0) throw failure(report, countResponse);
    function complete() {
      if (records.length !== expected) throw new Error(report + ': loaded ' + records.length + ' of ' + expected + ' records. Data changed or pagination was incomplete; refresh to retry.');
      return records;
    }
    let cursor = '';
    for (let page = 1; page <= 200; page++) {
      let response;
      const config = { report_name: report, max_records: 1000, field_config: 'custom', fields: requestedFields.join(',') };
      if (cursor) config.record_cursor = cursor;
      try { response = await api.getRecords(config); }
      catch (e) { if (String(e && e.code) === '3100') return complete(); throw failure(report, e); }
      if (String(response && response.code) === '3100') return complete();
      if (!response || (response.code && String(response.code) !== '3000') || !Array.isArray(response.data)) throw failure(report, response);
      const rows = response.data;
      for (const row of rows) {
        const key = String(row.ID || '');
        if (!key) throw new Error(report + ': ID is missing.');
        if (seen.has(key)) throw new Error(report + ': duplicate records across pages. Refresh to load a consistent report.');
        seen.add(key); records.push(row);
      }
      if (onProgress) onProgress(report, records.length);
      const next = response.record_cursor || (response.headers && response.headers.record_cursor) || '';
      if (!next) return complete();
      if (cursors.has(String(next))) throw new Error(report + ': Creator repeated a pagination cursor. Refresh to retry.');
      cursor = String(next); cursors.add(cursor);
    }
    throw new Error(report + ': report exceeds the supported 200,000 records; results were not displayed.');
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
  root.LotSalesCreator = Object.freeze({ reports, readAll, load });
})(typeof window === 'undefined' ? globalThis : window);
