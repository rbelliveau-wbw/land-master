(function (root) {
  'use strict';
  const reports = Object.freeze({ lots: 'All_Lots_All_Fields', subdivisions: 'All_Subdivisions', projects: 'All_Projects', builders: 'All_Builders' });
  const required = { lots: ['ID','Subdivision','Status','Close_Date','Purchase_Date','Base_Price','Lot_Size','Builder1'], subdivisions: ['ID','Project','Subdivision_Name','Territory'], projects: ['ID','Project_Name'], builders: ['ID','Builder_Name','Type1'] };
  const fields = { lots: required.lots.concat(['Lot_Code','Block','Lot_Number','Archived','Interest1','Escalator','Notes']), subdivisions: required.subdivisions.concat(['Projects_Status']), projects: required.projects, builders: required.builders };
  function readAll(api, report, onProgress, requestedFields, options = {}) {
    if (!root.LMData || typeof root.LMData.readAll !== 'function') return Promise.reject(new Error('The shared Creator data adapter is unavailable.'));
    return root.LMData.readAll({
      ...options, api, reportName: report, fields: requestedFields,
      // Preserve the public report/count/total callback and per-page notifications.
      onProgress: onProgress ? progress => { if (!progress.done) onProgress(report, progress.count, progress.expected); } : undefined
    });
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
