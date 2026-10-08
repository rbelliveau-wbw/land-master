/* Read-only budget aggregation. Category Final and item GP/HCSS match Budget Manager. */
(function (root) {
  'use strict';
  const M = root.LotSalesModel, { id, text, numeric } = M;
  const value = v => numeric(v) ?? 0;
  const index = rows => new Map((rows || []).map(r => [id(r.ID), r]));
  const sum = (rows, key) => rows.reduce((n, r) => n + value(r[key]), 0);
  const signed = r => Math.abs(value(r.Amount)) * (text(r.Modification_Type) === 'Decrease' ? -1 : 1);
  function normalize(data) {
    const subs = index(data.subdivisions), projects = index(data.projects), categories = index(data.categories);
    const buckets = new Map((data.budgets || []).map(b => [id(b.ID), { budget: b, categories: [], items: [], modifications: [] }]));
    (data.categories || []).forEach(c => buckets.get(id(c.Budget))?.categories.push(c));
    const itemParents = new Map();
    (data.items || []).forEach(item => {
      const parent = id(item.Budget) || id(categories.get(id(item.Budget_Category))?.Budget);
      itemParents.set(id(item.ID), parent); buckets.get(parent)?.items.push(item);
    });
    (data.modifications || []).forEach(mod => buckets.get(id(mod.Budget) || itemParents.get(id(mod.Budget_Item)))?.modifications.push(mod));
    return [...buckets].map(([key, g]) => {
      const b = g.budget, sid = id(b.Subdivision1), sub = subs.get(sid), pid = id(sub?.Project);
      const details = g.categories.map(c => {
        const items = g.items.filter(item => id(item.Budget_Category) === id(c.ID));
        const ids = new Set(items.map(item => id(item.ID)));
        const mods = g.modifications.filter(mod => id(mod.Budget_Category) === id(c.ID) || ids.has(id(mod.Budget_Item)));
        const approved = mods.filter(m => text(m.Status) === 'Approved').reduce((n,m) => n + signed(m), 0);
        return { id: id(c.ID), name: text(c.Budget_Category_Name) || 'Unnamed category', department: text(c.Deparment) || 'Unassigned',
          final: value(c.Budget_Total), approved, revised: value(c.Budget_Total) + approved,
          gp: sum(items, 'PROJ_Actual'), hcss: sum(items, 'HCSS_Actuals'), itemCount: items.length };
      });
      const hasDetail = g.categories.length > 0;
      const final = hasDetail ? sum(g.categories, 'Budget_Total') : null;
      const approved = g.modifications.filter(m => text(m.Status) === 'Approved').reduce((n,m) => n + signed(m), 0);
      const pending = g.modifications.filter(m => ['Submitted','Pending'].includes(text(m.Status))).reduce((n,m) => n + signed(m), 0);
      const devStatus = text(b.Development_Budget_Approval_Status) || 'Not Sent', constructionStatus = text(b.Const_Budget_Approval_Status) || 'Not Sent';
      return { id: key, subdivisionId: sid, projectId: pid, project: text(projects.get(pid)?.Project_Name) || text(b.Project) || 'Unassigned project',
        territory: text(sub?.Territory) || 'Unassigned', name: text(b.Budget_Name) || text(sub?.Subdivision_Name) || text(b.Phase) || 'Unnamed budget',
        subdivision: text(sub?.Subdivision_Name) || text(b.Subdivision1) || text(b.Phase) || 'Unassigned subdivision',
        status: text(b.Status) || 'Unspecified', type: text(b.Budget_Type) || 'Unspecified', added: M.date(b.Added_Time) || '',
        fullyApproved: devStatus === 'Approved' && constructionStatus === 'Approved', devStatus, constructionStatus,
        final, approved, pending, revised: final === null ? null : final + approved,
        gp: hasDetail ? sum(g.items, 'PROJ_Actual') : null, hcss: hasDetail ? sum(g.items, 'HCSS_Actuals') : null,
        lots: numeric(b.Lot_Total_Residential), hasDetail, details,
        uncategorizedItems: g.items.filter(item => !g.categories.some(c => id(c.ID) === id(item.Budget_Category))).length };
    });
  }
  function newer(a, b) {
    return a.added.localeCompare(b.added) || a.id.length - b.id.length || a.id.localeCompare(b.id);
  }
  function select(rows, filters) {
    if (!['approved','latest','all'].includes(filters.scope)) throw new Error('Choose which budgets to include.');
    let selected = filters.scope === 'approved' ? rows.filter(r => r.fullyApproved) : rows.slice();
    if (filters.scope !== 'all') {
      const latest = new Map();
      selected.forEach(r => {
        // Never merge unlinked budgets or deduplicate unrelated records by display name.
        const key = r.subdivisionId || 'budget:' + r.id;
        if (!latest.has(key) || newer(r, latest.get(key)) > 0) latest.set(key, r);
      });
      selected = [...latest.values()];
    }
    return selected.filter(r => (!filters.projectId || r.projectId === filters.projectId) && (!filters.territory || r.territory === filters.territory)
      && (!filters.status || r.status === filters.status) && (!filters.search || (r.name + ' ' + r.project + ' ' + r.subdivision).toLowerCase().includes(filters.search.toLowerCase())));
  }
  function report(rows, filters) {
    const selected = select(rows, filters), basis = filters.basis === 'final' ? 'final' : 'revised';
    const result = selected.map(r => {
      const budget = r[basis], remaining = budget === null || r.gp === null ? null : budget - r.gp;
      return { ...r, budget, remaining, used: budget > 0 && r.gp !== null ? r.gp / budget : null,
        overrun: remaining === null ? null : Math.max(0, -remaining) };
    });
    const comparable = result.filter(r => r.remaining !== null);
    return { rows: result, count: result.length, missing: result.length - comparable.length,
      budget: comparable.length ? sum(comparable,'budget') : null, actual: comparable.length ? sum(comparable,'gp') : null,
      remaining: comparable.length ? sum(comparable,'remaining') : null, overrun: comparable.length ? sum(comparable,'overrun') : null,
      overCount: comparable.filter(r => r.overrun > 0).length, pending: sum(result,'pending') };
  }
  root.InsightsBudgetModel = Object.freeze({ normalize, select, report });
})(typeof window === 'undefined' ? globalThis : window);
