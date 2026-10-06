import assert from 'node:assert/strict';
import vm from 'node:vm';
import {saveFixture} from './fixtures/proforma-sdk-v2-save-fixture.mjs';
import {ID,OTHER,clone,held,drain,ready,source} from './fixtures/proforma-sdk-v2-harness.mjs';
// Phase flag verification must distinguish a hidden/missing checkbox from false.
for(const same of [false,true])for(const kind of ['native','formatted','missing-version','missing-checkbox','wrong-version','wrong-checkbox','invalid-checkbox']){
 let recovered=false;
 const h=await saveFixture({model:m=>{m.Same_Lot_Sales_All_Phases=same;},read:(cfg,storage)=>{
  if(cfg.report_name!=='All_Pro_Formas_All_Fields'||!storage.All_Proforma_Phases.length||recovered)return;
  const rows=clone(storage.All_Pro_Formas_All_Fields.filter(row=>row.ID===ID)),row=rows[0];
  if(kind==='formatted'){row.Lot_Sales_Schedule_Version='2.00';row.Same_Lot_Sales_All_Phases=same?'True':'False';}
  if(kind==='missing-version')delete row.Lot_Sales_Schedule_Version;
  if(kind==='missing-checkbox')delete row.Same_Lot_Sales_All_Phases;
  if(kind==='wrong-version')row.Lot_Sales_Schedule_Version='1';
  if(kind==='wrong-checkbox')row.Same_Lot_Sales_All_Phases=!same;
  if(kind==='invalid-checkbox')row.Same_Lot_Sales_All_Phases='unknown';
  return {code:3000,data:rows};
 }});
 await h.widget.saveProforma();
 if(['native','formatted'].includes(kind)){assert.equal(h.widget.S.ed.dirty,false,JSON.stringify(h.widget.PFTransport.snapshot()));continue;}
 const t=h.widget.PFTransport,review=t.snapshot().reviews[0];assert.equal(h.widget.S.ed.dirty,true);assert.ok(review);
 assert.match(review.error,kind.startsWith('missing-')?/could not be read.*(?:Lot_Sales_Schedule_Version|Same_Lot_Sales_All_Phases)/:/expected 2, saved.*expected (?:true|false), saved/);
 h.widget.PFTransportUI.close();const sends=h.calls.filter(call=>call.method==='custom').length;
 assert.equal(h.widget.saveProforma(),false);assert.equal(await t.recheck(review.key),false);
 recovered=true;assert.equal(await t.recheck(review.key),true);
 assert.equal(h.calls.filter(call=>call.method==='custom').length,sends,'flag recheck never resends the financial or phase write');
}
{
 const h=await saveFixture();assert.deepEqual(clone(h.widget.validateModel(h.model)),[]);const promise=h.widget.saveProforma();assert.equal(h.document.getElementById('pfNativeProgress').hidden,false);assert.equal(h.widget.PFTransportUI.close(),false);await promise;
 assert.equal(h.document.getElementById('pfNativeResults').hidden,true);assert.equal(h.document.getElementById('pfNativeResults').children.length,0);assert.equal(h.document.getElementById('pfNativeSummary').hidden,true);for(const index of [1,2,3])assert.equal(h.document.getElementById('pfNativeStage'+index).parentNode.hidden,true);assert.equal(h.document.getElementById('pfNativeAnnounce').textContent,'Pro Forma saved.');assert.equal(h.document.getElementById('pfNativeFill').style.width,'100%');
 assert.equal(h.widget.S.ed.dirty,false);assert.equal(h.widget.PFTransport.snapshot().reviews.length,0);assert.ok(h.widget.PFTransport.snapshot().ledger.every(row=>row.state==='verified'));assert.equal(h.storage.All_Proforma_Months.length,h.expectedCalc.months.length);assert.equal(h.storage.All_Proforma_Months.reduce((sum,row)=>sum+Number(row.Lots_Sold||0),0),100);assert.ok(h.maxActive()<=3);assert.equal(h.document.getElementById('pfNativeProgress').hidden,true);assert.equal(h.widget.PFTransport.snapshot().workflow,null);assert.equal(h.widget.PFTransportUI.close(),false);
}
{
 let sends=0;const h=await saveFixture({invoke:(config,storage,body,apply)=>{if(!body.op&&body.header){sends++;apply();throw new Error('Applied Save_PF response lost');}}});const inputModel=h.widget.S.ed.model;await h.widget.saveProforma();assert.equal(sends,1);assert.equal(h.widget.S.ed.model,inputModel);assert.equal(h.widget.S.ed.dirty,true);assert.equal(h.widget.PFTransport.snapshot().reviews.length,1);assert.equal(h.widget.PFTransportUI.close(),true);assert.equal(h.widget.saveProforma(),false);assert.equal(sends,1);const review=h.widget.PFTransport.snapshot().reviews[0];assert.equal(await h.widget.PFTransport.recheck(review.key),true);assert.equal(sends,1,'read-only recovery never invokes Save_PF again');
 assert.equal(h.document.getElementById('pfNativeAnnounce').textContent,'Save needs checking. Your draft has been kept.');assert.notEqual(h.document.getElementById('pfNativeFill').style.width,'100%');
}
{
 let sends=0;const h=await saveFixture({model:m=>{m.ID=null;},invoke:(config,storage,body,apply)=>{if(!body.op&&body.header){sends++;apply();throw new Error('Applied create response lost');}}});await h.widget.saveProforma();assert.equal(h.widget.S.ed.model.ID,null);assert.equal(h.widget.PFTransportUI.close(),true);assert.equal(h.widget.saveProforma(),false);assert.equal(await h.widget.PFTransport.recheck(h.widget.PFTransport.snapshot().reviews[0].key),false);assert.equal(sends,1);assert.equal(h.storage.All_Pro_Formas_All_Fields.length,2,'no name-based guess or second parent insert');
}
{
 let sends=0,deny=false;const h=await saveFixture({model:m=>{m.ID=null;},invoke:(config,storage,body,apply)=>{if(!body.op&&body.header){sends++;const result=apply();deny=true;return result;}},count:config=>deny&&config.report_name==='All_Pro_Formas_All_Fields'&&config.criteria?{code:2898,error:'Denied created parent readback'}:undefined});await h.widget.saveProforma();assert.equal(h.widget.S.ed.model.ID,null);assert.equal(h.widget.PFTransportUI.close(),true);assert.equal(h.widget.saveProforma(),false);deny=false;assert.equal(await h.widget.PFTransport.recheck(h.widget.PFTransport.snapshot().reviews[0].key),true);assert.match(h.widget.S.ed.model.ID,/^\d+$/);assert.notEqual(h.widget.S.ed.model.ID,ID);assert.equal(h.widget.S.ed.id,h.widget.S.ed.model.ID);assert.equal(sends,1);assert.equal(h.storage.All_Pro_Formas_All_Fields.length,2);
}
{
 const gate=held();let sends=0;const h=await saveFixture({invoke:(config,storage,body,apply)=>{if(!body.op&&body.header){sends++;apply();return gate.promise;}}});const pending=h.widget.saveProforma();await drain();assert.equal(h.widget.saveProforma(),false);assert.equal(h.widget.openEdit(null),false);assert.equal(h.widget.guardLeaveEdit(()=>{throw Error('must not navigate');}),false);assert.equal(h.widget.PFTransportUI.close(),false);h.tick(30000);await pending;assert.equal(h.widget.S.ed.dirty,true);assert.equal(h.widget.PFTransportUI.close(),true);const review=h.widget.PFTransport.snapshot().reviews[0];assert.equal(await h.widget.PFTransport.recheck(review.key),false);gate.resolve({code:3000,result:JSON.stringify({success:true,id:ID})});await drain();assert.equal(await h.widget.PFTransport.recheck(review.key),true);assert.equal(sends,1);
}
{
 let denied=true;const h=await saveFixture({count:config=>config.report_name==='All_Proforma_Months'&&denied?{code:3000,result:{records_count:'0'},output:JSON.stringify({code:2898,error:'Denied saved month count'})}:undefined});await h.widget.saveProforma();assert.equal(h.widget.S.ed.dirty,true);assert.ok(h.widget.PFTransport.snapshot().reviews.length>0,'failed final readback retains the verified partial run');assert.equal(h.widget.PFTransportUI.close(),true);const writes=h.writes.length;assert.equal(h.widget.saveProforma(),false);denied=false;assert.equal(await h.widget.PFTransport.recheck(h.widget.PFTransport.snapshot().reviews[0].key),true);assert.equal(h.writes.length,writes);
}
{
 let blocked=false;const gate=held(),h=await saveFixture({read:config=>blocked&&config.report_name==='All_Pro_Formas_All_Fields'?gate.promise:undefined,update:(cfg,apply)=>{apply();blocked=true;return {code:3000,data:{ID}};}});const pending=h.widget.saveProforma();await drain();assert.equal(h.widget.PFTransport.snapshot().verificationReads,1);h.tick(180000);await pending;assert.equal(h.widget.S.ed.dirty,true);assert.equal(h.widget.PFTransportUI.close(),true);const review=h.widget.PFTransport.snapshot().reviews[0];assert.equal(await h.widget.PFTransport.recheck(review.key),false);const count=h.writes.length;blocked=false;gate.resolve({code:3000,data:clone(h.storage.All_Pro_Formas_All_Fields)});await drain();assert.equal(h.widget.PFTransport.snapshot().reviews.length,1,'late readback cannot claim Saved');assert.equal(await h.widget.PFTransport.recheck(review.key),true);assert.equal(h.writes.length,count);
}
// Actual progress/parser functions feed the whole-IIFE's real sdkInvoke and
// PFTransport. Only native Custom API outcomes and audit display are fixtures.
async function progressBoundary(raw,options={}){
 let sends=0;const gate=options.pending?held():null;
 const h=await ready({invoke:config=>{if(/^(Start_Proforma_Approval_Chain|Handle_Proforma_Approval_Action)(?:_DEV)?$/.test(config.api_name)){sends++;return gate?gate.promise:raw;}}});
 const context=vm.createContext({S:h.widget.S,CFG:h.widget.CFG,sdkInvoke:h.widget.sdkInvoke,LMRuntime:h.c.LMRuntime,responseBad:h.c.LMData.responseFailed,auditLog(){},pfApprovalProgress:null});
 vm.runInContext(source.slice(source.indexOf('function parseApprovalApiResult('),source.indexOf('function loadApprovals(')),context);
 vm.runInContext(source.slice(source.indexOf('function pfRejectSnapshot('),source.indexOf('function pfApprovalValid(')),context);
 const p={kind:options.kind||'reject',id:ID,approvalId:OTHER,note:'Fixture rejection',reconciliationUnavailable:false};context.pfApprovalProgress=p;
 return {h,context,p,gate,sends:()=>sends};
}
for(const kind of ['reject','start']){
 const raw={code:3000,result:JSON.stringify({success:false,message:'Approval is no longer pending.'})},b=await progressBoundary(raw,{kind});
 await assert.rejects(b.context.pfProgressSnapshot(b.p,'Check'),error=>/targeted Pro Forma approval status/i.test(error.message)&&error.reconciliationUnavailable===true&&error.noReplay===true&&error.response===raw&&error.cause.noReplay===true);
 assert.equal(b.p.reconciliationUnavailable,true);assert.equal(b.sends(),1);assert.equal(b.h.widget.PFTransport.snapshot().reviews.length,1,'negative Check remains in the existing unknown quarantine');
 await assert.rejects(b.context.pfProgressSnapshot(b.p,'Check'));assert.equal(b.sends(),1,'quarantined Check does not replay a Custom API');
}
{
 const b=await progressBoundary({code:3000,result:JSON.stringify({success:true,message:'Old check'})});await assert.rejects(b.context.pfProgressSnapshot(b.p,'Check'),/targeted Pro Forma approval status/i);assert.equal(b.p.reconciliationUnavailable,true);assert.equal(b.h.widget.PFTransport.snapshot().reviews.length,0,'existing positive-but-untargeted handling is preserved');assert.equal(b.sends(),1);
}
for(const raw of [
 {code:2898,error:'Denied'},
 {code:3000,result:JSON.stringify({success:false,proformaId:ID,approvalId:OTHER,message:'Targeted rejection failed.'})},
 {code:3000,result:'Not a structured check',details:{code:2898,error:'Denied'}},
 {code:3000,result:'{invalid',details:{code:2898,error:'Denied'}},
 {code:3000,result:JSON.stringify([{success:false}])}
]){
 const b=await progressBoundary(raw);await assert.rejects(b.context.pfProgressSnapshot(b.p,'Check'),error=>error.response===raw&&error.noReplay===true&&!error.reconciliationUnavailable);assert.equal(b.p.reconciliationUnavailable,false);assert.equal(b.sends(),1);
}
{
 const raw={code:3000,result:JSON.stringify({success:false,message:'Old check'})},b=await progressBoundary(raw);await assert.rejects(b.context.pfProgressSnapshot(b.p,'Repair'),error=>!error.reconciliationUnavailable);assert.equal(b.p.reconciliationUnavailable,false);assert.equal(b.sends(),1);
}
for(const change of ['actor','progress']){
 const raw={code:3000,result:JSON.stringify({success:false,message:'Old check'})},b=await progressBoundary(raw,{pending:true}),pending=b.context.pfProgressSnapshot(b.p,'Check');await drain();
 if(change==='actor')b.h.c.LMRuntime.apply({envUrlFragment:'/environment/development',loginUser:'another@example.test'});else b.context.pfApprovalProgress={};
 b.gate.resolve(raw);await assert.rejects(pending,error=>!error.reconciliationUnavailable);assert.equal(b.p.reconciliationUnavailable,false);assert.equal(b.sends(),1);
}
console.log('PASS PF SDK2 whole actual Save_PF + phase/month readback and terminal progress; native negative Check missing targets stops reconciliation without clearing quarantine/replaying.');
