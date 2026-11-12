(function (root) {
  'use strict';
  const contracts = {
    budgets: { report: 'All_Budgets', fields: ['ID','Budget_Name','Subdivision1','Project','Phase','Status','Budget_Type','Const_Budget_Approval_Status','Development_Budget_Approval_Status','Lot_Total_Residential','Added_Time'] },
    categories: { report: 'All_Budget_Categories', fields: ['ID','Budget','Budget_Category_Name','Deparment','Budget_Total'] },
    items: { report: 'All_Budget_Items', fields: ['ID','Budget','Budget_Category','PROJ_Actual','HCSS_Actuals'] },
    modifications: { report: 'All_Budget_Modifications', fields: ['ID','Budget','Budget_Item','Budget_Category','Modification_Type','Amount','Status'] }
  };
  async function load(api, references, onProgress, options = {}) {
    const keys = Object.keys(contracts);
    const values = await Promise.all(keys.map(async key => {
      const c = contracts[key], rows = await root.LotSalesCreator.readAll(api, c.report, onProgress, c.fields, options);
      const optional = ['Added_Time','Project','Phase','Lot_Total_Residential'];
      const missing = rows.length ? c.fields.filter(f => !optional.includes(f) && !rows.some(r => Object.hasOwn(r,f))) : [];
      if (missing.length) throw new Error(c.report + ': fields unavailable: ' + missing.join(', '));
      return rows;
    }));
    return { ...references, ...Object.fromEntries(keys.map((key,i) => [key,values[i]])) };
  }
  root.InsightsBudgetCreator = Object.freeze({ load, contracts });
})(typeof window === 'undefined' ? globalThis : window);
