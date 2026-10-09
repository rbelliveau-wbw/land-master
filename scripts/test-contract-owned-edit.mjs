import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ready,drain,ID,ACTION,ACCESS,NEW} from './test-contract-sdk-v2-foundation.mjs';
const owned={ctEdit:false,ctPropose:true,ctApprove:false,ctDeleteArchive:false,ctTemplates:false};
const writes=h=>h.calls.filter(c=>['update','add','delete','upload'].includes(c.method));
{
 const h=await ready({accessFlags:owned}),master={ID:NEW,Contract_Type:'Lot (Master)',Status:'Complete',Owner:[{ID:ACCESS}]};
 h.reports.All_Contracts1.push(master);h.c.S.contracts.push({...master});
 for(const row of [h.reports.All_Contracts1[0],h.c.findContract(ID)])Object.assign(row,{Contract_Type:'Lot (Amendment)',Parent_Contract:{ID:NEW}});
 assert.equal(h.c.mayEdit(NEW),false);assert.equal(h.c.mayEdit(ID),true,'an open owned child does not inherit its completed master lock');
 await h.c.updateRecord(ID,{Contract_Name:'Open amendment'},h.c.CFG.reports.contracts);
 await h.c.updateRecord(ACTION,{Dev_Notes:'Open child action'},h.c.CFG.reports.actions);
 assert.equal(h.reports.All_Contracts1[0].Contract_Name,'Open amendment');assert.equal(h.reports.All_Contract_Actions[0].Dev_Notes,'Open child action');
 assert.equal(master.Status,'Complete');assert.equal(writes(h).length,2,'only the child and its action are changed');
}
{
 const h=await ready({accessFlags:owned,realDOM:true});assert.equal(h.c.mayEdit(ID),true);
 h.c.S.ownerEdit={cid:ID};h.c.S.ownerPick=[ACCESS,NEW];
 // Use the existing Owner picker, including removing your own access.
 h.c.ownerEdit(ID);h.c.S.ownerPick=[ACCESS,NEW];h.c.ownerSave(ID);await drain();
 assert.ok(writes(h).some(x=>x.config.payload?.data?.Owner),'the actual Owner picker saves for an owned-only editor');
 await h.c.updateRecord(ID,{Owner:[NEW]},h.c.CFG.reports.contracts);
 await assert.rejects(h.c.updateRecord(ACTION,{Dev_Notes:'after removal'},h.c.CFG.reports.actions),/added as an owner/);
 assert.equal(h.reports.All_Contract_Actions[0].Dev_Notes,'server note');
}
{
 const h=await ready({accessFlags:owned,realDOM:true});h.c.findContract(ID).Owner=[{ID:NEW}];h.reports.All_Contracts1[0].Owner=[{ID:NEW}];
 assert.equal(h.c.mayEdit(ID),false);h.c.S.selId=ID;h.c.S.view='detail';h.c.renderDetail();
 assert.match(h.node('view').innerHTML,/added as an owner/);assert.match(h.node('view').innerHTML,/<textarea disabled/);
 h.c.gAdd('Denied');h.c.saveAction(ACTION);h.c.deleteAction(ACTION,true);await drain();
 await assert.rejects(h.c.updateRecord(ACTION,{Dev_Notes:'direct'},h.c.CFG.reports.actions),/added as an owner/);
 await assert.rejects(h.c.createRecord(h.c.CFG.forms.action,{Contract1:ID,Contract_Action:'Direct add'}),/added as an owner/);
 await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION),/added as an owner/);assert.equal(writes(h).length,0);
}
for(const flags of [owned,{ctEdit:true,ctPropose:true,ctApprove:true,ctDeleteArchive:true}]){
 const h=await ready({accessFlags:flags,realDOM:true});h.c.findContract(ID).Status='Complete';h.reports.All_Contracts1[0].Status='Complete';h.c.S.lockBypass=true;h.c.S.clp={cid:ID};
 assert.equal(h.c.mayEdit(ID),false);
 for(const payload of [{Owner:[NEW]},{Status:'New'},{Archive:true},{Second_Closing_Lots:10},{Contract_Name:'changed'}])await assert.rejects(h.c.updateRecord(ID,payload,h.c.CFG.reports.contracts),/read-only|permission to archive/);
 await assert.rejects(h.c.updateRecord(ACTION,{Dev_Notes:'changed'},h.c.CFG.reports.actions),/read-only/);
 await assert.rejects(h.c.createRecord(h.c.CFG.forms.action,{Contract1:ID,Contract_Action:'child'}),/read-only/);
 await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION),/read-only/);
 if(flags.ctDeleteArchive)await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.contracts,ID),/read-only/);
 await assert.rejects(h.c.createContractAttachmentRecord(ID));
 h.c.S.contractAttachmentParents={[NEW]:{cid:ID,scope:h.c.contractMutationScope()}};
 await assert.rejects(h.c.sdkUploadVersionFile(NEW,{name:'fixture.txt',size:5}),/read-only/);
 assert.equal(await h.c.aprSendNow(ID),false);assert.equal(writes(h).length,0);
 assert.equal(h.calls.filter(x=>x.method==='custom'&&!/^Get_User_Access/.test(x.config.api_name)).length,0);
}
for(const state of ['Complete','owner removed']){
 const h=await ready({accessFlags:owned});if(state==='Complete')h.reports.All_Contracts1[0].Status='Complete';else h.reports.All_Contracts1[0].Owner=[{ID:NEW}];
 assert.equal(h.c.mayEdit(ID),true,'cached state is initially editable');
 await assert.rejects(h.c.updateRecord(ACTION,{Dev_Notes:'stale screen'},h.c.CFG.reports.actions),state==='Complete'?/read-only/:/added as an owner/);
 assert.equal(writes(h).length,0,'fresh parent authorization refuses a stale screen');assert.equal(h.c.contractHasReviews(),false,'a prewrite denial is safe and never becomes an ambiguous save');
}
{
 const h=await ready({accessFlags:owned});h.reports.All_Contracts1.push({ID:NEW,Status:'New',Owner:[]});h.c.S.contracts.push({ID:NEW,Status:'New',Owner:[]});h.reports.All_Contract_Actions[0].Contract1={ID:NEW};
 await assert.rejects(h.c.updateRecord(ACTION,{Dev_Notes:'moved child'},h.c.CFG.reports.actions),/added as an owner/);assert.equal(writes(h).length,0);
}
const schema=fs.readFileSync('creator/workflows/approval-policies/planned/User_Access.ds','utf8');
assert.match(schema,/Propose_Contract_Changes\s*\([\s\S]*?displayname = "Edit Owned Contracts and Actions"/,'existing field link and grants are retained');
console.log('PASS owned edits: Owner picker, access loss after owner removal, nonowner warning and zero writes, every completed contract mutation refused including bypass/attachments/approvals, stale status/ownership and moved-child protections; existing checkbox retained.');
