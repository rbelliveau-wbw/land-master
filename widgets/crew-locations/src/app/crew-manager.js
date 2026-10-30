/* Native Crew / Crew_Assignment management. No inferred spans or capacity rules. */
(function(root){
  'use strict';
  const $=id=>document.getElementById(id),M=root.CrewModel;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const check='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-8"/></svg>';
  const chevron='<svg class="chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg>';
  const palette=['#49688c','#8054c7','#147d64','#ba7235','#b3415b','#246ab5','#626c7d'];
  const S={ready:false,loading:false,saving:false,crews:[],assignments:[],phases:[],permissions:{},management:{enabled:false},unavailableReason:'',selected:'',query:'',status:'active',editor:null,pending:null,picker:null,generation:0,actor:'',attempted:'',returnFocus:null};
  const bridge=()=>root.CrewApp?.management;
  const context=()=>bridge()?.context?.()||{};
  const phaseName=p=>{if(!p)return 'Unavailable phase';const suffix=p.phase!==''&&p.phase!=null&&!/\s[-–—]\sphase\s+\d+/i.test(p.name||'')?' · Phase '+p.phase:'';return (p.name||p.code||'Unnamed phase')+suffix+(p.subphase&&!String(p.name||'').endsWith(p.subphase)?' '+p.subphase:'');};
  const crewName=c=>c?.name||c?.code||'Unnamed crew';
  const phase=id=>S.phases.find(p=>p.id===id);
  const crew=id=>S.crews.find(c=>c.id===id);
  const canManage=()=>S.ready&&S.management.enabled===true&&S.permissions.assignments===true;
  const reason=()=>S.management.reason||(!S.ready?S.unavailableReason||'Crew management is connecting.':S.permissions.assignments!==true?'Crew management is read-only for your account.':S.management.enabled!==true?'Crew management setup requires Creator promotion.':'');
  const blocked=()=>!canManage()||S.loading||S.saving||!!S.pending;
  const disabledReason=()=>S.pending?'Check the previous save before making another change.':S.saving?'Saving crew changes…':S.loading?(S.ready?'Refreshing crews…':'Loading crews…'):reason();
  const supportsManagement=cap=>cap?.management?.enabled===true&&cap.management.nativeWrites===true&&cap.management.protocol==='native-validated-v1';
  const safeColor=value=>/^#[a-f\d]{6}$/i.test(value||'')?value:'#49688c';
  function status(text,state='ready'){const node=$('cmStatus');node.textContent=text;node.dataset.state=state;}
  function editorStatus(text,state='ready'){$('cmEditorStatus').textContent=text;$('cmEditorStatus').dataset.state=state;}
  function identity(){const c=context();return [c.user||'',c.environment||'',c.epoch??''].join(':');}
  function pendingKey(){const c=context();return 'crew-management:pending:'+c.environment+':'+c.user;}
  function savedAttempt(){try{const saved=JSON.parse(sessionStorage.getItem(pendingKey()));return saved?.body?.requestId&&['save-crew','save-assignment'].includes(saved.body.action)&&saved.editor?.values?saved:null;}catch{return null;}}
  function rememberAttempt(body){try{sessionStorage.setItem(pendingKey(),JSON.stringify({body,editor:S.editor}));}catch{}}
  function forgetAttempt(){try{sessionStorage.removeItem(pendingKey());}catch{}bridge()?.setPending?.(false);}
  function restoreAttempt(){
    if(S.pending||S.saving)return;
    const saved=savedAttempt();if(!saved)return;
    openEditor(saved.editor.kind,saved.editor.item,saved.editor);S.pending={body:saved.body,actor:identity()};bridge()?.setPending?.(true);editorStatus('The previous save needs a status check. Your draft is retained.','unknown');$('cmCancel').textContent='Close';updateControls();pendingBanner();
  }
  function uuid(){if(root.crypto?.randomUUID)return root.crypto.randomUUID();return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const n=Math.floor(Math.random()*16);return (c==='x'?n:(n&3|8)).toString(16);});}
  function errorText(e){return e?.message||'The request failed. Try refreshing crews.';}
  function clearPrivate(){S.ready=false;S.loading=false;S.crews=[];S.assignments=[];S.phases=[];S.selected='';S.permissions={};S.management={enabled:false};closePicker();if($('cmEditorDialog').open)$('cmEditorDialog').close();S.editor=null;S.pending=null;render();}
  function updateControls(){
    $('cmRefresh').disabled=S.loading||S.saving;
    $('cmNewCrew').disabled=blocked();$('cmNewCrew').title=blocked()?disabledReason():'';
    document.querySelectorAll('#cmDetail [data-cm-write]').forEach(node=>{const locked=node.dataset.cmLocked||'';node.disabled=blocked()||!!locked;node.title=locked||(blocked()?disabledReason():'');});
    if(S.editor){const locked=S.saving||!!S.pending||!canManage();$('cmEditorFields').querySelectorAll('input,button').forEach(node=>{node.disabled=locked;});$('cmSave').disabled=locked;$('cmCancel').disabled=S.saving;$('cmClose').disabled=S.saving;$('cmCheckStatus').hidden=!S.pending;$('cmCheckStatus').disabled=S.saving;}
  }
  function normalizePage(data,all){
    for(const key of ['crews','assignments','phases']){
      if(!Array.isArray(data[key]))throw new Error('Crew management returned incomplete '+key+' data.');
      for(const raw of data[key]){if(typeof raw.id!=='string'||!/^\d+$/.test(raw.id))throw new Error('Crew management returned an invalid record identity.');const row={...raw};if(key==='assignments'){if(typeof raw.crewId!=='string'||!/^\d+$/.test(raw.crewId)||typeof raw.phaseId!=='string'||!/^\d+$/.test(raw.phaseId)||M.date(row.date)==null)throw new Error('Crew management returned an incomplete assignment.');}if(key==='crews'){row.active=raw.active===true;row.color=safeColor(raw.color);}all[key].set(row.id,row);}
    }
  }
  async function readComplete(capabilities,isCancelled){
    if(capabilities.permissions?.view!==true){const error=new Error('Crew Management access has not been granted.');error.denied=true;throw error;}
    if(capabilities.sources?.crews!==true)throw new Error('Native crew reports are not configured.');
    // Reuse the schedule's signed-in SDK adapter. A roster read must not depend
    // on a separate per-user OAuth connection or substitute owner-level access.
    const reports=[['crews','All_Crews',['ID','Crew_Code','Crew_Name','Badge_Color','Active','Source_System','Source_Record_ID']],['assignments','Crew_Assignment_Report',['ID','Subdivision1','Crew','Assignment_Date','Source_System','Source_Record_ID','Source_Key']],['phases','All_Subdivisions',['ID','Subdivision_Name','Subdivision_Code','Phase','Subphase','Territory','Status','Projects_Status']]];
    const native=Object.fromEntries(await Promise.all(reports.map(async([key,reportName,fields])=>{
      const rows=await root.LMData.readAll({reportName,fields,fresh:true,isCancelled});
      for(const row of rows)for(const field of fields)if(!Object.hasOwn(row,field))throw new Error(reportName+' must expose native field '+field+'.');
      return [key,rows];
    })));
    const canEdit=capabilities.permissions.assignments===true;
    const data={permissions:capabilities.permissions,management:capabilities.management,
      crews:native.crews.map(row=>({id:M.id(row.ID),code:String(row.Crew_Code||''),name:String(row.Crew_Name||''),color:row.Badge_Color,active:row.Active===true||M.norm(row.Active)==='true',sourceSystem:String(row.Source_System||''),sourceRecordId:String(row.Source_Record_ID||'')})),
      assignments:native.assignments.map(row=>{const system=String(row.Source_System||''),sourceId=String(row.Source_Record_ID||''),sourceKey=String(row.Source_Key||''),manual=['MANUAL_WIDGET','MANUAL_QA'].includes(system)&&sourceId!==''&&sourceKey===system+':'+sourceId;return {id:M.id(row.ID),crewId:M.id(row.Crew),phaseId:M.id(row.Subdivision1),date:M.iso(M.date(row.Assignment_Date)),sourceSystem:system,sourceRecordId:sourceId,sourceKey,editable:manual&&canEdit,reason:manual?'':'Imported assignment: source editing is unavailable.'};}),
      phases:native.phases.map(row=>{const creatorStatus=String(row.Status||''),projectsStatus=String(row.Projects_Status||''),locked=M.locked({status:creatorStatus,projectsStatus});return {id:M.id(row.ID),name:String(row.Subdivision_Name||''),code:String(row.Subdivision_Code||''),phase:String(row.Phase??''),subphase:String(row.Subphase||''),territory:String(row.Territory||''),status:projectsStatus.trim()?projectsStatus:creatorStatus,creatorStatus,projectsStatus,editable:!locked&&canEdit,reason:locked?'This phase is locked.':''};})};
    const all={crews:new Map(),assignments:new Map(),phases:new Map()};normalizePage(data,all);
    return {...data,crews:[...all.crews.values()],assignments:[...all.assignments.values()],phases:[...all.phases.values()]};
  }
  async function load(){
    if(S.loading||S.saving||!bridge())return;
    const actor=identity(),generation=++S.generation;S.attempted=actor;S.loading=true;updateControls();status(S.ready?'Refreshing crews…':'Loading crews…','loading');
    try{
      // Capabilities exists in older Creator deployments too. Refresh that safe
      // route before ever sending a management action to an unsupported version.
      const capabilities=await bridge().api({action:'capabilities'});
      if(!supportsManagement(capabilities)){const setup=new Error('Crew management requires Creator promotion.');setup.setup=true;throw setup;}
      const data=await readComplete(capabilities,()=>generation!==S.generation||actor!==identity());if(generation!==S.generation||actor!==identity())return;
      S.crews=data.crews.sort((a,b)=>String(a.code).localeCompare(String(b.code)));S.assignments=data.assignments;S.phases=data.phases;S.permissions=data.permissions||{};S.management=data.management||{enabled:false,reason:'Creator crew-management promotion is required.'};S.ready=true;S.unavailableReason='';S.actor=actor;
      if(!crew(S.selected))S.selected=S.crews.find(c=>c.active)?.id||S.crews[0]?.id||'';
      render();restoreAttempt();if(S.pending)pendingBanner();else status(canManage()?'':reason(),canManage()?'ready':'readonly');
    }catch(e){
      if(generation!==S.generation||actor!==identity())return;S.unavailableReason=errorText(e);
      if(e.setup){clearPrivate();$('crewRoster').innerHTML='<div class="cm-empty">Crew setup required</div>';$('cmDetail').innerHTML='<div class="cm-empty">'+esc(errorText(e))+'</div>';$('cmSummary').textContent='Setup required';status(errorText(e),'readonly');}
      else if(e.denied||e.permissionDenied||/permission|access.*(?:denied|revoked)|not.*granted|not authorized|forbidden|must expose|missing.*field|incomplete|invalid record identity|unavailable.*current user/i.test(errorText(e))){clearPrivate();status(errorText(e),'error');}
      else{status(S.ready?errorText(e)+' Your last complete roster is still shown.':'Crew management is unavailable. '+errorText(e),'error');if(!S.ready){$('crewRoster').innerHTML='<div class="cm-empty">Crew setup required</div>';$('cmDetail').innerHTML='<div class="cm-empty">'+esc(errorText(e))+'</div>';$('cmSummary').textContent='Setup required';}}
    }finally{if(generation===S.generation){S.loading=false;updateControls();}}
  }
  function renderRoster(){
    const rows=S.crews.filter(c=>(S.status==='all'||c.active===(S.status==='active'))&&M.norm(c.code+' '+c.name).includes(M.norm(S.query)));
    const host=$('crewRoster'),existing=new Map([...host.querySelectorAll('[data-cm-crew]')].map(n=>[n.dataset.cmCrew,n])),fragment=document.createDocumentFragment();
    for(const c of rows){let node=existing.get(c.id);if(!node){node=document.createElement('button');node.className='cm-roster-row';node.dataset.cmCrew=c.id;}node.type='button';node.setAttribute('aria-pressed',String(c.id===S.selected));const distinctName=c.name&&M.norm(c.name)!==M.norm(c.code);node.title=c.code+(distinctName?' · '+c.name:'');node.innerHTML='<span class="cm-roster-code" style="border-left:3px solid '+safeColor(c.color)+'">'+esc(c.code)+'</span><span class="cm-roster-text">'+esc(distinctName?c.name:c.code)+'</span>'+(!c.active?'<span class="cm-state">Inactive</span>':'');fragment.append(node);}
    host.replaceChildren(fragment);if(!rows.length)host.innerHTML='<div class="cm-empty">'+(S.crews.length?'No matching crews':'No crews yet')+'</div>';
    document.querySelectorAll('[data-cm-status]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.cmStatus===S.status)));
    const active=S.crews.filter(c=>c.active).length;$('cmSummary').innerHTML='<span data-crew-number="management:active">'+active+'</span> Active · <span data-crew-number="management:inactive">'+(S.crews.length-active)+'</span> Inactive';
  }
  function assignmentAction(a){const p=phase(a.phaseId),locked=!p?'This phase is unavailable.':p.editable===false?(p.reason||'This phase is locked.'):a.editable===false?(a.reason||'This assignment is managed by its source.'):'';return locked?'<span class="cm-locked" title="'+esc(locked)+'">'+(a.editable===false?'Source Locked':'Locked')+'</span>':'<button data-cm-edit-assignment="'+esc(a.id)+'" data-cm-write>Edit</button>';}
  function assignmentTable(rows,empty){if(!rows.length)return '<div class="cm-empty compact">'+esc(empty)+'</div>';return '<div class="cm-assignment-scroll"><table class="cm-assignment-table"><thead><tr><th>Work Date</th><th>Project / Phase</th><th><span class="cm-muted">Action</span></th></tr></thead><tbody>'+rows.map(a=>{const p=phase(a.phaseId);return '<tr data-cm-assignment="'+esc(a.id)+'"><td>'+M.us(M.date(a.date))+'</td><td><strong>'+esc(phaseName(p))+'</strong><small>'+esc([p?.code,p?.territory].filter(Boolean).join(' · '))+'</small></td><td>'+assignmentAction(a)+'</td></tr>';}).join('')+'</tbody></table></div>';}
  function renderDetail(){
    root.CrewEmployees?.preserveFocus();
    const host=$('cmDetail'),scroll=host.scrollTop,historyOpen=host.querySelector('.cm-history')?.open;
    const c=crew(S.selected);if(!c){$('cmDetail').innerHTML='<div class="cm-empty">'+(S.crews.length?'Select a crew':'Create your first crew')+'</div>';return;}
    host.dataset.crewDetail=c.id;
    const day=M.today(),rows=S.assignments.filter(a=>a.crewId===c.id).sort((a,b)=>M.date(b.date)-M.date(a.date)||a.id.localeCompare(b.id)),past=rows.filter(a=>M.date(a.date)<=day),future=rows.filter(a=>M.date(a.date)>day).reverse(),latest=past.length?past.filter(a=>a.date===past[0].date):[],history=past.filter(a=>!latest.includes(a));
    const latestHtml=latest.length?'<div class="cm-latest"><div class="cm-latest-date">'+M.us(M.date(latest[0].date))+'</div>'+latest.map(a=>{const p=phase(a.phaseId);return '<div class="cm-latest-row" data-cm-assignment="'+esc(a.id)+'"><div><strong>'+esc(phaseName(p))+'</strong><small>'+esc([p?.code,p?.territory].filter(Boolean).join(' · '))+'</small></div>'+assignmentAction(a)+'</div>';}).join('')+'</div>':'<div class="cm-empty compact">No dated work through today</div>';
    const staffing=root.CrewEmployees?.staffing(c.id)||{ready:false,members:[],foremen:[],jobs:[]};
    const foremen=staffing.foremen.map(e=>String(e.EmployeeName)+(root.CrewEmployeesModel.truth(e.IsActive)?'':' · Inactive')).join(', ');
    const recent=staffing.jobs.map(j=>{const p=phase(j.phaseId);return p?phaseName(p):(j.jobCode||'Unknown Job')+' · Unmapped';}).join(', ');
    const members=staffing.members.map(e=>'<tr data-crew-member="'+esc(e.ID)+'"><td class="employee-name" title="'+esc(e.EmployeeName)+'"><strong>'+esc(e.EmployeeName)+'</strong><small>'+esc(e.Employee_Code)+(root.CrewEmployeesModel.truth(e.IsActive)?'':' · Inactive')+'</small></td><td>'+root.CrewEmployees.assignmentCell(e.ID,'laborType')+'</td></tr>').join('');
    host.innerHTML='<div class="cm-crew-head"><h3>'+esc(crewName(c))+'</h3><span class="cm-code" style="border-left:3px solid '+safeColor(c.color)+'">'+esc(c.code)+'</span><span class="cm-state '+(c.active?'active':'')+'">'+(c.active?'Active':'Inactive')+'</span><div class="cm-actions"><button id="cmEditCrew" data-cm-write>Edit Crew</button><button id="cmToggleActive" data-cm-write>'+(c.active?'Deactivate':'Reactivate')+'</button></div></div><div class="cm-crew-facts"><div><span>Foreman</span><strong title="'+esc(foremen)+'">'+esc(staffing.ready?foremen||'Unassigned':'Staffing Unavailable')+'</strong></div><div><span>Recent Job</span><strong title="'+esc(recent)+'">'+esc(staffing.ready?recent||'No Recent Timecards':'Unavailable')+'</strong>'+(staffing.latest!=null?'<small>'+M.us(staffing.latest)+'</small>':'')+'</div></div><section class="cm-detail-section cm-member-section"><div class="cm-subhead"><h4>Employees <span class="cm-count" data-crew-number="crew:'+esc(c.id)+':members">'+staffing.members.length+'</span></h4></div><div class="cm-members-scroll"><table class="cm-members-table"><thead><tr><th>Employee Name</th><th>Labor Type</th></tr></thead><tbody>'+ (members||'<tr><td colspan="2" class="cm-empty compact">'+(staffing.ready?'No Assigned Employees':'Staffing Unavailable')+'</td></tr>')+'</tbody></table></div></section><section class="cm-detail-section"><div class="cm-subhead"><h4>Upcoming Work <span class="cm-count"><span data-crew-number="crew:'+esc(c.id)+':upcoming">'+future.length+'</span><span class="cm-sr-only"> assignments</span></span></h4><button id="cmNewAssignment" class="cm-primary" data-cm-write '+(!c.active?'data-cm-locked="Reactivate this crew before adding work."':'')+'>+ Assign Work</button></div>'+assignmentTable(future,'No Upcoming Work')+'</section><details class="cm-history" '+(historyOpen?'open':'')+'><summary>Dated Work · <span data-crew-number="crew:'+esc(c.id)+':history">'+past.length+'</span></summary><section class="cm-detail-section"><div class="cm-subhead"><h4>Latest Dated Work</h4></div>'+latestHtml+'</section>'+(history.length?'<section class="cm-detail-section"><h4>Earlier Work</h4>'+assignmentTable(history,'No Earlier Work')+'</section>':'')+'</details>'+(!c.active?'<p class="cm-readonly">Inactive crews retain their dated assignments.</p>':'');
    const feedback=root.CrewEmployees?.feedbackForCrew(c.id);const line=document.createElement('p');line.id='cmStaffingStatus';line.className='cm-status';line.dataset.lmMotion='feedback';line.setAttribute('role','status');line.textContent=feedback?.text||'';line.dataset.state=feedback?.state||'ready';host.querySelector('.cm-member-section').insertBefore(line,host.querySelector('.cm-members-scroll'));
    host.scrollTop=scroll;
    updateControls();
    root.CrewEmployees?.restoreFocus();
  }
  function render(){renderRoster();renderDetail();updateControls();}
  function switchWorkspace(name){
    if(name==='employees')name='crews';
    $('app').dataset.workspace=name;document.querySelectorAll('#workspaceTabs [data-workspace]').forEach(node=>{const selected=node.dataset.workspace===name;node.setAttribute('aria-selected',String(selected));node.tabIndex=selected?0:-1;});
    $('employeeRoster')?.setAttribute('aria-hidden',String(name!=='crews'));$('crewManager').setAttribute('aria-hidden',String(name!=='crews'));$('timeline').setAttribute('aria-hidden',String(name!=='schedule'));$('schedule').setAttribute('aria-hidden',String(name!=='schedule'));
    $('crewWorkspace').hidden=name!=='crews';
    root.CrewApp.scheduleView?.($('app').dataset.scheduleView||'timeline');
  }
  function openEditor(kind,item,restored=null){
    if(!restored&&blocked())return;
    S.returnFocus=document.activeElement;S.editor=restored||{kind,id:item?.id||'',item:item?{...item}:null,values:kind==='crew'?{id:item?.id||'',code:item?.code||'',name:item?.name||'',color:item?.color||palette[0],active:item?.active??true}:kind==='assignment'?{id:item?.id||'',crewId:item?.crewId||S.selected,phaseId:item?.phaseId||'',date:M.us(M.date(item?.date)??M.today())}:{id:item.id,code:item.code,name:item.name,color:item.color,active:!item.active}};
    const e=S.editor,v=e.values;
    $('cmEditorKicker').textContent=kind==='assignment'?'Dated crew assignment':'Crew Management';$('cmEditorTitle').textContent=kind==='crew'?(e.id?'Edit Crew':'New Crew'):kind==='assignment'?(e.id?'Edit assignment':'Assign Work'):(v.active?'Reactivate crew':'Deactivate crew');
    $('cmSave').textContent=kind==='crew'?'Save Crew':kind==='assignment'?'Save Assignment':v.active?'Reactivate crew':'Deactivate crew';
    if(kind==='crew')$('cmEditorFields').innerHTML='<div class="cm-field"><label for="cmCode">Crew Code</label><input id="cmCode" name="code" maxlength="64" autocomplete="off" value="'+esc(v.code)+'" '+(e.id?'readonly':'')+'>'+(e.id?'<small>Crew Code identifies this crew.</small>':'')+'</div><div class="cm-field"><label for="cmName">Crew Name <span class="cm-muted">optional</span></label><input id="cmName" name="name" maxlength="255" autocomplete="off" value="'+esc(v.name)+'"></div><div class="cm-field full"><label for="cmColor">Badge Color</label><input id="cmColor" name="color" maxlength="7" autocomplete="off" spellcheck="false" value="'+esc(v.color)+'"><div class="cm-swatches" aria-label="Badge Colors">'+palette.map(color=>'<button type="button" data-cm-color="'+color+'" style="--cm-color:'+color+'" aria-label="Use '+color+'" aria-pressed="'+(color.toLowerCase()===v.color.toLowerCase())+'"></button>').join('')+'</div></div><div class="cm-field full"><div class="cm-checkbox"><input type="checkbox" id="cmActive" name="active" '+(v.active?'checked':'')+'><label for="cmActive">Active Crew</label></div></div>';
    else if(kind==='assignment')$('cmEditorFields').innerHTML='<div class="cm-field full"><label id="cmCrewLabel">Crew</label><button type="button" id="cmCrewPicker" class="cm-picker-button" aria-labelledby="cmCrewLabel cmCrewValue" aria-haspopup="listbox" aria-expanded="false"><span id="cmCrewValue"></span>'+chevron+'</button></div><div class="cm-field full"><label id="cmPhaseLabel">Project / Phase</label><button type="button" id="cmPhasePicker" class="cm-picker-button" aria-labelledby="cmPhaseLabel cmPhaseValue" aria-haspopup="listbox" aria-expanded="false"><span id="cmPhaseValue"></span>'+chevron+'</button></div><div class="cm-field"><label for="cmDate">Work Date</label><input id="cmDate" name="date" placeholder="MM/DD/YYYY" inputmode="numeric" autocomplete="off" value="'+esc(v.date)+'"></div>';
    else $('cmEditorFields').innerHTML='<div class="cm-confirm-summary"><strong>'+esc(v.code+' · '+crewName(item))+'</strong><p>'+(v.active?'This crew can receive new assignments.':'This crew will no longer receive new assignments. Existing dated work stays recorded.')+'</p></div>';
    paintSelected();editorStatus('');$('cmCancel').textContent='Cancel';$('cmCheckStatus').hidden=true;$('cmEditorDialog').showModal();updateControls();(kind==='crew'&&!e.id?$('cmCode'):$('cmName')||$('cmCrewPicker')||$('cmSave')).focus({preventScroll:true});
  }
  function paintSelected(){const e=S.editor;if(e?.kind!=='assignment')return;const c=crew(e.values.crewId),p=phase(e.values.phaseId);$('cmCrewValue').textContent=c?c.code+' · '+crewName(c):'Choose a crew';$('cmPhaseValue').textContent=p?phaseName(p)+(p.code?' · '+p.code:''):'Choose a phase';$('cmCrewPicker').title=$('cmCrewValue').textContent;$('cmPhasePicker').title=$('cmPhaseValue').textContent;}
  function closeEditor(){if(S.saving)return;closePicker();$('cmEditorDialog').close();S.returnFocus?.isConnected&&S.returnFocus.focus({preventScroll:true});if(S.pending)pendingBanner();}
  function pendingBanner(){status('The save outcome is unknown. Check its status before another change.','unknown');const button=document.createElement('button');button.id='cmReviewSave';button.textContent='Review Save';button.onclick=()=>{$('cmEditorDialog').showModal();$('cmCheckStatus').focus({preventScroll:true});};$('cmStatus').append(button);updateControls();}
  function inputError(id,message){const node=$(id);node?.setAttribute('aria-invalid','true');node?.focus({preventScroll:true});throw new Error(message);}
  function payload(){
    const e=S.editor,v=e.values;$('cmEditorFields').querySelectorAll('[aria-invalid]').forEach(n=>n.removeAttribute('aria-invalid'));
    if(e.kind==='crew'){
      v.code=$('cmCode').value.trim();v.name=$('cmName').value.trim();v.color=$('cmColor').value.trim();v.active=$('cmActive').checked;
      if(!v.code)inputError('cmCode','Enter a crew code.');if(!e.id&&!/^[a-z\d][a-z\d _-]{0,63}$/i.test(v.code))inputError('cmCode','Start the code with a letter or number; use up to 64 letters, numbers, spaces, underscores or hyphens.');if(!/^#[a-f\d]{6}$/i.test(v.color))inputError('cmColor','Use a six-digit badge color, such as #49688c.');
      if(S.crews.some(c=>c.id!==e.id&&M.norm(c.code)===M.norm(v.code)))inputError('cmCode','That crew code is already in use.');
      return {action:'save-crew',requestId:uuid(),crew:{...(e.id?{id:e.id}:{}),code:v.code,name:v.name,color:v.color,active:v.active}};
    }
    if(e.kind==='toggle')return {action:'save-crew',requestId:uuid(),crew:{id:e.id,code:v.code,name:v.name,color:v.color,active:v.active}};
    v.date=$('cmDate').value.trim();if(!crew(v.crewId))inputError('cmCrewPicker','Choose a crew.');if(!crew(v.crewId).active&&(!e.id||v.crewId!==e.item?.crewId))inputError('cmCrewPicker','Choose an active crew.');if(!phase(v.phaseId))inputError('cmPhasePicker','Choose a project / phase.');if(phase(v.phaseId).editable===false)inputError('cmPhasePicker',phase(v.phaseId).reason||'This phase does not accept crew assignments.');
    if(!/^\d{2}\/\d{2}\/\d{4}$/.test(v.date)||M.date(v.date)==null)inputError('cmDate','Enter a valid work date as MM/DD/YYYY.');
    return {action:'save-assignment',requestId:uuid(),assignment:{...(e.id?{id:e.id}:{}),crewId:v.crewId,phaseId:v.phaseId,date:M.iso(M.date(v.date))}};
  }
  function requireSaved(result,body){const kind=body.action==='save-crew'?'crew':'assignment';if(result.state!=='saved'||result.requestId!==body.requestId||result.kind!==kind||typeof result.recordId!=='string'||!/^\d+$/.test(result.recordId)||body[kind]?.id&&result.recordId!==body[kind].id){const error=new Error('Creator did not confirm the intended save. Check status before continuing.');error.unknown=true;throw error;}}
  function success(result,body){
    const kind=body.action==='save-crew'?'crew':'assignment';S.pending=null;forgetAttempt();S.saving=false;if(kind==='crew')S.selected=String(result.recordId);else S.selected=body.assignment.crewId;
    editorStatus('Saved.','saved');closeEditor();root.LMSuccess?.show?.(kind==='crew'?(S.editor.kind==='toggle'?(body.crew.active?'Crew reactivated.':'Crew deactivated.'):'Crew saved.'):'Crew assignment saved.');
    const refresh=async()=>{await load();await bridge()?.reload?.();const target=kind==='crew'?document.querySelector('[data-cm-crew="'+CSS.escape(String(result.recordId))+'"]'):document.querySelector('[data-cm-assignment="'+CSS.escape(String(result.recordId))+'"]');if(target)root.LMMotion?.flash?.(target);};
    refresh().catch(e=>status('Saved. '+errorText(e),'error'));
  }
  async function save(event){
    event?.preventDefault();if(blocked()||!S.editor)return;let body;
    try{body=payload();}catch(e){editorStatus(errorText(e),'error');return;}
    const actor=identity();S.saving=true;rememberAttempt(body);closePicker();updateControls();editorStatus('Saving…','pending');
    try{const result=await bridge().api(body,true);if(actor!==identity())return;requireSaved(result,body);success(result,body);}
    catch(e){if(actor!==identity()){bridge()?.setPending?.(false);return;}root.LMSuccess?.clear?.();if(e.unknown===true){S.pending={body,actor:identity()};bridge()?.setPending?.(true);editorStatus(errorText(e)+' Use Check Save Status.','unknown');$('cmCancel').textContent='Close';pendingBanner();}else{forgetAttempt();editorStatus(errorText(e),'error');}}
    finally{S.saving=false;updateControls();}
  }
  async function checkStatus(){
    if(!S.pending||S.saving)return;const pending=S.pending,body=pending.body,kind=body.action==='save-crew'?'crew':'assignment';S.saving=true;updateControls();editorStatus('Checking the saved record…','pending');
    try{
      if(pending.actor!==identity())throw new Error('Your session changed. Reopen Crew Management before reviewing this save.');
      const result=await bridge().api({action:'management-status',requestId:body.requestId,statusFor:kind,[kind]:body[kind]});
      if(pending!==S.pending||pending.actor!==identity())return;
      if(result.state==='saved'){requireSaved(result,body);success(result,body);}
      else if(result.safeToRetry===true&&['not-saved','not_saved','not-found','not_found'].includes(result.state)){S.pending=null;forgetAttempt();editorStatus('No saved record was found. Review your draft, then save again.','error');$('cmCancel').textContent='Cancel';status('');}
      else editorStatus(result.message||'The save still needs review. No write has been replayed.','unknown');
    }catch(e){if(pending!==S.pending||pending.actor!==identity())return;editorStatus(errorText(e),'unknown');}finally{S.saving=false;updateControls();}
  }
  function pickerOptions(kind){const v=S.editor.values;if(kind==='crew')return S.crews.filter(c=>c.active||c.id===v.crewId).map(c=>({id:c.id,label:c.code+' · '+crewName(c),detail:c.active?'':'Inactive crew',disabled:!c.active}));return S.phases.map(p=>({id:p.id,label:phaseName(p),detail:[p.code,p.territory,p.editable===false?p.reason||'Unavailable for assignments':''].filter(Boolean).join(' · '),disabled:p.editable===false})).sort((a,b)=>a.label.localeCompare(b.label));}
  function positionPicker(){if(!S.picker)return;const host=$('cmPicker'),box=S.picker.button.getBoundingClientRect(),height=innerHeight,gap=6,margin=12;host.style.maxHeight=Math.max(120,height-margin*2)+'px';const below=height-box.bottom-gap-margin,above=box.top-gap-margin,up=below<220&&above>below;host.style.maxHeight=Math.max(100,Math.min(380,up?above:below))+'px';const rect=host.getBoundingClientRect();host.style.left=Math.max(margin,Math.min(box.left,innerWidth-rect.width-margin))+'px';host.style.top=Math.max(margin,up?box.top-gap-rect.height:Math.min(box.bottom+gap,height-rect.height-margin))+'px';}
  function openPicker(kind,button){if(S.saving||S.pending)return;closePicker();S.picker={kind,button,query:''};button.setAttribute('aria-expanded','true');$('cmPicker').setAttribute('aria-label',kind==='crew'?'Choose a crew':'Choose a project / phase');$('cmPicker').innerHTML='<input type="search" aria-label="Search '+(kind==='crew'?'crews':'phases')+'" placeholder="Search '+(kind==='crew'?'crews':'projects / phases')+'"><div class="cm-picker-list" role="listbox" aria-label="'+(kind==='crew'?'Crews':'Project phases')+'"></div><div class="cm-picker-footer"><button type="button" data-cm-picker-close>Close</button></div>';$('cmPicker').hidden=false;paintOptions();positionPicker();$('cmPicker').querySelector('input').focus({preventScroll:true});}
  function closePicker(focus=false){if(!S.picker)return;const button=S.picker.button;button.setAttribute('aria-expanded','false');$('cmPicker').hidden=true;S.picker=null;if(focus&&button.isConnected)button.focus({preventScroll:true});}
  function paintOptions(){if(!S.picker)return;const {kind,query}=S.picker,selected=S.editor.values[kind==='crew'?'crewId':'phaseId'];$('cmPicker').querySelector('[role=listbox]').innerHTML=pickerOptions(kind).filter(o=>M.norm(o.label+' '+o.detail).includes(M.norm(query))).map(o=>'<button type="button" class="cm-picker-option" role="option" data-cm-option="'+esc(o.id)+'" aria-selected="'+(o.id===selected)+'" '+(o.disabled?'disabled':'')+'>'+check+'<span>'+esc(o.label)+(o.detail?'<small>'+esc(o.detail)+'</small>':'')+'</span></button>').join('')||'<div class="cm-empty">No matching options</div>';positionPicker();}
  function selectOption(id){if(!S.picker)return;S.editor.values[S.picker.kind==='crew'?'crewId':'phaseId']=id;paintSelected();closePicker(true);}
  function install(){
    $('cmRefresh').onclick=()=>root.LMMotion?LMMotion.refresh($('crewManager'),load,{allowed:()=>!S.saving}):load();$('cmNewCrew').onclick=()=>openEditor('crew');$('crewSearch').oninput=e=>{S.query=e.target.value;renderRoster();};
    $('workspaceTabs').onclick=e=>{const button=e.target.closest('[data-workspace]');if(button)switchWorkspace(button.dataset.workspace);};
    $('workspaceTabs').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const buttons=[...$('workspaceTabs').querySelectorAll('[data-workspace]')],current=buttons.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(current+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;switchWorkspace(buttons[next].dataset.workspace);buttons[next].focus({preventScroll:true});};
    document.querySelectorAll('.workspace-link').forEach(a=>a.addEventListener('click',()=>switchWorkspace('schedule')));
    $('crewManager').addEventListener('click',e=>{const target=e.target.closest('button');if(!target)return;if(target.dataset.cmStatus){S.status=target.dataset.cmStatus;renderRoster();return;}if(target.dataset.cmCrew){S.selected=target.dataset.cmCrew;renderRoster();renderDetail();return;}if(target.id==='cmEditCrew')openEditor('crew',crew(S.selected));if(target.id==='cmToggleActive')openEditor('toggle',crew(S.selected));if(target.id==='cmNewAssignment')openEditor('assignment');if(target.dataset.cmEditAssignment)openEditor('assignment',S.assignments.find(a=>a.id===target.dataset.cmEditAssignment));});
    $('cmForm').onsubmit=save;$('cmCancel').onclick=closeEditor;$('cmClose').onclick=closeEditor;$('cmCheckStatus').onclick=checkStatus;
    $('cmEditorDialog').addEventListener('cancel',e=>{e.preventDefault();if(S.picker){closePicker(true);return;}closeEditor();});
    $('cmEditorFields').addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;if(button.id==='cmCrewPicker')openPicker('crew',button);if(button.id==='cmPhasePicker')openPicker('phase',button);if(button.dataset.cmColor){$('cmColor').value=button.dataset.cmColor;$('cmEditorFields').querySelectorAll('[data-cm-color]').forEach(n=>n.setAttribute('aria-pressed',String(n===button)));}});
    $('cmPicker').addEventListener('input',e=>{if(S.picker&&e.target.matches('input')){S.picker.query=e.target.value;paintOptions();}});
    $('cmPicker').addEventListener('click',e=>{const option=e.target.closest('[data-cm-option]');if(option&&!option.disabled)selectOption(option.dataset.cmOption);if(e.target.closest('[data-cm-picker-close]'))closePicker(true);});
    $('cmPicker').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closePicker(true);return;}const options=[...$('cmPicker').querySelectorAll('[data-cm-option]:not(:disabled)')];if(e.key==='Enter'&&e.target.matches('input')){e.preventDefault();if(options.length)selectOption(options[0].dataset.cmOption);return;}if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key)||!options.length)return;e.preventDefault();const current=options.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?options.length-1:current<0?(e.key==='ArrowUp'?options.length-1:0):(current+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;options[next].focus({preventScroll:true});options[next].scrollIntoView({block:'nearest'});});
    document.addEventListener('pointerdown',e=>{if(S.picker&&!e.target.closest('#cmPicker')&&!e.target.closest('#cmCrewPicker,#cmPhasePicker'))closePicker();});window.addEventListener('resize',positionPicker);$('cmEditorDialog').addEventListener('scroll',positionPicker);
    // CrewSurfaces owns the shared semantic tab/pane/dialog/status engine and
    // keyed roster/assignment lists. Do not install a second rail or observer.
    const sync=()=>{const key=identity();if(S.actor&&key!==S.actor){S.generation++;clearPrivate();bridge()?.setPending?.(false);S.actor=key;}const c=context();if(bridge()&&c.user&&c.user!=='(unknown)'&&['DEVELOPMENT','STAGE','PRODUCTION'].includes(c.environment)){if(!S.ready&&savedAttempt())bridge().setPending?.(true);if(!S.loading&&!S.saving&&!S.ready&&S.attempted!==key)load();}};
    document.addEventListener('crew:management-ready',()=>{sync();if(S.ready&&!S.pending)load();});setInterval(sync,700);sync();
    document.addEventListener('crew:employees-changed',()=>{if(S.ready&&S.actor===identity())renderDetail();});
    root.CrewManager=Object.freeze({install,state:S,load,switchWorkspace,newCrew:()=>openEditor('crew')});
  }
  root.CrewManager=Object.freeze({install,state:S,load,switchWorkspace,newCrew:()=>openEditor('crew')});
})(window);
