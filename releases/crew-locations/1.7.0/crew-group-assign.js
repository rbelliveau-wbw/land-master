/* A captured foreman's active timecard group; reuses validated single-employee writes. */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id),S={run:null,busy:false,adapter:null,scope:'',returnFocus:null};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const done=r=>['saved','unchanged','inactive'].includes(r.state),unknown=()=>S.run?.rows.some(r=>r.state==='unknown'||r.state==='saving')===true;
 const actor=()=>{const c=S.adapter.context();return c.user+':'+c.environment;},key=()=> 'crew-group:pending:'+actor();
 const validId=v=>typeof v==='string'&&/^\d+$/.test(v);
 function redact(){$('groupDialog').close();$('app').inert=false;$('groupResults').replaceChildren();$('groupContext').textContent='';$('groupStatus').textContent='';S.run=null;S.busy=false;S.adapter.setBusy(false);}
 function persist(){try{sessionStorage.setItem(key(),JSON.stringify(S.run));return true;}catch{if(S.run)S.run.message='Recovery information could not be stored. No further updates were sent.';return false;}}
 function mount(){
  const run=S.run;if(!run)return;
  $('groupContext').textContent=run.foremanName+' → '+run.crewLabel;
  $('groupResults').innerHTML=run.rows.map(r=>'<li data-group-row="'+esc(r.id)+'"><span>'+esc(r.name)+'</span><strong></strong><small></small></li>').join('');
  $('app').inert=true;if(!$('groupDialog').open)$('groupDialog').showModal();paint();
 }
 function paint(){
  if(!S.run)return;const r=S.run,total=r.rows.length,confirmed=r.rows.filter(done).length,saved=r.rows.filter(x=>x.state==='saved').length;
  $('groupTitle').textContent=r.phase==='saved'?'Crew Assignments Updated':r.phase==='unknown'?'Crew Update Needs Review':r.phase==='partial'?'Some Assignments Need Attention':'Updating Crew Assignments';
  $('groupStatus').textContent=r.message||saved+' of '+total+' employees saved';
  $('groupStatus').dataset.state=r.phase==='unknown'?'unknown':r.phase==='partial'?'error':r.phase==='saved'?'saved':'pending';
  $('groupBar').style.width=(total?confirmed/total*100:0)+'%';$('groupBar').parentElement.setAttribute('aria-valuenow',String(total?Math.round(confirmed/total*100):0));
  $('groupStages').querySelectorAll('[data-group-stage]').forEach(n=>{const stage=n.dataset.groupStage,status=stage==='checking'?(r.checked?'Done':S.busy?'Running':'Needs Review'):stage==='saving'?(r.phase==='saved'?'Done':S.busy&&r.phase==='saving'?'Running':['partial','unknown'].includes(r.phase)?'Needs Review':'Up Next'):(r.phase==='saved'?'Done':['partial','unknown'].includes(r.phase)?'Needs Review':'Up Next');n.dataset.status=status;n.querySelector('small').textContent=status;});
  const labels={waiting:'Not Sent',saving:'Saving…',saved:'Saved',unchanged:'Already Assigned',inactive:'Inactive · Kept',failed:'Not Saved',unknown:'Needs Review'};
  $('groupResults').querySelectorAll('[data-group-row]').forEach(n=>{const row=r.rows.find(x=>x.id===n.dataset.groupRow);n.dataset.state=row.state;n.querySelector('strong').textContent=labels[row.state];n.querySelector('small').textContent=row.message||'';});
  $('groupClose').disabled=S.busy;$('groupDone').disabled=S.busy;$('groupCheck').hidden=!unknown();$('groupCheck').disabled=S.busy;
  $('groupContinue').hidden=unknown()||!r.rows.some(x=>['waiting','failed'].includes(x.state));$('groupContinue').disabled=S.busy||!S.adapter.canWrite();
  $('groupReview').hidden=!unknown()&&r.phase==='saved';
 }
 function acknowledge(result,row){
  if(result.state!=='saved'||result.requestId!==row.body.requestId||result.recordId!==row.id||result.kind!=='employee')throw Object.assign(Error('The saved employee identity needs review.'),{unknown:true});
  S.adapter.acceptSaved(result,row.body);row.state='saved';row.message='';
 }
 async function execute(){
  if(S.busy||!S.run||unknown()||!S.adapter.canWrite())return;
  const run=S.run,scope=S.adapter.scope();S.scope=scope;S.busy=true;S.adapter.setBusy(true);run.phase='checking';run.checked=false;run.message='Checking '+run.rows.length+' employees…';paint();
  try{
   const fresh=await S.adapter.readFresh(()=>S.run!==run||scope!==S.adapter.scope());if(S.run!==run||scope!==S.adapter.scope())throw Error('Your session changed. No further updates were sent.');
   const byId=new Map(fresh.map(r=>[r.ID,r]));if(byId.size!==fresh.length)throw Error('Employee identities are incomplete.');
   if(run.rows.some(row=>!byId.has(row.id)))throw Error('An employee is no longer available to your account.');
   const foreman=byId.get(run.foremanId);if(!(foreman.IsActive===true||String(foreman.IsActive).toLowerCase()==='true'))throw Error('The foreman is inactive. No further updates were sent.');
   for(const row of run.rows.filter(x=>!done(x))){const native=byId.get(row.id);if(!native)throw Error('An employee is no longer available to your account.');
    const active=native.IsActive===true||String(native.IsActive).toLowerCase()==='true';
    if(!active){if(row.id===run.foremanId)throw Error('The foreman is inactive. No further updates were sent.');row.state='inactive';continue;}
    const current=root.CrewModel.id(native.Crew);if(current===run.crewId){row.state='unchanged';continue;}
    row.state='waiting';row.body={action:'save-employee',requestId:crypto.randomUUID(),employee:{id:row.id,territory:native.Territory||'N/A',laborType:native.Labor_Type||'',crewId:run.crewId}};row.message='';
   }
   run.checked=true;run.phase='saving';if(!persist())throw Error(run.message);paint();
   for(const row of run.rows.filter(x=>x.state==='waiting')){
    if(S.run!==run||scope!==S.adapter.scope())throw Error('Your session changed. No further updates were sent.');
    row.state='saving';run.message='Saving '+row.name+'…';if(!persist()){row.state='waiting';throw Error(run.message);}paint();
    try{const result=await S.adapter.api(row.body,true);if(S.run!==run||scope!==S.adapter.scope())throw Object.assign(Error('The session changed before the save reply.'),{unknown:true});acknowledge(result,row);if(!persist())break;paint();}
    catch(error){row.state=error.unknown?'unknown':'failed';row.message=error.message;run.message=error.message;break;}
   }
   run.phase=unknown()?'unknown':run.rows.every(done)?'saved':'partial';
   if(run.phase==='saved'){const saved=run.rows.filter(r=>r.state==='saved').length,kept=run.rows.filter(r=>r.state==='inactive').length;const unchanged=run.rows.filter(r=>r.state==='unchanged').length;run.message=saved+' employees saved'+(unchanged?' · '+unchanged+' already assigned':'')+(kept?' · '+kept+' inactive employees kept':'')+'.';}
  }catch(error){run.phase=unknown()?'unknown':'partial';run.message=error.message;}
  finally{
   if(S.run!==run)return;S.busy=false;S.adapter.setBusy(false);if(actor()===run.actor){S.adapter.setPending(unknown());persist();S.adapter.settled();paint();}
  }
 }
 function start(plan){
  if(S.busy||unknown()||!S.adapter.canWrite())return;
  if(!validId(plan.foremanId)||plan.crewId!==''&&!validId(plan.crewId)||!Array.isArray(plan.rows)||!plan.rows.length||plan.rows.some(r=>!validId(r.id)))throw Error('The crew group is incomplete.');
  const rows=[...new Map(plan.rows.map(r=>[r.id,{id:r.id,name:r.name,state:'waiting'}])).values()];if(!rows.some(r=>r.id===plan.foremanId))throw Error('The foreman is unavailable.');
  S.returnFocus=plan.returnFocus;S.run={actor:actor(),foremanId:plan.foremanId,foremanName:plan.foremanName,crewId:plan.crewId,crewLabel:plan.crewLabel,rows,phase:'checking'};
  mount();if(!persist()){S.run.phase='partial';paint();return;}return execute();
 }
 async function check(){
  if(S.busy||!S.run||!unknown())return;const run=S.run,scope=S.adapter.scope();S.busy=true;S.adapter.setBusy(true);paint();
  try{for(const row of run.rows.filter(r=>['saving','unknown'].includes(r.state))){const result=await S.adapter.api({...row.body,action:'employee-status'},false);if(S.run!==run||scope!==S.adapter.scope())return;if(result.state==='saved')acknowledge(result,row);else{row.state='unknown';row.message='Unconfirmed. Review this employee in Creator. No update was replayed.';}}}
  catch(error){run.message=error.message;}
  finally{if(S.run!==run)return;S.busy=false;S.adapter.setBusy(false);if(S.run&&actor()===run.actor){run.phase=unknown()?'unknown':run.rows.every(done)?'saved':'partial';run.message=unknown()?'Some changes remain unconfirmed. No updates were replayed.':run.rows.every(done)?'All employee assignments are accounted for.':'Saved changes checked. Continue Remaining sends only employees not yet saved.';S.adapter.setPending(unknown());persist();S.adapter.settled();paint();}}
 }
 function close(){if(S.busy)return;$('groupDialog').close();$('app').inert=false;if(!unknown()){sessionStorage.removeItem(key());S.run=null;$('groupReview').hidden=true;S.adapter.setPending(false);S.adapter.refresh().catch(()=>{});}if(S.returnFocus?.isConnected&&!S.returnFocus.disabled)S.returnFocus.focus({preventScroll:true});else $('employeeSearch')?.focus({preventScroll:true});}
 function restore(){
  if(S.run&&S.run.actor!==actor()){redact();$('groupReview').hidden=true;}
  if(S.run){if(unknown())S.adapter.setPending(true);if(S.adapter.access&&!S.adapter.access(S.run.rows))redact();else return;}
  try{const run=JSON.parse(sessionStorage.getItem(key()));if(!run||run.actor!==actor()||!validId(run.foremanId)||run.crewId!==''&&!validId(run.crewId)||!Array.isArray(run.rows)||run.rows.some(r=>!validId(r.id)||!['waiting','saving','saved','unchanged','inactive','failed','unknown'].includes(r.state)||['saving','unknown'].includes(r.state)&&(!r.body||r.body.employee?.id!==r.id||r.body.action!=='save-employee'||!/^[-a-f\d]{36}$/i.test(r.body.requestId))))return;S.run=run;for(const row of run.rows)if(row.state==='saving')row.state='unknown';run.phase=unknown()?'unknown':run.rows.every(done)?'saved':'partial';run.message='Previous crew update retained. No updates were replayed.';S.adapter.setPending(unknown());if(!S.adapter.access||S.adapter.access(run.rows))mount();else{S.run=null;$('groupReview').hidden=false;}}
  catch{}
 }
 function install(adapter){S.adapter=adapter;$('groupClose').onclick=close;$('groupDone').onclick=close;$('groupCheck').onclick=check;$('groupContinue').onclick=execute;$('groupReview').onclick=()=>{if(S.run)mount();else{restore();if(!S.run)$('employeeStatus').textContent='The previous crew update needs access to every employee before review.';}};$('groupDialog').addEventListener('cancel',e=>{e.preventDefault();close();});document.addEventListener('crew:management-ready',restore);document.addEventListener('crew:employees-changed',restore);}
 root.CrewGroupAssign=Object.freeze({install,start,check,execute,state:S});
})(window);
