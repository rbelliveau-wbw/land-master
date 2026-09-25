(function () {
  'use strict';
  const $ = id => document.getElementById(id), M = window.InsightsBudgetModel;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => n === null || n === undefined ? '—' : n.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
  const pct = n => n === null ? '—' : (n * 100).toFixed(0) + '%';
  const state = { references: null, rows: [], report: null, generation: 0, ready: false, busy: false, requested: false };
  const preferenceKey = () => 'lm.insights.budget.preferences.' + (window.LMRuntime?.current().environment || 'unknown');
  function readPreferences() { try { return JSON.parse(sessionStorage.getItem(preferenceKey()) || '{}'); } catch { return {}; } }
  function savePreferences() { try { sessionStorage.setItem(preferenceKey(), JSON.stringify({scope:$('budgetInclude').value,basis:$('budgetBasis').value,hcss:$('budgetHCSS').checked})); } catch { /* Storage is optional inside Creator. */ } }
  function message(title, subtitle) { $('budgetContent').innerHTML = '<div class="empty"><h2>' + esc(title) + '</h2><p>' + esc(subtitle) + '</p></div>'; }
  function shell() {
    $('budgetContent').innerHTML = '<section class="filters budget-filters" aria-label="Budget filters"><div class="filter-row">' +
      '<label>Include<select id="budgetInclude"><option value="">Choose budgets…</option><option value="approved">Latest approved per subdivision</option><option value="latest">Latest per subdivision</option><option value="all">All budgets</option></select></label>' +
      '<label>Compare GP actuals to<select id="budgetBasis"><option value="">Choose budget basis…</option><option value="revised">Revised Final</option><option value="final">Original Final</option></select></label>' +
      '<label>Project<select id="budgetProject"><option value="">All projects</option></select></label><label>Territory<select id="budgetTerritory"><option value="">All territories</option></select></label>' +
      '<label>Search<input id="budgetSearch" type="search" placeholder="Budget, project, or subdivision…"></label></div>' +
      '<div class="filter-row secondary"><label>Lifecycle status<select id="budgetStatus"><option value="">All statuses</option></select></label><label>Sort<select id="budgetSort"><option value="overrun">Largest overrun</option><option value="used">Highest budget use</option><option value="budget">Largest budget</option><option value="name">Project / subdivision</option></select></label><label class="check-label"><input id="budgetOverOnly" type="checkbox"> Over budget only</label><label class="check-label"><input id="budgetHCSS" type="checkbox"> Show HCSS separately</label><button id="budgetReset" class="text-button">Reset filters</button><button id="budgetExport" class="button" disabled>↓ Export CSV</button></div></section>' +
      '<div id="budgetNote" class="load-banner" role="status"></div><div id="budgetMetrics" class="budget-metrics"></div><div id="budgetOverview" class="budget-overview"></div>' +
      '<section id="budgetTableCard" class="report-card" hidden><div class="budget-table-title"><h2>Subdivision budgets</h2><span id="budgetTableCount"></span></div><div class="budget-table-scroll"><table class="budget-table"><thead id="budgetHead"></thead><tbody id="budgetBody"></tbody></table></div></section>' +
      '<div class="budget-definition">Final = category Final totals. GP and HCSS stay separate. Remaining = selected budget − GP actuals; this is not a forecast of cost to complete.</div>';
    const opts = (id, values) => { $(id).insertAdjacentHTML('beforeend', values.map(([v,t]) => '<option value="' + esc(v) + '">' + esc(t) + '</option>').join('')); };
    const unique = (key,label) => [...new Map(state.rows.map(r => [r[key],r[label]])).entries()].filter(([id]) => id).sort((a,b) => a[1].localeCompare(b[1]));
    opts('budgetProject',unique('projectId','project')); opts('budgetTerritory',unique('territory','territory')); opts('budgetStatus',unique('status','status'));
    const projectScope = new URLSearchParams(location.search).get('projectId');
    if (projectScope) { if (![...$('budgetProject').options].some(o => o.value === projectScope)) $('budgetProject').add(new Option('Unavailable project',projectScope)); $('budgetProject').value = projectScope; }
    const preferences = readPreferences();
    if (['approved','latest','all'].includes(preferences.scope)) $('budgetInclude').value=preferences.scope;
    if (['revised','final'].includes(preferences.basis)) $('budgetBasis').value=preferences.basis;
    $('budgetHCSS').checked=preferences.hcss===true;
    $('budgetInclude').title='Latest means newest created record per Subdivision ID. Approved requires both Development and Construction tracks to be Approved.';
    ['budgetInclude','budgetBasis','budgetProject','budgetTerritory','budgetStatus','budgetSort','budgetOverOnly','budgetHCSS'].forEach(id => $(id).addEventListener('change',render));
    let timer; $('budgetSearch').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(render,160);});
    $('budgetReset').addEventListener('click',()=>{['budgetProject','budgetTerritory','budgetStatus','budgetSearch'].forEach(id=>$(id).value='');$('budgetOverOnly').checked=false;render();});
    $('budgetExport').addEventListener('click',exportCsv);
    $('budgetBody').addEventListener('click',e=>{const button=e.target.closest('[data-budget]');if(button)openDetail(button.dataset.budget);});
    $('budgetOverview').addEventListener('click',e=>{const button=e.target.closest('[data-budget-project]');if(button){$('budgetProject').value=button.dataset.budgetProject;render();}});
  }
  function render() {
    if (!state.ready) return;
    savePreferences();
    const filters = { scope:$('budgetInclude').value,basis:$('budgetBasis').value,projectId:$('budgetProject').value,territory:$('budgetTerritory').value,status:$('budgetStatus').value,search:$('budgetSearch').value.trim() };
    if (!filters.scope || !filters.basis) {
      state.report=null; $('budgetMetrics').innerHTML=''; $('budgetTableCard').hidden=true; $('budgetExport').disabled=true;
      $('budgetNote').hidden=false; $('budgetNote').textContent='Choose which budgets and budget basis to compare.';
      const approved=state.rows.filter(r=>r.fullyApproved).length, pending=state.rows.filter(r=>[r.devStatus,r.constructionStatus].includes('Pending')).length;
      $('budgetOverview').innerHTML='<section class="insight-panel"><h2>Budget inventory</h2><div class="inventory-counts"><span><b>'+state.rows.length+'</b> budgets</span><span><b>'+approved+'</b> both tracks approved</span><span><b>'+pending+'</b> awaiting approval</span></div></section>';
      return;
    }
    const r = M.report(state.rows, filters); state.report=r;
    $('budgetScope').textContent=r.count+' budgets · '+$('budgetInclude').selectedOptions[0].text+' · '+$('budgetBasis').selectedOptions[0].text;
    const notes=[];
    if(filters.scope==='all') notes.push('All budgets are included; multiple budgets for one subdivision may overlap.');
    if(r.missing) notes.push(r.missing+' budgets have no category detail and are excluded from financial totals.');
    if(r.rows.some(r=>r.uncategorizedItems)) notes.push('Some items have no matching category. Inspect budget details.');
    $('budgetNote').hidden=!notes.length; $('budgetNote').textContent=notes.join(' ');
    const card=(label,n,caption,tone='')=>'<div class="budget-metric '+tone+'"><span>'+label+'</span><strong>'+money(n)+'</strong><small>'+caption+'</small></div>';
    $('budgetMetrics').innerHTML=card($('budgetBasis').selectedOptions[0].text,r.budget,r.count+' selected budgets')+card('GP actuals',r.actual,'Posted cost to date')+card('Remaining',r.remaining,'Budget less GP actuals',r.remaining<0?'danger':'')+card('Over budget',r.overrun,r.overCount+' budgets exceed the selected basis',r.overCount?'danger':'');
    const projects=new Map(); r.rows.forEach(row=>{const key=row.projectId||'unassigned';if(!projects.has(key))projects.set(key,{id:row.projectId,name:row.project,budget:0,actual:0,count:0});const p=projects.get(key);p.count++;if(row.remaining!==null){p.budget+=row.budget;p.actual+=row.gp;}});
    const ranked=[...projects.values()].sort((a,b)=>(b.actual-b.budget)-(a.actual-a.budget)).slice(0,6);
    const bars=ranked.map(p=>'<button class="project-spend" data-budget-project="'+esc(p.id)+'" '+(!p.id?'disabled':'')+'><span class="spend-name">'+esc(p.name)+'<small>'+p.count+' budgets</small></span><span class="spend-track"><i style="width:'+Math.min(100,Math.max(0,p.budget>0?p.actual/p.budget*100:p.actual>0?100:0))+'%" class="'+(p.actual>p.budget?'over':'')+'"></i></span><span class="spend-value">'+money(p.actual)+'<small>of '+money(p.budget)+'</small></span></button>').join('');
    const pending=r.rows.filter(row=>row.pending!==0).length;
    $('budgetOverview').innerHTML='<section class="insight-panel"><div class="panel-heading"><h2>Spend by project</h2><span>GP actuals / budget</span></div>'+(bars||'<p>No matching projects</p>')+'</section><section class="insight-panel budget-signals"><h2>At a glance</h2><div><strong>'+r.overCount+'</strong><span>budgets over the selected basis</span></div><div><strong>'+money(r.pending)+'</strong><span>net pending modifications · '+pending+' budgets</span></div><div><strong>'+r.rows.filter(row=>row.fullyApproved).length+' / '+r.count+'</strong><span>both approval tracks approved</span></div><p>Pending modifications are excluded from Revised Final.</p></section>';
    let rows=r.rows.filter(row=>!$('budgetOverOnly').checked||row.overrun>0);const sort=$('budgetSort').value;
    rows.sort((a,b)=>sort==='name'?a.project.localeCompare(b.project)||a.name.localeCompare(b.name):((b[sort]??-Infinity)-(a[sort]??-Infinity)||a.name.localeCompare(b.name)));
    $('budgetTableCard').hidden=false; $('budgetTableCount').textContent=rows.length+' shown · Click a budget for category detail';
    const hcss=$('budgetHCSS').checked;
    $('budgetHead').innerHTML='<tr><th>Project / subdivision</th><th>Approvals</th><th>'+esc($('budgetBasis').selectedOptions[0].text)+'</th><th>GP actuals</th>'+(hcss?'<th>HCSS actuals</th>':'')+'<th>Remaining</th><th>Budget used</th></tr>';
    const badge=status=>'<span class="approval-badge '+(status==='Approved'?'approved':status==='Pending'?'pending':'')+'">'+esc(status)+'</span>';
    $('budgetBody').innerHTML=rows.length?rows.map(row=>'<tr><td><button class="budget-link" data-budget="'+esc(row.id)+'">'+esc(row.name)+'</button><small>'+esc(row.project)+' · '+esc(row.territory)+' · '+esc(row.status)+'</small></td><td><div class="track-status"><span>Dev</span>'+badge(row.devStatus)+'</div><div class="track-status"><span>Const</span>'+badge(row.constructionStatus)+'</div></td><td>'+money(row.budget)+'</td><td>'+money(row.gp)+'</td>'+(hcss?'<td>'+money(row.hcss)+'</td>':'')+'<td class="'+(row.remaining<0?'negative':'')+'">'+money(row.remaining)+'</td><td><span class="'+(row.used>1?'negative':'')+'">'+pct(row.used)+'</span><div class="mini-track"><i style="width:'+Math.min(100,Math.max(0,(row.used||0)*100))+'%" class="'+(row.overrun>0?'over':'')+'"></i></div></td></tr>').join(''):'<tr><td colspan="'+(hcss?7:6)+'" class="empty">No budgets match these filters.</td></tr>';
    $('budgetExport').disabled=!rows.length;
  }
  function openDetail(id) {
    const r=state.report?.rows.find(r=>r.id===id);if(!r)return;
    $('budgetDetailTitle').textContent=r.name;
    $('budgetDetailMeta').textContent=r.project+' · '+r.subdivision+' · '+r.type;
    $('budgetDetailBody').innerHTML=r.details.map(c=>'<tr><td>'+esc(c.name)+'<small>'+esc(c.department)+'</small></td><td>'+money(c.final)+'</td><td>'+money(c.approved)+'</td><td>'+money(c.revised)+'</td><td>'+money(c.gp)+'</td><td>'+money(c.hcss)+'</td></tr>').join('')||'<tr><td colspan="6">No category detail is available.</td></tr>';
    $('budgetDetailNote').textContent=r.uncategorizedItems?r.uncategorizedItems+' uncategorized items contribute to budget actuals but are not represented in the category rows.':'Blank currency values follow Budget Manager’s $0 convention. Budget use measures spending, not construction completion.';
    $('budgetDetail').showModal();
  }
  function exportCsv() {
    const r=state.report;if(!r)return;
    const rows=r.rows.filter(row=>!$('budgetOverOnly').checked||row.overrun>0);
    const csv=LotSalesModel.csv([['Land Master Insights — Budgets'],['Scope',$('budgetInclude').selectedOptions[0].text],['Budget basis',$('budgetBasis').selectedOptions[0].text],['Project','Subdivision','Budget','Status','Development approval','Construction approval','Final','Approved modifications','Revised Final','GP actuals','HCSS actuals','Remaining','Pending modifications'],...rows.map(x=>[x.project,x.subdivision,x.name,x.status,x.devStatus,x.constructionStatus,x.final,x.approved,x.revised,x.gp,x.hcss,x.remaining,x.pending])]);
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='insights-budgets.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function load() {
    state.requested=true;
    if(!InsightsShell.connected()){message('Open inside Land Master','Budget data loads in the Creator widget.');return;}
    if(state.busy)return;
    const generation=++state.generation;
    const saved=state.ready?Object.fromEntries(['budgetInclude','budgetBasis','budgetProject','budgetTerritory','budgetStatus','budgetSearch','budgetSort'].map(id=>[id,$(id).value])):null;
    const overOnly=state.ready && $('budgetOverOnly').checked;
    state.busy=true;state.ready=false;$('budgetRefresh').disabled=true;message('Loading budgets','Category budgets, actuals and modifications are loading.');
    try{
      if(!state.references)state.references=await LotSalesCreator.loadReferences(ZOHO.CREATOR.DATA,{isCancelled:()=>generation!==state.generation});
      const data=await InsightsBudgetCreator.load(ZOHO.CREATOR.DATA,state.references,null,{isCancelled:()=>generation!==state.generation});
      if(generation!==state.generation)return;
      state.rows=M.normalize(data);state.ready=true;shell();if(saved)Object.entries(saved).forEach(([id,value])=>{if($(id).tagName==='SELECT' && value && ![...$(id).options].some(o=>o.value===value))$(id).add(new Option('Unavailable selection',value));$(id).value=value;});$('budgetOverOnly').checked=overOnly;render();
    }catch(e){if(generation===state.generation)message('Budgets unavailable',e.message+' · Use Refresh budgets to retry.');}
    finally{if(generation===state.generation){state.busy=false;$('budgetRefresh').disabled=false;}}
  }
  window.addEventListener('insights:ready',e=>{state.references=e.detail;if(!state.ready&&!state.busy)void load();});
  window.addEventListener('insights:connected',()=>{if(state.requested&&!state.ready&&!state.busy)void load();});
  window.addEventListener('insights:dashboard',e=>{if(e.detail==='budgets'&&!state.ready&&!state.busy)void load();});
  $('budgetRefresh').addEventListener('click',load); $('closeBudgetDetail').addEventListener('click',()=>$('budgetDetail').close());
  $('refresh').addEventListener('click',()=>{if(InsightsShell.current()==='budgets')void load();});
})();
