(function(root){
  'use strict';
  const $=id=>document.getElementById(id),M=root.CrewModel,E=root.CrewEmployeesModel;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bridge=()=>root.CrewApp.management;
  const S={rows:[],crews:[],timecards:[],groupsEnabled:false,view:'roster',ready:false,canAssign:false,loading:false,saving:false,status:'active',query:'',draft:null,pending:null,picker:null,scope:'',generation:0,opened:false};
  const identity=()=>{const c=bridge().context();return c.user+':'+c.environment+':'+c.epoch;};
  const storageKey=()=>{const c=bridge().context();return 'crew-employees:pending:'+c.user+':'+c.environment;};
  const canWrite=()=>S.ready&&S.canAssign&&bridge().permissions().assignments===true;
  const locked=()=>S.loading||S.saving||!!S.pending||bridge().context().busy||bridge().context().unknown;
  function status(text,state='ready'){$('employeeStatus').textContent=text;$('employeeStatus').dataset.state=state;}
  function message(text,state='ready'){$('employeeSaveStatus').textContent=text;$('employeeSaveStatus').dataset.state=state;}
  function controls(){
    $('employeeRefresh').disabled=S.loading||S.saving||!!S.pending;
    $('employeeAddCrew').disabled=!canWrite()||locked();
    $('employeeSave').disabled=!canWrite()||locked();
    $('employeeCancel').disabled=S.saving;$('employeeClose').disabled=S.saving;
    $('employeeCheck').hidden=!S.pending;$('employeeCheck').disabled=S.saving;
    $('employeeFields').querySelectorAll('button').forEach(n=>n.disabled=locked());
    document.querySelectorAll('[data-employee-edit]').forEach(n=>n.disabled=!canWrite()||locked());
  }
  function render(){
    const crews=new Map(S.crews.map(c=>[M.id(c.ID),c]));
    const rows=S.rows.filter(r=>(S.status==='all'||E.truth(r.IsActive)===(S.status==='active'))&&M.norm(r.EmployeeName+' '+r.Employee_Code+' '+r.Territory+' '+r.Labor_Type+' '+(crews.get(M.id(r.Crew))?.Crew_Code||'')).includes(M.norm(S.query)));
    const active=S.rows.filter(r=>E.truth(r.IsActive)).length;
    $('employeeSummary').innerHTML='<span data-crew-number="employees:active">'+active+'</span> active · <span data-crew-number="employees:inactive">'+(S.rows.length-active)+'</span> inactive';
    const previous=new Map([...$('employeeRows').children].map(n=>[n.dataset.employeeId,n])),fragment=document.createDocumentFragment();
    for(const row of rows){const id=M.id(row.ID),crew=crews.get(M.id(row.Crew));let tr=previous.get(id);if(!tr)tr=document.createElement('tr');tr.dataset.employeeId=id;
      tr.innerHTML='<td><strong>'+esc(row.EmployeeName)+'</strong><small>'+esc(row.Employee_Code)+'</small></td><td>'+esc(row.Territory||'N/A')+'</td><td>'+esc(row.Labor_Type||'Unassigned')+'</td><td>'+esc(crew?(crew.Crew_Name||crew.Crew_Code):'Unassigned')+(crew?'<small>'+esc(E.label({name:crew.Crew_Name,code:crew.Crew_Code}))+'</small>':'')+'</td><td><span class="cm-state '+(E.truth(row.IsActive)?'active':'')+'">'+(E.truth(row.IsActive)?'Active':'Inactive')+'</span></td><td>'+(E.truth(row.IsActive)?'<button data-employee-edit="'+esc(id)+'">Edit</button>':'')+'</td>';fragment.append(tr);
    }
    $('employeeRows').replaceChildren(fragment);if(!rows.length)$('employeeRows').innerHTML='<tr><td colspan="6" class="cm-empty">'+(S.rows.length?'No matching employees':'No employees synced yet')+'</td></tr>';
    document.querySelectorAll('[data-employee-status]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.employeeStatus===S.status)));renderGroups(crews);controls();
  }
  function renderGroups(crews){
    $('employeeForemanView').disabled=!S.groupsEnabled;
    let groups=[];try{groups=E.foremanGroups(S.rows,S.timecards,M.today());}catch(error){$('employeeGroups').replaceChildren();$('employeeGroupStatus').textContent=error.message;return;}
    const matches=row=>(S.status==='all'||E.truth(row.IsActive)===(S.status==='active'));
    const html=[];
    for(const group of groups){
      const foreman=group.foreman,crew=crews.get(M.id(foreman.Crew)),ownerMatch=M.norm(foreman.EmployeeName+' '+foreman.Employee_Code+' '+(crew?.Crew_Name||crew?.Crew_Code||'')).includes(M.norm(S.query));
      const members=[...group.members.values()].filter(m=>matches(m.employee)&&(ownerMatch||M.norm(m.employee.EmployeeName+' '+m.employee.Employee_Code+' '+[...m.jobs].join(' ')).includes(M.norm(S.query)))).sort((a,b)=>String(a.employee.EmployeeName).localeCompare(String(b.employee.EmployeeName)));
      if(!members.length)continue;
      html.push('<article class="employee-foreman-group" data-foreman="'+esc(group.key)+'"><header><div><h3>'+esc(foreman.EmployeeName)+(E.truth(foreman.IsActive)?'':' · Inactive')+'</h3><small>'+esc(crew?(crew.Crew_Name||crew.Crew_Code):'Crew unassigned')+'</small></div><span class="cm-count"><span data-crew-number="foreman:'+esc(group.key)+':members">'+members.length+'</span> employees</span></header><table><thead><tr><th>Employee</th><th>Work dates</th><th>Jobs</th><th>Current crew</th></tr></thead><tbody>'+members.map(m=>{const row=m.employee,c=crews.get(M.id(row.Crew));return '<tr data-member="'+esc(M.id(row.ID))+'"><td><strong>'+esc(row.EmployeeName)+'</strong><small>'+esc(row.Employee_Code)+(E.truth(row.IsActive)?'':' · Inactive')+'</small></td><td>'+[...m.dates].sort((a,b)=>a-b).map(M.us).map(esc).join(', ')+'</td><td>'+[...m.jobs].sort().map(esc).join(', ')+'</td><td>'+esc(c?(c.Crew_Name||c.Crew_Code):'Unassigned')+'</td></tr>';}).join('')+'</tbody></table></article>');
    }
    $('employeeGroups').innerHTML=html.join('');$('employeeGroupStatus').textContent=!S.groupsEnabled?'Foreman groups require Creator promotion.':html.length?'Recorded timecards · '+M.us(M.today()-13)+'–'+M.us(M.today())+' · Review only':'No matching employee groups in the past 14 days.';
  }
  function chooseView(view){S.view=view;document.querySelectorAll('[data-employee-view]').forEach(n=>{const selected=n.dataset.employeeView===view;n.setAttribute('aria-selected',String(selected));n.tabIndex=selected?0:-1;});$('employeeListPanel').hidden=view!=='roster';$('employeeGroupPanel').hidden=view!=='foremen';}
  async function load(){
    if(S.loading||S.saving||S.pending)return;
    const scope=identity(),generation=++S.generation;S.loading=true;controls();status('Refreshing employees…','loading');
    try{
      const cap=await bridge().api({action:'capabilities'});
      if(cap.sources?.employees!==true)throw Object.assign(new Error('Employee setup requires Creator promotion.'),{setup:true});
      if(scope!==identity()||generation!==S.generation)return;
      S.canAssign=cap.permissions?.assignments===true;
      const reports=[['All_Employees',['ID','BU_Employee_ID','Employee_Code','EmployeeName','IsActive','Territory','Labor_Type','Crew','Synced_At']],['All_Crews',['ID','Crew_Code','Crew_Name','Active']]];
      const groupsEnabled=cap.sources?.foremanGroups===true;
      if(groupsEnabled)reports.push(['All_Crew_Timecards',['ID','Timecard_ID','Work_Date','Foreman_ID','Foreman_Name','Job_Code','IsDeleted','Multi_Line']]);
      const values=await Promise.all(reports.map(async([reportName,fields])=>{const rows=await LMData.readAll({reportName,fields,criteria:reportName==='All_Crew_Timecards'?"(Work_Date >= '"+M.us(M.today()-13)+"' && Work_Date <= '"+M.us(M.today())+"')":undefined,fresh:true,isCancelled:()=>scope!==identity()||generation!==S.generation});for(const row of rows)for(const field of fields)if(!Object.hasOwn(row,field))throw new Error(reportName+' must expose native field '+field+'.');for(const row of rows)if(typeof row.ID!=='string'||!/^\d+$/.test(row.ID))throw new Error('Invalid employee, crew or timecard identity.');return rows;}));
      if(scope!==identity()||generation!==S.generation)return;
      S.rows=values[0].sort((a,b)=>String(a.EmployeeName).localeCompare(String(b.EmployeeName)));S.crews=values[1];S.timecards=values[2]||[];S.groupsEnabled=groupsEnabled;if(!groupsEnabled)chooseView('roster');S.ready=true;S.scope=scope;render();
      status(cap.permissions.assignments===true?'':'Employee assignments are read-only for your account.');
      if(!S.opened){S.opened=true;CrewManager.switchWorkspace('employees');}
      try{const pending=JSON.parse(sessionStorage.getItem(storageKey()));if(pending?.action==='save-employee'&&pending.employee?.id&&pending.requestId){S.pending=pending;bridge().setPending(true);open(S.rows.find(r=>r.ID===pending.employee.id),pending.employee);message('The previous save needs review. No write has been replayed.','unknown');controls();}}catch{}
    }catch(error){
      if(scope!==identity()||generation!==S.generation)return;
      if(error.setup||error.permissionDenied||/permission|denied|expose|invalid|incomplete|access|granted/i.test(error.message)){S.ready=false;S.rows=[];S.crews=[];S.timecards=[];render();}
      status(error.message+(S.ready?' Your last complete roster is still shown.':''),'error');
    }finally{if(generation===S.generation){S.loading=false;controls();}}
  }
  function open(row,restored){
    if(!row||!restored&&(!canWrite()||locked()))return;
    S.returnFocus=document.activeElement;S.draft=restored?{...restored}:{id:row.ID,territory:row.Territory||'N/A',laborType:row.Labor_Type||'',crewId:M.id(row.Crew)};
    $('employeeEditorTitle').textContent=row.EmployeeName;
    $('employeeFields').innerHTML=['territory','laborType','crewId'].map(key=>'<div class="cm-field full"><label id="employeeLabel-'+key+'">'+({territory:'Territory',laborType:'Labor type',crewId:'Crew assignment'}[key])+'</label><button type="button" class="cm-picker-button" data-employee-pick="'+key+'" aria-labelledby="employeeLabel-'+key+' employeeValue-'+key+'" aria-haspopup="listbox" aria-expanded="false"><span id="employeeValue-'+key+'"></span><svg class="chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg></button></div>').join('');
    paint();message('');$('employeeEditor').showModal();controls();$('employeeFields').querySelector('button')?.focus({preventScroll:true});
  }
  function paint(){for(const key of ['territory','laborType','crewId']){const v=S.draft[key],c=key==='crewId'?S.crews.find(c=>M.id(c.ID)===v):null;$('employeeValue-'+key).textContent=c?(c.Crew_Name||c.Crew_Code):v||'Unassigned';}}
  function close(){if(S.saving)return;closePicker();$('employeeEditor').close();if(S.returnFocus?.isConnected)S.returnFocus.focus({preventScroll:true});if(S.pending){status('Employee save needs review.','unknown');const b=document.createElement('button');b.textContent='Review save';b.onclick=()=>{$('employeeEditor').showModal();$('employeeCheck').focus();};$('employeeStatus').append(b);}}
  function options(key){
    if(key==='crewId')return [{id:'',label:'Unassigned'},...S.crews.filter(c=>E.truth(c.Active)||M.id(c.ID)===S.draft.crewId).map(c=>({id:M.id(c.ID),label:(c.Crew_Name||c.Crew_Code)+' · '+c.Crew_Code,disabled:!E.truth(c.Active)&&M.id(c.ID)!==S.draft.crewId}))];
    if(key==='laborType')return ['','Superintendent','Foreman','Skilled','Unskilled','Pipe Layer','Laborer'].map(v=>({id:v,label:v||'Unassigned'}));
    return [...new Set(['N/A',...((bridge().model()?.phases)||[]).map(p=>p.territory),...S.rows.map(r=>r.Territory)].filter(Boolean))].sort().map(v=>({id:v,label:v}));
  }
  function picker(button){if(locked())return;closePicker();const key=button.dataset.employeePick;S.picker={key,button,query:''};button.setAttribute('aria-expanded','true');$('employeePicker').hidden=false;$('employeePicker').innerHTML='<input type="search" aria-label="Search options" placeholder="Search"><div role="listbox" aria-label="'+esc(button.textContent)+'"></div><div class="cm-picker-footer"><button type="button" data-employee-picker-close>Close</button></div>';paintOptions();$('employeePicker').querySelector('input').focus({preventScroll:true});}
  function position(){if(!S.picker)return;const box=S.picker.button.getBoundingClientRect(),p=$('employeePicker'),gap=6,space=innerHeight-box.bottom-18,above=box.top-18,up=space<200&&above>space;p.style.maxHeight=Math.max(100,Math.min(350,up?above:space))+'px';p.style.left=Math.max(12,Math.min(box.left,innerWidth-p.offsetWidth-12))+'px';p.style.top=Math.max(12,up?box.top-gap-p.offsetHeight:box.bottom+gap)+'px';}
  function paintOptions(){const {key,query}=S.picker;$('employeePicker').querySelector('[role=listbox]').innerHTML=options(key).filter(o=>M.norm(o.label).includes(M.norm(query))).map(o=>'<button type="button" class="cm-picker-option" role="option" aria-selected="'+(S.draft[key]===o.id)+'" data-employee-option="'+esc(o.id)+'" '+(o.disabled?'disabled':'')+'><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-8"/></svg><span>'+esc(o.label)+'</span></button>').join('')||'<div class="cm-empty">No matching options</div>';position();}
  function closePicker(){if(S.picker){S.picker.button.setAttribute('aria-expanded','false');S.picker=null;$('employeePicker').hidden=true;}}
  async function save(event){
    event.preventDefault();if(!canWrite()||locked()||!S.draft)return;closePicker();
    const body={action:'save-employee',requestId:crypto.randomUUID(),employee:{...S.draft}},scope=identity();S.saving=true;controls();message('Saving assignment…','pending');
    try{sessionStorage.setItem(storageKey(),JSON.stringify(body));const result=await bridge().api(body,true);if(scope!==identity())return;finish(result,body);}
    catch(error){if(scope!==identity())return;if(error.unknown){S.pending=body;bridge().setPending(true);message(error.message,'unknown');}else{sessionStorage.removeItem(storageKey());message(error.message,'error');}}
    finally{S.saving=false;controls();}
  }
  function finish(result,body){
    if(result.state!=='saved'||result.requestId!==body.requestId||result.recordId!==body.employee.id||result.kind!=='employee')throw Object.assign(new Error('The employee save identity needs review.'),{unknown:true});
    S.pending=null;S.saving=false;sessionStorage.removeItem(storageKey());bridge().setPending(false);close();LMSuccess.show('Employee assignment saved.');
    bridge().reload().then(load).catch(error=>status('Saved. '+error.message,'error'));
  }
  async function check(){if(!S.pending||S.saving)return;S.saving=true;controls();message('Checking the saved assignment…','pending');const body=S.pending,scope=identity();try{const result=await bridge().api({...body,action:'employee-status'});if(scope!==identity())return;if(result.state==='saved')finish(result,body);else message('The save is unconfirmed. Review the employee in Creator. No write was replayed.','unknown');}catch(e){message(e.message,'unknown');}finally{S.saving=false;controls();}}
  function install(){
    $('employeeView').onclick=e=>{const b=e.target.closest('[data-employee-view]');if(b&&!b.disabled)chooseView(b.dataset.employeeView);};
    $('employeeView').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const tabs=[...$('employeeView').querySelectorAll('[role=tab]:not(:disabled)')];if(tabs.length<2)return;e.preventDefault();const next=tabs.find(n=>n!==document.activeElement)||tabs[0];next.click();next.focus();};
    $('employeeSearch').oninput=e=>{S.query=e.target.value;render();};$('employeeFilters').onclick=e=>{const b=e.target.closest('[data-employee-status]');if(b){S.status=b.dataset.employeeStatus;render();}};
    $('employeeRows').onclick=e=>{const b=e.target.closest('[data-employee-edit]');if(b)open(S.rows.find(r=>r.ID===b.dataset.employeeEdit));};
    $('employeeAddCrew').onclick=()=>CrewManager.newCrew();$('employeeRefresh').onclick=()=>LMMotion.refresh($('employeeRoster'),load,{allowed:()=>!locked()});
    $('employeeFields').onclick=e=>{const b=e.target.closest('[data-employee-pick]');if(b)picker(b);};
    $('employeePicker').oninput=e=>{if(S.picker){S.picker.query=e.target.value;paintOptions();}};
    $('employeePicker').onclick=e=>{const b=e.target.closest('[data-employee-option]');if(b&&!b.disabled){const button=S.picker.button;S.draft[S.picker.key]=b.dataset.employeeOption;paint();closePicker();button.focus();}else if(e.target.closest('[data-employee-picker-close]')){const b=S.picker?.button;closePicker();b?.focus();}};
    $('employeePicker').onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();const b=S.picker?.button;closePicker();b?.focus();return;}const options=[...$('employeePicker').querySelectorAll('[role=option]:not(:disabled)')];if(e.key==='Enter'&&e.target.matches('input')){e.preventDefault();options[0]?.click();return;}if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)&&options.length){e.preventDefault();const i=options.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?options.length-1:(i+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;options[next].focus();}};
    $('employeeForm').onsubmit=save;$('employeeClose').onclick=close;$('employeeCancel').onclick=close;$('employeeCheck').onclick=check;
    $('employeeEditor').addEventListener('cancel',e=>{e.preventDefault();if(S.picker)closePicker();else close();});window.addEventListener('resize',position);$('employeeEditor').addEventListener('scroll',position);
    document.addEventListener('crew:management-ready',()=>{const scope=identity();if(S.scope&&S.scope!==scope){S.generation++;S.rows=[];S.crews=[];S.timecards=[];S.ready=false;if(S.pending)bridge().setPending(false);S.pending=null;S.loading=false;S.saving=false;closePicker();$('employeeEditor').close();render();}load();});
    controls();
  }
  root.CrewEmployees=Object.freeze({install,load,state:S});
})(window);
