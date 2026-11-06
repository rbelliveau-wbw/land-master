(function(root){
  'use strict';
  const M=root.ForecastReviewModel,$=id=>document.getElementById(id);
  const reports=Object.freeze({years:'All_Forecast_Years',contracts:'All_Contracts1',schedules:'All_Takedown_Schedules'});
  const fields=Object.freeze({
    years:['ID','Subdivision1','Builder1','Forecast_Year','Status','Forecast_Name','Full_Year_Forecast'],
    contracts:['ID','Subdivision1','Builder','Contract_Type','Contract_Name','Status','Archive'],
    schedules:['ID','Subdivisions','Builder1','Add_Contract_Contract_Name','Takedown_Schedule_Code','Status','Total_Lot_Obligation','Initial_Closing_Date','Takedown_Start_Date','Initial_Takedown','Initial_Delay_Days','Second_Closing_Lots','Second_Closing_Days','Continued_Takedown','Continued_Takedown_Delay_Days','Takedown_End_Date','Last_Takedown_Date','Last_Takedown_Amount','Lots_Sold','Lots_Expected']
  });
  const criteria=Object.freeze({years:'((Status == "Builder") && ((Forecast_Year == "2026") || (Forecast_Year == "2027")))',contracts:'((Contract_Type == "Lot") || (Contract_Type == "Lot (Master)") || (Contract_Type == "Lot (Amendment)"))',schedules:''});
  let bridge,host,model=null,scope='',generation=0,loading=false,error='',openRows=new Set(),nodes=new Map(),visible={active:[],legacy:[]};
  const filters={territory:null,subdivision:null,builder:null,years:[...M.baselineYears]};
  let attention=false,search='';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const chevron='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg>';
  const check='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3 3 7-7"/></svg>';
  const identity=()=>{const context=root.LMRuntime.current();return JSON.stringify([context.environment,context.user,context.appLinkName]);};
  const num=(value,key)=>root.ForecastNumbers.markup(value==null?'—':Number(value).toLocaleString('en-US'),'review|'+scope+'|'+key);
  const rawNumber=(raw,field,key)=>Object.hasOwn(raw,field)?num(M.number(raw[field]),key):'<span class="review-muted">Unavailable</span>';
  const date=value=>esc(value==null||value===''?'—':value);
  const countSchedules=rows=>new Set(rows.flatMap(row=>row.schedules.map(s=>s.id))).size;
  function picker(field,label){return '<div class="filter"><label id="review-'+field+'-label">'+label+'</label><button class="picker" id="review-'+field+'-picker" data-picker="review-'+field+'" aria-haspopup="dialog" aria-expanded="false" aria-labelledby="review-'+field+'-label review-'+field+'-value"><span id="review-'+field+'-value"></span>'+chevron+'</button></div>';}
  function table(id){return '<div class="review-table-scroll"><table class="review-table" aria-label="'+(id==='reviewActive'?'Forecast Contract Review':'Legacy Schedule Cards')+'"><colgroup><col style="width:23%"><col style="width:11%"><col style="width:13%"><col style="width:15%"><col style="width:17%"><col style="width:16%"><col style="width:48px"></colgroup><thead><tr><th scope="col">Builder / Subdivision</th><th scope="col">Forecast Years</th><th scope="col">Contract Found</th><th scope="col">Contract Status</th><th scope="col">Takedown Cards</th><th scope="col">Review</th><th scope="col"><span class="sr-only">Details</span></th></tr></thead><tbody id="'+id+'"></tbody></table></div>';}
  function connect(options){
    bridge=options;host=$('contractReviewPanel');
    host.innerHTML='<section class="toolbar review-toolbar" aria-label="Contract Review Filters">'+picker('territory','Territory')+picker('subdivision','Subdivision')+picker('builder','Builders')+picker('years','Fiscal Years')+'</section>'+
      '<div class="review-heading"><h2>Contract Review</h2><button class="btn" id="reviewExport" disabled><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v9m-3-3 3 3 3-3M4 13v4h12v-4"/></svg>Export CSV</button></div>'+
      '<div id="reviewError" class="notice error" role="alert" hidden></div><button id="reviewRetry" class="btn" hidden>Retry</button>'+
      '<div id="reviewLoading" class="review-loading" role="status" hidden><div class="review-loading-card"><span class="review-loading-emblem" aria-hidden="true"><span class="review-loading-ring"></span></span><span>Loading Contract Review…</span></div></div>'+
      '<div id="reviewReport" hidden><section class="review-register"><div class="review-tools"><span id="reviewCount" class="review-count" role="status" aria-live="polite"></span><div class="review-actions"><label class="review-search"><span class="sr-only">Search Contract Review</span><input id="reviewSearch" type="search" placeholder="Search" aria-label="Search Contract Review"></label><div class="review-scope" role="group" aria-label="Review Scope"><button id="reviewAll" aria-pressed="true">All Forecasts</button><button id="reviewAttention" aria-pressed="false">Needs Review <span id="reviewAttentionCount"></span></button></div></div></div>'+table('reviewActive')+'</section>'+
      '<details class="review-legacy" id="reviewLegacy" open><summary><span>Legacy Cards</span><span class="review-badge" id="reviewLegacyCount"></span>'+chevron+'</summary>'+table('reviewLegacyRows')+'</details></div>';
    $('reviewAll').addEventListener('click',()=>{attention=false;render();});
    $('reviewAttention').addEventListener('click',()=>{attention=true;render();});
    $('reviewSearch').addEventListener('input',event=>{search=event.target.value.trim().toLowerCase();render();});
    $('reviewExport').addEventListener('click',exportCsv);
    $('reviewRetry').addEventListener('click',refresh);
    host.addEventListener('click',event=>{
      const button=event.target.closest('[data-review-toggle]');if(!button)return;
      const key=button.dataset.reviewToggle;
      openRows.has(key)?openRows.delete(key):openRows.add(key);render();
    });
    updateControls();
  }
  function current(){
    const context=root.LMRuntime.current();
    return !!bridge?.ready()&&context.environment!=='UNKNOWN'&&context.user&&context.user!=='(unknown)';
  }
  async function read(captured,run){
    const cancelled=()=>generation!==run||identity()!==captured||!current();
    const results=await Promise.allSettled(Object.keys(reports).map(async kind=>[kind,await root.LMData.readAll({reportName:reports[kind],fields:fields[kind],criteria:criteria[kind],fresh:true,isCancelled:cancelled})]));
    if(cancelled()){const failure=new Error('The Creator session changed.');failure.cancelled=true;throw failure;}
    const rejected=results.find(result=>result.status==='rejected'&&(result.reason?.permissionDenied||['2898','2899','2945','401','403'].includes(String(result.reason?.code))))||results.find(result=>result.status==='rejected');
    if(rejected)throw rejected.reason;
    return Object.fromEntries(results.map(result=>result.value));
  }
  async function load(freshCatalog=false){
    if(loading||!current())return;
    const captured=identity(),run=++generation;
    if(scope!==captured){scope=captured;model=null;nodes.clear();openRows.clear();$('reviewActive').replaceChildren();$('reviewLegacyRows').replaceChildren();}
    loading=true;error='';updateControls();bridge.controls();
    try{
      const results=await Promise.allSettled([read(captured,run),freshCatalog?bridge.readCatalog():Promise.resolve(bridge.catalog())]);
      if(run!==generation||identity()!==captured||!current())throw Object.assign(new Error('The Creator session changed.'),{cancelled:true});
      const failed=results.find(result=>result.status==='rejected');if(failed)throw failed.reason;
      const next=M.build(results[0].value,results[1].value);
      model=next;model.catalog=results[1].value;mountRows();render();
    }catch(failure){
      if(run!==generation)return;
      error=failure.message||'Contract Review could not be loaded.';
      if(failure.cancelled||failure.permissionDenied||['2898','2899','2945','401','403'].includes(String(failure.code))||identity()!==captured){model=null;nodes.clear();openRows.clear();$('reviewActive').replaceChildren();$('reviewLegacyRows').replaceChildren();}
    }finally{
      if(run===generation){loading=false;updateControls();bridge.controls();}
    }
  }
  function open(){if(scope!==identity()||!model)return load();render();}
  function refresh(){
    const before=model,captured=identity(),action=()=>load(true);
    return root.LMMotion?root.LMMotion.refresh(host,action,{allowed:()=>identity()===captured&&current(),completed:()=>model!==before&&!error}):action();
  }
  function updateControls(){
    if(!host)return;
    host.setAttribute('aria-busy',String(loading));
    $('reviewLoading').hidden=!loading||!!model;
    $('reviewReport').hidden=!model;
    $('reviewError').textContent=error;$('reviewError').hidden=!error;
    $('reviewRetry').hidden=!error;$('reviewRetry').disabled=loading||!current();
    $('reviewExport').disabled=loading||!model||!!error||scope!==identity();
    host.querySelectorAll('[data-picker]').forEach(button=>{button.disabled=!current()||loading;});
    for(const field of Object.keys(filters)){
      const selected=filters[field],names=selected?.map(value=>options(field).find(option=>option.id===value)?.label||value);
      const label=selected===null?{territory:'All Territories',subdivision:'All Subdivisions',builder:'All Builders',years:'2026 · 2027'}[field]:names.length?names.join(' · '):'0 Selected';
      $('review-'+field+'-value').textContent=label;$('review-'+field+'-picker').title=label;
    }
  }
  function options(field){
    const catalog=model?.catalog||bridge.catalog();
    if(!catalog)return [];
    if(field==='years')return M.baselineYears.map(year=>({id:year,label:'WFY '+year,detail:'Feb '+year+' — Jan '+(Number(year)+1)}));
    if(field==='territory')return [...new Set(catalog.subdivisions.map(row=>row.territory||'Unassigned'))].sort().map(value=>({id:value,label:value}));
    if(field==='subdivision')return catalog.subdivisions.filter(row=>filters.territory===null||filters.territory.includes(row.territory||'Unassigned')).map(row=>({id:row.id,label:row.name,detail:row.code}));
    return catalog.builders.map(row=>({id:row.id,label:row.name}));
  }
  function applyFilter(field,value){
    if(!Object.hasOwn(filters,field)||loading)return false;
    if(field==='years'&&value!==null&&!value.length){error='Choose at least one fiscal year.';updateControls();return false;}
    filters[field]=value;
    if(field==='territory'&&filters.subdivision!==null){const allowed=new Set(options('subdivision').map(row=>row.id));filters.subdivision=filters.subdivision.filter(id=>allowed.has(id));}
    // A local validation message is cleared by a valid choice, not a failed read.
    if(error==='Choose at least one fiscal year.')error='';
    render();return true;
  }
  function contractRows(row){
    return row.contracts.length?'<table class="review-detail-table review-contracts"><thead><tr><th>Contract</th><th>Type</th><th>Status</th><th>Archived</th></tr></thead><tbody>'+row.contracts.map(c=>'<tr><td><strong>'+esc(c.name)+'</strong><small>'+esc(c.id)+'</small></td><td>'+esc(c.type)+'</td><td>'+esc(c.status||'—')+'</td><td>'+esc(c.archived?'Yes':'No')+'</td></tr>').join('')+'</tbody></table>':'<div class="review-empty">No Matching Contract</div>';
  }
  function term(s,lots,days){return rawNumber(s.raw,lots,s.id+'|'+lots)+' Lots<small>'+rawNumber(s.raw,days,s.id+'|'+days)+' Days</small>';}
  function scheduleRows(row){
    return row.schedules.length?'<div class="review-detail-scroll"><table class="review-detail-table review-schedules"><thead><tr><th>Schedule / Contract</th><th>Subdivisions</th><th>Total Obligation</th><th>Initial Closing</th><th>Second Closing</th><th>Subsequent Closings</th><th>End Date</th><th>Last Takedown</th><th>Sold / Expected</th></tr></thead><tbody>'+row.schedules.map(s=>'<tr><td><strong>'+esc(s.code)+'</strong><small>'+esc(s.id)+'</small><small>'+esc(s.contract?.name||s.contractId||'Unlinked')+'</small></td><td>'+s.subdivisions.map(esc).join('<br>')+'</td><td>'+rawNumber(s.raw,'Total_Lot_Obligation',s.id+'|obligation')+' Lots</td><td>'+date(s.raw.Takedown_Start_Date)+'<small>'+term(s,'Initial_Takedown','Initial_Delay_Days')+'</small></td><td>'+term(s,'Second_Closing_Lots','Second_Closing_Days')+'</td><td>'+term(s,'Continued_Takedown','Continued_Takedown_Delay_Days')+'</td><td>'+date(s.raw.Takedown_End_Date)+'</td><td>'+date(s.raw.Last_Takedown_Date)+'<small>'+rawNumber(s.raw,'Last_Takedown_Amount',s.id+'|last')+' Lots</small></td><td>'+rawNumber(s.raw,'Lots_Sold',s.id+'|sold')+' Sold<small>'+rawNumber(s.raw,'Lots_Expected',s.id+'|expected')+' Expected</small></td></tr>').join('')+'</tbody></table></div>':'<div class="review-empty">No Schedule Card</div>';
  }
  function rowMarkup(row,index){
    const key=esc(row.key),found=row.contracts.length>0,statuses=[...new Set(row.contracts.map(c=>c.status))].filter(Boolean),first=row.schedules[0]?.raw.Takedown_Start_Date;
    return '<tr class="review-row" data-review-row="'+key+'" data-review-key="'+key+'"><td><strong>'+esc(row.builder)+'</strong><small>'+esc(row.subdivision)+'</small></td><td>'+row.years.map(year=>'<span class="review-year" data-review-year="'+year+'">'+year+'</span>').join('')+(row.years.length?'':'<span class="review-muted">—</span>')+'</td><td><span class="review-found '+(found?'yes':'no')+'">'+(found?check:'')+(found?'Found':'Not Found')+'</span><small>'+num(row.contracts.length,row.key+'|contracts')+' '+(row.contracts.length===1?'Match':'Matches')+'</small></td><td>'+statuses.map(esc).join('<br>')+(statuses.length?'':'—')+'</td><td>'+num(row.schedules.length,row.key+'|schedules')+' '+(row.schedules.length===1?'Schedule Card':'Schedule Cards')+(first?'<small>Initial: '+date(first)+'</small>':'')+'</td><td class="review-issues">'+(row.issues.length?row.issues.map(esc).join('<br>'):'—')+'</td><td><button class="review-toggle" data-review-toggle="'+key+'" aria-label="Details: '+esc(row.builder+' · '+row.subdivision)+'" aria-expanded="false" aria-controls="review-detail-'+index+'">'+chevron+'</button></td></tr>'+
      '<tr class="review-detail-row" data-review-row="detail:'+key+'" id="review-detail-'+index+'" hidden><td colspan="7"><div class="review-detail"><div class="review-detail-heading"><h3>Contracts</h3><div class="review-parents">'+row.parents.map(parent=>'<span title="'+esc(parent.id)+'">'+esc(parent.name)+' · '+esc(parent.year)+'</span>').join('')+'</div></div>'+contractRows(row)+'<h3 class="review-schedule-heading">Takedown Schedules</h3>'+scheduleRows(row)+'</div></td></tr>';
  }
  function mountRows(){
    const previous=root.ForecastNumbers.capture(host);nodes.clear();
    let index=0;
    for(const [id,rows] of [['reviewActive',model.active],['reviewLegacyRows',model.legacy]]){
      $(id).innerHTML=rows.map(row=>rowMarkup(row,index++)).join('')+'<tr class="review-no-matches"><td colspan="7">No Matching Records</td></tr>';
      for(const row of $(id).querySelectorAll('[data-review-key]'))nodes.set(row.dataset.reviewKey,{row,detail:row.nextElementSibling});
    }
    root.ForecastNumbers.apply(host,previous);
  }
  function render(){
    updateControls();if(!model)return;
    const searched=row=>!search||[row.builder,row.subdivision,row.code,...row.parents.flatMap(p=>[p.id,p.name]),...row.contracts.flatMap(c=>[c.id,c.name,c.status]),...row.schedules.flatMap(s=>[s.id,s.code,s.contractId])].join(' ').toLowerCase().includes(search);
    const scoped=M.filter(model.active,filters).filter(searched);
    visible.active=attention?scoped.filter(row=>row.issues.length):scoped;
    visible.legacy=M.filter(model.legacy,filters,false,true).filter(searched);
    const keys=new Set([...visible.active,...visible.legacy].map(row=>row.key));
    for(const [key,node] of nodes){
      const expanded=openRows.has(key),shown=keys.has(key);
      node.row.hidden=!shown;node.detail.hidden=!shown||!expanded;
      node.row.querySelector('[data-review-toggle]').setAttribute('aria-expanded',String(expanded));
      node.row.classList.toggle('review-open',expanded);
      node.row.querySelectorAll('[data-review-year]').forEach(chip=>{chip.hidden=filters.years!==null&&!filters.years.includes(chip.dataset.reviewYear);});
    }
    for(const [id,rows] of [['reviewActive',visible.active],['reviewLegacyRows',visible.legacy]])$(id).querySelector('.review-no-matches').hidden=rows.length>0;
    root.ForecastNumbers.text($('reviewCount'),visible.active.length+' Records · '+countSchedules(visible.active)+' Schedule Cards','review|'+scope+'|count');
    root.ForecastNumbers.text($('reviewAttentionCount'),'('+scoped.filter(row=>row.issues.length).length+')','review|'+scope+'|attention');
    root.ForecastNumbers.text($('reviewLegacyCount'),String(countSchedules(visible.legacy)),'review|'+scope+'|legacy-count');
    $('reviewAll').setAttribute('aria-pressed',String(!attention));$('reviewAttention').setAttribute('aria-pressed',String(attention));
  }
  function exportCsv(){
    if(loading||!model||error||scope!==identity()||!current())return;
    const csv=M.csv(visible.active,visible.legacy,filters.years),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
    link.href=url;link.download='Forecast-Contract-Review-2026-2027.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    if(root.LMSuccess)root.LMSuccess.show('Contract Review CSV ready.');
  }
  root.ForecastContractReview=Object.freeze({connect,open,refresh,options,applyFilter,selection:field=>filters[field],busy:()=>loading,reports,fields,criteria});
})(window);
