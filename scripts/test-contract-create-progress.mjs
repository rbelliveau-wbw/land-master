import assert from 'node:assert/strict';
import {ready,drain,deferred,ID,SUB,ACCESS,NEW} from './test-contract-sdk-v2-foundation.mjs';
const writes=h=>h.calls.filter(call=>['add','update','delete'].includes(call.method));
function draft(h){h.c.S.nc={type:'DA',project:'',parent:'',sub:[SUB],wbw:[],builder:'',name:'Creation progress fixture',territory:'Austin',status:'Proposed',acts:[{title:'Captured action',sort:1}],seedSource:'default',owners:[ACCESS],lotIds:[],ppf:{},totalLots:'',emPerLot:'',initLots:'',initDays:'',contLots:'',contDays:''};return h.c.S.nc;}
const visible=h=>{assert.equal(h.node('contractSaveOverlay').hidden,false);assert.ok(h.c.document.body.children.some(node=>node.inert));assert.ok(h.c.ContractSetupUI.progress()?.open);};
{
 const h=await ready({realDOM:true}),gate=deferred(),native=h.api.addRecords;draft(h);h.api.addRecords=config=>gate.promise.then(()=>native(config));
 let pending,sends=0;const submit=h.c.ncSubmit;h.c.ncSubmit=(...args)=>{sends++;return pending=submit(...args);};
 Object.assign(h.c.S.actions[0],{Contract_Template:'Builder'});h.c.ncOpen();h.c.ncConfirm();assert.ok(h.c.document.getElementById('cfOk'));h.c.confirmProceed();await drain();
 visible(h);assert.equal(h.c.document.getElementById('nc_submit'),null,'the creation editor is closed');assert.equal(h.node('overlays').innerHTML,'');assert.equal(h.node('contractSaveTitle').textContent,'Creating contract');
 assert.equal(h.c.ContractSetupUI.close(),false);assert.equal(h.node('contractSaveClose').disabled,true);assert.equal(await submit([],[]),false);assert.equal(h.c.closeOverlays(),false);assert.equal(h.node('contractSaveBar').getAttribute('aria-valuenow'),'0');
 gate.resolve();const result=await pending;assert.equal(result.error,null);assert.equal(sends,1);visible(h);assert.equal(h.node('contractSaveTitle').textContent,'Contract created');assert.equal(h.node('contractSaveStatus').textContent,'Sent to Legal for review.');assert.equal(h.node('contractSaveBar').getAttribute('aria-valuenow'),'100');
 assert.equal(h.node('contractSaveDetails').open,false);assert.equal(h.node('contractSaveResults').children.length,result.rows.length);assert.ok([0,1,2].every(i=>h.node('contractSaveStageChip'+i).textContent==='Done'));assert.equal(writes(h).length,result.rows.length);
 assert.equal(h.c.ContractSetupUI.close(),true);assert.equal(h.c.S.contractWorkflow,null);assert.equal(h.c.S.nc,null);assert.equal(h.c.S.selId,NEW);assert.equal(h.c.document.getElementById('cStatusSel'),null,'created Proposed status is read-only');assert.match(h.node('banners').innerHTML,/sent to Legal for review/);assert.equal(h.c.S.contractWorkflowHistory[0].entries.length,result.rows.length);
}
{
 const h=await ready({realDOM:true,fakeTime:true});draft(h);while(h.c.LMPerf.snapshot().rate.dispatched<39)await h.c.LMData.request('recent-request-fixture',()=>({code:3000}));
 const result=await h.c.ncSubmit(Array.from({length:7},(_,i)=>({title:'Action '+i,sort:i+1})),[{email:'first@example.test',seq:1},{email:'second@example.test',seq:2}]);
 assert.equal(result.error,null);const trace=JSON.parse(h.node('contract-workflow-audit').textContent)[0];assert.equal(trace.status,'verified');assert.equal(trace.verified,11);assert.equal(writes(h).length,11);assert.ok(trace.requests.every(row=>row.queuedMs===0));assert.ok(h.maximum()<=3);visible(h);assert.equal(h.c.ContractSetupUI.close(),true);
}
{
 const h=await ready({realDOM:true}),native=h.api.addRecords,source=draft(h);h.api.addRecords=async config=>{const response=await native(config);return config.form_name==='Contract_Actions'?{code:3000,data:{ID:response.result[0].data.ID},details:{code:2899}}:response;};
 const result=await h.c.ncSubmit([{title:'Saved action',sort:1},{title:'Unsent action',sort:2}],[]),run=h.c.S.contractWorkflow,count=writes(h).length;
 assert.ok(result.error);visible(h);assert.equal(h.c.S.nc,source);assert.equal(run.entries[1].state,'unknown');assert.equal(run.entries[2].state,'not-sent');assert.equal(h.node('contractSaveMessage').getAttribute('role'),'alert');assert.notEqual(h.node('contractSaveBar').getAttribute('aria-valuenow'),'100');assert.equal(h.node('contractSaveRecheck').hidden,false);
 await h.node('contractSaveRecheck').fire('click');await drain();assert.equal(run.entries[1].state,'verified');assert.equal(run.entries[2].state,'not-sent');assert.equal(writes(h).length,count,'recheck does not resume unsent setup');assert.ok(run.error);assert.equal(h.c.ContractSetupUI.close(),true);assert.equal(h.c.S.selId,NEW);assert.match(h.node('banners').innerHTML,/Setup needs review/);
}
{
 const h=await ready({realDOM:true}),native=h.api.updateRecordById;draft(h);h.api.updateRecordById=async config=>{await native(config);return {code:3000,data:{ID:config.id},details:{code:2899}};};
 const result=await h.c.ncSubmit([],[]);assert.ok(result.error);const count=writes(h).length;await h.node('contractSaveRecheck').fire('click');await drain();assert.equal(writes(h).length,count);assert.equal(h.c.S.contractWorkflow.error,null);assert.equal(h.node('contractSaveBar').getAttribute('aria-valuenow'),'100');assert.equal(h.c.ContractSetupUI.close(),true);assert.match(h.node('banners').innerHTML,/sent to Legal for review/);
}
{
 const h=await ready({realDOM:true}),gate=deferred(),native=h.api.addRecords;draft(h);h.api.addRecords=config=>gate.promise.then(()=>native(config));const pending=h.c.ncSubmit([],[]);await drain();h.tick(30000);const result=await pending;
 assert.ok(result.error);visible(h);assert.equal(h.node('contractSaveClose').disabled,true,'native deadline cannot unlock a pending request');assert.equal(h.node('contractSaveRecheck').disabled,true);assert.equal(h.c.ContractSetupUI.close(),false);gate.resolve();await drain();await h.node('contractSaveRecheck').fire('click');await drain();assert.equal(writes(h).length,1,'late settlement with no captured ID cannot choose or recreate a parent');assert.equal(h.c.S.contractWorkflow.entries[0].state,'unknown');
}
{
 const h=await ready({realDOM:true,criticalReporter:true}),mails=[];draft(h);h.api.invokeCustomApi=async config=>{mails.push(config);return {code:3000,details:{output:JSON.stringify({success:true})}};};h.api.addRecords=async()=>({code:3000});
 const result=await h.c.ncSubmit([],[]),run=h.c.S.contractWorkflow;assert.ok(result.error);assert.equal(h.c.S.audit.filter(entry=>entry.message==='Contract creation failed').length,1);h.tick(1200);await drain();assert.equal(mails.length,1);assert.equal(mails[0].api_name,'Report_Proforma_Widget_Error');assert.doesNotMatch(JSON.parse(mails[0].payload.payload).body,/Creation progress fixture/);await h.c.contractWorkflowFinish(run,run.error);assert.equal(mails.length,1);assert.equal(h.c.S.audit.filter(entry=>entry.message==='Contract creation failed').length,1);
}
{
 const h=await ready({realDOM:true}),native=h.api.addRecords;draft(h);h.api.addRecords=async()=>({code:2945,message:'Rejected fixture'});const result=await h.c.ncSubmit([],[]);assert.ok(result.error);assert.equal(h.c.contractHasReviews(),false);visible(h);assert.equal(h.c.ContractSetupUI.close(),true);assert.ok(h.c.document.getElementById('nc_submit'),'definite rejection returns to the editable retained draft');assert.ok(h.c.S.nc);h.api.addRecords=native;
}
{
 const h=await ready({realDOM:true});draft(h);h.c.S.nc.type='Lot (Master)';assert.equal(await h.c.ncSubmit([],[]),false);assert.equal(writes(h).length,0);assert.equal(h.c.document.getElementById('contractSaveOverlay'),null,'required-field validation leaves the editor intact');

}
console.log('PASS creation progress: closed editor, mounted stages and retained verified result, explicit dismiss, read-only Proposed detail, one-send and pending locks, exact recheck without replay, partial setup, late timeout, private audit/failure reporting once, editable rejected draft and unchanged routine pricing.');
