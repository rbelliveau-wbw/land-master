(function(root){
  'use strict';
  const REPORT='Workflow_Run_Log_Report',FAILED=new Set(['Failed','Partial','Timed Out']);
  const fields=['ID','Workflow_Name','External_System','Run_Status','Started_At','Finished_At','Duration_Seconds','Stage','External_Reference','Rows_Received','Rows_Processed','Rows_Created','Rows_Updated','Rows_Skipped','Rows_Failed','Message','Details','Failure_Notified','Notification_Error'];
  const state={rows:[],days:7,loadedDays:7,failures:false,search:'',descending:true,page:0,loaded:false,busy:false,error:'',actor:'',generation:0};
  let host=null,settings=null,motion=null,numbers=null;
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function context(){const c=root.LMRuntime&&root.LMRuntime.current();return c&&['DEVELOPMENT','STAGE','PRODUCTION'].includes(c.environment)&&c.user&&c.user!=='(unknown)'?JSON.stringify([c.appLinkName,c.environment,c.user,settings&&settings.recId]):'';}
  function allowed(){return !!(settings&&settings.live&&!settings.demo&&settings.ready&&!settings.loadBlocked&&settings.recId&&context());}
  function dateOrder(value){
    const text=String(value||''),m=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?/i);
    if(m){let hour=Number(m[4]);if(m[7])hour=hour%12+(/^p/i.test(m[7])?12:0);return Date.UTC(Number(m[3]),Number(m[1])-1,Number(m[2]),hour,Number(m[5]),Number(m[6]||0));}
    return Date.parse(text)||0;
  }
  function cutoff(days,now){
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now||new Date());
    const get=type=>parts.find(p=>p.type===type).value;
    const d=new Date(Date.UTC(Number(get('year')),Number(get('month'))-1,Number(get('day'))-(days-1)));
    return String(d.getUTCMonth()+1).padStart(2,'0')+'/'+String(d.getUTCDate()).padStart(2,'0')+'/'+d.getUTCFullYear()+' 12:00:00 AM';
  }
  function visible(){const needle=state.search.trim().toLowerCase();return state.rows.filter(row=>(!state.failures||FAILED.has(row.Run_Status))&&(!needle||[row.Workflow_Name,row.External_System,row.Stage,row.Message].join(' ').toLowerCase().includes(needle))).slice().sort((a,b)=>(dateOrder(a.Started_At)-dateOrder(b.Started_At)||String(a.ID).localeCompare(String(b.ID)))*(state.descending?-1:1));}
  function nativeUrl(){let c=root.LMRuntime&&root.LMRuntime.current();if(!c||!allowed())return '';const base='https://creatorapp.zoho.com/wbdevelopment/';return base+(c.environment==='PRODUCTION'?'':'environment/'+c.environment.toLowerCase()+'/')+'land-master/#Report:'+REPORT;}
  function card(){return '<section class="card" id="sec-workflow-log"><header><h2>Workflow Log</h2></header><div id="workflow-log" data-lm-motion="panel"></div></section>';}
  function count(row,field){const n=Number(row[field]);return Number.isSafeInteger(n)&&n>=0?String(n):'—';}
  function rowHtml(row){const id=String(row.ID),status=String(row.Run_Status||'Unknown'),notified=row.Failure_Notified===true||String(row.Failure_Notified).toLowerCase()==='true';return '<tr data-wl-id="'+esc(id)+'"><td class="wl-time">'+esc(row.Started_At||'—')+'<div class="wl-system">Finished '+esc(row.Finished_At||'—')+'</div></td><td><b>'+esc(row.Workflow_Name)+'</b><div class="wl-system">'+esc(row.External_System)+' · '+esc(row.Stage)+'</div></td><td><span class="wl-status '+esc(status.toLowerCase().replace(/ /g,'-'))+'">'+esc(status)+'</span></td><td class="wl-counts"><span data-wl-number="received">'+count(row,'Rows_Received')+'</span> received · <span data-wl-number="processed">'+count(row,'Rows_Processed')+'</span> processed<small><span data-wl-number="created">'+count(row,'Rows_Created')+'</span> created · <span data-wl-number="updated">'+count(row,'Rows_Updated')+'</span> updated · <span data-wl-number="skipped">'+count(row,'Rows_Skipped')+'</span> skipped · <span data-wl-number="failed">'+count(row,'Rows_Failed')+'</span> failed</small></td><td class="wl-counts"><span data-wl-number="duration">'+esc(row.Duration_Seconds==null||row.Duration_Seconds===''?'—':row.Duration_Seconds)+'</span> sec</td><td><details class="wl-details" data-wl-detail="'+esc(id)+'"><summary>Details</summary><dl><dt>Run ID</dt><dd>'+esc(id)+'</dd><dt>External reference</dt><dd>'+esc(row.External_Reference||'—')+'</dd><dt>Failure email</dt><dd>'+esc(notified?'Sent':FAILED.has(status)?'Not sent':'Not required')+'</dd></dl><pre>'+esc([row.Message,row.Details,row.Notification_Error&&'EMAIL ERROR: '+row.Notification_Error].filter(Boolean).join('\n\n')||'No additional details.')+'</pre></details></td></tr>';}
  function render(){
    if(!host)return;
    if(state.actor&&(state.actor!==context()||!allowed())){state.rows=[];state.loaded=false;state.actor='';state.generation++;}
    const open=new Set(Array.from(host.querySelectorAll('details[open]'),node=>node.dataset.wlDetail)),focus=host.querySelector(':focus'),focusName=focus&&(focus.dataset.wlControl||focus.getAttribute('name')),caret=focus&&focus.selectionStart;
    const filtered=visible();state.page=Math.min(state.page,Math.max(0,Math.ceil(filtered.length/50)-1));const rows=filtered.slice(state.page*50,state.page*50+50),url=nativeUrl();
    host.innerHTML='<div class="wl-controls"><div class="wl-tabs" role="tablist" aria-label="Workflow log dates" data-lm-motion="tabs">'+[[1,'Today'],[7,'7 days'],[30,'30 days']].map(pair=>'<button type="button" role="tab" data-wl-days="'+pair[0]+'" data-wl-control="days-'+pair[0]+'" aria-selected="'+(state.days===pair[0])+'">'+pair[1]+'</button>').join('')+'</div><label class="wl-failures"><input type="checkbox" data-wl-failures data-wl-control="failures" '+(state.failures?'checked':'')+'> Failures only</label><input type="search" name="workflow-search" data-wl-control="search" placeholder="Search workflows…" aria-label="Search workflow log" value="'+esc(state.search)+'"><div class="wl-toolbar"><button type="button" class="btn" data-wl-refresh data-wl-control="refresh" '+(state.busy||!allowed()?'disabled':'')+'>'+(state.busy?'Loading…':'Load runs')+'</button>'+(url?'<a class="btn" target="_blank" rel="noopener" href="'+esc(url)+'">Full report</a>':'')+'</div></div>'+(state.error?'<div class="wl-error" role="alert">'+esc(state.error)+'</div>':'')+'<div class="wl-scroll"><table class="wl-table"><thead><tr><th aria-sort="'+(state.descending?'descending':'ascending')+'"><button type="button" data-wl-sort data-wl-control="sort">Date &amp; time '+(state.descending?'↓':'↑')+'</button></th><th>Workflow / system</th><th>Status</th><th>Rows</th><th>Duration</th><th>Details</th></tr></thead><tbody>'+rows.map(rowHtml).join('')+'</tbody></table>'+(!rows.length?'<div class="wl-empty">'+(!allowed()?'Connect to Creator to view runs.':state.loaded?'No matching runs.':'Load runs to view workflow history.')+'</div>':'')+'</div><div class="wl-meta"><span><span data-wl-total>'+filtered.length+'</span> matched · America/Chicago</span><div><button class="btn" type="button" data-wl-prev '+(state.page===0?'disabled':'')+'>Previous</button> <span>Page '+(state.page+1)+' of '+Math.max(1,Math.ceil(filtered.length/50))+'</span> <button class="btn" type="button" data-wl-next '+((state.page+1)*50>=filtered.length?'disabled':'')+'>Next</button></div><span role="status" data-lm-motion="feedback" data-state="'+(state.busy?'pending':state.error?'error':'ready')+'">'+(state.busy?'Reading complete log history…':state.loaded?'Complete selected date range':'')+'</span></div>';
    for(const detail of host.querySelectorAll('details'))detail.open=open.has(detail.dataset.wlDetail);
    if(focusName){const replacement=host.querySelector('[data-wl-control="'+focusName+'"]');if(replacement){replacement.focus({preventScroll:true});if(typeof caret==='number'&&replacement.setSelectionRange)try{replacement.setSelectionRange(caret,caret);}catch(ignore){}}}
  }
  async function load(){
    if(state.busy||!allowed())return false;
    const actor=context(),generation=++state.generation,days=state.days;
    state.busy=true;state.error='';
    const refresh=host&&host.querySelector('[data-wl-refresh]'),status=host&&host.querySelector('[role="status"]');
    if(refresh){refresh.disabled=true;refresh.textContent='Loading…';}
    if(status){status.dataset.state='pending';status.textContent=state.loaded?'Loading; previous results remain visible…':'Reading complete log history…';}
    try{
      const rows=await root.LMData.readAll({reportName:REPORT,criteria:"(Started_At >= '"+cutoff(days)+"')",fields,fresh:true,isCancelled:()=>context()!==actor||generation!==state.generation});
      if(context()!==actor||generation!==state.generation)return false;
      if(rows.some(row=>typeof row.ID!=='string'||!dateOrder(row.Started_At)||!row.Workflow_Name||!row.Run_Status))throw new Error('Workflow history is missing required fields. Open the full report or refresh.');
      state.rows=rows;state.actor=actor;state.loaded=true;state.loadedDays=days;state.page=0;return true;
    }catch(error){if(context()!==actor||error.permissionDenied){state.rows=[];state.loaded=false;state.actor='';}if(!error.cancelled)state.error=error.message||'Workflow history could not be loaded.';return false;}
    finally{state.busy=false;if(host)render();}
  }
  function mount(options){
    settings=options.state;host=document.getElementById('workflow-log');if(!host)return;
    render();
    host.onclick=event=>{const day=event.target.closest('[data-wl-days]');if(day){if(state.busy)return;state.days=Number(day.dataset.wlDays);host.querySelectorAll('[data-wl-days]').forEach(button=>button.setAttribute('aria-selected',String(Number(button.dataset.wlDays)===state.days)));load();return;}if(event.target.closest('[data-wl-refresh]')){load();return;}if(event.target.closest('[data-wl-sort]')){state.descending=!state.descending;state.page=0;render();}if(event.target.closest('[data-wl-prev]')&&state.page>0){state.page--;render();}if(event.target.closest('[data-wl-next]')&&(state.page+1)*50<visible().length){state.page++;render();}};
    host.onchange=event=>{if(event.target.matches('[data-wl-failures]')){state.failures=event.target.checked;state.page=0;render();}};
    host.oninput=event=>{if(event.target.name==='workflow-search'){state.search=event.target.value;state.page=0;render();}};
    // Explicit feature registry uses the shared engines; IDs and dates never animate.
    if(!motion&&root.LMMotion)motion=root.LMMotion.start({module:'settings-workflow-log',ready:allowed,actor:context,tabs:[{selector:'.wl-tabs',items:'[role="tab"]'}],panels:[{selector:'#workflow-log'}],lists:[{selector:'.wl-table tbody',rows:'tr[data-wl-id]',key:row=>row.dataset.wlId,scope:context,highlight:false}],feedback:[{selector:'#workflow-log [role="status"]',state:node=>node.dataset.state}],surfaces:[],meters:[]});
    if(!numbers&&root.LMNumbers)numbers=root.LMNumbers.start({module:'settings-workflow-log',ready:allowed,actor:context,collect(api){api.each('#workflow-log [data-wl-number]',node=>api.text(node,['workflow-log',context(),node.closest('[data-wl-id]').dataset.wlId,node.dataset.wlNumber]));api.each('#workflow-log [data-wl-total]',node=>api.text(node,['workflow-log',context(),'shown']));}});
  }
  function ensureLoaded(){if(!state.loaded||state.actor!==context())return load();return Promise.resolve(true);}
  root.LMWorkflowLog=Object.freeze({card,mount,load,ensureLoaded,dateOrder,cutoff,visible});
})(window);
