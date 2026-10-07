import assert from 'node:assert/strict';
import {ready,drain,deferred,ID,ACTION,ACCESS} from './test-contract-sdk-v2-foundation.mjs';
const writes=h=>h.calls.filter(row=>['add','update','delete'].includes(row.method));
function proposed(h){h.reports.All_Contracts1[0].Status='Proposed';h.c.findContract(ID).Status='Proposed';h.reports.All_Contract_Actions[0].Status='Proposed';h.c.findAction(ACTION).Status='Proposed';return h.c.findContract(ID);}
for(const access of [{known:true,approve:false},{known:false,approve:true},{known:true,approve:false,edit:true},{known:true,approve:false,propose:true}]){
 const h=await ready({realDOM:true}),c=proposed(h);Object.assign(h.c.S.acc,access);assert.equal(h.c.canApprove(),false);h.c.pcDecide(ID,true);await h.c.pcRun(ID,true);h.c.paDecide(ACTION,true);await h.c.paRun(ACTION,true);h.c.statusCellChange(ID,'New');h.c.setContractStatus(ID,'New');await assert.rejects(h.c.updateRecord(ID,{Status:'New'},h.c.CFG.reports.contracts,true));
 assert.equal(writes(h).length,0);h.c.openContract(ID);assert.equal(h.c.document.getElementById('cStatusSel'),null);assert.match(h.c.statusCell(c),/contract-status-readonly/);assert.doesNotMatch(h.c.statusCell(c),/cbo|onclick/);
}
{
 const h=await ready({realDOM:true});proposed(h);h.c.S.acc.approve=true;h.c.openContract(ID);assert.equal(h.c.document.getElementById('cStatusSel'),null,'reviewers also accept through Review');await assert.rejects(h.c.updateRecord(ID,{Status:'Complete'}));assert.equal(writes(h).length,0);
}
{
 const h=await ready({realDOM:true});h.reports.All_Contracts1[0].Status='Proposed';assert.equal(h.c.findContract(ID).Status,'New');await assert.rejects(h.c.updateRecord(ID,{Status:'New'}),/Proposed status is read-only/);assert.equal(writes(h).length,0,'fresh status prevents a stale non-Proposed snapshot escaping Review');
}
{
 const h=await ready({realDOM:true}),gate=deferred(),native=h.api.updateRecordById;proposed(h);h.c.S.acc.approve=true;h.c.S.homeSection='loi';h.api.updateRecordById=config=>gate.promise.then(()=>native(config));
 const accepting=h.c.pcDecide(ID,true);await drain();assert.equal(h.c.document.getElementById('cfOk'),null,'Accept does not open confirmation');assert.equal(h.c.document.getElementById('contractSaveOverlay'),null,'Accept does not open progress');assert.equal(h.c.S.busy,true);assert.match(h.c.reviewQueueHTML(),/disabled aria-busy="true">Accepting/);assert.equal(await h.c.pcRun(ID,true),false);assert.equal(h.reports.All_Contracts1[0].Status,'Proposed','parent waits for verified child acceptance');
 gate.resolve();assert.equal(await accepting,true);const sent=writes(h);assert.deepEqual(sent.map(row=>row.config.report_name),['All_Contract_Actions','All_Contracts1']);assert.equal(sent.at(-1).config.payload.data.Status,'New');assert.equal(h.reports.All_Contracts1[0].Status,'New');assert.equal(h.reports.All_Contract_Actions[0].Status,'New');assert.equal(h.c.S.busy,false);assert.equal(h.c.reviewCount(),0);
}
{
 const h=await ready({realDOM:true});h.c.S.acc.approve=true;h.reports.All_Contract_Actions[0].Status='Proposed';h.c.findAction(ACTION).Status='Proposed';assert.equal(await h.c.paDecide(ACTION,true),true);assert.equal(h.c.document.getElementById('cfOk'),null);assert.equal(writes(h).length,1);assert.equal(h.reports.All_Contract_Actions[0].Status,'New');
 proposed(h);h.c.pcDecide(ID,false);assert.ok(h.c.document.getElementById('cfOk'),'Decline keeps its decision confirmation');assert.equal(writes(h).length,1);h.c.closeOverlays();assert.equal(h.reports.All_Contracts1[0].Status,'Proposed');
}
{
 const h=await ready({realDOM:true}),native=h.api.updateRecordById;proposed(h);h.c.S.acc.approve=true;h.api.updateRecordById=async config=>{await native(config);return {code:3000,data:{ID:config.id},details:{code:2899}};};assert.equal(await h.c.pcDecide(ID,true),false);assert.equal(h.reports.All_Contracts1[0].Status,'Proposed','unknown child acceptance cannot release the parent');assert.equal(writes(h).length,1);assert.equal(await h.c.pcRun(ID,true),false);assert.equal(writes(h).length,1,'a second click cannot replay an uncertain decision');
}
{
 const h=await ready({realDOM:true}),native=h.api.getRecords;proposed(h);h.c.S.acc.approve=true;h.api.getRecords=async config=>{const result=await native(config);if(config.report_name==='All_Contract_Actions'&&config.criteria==='(Contract1 == '+ID+')')h.c.S.acc.approve=false;return result;};assert.equal(await h.c.pcDecide(ID,true),false);assert.equal(writes(h).length,0,'revoked queue access during preflight prevents writes');
}
{
 const h=await ready({realDOM:true}),gate=deferred(),native=h.api.getRecords;proposed(h);h.c.S.acc.approve=true;h.api.getRecords=config=>config.report_name==='All_Contracts1'?gate.promise.then(()=>native(config)):native(config);const accepting=h.c.pcDecide(ID,true);await drain();h.tick(30000);assert.equal(await accepting,false);assert.equal(h.c.S.busy,false);gate.resolve();await drain();assert.equal(writes(h).length,0,'late read after timeout cannot resume acceptance');
}
console.log('PASS direct Review acceptance: no modal, visible pending/duplicate lock, verified children before parent, decline confirmation, explicit Approval Queue grant, degraded denial, Proposed readonly for every role, fresh stale-state guard, failed child quarantine, permission revocation and bounded preflight without late writes.');
