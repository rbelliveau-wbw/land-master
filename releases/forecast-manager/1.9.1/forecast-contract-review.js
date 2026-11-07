(function(root){
  'use strict';
  const M=root.ForecastReviewModel,$=id=>document.getElementById(id);
  const reports=Object.freeze({years:'All_Forecast_Years',contracts:'All_Contracts1',schedules:'All_Takedown_Schedules',subdivisions:'All_Subdivisions',projects:'All_Projects',months:'All_Forecasts',sold:'All_Lots_All_Fields'});
  const fields=Object.freeze({
    years:['ID','Subdivision1','Builder1','Forecast_Year','Status','Forecast_Name','Full_Year_Forecast'],
    contracts:['ID','Subdivision1','Builder','Contract_Type','Contract_Name','Status','Archive','Number_of_Lots','Initial_Takedown','Initial_Takedown_Days','Second_Closing_Lots','Second_Closing_Days','Subsequent_Takedown_Lots','Subsequent_Takedown_Days','Completion_Date','Total_Contract_Price','Earnest_Money'],
    schedules:['ID','Subdivisions','Builder1','Add_Contract_Contract_Name','Takedown_Schedule_Code','Status','Total_Lot_Obligation','Initial_Closing_Date','Takedown_Start_Date','Initial_Takedown','Initial_Delay_Days','Second_Closing_Lots','Second_Closing_Days','Continued_Takedown','Continued_Takedown_Delay_Days','Takedown_End_Date','Last_Takedown_Date','Last_Takedown_Amount','Lots_Sold','Lots_Expected','Last_30_Day_Sales','Last_90_Day_Sales','Last_6_Month_Sales','Last_12_Month_Sales'],
    subdivisions:['ID','Project','Subdivision_Name','Subdivision_Code','Territory'],projects:['ID','Project_Name'],
    months:['ID','Subdivision1','Builder1','Forecasted_Lots'],sold:['ID','Subdivision','Builder1']
  });
  const criteria=Object.freeze({years:'(Status == "Builder")',contracts:'((Contract_Type == "Lot") || (Contract_Type == "Lot (Master)") || (Contract_Type == "Lot (Amendment)"))'});
  let bridge,host,model=null,scope='',generation=0,loading=false,error='',page='review',groupBy='project';
  const filters={territory:null,subdivision:null,builder:null,years:[...M.baselineYears]},openRows=new Set(),closedGroups=new Set(),nodes=new Map();
  let attention=false,search='',visible={active:[],legacy:[]};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const chevron='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg>';
  const check='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3 3 7-7"/></svg>';
  const icon=kind=>'<svg viewBox="0 0 20 20" aria-hidden="true">'+(kind==='schedule'?'<rect x="3" y="4" width="14" height="13" rx="2"/><path d="M6 2v4m8-4v4M3 8h14"/>':'<path d="M5 2h7l4 4v12H5zM12 2v5h4M8 10h5m-5 3h5"/>')+'</svg>';
  const identity=()=>{const context=root.LMRuntime.current();return JSON.stringify([context.environment,context.user,context.appLinkName]);};
  const num=(value,key)=>root.ForecastNumbers.markup(value==null?'—':Number(value).toLocaleString('en-US'),'review|'+scope+'|'+key);
  function rawNumber(raw,field,key,money=false){
    if(!Object.hasOwn(raw,field))return '<span class="review-muted">Unavailable</span>';
    const value=M.number(raw[field]);
    return money?root.ForecastNumbers.markup(value==null?'—':value.toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:2}),'review|'+scope+'|'+key):num(value,key);
  }
  const date=value=>esc(value==null||value===''?'—':value);
  const savedDate=(raw,field)=>Object.hasOwn(raw,field)?date(raw[field]):'<span class="review-muted">Unavailable</span>';
  const countSchedules=rows=>new Set(rows.flatMap(row=>row.schedules.map(s=>s.id))).size;
  const title=()=>'Contract Review';
  const bodyId=()=>'reviewActive';
  function picker(field,label){return '<div class="filter"'+(field==='years'?' id="reviewYearFilter"':'')+'><label id="review-'+field+'-label">'+label+'</label><button class="picker" id="review-'+field+'-picker" data-picker="review-'+field+'" aria-haspopup="dialog" aria-expanded="false" aria-labelledby="review-'+field+'-label review-'+field+'-value"><span id="review-'+field+'-value"></span>'+chevron+'</button></div>';}
  function table(id){return '<div class="review-table-scroll" id="'+id+'Scroll"><table class="review-table" aria-label="'+(id==='reviewActive'?'Forecast Contract Review':'Legacy Schedule Cards')+'"><colgroup><col style="width:23%"><col style="width:11%"><col style="width:13%"><col style="width:15%"><col style="width:17%"><col style="width:16%"><col style="width:48px"></colgroup><thead><tr><th scope="col">Builder</th><th scope="col">Forecast Years</th><th scope="col">Contract Found</th><th scope="col">Contract Status</th><th scope="col">Takedown Schedule</th><th scope="col">Review</th><th scope="col"><span class="sr-only">Details</span></th></tr></thead><tbody id="'+id+'"></tbody></table></div>';}
  function connect(options){
    bridge=options;host=$('contractReviewPanel');
    host.innerHTML='<section class="toolbar review-toolbar" aria-label="Contract Review Filters">'+picker('territory','Territory')+picker('subdivision','Subdivision')+picker('builder','Builders')+picker('years','Fiscal Years')+'</section>'+
      '<div class="review-heading"><div class="review-title-line"><div><h2 id="reviewTitle">Contract Review</h2><span id="reviewCount" class="review-count" role="status" aria-live="polite"></span></div><div class="review-group-control"><span class="review-group-label" id="reviewGroupLabel">Group By</span><div class="review-group-slider" id="reviewGrouping" role="tablist" aria-labelledby="reviewGroupLabel" data-lm-motion="tabs">'+['territory','project','builder'].map(value=>'<button id="review-group-'+value+'" role="tab" aria-controls="reviewRegister" aria-selected="'+(groupBy===value)+'" data-review-group="'+value+'">'+value[0].toUpperCase()+value.slice(1)+'</button>').join('')+'</div></div><button class="btn" id="reviewExport" disabled><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v9m-3-3 3 3 3-3M4 13v4h12v-4"/></svg>Export CSV</button></div>'+
      '<div class="review-header-bottom"><label class="review-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg><span class="sr-only">Search Contract Review</span><input id="reviewSearch" type="search" placeholder="Search Builder, Contract, or Schedule" aria-label="Search Contract Review"></label><div class="review-scope" id="reviewScope" role="group" aria-label="Review Scope"><button id="reviewAll" aria-pressed="true">All Forecasts</button><button id="reviewAttention" aria-pressed="false">Needs Review <span id="reviewAttentionCount"></span></button></div></div></div>'+
      '<div id="reviewError" class="notice error" role="alert" hidden></div><button id="reviewRetry" class="btn" hidden>Retry</button>'+
      '<div id="reviewLoading" class="review-loading" role="status" hidden><div class="review-loading-card"><span class="review-loading-emblem" aria-hidden="true"><span class="review-loading-ring"></span></span><span>Loading Contract Review…</span></div></div>'+
      '<div id="reviewReport" hidden><section class="review-register" id="reviewRegister" role="tabpanel" aria-labelledby="review-group-project">'+table('reviewActive')+'</section></div>';
    $('reviewAll').addEventListener('click',()=>{attention=false;render();});
    $('reviewAttention').addEventListener('click',()=>{attention=true;render();});
    $('reviewSearch').addEventListener('input',event=>{search=event.target.value.trim().toLowerCase();render();});
    $('reviewExport').addEventListener('click',exportCsv);$('reviewRetry').addEventListener('click',refresh);
    host.addEventListener('click',event=>{
      const group=event.target.closest('[data-review-group]');
      if(group){groupBy=group.dataset.reviewGroup;render();return;}
      const collapse=event.target.closest('[data-review-collapse]');
      if(collapse){const key=collapse.dataset.reviewCollapse;closedGroups.has(key)?closedGroups.delete(key):closedGroups.add(key);render();return;}
      if(event.target.closest('a,input,textarea,select'))return;
      const button=event.target.closest('[data-review-toggle]'),row=event.target.closest('.review-row[data-review-key]');if(!button&&!row)return;
      const key=button?button.dataset.reviewToggle:row.dataset.reviewKey;openRows.has(key)?openRows.delete(key):openRows.add(key);render();
    });
    $('reviewGrouping').addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();const choices=['territory','project','builder'],index=choices.indexOf(groupBy);
      groupBy=choices[event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowRight'?1:2))%3];render();$('review-group-'+groupBy).focus();
    });
    updateControls();
  }
  function current(){const context=root.LMRuntime.current();return !!bridge?.ready()&&context.environment!=='UNKNOWN'&&context.user&&context.user!=='(unknown)';}
  async function read(captured,run,catalog){
    const cancelled=()=>generation!==run||identity()!==captured||!current(),period=M.monthWindow(catalog.today);
    const range=field=>'('+field+" >= '"+period.from+"' && "+field+" < '"+period.to+"')";
    const scoped={...criteria,months:range('Forecast_Start_Date'),sold:'((Status == "Sold") && '+range('Close_Date')+')'};
    const results=await Promise.allSettled(Object.keys(reports).map(async kind=>[kind,await root.LMData.readAll({reportName:reports[kind],fields:fields[kind],criteria:scoped[kind]||'',fresh:true,isCancelled:cancelled})]));
    if(cancelled())throw Object.assign(new Error('The Creator session changed.'),{cancelled:true});
    const rejected=results.find(result=>result.status==='rejected'&&(result.reason?.permissionDenied||['2898','2899','2945','401','403'].includes(String(result.reason?.code))))||results.find(result=>result.status==='rejected');
    if(rejected)throw rejected.reason;
    return {...Object.fromEntries(results.map(result=>result.value)),period};
  }
  function clear(){model=null;nodes.clear();openRows.clear();closedGroups.clear();$('reviewActive').replaceChildren();$('reviewCount').textContent='';$('reviewAttentionCount').textContent='';}
  async function load(freshCatalog=false){
    if(loading||!current())return;
    const captured=identity(),run=++generation;
    if(scope!==captured){scope=captured;clear();}
    loading=true;error='';updateControls();bridge.controls();
    try{
      const catalog=freshCatalog?await bridge.readCatalog():bridge.catalog();
      if(run!==generation||identity()!==captured||!current())throw new Error('The Creator session changed.');
      const data=await read(captured,run,catalog);
      if(run!==generation||identity()!==captured||!current())throw new Error('The Creator session changed.');
      const next=M.build(data,catalog);next.catalog=catalog;next.period=data.period;model=next;mountRows();render();
    }catch(failure){if(run!==generation)return;error=failure.message||'Contract Review could not be loaded.';clear();}
    finally{if(run===generation){loading=false;updateControls();bridge.controls();}}
  }
  function open(){page='review';host.setAttribute('aria-labelledby','contractReviewTab');if(scope!==identity()||!model)return load();render();}
  function refresh(){const before=model,captured=identity(),action=()=>load(true);return root.LMMotion?root.LMMotion.refresh(host,action,{allowed:()=>identity()===captured&&current(),completed:()=>model!==before&&!error}):action();}
  function updateControls(){
    if(!host)return;
    host.setAttribute('aria-busy',String(loading));$('reviewTitle').textContent=title();
    $('reviewLoading').hidden=!loading||!!model;$('reviewReport').hidden=!model;
    $('reviewYearFilter').hidden=false;
    $('reviewError').textContent=error;$('reviewError').hidden=!error;$('reviewRetry').hidden=!error;$('reviewRetry').disabled=loading||!current();
    $('reviewExport').disabled=loading||!model||!!error||scope!==identity();
    host.querySelectorAll('[data-picker]').forEach(button=>{button.disabled=!current()||loading;});
    $('reviewAll').textContent='All Forecasts';
    for(const field of Object.keys(filters)){
      const selected=filters[field],names=selected?.map(value=>options(field).find(option=>option.id===value)?.label||value);
      const label=selected===null?{territory:'All Territories',subdivision:'All Subdivisions',builder:'All Builders',years:'All Years'}[field]:names.length?names.join(' · '):'0 Selected';
      $('review-'+field+'-value').textContent=label;$('review-'+field+'-picker').title=label;
    }
  }
  function options(field){
    const catalog=model?.catalog||bridge.catalog();if(!catalog)return [];
    if(field==='years')return M.availableYears.map(year=>({id:year,label:'WFY '+year,detail:'Feb '+year+' — Jan '+(Number(year)+1)}));
    if(field==='territory')return [...new Set(catalog.subdivisions.map(row=>row.territory||'Unassigned'))].sort().map(value=>({id:value,label:value}));
    if(field==='subdivision')return catalog.subdivisions.filter(row=>filters.territory===null||filters.territory.includes(row.territory||'Unassigned')).map(row=>({id:row.id,label:row.name,detail:row.code}));
    return catalog.builders.map(row=>({id:row.id,label:row.name}));
  }
  function applyFilter(field,value){
    if(!Object.hasOwn(filters,field)||loading)return false;
    if(field==='years'&&value!==null&&(!value.length||value.some(year=>!M.availableYears.includes(year)))){error='Choose at least one fiscal year.';updateControls();return false;}
    filters[field]=value;
    if(field==='territory'&&filters.subdivision!==null){const allowed=new Set(options('subdivision').map(row=>row.id));filters.subdivision=filters.subdivision.filter(id=>allowed.has(id));}
    if(error==='Choose at least one fiscal year.')error='';render();return true;
  }
  const field=(label,value)=>'<div class="fs-term"><dt>'+label+'</dt><dd>'+value+'</dd></div>';
  const term=(raw,lots,days,key)=>rawNumber(raw,lots,key+'|'+lots)+' Lots<span class="review-term-secondary">'+rawNumber(raw,days,key+'|'+days)+' Days</span>';
  function cardHead(kind,name,id,lots){return '<header class="fs-card-head"><div class="fs-card-identity"><span class="review-card-kicker">'+icon(kind)+(kind==='schedule'?'Takedown Schedule':'Contract')+'</span><h4>'+esc(name)+'</h4><span class="review-card-code">'+esc(id)+'</span></div><div class="review-card-lots"><strong>'+lots+'</strong><span>Total Lots</span></div></header>';}
  function contractCards(row){return row.contracts.map(c=>{
    const raw=c.raw,key=page+'|'+row.key+'|contract|'+c.id;
    return '<article class="fs-card review-contract-card" aria-label="Contract '+esc(c.name)+'">'+cardHead('contract',c.name,c.id+' · '+c.type,rawNumber(raw,'Number_of_Lots',key+'|lots'))+'<dl class="fs-terms">'+field('Status',esc(c.status||'—'))+field('Archive',c.archived?'<span class="review-archived">Archived</span>':'No')+field('Initial Closing',term(raw,'Initial_Takedown','Initial_Takedown_Days',key))+field('Second Closing',term(raw,'Second_Closing_Lots','Second_Closing_Days',key))+field('Subsequent Closings',term(raw,'Subsequent_Takedown_Lots','Subsequent_Takedown_Days',key))+field('Completion Date',savedDate(raw,'Completion_Date'))+field('Total Contract Price',rawNumber(raw,'Total_Contract_Price',key+'|price',true))+field('Earnest Money',rawNumber(raw,'Earnest_Money',key+'|earnest',true))+'</dl></article>';
  }).join('');}
  function scheduleCards(row){return row.schedules.map(s=>{
    const raw=s.raw,key=page+'|'+row.key+'|schedule|'+s.id,total=M.number(raw.Total_Lot_Obligation),sold=M.number(raw.Lots_Sold),percent=total>0&&sold!=null?Math.min(100,Math.max(0,sold/total*100)):0;
    const monthlyKey=key+'|month',month=row.month,monthPercent=month.forecast>0?Math.min(100,month.sold/month.forecast*100):0;
    const scopeField=s.subdivisions.length>1?field('Subdivisions',s.subdivisions.map(esc).join('<br>')):'';
    return '<article class="fs-card review-schedule-card" aria-label="Takedown Schedule '+esc(s.code)+'">'+cardHead('schedule',s.code,s.id,rawNumber(raw,'Total_Lot_Obligation',key+'|lots'))+
      '<div class="fs-progress"><div class="review-progress-label"><span>Schedule Progress</span><strong>'+rawNumber(raw,'Lots_Sold',key+'|sold')+' / '+rawNumber(raw,'Total_Lot_Obligation',key+'|total')+' Sold</strong></div><div class="fs-progress-track"'+(total>0&&sold!=null?' role="progressbar" aria-label="Saved Schedule Lots Sold" aria-valuemin="0" aria-valuemax="'+total+'" aria-valuenow="'+Math.min(total,Math.max(0,sold))+'" aria-valuetext="'+esc(sold+' of '+total+' Sold')+'"':'')+'><span data-lm-motion="meter" data-lm-meter-key="'+esc(key)+'" style="width:'+percent+'%"></span></div><div class="fs-progress-meta"><span>'+rawNumber(raw,'Lots_Sold',key+'|sold-meta')+' Sold</span><span>'+rawNumber(raw,'Lots_Expected',key+'|expected')+' Expected</span></div></div>'+
      '<div class="fs-month"><div class="fs-month-head"><span>'+esc(model.period.label)+'</span><strong>'+num(month.sold,monthlyKey+'|sold')+' / '+num(month.forecast,monthlyKey+'|forecast')+'</strong></div><div class="fs-month-track" role="progressbar" aria-label="'+esc(model.period.label)+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+monthPercent+'" aria-valuetext="'+esc(month.sold+' Sold / '+month.forecast+' Forecast')+'"><span class="fs-month-fill" data-lm-motion="meter" data-lm-meter-key="'+esc(monthlyKey)+'" style="width:'+monthPercent+'%"></span></div></div>'+
      '<dl class="fs-terms">'+field('Initial Closing',savedDate(raw,'Takedown_Start_Date')+'<span class="review-term-secondary">'+term(raw,'Initial_Takedown','Initial_Delay_Days',key)+'</span>')+field('Second Closing',term(raw,'Second_Closing_Lots','Second_Closing_Days',key))+field('Subsequent Closings',term(raw,'Continued_Takedown','Continued_Takedown_Delay_Days',key))+field('End Date',savedDate(raw,'Takedown_End_Date'))+field('Last Takedown',savedDate(raw,'Last_Takedown_Date')+'<span class="review-term-secondary">'+rawNumber(raw,'Last_Takedown_Amount',key+'|last')+' Lots</span>')+scopeField+'</dl><section class="fs-recent"><h5>Recent Sales</h5><dl class="fs-sales">'+[['30 Days','Last_30_Day_Sales'],['90 Days','Last_90_Day_Sales'],['6 Months','Last_6_Month_Sales'],['12 Months','Last_12_Month_Sales']].map(([label,name])=>'<div><dt>'+label+'</dt><dd>'+rawNumber(raw,name,key+'|'+name)+'</dd></div>').join('')+'</dl></section></article>';
  }).join('');}
  function detailCards(row){return '<div class="review-detail-cards">'+scheduleCards(row)+contractCards(row)+'</div>'+(!row.schedules.length?'<div class="review-empty-detail">No Schedule Card</div>':'')+(!row.contracts.length?'<div class="review-empty-detail">No Matching Contract</div>':'');}
  function rowMarkup(row,index,key){
    const found=row.contracts.length>0,statuses=[...new Set(row.contracts.map(c=>c.status))].filter(Boolean);
    return '<tr class="review-row" data-review-row="'+esc(key)+'" data-review-key="'+esc(key)+'"><td><strong>'+esc(row.builder)+'</strong></td><td>'+row.years.map(year=>'<span class="review-year" data-review-year="'+year+'">'+year+'</span>').join('')+(row.years.length?'':'<span class="review-muted">—</span>')+'</td><td><span class="review-found '+(found?'yes':'no')+'">'+(found?check:'')+(found?'Found':'Not Found')+'</span><small>'+num(row.contracts.length,key+'|contracts')+' '+(row.contracts.length===1?'Match':'Matches')+'</small></td><td>'+statuses.map(esc).join('<br>')+(statuses.length?'':'—')+(row.contracts.some(c=>c.archived)?'<small><span class="review-archived">Archived</span></small>':'')+'</td><td><span class="review-found '+(row.schedules.length?'yes':'no')+'">'+(row.schedules.length?check:'')+(row.schedules.length?'Found':'Not Found')+'</span></td><td class="review-issues">'+(row.issues.length?row.issues.map(esc).join('<br>'):'<span class="review-muted">—</span>')+'</td><td><button class="review-toggle" data-review-toggle="'+esc(key)+'" aria-label="Details: '+esc(row.builder+' · '+row.subdivision)+'" aria-expanded="false" aria-controls="review-detail-'+index+'">'+chevron+'</button></td></tr><tr class="review-detail-row" data-review-row="detail:'+esc(key)+'" id="review-detail-'+index+'" hidden><td colspan="7"></td></tr>';
  }
  function mountRows(){
    const previous=root.ForecastNumbers.capture(host);nodes.clear();let index=0;
    for(const [id,rows] of [['reviewActive',model.active]]){
      $(id).innerHTML=rows.map(row=>rowMarkup(row,index++,id+'|'+row.key)).join('');
      for(const row of $(id).querySelectorAll('[data-review-key]'))nodes.set(row.dataset.reviewKey,{row,detail:row.nextElementSibling,ready:false});
    }
    root.ForecastNumbers.apply(host,previous);
  }
  function renderGroups(rows,id){
    const body=$(id),used=new Set(),fragment=document.createDocumentFragment(),sections=new Map([...body.querySelectorAll('[data-review-section]')].map(node=>[node.dataset.reviewSection,node]));
    let empty=body.querySelector('.review-no-matches');
    for(const group of M.groupRows(rows,groupBy)){
      const groupKey=id+'|'+group.key,closed=closedGroups.has(groupKey),sectionKey='group:'+groupKey;
      let section=sections.get(sectionKey);
      if(!section){section=document.createElement('tr');section.className='review-group-row';section.dataset.reviewSection=sectionKey;section.dataset.reviewRow=sectionKey;section.innerHTML='<td colspan="7"><button class="review-group-button" data-review-collapse="'+esc(groupKey)+'">'+chevron+'<span>'+esc(group.name)+'</span><span class="review-group-count"></span></button></td>';}
      const button=section.querySelector('button');button.setAttribute('aria-expanded',String(!closed));root.ForecastNumbers.text(section.querySelector('.review-group-count'),group.rows.length+' '+(group.rows.length===1?'Record':'Records'),'review|'+scope+'|'+sectionKey+'|count');section.hidden=false;fragment.append(section);used.add(section);
      let previousSub=null;
      for(const row of group.rows){
        if(row.subdivisionId!==previousSub){
          previousSub=row.subdivisionId;const subKey=sectionKey+'|sub:'+row.subdivisionId;
          let subdivision=sections.get(subKey);
          if(!subdivision){subdivision=document.createElement('tr');subdivision.className='review-subdivision-row';subdivision.dataset.reviewSection=subKey;subdivision.dataset.reviewRow=subKey;subdivision.innerHTML='<th scope="rowgroup" colspan="7">'+esc(row.subdivision)+(row.code?'<span>'+esc(row.code)+'</span>':'')+'</th>';}
          subdivision.hidden=closed;fragment.append(subdivision);used.add(subdivision);
        }
        const node=nodes.get(id+'|'+row.key),expanded=openRows.has(id+'|'+row.key);
        if(expanded&&!node.ready){node.detail.firstElementChild.innerHTML=detailCards(row);node.ready=true;}
        node.row.hidden=closed;node.detail.hidden=closed||!expanded;node.row.querySelector('[data-review-toggle]').setAttribute('aria-expanded',String(expanded));node.row.classList.toggle('review-open',expanded);
        node.row.querySelectorAll('[data-review-year]').forEach(chip=>{chip.hidden=id==='reviewActive'&&filters.years!==null&&!filters.years.includes(chip.dataset.reviewYear);});
        fragment.append(node.row,node.detail);used.add(node.row);used.add(node.detail);
      }
    }
    for(const child of [...body.children])if(!used.has(child)&&child!==empty){child.hidden=true;fragment.append(child);}
    if(!empty){empty=document.createElement('tr');empty.className='review-no-matches';empty.innerHTML='<td colspan="7">No Matching Records</td></tr>';}
    empty.hidden=rows.length>0;fragment.append(empty);body.append(fragment);
  }
  function render(){
    updateControls();if(!model)return;
    const focused=document.activeElement,previous=root.ForecastNumbers.capture(host),meters=root.LMMotion?.captureMeters(host);
    const searched=row=>!search||[row.builder,row.subdivision,row.code,row.project,row.territory,...row.parents.flatMap(p=>[p.id,p.name]),...row.contracts.flatMap(c=>[c.id,c.name,c.status]),...row.schedules.flatMap(s=>[s.id,s.code,s.contractId])].join(' ').toLowerCase().includes(search);
    const active=M.filter(model.active,filters).filter(searched),scoped=active;
    visible={active:attention?active.filter(row=>row.issues.length):active,legacy:[]};
    const rows=visible.active;
    renderGroups(rows,bodyId());
    $('reviewGrouping').querySelectorAll('[data-review-group]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.reviewGroup===groupBy)));
    $('reviewRegister').setAttribute('aria-labelledby','review-group-'+groupBy);
    const scheduleCount=countSchedules(rows);
    root.ForecastNumbers.text($('reviewCount'),rows.length+' '+(rows.length===1?'Record':'Records')+' · '+scheduleCount+' '+(scheduleCount===1?'Schedule Card':'Schedule Cards'),'review|'+scope+'|'+page+'|count');
    root.ForecastNumbers.text($('reviewAttentionCount'),'('+scoped.filter(row=>row.issues.length).length+')','review|'+scope+'|'+page+'|attention');
    $('reviewAll').setAttribute('aria-pressed',String(!attention));$('reviewAttention').setAttribute('aria-pressed',String(attention));
    root.ForecastNumbers.apply(host,previous);if(meters)root.LMMotion.applyMeters(host,meters);
    if(focused?.isConnected&&document.activeElement!==focused&&focused.getClientRects().length)focused.focus({preventScroll:true});
  }
  function exportCsv(){
    if(loading||!model||error||scope!==identity()||!current())return;
    const csv=M.csv(visible.active,[],filters.years),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
    link.href=url;link.download='Forecast-Contract-Review.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);if(root.LMSuccess)root.LMSuccess.show(title()+' CSV ready.');
  }
  root.ForecastContractReview=Object.freeze({connect,open,refresh,options,applyFilter,selection:field=>filters[field],busy:()=>loading,reports,fields,criteria});
})(window);
