(function (root) {
  'use strict';
  const months = Object.freeze(['February','March','April','May','June','July','August','September','October','November','December','January']);
  const id = value => String(value && typeof value === 'object' ? value.ID || '' : value == null ? '' : value);
  const key = (builder, year) => id(builder) + ':' + String(year);
  function date(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
    const [y,m,d] = value.split('-').map(Number), parsed = new Date(Date.UTC(y,m-1,d));
    return parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m-1 && parsed.getUTCDate() === d ? parsed : null;
  }
  function start(year, index) {
    if (!Number.isInteger(Number(year)) || !Number.isInteger(index) || index < 0 || index > 11) throw new Error('Invalid fiscal month.');
    const month = index === 11 ? 1 : index + 2;
    return String(Number(year) + (index === 11 ? 1 : 0)) + '-' + String(month).padStart(2,'0') + '-01';
  }
  function currentYear(today) {const d = date(today); if (!d) throw new Error('The application date is unavailable.'); return d.getUTCFullYear() - (d.getUTCMonth() === 0 ? 1 : 0);}
  function value(input) {
    if (input == null || String(input).trim() === '') return null;
    if (!/^\d+$/.test(String(input).trim()) || Number(input) > 99999) throw new Error('Enter a whole lot count from 0 to 99,999, or leave blank.');
    return Number(input);
  }
  function lock(month, snapshot) {
    if (!month || month.issue) return month && month.issue || 'Month missing';
    if (snapshot.windowOpen !== true) return 'Forecasting window closed';
    const began = date(month.start), today = date(snapshot.today);
    if (!began || !today) return 'Forecast dates unavailable';
    if (began.getTime() + 28 * 86400000 < today.getTime()) return 'Past forecast';
    return '';
  }
  function matrix(snapshot, selectedBuilders, selectedYears) {
    const parents = new Map(), cells = new Map();
    for (const parent of snapshot.years || []) {
      const k = key(parent.builderId,parent.year);
      if (!parents.has(k)) parents.set(k,[]);
      parents.get(k).push(parent);
    }
    for (const month of snapshot.months || []) {
      if (!cells.has(id(month.parentId))) cells.set(id(month.parentId),[]);
      cells.get(id(month.parentId)).push(month);
    }
    return [...new Set(selectedBuilders.map(id))].map(builderId => ({builderId, years:[...new Set(selectedYears.map(String))].sort((a,b)=>Number(a)-Number(b)).map(year => {
      const matches = parents.get(key(builderId,year)) || [], parent = matches.length === 1 ? matches[0] : null;
      const result = {year,parent,issue:matches.length > 1 ? 'Duplicate forecast years' : '',months:[]};
      const children = parent ? cells.get(id(parent.id)) || [] : [];
      result.months = months.map((name,index) => {
        const hits = children.filter(month => String(month.month).slice(0,3).toLowerCase() === name.slice(0,3).toLowerCase());
        if (hits.length !== 1) return {month:name,start:start(year,index),issue:hits.length > 1 ? 'Duplicate forecast months' : 'Month missing'};
        const month = {...hits[0]};
        if (month.start !== start(year,index) || id(month.builderId) !== builderId || String(month.year) !== year || id(month.subdivisionId) !== id(snapshot.subdivision.id)) month.issue = 'Forecast relationship or date mismatch';
        if (result.issue) month.issue = result.issue;
        return month;
      });
      result.total = result.months.reduce((sum,month)=>sum + Number(month.forecast || 0),0);
      result.actual = result.months.reduce((sum,month)=>sum + Number(month.actual || 0),0);
      result.scheduled = result.months.reduce((sum,month)=>sum + Number(month.scheduled || 0),0);
      result.outlook = result.months.reduce((sum,month)=>sum + Number(month.start < snapshot.today.slice(0,7)+'-01' ? month.actual || 0 : month.forecast || 0),0);
      return result;
    })}));
  }
  function verifyEnsure(snapshot, builderId, year) {
    const row = matrix(snapshot,[builderId],[year])[0].years[0];
    return Boolean(row.parent && !row.issue && row.months.length === 12 && row.months.every(month => month.id && !month.issue) && new Set(row.months.map(month=>id(month.id))).size === 12);
  }
  root.ForecastModel = Object.freeze({months,id,key,date,start,currentYear,value,lock,matrix,verifyEnsure});
})(typeof window === 'undefined' ? globalThis : window);
