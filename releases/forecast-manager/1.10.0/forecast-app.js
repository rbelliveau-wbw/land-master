(function () {
  'use strict';
  const M = ForecastModel, $ = id => document.getElementById(id);
  const icons = {check:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10.5 3 3 7-7"/></svg>',close:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>'};
  const S = {ready:false,catalog:null,projectId:'',sub:'',snapshots:new Map(),phaseErrors:new Map(),get snapshot(){return this.snapshots.get(this.sub);},territories:null,builders:null,years:[],view:'outlook',page:'forecasts',pending:0,loading:false,creating:false,creation:null,entries:new Map(),queue:Promise.resolve(),picker:null,dialog:null,focus:null};
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const count = value => Number(value || 0).toLocaleString('en-US');
  const name = builderId => (S.catalog.builders.find(row=>row.id === builderId) || {}).name || 'Builder';
  const changed = () => [...S.entries.values()].some(entry=>entry.phase === 'failed' || entry.phase === 'unknown');
  const busy = () => S.pending > 0 || S.loading || S.creating || S.rowPending;
  const creationReview = () => S.creation && S.creation.phase === 'unknown' || S.rowOperation && S.rowOperation.phase === 'unknown';
  function notice(message, error = false) {const host = $('notice'); host.textContent = message || ''; host.classList.toggle('error',error); host.hidden = !message; if(error && window.LMSuccess) LMSuccess.clear();}
  function decode(raw) {
    let data = raw;
    for(let index=0;index<8;index++) {
      if(typeof data === 'string') {data=JSON.parse(data); continue;}
      if(data && typeof data === 'object' && String(data.code) === '9350') {const error=new Error('Creator custom API is missing.');error.apiMissing=true;error.unknown=false;throw error;}
      if(data && typeof data.ok === 'boolean') return data;
      if(!data || typeof data !== 'object') break;
      const field=['result','response','body','data','details','output'].find(key=>data[key] != null);
      if(!field) break;
      data=data[field];
    }
    throw new Error('Creator returned an unrecognized forecast response.');
  }
  async function request(body, write = false) {
    const context=LMRuntime.current();
    if(!S.ready || context.environment === 'UNKNOWN' || !context.user || context.user === '(unknown)') throw new Error('The connected Creator user and environment are unavailable.');
    const api=ZOHO.CREATOR.DATA;
    if(!api || typeof api.invokeCustomApi !== 'function') throw new Error('Creator custom API access is unavailable.');
    const apiName=LMRuntime.apiName('Forecast_Manager_Widget');
    let timer;
    try {
      const raw=await Promise.race([
        api.invokeCustomApi({api_name:apiName,http_method:'POST',content_type:'application/json',payload:{payload:JSON.stringify(body)}}),
        new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(new Error(write?'The save response timed out. Check status before editing again.':'The forecast request timed out.')),write?90000:30000);})
      ]);
      const data=decode(raw);
      if(data.ok !== true) {const error=new Error(data.message || 'The forecast request failed.'); error.unknown=data.unknown === true; error.data=data; throw error;}
      if(data.action !== body.action) throw new Error('Creator returned a response for a different forecast operation.');
      if(!M.date(data.today) || typeof data.windowOpen !== 'boolean') throw new Error('Creator did not return the forecast date and window status.');
      return data;
    } catch(error) {if(error.apiMissing || /custom api.*(?:doesn.?t exist|does not exist|not exist|linkname)/i.test(error.message || '')){error.apiMissing=true;error.apiName=apiName;}if(write && error.unknown == null) error.unknown=true; throw error;}
    finally {clearTimeout(timer);}
  }
  async function readCatalog() {
    const catalog=await request({action:'catalog'});
    if(!Array.isArray(catalog.subdivisions)||!Array.isArray(catalog.builders))throw new Error('Forecast choices are unavailable.');
    return catalog;
  }

  async function readProjectCatalog() {
    const [subdivisions, projects] = await Promise.all([
      LMData.readAll({reportName:'All_Subdivisions',fields:['ID','Project'],fresh:true}),
      LMData.readAll({reportName:'All_Projects',fields:['ID','Project_Name'],fresh:true})
    ]);
    const {id, single} = ForecastReviewModel;
    const catalog = new Map();
    for(const row of projects) {
      const projectId=id(row.ID);
      if(projectId&&row.Project_Name)catalog.set(projectId,{id:projectId,label:String(row.Project_Name),linkedPhases:new Set()});
    }
    if(subdivisions.length&&!subdivisions.some(row=>Object.hasOwn(row,'Project')))throw new Error('The subdivision report did not return Project.');
    for(const row of subdivisions) {
      const phaseId=id(row.ID);
      if(phaseId)catalog.get(single(row.Project))?.linkedPhases.add(phaseId);
    }
    return catalog;
  }
  const territoryOf = row => String(row.territory || 'Unassigned');
  const project = () => S.projects?.get(S.projectId);
  function phaseLabel(phase) {
    const match=String(phase.name).match(/(?:^|[\s–—-])(Phase\s+\d+[A-Za-z]?)(?:[\s–—-]|$)/i);
    return match ? match[1].replace(/^phase/i,'Phase') : phase.name;
  }
  const phaseOrder = new Intl.Collator('en-US',{numeric:true,sensitivity:'base'});
  function phases(selected=project(),catalog=S.catalog) {
    if(!selected || !catalog) return [];
    return catalog.subdivisions.filter(row=>selected.linkedPhases.has(row.id))
      .sort((a,b)=>phaseOrder.compare(phaseLabel(a),phaseLabel(b))||phaseOrder.compare(a.name,b.name));
  }
  function availableProjects() {
    return [...(S.projects?.values()||[])].filter(item=>phases(item).some(row=>!S.territories||S.territories.includes(territoryOf(row))))
      .sort((a,b)=>phaseOrder.compare(a.label,b.label));
  }
  function validSnapshot(data,phaseId) {
    if(!data.subdivision || data.subdivision.id!==phaseId || !Array.isArray(data.years) || !Array.isArray(data.months)) throw new Error('The forecast snapshot does not match this phase.');
  }
  function phaseFor(node) { return node.closest('[data-forecast-phase]')?.dataset.forecastPhase || S.sub; }
  function applySnapshot(data,phaseId=S.sub) {
    validSnapshot(data,phaseId);
    S.snapshots.set(phaseId,data);
    for(const [id,entry] of S.entries) {
      if(entry.subdivisionId!==phaseId||entry.phase!=='saved')continue;
      if(!data.months.some(row=>row.id===id&&row.forecast===entry.attempted))S.entries.delete(id);
    }
    if(phaseId===S.sub)renderOverview();
  }
  function renderOverview() {
    const data=S.snapshot, tabs=$('phaseTabs'), host=$('compactSummary'), fallback=$('phaseFallback');
    const focused=tabs.contains(document.activeElement)?document.activeElement:null;
    $('workspace').prepend(tabs);
    const summaryHtml=String(data?.summaryHtml || '');
    const compact=data && ForecastSummary.render(summaryHtml,host,data.inventory,S.sub,ForecastOverview.build(data));
    const error=$('phaseOverviewError');
    host.hidden=!compact;fallback.hidden=!!compact;
    const panel=compact?host.querySelector('.fs-overview'):fallback;
    if(compact) {
      const card=host.querySelector('.fs-disclosure');
      const placeTabs=()=>{if(card.open)panel.before(tabs);else card.after(tabs);};
      placeTabs();
      card.addEventListener('toggle',()=>{if(card.isConnected)placeTabs();});
    }
    panel.id=compact?'phaseDetails':'phaseFallback';
    panel.setAttribute('role','tabpanel');
    if(S.sub)panel.setAttribute('aria-labelledby','forecast-phase-tab-'+S.sub);
    tabs.querySelectorAll('button').forEach(button=>{
      button.setAttribute('aria-controls',panel.id);
      const selected=button.dataset.phaseTab===S.sub;
      button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
    });
    error.hidden=!!data;error.textContent=S.phaseErrors.get(S.sub)||'Phase details are unavailable.';
    $('summary').hidden=!!compact||!data;
    $('summaryFrame').srcdoc=compact||!data?'':'<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\';"><style>body{margin:0;padding:12px;background:#fff} .fm-wrap{border:0!important;padding:0!important;background:#fff!important}</style></head><body>'+summaryHtml+'</body></html>';
    syncPhaseHighlight();
    if(focused)focused.focus({preventScroll:true});
  }
  function renderPhaseTabs() {
    const all=phases();
    const labels=all.map(phaseLabel);
    $('phaseTabs').innerHTML=all.map((phase,index)=>'<button type="button" id="forecast-phase-tab-'+esc(phase.id)+'" role="tab" data-phase-tab="'+esc(phase.id)+'" title="'+esc(phase.name)+'">'+esc(labels.indexOf(labels[index])===labels.lastIndexOf(labels[index])?labels[index]:phase.name)+'</button>').join('');
  }
  function syncPhaseHighlight() {
    $('forecastGroups').querySelectorAll('[data-forecast-phase]').forEach(group=>{
      const selected=group.dataset.forecastPhase===S.sub;
      group.classList.toggle('selected-phase',selected);
      group.querySelector('summary').setAttribute('aria-current',String(selected));
    });
  }
  function choosePhase(phaseId) {
    if(!phases().some(phase=>phase.id===phaseId))return;
    if(S.sub!==phaseId){S.sub=phaseId;renderOverview();controls();}
    $('forecast-phase-tab-'+phaseId)?.focus();
  }
  function builders(snapshot) {
    if(S.builders) return S.builders;
    if(!snapshot) return [];
    return [...new Set([...(snapshot.subdivision.builderIds || []),...snapshot.years.map(row=>row.builderId)])].filter(id=>id && S.catalog.builders.some(row=>row.id===id));
  }
  const forecastYears=(snapshots=S.snapshots.values())=>[...new Set([...snapshots].flatMap(snapshot=>snapshot.years.map(row=>String(row.year))))].sort((a,b)=>Number(a)-Number(b));
  function years(snapshot) {return S.years.length ? S.years : forecastYears([snapshot]);}
  function rows(snapshot) {
    return snapshot?M.visibleMatrix(snapshot,builders(snapshot).sort((a,b)=>name(a).localeCompare(name(b))),years(snapshot)):[];
  }
  function controls() {
    document.querySelectorAll('[data-forecast-page]').forEach(button=>{button.disabled=!S.ready||!S.catalog||busy()||!!creationReview();});
    ['territoryPicker','projectPicker','builderPicker','yearPicker','refresh','export','add'].forEach(id=>{$(id).disabled=!S.ready || !S.catalog || busy() || !!creationReview() || id==='projectPicker'&&!S.projects || id==='export' && (!S.snapshots.size || S.phaseErrors.size>0) || id==='add' && !S.snapshot;});
    document.querySelectorAll('[data-create-builder]').forEach(button=>{button.disabled=busy()||changed()||!!creationReview();button.textContent=S.creating && S.creation && phaseFor(button)===S.creation.destination.subdivisionId && button.dataset.createBuilder===S.creation.destination.builderId && button.dataset.createYear===S.creation.destination.year?'Creating…':'Create Forecast';});
    $('check').hidden=!changed()&&!creationReview(); $('check').disabled=busy(); $('discard').hidden=!changed(); $('discard').disabled=busy();
    $('creationStatus').hidden=!S.creation;
    $('creationStatus').textContent=S.creation?S.creation.message:'';
    $('creationStatus').classList.toggle('error',!!S.creation&&S.creation.phase!=='pending');
    $('saveStatus').textContent=S.creating?'Creating forecast year…':S.loading?'Loading…':S.pending?S.pending+' change'+(S.pending===1?'':'s')+' saving…':changed()||creationReview()?'Changes need review':S.snapshot?'All changes saved':'Ready';
    $('saveStatus').dataset.state=busy()?'busy':changed()||creationReview()?'review':'ready';
    if(S.rowPending)$('saveStatus').textContent='Saving builder changes…';
    document.querySelectorAll('[data-assign-name],[data-builder-notes]').forEach(button=>{button.disabled=busy()||changed()||!!creationReview()||S.snapshots.get(phaseFor(button))?.builderActionsVersion!==1;});
    $('projectText').textContent=project()?.label || 'Choose a Project';
    const addLabel=S.snapshot?'Add Forecast · '+S.snapshot.subdivision.name:'Add Forecast';
    $('add').title=addLabel;$('add').setAttribute('aria-label',addLabel);
    $('window').hidden=!S.snapshot;
    $('window').textContent=S.snapshot?.windowOpen?'Forecasting window open':'Forecasting window closed';
    $('window').classList.toggle('closed',!S.snapshot?.windowOpen);
    $('territoryText').textContent=S.territories?(S.territories.length?S.territories.join(' · '):'0 Territories'):'All Territories';
    $('territoryPicker').title=S.territories?(S.territories.length?S.territories.join(', '):'0 Territories'):'All Territories';
    $('territoryPicker').disabled=$('territoryPicker').disabled||!S.catalog?.subdivisions.some(row=>Object.hasOwn(row,'territory'));
    if(S.catalog&&!S.catalog.subdivisions.some(row=>Object.hasOwn(row,'territory')))$('territoryPicker').title='Territory choices require the updated Forecast Manager function.';
    $('builderText').textContent=S.builders?S.builders.length+' builder'+(S.builders.length===1?'':'s'):'All Builders';
    $('yearText').textContent=S.years.length?S.years.map(year=>'WFY '+year).join(' · '):'All Years with Forecasts';
    if(S.page!=='forecasts')$('refresh').disabled=!S.ready||!S.catalog||ForecastContractReview.busy();
  }
  function setPage(page) {
    if(!['forecasts','review'].includes(page)||busy()||creationReview())return;
    if(changed()){notice('Check or discard local changes before changing tabs.',true);return;}
    closePicker();S.page=page;
    $('forecastsPanel').hidden=page!=='forecasts';$('contractReviewPanel').hidden=page==='forecasts';
    document.querySelectorAll('[data-forecast-page]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.forecastPage===page)));
    if(page!=='forecasts')ForecastContractReview.open(page);
    controls();
  }
  // Zero suppression is presentation-only; stored values and exports stay explicit.
  function matrixCount(value) {return S.view!=='forecast' && Number(value||0)===0 ? '' : count(value);}
  function forecastInputValue(value) {return S.view==='outlook' && value===0 ? '' : value == null ? '' : value;}
  function metric(year) {return S.view==='outlook'?year.outlook:S.view==='forecast'?year.total:S.view==='actual'?year.actual:year.scheduled;}
  function displayed(month,snapshot) {return M.displayValue(month,S.view,snapshot.today);}
  function comparison(month) {return 'Actuals: '+count(month.actual)+' · Forecast: '+(month.forecast==null?'Not set':count(month.forecast))+' · Scheduled: '+count(month.scheduled);}
  const hasValue = value => Number.isFinite(Number(value)) && Number(value)!==0;
  const valueColor = value => hasValue(value)?' data-has-value':'';
  function refreshLegend() {
    const mixed=S.view==='outlook', selected=S.view==='actual'?'sold':S.view;
    $('matrixLegend').querySelectorAll('[data-legend]').forEach(item=>{item.hidden=mixed?!['sold','forecast'].includes(item.dataset.legend):item.dataset.legend!==selected;});
  }
  function refreshMonthColors(table,snapshot) {
    const mixed=S.view==='outlook', selected=S.view==='actual'?'sold':S.view;
    table.querySelectorAll('[data-month-start]').forEach(node=>{
      const basis=mixed?(M.isPast({start:node.dataset.monthStart},snapshot.today)?'sold':'forecast'):selected;
      node.dataset.basis=basis;
      if(node.tagName==='TH')node.title=node.title.split(' · ')[0]+' · '+(basis==='sold'?'Sold':basis==='forecast'?'Forecast':'Scheduled')+(node.classList.contains('current-month')?' · Current month':'');
    });
  }

  function render() {
    const host=$('forecastGroups'), all=phases();
    $('workspace').hidden=!S.projectId; $('empty').hidden=!!S.projectId;
    if(!S.projectId){host.replaceChildren();controls();return;}
    const existing=new Map([...host.children].map(group=>[group.dataset.forecastPhase,group]));
    all.forEach(phase=>{
      let group=existing.get(phase.id);
      if(!group){
        group=document.createElement('details');
        group.className='forecast-phase-group';group.dataset.forecastPhase=phase.id;
        group.innerHTML='<summary class="forecast-phase-heading"><span><strong class="forecast-phase-name"></strong><small class="forecast-phase-code"></small></span><span class="forecast-phase-value"></span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg></summary><div class="matrix-scroll" tabindex="0"><table class="phase-matrix"></table></div><p class="phase-load-error" hidden></p>';
        group.addEventListener('toggle',()=>{
          if(!group.open||!group.isConnected)return;
          const table=group.querySelector('table'), snapshot=S.snapshots.get(phase.id);
          if(snapshot&&!table.hasChildNodes()){renderMatrix(table,snapshot);controls();}
        });
        host.append(group);
      }
      existing.delete(phase.id);
      const heading=group.querySelector('.forecast-phase-name');
      heading.textContent=phase.name;
      group.querySelector('.forecast-phase-code').textContent=phase.code||'';
      const scroll=group.querySelector('.matrix-scroll'),table=scroll.querySelector('table'),error=group.querySelector('.phase-load-error');
      const snapshot=S.snapshots.get(phase.id);
      scroll.setAttribute('aria-label',phase.name+' Builder Forecasts');
      table.setAttribute('aria-label',phase.name+' Builder Forecasts');
      scroll.hidden=!snapshot;error.hidden=!!snapshot;
      error.textContent=S.phaseErrors.get(phase.id)||'Phase forecasts are unavailable.';
      updatePhaseTotal(group,snapshot);
      if(snapshot&&group.open)renderMatrix(table,snapshot);
      else table.replaceChildren();
    });
    existing.forEach(group=>group.remove());
    const ordered=all.map(phase=>[...host.children].find(group=>group.dataset.forecastPhase===phase.id));
    ordered.forEach((group,index)=>{if(host.children[index]!==group)host.insertBefore(group,host.children[index]||null);});
    syncPhaseHighlight(); refreshLegend(); controls();
  }
  function updatePhaseTotal(group,snapshot,matrix=rows(snapshot)) {
    const total=matrix.reduce((sum,row)=>sum+row.years.reduce((subtotal,year)=>subtotal+metric(year),0),0);
    group.querySelector('.forecast-phase-value').textContent=snapshot?'Total '+count(total):'Unavailable';
  }
  function renderMatrix(table,snapshot) {
    const previous=ForecastNumbers.capture(table), matrix=rows(snapshot);
    const yearList=years(snapshot).map(String).sort((a,b)=>Number(a)-Number(b));
    if(!yearList.length){table.innerHTML='<tbody><tr><td class="empty-table">No forecast available.</td></tr></tbody>';return;}
    const numberMarkup=(value,key)=>ForecastNumbers.markup(value,snapshot.subdivision.id+'|'+S.view+'|'+key);
    const periodNumberMarkup=(value,key)=>ForecastNumbers.markup(value,snapshot.subdivision.id+'|'+key);
    table.dataset.view=S.view;
    let html='<colgroup><col><col class="builder-total-column">'+yearList.map(year=>M.months.map((month,index)=>'<col data-month-start="'+M.start(year,index)+'"'+(M.start(year,index).slice(0,7)===snapshot.today.slice(0,7)?' class="current-month-column"':'')+'>').join('')+'<col>').join('')+'</colgroup><thead><tr><th class="builder-column" rowspan="2">Builder</th><th class="builder-period-total" rowspan="2" scope="col" title="Sum of all displayed months for this builder">Total</th>';
    html+=yearList.map(year=>'<th colspan="13"><div class="year-heading"><strong>WFY '+esc(year)+'</strong><small>Feb '+esc(year)+' — Jan '+esc(Number(year)+1)+'</small></div></th>').join('')+'</tr><tr>';
    html+=yearList.map(year=>M.months.map((month,index)=>'<th data-month-start="'+M.start(year,index)+'"'+(M.start(year,index).slice(0,7)===snapshot.today.slice(0,7)?' class="current-month"':'')+' title="'+esc(month)+' '+(index===11?Number(year)+1:year)+'">'+month.slice(0,3)+'<small class="current-month-label">Current</small></th>').join('')+'<th class="year-total">Total</th>').join('')+'</tr></thead><tbody>';
    for(const row of matrix) {
      html+='<tr data-builder="'+esc(row.builderId)+'"><th scope="row" class="builder-column"><div class="builder-identity"><div class="builder-label">'+ForecastBuilderActions.label(row.builderId,snapshot)+'</div></div></th><td class="builder-period-total" data-builder-total="'+esc(row.builderId)+'">'+periodNumberMarkup(matrixCount(row.years.reduce((sum,year)=>sum+metric(year),0)),'builder-total:'+row.builderId)+'</td>';
      for(const year of row.years) {
        if(year.issue) {html+='<td colspan="13" class="missing-year issue">'+esc(year.issue)+' · Review in Creator</td>';continue;}
        if(!year.parent) {html+='<td colspan="13" class="missing-year"><div class="missing-content"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 2v4m10-4v4M3 9h18m-9 3v5m-2.5-2.5h5"/></svg><span><b>No forecast available.</b></span><button class="btn" data-create-builder="'+esc(row.builderId)+'" data-create-year="'+esc(year.year)+'"'+(busy()?' disabled':'')+'>Create Forecast</button></div></td>';continue;}
        html+=year.months.map((month,index)=>{
          const past=M.isPast(month,snapshot.today), editable=S.view==='forecast'||S.view==='outlook'&&!past;
          const reason=M.lock(month,snapshot), entry=month.id?S.entries.get(month.id):null, value=entry?entry.attempted:month.forecast, phase=entry?entry.phase:'', title=comparison(month)+(reason?' · '+reason:'');
          return '<td class="month-cell '+(M.start(year.year,index).slice(0,7)===snapshot.today.slice(0,7)?'current-month ':'')+(index%3===0?'q-start ':'')+(reason?'locked ':'')+esc(phase)+'" data-month-start="'+M.start(year.year,index)+'"'+valueColor(editable?value:displayed(month,snapshot))+(month.id?' data-cell="'+esc(month.id)+'"':'')+' title="'+esc(title)+'">'+(editable?'<input type="text" inputmode="numeric" autocomplete="off" aria-label="'+esc(name(row.builderId)+' WFY '+year.year+' '+M.months[index]+' forecasted lots')+'"'+(month.id?' data-forecast="'+esc(month.id)+'"':'')+' value="'+esc(forecastInputValue(value))+'"'+(reason||phase==='pending'||phase==='failed'||phase==='unknown'||S.creating||creationReview()?' disabled':'')+(month.id?' aria-describedby="state-'+esc(month.id)+'"':'')+'><span class="cell-state"'+(month.id?' id="state-'+esc(month.id)+'"':'')+'>'+stateText(phase,reason)+'</span>':'<strong tabindex="0" aria-label="'+esc(name(row.builderId)+' WFY '+year.year+' '+M.months[index]+' · '+title)+'">'+numberMarkup(matrixCount(displayed(month,snapshot)),'month:'+(month.id||row.builderId+':'+year.year+':'+index))+'</strong><span class="cell-state">'+(month.issue?'Review':'')+'</span>')+'</td>';
        }).join('');
        html+='<td class="year-total" data-total="'+esc(M.key(row.builderId,year.year))+'">'+numberMarkup(matrixCount(metric(year)),'total:'+M.key(row.builderId,year.year))+'<small>WFY '+esc(year.year)+'</small></td>';
      }
      html+='</tr>';
    }
    if(!matrix.length) html+='<tr><td colspan="'+(2+13*yearList.length)+'" class="empty-table">No forecast available.</td></tr>';
    html+='</tbody><tfoot><tr><th class="builder-column">Selected Total</th><td class="builder-period-total" data-foot-builder-total>'+periodNumberMarkup(matrixCount(matrix.reduce((sum,row)=>sum+row.years.reduce((total,year)=>total+metric(year),0),0)),'foot-builder-total')+'</td>'+yearList.map(year=>{
      const selected=matrix.map(row=>row.years.find(item=>item.year===year));
      return M.months.map((month,index)=>{const value=selected.reduce((sum,row)=>sum+Number(displayed(row.months[index],snapshot)||0),0);return '<td data-month-start="'+M.start(year,index)+'"'+(M.start(year,index).slice(0,7)===snapshot.today.slice(0,7)?' class="current-month"':'')+valueColor(value)+' data-foot="'+esc(year)+'-'+index+'">'+numberMarkup(matrixCount(value),'foot:'+year+'-'+index)+'</td>';}).join('')+'<td class="year-total" data-foot-total="'+esc(year)+'">'+numberMarkup(matrixCount(selected.reduce((sum,row)=>sum+metric(row),0)),'foot-total:'+year)+'</td>';
    }).join('')+'</tr></tfoot>';
    table.innerHTML=html;
    refreshMonthColors(table,snapshot);
    ForecastNumbers.apply(table,previous);
  }
  function stateText(phase,reason) {return phase==='pending'?'Saving…':phase==='saved'?icons.check:phase==='failed'?'Not saved':phase==='unknown'?'Check status':reason?'Locked':'';}
  function patch() {
    controls();
    $('forecastGroups').querySelectorAll('.phase-matrix').forEach(table=>{
      const snapshot=S.snapshots.get(phaseFor(table));
      if(!snapshot)return;
      if(table.hasChildNodes())patchMatrix(table,snapshot);
      else updatePhaseTotal(table.closest('[data-forecast-phase]'),snapshot);
    });
  }
  function patchMatrix(table,snapshot) {
    // A new server month can turn a mounted forecast input into an actual cell.
    if(S.view==='outlook' && [...table.querySelectorAll('[data-forecast]')].some(input=>{const month=snapshot.months.find(row=>row.id===input.dataset.forecast);return month&&M.isPast(month,snapshot.today);})){renderMatrix(table,snapshot);updatePhaseTotal(table.closest('[data-forecast-phase]'),snapshot);return;}
    table.querySelectorAll('[data-month-start]').forEach(node=>node.classList.toggle(node.tagName==='COL'?'current-month-column':'current-month',node.dataset.monthStart.slice(0,7)===snapshot.today.slice(0,7)));
    for(const input of table.querySelectorAll('[data-forecast]')) {
      const month=snapshot.months.find(row=>row.id===input.dataset.forecast), entry=S.entries.get(input.dataset.forecast), reason=M.lock(month,snapshot), phase=entry?entry.phase:'';
      const cell=input.closest('td'); cell.classList.toggle('locked',!!reason);
      cell.toggleAttribute('data-has-value',hasValue(entry?entry.attempted:month?.forecast));
      ['pending','saved','failed','unknown'].forEach(status=>cell.classList.toggle(status,phase===status));
        input.disabled=!!reason || ['pending','failed','unknown'].includes(phase) || S.creating || S.loading || S.rowPending || !!creationReview();
      if(document.activeElement!==input && (!entry||entry.phase==='saved')) input.value=forecastInputValue(month && month.forecast);
      $('state-'+input.dataset.forecast).innerHTML=stateText(phase,reason);
      cell.title=entry && entry.error || comparison(month)+(reason?' · '+reason:'');
    }
    for(const output of table.querySelectorAll('.month-cell>strong')) {
      const cell=output.closest('td'), month=snapshot.months.find(row=>row.id===cell.dataset.cell);
      if(!month) continue;
      const reason=M.lock(month,snapshot), title=comparison(month)+(reason?' · '+reason:'');
      ForecastNumbers.update(output.querySelector('[data-number-key]'),matrixCount(displayed(month,snapshot)));
      cell.toggleAttribute('data-has-value',hasValue(displayed(month,snapshot)));
      cell.title=title;output.setAttribute('aria-label',name(month.builderId)+' WFY '+month.year+' '+month.month+' · '+title);
    }
    const matrix=rows(snapshot);
    for(const row of matrix){const cell=table.querySelector('[data-builder-total="'+row.builderId+'"]');if(cell)ForecastNumbers.update(cell.querySelector('[data-number-key]'),matrixCount(row.years.reduce((sum,year)=>sum+metric(year),0)));}
    const builderTotal=table.querySelector('[data-foot-builder-total]');if(builderTotal)ForecastNumbers.update(builderTotal.querySelector('[data-number-key]'),matrixCount(matrix.reduce((sum,row)=>sum+row.years.reduce((total,year)=>total+metric(year),0),0)));
    for(const row of matrix) for(const year of row.years) {const cell=table.querySelector('[data-total="'+M.key(row.builderId,year.year)+'"]'); if(cell) ForecastNumbers.update(cell.querySelector('[data-number-key]'),matrixCount(metric(year)));}
    for(const year of years(snapshot).map(String)) {
      const selected=matrix.map(row=>row.years.find(item=>item.year===year));
      M.months.forEach((month,index)=>{const cell=table.querySelector('[data-foot="'+year+'-'+index+'"]'); if(cell) {const value=selected.reduce((sum,row)=>sum+Number(displayed(row.months[index],snapshot)||0),0);ForecastNumbers.update(cell.querySelector('[data-number-key]'),matrixCount(value));cell.toggleAttribute('data-has-value',hasValue(value));}});
      const total=table.querySelector('[data-foot-total="'+year+'"]'); if(total) ForecastNumbers.update(total.querySelector('[data-number-key]'),matrixCount(selected.reduce((sum,row)=>sum+metric(row),0)));
    }
    refreshMonthColors(table,snapshot);
    updatePhaseTotal(table.closest('[data-forecast-phase]'),snapshot,matrix);
  }

  async function load(refreshCatalog=false) {
    if(busy() || creationReview()) return;
    if(!S.projectId&&!refreshCatalog) {notice('Choose a project.');return;}
    if(changed()) {discardDialog(()=>load(refreshCatalog));return;}
    closePicker(); S.creation=null; S.loading=true; notice(''); patch();
    try {
      if(refreshCatalog) {
        const [catalog,projects]=await Promise.all([readCatalog(),readProjectCatalog()]);
        S.catalog=catalog;S.projects=projects;
      }
      const all=phases();
      if(!all.length){clearProject('');render();return;}
      if(!all.some(phase=>phase.id===S.sub))S.sub=(all.find(phase=>/^Phase 0*1$/i.test(phaseLabel(phase)))||all[0]).id;
      const snapshots=new Map(), errors=new Map();
      // Keep Creator traffic bounded and surface failures per phase.
      for(let index=0;index<all.length;index+=4) {
        await Promise.all(all.slice(index,index+4).map(async phase=>{
          try {
            const data=await request({action:'snapshot',subdivisionId:phase.id});
            validSnapshot(data,phase.id);snapshots.set(phase.id,data);
          } catch(error) {errors.set(phase.id,error.message);}
        }));
      }
      S.snapshots=snapshots; S.phaseErrors=errors; S.entries.clear();
      if(errors.size)notice('Some phases could not be loaded. Use Refresh to try again.',true);
      renderPhaseTabs();renderOverview();render();
    } catch(error) {notice(error.message,true);}
    finally {S.loading=false;patch();}
  }
  function clearProject(projectId) {
    S.projectId=projectId;S.sub='';S.snapshots.clear();S.phaseErrors.clear();S.creation=null;S.entries.clear();
    $('workspace').prepend($('phaseTabs'));
    $('forecastGroups').replaceChildren();$('phaseTabs').replaceChildren();
    $('compactSummary').replaceChildren();$('summaryFrame').srcdoc='';
  }
  function save(input) {
    const phaseId=phaseFor(input), snapshot=S.snapshots.get(phaseId);
    if(!snapshot || input.disabled || S.loading || S.creating || creationReview()) return;
    const id=input.dataset.forecast, month=snapshot.months.find(row=>row.id===id);
    let attempted;
    try {attempted=M.value(input.value);const reason=M.lock(month,snapshot);if(reason) throw new Error(reason);}
    catch(error) {notice(error.message,true);input.value=month && month.forecast!=null?month.forecast:'';return;}
    if(attempted===month.forecast || attempted==null && month.forecast==null) return;
    const entry={id,subdivisionId:phaseId,attempted,expected:month.forecast==null?null:Number(month.forecast),phase:'pending',month:month.month,year:month.year,builderId:month.builderId};
    S.entries.set(id,entry); S.pending++; notice(''); patch();
    const feedback=window.LMSuccess?LMSuccess.begin('forecast:'+id):null;
    S.queue=S.queue.then(async()=>{
      try {
        const data=await request({action:'save',subdivisionId:entry.subdivisionId,forecastId:id,value:attempted,expected:entry.expected},true);
        if(data.verifiedForecastId !== id) throw new Error('Creator returned another forecast. Check status.');
        applySnapshot(data,entry.subdivisionId); entry.phase='saved';
        if(window.LMSuccess) LMSuccess.inline('forecast:'+id,entry.month+' '+entry.year+' forecast saved.','forecast',()=>entry.phase==='saved'&&S.entries.get(id)===entry,feedback);
      } catch(error) {entry.phase=error.unknown===false?'failed':'unknown';entry.error=error.message;notice(error.message,true);}
      finally {S.pending--;patch();}
    });
  }
  async function checkStatus() {
    if(S.rowOperation && S.rowOperation.phase==='unknown') {await ForecastBuilderActions.recheck();return;}
    if(creationReview()) {await checkCreation(S.creation.destination);return;}
    if(busy() || !S.snapshots.size) return;
    S.loading=true;patch();
    try {
      const unresolved=[...S.entries.values()].filter(entry=>['unknown','failed'].includes(entry.phase));
      const results=new Map();
      for(const phaseId of new Set(unresolved.map(entry=>entry.subdivisionId))) {
        const data=await request({action:'snapshot',subdivisionId:phaseId});
        applySnapshot(data,phaseId);results.set(phaseId,data);
      }
      for(const entry of unresolved) {
        const data=results.get(entry.subdivisionId);
        const month=data.months.find(row=>row.id===entry.id && row.subdivisionId===entry.subdivisionId && row.builderId===entry.builderId && String(row.year)===String(entry.year));
        if(month && month.forecast===entry.attempted && data.subdivision.unforecasted===data.subdivision.expectedUnforecasted) {entry.phase='saved';entry.error='';}
        else {entry.phase='failed';entry.error=month && month.forecast===entry.attempted?'The month is saved; subdivision totals need review.':'The change was not verified. The entered value is retained.';}
      }
      notice(changed()?'Some changes need review. Your entered values are retained.':'Forecast values verified.',changed());
    } catch(error) {notice(error.message,true);}
    finally {S.loading=false;patch();}
  }
  function openDialog(title,kicker,body,action,actionText) {
    closePicker(); $('modal').querySelector('.dialog').classList.remove('selection-dialog','assignment-success'); S.focus=document.activeElement; S.dialog={action};
    $('dialogTitle').textContent=title;$('dialogKicker').textContent=kicker;$('dialogContext').hidden=true;$('dialogContext').innerHTML='';$('dialogBody').innerHTML=body;
    $('dialogStatus').textContent='';$('dialogAction').textContent=actionText;$('dialogAction').hidden=!action;$('dialogAction').disabled=false;
    $('dialogClose').disabled=false;$('dialogCancel').hidden=false;$('dialogCancel').textContent='Cancel';$('dialogCancel').disabled=false;
    $('modal').hidden=false;$('app').inert=true;$('dialogClose').focus();
  }
  function closeDialog() {if(S.creating||S.rowPending)return;closePicker();$('modal').hidden=true;$('app').inert=false;S.dialog=null;if(S.focus&&S.focus.isConnected)S.focus.focus();}
  function discardDialog(next) {
    const changes=[...S.entries.values()].filter(entry=>['failed','unknown'].includes(entry.phase));
    openDialog('Discard local changes?','FORECAST CHANGES','<ul class="review-list">'+changes.map(entry=>'<li>'+esc(name(entry.builderId)+' · '+entry.month+' '+entry.year)+' · '+esc(entry.attempted==null?'Blank':entry.attempted)+'</li>').join('')+'</ul><p class="dialog-note">Saved Creator values stay unchanged.</p>',()=>{S.entries.clear();closeDialog();render();notice('');if(next)next();},'Discard local changes');
  }
  function addDialog() {
    if(busy() || creationReview() || !S.snapshot || changed()) {if(changed())notice('Check the pending changes before adding a forecast year.',true);return;}
    S.newBuilder='';S.newYear='';
    openDialog('Add Forecast','','<div class="dialog-fields"><div class="filter"><label id="newBuilderLabel">Builder</label><button class="picker" data-picker="newBuilder" aria-labelledby="newBuilderLabel newBuilderText" aria-haspopup="dialog" aria-expanded="false"><span id="newBuilderText"></span><svg viewBox="0 0 20 20"><path d="m5 7 5 5 5-5"/></svg></button></div><div class="filter"><label id="newYearLabel">Fiscal year</label><button class="picker" data-picker="newYear" aria-labelledby="newYearLabel newYearText" aria-haspopup="dialog" aria-expanded="false"><span id="newYearText"></span><svg viewBox="0 0 20 20"><path d="m5 7 5 5 5-5"/></svg></button></div></div><p id="newConflict" class="creation-warning" role="status" aria-live="polite" hidden></p>',createYear,'Create Forecast');
    $('modal').querySelector('.dialog').classList.add('selection-dialog');
    $('dialogContext').innerHTML='<span>'+esc(S.snapshot.subdivision.name)+'</span><small>'+esc(S.snapshot.subdivision.code)+'</small>';$('dialogContext').hidden=false;
    const dialog=S.dialog;dialog.kind='create';dialog.snapshot=S.snapshot;dialog.subdivisionId=S.sub;dialog.checking=true;updateNew();refreshNew(dialog);
  }
  function newConflict() {return S.dialog && S.dialog.kind==='create' && M.hasYear(S.dialog.snapshot,S.newBuilder,S.newYear);}
  function updateNew() {
    if(!$('newBuilderText') || !S.dialog || S.dialog.kind!=='create')return;
    $('newBuilderText').textContent=S.newBuilder?name(S.newBuilder):'Choose builder';$('newYearText').textContent=S.newYear?'WFY '+S.newYear:'Choose fiscal year';
    const selected=!!S.newBuilder&&!!S.newYear,conflict=selected&&newConflict(),checking=selected&&S.dialog.checking;
    const message=conflict?'A forecast already exists for this builder and WFY '+S.newYear+'.':S.dialog.checkFailed?'Unable to check existing forecasts. Reopen to try again.':checking?'Checking existing forecasts…':'';
    $('newConflict').textContent=message;$('newConflict').hidden=!message;$('newConflict').classList.toggle('checking',!!checking&&!conflict&&!S.dialog.checkFailed);
    $('dialogAction').disabled=!selected||!!conflict||S.dialog.checking||!!S.dialog.checkFailed;
  }
  async function refreshNew(dialog) {
    try {
      const data=await request({action:'snapshot',subdivisionId:dialog.subdivisionId});
      if(!data.subdivision || data.subdivision.id!==dialog.subdivisionId || !Array.isArray(data.years))throw new Error('Forecast conflicts could not be checked.');
      if(S.dialog!==dialog)return;dialog.snapshot=data;dialog.checkFailed=false;
    } catch(error) {if(S.dialog!==dialog)return;dialog.checkFailed=true;}
    finally {if(S.dialog===dialog){dialog.checking=false;updateNew();}}
  }
  function startCreation(builderId,year,phaseId) {
    const snapshot=S.snapshots.get(phaseId);
    if(busy() || creationReview() || !snapshot || changed()) {if(changed())notice('Check the pending changes before creating a forecast.',true);return;}
    if(!builderId || !/^\d{4}$/.test(String(year)) || Number(year)<2019 || Number(year)>2046) {notice('Forecast creation supports fiscal years 2019 through 2046.',true);return;}
    if(M.hasYear(snapshot,builderId,String(year))) {notice('That builder already has a forecast for WFY '+year+'.');return;}
    S.newBuilder=builderId;S.newYear=String(year);
    createYear(phaseId);
  }
  async function createYear(phaseId=S.dialog?.subdivisionId||S.sub) {
    const snapshot=S.snapshots.get(phaseId);
    if(busy() || creationReview() || !snapshot || changed() || !S.newBuilder || !S.newYear) return;
    if(S.dialog && S.dialog.kind==='create' && (S.dialog.checking || S.dialog.checkFailed || newConflict())) {updateNew();return;}
    const destination={builderId:S.newBuilder,year:S.newYear,subdivisionId:phaseId};
    if(M.hasYear(S.dialog && S.dialog.kind==='create'?S.dialog.snapshot:snapshot,destination.builderId,destination.year)) {notice('That builder already has a forecast for WFY '+destination.year+'.');return;}
    closeDialog();closePicker();S.creating=true;
    S.creation={destination,phase:'pending',message:'Creating '+name(destination.builderId)+' · WFY '+destination.year+'…'};controls();patch();
    try {
      const data=await request({action:'ensure',...destination},true);
      applySnapshot(data,destination.subdivisionId);
      if(!M.verifyEnsure(data,destination.builderId,destination.year) || !data.ensuredParentId || !data.years.some(row=>row.id===data.ensuredParentId && row.builderId===destination.builderId && String(row.year)===destination.year)) throw new Error('The complete forecast year could not be verified. Check status.');
      if(S.builders && !S.builders.includes(destination.builderId))S.builders.push(destination.builderId);
      if(S.years.length && !S.years.includes(destination.year))S.years.push(destination.year);
      S.creation=null;render();
    } catch(error) {S.creation={destination,phase:error.unknown===false?'failed':'unknown',message:error.message+(error.unknown===false?'':' Use Check status; creation will not be repeated.')};}
    finally {
      S.creating=false;controls();patch();
    }
  }
  async function checkCreation(destination) {
    if(busy()) return;S.creating=true;S.creation.message='Checking '+name(destination.builderId)+' · WFY '+destination.year+'…';controls();patch();
    try {const data=await request({action:'snapshot',subdivisionId:destination.subdivisionId});applySnapshot(data,destination.subdivisionId);if(!M.verifyEnsure(data,destination.builderId,destination.year)) throw new Error('The forecast year is incomplete or missing. Review its Creator records before creating again.');if(S.builders && !S.builders.includes(destination.builderId))S.builders.push(destination.builderId);if(S.years.length && !S.years.includes(destination.year))S.years.push(destination.year);S.creation=null;render();}
    catch(error) {S.creation.message=error.message;}
    finally {S.creating=false;patch();}
  }
  function closePicker() {if(S.picker){const p=S.picker; p.element.remove();p.anchor.setAttribute('aria-expanded','false');p.anchor.removeAttribute('aria-controls');S.picker=null;}}
  function pickerOptions(kind) {
    if(kind.startsWith('review-'))return ForecastContractReview.options(kind.slice(7));
    if(kind==='assignBuilder')return S.catalog.builders.filter(row=>row.type==='Builder'&&!ForecastBuilderActions.isPlaceholder(row)).map(row=>({id:row.id,label:row.name}));
    if(kind==='territories')return [...new Set(S.catalog.subdivisions.map(territoryOf))].sort((a,b)=>a.localeCompare(b)).map(territory=>({id:territory,label:territory}));
    if(kind==='project')return availableProjects().map(row=>({id:row.id,label:row.label,detail:[...new Set(phases(row).map(territoryOf))].join(' · ')}));
    if(kind==='builders'||kind==='newBuilder')return S.catalog.builders.filter(row=>kind!=='newBuilder'||row.type==='Builder').map(row=>({id:row.id,label:row.name}));
    const first=kind==='newYear'?2019:2018,last=kind==='newYear'?2046:2050;
    return Array.from({length:last-first+1},(_,index)=>({id:String(first+index),label:'WFY '+(first+index),detail:'Feb '+(first+index)+' — Jan '+(first+index+1)}));
  }
  function openPicker(anchor,kind) {
    if(S.picker && S.picker.anchor===anchor) {closePicker();return;}
    closePicker();const review=kind.startsWith('review-'),multi=review||kind==='builders'||kind==='years'||kind==='territories', current=review?ForecastContractReview.selection(kind.slice(7)):kind==='territories'?S.territories:kind==='project'?S.projectId:kind==='newBuilder'?S.newBuilder:kind==='newYear'?S.newYear:kind==='builders'?S.builders:S.years;
    const p={anchor,kind,multi,all:review?current===null:kind==='territories'?S.territories===null:kind==='builders'?S.builders===null:kind==='years'?S.years.length===0:false,selected:new Set(multi?current||[]:[current]),options:pickerOptions(kind)};
    const label=kind.includes('Year')||kind==='years'||kind==='review-years'?'Fiscal Year':kind==='project'?'Project':kind==='review-subdivision'?'Subdivision':kind==='territories'||kind==='review-territory'?'Territory':'Builder';
    p.element=document.createElement('section');p.element.className='popover';p.element.dataset.multi=String(multi);p.element.id='forecast-picker';p.element.setAttribute('role','dialog');p.element.setAttribute('aria-label',label+' picker');p.element.innerHTML='<header><input aria-label="Search '+label+'" placeholder="Search '+label+'"><button class="close-btn" data-pop-close aria-label="'+(kind.startsWith('new')?'Close picker':'Clear '+label+' filter')+'">'+icons.close+'</button></header>'+(multi?'<div class="picker-selection" role="status"></div>':'')+'<div class="options" role="listbox" aria-label="'+label+'"'+(multi?' aria-multiselectable="true"':'')+'></div>'+(multi?'<footer><button class="btn" data-pop-all>All</button><button class="btn" data-pop-clear>Clear</button><button class="btn" data-pop-visible>Select visible</button><button class="btn primary" data-pop-done>Done</button></footer>':'');
    ($('modal').hidden?document.body:$('modal').querySelector('.dialog')).appendChild(p.element);S.picker=p;anchor.setAttribute('aria-expanded','true');drawOptions(p);
    anchor.setAttribute('aria-controls',p.element.id);positionPicker(p);p.element.querySelector('input').focus();
    if(!p.all){const selected=p.element.querySelector('.option[aria-pressed="true"]');if(selected)selected.scrollIntoView({block:'nearest',inline:'nearest'});}
    p.element.querySelector('input').addEventListener('input',()=>{drawOptions(p);positionPicker(p);});
    p.element.addEventListener('keydown',event=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key)||((event.key==='Home'||event.key==='End')&&event.target.tagName==='INPUT'))return;const options=[...p.element.querySelectorAll('.option')];if(!options.length)return;event.preventDefault();const index=options.indexOf(document.activeElement),next=event.key==='Home'?0:event.key==='End'?options.length-1:event.key==='ArrowDown'?(index+1)%options.length:index<=0?options.length-1:index-1;options[next].focus();});
    p.element.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button)return;
      if(button.hasAttribute('data-pop-close')){if(kind.startsWith('new')||kind==='assignBuilder'){closePicker();anchor.focus();}else clearPicker(p);return;}
      if(button.hasAttribute('data-pop-forecast-years')){p.all=true;p.selected.clear();drawOptions(p);return;}
      if(button.hasAttribute('data-pop-all')){p.all=true;p.selected.clear();drawOptions(p);return;}
      if(button.hasAttribute('data-pop-clear')){p.all=false;p.selected.clear();drawOptions(p);return;}
      if(button.hasAttribute('data-pop-visible')){p.all=false;p.visible.forEach(option=>p.selected.add(option.id));drawOptions(p);return;}
      if(button.hasAttribute('data-pop-done')){commitPicker(p);return;}
      if(button.dataset.option){const id=button.dataset.option;p.all=false;if(multi){p.selected.has(id)?p.selected.delete(id):p.selected.add(id);drawOptions(p);}else{p.selected=new Set([id]);commitPicker(p);}}
    });
  }
  function positionPicker(p) {const rect=p.anchor.getBoundingClientRect();p.element.style.width=Math.min(innerWidth-24,Math.max(280,Math.min(380,rect.width)))+'px';const height=p.element.offsetHeight;p.element.style.left=Math.max(12,Math.min(rect.left,innerWidth-p.element.offsetWidth-12))+'px';p.element.style.top=Math.max(12,Math.min(innerHeight-height-12,rect.bottom+height+7<innerHeight-12?rect.bottom+7:rect.top-height-7))+'px';}
  function clearPicker(p) {p.selected.clear();p.all=p.multi;commitPicker(p);}
  function drawOptions(p) {
    const focusedOption=p.element.contains(document.activeElement)&&document.activeElement.dataset.option;
    const query=p.element.querySelector('input').value.toLowerCase();p.visible=p.options.filter(option=>(option.label+' '+(option.detail||'')).toLowerCase().includes(query));
    p.element.querySelector('.options').innerHTML=(p.kind==='years'?'<button class="option forecast-years-option" role="option" data-pop-forecast-years aria-selected="'+p.all+'" aria-pressed="'+p.all+'"><i>'+(p.all?icons.check:'')+'</i><span>All Years with Forecasts</span></button>':'')+p.visible.map(option=>{const selected=p.all?(p.kind!=='years'||forecastYears().includes(option.id)):p.selected.has(option.id),mark='<i>'+ (selected?icons.check:'')+'</i>';return '<button class="option" role="option" data-option="'+esc(option.id)+'" aria-selected="'+selected+'" aria-pressed="'+selected+'">'+(p.multi?mark:'')+'<span>'+esc(option.label)+(option.detail?'<small>'+esc(option.detail)+'</small>':'')+'</span>'+(p.multi?'':mark)+'</button>';}).join('');
    if(!p.visible.length)p.element.querySelector('.options').insertAdjacentHTML('beforeend','<div class="empty-table">No matches</div>');
    if(p.multi)p.element.querySelector('.picker-selection').textContent=(p.all?(p.kind==='years'?'All Years with Forecasts':'All selected'):p.selected.size+' selected')+' · '+p.visible.length+' shown';
    if(focusedOption){const replacement=[...p.element.querySelectorAll('.option')].find(option=>option.dataset.option===focusedOption);if(replacement)replacement.focus();else p.element.querySelector('input').focus();}
  }
  function commitPicker(p) {
    const values=[...p.selected];
    if(p.kind.startsWith('review-')){if(!ForecastContractReview.applyFilter(p.kind.slice(7),p.all?null:values))return;closePicker();p.anchor.focus();return;}
    if(p.kind==='assignBuilder'){closePicker();ForecastBuilderActions.confirm(p.anchor.dataset.assignName,values[0],phaseFor(p.anchor));return;}
    if((p.kind==='territories'||p.kind==='project'||p.kind==='builders'||p.kind==='years') && changed()){closePicker();notice('Check or discard local changes before changing filters.',true);return;}
    const nextProject=values[0]||'', projectChanged=p.kind==='project'&&nextProject!==S.projectId;
    if(p.kind==='territories'){S.territories=p.all?null:values;if(S.projectId&&!availableProjects().some(row=>row.id===S.projectId))clearProject('');}
    if(projectChanged)clearProject(nextProject);
    if(p.kind==='builders')S.builders=p.all?null:values;
    if(p.kind==='years'){if(!p.all&&!values.length){notice('Choose at least one fiscal year.');return;}S.years=p.all?[]:values;}
    if(p.kind==='newBuilder')S.newBuilder=values[0]||'';
    if(p.kind==='newYear')S.newYear=values[0]||'';
    closePicker();updateNew();p.anchor.focus();if(projectChanged&&S.projectId){$('workspace').hidden=true;$('empty').hidden=true;load();}else if(p.kind==='territories'||p.kind==='project'||p.kind==='builders'||p.kind==='years')render();
  }
  function exportCsv() {
    if(busy()||!S.snapshots.size||S.phaseErrors.size)return;
    const fields=['Subdivision','Code','Builder','WFY','Month','Calendar month','Forecasted lots','Sold lots','Scheduled lots','Builder notes','Lot contract'];
    const lines=[fields,...phases().flatMap(phase=>rows(S.snapshots.get(phase.id)).flatMap(row=>row.years.flatMap(year=>year.months.map(month=>[phase.name,phase.code,name(row.builderId),year.year,month.month,month.start.slice(0,7),month.id&&month.forecast!=null?month.forecast:'',month.id&&month.actual!=null?month.actual:'',month.id&&month.scheduled!=null?month.scheduled:'',year.parent?year.parent.note||'':'',year.parent&&typeof year.parent.hasLotContract==='boolean'?year.parent.hasLotContract?'Yes':'No':'']))))];
    const cell=value=>{const s=String(value);return '"'+(/^[=+@-]/.test(s)?"'":'')+s.replace(/"/g,'""')+'"';};
    const url=URL.createObjectURL(new Blob(['\ufeff'+lines.map(line=>line.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='Forecasts-'+project().label.replace(/[^a-z0-9_-]/gi,'-')+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    if(window.LMSuccess)LMSuccess.show('Forecast CSV ready.');
  }
  document.addEventListener('click',event=>{
    const page=event.target.closest('[data-forecast-page]');if(page&&!page.disabled){setPage(page.dataset.forecastPage);return;}
    const picker=event.target.closest('[data-picker]');if(picker&&!picker.disabled){openPicker(picker,picker.dataset.picker);return;}
    if(S.picker&&!event.composedPath().includes(S.picker.element)&&!S.picker.element.contains(event.target)&&!S.picker.anchor.contains(event.target))closePicker();
    const create=event.target.closest('[data-create-builder]');if(create&&!create.disabled)startCreation(create.dataset.createBuilder,create.dataset.createYear,phaseFor(create));
    const view=event.target.closest('button[data-view]');if(view&&!busy()){S.view=view.dataset.view;document.querySelectorAll('button[data-view]').forEach(button=>button.setAttribute('aria-pressed',button===view));render();}
  });
  $('forecastGroups').addEventListener('focusin',event=>{const input=event.target;if(S.view==='outlook'&&input.dataset.forecast&&input.value===''){const month=S.snapshots.get(phaseFor(input))?.months.find(row=>row.id===input.dataset.forecast);if(month&&month.forecast===0)input.value='0';}});
  $('forecastGroups').addEventListener('focusout',event=>{const input=event.target,entry=S.entries.get(input.dataset.forecast);if(S.view==='outlook'&&input.dataset.forecast&&input.value==='0'&&(!entry||entry.phase==='saved'))input.value='';});
  $('forecastGroups').addEventListener('change',event=>{if(event.target.dataset.forecast)save(event.target);});
  $('forecastGroups').addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.dataset.forecast){event.preventDefault();const inputs=[...$('forecastGroups').querySelectorAll('details[open] [data-forecast]:not(:disabled)')],next=inputs[inputs.indexOf(event.target)+(event.shiftKey?-1:1)];event.target.blur();if(next)next.focus();}});
  $('phaseTabs').addEventListener('click',event=>{const tab=event.target.closest('[data-phase-tab]');if(tab)choosePhase(tab.dataset.phaseTab);});
  $('phaseTabs').addEventListener('keydown',event=>{
    if(!event.target.matches('[data-phase-tab]')||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const tabs=[...$('phaseTabs').querySelectorAll('button')];
    const index=tabs.indexOf(event.target), step=event.key==='ArrowLeft'?-1:1;
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+step+tabs.length)%tabs.length;
    choosePhase(tabs[next].dataset.phaseTab);
  });
  $('add').addEventListener('click',()=>addDialog());$('refresh').addEventListener('click',()=>{if(S.page!=='forecasts')return ForecastContractReview.refresh();const before=S.snapshots,catalog=S.catalog,projectId=S.projectId,refresh=()=>load(true);return window.LMMotion?LMMotion.refresh($('workspace'),refresh,{allowed:()=>!!S.ready&&S.projectId===projectId,completed:()=>S.snapshots!==before||S.catalog!==catalog}):refresh();});$('check').addEventListener('click',checkStatus);$('discard').addEventListener('click',()=>discardDialog());$('export').addEventListener('click',exportCsv);
  $('forecastPages').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||!event.target.matches('[data-forecast-page]'))return;event.preventDefault();const pages=['forecasts','review'],index=pages.indexOf(S.page),page=pages[event.key==='Home'?0:event.key==='End'?1:(index+1)%2];setPage(page);document.querySelector('[data-forecast-page="'+S.page+'"]').focus();});
  $('dialogClose').addEventListener('click',closeDialog);$('dialogCancel').addEventListener('click',closeDialog);$('dialogAction').addEventListener('click',()=>{if(S.dialog&&S.dialog.action&&!$('dialogAction').disabled)S.dialog.action();});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){if(S.picker){const anchor=S.picker.anchor;closePicker();anchor.focus();}else if(S.dialog){event.preventDefault();closeDialog();}return;}
    const container=S.picker?S.picker.element:S.dialog?$('modal'):null;
    if(event.key==='Tab'&&container){const items=[...container.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(element=>!element.hidden&&element.getClientRects().length);if(!items.length){event.preventDefault();return;}const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  });
  window.addEventListener('resize',()=>{if(S.picker)positionPicker(S.picker);});window.addEventListener('scroll',()=>{if(S.picker)positionPicker(S.picker);},true);
  async function boot() {
    let timer;
    try {
      $('saveStatus').textContent='Identifying Creator session…';
      const context=window.LMFrontendContext&&LMFrontendContext.params?LMRuntime.apply(LMFrontendContext.params):await Promise.race([LMRuntime.capture(),new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(new Error('Creator session initialization timed out. Reload this Page in Creator.')),15000);})]);
      if(context.environment==='UNKNOWN'||!context.user||context.user==='(unknown)')throw new Error('Creator did not identify the connected user and environment.');
      S.ready=true;$('environment').hidden=context.environment==='PRODUCTION';$('environment').textContent=context.environment;$('environment').classList.toggle('dev',context.environment!=='PRODUCTION');
      LMCriticalErrors.configure({apiCandidates:[LMRuntime.apiName('Report_Proforma_Widget_Error')]});forecastReporterReady();
      S.catalog=await readCatalog();
      try {S.projects=await readProjectCatalog();}
      catch(error){notice('Project choices are unavailable: '+error.message,true);}
      controls();
    } catch(error) {S.ready=false;notice(error.apiMissing?'Missing Creator API: '+error.apiName+'. Bind it to forecastManagerWidget in '+LMRuntime.current().environment.toLowerCase()+', then reload.':error.message+' Forecast Manager setup may be required in this Creator environment.',true);$('saveStatus').textContent=error.apiMissing?'API setup required':'Connection unavailable';$('saveStatus').dataset.state='review';}
    finally {clearTimeout(timer);}
  }
  window.ForecastApp=Object.freeze({decode});
  ForecastBuilderActions.connect({S,esc,name,busy,changed,creationReview,openDialog,closeDialog,openPicker,request,applySnapshot,render,controls,patch,notice,phaseFor});
  ForecastContractReview.connect({ready:()=>S.ready,catalog:()=>S.catalog,controls,readCatalog});
  if(window.LMInteractionSurfaces)window.__interactionMotion=LMInteractionSurfaces.install("forecast-manager",{state:()=>S,ready:()=>S.ready,actor:()=>({sub:S.sub,user:LMRuntime.current().user})});
  boot();
})();
