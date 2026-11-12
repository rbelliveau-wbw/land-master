(function () {
  'use strict';
  const host = document.getElementById('budgetExceptionsDashboard');
  if (!host) return;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const moneyFormatter = new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 });
  const countFormatter = new Intl.NumberFormat('en-US');
  const money = value => value == null ? '—' : moneyFormatter.format(value);
  const count = value => value == null ? '—' : countFormatter.format(value);
  const chevron = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';
  const labels = {missing:'Actuals, No Final',over:'Over Final Budget',unbudgeted:'Unbudgeted Costs',approval:'Approval Aging'};
  const badgeLabels = {missing:'No Final Budget',over:'Over Final',unbudgeted:'No Allocation',approval:'Approval Aging'};
  const cardTitles = {
    missing:'GP or HCSS costs with no saved Final at the matching budget scope.',
    over:'GP actuals above each category Final. Unused categories do not offset category overages. GP and HCSS are never combined.',
    unbudgeted:'Actual costs on a line without a Final allocation inside a finalized category.',
    approval:'Current budget approvals pending for more than 14 days.'
  };
  const S = { permissions:null, identity:'', references:null, rows:null, report:null, ready:false, busy:false, generation:0, exception:'missing', expanded:new Set(), categories:new Set(), initializedExpansion:false, preferences:null };
  let bodyChunks = new Map(), searchTimer;
  const actor = () => {
    const value = window.LMRuntime?.current() || {};
    return JSON.stringify([value.environment || '',value.user || '',value.appLinkName || '']);
  };
  const granted = () => S.permissions?.hasRow === true && S.permissions?.budgetExceptionsDashboard === true;
  const number = (value, ...key) => window.InsightsNumbers?.markup(value, JSON.stringify(['budget-exceptions',S.identity,...key])) ?? esc(value);
  const categoryKey = (row, category) => JSON.stringify([row.id,category.key || category.id]);
  const rowId = key => 'be-row-' + encodeURIComponent(key);
  const selected = id => window.InsightsControls?.values($(id)) || [...$(id).selectedOptions].map(option => option.value).filter(Boolean);
  const filters = () => ({exception:S.exception,search:$('beSearch').value.trim(),categoryIds:selected('beCategory'),projectIds:selected('beProject'),territories:selected('beTerritory')});
  const cards = Object.keys(labels).map(key => '<button type="button" class="be-metric" data-be-exception="'+key+'" aria-pressed="'+(key==='missing')+'" aria-controls="beReportPane" title="'+esc(cardTitles[key])+'" disabled><span class="be-metric-label"><i class="be-dot '+key+'" aria-hidden="true"></i>'+labels[key]+'</span><span class="be-metric-value" data-be-count="'+key+'">—</span><span class="be-metric-caption" data-be-caption="'+key+'">'+(key==='approval'?'More Than 14 Days':'Phases')+'</span></button>').join('');
  host.innerHTML = '<div class="be-top-card"><header class="be-heading"><div><span>Data Insights</span><h1>Budget Exceptions</h1></div><span id="beScope" class="be-heading-scope" role="status"></span><span id="beQuality" class="be-quality" hidden></span><span id="beCoverage" class="be-readonly" title="Saved Budget Item actuals; external jobs without a Budget and unassigned import rows are not included.">Saved Budget Actuals</span></header><div class="be-overview-label">Current Scope</div><div id="beCards" class="be-metrics" aria-label="Filter Budget Exceptions">'+cards+'</div><section class="be-filters" aria-label="Budget Exception Filters"><label class="be-search">Search<input id="beSearch" type="search" placeholder="Subdivision, project, or budget…" disabled></label><label>Category<select id="beCategory" multiple data-picker="multi" disabled><option value="" hidden>All Categories</option></select></label><label>Territory<select id="beTerritory" multiple data-picker="multi" disabled><option value="" hidden>All Territories</option></select></label><label>Project<select id="beProject" multiple data-picker="multi" disabled><option value="" hidden>All Projects</option></select></label><button type="button" id="beAll" class="button" aria-pressed="false" disabled>All Exceptions</button><button type="button" id="beCollapse" class="button" disabled>Collapse All</button><button type="button" id="beReset" class="text-button" disabled>Reset</button></section></div>'+
    '<div id="beNotice" class="notice be-notice" role="status" hidden><span id="beNoticeText"></span><button type="button" id="beRetry" class="text-button" hidden>Retry</button></div>'+
    '<section class="be-report" aria-label="Budget Exception Hierarchy"><div class="be-report-heading"><h2 id="beTitle">Actuals, No Final</h2><span id="beCount" role="status" aria-live="polite"></span></div><div id="beReportPane" data-lm-motion="panel"><div class="be-scroll" tabindex="0" role="region" aria-label="Scrollable Budget Exception Hierarchy"><table id="beMatrix" aria-describedby="beDefinition" aria-busy="false"><caption class="sr-only">Subdivision, category, and budget line exceptions</caption><thead><tr><th scope="col">Subdivision / Category / Budget Line</th><th scope="col">Final Budget</th><th scope="col">GP Actuals</th><th scope="col">HCSS Costs</th><th scope="col">GP Overage</th></tr></thead><tbody id="beBody"></tbody></table></div><div id="beLoading" class="insights-loading" role="status" aria-live="polite" hidden><div class="insights-loading-card"><span class="insights-loading-emblem" aria-hidden="true"><span class="insights-loading-ring"></span></span><span>Loading budget exceptions…</span><span id="beLoadProgress" class="sr-only"></span></div></div><div id="beEmpty" class="be-empty" hidden><h2 id="beEmptyTitle">No Matching Budget Exceptions</h2></div></div><p id="beDefinition" class="sr-only">Saved Final values follow Budget Manager. GP and HCSS are separate sources and may overlap; they are never added together. Each category compares GP actuals with its saved Final. Phase GP Overage totals positive category overages without offsetting unused budget elsewhere. Categories without a Final have no overage comparison. Parent and child amounts are a hierarchy and must not be added together. Approval Aging means a current budget approval has been pending for more than 14 days.</p></section>';
  window.InsightsControls?.mount?.(host);
  function notice(text, error=false, retry=false) {
    $('beNotice').hidden=!text;
    $('beNotice').classList.toggle('error',error);
    $('beNoticeText').textContent=text || '';
    $('beRetry').hidden=!retry;
  }
  function loading(value) {
    $('beLoading').hidden=!value;
    $('beMatrix').setAttribute('aria-busy',String(value));
    $('beReportPane').setAttribute('aria-busy',String(value));
  }
  function setControls() {
    for (const control of host.querySelectorAll('.be-filters input,.be-filters select,.be-filters button,.be-metric')) control.disabled=!S.ready;
    $('beCollapse').disabled=!S.ready || !S.report?.rows.length;
    window.InsightsControls?.syncAll();
  }
  function fillFilters() {
    const options=(id,entries) => {
      const preference={beCategory:'categoryIds',beProject:'projectIds',beTerritory:'territories'}[id];
      const retained=new Set(S.preferences?.[preference] || selected(id)),unique=new Map(entries.filter(([key])=>key));
      for(const value of retained)if(!unique.has(value))unique.set(value,'Unavailable '+({beCategory:'Category',beProject:'Project',beTerritory:'Territory'}[id]));
      $(id).innerHTML='<option value="" hidden>'+({beCategory:'All Categories',beProject:'All Projects',beTerritory:'All Territories'}[id])+'</option>'+[...unique].sort((a,b)=>String(a[1]).localeCompare(String(b[1]))).map(([key,label])=>'<option value="'+esc(key)+'"'+(retained.has(String(key))?' selected':'')+'>'+esc(label)+'</option>').join('');
    };
    options('beCategory',S.rows.flatMap(row=>row.categories.map(category=>[category.key || category.id,category.name])));
    options('beProject',S.rows.map(row=>[row.projectId,row.project]));
    options('beTerritory',S.rows.map(row=>[row.territory,row.territory]));
    if(S.preferences) {
      S.exception=S.preferences.exception;$('beSearch').value=S.preferences.search;
      S.expanded=new Set(S.preferences.expanded);S.categories=new Set(S.preferences.categories);S.initializedExpansion=true;S.preferences=null;
    } else if(!S.initializedExpansion)applyRouteProject();
  }
  function applyRouteProject() {
    const projectId=window.InsightsShell?.route?.().projectId;
    if(typeof projectId!=='string'||!projectId.trim())return;
    if(![...$('beProject').options].some(option=>option.value===projectId)) {const option=document.createElement('option');option.setAttribute('value',projectId);option.textContent='Unavailable Project';$('beProject').appendChild(option);}
    for(const option of $('beProject').options)option.selected=option.value===projectId;
  }
  function tags(node) {
    return (node.flags || []).map(flag=>labels[flag]?'<span class="be-badge '+flag+'" title="'+esc(cardTitles[flag])+'">'+badgeLabels[flag]+(flag==='approval'&&node.pendingDays!=null?' · '+count(node.pendingDays)+'d':'')+'</span>':'').join('');
  }
  function financial(node,key) {
    const final=node.final==null?'<span class="be-no-final">'+((node.flags || []).includes('unbudgeted')?'No Allocation':'No Final')+'</span>':number(money(node.final),key,'final');
    const over=node.overage==null||node.overage<=0?'<span class="be-muted">—</span>':'<span class="be-over">'+number('+'+money(node.overage),key,'overage')+'</span>';
    return '<td class="be-value">'+final+'</td><td class="be-value">'+number(money(node.gp),key,'gp')+'</td><td class="be-value">'+number(money(node.hcss),key,'hcss')+'</td><td class="be-value">'+over+'</td>';
  }
  function phaseMarkup(row) {
    const key='phase:'+row.id,name=row.subdivision || row.name || 'Unassigned Subdivision';
    const context=[row.project,row.territory].filter(Boolean).join(' · '),title=[row.name,row.status].filter(Boolean).join(' · ');
    const controlled=row.categories.map(category=>rowId('category:'+categoryKey(row,category))).join(' ');
    return '<tr class="be-phase" data-motion-row="'+esc(key)+'" data-be-phase="'+esc(row.id)+'" title="'+esc(title)+'"><th scope="row"><button type="button" class="be-disclosure" data-be-toggle-phase="'+esc(row.id)+'" aria-expanded="'+S.expanded.has(row.id)+'" aria-controls="'+esc(controlled)+'">'+chevron+'<span>'+esc(name)+'</span></button><span class="be-context">'+esc(context)+'</span><span class="be-badges">'+tags(row)+'</span></th>'+financial(row,key)+'</tr>';
  }
  function categoryMarkup(row,category) {
    const scope=categoryKey(row,category),key='category:'+scope,controlled=category.items.map(item=>rowId('item:'+JSON.stringify([row.id,category.key || category.id,item.id]))).join(' ');
    return '<tr id="'+rowId(key)+'" class="be-category" data-motion-row="'+esc(key)+'" data-be-parent-phase="'+esc(row.id)+'"><th scope="row"><div class="be-category-name"><button type="button" class="be-disclosure" data-be-toggle-category="'+esc(scope)+'" aria-expanded="'+S.categories.has(scope)+'" aria-controls="'+esc(controlled)+'">'+chevron+'<span>'+esc(category.name)+'</span></button><span class="be-category-badges">'+tags(category)+'</span></div></th>'+financial(category,key)+'</tr>';
  }
  function itemMarkup(row,category,item) {
    const scope=categoryKey(row,category),key='item:'+JSON.stringify([row.id,category.key || category.id,item.id]);
    return '<tr id="'+rowId(key)+'" class="be-line" data-motion-row="'+esc(key)+'" data-be-parent-phase="'+esc(row.id)+'" data-be-parent-category="'+esc(scope)+'"><th scope="row"><span class="be-line-name">'+esc(item.name || 'Unnamed Budget Line')+'</span><span class="be-line-code">'+esc(item.costCode || item.code || '')+'</span><span class="be-line-badges">'+tags(item)+'</span></th>'+financial(item,key)+'</tr>';
  }
  function reconcileBody(chunks) {
    const next=new Map(),nodes=[];
    for(const [key,html] of chunks) {
      let chunk=bodyChunks.get(key);
      if(!chunk || chunk.html!==html) { const template=document.createElement('template');template.innerHTML=html;chunk={html,node:template.content.firstElementChild}; }
      next.set(key,chunk);nodes.push(chunk.node);
    }
    const keep=new Set(nodes),body=$('beBody');
    for(const node of [...body.children]) if(!keep.has(node)) node.remove();
    let cursor=body.firstElementChild;
    for(const node of nodes) {if(node===cursor)cursor=cursor.nextElementSibling;else body.insertBefore(node,cursor);}
    bodyChunks=next;
  }
  function syncHierarchy() {
    for(const row of $('beBody').children) {
      const parent=row.dataset.beParentPhase,category=row.dataset.beParentCategory;
      row.hidden=!!parent && (!S.expanded.has(parent) || !!category && !S.categories.has(category));
    }
    for(const button of $('beBody').querySelectorAll('[data-be-toggle-phase]')) button.setAttribute('aria-expanded',String(S.expanded.has(button.dataset.beTogglePhase)));
    for(const button of $('beBody').querySelectorAll('[data-be-toggle-category]')) button.setAttribute('aria-expanded',String(S.categories.has(button.dataset.beToggleCategory)));
    const allClosed=!S.report?.rows.some(row=>S.expanded.has(row.id));
    $('beCollapse').textContent=allClosed?'Expand All':'Collapse All';
  }
  function openFirst(rows) {
    const first=rows[0];if(!first)return;
    S.expanded.add(first.id);
    const category=[...first.categories].sort((a,b)=>(b.gp || 0)-(a.gp || 0))[0];
    if(category)S.categories.add(categoryKey(first,category));
  }
  function render() {
    if(!S.rows || !granted() || S.identity!==actor())return;
    const previous=window.InsightsNumbers?.capture(host),report=window.InsightsBudgetExceptionsModel.report(S.rows,filters());
    S.report=report;
    if(!S.initializedExpansion) {openFirst(report.rows);S.initializedExpansion=true;}
    for(const [flag,value] of Object.entries(report.overview)) {
      const countNode=host.querySelector('[data-be-count="'+flag+'"]'),caption=host.querySelector('[data-be-caption="'+flag+'"]');if(!countNode || !caption)continue;
      countNode.innerHTML=number(count(value.count),'overview',flag,'count')+'<small>'+(value.count===1?'Phase':'Phases')+'</small>';
      caption.innerHTML=flag==='missing'?'GP '+number(money(value.gp),'overview',flag,'gp')+' · HCSS '+number(money(value.hcss),'overview',flag,'hcss'):flag==='over'?number(money(value.overage),'overview',flag,'overage')+' GP Category Overages':flag==='unbudgeted'?number(money(value.gp),'overview',flag,'gp')+' GP Actuals':value.oldestDays==null?'More Than 14 Days':'Oldest '+number(count(value.oldestDays),'overview',flag,'oldest')+' Days';
    }
    host.querySelectorAll('[data-be-exception]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.beException===S.exception)));
    $('beAll').setAttribute('aria-pressed',String(S.exception==='all'));
    $('beTitle').textContent=S.exception==='all'?'All Budget Exceptions':labels[S.exception];
    $('beCount').innerHTML=number(count(report.count),'matching-count')+' '+(report.count===1?'Phase':'Phases');
    $('beScope').innerHTML=number(count(report.subdivisionCount),'subdivision-count')+' '+(report.subdivisionCount===1?'Subdivision':'Subdivisions')+' · '+number(count(report.flagCount),'flag-count')+' '+(report.flagCount===1?'Flag':'Flags');
    $('beQuality').hidden=!report.unknownApprovalDates;
    $('beQuality').textContent=report.unknownApprovalDates?count(report.unknownApprovalDates)+' Approval Dates Missing':'';
    $('beQuality').title='Pending approvals without Sent Date are not assigned an invented age.';
    if(report.coverage)$('beCoverage').title=report.coverage;
    const chunks=[];
    for(const row of report.rows) {
      chunks.push(['phase:'+row.id,phaseMarkup(row)]);
      for(const category of row.categories) {
        chunks.push(['category:'+categoryKey(row,category),categoryMarkup(row,category)]);
        for(const item of category.items)chunks.push(['item:'+JSON.stringify([row.id,category.key || category.id,item.id]),itemMarkup(row,category,item)]);
      }
    }
    reconcileBody(chunks);syncHierarchy();
    $('beEmpty').hidden=report.rows.length>0;$('beEmptyTitle').textContent='No Matching Budget Exceptions';
    setControls();window.InsightsNumbers?.apply(host,previous);
  }
  function clear() {
    clearTimeout(searchTimer);S.generation++;S.references=null;S.rows=null;S.report=null;S.ready=false;S.busy=false;S.expanded.clear();S.categories.clear();S.initializedExpansion=false;bodyChunks=new Map();
    $('beBody').replaceChildren();$('beCount').textContent='';$('beScope').textContent='';$('beLoadProgress').textContent='';$('beQuality').hidden=true;$('beQuality').textContent='';$('beSearch').value='';
    for(const node of host.querySelectorAll('[data-be-count]'))node.textContent='—';
    for(const node of host.querySelectorAll('[data-be-caption]'))node.textContent=node.dataset.beCaption==='approval'?'More Than 14 Days':'Phases';
    for(const id of ['beCategory','beTerritory','beProject']) {$(id).innerHTML='<option value="" hidden>'+({beCategory:'All Categories',beProject:'All Projects',beTerritory:'All Territories'}[id])+'</option>';}
    $('beEmpty').hidden=true;loading(false);notice('');setControls();
  }
  async function load() {
    if(!granted() || S.busy || window.InsightsShell?.current()!=='budget-exceptions' || !window.InsightsShell?.connected())return;
    const generation=++S.generation,identity=actor(),isCurrent=()=>generation===S.generation&&granted()&&identity===actor();
    S.identity=identity;S.busy=true;notice('');loading(true);$('beEmpty').hidden=true;
    try {
      if(!/^\d{4}-\d{2}-\d{2}$/.test(S.permissions.today || ''))throw new Error('The Creator application date is unavailable. Update the User Access function and retry.');
      const data=await window.InsightsBudgetExceptionsCreator.load(window.ZOHO.CREATOR.DATA,S.references,progress=>{if(isCurrent())$('beLoadProgress').textContent=typeof progress==='string'?progress:progress?.message || '';},{access:S.permissions,isCancelled:()=>!isCurrent()});
      if(!isCurrent())return;
      const rows=window.InsightsBudgetExceptionsModel.normalize(data,{today:S.permissions.today,approvalAgeDays:14,finalRule:'populated'});
      if(!isCurrent())return;
      S.rows=rows;S.ready=true;fillFilters();render();
    } catch(error) {
      if(!isCurrent())return;
      notice((S.rows?'Refresh failed. Showing previous complete results. ':'')+(error?.message || 'Budget exceptions could not be loaded.'),true,true);
      if(!S.rows) {$('beEmpty').hidden=false;$('beEmptyTitle').textContent='Budget Exceptions Unavailable';}
    } finally {
      if(isCurrent()) {S.busy=false;loading(false);if(S.report)$('beEmpty').hidden=S.report.rows.length>0;setControls();}
    }
  }
  host.addEventListener('click',event=>{
    const phase=event.target.closest('[data-be-toggle-phase]');
    if(phase && granted()) {const key=phase.dataset.beTogglePhase;S.expanded.has(key)?S.expanded.delete(key):S.expanded.add(key);syncHierarchy();return;}
    const category=event.target.closest('[data-be-toggle-category]');
    if(category && granted()) {const key=category.dataset.beToggleCategory;S.categories.has(key)?S.categories.delete(key):S.categories.add(key);syncHierarchy();return;}
    const card=event.target.closest('[data-be-exception]');
    if(card && S.ready && granted()) {S.exception=card.dataset.beException;const matching=window.InsightsBudgetExceptionsModel.report(S.rows,filters()).rows;if(!matching.some(row=>S.expanded.has(row.id)))openFirst(matching);render();}
  });
  for(const id of ['beCategory','beTerritory','beProject'])$(id).addEventListener('change',render);
  $('beSearch').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(render,70);});
  $('beAll').addEventListener('click',()=>{S.exception='all';render();});
  $('beCollapse').addEventListener('click',()=>{
    if(!S.report || !granted())return;
    const close=S.report.rows.some(row=>S.expanded.has(row.id));
    for(const row of S.report.rows) {close?S.expanded.delete(row.id):S.expanded.add(row.id);if(!close)for(const category of row.categories)S.categories.add(categoryKey(row,category));}
    syncHierarchy();
  });
  $('beReset').addEventListener('click',()=>{for(const id of ['beCategory','beTerritory','beProject'])window.InsightsControls?.setValues($(id),[]);applyRouteProject();$('beSearch').value='';S.exception='missing';S.initializedExpansion=false;S.expanded.clear();S.categories.clear();render();});
  $('beRetry').addEventListener('click',()=>void load());
  window.addEventListener('insights:access',event=>{const identity=actor();if(S.identity!==identity){S.preferences=null;S.exception='missing';}else if(S.ready)S.preferences={...filters(),expanded:[...S.expanded],categories:[...S.categories]};S.permissions=event.detail;S.identity=identity;clear();});
  window.addEventListener('insights:ready',event=>{if(granted())S.references=event.detail;});
  window.addEventListener('insights:connected',()=>{if(granted()&&!S.rows)void load();});
  window.addEventListener('insights:dashboard',event=>{if(event.detail==='budget-exceptions'&&granted()&&!S.rows)void load();});
  window.BudgetExceptionsApp=Object.freeze({ready:()=>S.ready&&granted(),scope:()=>S.identity,refresh:load});
})();
