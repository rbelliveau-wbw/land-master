(function (root) {
  'use strict';
  const granted = value => value === true || ['true', 'yes', '1'].includes(String(value ?? '').trim().toLowerCase());
  const failed = value => value.error || value.success === false || /^(error|failed|failure)$/i.test(String(value.status || '').trim()) || (value.code != null && String(value.code) !== '3000');
  const wrappers = value => [value.details,value.output,value.response,value.result,value.data];
  const permissionKey = value => JSON.stringify([granted(value.hasRow ?? value.found),granted(value.lotSalesDashboard),granted(value.viewTotalLotRevenue)]);
  function flagsFrom(response) {
    const queue = [response], seen = new Set(); let flags = null;
    while (queue.length) {
      let value = queue.shift();
      if (typeof value === 'string') {
        try { value = JSON.parse(value); } catch { continue; }
      }
      if (!value || typeof value !== 'object' || seen.has(value)) continue;
      seen.add(value);
      if (Array.isArray(value)) return null;
      if (failed(value)) return null;
      if ('lotSalesDashboard' in value || 'viewTotalLotRevenue' in value || 'hasRow' in value || 'found' in value) {
        if (value.hasRow != null && value.found != null && granted(value.hasRow) !== granted(value.found)) return null;
        if (flags && permissionKey(flags) !== permissionKey(value)) return null;
        flags = flags || value;
      }
      queue.push(...wrappers(value));
    }
    return flags;
  }
  function accessError(message,response) {
    const error=new Error(message);error.response=response;error.raw=response;
    const queue=[response],seen=new Set();
    while(queue.length){
      let value=queue.shift();if(typeof value==='string'){try{value=JSON.parse(value);}catch{continue;}}
      if(!value||typeof value!=='object'||seen.has(value))continue;seen.add(value);
      if(value.code!=null&&String(value.code)!=='3000'){error.code=String(value.code);break;}
      queue.push(...(Array.isArray(value)?value:wrappers(value)));
    }
    return error;
  }
  async function load(creator, runtime) {
    const context = runtime.current();
    const user = typeof context.user === 'string' ? context.user.trim() : '';
    if (!user || user.toLowerCase() === '(unknown)') throw new Error('The signed-in Creator user could not be identified.');
    if (!['DEVELOPMENT','PRODUCTION','STAGE'].includes(context.environment)) throw new Error('The Creator environment could not be identified.');
    const contextKey = value => JSON.stringify([value.environment,value.user,value.appLinkName]);
    const invoke = creator.API?.invokeCustomApi || creator.DATA?.invokeCustomApi;
    if (typeof invoke !== 'function') throw new Error('The Creator access API is unavailable.');
    const development = context.environment === 'DEVELOPMENT';
    const request = development
      ? { api_name: runtime.apiName('Get_User_Access'), http_method: 'POST', content_type: 'application/json', payload: { user: user.toLowerCase().split('@')[0] } }
      // Native login email cannot identify the Creator username; Deluge uses zoho.loginuser.
      : { api_name: runtime.apiName('Get_User_Access'), http_method: 'GET', content_type: 'application/json' };
    const response = await invoke.call(creator.API?.invokeCustomApi ? creator.API : creator.DATA, request);
    if (contextKey(runtime.current()) !== contextKey(context)) throw new Error('The Creator session changed before permissions were received.');
    if (!response || typeof response !== 'object' || Array.isArray(response) || String(response.code) !== '3000' || failed(response)) throw accessError('The Creator access API rejected the request.',response);
    const flags = flagsFrom(response);
    if (!flags) throw accessError('The Creator access API returned no readable permissions.',response);
    const hasRow = granted(flags.hasRow ?? flags.found);
    return Object.freeze({
      hasRow,
      lotSalesDashboard: hasRow && granted(flags.lotSalesDashboard),
      viewTotalLotRevenue: hasRow && granted(flags.viewTotalLotRevenue)
    });
  }
  root.InsightsAccess = Object.freeze({ load, flagsFrom, granted });
})(typeof window === 'undefined' ? globalThis : window);
