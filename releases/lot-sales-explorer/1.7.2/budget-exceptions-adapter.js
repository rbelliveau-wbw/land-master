/* Complete, read-only Creator snapshot for the permission-gated Budget Exceptions dashboard. */
(function (root) {
  'use strict';
  const contracts = Object.freeze({
    budgets: { report: 'All_Budgets', fields: ['ID','Budget_Name','Subdivision1','Project','Phase','Status','Budget_Type','Const_Budget_Approval_Status','Development_Budget_Approval_Status','Budget_Owner','Archived','Added_Time'], required: ['ID','Subdivision1','Const_Budget_Approval_Status','Development_Budget_Approval_Status','Archived'] },
    categories: { report: 'All_Budget_Categories', fields: ['ID','Budget','Budget_Category_Name','Deparment','Category_Code','Budget_Total','Template_Item'], required: ['ID','Budget','Budget_Category_Name','Deparment','Category_Code','Budget_Total','Template_Item'] },
    items: { report: 'All_Budget_Items', fields: ['ID','Budget','Budget_Category','Item_Name','Budget_Code','Cost_Code','Budget_Ttl','PROJ_Actual','HCSS_Actuals','Template_Item'], required: ['ID','Budget_Category','Cost_Code','Budget_Ttl','PROJ_Actual','HCSS_Actuals','Template_Item'] },
    approvals: { report: 'All_Budget_Approvals', fields: ['ID','Budget','Type1','Status','Sent_Date','Budget_Modification','Proforma'], required: ['ID','Budget','Type1','Status','Sent_Date','Budget_Modification','Proforma'], criteria: '((Type1 == "Development" || Type1 == "Construction") && Status == "Pending")' }
  });
  function assertAccess(options) {
    if (options.access?.hasRow !== true || options.access?.budgetExceptionsDashboard !== true) throw new Error('Budget Exceptions access is required.');
    if (options.isCancelled?.()) { const error = new Error('The Budget Exceptions request was superseded.'); error.name = 'AbortError'; throw error; }
  }
  function validate(key, records) {
    if (!Array.isArray(records)) throw new Error(contracts[key].report + ': the complete record snapshot is unavailable.');
    records.forEach(record => {
      if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error(contracts[key].report + ': an unreadable record was returned.');
      const missing = contracts[key].required.filter(field => !Object.hasOwn(record, field));
      if (missing.length) throw new Error(contracts[key].report + ': fields unavailable: ' + missing.join(', ') + '.');
    });
    return records;
  }
  async function load(api, references, onProgress, options = {}) {
    assertAccess(options);
    if (typeof root.LotSalesCreator?.readAll !== 'function' || typeof root.LotSalesCreator?.loadReferences !== 'function') throw new Error('The shared Creator report reader is unavailable.');
    const readOptions = { isCancelled: options.isCancelled };
    const referenceRead = references && Array.isArray(references.subdivisions) && Array.isArray(references.projects)
      ? Promise.resolve({ subdivisions: references.subdivisions, projects: references.projects })
      : root.LotSalesCreator.loadReferences(api, readOptions);
    const keys = Object.keys(contracts);
    const recordsRead = Promise.all(keys.map(async key => {
      assertAccess(options);
      const contract = contracts[key];
      const records = await root.LotSalesCreator.readAll(api, contract.report, onProgress, contract.fields, { ...readOptions, ...(contract.criteria ? { criteria: contract.criteria } : {}) });
      assertAccess(options);
      return validate(key, records);
    }));
    const [shared, values] = await Promise.all([referenceRead,recordsRead]);
    assertAccess(options);
    return { ...shared, ...Object.fromEntries(keys.map((key, i) => [key, values[i]])) };
  }
  root.InsightsBudgetExceptionsCreator = Object.freeze({ load, contracts });
})(typeof window === 'undefined' ? globalThis : window);
