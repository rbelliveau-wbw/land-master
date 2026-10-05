import assert from 'node:assert/strict';
import {ready,drain,deferred,ID} from './test-contract-sdk-v2-foundation.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
async function previewFixture(){
 const h=await ready({realDOM:true}),parent=h.c.findContract(ID),gate=deferred();
 Object.assign(parent,{Contract_Type:'Lot (Master)',Subdivision1:[],Lots1:[],Builder:{},Parent_Contract:{},Number_of_Lots:null,Initial_Takedown:null,Initial_Takedown_Days:null,Second_Closing_Lots:null,Second_Closing_Days:null,Subsequent_Takedown_Lots:null,Subsequent_Takedown_Days:null});
 Object.assign(h.reports.All_Contracts1[0],clone(parent));
 const native=h.api.getRecordCount,api=h.api.invokeCustomApi;
 h.api.getRecordCount=config=>config.report_name==='All_Contracts1'&&config.criteria==='(ID == '+ID+')'?gate.promise.then(()=>native(config)):native(config);
 h.api.invokeCustomApi=config=>config.api_name.startsWith('Complete_Lot_Contract')?Promise.resolve({code:3000,details:{output:JSON.stringify({contractId:ID,mode:'Check',lotTransferPolicy:'open-blank-placeholder-v1',preserveExisting:true,builderId:null,lotIds:[],placeholderBuilderIds:[]})}}):api(config);
 h.c.ncLoadLots=()=>{throw Error('Completion preview must not wait for the global Lot report');};
 return {h,parent,gate};
}
const writes=h=>h.calls.filter(call=>['add','update','delete'].includes(call.method));
{
 const {h,parent,gate}=await previewFixture();
 assert.equal(h.c.guardLotCompletion(parent,'Complete'),true);
 const run=h.c.S.lotCompletionPreview,button=h.c.document.getElementById('cfOk'),overlay=h.node('overlays'),mounts=overlay.htmlWrites;
 assert(run,'the confirmation mounts synchronously before the unresolved fresh read');
 assert.equal(button.disabled,true);assert.equal(button.textContent,'Checking…');assert.equal(h.c.lotCompletionProceed(),false);assert.equal(writes(h).length,0);
 gate.resolve();await run.promise;await drain();
 assert.equal(run.state,'ready');assert.equal(button.disabled,false);assert.equal(button.textContent,'Complete contract');assert.equal(h.c.document.getElementById('cfOk'),button);assert.equal(overlay.htmlWrites,mounts,'background readiness patches the mounted confirmation instead of reopening it');
 const requests=h.calls.filter(call=>['count','records'].includes(call.method)).slice(-9);
 assert(requests.some(call=>call.config.report_name==='All_Contracts1'&&call.config.criteria==='(ID == '+ID+')'));
 assert(requests.some(call=>call.config.report_name==='Contract_Pricing_Report'&&call.config.criteria==='(Contract1 == '+ID+')'));
 assert(requests.some(call=>call.config.report_name==='All_Contract_Actions'&&call.config.criteria==='(Contract1 == '+ID+')'));
 assert.equal(writes(h).length,0,'ready confirmation has performed only fresh reads and capability Check');
 let confirmed;h.c.completeLotViaApi=(saved,expect,actions)=>{confirmed={saved,expect,actions};};
 assert.equal(h.c.lotCompletionProceed(),true);assert(confirmed);assert.equal(confirmed.saved.ID,ID);assert.equal(confirmed.actions.length,1);assert.equal(h.c.S.lotCompletionPreview,null);
}
{
 const {h,parent,gate}=await previewFixture();h.c.guardLotCompletion(parent,'Complete');const run=h.c.S.lotCompletionPreview,button=run.button,mounts=h.node('overlays').htmlWrites;
 gate.reject(Error('Saved details are unavailable'));await run.promise;await drain();
 assert.equal(run.state,'failed');assert.equal(button.disabled,true);assert.match(run.body.innerHTML,/Saved details are unavailable/);assert.equal(h.node('overlays').htmlWrites,mounts);assert.equal(h.c.lotCompletionProceed(),false);assert.equal(writes(h).length,0);
}
{
 const {h,parent,gate}=await previewFixture();h.c.guardLotCompletion(parent,'Complete');const run=h.c.S.lotCompletionPreview;
 h.c.closeOverlays();const closedMarkup=h.node('overlays').innerHTML,mounts=h.node('overlays').htmlWrites;
 assert.equal(run.cancelled,true);assert.equal(h.c.S.lotCompletionPreview,null);
 gate.resolve();await run.promise;await drain();assert.equal(h.node('overlays').innerHTML,closedMarkup);assert.equal(h.node('overlays').htmlWrites,mounts);assert.equal(h.c.lotCompletionProceed(),false);assert.equal(writes(h).length,0,'late preflight after Cancel cannot reopen or write');
}
for(const change of ['generation','actor','selection']){
 const {h,parent,gate}=await previewFixture();h.c.guardLotCompletion(parent,'Complete');const run=h.c.S.lotCompletionPreview;
 if(change==='generation')h.c.S.contractDataGeneration++;
 if(change==='actor')h.c.LMRuntime.apply({envUrlFragment:'',loginUser:'changed-actor@example.test'});
 if(change==='selection')parent.Lots1=[{ID:'90071992547410090'}];
 gate.resolve();await run.promise;await drain();assert.notEqual(run.state,'ready');assert.equal(run.button.disabled,true);assert.equal(h.c.lotCompletionProceed(),false);assert.equal(writes(h).length,0,'stale '+change+' preflight cannot enable completion');
}
{
 const {h,parent,gate}=await previewFixture();h.c.guardLotCompletion(parent,'Complete');const run=h.c.S.lotCompletionPreview,mounts=h.node('overlays').htmlWrites;
 h.c.guardLotCompletion(parent,'Complete');assert.equal(h.c.S.lotCompletionPreview,run);assert.equal(h.node('overlays').htmlWrites,mounts,'a duplicate completion click cannot restart the confirmation');
 gate.resolve();await run.promise;await drain();parent.Status='Reviewed';assert.equal(h.c.lotCompletionProceed(),false);assert.equal(run.state,'failed');assert.equal(writes(h).length,0,'changes after ready are rejected before the existing write path');
}
console.log('PASS immediate completion confirmation: unresolved fresh read opens synchronously, disabled Checking, scoped parent/pricing/actions and policy preflight, mounted updates, late failure/Cancel, stale actor/generation/selection, duplicate-click protection, and no writes before confirmed fresh readiness.');
