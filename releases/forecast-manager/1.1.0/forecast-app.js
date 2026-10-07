(function () {
  'use strict';
  const M = ForecastModel, $ = id => document.getElementById(id);
  const icons = {check:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3 3 7-7"/></svg>',close:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>'};
  const S = {ready:false,catalog:null,snapshot:null,sub:'',builders:null,years:[],view:'forecast',pending:0,loading:false,creating:false,entries:new Map(),queue:Promise.resolve(),picker:null,dialog:null,focus:null};
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const count = value => Number(value || 0).toLocaleString('en-US');
  const name = builderId => (S.catalog.builders.find(row=>row.id === builderId) || {}).name || 'Builder';
  const changed = () => [...S.entries.values()].some(entry=>entry.phase === 'failed' || entry.phase === 'unknown');
  const busy = () => S.pending > 0 || S.loading || S.creating;
  function notice(message, error = false) {const host = $('notice'); host.textContent = message || ''; host.classList.toggle('error',error); host.hidden = !message; if(error && window.LMSuccess) LMSuccess.clear();}
  function decode(raw) {
    let data = raw;
    for(let index=0;index<8;index++) {
      if(typeof data === 'string') {data=JSON.parse(data); continue;}
      if(data && typeof data.ok === 'boolean') return data;
      if(!data || typeof data !== 'object') break;
      const field=['result','response','body','data'].find(key=>data[key] != null);
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
    let timer;
    try {
      const raw=await Promise.race([
        api.invokeCustomApi({api_name:LMRuntime.apiName('Forecast_Manager_Widget'),http_method:'POST',content_type:'application/json',payload:{payload:JSON.stringify(body)}}),
        new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(new Error(write?'The save response timed out. Check status before editing again.':'The forecast request timed out.')),write?90000:30000);})
      ]);
      const data=decode(raw);
      if(data.ok !== true) {const error=new Error(data.message || 'The forecast request failed.'); error.unknown=data.unknown === true; error.data=data; throw error;}
      if(data.action !== body.action) throw new Error('Creator returned a response for a different forecast operation.');
      if(!M.date(data.today) || typeof data.windowOpen !== 'boolean') throw new Error('Creator did not return the forecast date and window status.');
      return data;
    } catch(error) {if(write && error.unknown == null) error.unknown=true; throw error;}
    finally {clearTimeout(timer);}
  }
  function applySnapshot(data) {
    if(!data.subdivision || data.subdivision.id !== S.sub || !Array.isArray(data.years) || !Array.isArray(data.months)) throw new Error('The forecast snapshot does not match this subdivision.');
    S.snapshot=data;
    for(const [id,entry] of S.entries) {const month=data.months.find(row=>row.id===id);if(entry.phase==='saved'&&(!month||month.forecast!==entry.attempted))S.entries.delete(id);}
    $('summaryFrame').srcdoc='<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\';"><style>body{margin:0;padding:12px;background:#fff} .fm-wrap{border:0!important;padding:0!important;background:#fff!important}</style></head><body>'+String(data.summaryHtml || '')+'</body></html>';
  }
  function builders() {
    if(S.builders) return S.builders;
    if(!S.snapshot) return [];
    return [...new Set([...(S.snapshot.subdivision.builderIds || []),...S.snapshot.years.map(row=>row.builderId)])].filter(id=>id && S.catalog.builders.some(row=>row.id===id));
  }
  function years() {return S.years.length ? S.years : [...new Set([String(M.currentYear(S.snapshot.today)),...S.snapshot.years.map(row=>String(row.year))])];}
  function rows() {return S.snapshot?M.matrix(S.snapshot,builders().sort((a,b)=>name(a).localeCompare(name(b))),years()):[];}
  function controls() {
    ['subPicker','builderPicker','yearPicker','search','add','refresh','export'].forEach(id=>{$(id).disabled=!S.ready || !S.catalog || busy() || (id==='add'||id==='export') && !S.snapshot;});
    document.querySelectorAll('[data-create-builder]').forEach(button=>{button.disabled=busy()||changed();});
    $('check').hidden=!changed(); $('check').disabled=busy(); $('discard').hidden=!changed(); $('discard').disabled=busy();
    $('saveStatus').textContent=S.creating?'Creating forecast year…':S.loading?'Loading…':S.pending?S.pending+' change'+(S.pending===1?'':'s')+' saving…':changed()?'Changes need review':S.snapshot?'All changes saved':'Ready';
    $('saveStatus').dataset.state=busy()?'busy':changed()?'review':'ready';
    $('subText').textContent=S.catalog?(S.catalog.subdivisions.find(row=>row.id===S.sub)||{}).name || 'Choose subdivision':'Choose subdivision';
    $('builderText').textContent=S.builders?S.builders.length+' builder'+(S.builders.length===1?'':'s'):'All for subdivision';
    $('yearText').textContent=S.years.length?S.years.map(year=>'WFY '+year).join(' · '):'All years';
  }
  function renderMetrics(matrix) {
    const all=matrix.flatMap(row=>row.years), forecast=all.reduce((sum,year)=>sum+year.total,0), actual=all.reduce((sum,year)=>sum+year.actual,0), scheduled=all.reduce((sum,year)=>sum+year.scheduled,0), unforecasted=Number(S.snapshot.subdivision.unforecasted||0);
    const metricIcons={forecast:'<path d="M4 16V9m6 7V4m6 12v-5"/>',sold:'<path d="m4 10 4 4 8-8"/>',scheduled:'<rect x="3" y="4" width="14" height="13" rx="2"/><path d="M6 2v4m8-4v4M3 8h14"/>',balance:'<path d="M4 5h12M4 10h12M4 15h8"/>'};
    $('metrics').innerHTML=[['Forecast',forecast,'Selected builders & years','forecast'],['Sold',actual,'Selected builders & years','sold'],['Scheduled',scheduled,'Selected builders & years','scheduled'],['Unforecasted',unforecasted,'Subdivision · future months','balance']].map(([label,value,scope,tone])=>'<div class="metric '+tone+(value<0?' negative':'')+'" title="'+(tone==='balance'?'Subdivision · all builders & future months':scope)+'"><span class="metric-label"><svg viewBox="0 0 20 20" aria-hidden="true">'+metricIcons[tone]+'</svg>'+label+'</span><strong>'+count(value)+'</strong><small>'+scope+'</small></div>').join('');
  }
  function metric(year) {return S.view==='forecast'?year.total:S.view==='actual'?year.actual:year.scheduled;}
  function render() {
    controls();
    if(!S.snapshot || S.snapshot.subdivision.id !== S.sub) {$('workspace').hidden=true; $('empty').hidden=false; return;}
    $('workspace').hidden=false; $('empty').hidden=true;
    $('scopeName').textContent=S.snapshot.subdivision.name; $('scopeCode').textContent=S.snapshot.subdivision.code;
    $('window').textContent=S.snapshot.windowOpen?'Forecasting window open':'Forecasting window closed'; $('window').classList.toggle('closed',!S.snapshot.windowOpen);
    const matrix=rows(), yearList=years().map(String).sort((a,b)=>Number(a)-Number(b));
    renderMetrics(matrix); $('matrix').dataset.view=S.view; $('matrixCount').textContent=matrix.length+' builder'+(matrix.length===1?'':'s')+' · '+yearList.length+' year'+(yearList.length===1?'':'s');
    let html='<thead><tr><th class="builder-column" rowspan="2">Builder</th>';
    html+=yearList.map(year=>'<th colspan="13"><div class="year-heading"><strong>WFY '+esc(year)+'</strong><small>Feb '+esc(year)+' — Jan '+esc(Number(year)+1)+'</small></div></th>').join('')+'</tr><tr>';
    html+=yearList.map(year=>M.months.map((month,index)=>'<th'+(M.start(year,index).slice(0,7)===S.snapshot.today.slice(0,7)?' class="current-month"':'')+' title="'+esc(month)+' '+(index===11?Number(year)+1:year)+'">'+month.slice(0,3).toUpperCase()+'</th>').join('')+'<th class="year-total">TOTAL</th>').join('')+'</tr></thead><tbody>';
    for(const row of matrix) {
      const builderName=name(row.builderId),initials=builderName.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase(),yearCount=row.years.filter(year=>year.parent).length;
      html+='<tr data-builder="'+esc(row.builderId)+'"><th scope="row" class="builder-column"><div class="builder-identity"><span class="builder-avatar" aria-hidden="true">'+esc(initials)+'</span><div class="builder-label"><span class="builder-name" title="'+esc(builderName)+'">'+esc(builderName)+'</span><small>'+yearCount+' fiscal year'+(yearCount===1?'':'s')+'</small></div></div></th>';
      for(const year of row.years) {
        if(year.issue) {html+='<td colspan="13" class="missing-year issue">'+esc(year.issue)+' · Review in Creator</td>';continue;}
        if(!year.parent) {html+='<td colspan="13" class="missing-year"><div class="missing-content"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 2v4m10-4v4M3 9h18m-9 3v5m-2.5-2.5h5"/></svg><span><b>WFY '+esc(year.year)+' not set up</b>12 monthly forecasts</span><button class="btn" data-create-builder="'+esc(row.builderId)+'" data-create-year="'+esc(year.year)+'"'+(busy()?' disabled':'')+'>Add year &amp; months</button></div></td>';continue;}
        html+=year.months.map((month,index)=>{
          const reason=M.lock(month,S.snapshot), entry=month.id?S.entries.get(month.id):null, value=entry?entry.attempted:month.forecast, phase=entry?entry.phase:'', title=reason||'Sold: '+count(month.actual)+' · Scheduled: '+count(month.scheduled);
          return '<td class="month-cell '+(index%3===0?'q-start ':'')+(reason?'locked ':'')+esc(phase)+'"'+(month.id?' data-cell="'+esc(month.id)+'"':'')+' title="'+esc(title)+'">'+(S.view==='forecast'?'<input type="text" inputmode="numeric" autocomplete="off" aria-label="'+esc(name(row.builderId)+' WFY '+year.year+' '+M.months[index]+' forecasted lots')+'"'+(month.id?' data-forecast="'+esc(month.id)+'"':'')+' value="'+esc(value)+'"'+(reason||phase==='pending'||phase==='failed'||phase==='unknown'||busy()&&S.creating?' disabled':'')+' aria-describedby="'+(month.id?'state-'+esc(month.id):'matrixHint')+'"><span class="cell-state"'+(month.id?' id="state-'+esc(month.id)+'"':'')+'>'+stateText(phase,reason)+'</span>':'<strong>'+count(month[S.view])+'</strong><span class="cell-state">'+(month.issue?'Review':'')+'</span>')+'</td>';
        }).join('');
        html+='<td class="year-total" data-total="'+esc(M.key(row.builderId,year.year))+'">'+count(metric(year))+'<small>WFY '+esc(year.year)+'</small></td>';
      }
      html+='</tr>';
    }
    if(!matrix.length) html+='<tr><td colspan="'+(1+13*yearList.length)+'" class="empty-table">Choose builders to view their forecasts.</td></tr>';
    html+='</tbody><tfoot><tr><th class="builder-column">Selected total</th>'+yearList.map(year=>{
      const selected=matrix.map(row=>row.years.find(item=>item.year===year));
      return M.months.map((month,index)=>'<td data-foot="'+esc(year)+'-'+index+'">'+count(selected.reduce((sum,row)=>sum+Number(row.months[index][S.view]||0),0))+'</td>').join('')+'<td class="year-total" data-foot-total="'+esc(year)+'">'+count(selected.reduce((sum,row)=>sum+metric(row),0))+'</td>';
    }).join('')+'</tr></tfoot>';
    $('matrix').innerHTML=html;
  }
  function stateText(phase,reason) {return phase==='pending'?'Saving…':phase==='saved'?icons.check:phase==='failed'?'Not saved':phase==='unknown'?'Check status':reason?'Locked':'';}
  function patch() {
    controls(); if(!S.snapshot) return;
    $('window').textContent=S.snapshot.windowOpen?'Forecasting window open':'Forecasting window closed'; $('window').classList.toggle('closed',!S.snapshot.windowOpen);
    for(const input of document.querySelectorAll('[data-forecast]')) {
      const month=S.snapshot.months.find(row=>row.id===input.dataset.forecast), entry=S.entries.get(input.dataset.forecast), reason=M.lock(month,S.snapshot), phase=entry?entry.phase:'';
      const cell=input.closest('td'); cell.classList.toggle('locked',!!reason);
      ['pending','saved','failed','unknown'].forEach(status=>cell.classList.toggle(status,phase===status));
      input.disabled=!!reason || ['pending','failed','unknown'].includes(phase) || S.creating || S.loading;
      if(document.activeElement!==input && !entry) input.value=month && month.forecast != null ? month.forecast : '';
      $('state-'+input.dataset.forecast).innerHTML=stateText(phase,reason);
      cell.title=entry && entry.error || reason || 'Sold: '+count(month.actual)+' · Scheduled: '+count(month.scheduled);
    }
    const matrix=rows(); renderMetrics(matrix);
    for(const row of matrix) for(const year of row.years) {const cell=document.querySelector('[data-total="'+M.key(row.builderId,year.year)+'"]'); if(cell) cell.innerHTML=count(metric(year))+'<small>WFY '+esc(year.year)+'</small>';}
    for(const year of years().map(String)) {
      const selected=matrix.map(row=>row.years.find(item=>item.year===year));
      M.months.forEach((month,index)=>{const cell=document.querySelector('[data-foot="'+year+'-'+index+'"]'); if(cell) cell.textContent=count(selected.reduce((sum,row)=>sum+Number(row.months[index][S.view]||0),0));});
      const total=document.querySelector('[data-foot-total="'+year+'"]'); if(total) total.textContent=count(selected.reduce((sum,row)=>sum+metric(row),0));
    }
  }
  async function load() {
    if(busy()) return;
    if(!S.sub) {notice('Choose a subdivision.');return;}
    if(changed()) {discardDialog(load);return;}
    closePicker(); S.loading=true; notice(''); patch(); controls();
    try {const data=await request({action:'snapshot',subdivisionId:S.sub});applySnapshot(data);S.entries.clear();render();}
    catch(error) {notice(error.message,true);}
    finally {S.loading=false;patch();controls();}
  }
  function save(input) {
    if(!S.snapshot || input.disabled || S.loading || S.creating) return;
    const id=input.dataset.forecast, month=S.snapshot.months.find(row=>row.id===id);
    let attempted;
    try {attempted=M.value(input.value);const reason=M.lock(month,S.snapshot);if(reason) throw new Error(reason);}
    catch(error) {notice(error.message,true);input.value=month && month.forecast!=null?month.forecast:'';return;}
    if(attempted===month.forecast || attempted==null && month.forecast==null) return;
    const entry={id,subdivisionId:S.sub,attempted,expected:month.forecast==null?null:Number(month.forecast),phase:'pending',month:month.month,year:month.year,builderId:month.builderId};
    S.entries.set(id,entry); S.pending++; notice(''); patch();
    const feedback=window.LMSuccess?LMSuccess.begin('forecast:'+id):null;
    S.queue=S.queue.then(async()=>{
      try {
        const data=await request({action:'save',subdivisionId:entry.subdivisionId,forecastId:id,value:attempted,expected:entry.expected},true);
        if(data.verifiedForecastId !== id || data.verifiedValue !== attempted) throw new Error('The saved forecast could not be verified. Check status.');
        applySnapshot(data); entry.phase='saved';
        if(window.LMSuccess) LMSuccess.inline('forecast:'+id,entry.month+' '+entry.year+' forecast saved.','forecast',()=>entry.phase==='saved'&&S.entries.get(id)===entry,feedback);
      } catch(error) {entry.phase=error.unknown===false?'failed':'unknown';entry.error=error.message;notice(error.message,true);}
      finally {S.pending--;patch();}
    });
  }
  async function checkStatus() {
    if(busy() || !S.snapshot) return;
    S.loading=true;patch();
    try {
      const data=await request({action:'snapshot',subdivisionId:S.sub});applySnapshot(data);
      for(const entry of S.entries.values()) {
        if(!['unknown','failed'].includes(entry.phase)) continue;
        const month=data.months.find(row=>row.id===entry.id && row.subdivisionId===entry.subdivisionId && row.builderId===entry.builderId && String(row.year)===String(entry.year));
        if(month && month.forecast===entry.attempted && data.subdivision.unforecasted===data.subdivision.expectedUnforecasted) {entry.phase='saved';entry.error='';}
        else {entry.phase='failed';entry.error=month && month.forecast===entry.attempted?'The month is saved; subdivision totals need review.':'The change was not verified. The entered value is retained.';}
      }
      notice(changed()?'Some changes need review. Your entered values are retained.':'Forecast values verified.',changed());
    } catch(error) {notice(error.message,true);}
    finally {S.loading=false;patch();}
  }
  function openDialog(title,kicker,body,action,actionText) {
    closePicker(); S.focus=document.activeElement; S.dialog={action};
    $('dialogTitle').textContent=title;$('dialogKicker').textContent=kicker;$('dialogBody').innerHTML=body;
    $('dialogStatus').textContent='';$('dialogAction').textContent=actionText;$('dialogAction').hidden=!action;$('dialogAction').disabled=false;
    $('dialogClose').disabled=false;$('dialogCancel').hidden=false;$('dialogCancel').textContent='Cancel';$('dialogCancel').disabled=false;
    $('modal').hidden=false;$('app').inert=true;$('dialogClose').focus();
  }
  function closeDialog() {if(S.creating)return;closePicker();$('modal').hidden=true;$('app').inert=false;S.dialog=null;if(S.focus&&S.focus.isConnected)S.focus.focus();}
  function discardDialog(next) {
    const changes=[...S.entries.values()].filter(entry=>['failed','unknown'].includes(entry.phase));
    openDialog('Discard local changes?','FORECAST CHANGES','<ul class="review-list">'+changes.map(entry=>'<li>'+esc(name(entry.builderId)+' · '+entry.month+' '+entry.year)+' · '+esc(entry.attempted==null?'Blank':entry.attempted)+'</li>').join('')+'</ul><p class="dialog-note">Saved Creator values stay unchanged.</p>',()=>{S.entries.clear();closeDialog();render();notice('');if(next)next();},'Discard local changes');
  }
  function addDialog(builderId,year) {
    if(busy() || !S.snapshot || changed()) {if(changed())notice('Check the pending changes before adding a forecast year.',true);return;}
    S.newBuilder=builderId||builders()[0]||'';S.newYear=String(year||M.currentYear(S.snapshot.today)+1);
    openDialog('Add forecast year','FORECAST YEAR','<div class="route"><strong>'+esc(S.snapshot.subdivision.name)+'</strong>'+esc(S.snapshot.subdivision.code)+'</div><div class="dialog-fields"><div class="filter"><label id="newBuilderLabel">Builder</label><button class="picker" data-picker="newBuilder" aria-labelledby="newBuilderLabel newBuilderText" aria-haspopup="dialog"><span id="newBuilderText"></span><svg viewBox="0 0 20 20"><path d="m5 7 5 5 5-5"/></svg></button></div><div class="filter"><label id="newYearLabel">Fiscal year</label><button class="picker" data-picker="newYear" aria-labelledby="newYearLabel newYearText" aria-haspopup="dialog"><span id="newYearText"></span><svg viewBox="0 0 20 20"><path d="m5 7 5 5 5-5"/></svg></button></div></div><p class="dialog-note" id="newRange"></p>',createYear,'Create forecast year');updateNew();
  }
  function updateNew() {if($('newBuilderText')){$('newBuilderText').textContent=S.newBuilder?name(S.newBuilder):'Choose builder';$('newYearText').textContent='WFY '+S.newYear;$('newRange').textContent='February '+S.newYear+' — January '+(Number(S.newYear)+1)+' · 12 monthly forecasts';}}
  async function createYear() {
    if(S.creating || !S.newBuilder || !S.newYear) return;
    const destination={builderId:S.newBuilder,year:S.newYear,subdivisionId:S.sub};
    if(M.verifyEnsure(S.snapshot,destination.builderId,destination.year)) {notice('That builder already has a complete forecast for WFY '+destination.year+'.');closeDialog();return;}
    S.creating=true;controls();patch();closePicker();
    $('dialogTitle').textContent='Creating forecast year';$('dialogAction').hidden=true;$('dialogCancel').hidden=true;$('dialogClose').disabled=true;
    $('dialogBody').innerHTML='<div class="route"><strong>'+esc(name(destination.builderId))+' → WFY '+esc(destination.year)+'</strong>'+esc(S.snapshot.subdivision.name)+' · 1 year + 12 months</div><div class="progress-track" role="progressbar" aria-label="Verified forecast records" aria-valuemin="0" aria-valuemax="13" aria-valuenow="0"><div id="progressFill" class="progress-fill"></div></div><div class="stages"><div class="stage done" id="stage0"><b>1</b><span>Check selection</span><small>Done</small></div><div class="stage" id="stage1"><b>2</b><span>Create year &amp; months</span><small>Running</small></div><div class="stage" id="stage2"><b>3</b><span>Verify all 12 months</span><small>Up next</small></div></div><div id="creationResult" hidden></div><div id="creationLedger" class="result-list"></div>';
    $('dialogStatus').textContent='Creating records in '+LMRuntime.current().environment.toLowerCase()+'…';
    let unknown=false,completed=false;
    try {
      const data=await request({action:'ensure',...destination},true);
      applySnapshot(data);
      if(!M.verifyEnsure(data,destination.builderId,destination.year) || !data.ensuredParentId || !data.years.some(row=>row.id===data.ensuredParentId && row.builderId===destination.builderId && String(row.year)===destination.year)) throw new Error('The complete forecast year could not be verified. Check status.');
      if(S.builders && !S.builders.includes(destination.builderId))S.builders.push(destination.builderId);
      if(S.years.length && !S.years.includes(destination.year))S.years.push(destination.year);
      creationResult(data.createdParent?'Forecast year created successfully.':'Forecast year verified.',false);completed=true;render();
    } catch(error) {unknown=error.unknown!==false;creationResult(error.message,true);}
    finally {
      S.creating=false;$('dialogClose').disabled=false;$('dialogCancel').hidden=false;$('dialogCancel').textContent='Close';$('dialogStatus').textContent=unknown?'The result needs review. No automatic retry.':completed?'Complete':'No records created';controls();patch();
      if(unknown) {$('dialogAction').hidden=false;$('dialogAction').textContent='Check status';S.dialog.action=()=>checkCreation(destination);}
      else {S.dialog.action=null;}
    }
  }
  function creationResult(message,error) {
    $('dialogTitle').textContent=error?'Forecast year needs review':'Forecast year ready';
    const host=$('creationResult');host.hidden=false;host.className='result'+(error?' error':'');host.textContent=message;
    if(!error) {['stage1','stage2'].forEach(id=>{$(id).classList.add('done');$(id).querySelector('small').textContent='Done';});$('progressFill').style.width='100%';$('progressFill').parentElement.setAttribute('aria-valuenow','13');$('creationLedger').innerHTML=M.months.map(month=>'<span>'+icons.check+esc(month)+'</span>').join('');}
    else {$('stage1').querySelector('small').textContent='Needs review';$('stage2').querySelector('small').textContent='Not verified';}
  }
  async function checkCreation(destination) {
    if(S.creating) return;S.creating=true;$('dialogAction').disabled=true;$('dialogClose').disabled=true;$('dialogCancel').disabled=true;controls();
    try {const data=await request({action:'snapshot',subdivisionId:destination.subdivisionId});applySnapshot(data);if(!M.verifyEnsure(data,destination.builderId,destination.year)) throw new Error('The forecast year is incomplete or missing. Review the records in development before trying again.');creationResult('Forecast year and all 12 months verified.',false);if(S.builders && !S.builders.includes(destination.builderId))S.builders.push(destination.builderId);if(S.years.length && !S.years.includes(destination.year))S.years.push(destination.year);$('dialogAction').hidden=true;$('dialogStatus').textContent='Verified';render();}
    catch(error) {creationResult(error.message,true);}
    finally {S.creating=false;$('dialogAction').disabled=false;$('dialogClose').disabled=false;$('dialogCancel').disabled=false;patch();}
  }
  function closePicker() {if(S.picker){const p=S.picker; p.element.remove();p.anchor.setAttribute('aria-expanded','false');S.picker=null;}}
  function pickerOptions(kind) {
    if(kind==='sub')return S.catalog.subdivisions.map(row=>({id:row.id,label:row.name,detail:row.code}));
    if(kind==='builders'||kind==='newBuilder')return S.catalog.builders.map(row=>({id:row.id,label:row.name}));
    const first=kind==='newYear'?2019:2018,last=kind==='newYear'?2046:2050;
    return Array.from({length:last-first+1},(_,index)=>({id:String(first+index),label:'WFY '+(first+index),detail:'Feb '+(first+index)+' — Jan '+(first+index+1)}));
  }
  function openPicker(anchor,kind) {
    if(S.picker && S.picker.anchor===anchor) {closePicker();return;}
    closePicker();const multi=kind==='builders'||kind==='years', current=kind==='sub'?S.sub:kind==='newBuilder'?S.newBuilder:kind==='newYear'?S.newYear:kind==='builders'?S.builders:S.years;
    const p={anchor,kind,multi,all:kind==='builders'?S.builders===null:kind==='years'?S.years.length===0:false,selected:new Set(multi?current||[]:[current]),options:pickerOptions(kind)};
    p.element=document.createElement('section');p.element.className='popover';p.element.setAttribute('role','dialog');p.element.setAttribute('aria-label','Choose '+kind.replace('new',''));p.element.innerHTML='<header>Choose '+(kind.includes('Year')||kind==='years'?'fiscal year':kind==='sub'?'subdivision':'builders')+'<button class="close-btn" data-pop-close aria-label="Close picker">'+icons.close+'</button></header><input aria-label="Search options" placeholder="Search…"><div class="options"></div>'+(multi?'<footer><button class="btn" data-pop-all>All</button><button class="btn" data-pop-clear>Clear</button><button class="btn" data-pop-visible>Select visible</button><button class="btn primary" data-pop-done>Done</button></footer>':'');
    ($('modal').hidden?document.body:$('modal').querySelector('.dialog')).appendChild(p.element);S.picker=p;anchor.setAttribute('aria-expanded','true');drawOptions(p);
    const rect=anchor.getBoundingClientRect(), height=p.element.offsetHeight;p.element.style.width=Math.max(280,Math.min(380,rect.width))+'px';p.element.style.left=Math.max(12,Math.min(rect.left,innerWidth-p.element.offsetWidth-12))+'px';p.element.style.top=Math.max(12,rect.bottom+height<innerHeight-12?rect.bottom+7:rect.top-height-7)+'px';p.element.querySelector('input').focus();
    if(!p.all){const selected=p.element.querySelector('.option[aria-pressed="true"]');if(selected)selected.scrollIntoView({block:'nearest',inline:'nearest'});}
    p.element.querySelector('input').addEventListener('input',()=>drawOptions(p));
    p.element.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button)return;
      if(button.hasAttribute('data-pop-close')){closePicker();anchor.focus();return;}
      if(button.hasAttribute('data-pop-all')){p.all=true;p.selected.clear();drawOptions(p);return;}
      if(button.hasAttribute('data-pop-clear')){p.all=false;p.selected.clear();drawOptions(p);return;}
      if(button.hasAttribute('data-pop-visible')){p.all=false;p.visible.forEach(option=>p.selected.add(option.id));drawOptions(p);return;}
      if(button.hasAttribute('data-pop-done')){commitPicker(p);return;}
      if(button.dataset.option){const id=button.dataset.option;p.all=false;if(multi){p.selected.has(id)?p.selected.delete(id):p.selected.add(id);drawOptions(p);}else{p.selected=new Set([id]);commitPicker(p);}}
    });
  }
  function drawOptions(p) {
    const query=p.element.querySelector('input').value.toLowerCase();p.visible=p.options.filter(option=>(option.label+' '+(option.detail||'')).toLowerCase().includes(query));
    p.element.querySelector('.options').innerHTML=p.visible.map(option=>'<button class="option" data-option="'+esc(option.id)+'" aria-pressed="'+(p.all||p.selected.has(option.id))+'"><span>'+esc(option.label)+(option.detail?'<small>'+esc(option.detail)+'</small>':'')+'</span><i>'+(p.all||p.selected.has(option.id)?icons.check:'')+'</i></button>').join('')||'<div class="empty-table">No matches</div>';
  }
  function commitPicker(p) {
    const values=[...p.selected];
    if((p.kind==='sub'||p.kind==='builders'||p.kind==='years') && changed()){closePicker();notice('Check or discard local changes before changing filters.',true);return;}
    if(p.kind==='sub'){S.sub=values[0]||'';S.snapshot=null;S.entries.clear();}
    if(p.kind==='builders')S.builders=p.all?null:values;
    if(p.kind==='years'){if(!p.all&&!values.length){notice('Choose at least one fiscal year.');return;}S.years=p.all?[]:values;}
    if(p.kind==='newBuilder')S.newBuilder=values[0]||'';
    if(p.kind==='newYear')S.newYear=values[0]||'';
    closePicker();updateNew();if(p.kind==='sub'||p.kind==='builders'||p.kind==='years')render();p.anchor.focus();
  }
  function exportCsv() {
    if(busy()||!S.snapshot)return;
    const matrix=rows(), fields=['Subdivision','Code','Builder','WFY','Month','Calendar month','Forecasted lots','Sold lots','Scheduled lots'];
    const lines=[fields,...matrix.flatMap(row=>row.years.flatMap(year=>year.months.map(month=>[S.snapshot.subdivision.name,S.snapshot.subdivision.code,name(row.builderId),year.year,month.month,month.start.slice(0,7),month.id&&month.forecast!=null?month.forecast:'',month.id&&month.actual!=null?month.actual:'',month.id&&month.scheduled!=null?month.scheduled:''])))];
    const cell=value=>{const s=String(value);return '"'+(/^[=+@-]/.test(s)?"'":'')+s.replace(/"/g,'""')+'"';};
    const url=URL.createObjectURL(new Blob(['\ufeff'+lines.map(line=>line.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='Forecasts-'+S.snapshot.subdivision.code.replace(/[^a-z0-9_-]/gi,'-')+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    if(window.LMSuccess)LMSuccess.show('Forecast CSV ready.');
  }
  document.addEventListener('click',event=>{
    const picker=event.target.closest('[data-picker]');if(picker&&!picker.disabled){openPicker(picker,picker.dataset.picker);return;}
    if(S.picker&&!S.picker.element.contains(event.target)&&!S.picker.anchor.contains(event.target))closePicker();
    const create=event.target.closest('[data-create-builder]');if(create&&!create.disabled)addDialog(create.dataset.createBuilder,create.dataset.createYear);
    const view=event.target.closest('[data-view]');if(view&&!busy()){S.view=view.dataset.view;document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',button===view));render();}
  });
  $('matrix').addEventListener('change',event=>{if(event.target.dataset.forecast)save(event.target);});
  $('matrix').addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.dataset.forecast){event.preventDefault();const inputs=[...document.querySelectorAll('[data-forecast]:not(:disabled)')],next=inputs[inputs.indexOf(event.target)+(event.shiftKey?-1:1)];event.target.blur();if(next)next.focus();}});
  $('search').addEventListener('click',load);$('refresh').addEventListener('click',load);$('add').addEventListener('click',()=>addDialog());$('check').addEventListener('click',checkStatus);$('discard').addEventListener('click',()=>discardDialog());$('export').addEventListener('click',exportCsv);
  $('dialogClose').addEventListener('click',closeDialog);$('dialogCancel').addEventListener('click',closeDialog);$('dialogAction').addEventListener('click',()=>{if(S.dialog&&S.dialog.action&&!$('dialogAction').disabled)S.dialog.action();});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){if(S.picker){const anchor=S.picker.anchor;closePicker();anchor.focus();}else if(S.dialog){event.preventDefault();closeDialog();}return;}
    const container=S.picker?S.picker.element:S.dialog?$('modal'):null;
    if(event.key==='Tab'&&container){const items=[...container.querySelectorAll('button:not(:disabled),input:not(:disabled),[tabindex="0"]')].filter(element=>!element.hidden&&element.getClientRects().length);if(!items.length){event.preventDefault();return;}const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  });
  window.addEventListener('resize',closePicker);$('matrixScroll').addEventListener('scroll',closePicker);
  async function boot() {
    let timer;
    try {
      $('saveStatus').textContent='Identifying Creator session…';
      const context=window.LMFrontendContext&&LMFrontendContext.params?LMRuntime.apply(LMFrontendContext.params):await Promise.race([LMRuntime.capture(),new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(new Error('Creator session initialization timed out. Reload this Page in Creator.')),15000);})]);
      if(context.environment==='UNKNOWN'||!context.user||context.user==='(unknown)')throw new Error('Creator did not identify the connected user and environment.');
      S.ready=true;$('environment').textContent=context.environment;$('environment').classList.toggle('dev',context.environment!=='PRODUCTION');
      LMCriticalErrors.configure({apiCandidates:[LMRuntime.apiName('Report_Proforma_Widget_Error')]});forecastReporterReady();
      S.catalog=await request({action:'catalog'});if(!Array.isArray(S.catalog.subdivisions)||!Array.isArray(S.catalog.builders))throw new Error('Forecast choices are unavailable.');
      S.years=[String(M.currentYear(S.catalog.today)),String(M.currentYear(S.catalog.today)+1)];controls();
    } catch(error) {S.ready=false;notice(error.message+' Forecast Manager setup may be required in this Creator environment.',true);$('saveStatus').textContent='Connection unavailable';$('saveStatus').dataset.state='review';}
    finally {clearTimeout(timer);}
  }
  window.ForecastApp=Object.freeze({decode});
  boot();
})();
