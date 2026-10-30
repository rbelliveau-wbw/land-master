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
  function preserveFocus(){const b=document.activeElement;if(b?.dataset.employeeInline)S.focusCell={id:b.dataset.employeeInline,field:b.dataset.field,foreman:b.closest('[data-foreman]')?.dataset.foreman,crew:b.closest('[data-crew-detail]')?.dataset.crewDetail};}
  function staffing(crewId){const context=bridge().context();if(!S.ready||S.scope!==identity()||context.ready===false)return {ready:false,members:[],foremen:[],jobs:[]};const model=bridge().model();return {ready:true,...E.crewStaffing(S.rows,model?.foremanTimecards?model.timecards:[],crewId,M.today())};}
  function assignmentCell(id,key){if(!Object.hasOwn(fieldLabels,key)||!S.ready||S.scope!==identity())return '';const row=S.rows.find(r=>r.ID===id);return row?cell(row,key):'';}
  function feedbackForCrew(id){return S.ready&&S.scope===identity()&&S.crewSurface===id?S.staffingFeedback||{text:'',state:'ready'}:{text:'',state:'ready'};}
  const fieldLabels={territory:'Territory',laborType:'Labor Type',crewId:'Crew Assignment'};
  const chevron='<svg class="chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg>';
  function draftFor(row){return {id:row.ID,territory:row.Territory||'N/A',laborType:row.Labor_Type||'',crewId:M.id(row.Crew)};}
  function fieldLabel(row,key){const value=draftFor(row)[key],crew=key==='crewId'?S.crews.find(c=>M.id(c.ID)===value):null;return crew?(crew.Crew_Name||crew.Crew_Code):value||'Unassigned';}
  function cell(row,key){const label=fieldLabel(row,key);return '<button type="button" class="employee-inline" data-employee-inline="'+esc(row.ID)+'" data-field="'+key+'" aria-label="'+esc(fieldLabels[key]+' for '+row.EmployeeName+': '+label)+'" aria-haspopup="listbox" aria-expanded="false" title="'+esc(label)+'" '+(!E.truth(row.IsActive)||!canWrite()||locked()?'disabled':'')+'><span>'+esc(label)+'</span>'+chevron+'</button>';}
  function status(text,state='ready'){$('employeeStatus').textContent=text;$('employeeStatus').dataset.state=state;}
  function message(text,state='ready'){$('employeeSaveStatus').textContent=text;$('employeeSaveStatus').dataset.state=state;}
  function controls(){
    $('employeeRefresh').disabled=S.loading||S.saving||!!S.pending;
    $('employeeAddCrew').disabled=!canWrite()||locked();
    $('employeeSave').disabled=!canWrite()||locked();
    $('employeeCancel').disabled=S.saving;$('employeeClose').disabled=S.saving;
    $('employeeCheck').hidden=!S.pending;$('employeeCheck').disabled=S.saving;
    $('employeeFields').querySelectorAll('button').forEach(n=>n.disabled=locked());
    document.querySelectorAll('[data-employee-edit],[data-employee-inline]').forEach(n=>{const row=S.rows.find(r=>r.ID===(n.dataset.employeeInline||n.dataset.employeeEdit));n.disabled=!canWrite()||locked()||!row||!E.truth(row.IsActive);n.setAttribute('aria-busy',String(S.saving&&row?.ID===S.draft?.id));});
  }
  function render(){
    preserveFocus();
    const crews=new Map(S.crews.map(c=>[M.id(c.ID),c]));
    const rows=S.rows.filter(r=>(S.status==='all'||E.truth(r.IsActive)===(S.status==='active'))&&M.norm(r.EmployeeName+' '+r.Employee_Code+' '+r.Territory+' '+r.Labor_Type+' '+(crews.get(M.id(r.Crew))?.Crew_Code||'')).includes(M.norm(S.query)));
    const active=S.rows.filter(r=>E.truth(r.IsActive)).length;
    $('employeeSummary').innerHTML='<span data-crew-number="employees:active">'+active+'</span> Active · <span data-crew-number="employees:inactive">'+(S.rows.length-active)+'</span> Inactive';
    const previous=new Map([...$('employeeRows').children].map(n=>[n.dataset.employeeId,n])),fragment=document.createDocumentFragment();
    for(const row of rows){const id=M.id(row.ID),crew=crews.get(M.id(row.Crew));let tr=previous.get(id);if(!tr)tr=document.createElement('tr');tr.dataset.employeeId=id;
      tr.innerHTML='<td class="employee-name" title="'+esc(row.EmployeeName)+'"><strong>'+esc(row.EmployeeName)+'</strong><small>'+esc(row.Employee_Code)+'</small></td><td>'+cell(row,'territory')+'</td><td>'+cell(row,'laborType')+'</td><td>'+cell(row,'crewId')+'</td><td><span class="cm-state '+(E.truth(row.IsActive)?'active':'')+'">'+(E.truth(row.IsActive)?'Active':'Inactive')+'</span></td>';fragment.append(tr);
    }
    $('employeeRows').replaceChildren(fragment);if(!rows.length)$('employeeRows').innerHTML='<tr><td colspan="5" class="cm-empty">'+(S.rows.length?'No matching employees':'No employees synced yet')+'</td></tr>';
    document.querySelectorAll('[data-employee-status]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.employeeStatus===S.status)));renderGroups(crews);controls();
  }
  function restoreCellFocus(){if(S.loading||S.saving||S.pending)return;const f=S.focusCell;if(f&&document.activeElement===document.body){const host=f.crew?document.querySelector('[data-crew-detail="'+f.crew+'"]'):f.foreman?document.querySelector('[data-foreman="'+f.foreman+'"]'):$('employeeRows');const button=host?.querySelector('[data-employee-inline="'+f.id+'"][data-field="'+f.field+'"]:not(:disabled)');(button||f.crew&&$('cmEditCrew'))?.focus({preventScroll:true});}S.focusCell=null;}
  function renderGroups(crews){
    $('employeeForemanView').disabled=!S.groupsEnabled;
    let groups=[];try{groups=E.foremanGroups(S.rows,S.timecards,M.today());}catch(error){$('employeeGroups').replaceChildren();$('employeeGroupStatus').textContent=error.message;return;}
    const matches=row=>(S.status==='all'||E.truth(row.IsActive)===(S.status==='active'));
    const html=[];
    for(const group of groups){
      const foreman=group.foreman,crew=crews.get(M.id(foreman.Crew)),ownerMatch=M.norm(foreman.EmployeeName+' '+foreman.Employee_Code+' '+(crew?.Crew_Name||crew?.Crew_Code||'')).includes(M.norm(S.query));
      const members=[...group.members.values()].filter(m=>matches(m.employee)&&(ownerMatch||M.norm(m.employee.EmployeeName+' '+m.employee.Employee_Code+' '+[...m.jobs].join(' ')).includes(M.norm(S.query)))).sort((a,b)=>String(a.employee.EmployeeName).localeCompare(String(b.employee.EmployeeName)));
      if(!members.length)continue;
      html.push('<article class="employee-foreman-group" data-foreman="'+esc(group.key)+'"><header><h3>'+esc(foreman.EmployeeName)+(E.truth(foreman.IsActive)?'':' · Inactive')+'</h3><span class="cm-count"><span data-crew-number="foreman:'+esc(group.key)+':members">'+members.length+'</span> Employees</span><div class="employee-foreman-fields"><span>Labor Type</span>'+cell(foreman,'laborType')+'<span>Crew</span>'+cell(foreman,'crewId')+'</div></header><table><thead><tr><th>Employee</th><th>Work Dates</th><th>Jobs</th><th>Territory</th><th>Labor Type</th><th>Current Crew</th></tr></thead><tbody>'+members.map(m=>{const row=m.employee,dates=[...m.dates].sort((a,b)=>a-b),jobs=[...m.jobs].sort().join(', '),range=dates.length===1?M.us(dates[0]):dates.length+' Days · '+M.us(dates[0]).slice(0,-5)+'–'+M.us(dates.at(-1)).slice(0,-5);return '<tr data-member="'+esc(M.id(row.ID))+'"><td class="employee-name" title="'+esc(row.EmployeeName)+'"><strong>'+esc(row.EmployeeName)+'</strong><small>'+esc(row.Employee_Code)+(E.truth(row.IsActive)?'':' · Inactive')+'</small></td><td title="'+dates.map(M.us).map(esc).join(', ')+'">'+esc(range)+'</td><td title="'+esc(jobs)+'">'+esc(jobs)+'</td><td>'+cell(row,'territory')+'</td><td>'+cell(row,'laborType')+'</td><td>'+cell(row,'crewId')+'</td></tr>';}).join('')+'</tbody></table></article>');
    }
    $('employeeGroups').innerHTML=html.join('');$('employeeGroupStatus').textContent=!S.groupsEnabled?'Foreman groups require Creator promotion.':html.length?'Recorded Timecards · '+M.us(M.today()-13)+'–'+M.us(M.today())+' · Groups for Review':'No matching employee groups in the past 14 days.';
  }
  function chooseView(view){closePicker();S.view=view;document.querySelectorAll('[data-employee-view]').forEach(n=>{const selected=n.dataset.employeeView===view;n.setAttribute('aria-selected',String(selected));n.tabIndex=selected?0:-1;});$('employeeListPanel').hidden=view!=='roster';$('employeeGroupPanel').hidden=view!=='foremen';}
  async function load(){
    if(S.loading||S.saving||S.pending)return;
    preserveFocus();
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
      S.rows=values[0].sort((a,b)=>String(a.EmployeeName).localeCompare(String(b.EmployeeName)));S.crews=values[1];S.timecards=values[2]||[];S.groupsEnabled=groupsEnabled;if(!groupsEnabled)chooseView('roster');S.ready=true;S.scope=scope;render();document.dispatchEvent(new CustomEvent('crew:employees-changed'));
      status(cap.permissions.assignments===true?'':'Employee assignments are read-only for your account.');
      if(!S.opened){S.opened=true;CrewManager.switchWorkspace('employees');}
      try{const pending=JSON.parse(sessionStorage.getItem(storageKey()));if(pending?.action==='save-employee'&&pending.employee?.id&&pending.requestId){S.pending=pending;bridge().setPending(true);open(S.rows.find(r=>r.ID===pending.employee.id),pending.employee);message('The previous save needs review. No write has been replayed.','unknown');controls();}}catch{}
    }catch(error){
      if(scope!==identity()||generation!==S.generation)return;
      if(error.setup||error.permissionDenied||/permission|denied|expose|invalid|incomplete|access|granted/i.test(error.message)){S.ready=false;S.rows=[];S.crews=[];S.timecards=[];render();document.dispatchEvent(new CustomEvent('crew:employees-changed'));}
      status(error.message+(S.ready?' Your last complete roster is still shown.':''),'error');
    }finally{if(generation===S.generation){S.loading=false;controls();restoreCellFocus();}}
  }
  function open(row,restored){
    if(!row||!restored&&(!canWrite()||locked()))return;
    S.returnFocus=document.activeElement;S.inline=false;S.draft=restored?{...restored}:draftFor(row);
    $('employeeEditorTitle').textContent=row.EmployeeName;
    $('employeeFields').innerHTML=['territory','laborType','crewId'].map(key=>'<div class="cm-field full"><label id="employeeLabel-'+key+'">'+fieldLabels[key]+'</label><button type="button" class="cm-picker-button" data-employee-pick="'+key+'" aria-labelledby="employeeLabel-'+key+' employeeValue-'+key+'" aria-haspopup="listbox" aria-expanded="false"><span id="employeeValue-'+key+'"></span>'+chevron+'</button></div>').join('');
    paint();message('');$('employeeEditor').showModal();controls();$('employeeFields').querySelector('button')?.focus({preventScroll:true});
  }
  function paint(){for(const key of ['territory','laborType','crewId']){const v=S.draft[key],c=key==='crewId'?S.crews.find(c=>M.id(c.ID)===v):null;$('employeeValue-'+key).textContent=c?(c.Crew_Name||c.Crew_Code):v||'Unassigned';}}
  function close(){if(S.saving)return;closePicker();$('employeeEditor').close();if(S.returnFocus?.isConnected)S.returnFocus.focus({preventScroll:true});if(S.pending){status('Employee save needs review.','unknown');const b=document.createElement('button');b.textContent='Review Save';b.onclick=()=>{$('employeeEditor').showModal();$('employeeCheck').focus();};$('employeeStatus').append(b);}}
  function options(key){
    if(key==='crewId')return [{id:'',label:'Unassigned'},...S.crews.filter(c=>E.truth(c.Active)||M.id(c.ID)===S.draft.crewId).map(c=>({id:M.id(c.ID),label:(c.Crew_Name||c.Crew_Code)+' · '+c.Crew_Code,disabled:!E.truth(c.Active)&&M.id(c.ID)!==S.draft.crewId}))];
    if(key==='laborType')return ['','Superintendent','Foreman','Skilled','Unskilled','Pipe Layer','Laborer'].map(v=>({id:v,label:v||'Unassigned'}));
    return [...new Set(['N/A',...((bridge().model()?.phases)||[]).map(p=>p.territory),...S.rows.map(r=>r.Territory)].filter(Boolean))].sort().map(v=>({id:v,label:v}));
  }
  const pickerHost=()=>$(S.picker?.inline?'employeeInlinePicker':'employeePicker');
  function inline(button){
    const row=S.rows.find(r=>r.ID===button.dataset.employeeInline);
    if(!row||!E.truth(row.IsActive)||!canWrite()||locked())return;
    S.returnFocus=button;S.inline=true;S.crewSurface=button.closest('[data-crew-detail]')?.dataset.crewDetail||'';S.draft=draftFor(row);picker(button,true);
  }
  function picker(button,isInline=false){if(locked())return;closePicker();const key=isInline?button.dataset.field:button.dataset.employeePick;S.picker={key,button,query:'',inline:isInline,scope:identity()};button.setAttribute('aria-expanded','true');const p=pickerHost();p.hidden=false;p.innerHTML='<input type="search" aria-label="Search '+esc(fieldLabels[key])+'" placeholder="Search '+esc(fieldLabels[key])+'"><div class="cm-picker-list" role="listbox" aria-label="'+esc(fieldLabels[key])+'"></div><div class="cm-picker-footer"><button type="button" data-employee-picker-close>Close</button></div>';paintOptions();p.querySelector('input').focus({preventScroll:true});}
  function position(){if(!S.picker)return;if(!S.picker.button.isConnected||S.picker.scope!==identity()){closePicker();return;}const box=S.picker.button.getBoundingClientRect(),p=pickerHost(),gap=6,space=innerHeight-box.bottom-18,above=box.top-18,up=space<200&&above>space;p.style.maxHeight=Math.max(100,Math.min(350,up?above:space))+'px';p.style.left=Math.max(12,Math.min(box.left,innerWidth-p.offsetWidth-12))+'px';p.style.top=Math.max(12,up?box.top-gap-p.offsetHeight:box.bottom+gap)+'px';}
  function paintOptions(){const {key,query}=S.picker;pickerHost().querySelector('[role=listbox]').innerHTML=options(key).filter(o=>M.norm(o.label).includes(M.norm(query))).map(o=>'<button type="button" class="cm-picker-option" role="option" aria-selected="'+(S.draft[key]===o.id)+'" data-employee-option="'+esc(o.id)+'" '+(o.disabled?'disabled':'')+'><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-8"/></svg><span>'+esc(o.label)+'</span></button>').join('')||'<div class="cm-empty">No matching options</div>';position();}
  function closePicker(){if(S.picker){S.picker.button.setAttribute('aria-expanded','false');pickerHost().hidden=true;S.picker=null;}}
  function saveMessage(text,state='ready'){if(S.inline){status(text,state);S.staffingFeedback={text,state};const node=$('cmStaffingStatus');if(node&&node.closest('[data-crew-detail]')?.dataset.crewDetail===S.crewSurface){node.textContent=text;node.dataset.state=state;}}else message(text,state);}
  async function save(event){
    event?.preventDefault();if(!canWrite()||locked()||!S.draft)return;closePicker();
    const row=S.rows.find(r=>r.ID===S.draft.id);if(!row||!E.truth(row.IsActive))return;
    if(S.inline&&S.returnFocus?.dataset.employeeInline){const b=S.returnFocus;S.focusCell={id:b.dataset.employeeInline,field:b.dataset.field,foreman:b.closest('[data-foreman]')?.dataset.foreman,crew:b.closest('[data-crew-detail]')?.dataset.crewDetail};}
    const body={action:'save-employee',requestId:crypto.randomUUID(),employee:{...S.draft}},scope=identity();S.saving=true;controls();saveMessage('Saving assignment…','pending');
    try{sessionStorage.setItem(storageKey(),JSON.stringify(body));const result=await bridge().api(body,true);if(scope!==identity())return;finish(result,body);}
    catch(error){if(scope!==identity())return;if(error.unknown){S.pending=body;bridge().setPending(true);if(S.inline){open(row,body.employee);}message(error.message,'unknown');}else{sessionStorage.removeItem(storageKey());saveMessage(error.message,'error');}}
    finally{S.saving=false;controls();}
  }
  function finish(result,body){
    if(result.state!=='saved'||result.requestId!==body.requestId||result.recordId!==body.employee.id||result.kind!=='employee')throw Object.assign(new Error('The employee save identity needs review.'),{unknown:true});
    const row=S.rows.find(r=>r.ID===body.employee.id);if(row)Object.assign(row,{Territory:body.employee.territory,Labor_Type:body.employee.laborType,Crew:body.employee.crewId});
    S.pending=null;S.saving=false;sessionStorage.removeItem(storageKey());bridge().setPending(false);close();render();S.staffingFeedback={text:'',state:'ready'};status('');LMSuccess.show('Employee assignment saved.');
    document.dispatchEvent(new CustomEvent('crew:employees-changed'));
    document.querySelectorAll('[data-employee-id="'+body.employee.id+'"]>td,[data-member="'+body.employee.id+'"]>td,[data-crew-member="'+body.employee.id+'"]>td').forEach(node=>LMMotion.flash?.(node));
    restoreCellFocus();
    bridge().reload().then(load).catch(error=>status('Saved. '+error.message,'error'));
  }
  async function check(){if(!S.pending||S.saving)return;S.saving=true;controls();message('Checking the saved assignment…','pending');const body=S.pending,scope=identity();try{const result=await bridge().api({...body,action:'employee-status'});if(scope!==identity())return;if(result.state==='saved')finish(result,body);else message('The save is unconfirmed. Review the employee in Creator. No write was replayed.','unknown');}catch(e){message(e.message,'unknown');}finally{S.saving=false;controls();}}
  function install(){
    $('employeeView').onclick=e=>{const b=e.target.closest('[data-employee-view]');if(b&&!b.disabled)chooseView(b.dataset.employeeView);};
    $('employeeView').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const tabs=[...$('employeeView').querySelectorAll('[role=tab]:not(:disabled)')];if(tabs.length<2)return;e.preventDefault();const next=tabs.find(n=>n!==document.activeElement)||tabs[0];next.click();next.focus();};
    $('employeeSearch').oninput=e=>{closePicker();S.query=e.target.value;render();};$('employeeFilters').onclick=e=>{const b=e.target.closest('[data-employee-status]');if(b){closePicker();S.status=b.dataset.employeeStatus;render();}};
    for(const host of [$('employeeRoster'),$('cmDetail')])host.addEventListener('click',e=>{const b=e.target.closest('[data-employee-inline]');if(b&&!b.disabled)inline(b);});
    $('employeeAddCrew').onclick=()=>CrewManager.newCrew();$('employeeRefresh').onclick=()=>LMMotion.refresh($('employeeRoster'),load,{allowed:()=>!locked()});
    $('employeeFields').onclick=e=>{const b=e.target.closest('[data-employee-pick]');if(b)picker(b);};
    for(const id of ['employeePicker','employeeInlinePicker']){
      const p=$(id);
      p.oninput=e=>{if(S.picker){S.picker.query=e.target.value;paintOptions();}};
      p.onclick=e=>{const b=e.target.closest('[data-employee-option]');if(b&&!b.disabled&&S.picker){const {button,key,inline:isInline,scope}=S.picker;if(scope!==identity()||!canWrite()||locked()){closePicker();return;}const changed=S.draft[key]!==b.dataset.employeeOption;S.draft[key]=b.dataset.employeeOption;if(!isInline)paint();closePicker();button.focus();if(isInline&&changed)save();}else if(e.target.closest('[data-employee-picker-close]')){const b=S.picker?.button;closePicker();b?.focus();}};
      p.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();const b=S.picker?.button;closePicker();b?.focus();return;}const choices=[...p.querySelectorAll('[role=option]:not(:disabled)')];if(e.key==='Enter'&&e.target.matches('input')){e.preventDefault();choices[0]?.click();return;}if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)&&choices.length){e.preventDefault();const i=choices.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?choices.length-1:(i+(e.key==='ArrowDown'?1:-1)+choices.length)%choices.length;choices[next].focus();}};
    }
    document.addEventListener('pointerdown',e=>{if(S.picker?.inline&&!pickerHost().contains(e.target)&&!S.picker.button.contains(e.target))closePicker();});
    document.addEventListener('focusin',e=>{if(S.picker?.inline&&!pickerHost().contains(e.target)&&e.target!==S.picker.button)closePicker();});
    $('employeeForm').onsubmit=save;$('employeeClose').onclick=close;$('employeeCancel').onclick=close;$('employeeCheck').onclick=check;
    $('employeeEditor').addEventListener('cancel',e=>{e.preventDefault();if(S.picker)closePicker();else close();});window.addEventListener('resize',position);document.addEventListener('scroll',position,true);
    document.addEventListener('crew:management-ready',()=>{const scope=identity();if(S.scope&&S.scope!==scope){S.generation++;S.rows=[];S.crews=[];S.timecards=[];S.ready=false;if(S.pending)bridge().setPending(false);S.pending=null;S.loading=false;S.saving=false;closePicker();$('employeeEditor').close();render();}load();});
    controls();
  }
  root.CrewEmployees=Object.freeze({install,load,state:S,staffing,assignmentCell,feedbackForCrew,preserveFocus,restoreFocus:restoreCellFocus});
})(window);
