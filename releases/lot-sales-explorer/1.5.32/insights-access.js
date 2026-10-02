(function (root) {
  'use strict';
  const granted = value => value === true || ['true', 'yes', '1'].includes(String(value ?? '').trim().toLowerCase());
  function flagsFrom(response) {
    const queue = [response], seen = new Set();
    while (queue.length) {
      let value = queue.shift();
      if (typeof value === 'string') {
        try { value = JSON.parse(value); } catch { continue; }
      }
      if (!value || typeof value !== 'object' || seen.has(value)) continue;
      seen.add(value);
      if ('lotSalesDashboard' in value || 'viewTotalLotRevenue' in value || 'hasRow' in value || 'found' in value) return value;
      queue.push(value.details, value.output, value.response, value.result, value.data);
    }
    return null;
  }
  async function load(creator, runtime) {
    const user = String(runtime.current().user || '').trim().toLowerCase().split('@')[0];
    if (!user || user === '(unknown)') throw new Error('The signed-in Creator user could not be identified.');
    const invoke = creator.API?.invokeCustomApi || creator.DATA?.invokeCustomApi;
    if (typeof invoke !== 'function') throw new Error('The Creator access API is unavailable.');
    const development = runtime.current().environment === 'DEVELOPMENT';
    const request = development
      ? { api_name: runtime.apiName('Get_User_Access'), http_method: 'POST', content_type: 'application/json', payload: { user } }
      : { api_name: runtime.apiName('Get_User_Access'), http_method: 'GET', content_type: 'application/json', query_params: { user } };
    const response = await invoke.call(creator.API?.invokeCustomApi ? creator.API : creator.DATA, request);
    if (response && response.code != null && String(response.code) !== '3000') throw new Error('The Creator access API rejected the request.');
    const flags = flagsFrom(response);
    if (!flags) throw new Error('The Creator access API returned no readable permissions.');
    const hasRow = granted(flags.hasRow ?? flags.found);
    return Object.freeze({
      hasRow,
      lotSalesDashboard: hasRow && granted(flags.lotSalesDashboard),
      viewTotalLotRevenue: hasRow && granted(flags.viewTotalLotRevenue)
    });
  }
  root.InsightsAccess = Object.freeze({ load, flagsFrom, granted });
})(typeof window === 'undefined' ? globalThis : window);
