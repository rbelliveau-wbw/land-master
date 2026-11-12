/* Pure Budget Exceptions model. Persisted Final, GP and HCSS retain their native meanings. */
(function (root) {
  'use strict';
  const M = root.LotSalesModel;
  const { text, numeric, date } = M;
  const STATES = Object.freeze(['missing','over','unbudgeted','approval']);
  const truth = value => value === true || /^(true|yes|1)$/i.test(text(value).trim());
  const hasValue = value => value != null && String(value).trim() !== '';
  const sum = (rows, key) => rows.reduce((total, row) => total + (row[key] || 0), 0);
  const active = row => row.gp !== 0 || row.hcss !== 0;
  function id(value) {
    const raw = value && typeof value === 'object' ? value.ID ?? value.id ?? '' : value;
    if (typeof raw === 'number' && !Number.isSafeInteger(raw)) throw new Error('A Creator record ID was returned with unsafe numeric precision.');
    return M.id(value);
  }
  function index(records, label) {
    if (!Array.isArray(records)) throw new Error(label + ': a complete snapshot is required.');
    const result = new Map();
    records.forEach(record => {
      const key = id(record.ID);
      if (!key || result.has(key)) throw new Error(label + ': a missing or duplicate record ID prevents a complete report.');
      result.set(key, record);
    });
    return result;
  }
  function amount(value, label) {
    const parsed = numeric(value);
    if (hasValue(value) && parsed === null) throw new Error(label + ': an unreadable amount prevents a complete report.');
    return parsed;
  }
  function compareId(a,b) { return a.length - b.length || a.localeCompare(b); }
  function newer(a,b) { return (date(a.Added_Time) || '').localeCompare(date(b.Added_Time) || '') || compareId(id(a.ID),id(b.ID)); }
  function track(department) { return department === 'Construction' ? 'Construction' : ['Development','Engineering'].includes(department) ? 'Development' : ''; }
  function trackStatus(budget, name) { return name === 'Construction' ? text(budget.Const_Budget_Approval_Status) : name === 'Development' ? text(budget.Development_Budget_Approval_Status) : ''; }
  function categoryCode(category) { return text(category.Category_Code).trim(); }
  function categoryKey(category) { const code = categoryCode(category); return code ? 'category:' + text(category.Deparment).trim() + ':' + code : 'category-id:' + id(category.ID); }
  function itemKey(item) { const code = text(item.Budget_Code).trim(), cost = text(item.Cost_Code).trim(); return code ? 'budget-code:' + code : cost ? 'cost-code:' + cost : ''; }
  function uniqueMatch(records, key, keyOf) { if (!key) return null; const matching = records.filter(record => keyOf(record) === key); return matching.length === 1 ? matching[0] : null; }
  function matchItem(records, item) { return uniqueMatch(records,itemKey(item),itemKey) || uniqueMatch(records,text(item.Cost_Code).trim(),row=>text(row.Cost_Code).trim()); }
  function knownFinal(raw, field, budget, department) {
    const value = amount(raw[field], field + ' on ' + id(raw.ID));
    // Native STAGE/CLEAR writes zero too. A persisted nonzero Final is authoritative;
    // an explicit zero is a final baseline only with an approved track as evidence.
    if (value !== null && (value !== 0 || trackStatus(budget,track(department)) === 'Approved')) return { value, evidence: value === 0 ? 'approved-zero' : 'persisted-final', budgetId: id(budget.ID) };
    return null;
  }
  function finalForCategory(category, budget, candidates, groups) {
    const current = knownFinal(category,'Budget_Total',budget,text(category.Deparment).trim());
    if (current) return { ...current, source: category };
    if (amount(category.Budget_Total,'Category Final on ' + id(category.ID)) === 0 && groups.get(id(budget.ID)).items.some(item => id(item.Budget_Category) === id(category.ID) && (amount(item.Budget_Ttl,'Line Final on ' + id(item.ID)) || 0) !== 0)) return { value:0,evidence:'persisted-item-final',budgetId:id(budget.ID),source:category };
    const key = categoryKey(category);
    for (const candidate of candidates) {
      if (id(candidate.ID) === id(budget.ID)) continue;
      const match = uniqueMatch(groups.get(id(candidate.ID)).categories,key,categoryKey);
      if (!match) continue;
      const prior = knownFinal(match,'Budget_Total',candidate,text(match.Deparment).trim());
      if (prior) return { ...prior, evidence:'prior-' + prior.evidence, source:match };
    }
    return { value:null, evidence:'no-final-baseline', budgetId:'', source:null };
  }
  function finalForItem(item, category, budget, candidates, groups) {
    const department = text(category.Deparment).trim(), current = knownFinal(item,'Budget_Ttl',budget,department);
    if (current) return current;
    if (amount(item.Budget_Ttl,'Line Final on ' + id(item.ID)) === 0 && knownFinal(category,'Budget_Total',budget,department)) return { value:0,evidence:'category-final-zero',budgetId:id(budget.ID) };
    for (const candidate of candidates) {
      if (id(candidate.ID) === id(budget.ID)) continue;
      const group = groups.get(id(candidate.ID)), parent = uniqueMatch(group.categories,categoryKey(category),categoryKey);
      if (!parent) continue;
      const matching = matchItem(group.items.filter(row => id(row.Budget_Category) === id(parent.ID)),item);
      if (!matching) continue;
      const prior = knownFinal(matching,'Budget_Ttl',candidate,department);
      if (prior) return { ...prior,evidence:'prior-' + prior.evidence };
    }
    return { value:null,evidence:'no-final-baseline',budgetId:'' };
  }
  function assertSnapshotCoverage(budget, candidates, groups, categoryIndex) {
    const identity = item => {
      const category = categoryIndex.get(id(item.Budget_Category)), costCode = text(item.Cost_Code).trim();
      return category && costCode ? categoryKey(category) + '|cost:' + costCode : '';
    };
    const current = new Set(groups.get(id(budget.ID)).items.map(identity).filter(Boolean));
    candidates.forEach(candidate => {
      if (id(candidate.ID) === id(budget.ID)) return;
      groups.get(id(candidate.ID)).items.forEach(item => {
        const hasActuals = (amount(item.PROJ_Actual,'GP Actuals on ' + id(item.ID)) || 0) !== 0 || (amount(item.HCSS_Actuals,'HCSS Actuals on ' + id(item.ID)) || 0) !== 0;
        if (hasActuals && (!identity(item) || !current.has(identity(item)))) throw new Error('Multiple Budgets for one Subdivision have different actual-cost line inventories. Reconcile the latest Budget before viewing Budget Exceptions.');
      });
    });
  }
  function totals(categories) {
    const final = categories.length && categories.every(category => category.final !== null) ? sum(categories,'final') : null;
    const gp = sum(categories,'gp'), hcss = sum(categories,'hcss');
    return { final,gp,hcss,overage: final === null ? null : Math.max(0,gp-final), knownFinal:sum(categories.filter(category => category.final !== null),'final') };
  }
  function scopeRow(row, categories) {
    const result = { ...row,categories,...totals(categories) };
    result.phaseOverage = result.overage;
    result.categoryOverage = sum(categories.filter(category => category.overage !== null),'overage');
    if (row.overrunScope === 'category') result.overage = categories.some(category => category.final !== null) ? result.categoryOverage : null;
    result.missingGp = sum(categories.filter(category => category.flags.includes('missing')),'gp');
    result.missingHcss = sum(categories.filter(category => category.flags.includes('missing')),'hcss');
    result.unbudgetedGp = sum(categories,'unbudgetedGp'); result.unbudgetedHcss = sum(categories,'unbudgetedHcss');
    const tracks = new Set(categories.map(category => category.track).filter(Boolean));
    result.approvals = row.approvals.filter(approval => tracks.has(approval.track));
    const knownDays = result.approvals.map(approval => approval.days).filter(days => days !== null);
    result.pendingDays = knownDays.length ? Math.max(...knownDays) : null;
    result.approvalMissingDateCount = result.approvals.filter(approval => approval.days === null).length;
    result.flags = STATES.filter(key => key === 'missing' ? categories.some(category => category.flags.includes(key))
      : key === 'over' ? result.overage > 0
      : key === 'unbudgeted' ? categories.some(category => category.flags.includes(key))
      : result.pendingDays !== null && result.pendingDays > row.approvalAgeDays);
    return result;
  }
  function normalize(data, options = {}) {
    const today = date(options.today);
    if (!today) throw new Error('The Creator current date is unavailable. Refresh access before loading Budget Exceptions.');
    const approvalAgeDays = options.approvalAgeDays ?? 14;
    if (!Number.isInteger(approvalAgeDays) || approvalAgeDays < 0) throw new Error('The approval aging threshold must be a nonnegative whole number of days.');
    if (options.finalRule && !['populated','persisted'].includes(options.finalRule)) throw new Error('Budget Exceptions compares persisted Final budgets.');
    const overrunScope = options.overrunScope || 'category';
    if (!['phase','category'].includes(overrunScope)) throw new Error('Choose phase or category GP overages.');
    const budgets = index(data.budgets,'Budgets'), categories = index(data.categories,'Budget Categories'), items = index(data.items,'Budget Items');
    const approvals = index(data.approvals,'Budget Approvals'), subdivisions = index(data.subdivisions,'Subdivisions'), projects = index(data.projects,'Projects');
    const groups = new Map([...budgets].map(([key,budget]) => [key,{budget,categories:[],items:[],approvals:[]}]));
    categories.forEach(category => {
      if (truth(category.Template_Item)) return;
      const parent = id(category.Budget); if (!parent) return;
      if (!groups.has(parent)) throw new Error('A Budget Category refers to an unavailable Budget. Check native report access.');
      groups.get(parent).categories.push(category);
    });
    items.forEach(item => {
      if (truth(item.Template_Item)) return;
      const category = categories.get(id(item.Budget_Category)), parent = id(item.Budget) || id(category?.Budget);
      const gp = amount(item.PROJ_Actual,'GP Actuals on ' + id(item.ID)) || 0, hcss = amount(item.HCSS_Actuals,'HCSS Actuals on ' + id(item.ID)) || 0;
      if (!parent) { if (gp !== 0 || hcss !== 0) throw new Error('Actual costs have no readable Budget parent. The report is incomplete.'); return; }
      if (!groups.has(parent) || !category || id(category.Budget) !== parent) throw new Error('A Budget Item has an unavailable or mismatched Budget Category. Check native report access.');
      groups.get(parent).items.push(item);
    });
    approvals.forEach(approval => {
      const parent = id(approval.Budget), name = text(approval.Type1);
      if (!groups.has(parent) || !['Development','Construction'].includes(name) || text(approval.Status) !== 'Pending' || id(approval.Proforma) || id(approval.Budget_Modification)) return;
      // Ignore stale rows from a former track cycle; the native current track is authoritative.
      if (trackStatus(groups.get(parent).budget,name) !== 'Pending') return;
      const sent = date(approval.Sent_Date), days = sent ? Math.floor((Date.parse(today+'T00:00:00Z')-Date.parse(sent+'T00:00:00Z'))/86400000) : null;
      groups.get(parent).approvals.push({ id:id(approval.ID),track:name,sentDate:sent,days:days !== null && days >= 0 ? days : null });
    });
    const phases = new Map();
    budgets.forEach(budget => {
      const sid = id(budget.Subdivision1), key = sid ? 'subdivision:' + sid : 'budget:' + id(budget.ID);
      if (!phases.has(key)) phases.set(key,[]); phases.get(key).push(budget);
    });
    const result = [...phases].map(([phaseId,candidates]) => {
      candidates.sort((a,b) => newer(b,a));
      // One complete native item snapshot per phase. Repeated revisions never add costs twice.
      const budget = candidates.find(candidate => groups.get(id(candidate.ID)).items.length) || candidates[0];
      assertSnapshotCoverage(budget,candidates,groups,categories);
      const group = groups.get(id(budget.ID)), sid = id(budget.Subdivision1), sub = subdivisions.get(sid), pid = id(sub?.Project), project = projects.get(pid);
      const details = group.categories.map(category => {
        const cid = id(category.ID), department = text(category.Deparment).trim(), baseline = finalForCategory(category,budget,candidates,groups);
        const lines = group.items.filter(item => id(item.Budget_Category) === cid).map(item => {
          const final = finalForItem(item,category,budget,candidates,groups), gp = amount(item.PROJ_Actual,'GP Actuals on ' + id(item.ID)) || 0, hcss = amount(item.HCSS_Actuals,'HCSS Actuals on ' + id(item.ID)) || 0;
          const node = { id:id(item.ID),name:text(item.Item_Name) || text(item.Budget_Code) || 'Unnamed Budget Line',code:text(item.Budget_Code),costCode:text(item.Cost_Code),gp,hcss,final:final.value,finalEvidence:final.evidence,finalBudgetId:final.budgetId,overage:final.value === null ? null : Math.max(0,gp-final.value),flags:[] };
          if (active(node) && baseline.value === null) node.flags.push('missing');
          if (node.overage > 0) node.flags.push('over');
          if (active(node) && baseline.value !== null && (node.final === null || node.final === 0)) node.flags.push('unbudgeted');
          return node;
        });
        const gp = sum(lines,'gp'), hcss = sum(lines,'hcss'), overage = baseline.value === null ? null : Math.max(0,gp-baseline.value);
        const flags = [];
        if ((gp !== 0 || hcss !== 0 || lines.some(active)) && baseline.value === null) flags.push('missing');
        if (overage > 0) flags.push('over');
        if (lines.some(line => line.flags.includes('unbudgeted'))) flags.push('unbudgeted');
        return { id:cid,key:categoryKey(category),code:categoryCode(category),name:text(category.Budget_Category_Name) || 'Unnamed Category',department,track:track(department),final:baseline.value,finalEvidence:baseline.evidence,finalBudgetId:baseline.budgetId,gp,hcss,overage,flags,items:lines,unbudgetedGp:sum(lines.filter(line => line.flags.includes('unbudgeted')),'gp'),unbudgetedHcss:sum(lines.filter(line => line.flags.includes('unbudgeted')),'hcss') };
      });
      const current = candidates[0], currentGroup = groups.get(id(current.ID));
      const pending = currentGroup.approvals;
      const owner = budget.Budget_Owner;
      const phase = { id:phaseId,budgetId:id(budget.ID),latestBudgetId:id(current.ID),sourceBudgetCount:candidates.length,subdivisionId:sid,subdivision:text(sub?.Subdivision_Name) || text(budget.Subdivision1) || 'Unassigned Subdivision',name:text(sub?.Subdivision_Name) || text(budget.Budget_Name) || 'Unnamed Budget',budgetName:text(budget.Budget_Name),phase:text(budget.Phase),projectId:pid,project:text(project?.Project_Name) || text(sub?.Project) || text(budget.Project) || 'Unassigned Project',territory:text(sub?.Territory) || 'Unassigned',status:text(current.Status),type:text(current.Budget_Type),archived:truth(current.Archived),owner:Array.isArray(owner)?owner.map(text).filter(Boolean).join(', '):text(owner),devStatus:text(current.Development_Budget_Approval_Status),constructionStatus:text(current.Const_Budget_Approval_Status),approvals:pending,approvalAgeDays,overrunScope,today,categories:details };
      return scopeRow(phase,details);
    });
    Object.defineProperty(result,'metadata',{value:Object.freeze({today,approvalAgeDays,finalRule:'populated',overrunScope,overageBasis:overrunScope === 'category' ? 'Positive Category GP Overages' : 'Whole-Phase GP Overage',overageDefinition:overrunScope === 'category' ? 'Sum positive known category GP overages without netting unused budget in other categories.' : 'GP actuals less the complete phase Final budget, bounded at zero.',snapshotScope:'Latest saved Budget Item inventory per Subdivision; earlier actual snapshots are not added.',coverage:'Saved Budget Item actuals; external jobs without a Budget and unassigned import rows are not included.',sourceBudgetCount:budgets.size}),enumerable:false});
    return result;
  }
  function selected(values, value) { return !Array.isArray(values) || !values.length || values.includes(value); }
  function report(rows, filters = {}) {
    const exception = filters.exception || 'missing';
    if (exception !== 'all' && !STATES.includes(exception)) throw new Error('Choose a supported Budget Exception state.');
    const query = String(filters.search || '').trim().toLowerCase();
    const scoped = rows.filter(row => selected(filters.projectIds,row.projectId) && selected(filters.territories,row.territory) && (filters.includeArchived !== false || !row.archived) && (!query || [row.name,row.subdivision,row.budgetName,row.phase,row.project,row.territory].join(' ').toLowerCase().includes(query))).map(row => {
      const categories = row.categories.filter(category => !filters.categoryIds?.length || filters.categoryIds.some(key => [category.id,category.key,category.code].includes(key)));
      return scopeRow(row,categories);
    }).filter(row => row.categories.length);
    const stateRows = key => scoped.filter(row => row.flags.includes(key));
    const missing = stateRows('missing'), over = stateRows('over'), unbudgeted = stateRows('unbudgeted'), approval = stateRows('approval');
    const result = scoped.filter(row => exception === 'all' ? row.flags.length : row.flags.includes(exception)).sort((a,b) => exception === 'approval' ? (b.pendingDays || 0)-(a.pendingDays || 0) || a.name.localeCompare(b.name) : b.gp-a.gp || a.name.localeCompare(b.name));
    return { rows:result,overview:{missing:{count:missing.length,gp:sum(missing,'missingGp'),hcss:sum(missing,'missingHcss')},over:{count:over.length,overage:sum(over,'overage')},unbudgeted:{count:unbudgeted.length,gp:sum(unbudgeted,'unbudgetedGp'),hcss:sum(unbudgeted,'unbudgetedHcss')},approval:{count:approval.length,oldestDays:approval.length?Math.max(...approval.map(row=>row.pendingDays)):null}},count:result.length,phaseCount:result.length,flagCount:result.reduce((total,row)=>total+row.flags.length,0),subdivisionCount:new Set(result.map(row=>row.subdivisionId||row.id)).size,scopeCount:scoped.length,affectedCount:scoped.filter(row=>row.flags.length).length,unknownApprovalDates:sum(scoped,'approvalMissingDateCount'),...rows.metadata };
  }
  root.InsightsBudgetExceptionsModel = Object.freeze({normalize,report,states:STATES});
})(typeof window === 'undefined' ? globalThis : window);
