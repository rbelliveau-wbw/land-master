// Isolated rendered interaction checks. This file is never packaged with a widget.
(async function(){
 'use strict';
 const $=selector=>document.querySelector(selector),all=selector=>[...document.querySelectorAll(selector)],checks=[];
 const audit=()=>JSON.parse($('#fixture-audit').textContent),writes=()=>audit().nativeAttempts.length;
 async function wait(predicate,label='crew management'){for(let i=0;i<500;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,25));}throw new Error('Timed out waiting for '+label);}
 const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const assert=(condition,message)=>{if(!condition)throw new Error(message);};
 const click=selector=>{const node=$(selector);assert(node,'Missing control '+selector);assert(!node.disabled,'Disabled control '+selector);node.click();};
 function input(selector,value){const node=$(selector);assert(node,'Missing input '+selector);node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));}
 function mode(value){click('[data-fixture-mode="'+value+'"]');}
 async function settled(){await wait(()=>window.CrewManager?.state.ready&&!CrewManager.state.loading&&!CrewManager.state.saving,'loaded crew workspace');await frame();}
 async function selectCrew(id){const status=$('[data-cm-status="all"]');if(status)status.click();input('#crewSearch','');click('[data-cm-crew="'+id+'"]');await frame();}
 async function picker(button,id){click(button);await frame();click('#cmPicker [data-cm-option="'+id+'"]');await frame();}
 async function save(){click('#cmSave');await wait(()=>!$('#cmEditorDialog').open||$('#cmEditorStatus').dataset.state==='error'||!$('#cmCheckStatus').hidden,'editor save result');if(!$('#cmEditorDialog').open)await settled();}
 async function test(name,fn){try{await fn();checks.push({name,ok:true});}catch(error){checks.push({name,ok:false,error:error.message});throw error;}finally{const list=$('#browser-checks');if(list)list.innerHTML=checks.map(check=>'<li data-result="'+(check.ok?'pass':'fail')+'">'+(check.ok?'PASS ':'FAIL ')+check.name+(check.error?' · '+check.error:'')+'</li>').join('');}}
 async function child(modeName,fn){const element=document.createElement('iframe');element.title='Isolated '+modeName+' permissions case';element.style.cssText='position:fixed;left:0;top:0;width:1250px;height:700px;z-index:2147483645;background:#fff';element.src='/widget.html?management=1&fixtureMode='+encodeURIComponent(modeName);document.body.appendChild(element);try{await wait(()=>element.contentWindow?.CrewManager&&!element.contentWindow.CrewManager.state.loading&&(element.contentWindow.CrewManager.state.ready||['error','readonly'].includes(element.contentDocument?.querySelector('#cmStatus')?.dataset.state))&&element.contentDocument?.querySelector('#fixture-audit'),'permission fixture '+modeName);await frame();await fn(element.contentWindow,element.contentDocument);}finally{element.remove();}}
 try{
  await wait(()=>$('#fixture-tools')&&window.CrewManager,'fixture startup');await settled();
  await test('Crew workspace loads native-shaped IDs, checkbox forms and all-date records',async()=>{
   assert($('#app').dataset.workspace==='crews','Crews is the opening workspace');
   assert(all('[data-cm-crew]').length===3,'String and boolean Active values both populate active roster');
   await selectCrew('90071992547408001');
   assert($('#cmDetail').textContent.toLowerCase().includes('latest dated work')&&$('#cmDetail').textContent.toLowerCase().includes('upcoming work'),'Latest and upcoming are separately labeled');
   assert($('#cmDetail').textContent.includes('11/04/2026'),'Upcoming assignments are not limited to the seven-day badge window');
   assert(!all('[data-cm-edit-assignment="90071992547407012"]').some(node=>!node.disabled),'Imported assignment has no enabled editor');
   CrewManager.switchWorkspace('schedule');await frame();const whiteBadge=all('.crew-badge').find(node=>node.textContent==='U2');assert(whiteBadge&&getComputedStyle(whiteBadge).backgroundColor==='rgb(255, 255, 255)'&&getComputedStyle(whiteBadge).color!=='rgb(255, 255, 255)','Actual schedule crew badges retain visible text on white');CrewManager.switchWorkspace('crews');
  });
  await test('New crew validates fields and duplicate committing clicks issue one native create',async()=>{
   click('#cmNewCrew');input('#cmCode','');input('#cmColor','orange');const before=writes();await save();assert($('#cmEditorDialog').open&&writes()===before,'Invalid input causes no native write');
   input('#cmCode','QA-NEW');input('#cmName','Desktop QA Crew');input('#cmColor','#276a9b');$('#cmSave').click();$('#cmSave').click();
   await wait(()=>!$('#cmEditorDialog').open,'crew created');await settled();
   assert(writes()===before+1,'Double click sends exactly one native record create');
   const created=audit().managementWrites.at(-1);window.__qaCrewId=created.recordId;
   assert(typeof created.recordId==='string'&&created.recordId.length>15,'Native identity remains a decimal string');
   assert(created.kind==='crew'&&created.method==='POST','Crew creates its native form');
   assert($('#crewRoster').textContent.includes('QA-NEW'),'New crew appears in roster');
  });
  await test('Crew editing preserves immutable code and native source identity',async()=>{
   await selectCrew(window.__qaCrewId);click('#cmEditCrew');assert($('#cmCode').disabled||$('#cmCode').readOnly,'Existing code is immutable');input('#cmName','Desktop QA Crew Renamed');input('#cmColor','#8054c7');mode('native-single-result');await save();
   assert(!$('#cmEditorDialog').open&&$('#cmDetail').textContent.includes('Desktop QA Crew Renamed'),'Acknowledged name is displayed');
   const attempt=audit().nativeAttempts.at(-1);assert(attempt.method==='PATCH'&&attempt.config.id===window.__qaCrewId,'Update targets exact crew ID');
   assert(!Object.hasOwn(attempt.config.payload.data,'Source_System')&&!Object.hasOwn(attempt.config.payload.data,'Crew_Code'),'Update preserves source and code');
  });
  await test('Deactivation and reactivation preserve the crew and dated history',async()=>{
   click('#cmToggleActive');await wait(()=>!CrewManager.state.saving&&!CrewManager.state.loading,'deactivated crew');await frame();
   if($('#cmEditorDialog').open)await save();await settled();
   click('[data-cm-status="inactive"]');assert($('#crewRoster').textContent.includes('QA-NEW'),'Deactivated crew remains in inactive roster');
   click('[data-cm-crew="'+window.__qaCrewId+'"]');click('#cmToggleActive');await wait(()=>!CrewManager.state.saving&&!CrewManager.state.loading,'reactivated crew');if($('#cmEditorDialog').open)await save();await settled();
   click('[data-cm-status="active"]');assert($('#crewRoster').textContent.includes('QA-NEW'),'Reactivated crew returns to active roster');await selectCrew(window.__qaCrewId);
  });
  await test('A dated assignment validates input and uses native lookups and source key',async()=>{
   click('#cmNewAssignment');input('#cmDate','02/30/2027');const before=writes();await save();assert($('#cmEditorDialog').open&&writes()===before,'Invalid calendar date causes no native write');
   await picker('#cmPhasePicker','90071992547409931');input('#cmDate','11/06/2026');await save();assert(!$('#cmEditorDialog').open,'Valid assignment closes on native acknowledgement');
   const created=audit().managementWrites.at(-1),attempt=audit().nativeAttempts.at(-1);window.__qaAssignmentId=created.recordId;
   assert(created.kind==='assignment'&&created.payload.crewId===window.__qaCrewId,'Assignment uses selected crew ID');
   assert(attempt.config.payload.data.Subdivision1==='90071992547409931'&&attempt.config.payload.data.Crew===window.__qaCrewId,'Native lookups are exact decimal strings');
   assert(attempt.config.payload.data.Source_Key==='MANUAL_WIDGET:'+created.requestId,'Native assignment gets stable unique request lineage');
  });
  await test('Reassignment and date correction update the exact dated record',async()=>{
   click('[data-cm-edit-assignment="'+window.__qaAssignmentId+'"]');await picker('#cmCrewPicker','90071992547408002');await picker('#cmPhasePicker','90071992547409932');input('#cmDate','11/08/2026');await save();
   const updated=audit().managementWrites.at(-1);assert(updated.recordId===window.__qaAssignmentId&&updated.payload.crewId==='90071992547408002'&&updated.payload.phaseId==='90071992547409932'&&updated.payload.date==='2026-11-08','Reassignment corrects crew, phase and date together');
   const native=audit().nativeAttempts.at(-1).config.payload.data;assert(!Object.hasOwn(native,'Source_System')&&!Object.hasOwn(native,'Source_Record_ID')&&!Object.hasOwn(native,'Source_Key'),'Correction retains source lineage');
  });
  await test('Native rejection retains the draft and an editable retry',async()=>{
   await selectCrew(window.__qaCrewId);click('#cmEditCrew');input('#cmName','Retained native-error draft');mode('reject');await save();
   assert($('#cmEditorDialog').open&&$('#cmName').value==='Retained native-error draft','Native rejection preserves input');assert($('#cmEditorStatus').textContent.includes('rejected'),'Native error message is visible');assert(!$('#cmSave').disabled,'Known rejection permits corrected retry');
   await save();assert(!$('#cmEditorDialog').open,'Same draft can save after known rejection');
  });
  await test('Lost native response blocks duplicate writes and recovers with read-only status',async()=>{
   click('#cmEditCrew');input('#cmName','Recovered response draft');mode('lost');const before=writes();await save();
   assert($('#cmEditorDialog').open&&!$('#cmCheckStatus').hidden&&$('#cmSave').disabled,'Unknown reply locks committing action and exposes status');
   assert($('#cmName').value==='Recovered response draft'&&$('#cmName').disabled,'Draft retained while outcome is unknown');
   click('#cmCheckStatus');await wait(()=>!$('#cmEditorDialog').open,'status recovered');await settled();
   assert(writes()===before+1,'Status does not replay the native write');assert(audit().requests.at(-1).action==='management-list'||audit().requests.some(request=>request.action==='management-status'),'Recovery uses read-only status');
  });
  await test('Missing native acknowledgement identity requires recovery before another edit',async()=>{
   click('#cmEditCrew');input('#cmColor','#478044');mode('ambiguous');const before=writes();await save();assert(!$('#cmCheckStatus').hidden&&$('#cmSave').disabled,'Code 3000 without destination identity remains unknown');click('#cmCheckStatus');await wait(()=>!$('#cmEditorDialog').open,'identity recovered');await settled();assert(writes()===before+1,'Ambiguous identity recovery performs no second native save');
  });
  await test('Malformed IDs, competing IDs and nested native errors never establish success',async()=>{
   for(const [index,name] of ['native-numeric-id','native-competing-id','native-nested-error','native-denied-mixed'].entries()){
    click('#cmEditCrew');input('#cmName','Envelope recovery '+index);mode(name);const before=writes();await save();assert($('#cmEditorDialog').open&&!$('#cmCheckStatus').hidden&&$('#cmSave').disabled,name+' remains unknown');click('#cmCheckStatus');await wait(()=>!$('#cmEditorDialog').open,'recovery for '+name);await settled();assert(writes()===before+1,name+' read-only recovery never replays');
   }
  });
  await test('Explicit native 2897 denial without competing evidence is a known rejection',async()=>{
   for(const name of ['native-denied','native-thrown-denied']){click('#cmEditCrew');input('#cmName','Native denied retained draft');mode(name);const before=audit().managementWrites.length;await save();assert($('#cmEditorDialog').open&&$('#cmEditorStatus').dataset.state==='error','Explicit denial is shown as known failure');assert($('#cmCheckStatus').hidden&&!$('#cmSave').disabled,'Known rejection permits corrected draft without unknown lock');assert(audit().managementWrites.length===before&&$('#cmName').value==='Native denied retained draft','Denied native write retains draft and creates no record');click('#cmCancel');}
  });
  await test('Read-only users retain visible work and have no enabled write action',async()=>{
   await child('readonly',async(view,doc)=>{assert(doc.querySelector('#crewRoster').textContent.includes('U2'),'Read-only roster is visible');assert(doc.querySelector('#cmNewCrew').disabled,'New crew disabled for read-only user');assert(![...doc.querySelectorAll('#cmEditCrew,#cmNewAssignment,#cmToggleActive,[data-cm-edit-assignment]')].some(node=>!node.disabled),'No enabled write action for read-only user');assert(JSON.parse(doc.querySelector('#fixture-audit').textContent).nativeAttempts.length===0,'Permission check performs no native write');});
  });
  await test('Denied native report and missing required fields clear management records',async()=>{
   for(const name of ['report-denied','missing-field'])await child(name,async(view,doc)=>{assert(!view.CrewManager.state.ready,'Failure stays unready for '+name);assert(!doc.querySelector('#crewRoster').textContent.includes('Utility'),'Private roster is cleared for '+name);assert(doc.querySelector('#cmNewCrew').disabled,'Create remains disabled for '+name);assert(JSON.parse(doc.querySelector('#fixture-audit').textContent).nativeAttempts.length===0,'Fail-closed load has no writes');});
  });
  await test('Older Creator service shows a precise promotion dependency without unsupported calls',async()=>{
   await child('legacy-management',async(view,doc)=>{assert(!view.CrewManager.state.ready,'Older controller is not treated as installed management');assert(doc.querySelector('#cmStatus').dataset.state==='readonly'&&doc.querySelector('#cmStatus').textContent==='Crew management requires Creator promotion.','Specific Creator promotion message is visible');assert(doc.querySelector('#cmNewCrew').disabled,'Create stays disabled before Creator promotion');const trace=JSON.parse(doc.querySelector('#fixture-audit').textContent);assert(!trace.requests.some(request=>request.action==='management-list'),'No unsupported management-list is sent to older controller');assert(trace.nativeAttempts.length===0,'Setup dependency performs no native writes');});
  });
  await test('Pagination completes every independent report and preserves native row scope',async()=>{
   await child('paged',async(view,doc)=>{assert(view.CrewManager.state.crews.length===205&&view.CrewManager.state.assignments.length===9&&view.CrewManager.state.phases.length===6,'Every paginated crew, assignment and phase is present');const trace=JSON.parse(doc.querySelector('#fixture-audit').textContent);assert(!trace.requests.some(request=>request.action==='management-list'),'Roster never calls the connection-dependent list API');assert(trace.nativeReads.some(request=>request.action==='sdk-records'&&request.config.report_name==='All_Crews'&&request.config.record_cursor),'SDK advances the native report cursor');});
   await child('scope-denied',async(view,doc)=>{assert(!view.CrewManager.state.phases.some(row=>row.id==='90071992547409933'),'Hidden phase identity is not reintroduced');assert(!view.CrewManager.state.assignments.some(row=>row.id==='90071992547407011'),'Hidden assignment is not reintroduced');assert(!doc.querySelector('#cmDetail').textContent.includes('Turnbo Ranch - Phase 01B'),'Unavailable native phase name remains private');});
  });
  await test('Missing CFO OAuth connection cannot block signed-in roster reads; revoked module access clears data',async()=>{
   for(const modeName of ['denied','native-denied'])await child('invalid-connection',async(view,doc)=>{assert(view.CrewManager.state.ready&&doc.querySelector('#crewRoster').textContent.includes('Utility'),'Roster loads when the old list route would throw Invalid Connection');const trace=JSON.parse(doc.querySelector('#fixture-audit').textContent);assert(!trace.requests.some(request=>request.action==='management-list'),'No connection-dependent request or fallback');assert(trace.nativeAttempts.length===0,'Loading writes no records');doc.querySelector('[data-fixture-mode="'+modeName+'"]').click();doc.querySelector('#cmRefresh').click();await wait(()=>!view.CrewManager.state.loading);assert(!view.CrewManager.state.ready&&view.CrewManager.state.crews.length===0,'Module or code-only native permission denial clears the previous roster: '+modeName);});
  });
  await test('Native create/profile scope rejection remains an honest editable failure',async()=>{
   mode('create-scope-denied');click('#cmNewCrew');input('#cmCode','QA-DENIED');input('#cmName','Rejected by native scope');input('#cmColor','#276a9b');await save();assert($('#cmEditorDialog').open&&$('#cmEditorStatus').dataset.state==='error','Creator scope failure remains in editor');assert(!$('#cmSave').disabled&&$('#cmCode').value==='QA-DENIED','Known denial retains the editable draft');mode('normal');click('#cmCancel');
  });
  await test('Roster, detail, custom picker and editor stay within desktop width',async()=>{
   await selectCrew('90071992547408001');assert(document.documentElement.scrollWidth<=innerWidth+1,'No horizontal page overflow');const box=$('#crewManager').getBoundingClientRect();assert(box.width<=innerWidth,'Management card fits desktop viewport');
   click('#cmNewAssignment');click('#cmPhasePicker');await frame();for(const selector of ['#cmEditorDialog','#cmPicker']){const rect=$(selector).getBoundingClientRect();assert(rect.left>=-1&&rect.right<=innerWidth+1&&rect.top>=-1&&rect.bottom<=innerHeight+1,selector+' fits viewport');}click('#cmCancel');
   assert(!all('#cmForm select,#cmForm input[type="date"]').length,'Assignment editor uses custom searchable picker and text date entry');
  });
  $('#browser-checks').dataset.finished='passed';document.title='PASS — Crew Management browser checks';window.CrewManagementQA={passed:true,viewport:innerWidth+' × '+innerHeight,checks};
 }catch(error){if(!checks.some(check=>!check.ok))checks.push({name:'Crew Management fixture startup',ok:false,error:error.message});const list=$('#browser-checks');if(list){list.dataset.finished='failed';list.innerHTML=checks.map(check=>'<li data-result="'+(check.ok?'pass':'fail')+'">'+(check.ok?'PASS ':'FAIL ')+check.name+(check.error?' · '+check.error:'')+'</li>').join('');}document.title='FAIL — Crew Management browser checks';window.CrewManagementQA={passed:false,viewport:innerWidth+' × '+innerHeight,checks};console.error(error);}
 parent.postMessage({crewManagementQA:window.CrewManagementQA},location.origin);
})();
