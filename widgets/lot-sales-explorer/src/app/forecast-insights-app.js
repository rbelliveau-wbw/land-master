(function(){
  'use strict';
  const M=ForecastInsightsModel,L=LotSalesModel,$=id=>document.getElementById(id),host=$('forecastsDashboard');
  const S={permissions:null,model:null,report:null,baseReport:null,nonemptyReport:null,emptyRows:new Set(),groupNodes:[],missingPhases:0,groupBy:'project',collapsed:new Set(),busy:false,error:false,generation:0,scoped:false};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmt=n=>Number(n).toLocaleString('en-US');
  const number=(value,key,context='')=>window.InsightsNumbers?.markup(value,JSON.stringify(['forecast-dashboard',key]),context)??esc(value);
  const chev='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  const pin='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 8c0 4-6 9-6 9S4 12 4 8a6 6 0 1 1 12 0Z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
  const check='<svg class="fc-sold-out" viewBox="0 0 20 20" role="img" aria-label="Sold Out"><title>Sold Out</title><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="m6.5 10 2.2 2.2 4.8-4.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  function notice(message,error=false){$('fcNotice').hidden=!message;$('fcNotice').textContent=message;$('fcNotice').classList.toggle('error',error);}
  function loading(active){$('fcLoading').hidden=!active;$('fcMatrix').setAttribute('aria-busy',String(active));if(active)$('fcEmpty').hidden=true;}
  const selections=id=>InsightsControls.values($(id));
  function filters(){return {groupBy:S.groupBy,mode:$('fcMode').value,period:$('fcPeriod').value,years:selections('fcYears'),projectStatuses:selections('fcStatus'),territories:selections('fcTerritory'),projectIds:selections('fcProject'),builderIds:selections('fcBuilder'),search:$('fcSearch').value,hideEmpty:$('fcHideEmpty').checked};}
  function options(id,values,label){const control=$(id),before=selections(id);control.innerHTML='<option value="" hidden>'+esc(label)+'</option>'+values.map(([value,label])=>'<option value="'+esc(value)+'">'+esc(label)+'</option>').join('');before.filter(value=>!values.some(([id])=>id===value)).forEach(value=>control.add(new Option('Unavailable Selection',value)));InsightsControls.setValues(control,before);}
  function fillFilters(){
    const phases=S.model.phases,sorted=entries=>entries.sort((a,b)=>a[1].localeCompare(b[1]));
    options('fcStatus',sorted([...new Set(phases.map(p=>p.projectStatus).filter(Boolean))].map(s=>[s,s])),'All Statuses');
    options('fcTerritory',sorted([...new Set(phases.map(p=>p.territory))].map(s=>[s,s])),'All Territories');
    options('fcProject',sorted([...new Map(phases.map(p=>[p.projectId,p.project]))].filter(([id])=>id)),'All Projects');
    options('fcBuilder',sorted(S.model.builders.map(b=>[b.id,b.name])),'All Builders');
    const current=ForecastModel.currentYear(S.permissions.today),years=[...new Set([...S.model.availableYears,current,current+1,current+2])].sort((a,b)=>a-b);
    options('fcYears',years.map(y=>[String(y),'WFY '+y]),'Choose Fiscal Years');if(!selections('fcYears').length)InsightsControls.setValues($('fcYears'),[String(current),String(current+1)]);
    if(!S.scoped&&InsightsShell.route().projectId){const id=InsightsShell.route().projectId;if(![...$('fcProject').options].some(o=>o.value===id))$('fcProject').add(new Option('Unavailable Project',id));InsightsControls.setValues($('fcProject'),[id]);}S.scoped=true;
    InsightsControls.syncAll();
  }
  function columns(report,annual=$('fcAnnual').checked){return report.years.flatMap(year=>[...report.months.filter(m=>m.year===year),...(annual?[{year,annual:true}]:[])]);}
  function monthClass(month){return (month.index===0?'fc-year-start ':'')+(S.report.mode==='outlook'&&month.start<S.permissions.today.slice(0,7)+'-01'?'fc-value-sold':'fc-value-forecast')+(month.start.slice(0,7)===S.permissions.today.slice(0,7)?' fc-current-month':'');}
  function numberHTML(node,html,animate){if(node._fcNumberMarkup===html)return;node._fcNumberMarkup=html;if(node.innerHTML===html)return;const prior=animate?window.InsightsNumbers?.capture(node):null;node.innerHTML=html;if(animate)window.InsightsNumbers?.apply(node,prior);}
  function reportCount(animate){const r=S.report;numberHTML($('fcCount'),number(fmt(new Set(r.rows.map(row=>row.phase.id)).size),'phase-count')+' Phases · '+number(fmt(r.groups.length),'group-count')+' '+({project:'Projects',territory:'Territories',builder:'Builders'}[S.groupBy]),animate);}
  function syncAnnual(){if(!S.report)return;$('fcMatrix').classList.toggle('fc-no-annual',!$('fcAnnual').checked);$('fcHead').querySelectorAll('.fc-year').forEach(cell=>{cell.colSpan=$('fcAnnual').checked?13:12;});}
  function syncSubtotals(){S.groupNodes.forEach(nodes=>{const hide=!S.collapsed.has(nodes.group.id)&&!$('fcSubtotals').checked;nodes.totals.forEach(value=>{value.hidden=hide;});});}
  function syncHideEmpty(animate=true){
    if(!S.baseReport||!S.permissions?.forecastsDashboard)return;
    const hide=$('fcHideEmpty').checked;S.report=hide?S.nonemptyReport:S.baseReport;
    S.groupNodes.forEach(nodes=>{
      const rows=hide?nodes.group.rows.filter(row=>!S.emptyRows.has(row.key)):nodes.group.rows;
      nodes.header.hidden=!rows.length;numberHTML(nodes.count,number(fmt(rows.length),'group-count:'+nodes.group.id),animate);
      const closed=S.collapsed.has(nodes.group.id);nodes.rows.forEach((row,index)=>{row.hidden=closed||hide&&S.emptyRows.has(nodes.group.rows[index].key);});
    });
    reportCount(animate);$('fcFoot').hidden=!S.report.rows.length;$('fcEmpty').hidden=S.report.rows.length>0||S.busy;$('fcExport').disabled=S.busy||S.error||!S.report.rows.length;syncCollapse();
  }
  function cellValue(c,key,extra='',group=false,hide=false){
    const title=c.missing?'Forecast is not available for every selected builder and month.':fmt(c.sold)+' Sold · '+fmt(c.forecast)+' Forecast';
    const value=number(c.value==null?'—':c.value?fmt(c.value):'',key,S.report.mode);
    return '<td class="'+extra+(c.missing?' fc-missing':'')+'"'+(c.start?' data-month-start="'+c.start+'"':'')+' title="'+esc(title)+'">'+(group?'<span data-fc-total'+(hide?' hidden':'')+'>'+value+'</span>':value)+'</td>';
  }
  const rowCells=(cells,key,group=false,hide=false)=>columns(S.report,true).map(c=>cellValue(c.annual?M.annual(cells,c.year):cells.find(v=>v.key===c.key),key+':'+(c.annual?'year-'+c.year:c.key),c.annual?'fc-annual':monthClass(c),group,hide)).join('');
  function render(){
    if(!S.model||!S.permissions?.forecastsDashboard)return;
    closeCard();
    try{
      S.baseReport=M.report(S.model,{...filters(),hideEmpty:false},S.permissions.today);S.report=S.baseReport;
      S.emptyRows=new Set(S.baseReport.rows.filter(row=>row.cells.every(cell=>cell.value===0)).map(row=>row.key));
      S.nonemptyReport={...S.baseReport,rows:S.baseReport.rows.filter(row=>!S.emptyRows.has(row.key)),groups:S.baseReport.groups.map(group=>({...group,rows:group.rows.filter(row=>!S.emptyRows.has(row.key))})).filter(group=>group.rows.length)};
      // Removed rows contain only known zeros, so monthly/group totals stay identical.
      S.error=false;notice('');
    }catch(error){S.error=true;notice(error.message,true);$('fcExport').disabled=true;return;}
    const r=S.baseReport,cols=columns(r,true),prior=window.InsightsNumbers?.capture(host),scroll=$('fcReportPane').querySelector('.fc-scroll'),left=scroll.scrollLeft,top=scroll.scrollTop;
    const missingPhases=new Set(r.rows.filter(row=>row.cells.some(c=>c.missing)).map(row=>row.phase.id)).size;
    S.missingPhases=missingPhases;$('fcWarning').hidden=!missingPhases;const warning='Missing Forecasts: '+fmt(missingPhases)+' '+(missingPhases===1?'Phase':'Phases');$('fcWarning').title=warning;$('fcWarning').setAttribute('aria-label',warning);
    $('fcYearsLabel').hidden=$('fcPeriod').value!=='custom';
    const contiguous=r.years.every((y,i)=>i===0||y===r.years[i-1]+1);
    $('fcRange').textContent=contiguous?'Feb '+r.years[0]+' – Jan '+(r.years.at(-1)+1):r.years.map(y=>'WFY '+y).join(' · ');
    reportCount(false);
    $('fcLegend').innerHTML=(r.mode==='outlook'?'<span><i></i>Sold</span>':'')+'<span><i class="fc-forecast"></i>Forecast</span>';
    $('fcHead').innerHTML='<tr><th rowspan="2" class="fc-name">'+({project:'Project / Phase',territory:'Territory / Phase',builder:'Builder / Phase'}[S.groupBy])+'</th><th rowspan="2" class="fc-meta">Zoho Project Status</th><th rowspan="2" class="fc-meta">Builder</th>'+r.years.map(y=>'<th class="fc-year" colspan="'+(12+($('fcAnnual').checked?1:0))+'">WFY '+y+'<span>Feb '+y+' – Jan '+(y+1)+'</span></th>').join('')+'</tr><tr>'+cols.map(c=>c.annual?'<th class="fc-annual">WFY '+c.year+'<small>Annual Total</small></th>':'<th class="'+monthClass(c)+'" data-month-start="'+c.start+'" title="'+esc(c.name+' '+c.start.slice(0,4)+(c.start.slice(0,7)===S.permissions.today.slice(0,7)?' - Current month':''))+'">'+esc(c.name.slice(0,3))+'<small>'+c.start.slice(0,4)+'</small>'+(c.start.slice(0,7)===S.permissions.today.slice(0,7)?'<small class="fc-current-month-label">Current</small>':'')+'</th>').join('')+'</tr>';
    $('fcBody').innerHTML=r.groups.map((g,gi)=>{
      const collapsed=S.collapsed.has(g.id),values=M.aggregate(g.rows,r.months);
      return '<tr class="fc-group" data-motion-row="'+esc('group:'+g.id)+'"><th class="fc-name" scope="row"><div class="fc-group-name"><button type="button" data-fc-group="'+gi+'" aria-expanded="'+!collapsed+'">'+chev+'<span>'+esc(g.name)+'</span><small>'+number(fmt(g.rows.length),'group-count:'+g.id)+'</small></button>'+(S.groupBy==='territory'?'<button type="button" class="fc-info-trigger" data-fc-territory="'+gi+'" aria-label="Territory Details for '+esc(g.name)+'">'+pin+'</button>':'')+'</div></th><td class="fc-meta"></td><td class="fc-meta"></td>'+rowCells(values,'group:'+g.id,true,!collapsed&&!$('fcSubtotals').checked)+'</tr>'+g.rows.map(row=>'<tr class="fc-leaf" '+(collapsed?'hidden ':'')+'data-motion-row="'+esc('phase:'+row.key)+'"><th class="fc-name" scope="row"><div class="fc-phase-name"><span title="'+esc(row.phase.name)+'">'+esc(row.phase.name)+'</span>'+(row.phase.soldOut?check:'')+'<button type="button" class="fc-info-trigger" data-fc-info="'+esc(row.phase.id)+'" aria-label="Territory for '+esc(row.phase.name)+'">'+pin+'</button></div></th><td class="fc-meta">'+(row.phase.projectStatus?'<span class="fc-badge">'+esc(row.phase.projectStatus)+'</span>':'—')+'</td><td class="fc-meta" title="'+esc(row.builders.map(b=>b.name).join(', '))+'">'+(row.builders.length===1?esc(row.builders[0].name):row.builders.length?number(fmt(row.builders.length),'builders:'+row.key)+' Builders':'—')+'</td>'+rowCells(row.cells,row.key)+'</tr>').join('');
    }).join('');
    S.groupNodes=[];for(const row of $('fcBody').children){if(row.classList.contains('fc-group'))S.groupNodes.push({group:r.groups[S.groupNodes.length],header:row,button:row.querySelector('[data-fc-group]'),count:row.querySelector('.fc-group-name small'),totals:[...row.querySelectorAll('[data-fc-total]')],rows:[]});else S.groupNodes.at(-1).rows.push(row);}
    $('fcFoot').innerHTML=r.rows.length?'<tr><th class="fc-name" scope="row">All '+({project:'Projects',territory:'Territories',builder:'Builders'}[S.groupBy])+'</th><td class="fc-meta"></td><td class="fc-meta"></td>'+rowCells(r.totals,'all')+'</tr>':'';
    $('fcEmpty').hidden=r.rows.length>0;$('fcEmpty').querySelector('h2').textContent='No Matching Phases';$('fcRetry').hidden=true;
    syncAnnual();syncSubtotals();syncHideEmpty(false);
    $('fcViewBy').value=S.groupBy;
    InsightsControls.syncAll();window.InsightsNumbers?.apply(host,prior);scroll.scrollLeft=left;scroll.scrollTop=top;
  }
  function syncCollapse(){const groups=S.report?.groups||[];$('fcCollapse').disabled=!groups.length;$('fcCollapse').textContent=groups.length&&groups.every(g=>S.collapsed.has(g.id))?'Expand All':'Collapse All';}
  function setCollapsed(index,closed){
    if(!S.permissions?.forecastsDashboard||!S.report)return;
    const group=S.baseReport.groups[index],nodes=S.groupNodes[index];if(!group||!nodes)return;
    closed?S.collapsed.add(group.id):S.collapsed.delete(group.id);nodes.button.setAttribute('aria-expanded',String(!closed));
    nodes.rows.forEach((row,index)=>{row.hidden=closed||$('fcHideEmpty').checked&&S.emptyRows.has(group.rows[index].key);});nodes.totals.forEach(value=>{value.hidden=!closed&&!$('fcSubtotals').checked;});
  }
  const actor=()=>JSON.stringify([LMRuntime.current().environment,LMRuntime.current().user,LMRuntime.current().appLinkName]);
  async function load(){
    if(!S.permissions?.forecastsDashboard||S.busy||InsightsShell.current()!=='forecasts')return;
    const generation=++S.generation,identity=actor();const isCurrent=()=>generation===S.generation&&S.permissions?.forecastsDashboard&&identity===actor();
    S.busy=true;S.error=false;$('fcExport').disabled=true;$('fcRetry').hidden=true;notice('');loading(true);$('connection').textContent='Loading Forecasts…';
    try{
      if(!ForecastModel.date(S.permissions.today))throw new Error('Publish the updated access function to provide the Creator application date.');
      const data=await ForecastInsightsCreator.load(ZOHO.CREATOR.DATA,{isCurrent});if(!isCurrent())return;
      const model=M.normalize(data);if(!isCurrent())return;S.model=model;fillFilters();render();$('connection').textContent='Connected';
    }catch(error){if(!isCurrent())return;S.error=true;notice(error.message||'Forecasts could not be loaded.',true);$('connection').textContent='Forecasts Unavailable';$('fcRetry').hidden=false;if(!S.model){$('fcEmpty').hidden=false;$('fcEmpty').querySelector('h2').textContent='Forecasts Unavailable';}}
    finally{if(isCurrent()){S.busy=false;loading(false);if(S.report)$('fcEmpty').hidden=S.report.rows.length>0;$('fcExport').disabled=S.error||!S.report?.rows.length;}}
  }
  function clear(){S.generation++;S.model=null;S.report=null;S.baseReport=null;S.nonemptyReport=null;S.emptyRows=new Set();S.groupNodes=[];S.missingPhases=0;S.busy=false;S.error=false;['fcHead','fcBody','fcFoot','fcCount','fcRange'].forEach(id=>{$(id).innerHTML='';$(id)._fcNumberMarkup=null;});$('fcWarning').hidden=true;$('fcExport').disabled=true;$('fcCollapse').disabled=true;$('fcEmpty').hidden=true;loading(false);notice('');closeCard();}
  function exportCsv(){
    if(!S.permissions?.forecastsDashboard||!S.report||S.busy||S.error)return;
    const r=S.report,cols=columns(r),lines=[['Territory','Project','Phase','Zoho Project Status','Builder',...cols.map(c=>c.annual?'WFY '+c.year+' Total':c.key)]];
    for(const row of r.rows)lines.push([row.phase.territory,row.phase.project,row.phase.name,row.phase.projectStatus,row.builders.map(b=>b.name).join('; '),...cols.map(c=>(c.annual?M.annual(row.cells,c.year):row.cells.find(v=>v.key===c.key)).value??'')]);
    lines.push(['','','All '+S.groupBy+'s','','',...cols.map(c=>(c.annual?M.annual(r.totals,c.year):r.totals.find(v=>v.key===c.key)).value??'')]);
    const quote=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
    const url=URL.createObjectURL(new Blob(['\ufeff'+lines.map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='Forecasts-'+r.mode+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  let cardTimer,cardTrigger=null,cardPinned=false;
  function closeCard(restore=false){clearTimeout(cardTimer);$('fcInfoCard').hidden=true;if(cardTrigger)cardTrigger.setAttribute('aria-expanded','false');if(restore)cardTrigger?.focus();cardTrigger=null;cardPinned=false;}
  function openCard(trigger,pinned=false){
    clearTimeout(cardTimer);if(cardTrigger&&cardTrigger!==trigger)cardTrigger.setAttribute('aria-expanded','false');cardTrigger=trigger;cardPinned=pinned;trigger.setAttribute('aria-expanded','true');
    let title,details;
    if(trigger.hasAttribute('data-fc-info')){const p=S.model.phases.find(p=>p.id===trigger.dataset.fcInfo);if(!p)return;title=p.territory;details=[['Project',p.project],['Phase',p.name],['Project Status',p.projectStatus||'—']];}
    else if(trigger.id==='fcWarning'){title='Missing Forecasts';details=[['Phases',S.missingPhases],['Unavailable values','Shown as —']];}
    else{const base=S.baseReport.groups[Number(trigger.dataset.fcTerritory)],g=S.report.groups.find(group=>group.id===base?.id);if(!g)return;title=g.name;details=[['Selected Projects',new Set(g.rows.map(r=>r.phase.projectId)).size],['Selected Phases',new Set(g.rows.map(r=>r.phase.id)).size],['Builders',new Set(g.rows.flatMap(r=>r.builders.map(b=>b.id))).size]];}
    $('fcInfoTitle').textContent=title;$('fcInfoBody').innerHTML='<dl>'+details.map(([label,value])=>'<dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd>').join('')+'</dl>';
    const card=$('fcInfoCard');card.hidden=false;const rect=trigger.getBoundingClientRect(),height=card.offsetHeight,width=card.offsetWidth;card.style.left=Math.max(8,Math.min(rect.left,innerWidth-width-8))+'px';card.style.top=Math.max(8,Math.min(rect.bottom+5,innerHeight-height-8))+'px';
  }
  const infoSelector='[data-fc-info],[data-fc-territory],#fcWarning';
  host.addEventListener('click',event=>{
    const group=event.target.closest('[data-fc-group]');if(group){const index=Number(group.dataset.fcGroup),id=S.baseReport?.groups[index]?.id;if(id==null)return;closeCard();setCollapsed(index,!S.collapsed.has(id));syncCollapse();return;}
    const info=event.target.closest(infoSelector);if(info){openCard(info,true);return;}
  });
  host.addEventListener('pointerover',event=>{const t=event.target.closest(infoSelector);if(t&&event.pointerType!=='touch')openCard(t);});
  host.addEventListener('pointerout',event=>{if(event.target.closest(infoSelector)&&!cardPinned)cardTimer=setTimeout(closeCard,180);});
  host.addEventListener('focusin',event=>{const t=event.target.closest(infoSelector);if(t)openCard(t);});
  host.addEventListener('focusout',event=>{if(event.target.closest(infoSelector)&&!cardPinned)cardTimer=setTimeout(closeCard,180);});
  $('fcInfoCard').addEventListener('pointerenter',()=>clearTimeout(cardTimer));$('fcInfoCard').addEventListener('pointerleave',()=>{if(!cardPinned)cardTimer=setTimeout(closeCard,180);});
  $('fcInfoClose').addEventListener('click',()=>closeCard(true));document.addEventListener('pointerdown',event=>{if(cardTrigger&&!$('fcInfoCard').contains(event.target)&&!cardTrigger.contains(event.target))closeCard();});document.addEventListener('keydown',event=>{if(event.key==='Escape')closeCard(true);});document.addEventListener('scroll',()=>closeCard(),true);window.addEventListener('resize',()=>closeCard());
  ['fcStatus','fcMode','fcPeriod','fcYears','fcTerritory','fcProject','fcBuilder'].forEach(id=>$(id).addEventListener('change',render));
  $('fcHideEmpty').addEventListener('change',()=>{closeCard();syncHideEmpty();});$('fcAnnual').addEventListener('change',syncAnnual);$('fcSubtotals').addEventListener('change',syncSubtotals);
  $('fcViewBy').addEventListener('change',()=>{S.groupBy=$('fcViewBy').value;S.collapsed.clear();render();});
  let searchTimer;$('fcSearch').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(render,160);});
  $('fcAllFilters').addEventListener('click',()=>{const open=$('fcMoreFilters').hidden;$('fcMoreFilters').hidden=!open;$('fcAllFilters').setAttribute('aria-expanded',String(open));});
  $('fcCollapse').addEventListener('click',()=>{if(!S.report)return;closeCard();const closed=!S.report.groups.every(g=>S.collapsed.has(g.id)),shown=new Set(S.report.groups.map(g=>g.id));S.baseReport.groups.forEach((g,index)=>{if(shown.has(g.id))setCollapsed(index,closed);});syncCollapse();});
  $('fcReset').addEventListener('click',()=>{['fcStatus','fcTerritory','fcProject','fcBuilder'].forEach(id=>InsightsControls.setValues($(id),[]));$('fcSearch').value='';$('fcMode').value='outlook';$('fcPeriod').value='next';$('fcHideEmpty').checked=false;$('fcAnnual').checked=true;$('fcSubtotals').checked=false;S.collapsed.clear();render();});
  $('fcRetry').addEventListener('click',()=>$('refresh').click());$('fcExport').addEventListener('click',exportCsv);
  window.addEventListener('insights:access',event=>{S.permissions=event.detail;clear();});
  window.addEventListener('insights:dashboard',event=>{closeCard();if(event.detail==='forecasts'&&S.permissions?.forecastsDashboard&&!S.model)void load();});
  window.ForecastInsightsApp=Object.freeze({groupBy:()=>S.groupBy,refresh:load});
})();
