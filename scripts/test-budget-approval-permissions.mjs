// Execute the actual legacy Deluge approval bodies. Reuse the native-shaped
// adapter; these tests do not replace Creator compilation or signed-in QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {poTestRuntime,compileDelugePO} from './test-po-test-cfo-backend.mjs';

const names=['startApprovalChain','killApprovalChain','killApprovalFlow','handleApprovalAction'];
const programs=names.map(name=>compileDelugePO(fs.readFileSync(`creator/functions/${name}.dg`,'utf8'))+`;thisapp.${name}=${name};`).join('\n');
const baseActor={ID:19,User:'actor',Approver_Email:' Approver@Example.test ',Create_Purchase_Orders:true};
function fixture({actor=baseActor,users,profile='Dev/Land Acq - Proforma & Budgets',profileFailure=false,login=actor.User,status='Pending',secondStatus='Not Sent'}={}){
  const r=poTestRuntime({login,users:users||[actor],extraTables:{Add_Budget:[{ID:61,Archived:false,Budget_Owner:[{ID:19}],Const_Budget_Approval_Status:status,Development_Budget_Approval_Status:'Not Sent',Budget_Grand_Total:0}],Budget_Category:[],Budget_Item:[],Budget_Approvals:[{ID:71,Budget:61,Type1:'Construction',Title:'VP',Status:status,Sort_Order:1,Approver:'approver@example.test',Sent_Date:null,Responded_Date:null,Approval_Notes:''},{ID:72,Budget:61,Type1:'Construction',Title:'CFO',Status:secondStatus,Sort_Order:2,Approver:'cfo@example.test',Sent_Date:null,Responded_Date:null,Approval_Notes:''}]}});
  r.c.profile=profile;r.c.profileFailure=profileFailure;
  vm.runInContext(`String.prototype.contains=function(value){return this.includes(value);};var effects=[];thisapp.permissions={profileForUser(){if(profileFailure)throw Error('Profile unavailable');return profile;}};
    thisapp.applySharedApprovalPolicy=function(context){effects.push('route');return map({success:true});};
    thisapp.syncBudgetApprovalStatus=function(){effects.push('sync');return 'OK';};
    thisapp.sendApprovalEmail=function(bid,aid){effects.push('mail');tables.Budget_Approvals.find(row=>row.ID===aid).Sent_Date='2026-10-26';return 'OK';};
    thisapp.applyBudgetTrackFinalState=function(){effects.push('financial');return 'OK';};
    Object.defineProperty(tables.Add_Budget[0],'Approvals',{enumerable:true,get(){return tables.Budget_Approvals.filter(row=>row.Budget===61).map(record);}});
    ${programs}`,r.c);
  return r;
}
function call(r,name,action='Pending',id='71'){
  const args=name==='startApprovalChain'?[61,'Construction']:name==='killApprovalChain'?['61','Construction']:name==='killApprovalFlow'?['61']:['61',id,action,'Retained note'];
  return vm.runInContext(`${name}(${args.map(JSON.stringify).join(',')})`,r.c);
}
function assertDenied(r,name,action){const before=r.tables(),writes=r.c.writes,result=call(r,name,action);assert.match(result,/ERROR:|"ok":false/,name+' '+action+' denied: '+result);assert.deepEqual(r.tables(),before,'Denied action changes no business record');assert.equal(r.c.writes,writes);assert.deepEqual(Array.from(r.c.effects),[],'Denied action cannot route, send, sync or write financial totals');}

// PO capability, budget editing, a matching recorded email, and stale duplicate
// User Access rows cannot grant sender/cancellation/decision authority.
for(const actor of [baseActor,{...baseActor,Edit_All_Budgets:true},{...baseActor,Edit_Owned_Budgets:true},{...baseActor,Edit_Delete_All_Modifications:true}]){
  for(const name of names){const r=fixture({actor});assertDenied(r,name);}
}
for(const users of [[],[baseActor,{...baseActor,ID:29,Send_for_Approvals:true,Edit_All_Approvals:true}]]){
  for(const name of names)assertDenied(fixture({users}),name);
}
for(const action of ['Pending','Approved','Rejected','Repair','RepairReject','RepairStart'])assertDenied(fixture(), 'handleApprovalAction',action);

// Native Construction Budgeting stays read-only even with old assignment and
// accidentally retained sender/global/owned approval flags.
const allGrants={...baseActor,Send_for_Approvals:true,Edit_All_Approvals:true,Edit_Owned_Approvals:true};
for(const name of names)assertDenied(fixture({actor:allGrants,profile:'Construction Budgeting'}),name);
for(const action of ['Pending','Approved','Rejected','Repair','RepairReject','RepairStart'])assertDenied(fixture({actor:allGrants,profile:'Construction Budgeting'}),'handleApprovalAction',action);
for(const name of names)assertDenied(fixture({actor:allGrants,profileFailure:true}),name);

// Legitimate sender initiation and both established cancellation grants survive.
let r=fixture({actor:{...baseActor,Send_for_Approvals:true},status:'Not Sent'});assert.doesNotMatch(call(r,'startApprovalChain'),/ERROR:/);assert.ok(r.c.effects.includes('route'));assert.ok(r.c.effects.includes('mail'));assert.equal(r.tables().Budget_Approvals[0].Status,'Pending');
assertDenied(fixture({actor:{...baseActor,Edit_All_Approvals:true}}),'startApprovalChain');
for(const name of ['killApprovalChain','killApprovalFlow'])for(const grant of ['Send_for_Approvals','Edit_All_Approvals']){
  r=fixture({actor:{...baseActor,[grant]:true}});assert.equal(JSON.parse(call(r,name)).ok,true);assert.equal(r.tables().Budget_Approvals[0].Status,'Not Sent');assert.equal(r.tables().Add_Budget[0].Const_Budget_Approval_Status,'Not Sent');assert.ok(r.c.effects.includes('financial'));
}

// Owned approval authorization uses the exact authoritative email, with the
// existing email-shaped User fallback. It never guesses email local parts.
for(const actor of [{...baseActor,Edit_Owned_Approvals:true},{...baseActor,Edit_All_Approvals:true,Approver_Email:'other@example.test'},{...baseActor,User:'approver@example.test',Approver_Email:null,Edit_Owned_Approvals:true}]){
  r=fixture({actor});assert.doesNotMatch(call(r,'handleApprovalAction'),/ERROR:/);assert.equal(r.tables().Budget_Approvals[0].Approval_Notes,'Retained note');assert.deepEqual(Array.from(r.c.effects),['sync']);
}
for(const actor of [{...baseActor,Edit_Owned_Approvals:true,Approver_Email:'approver@another.test'},{...baseActor,Edit_Owned_Approvals:true,Approver_Email:null},{...baseActor,Edit_Owned_Approvals:true,Approver_Email:'other@example.test',User:'approver@example.test'}])assertDenied(fixture({actor}),'handleApprovalAction');
r=fixture({actor:{...baseActor,Edit_Owned_Approvals:true}});assert.match(call(r,'handleApprovalAction','Approved'),/approved/);assert.equal(r.tables().Budget_Approvals[0].Status,'Approved');assert.equal(r.tables().Budget_Approvals[1].Status,'Pending');assert.ok(r.c.effects.includes('mail'));

// Start reconciliation belongs to the sender, who need not be the approver.
r=fixture({actor:{...baseActor,Send_for_Approvals:true,Approver_Email:'sender@example.test'}});const repaired=JSON.parse(call(r,'handleApprovalAction','RepairStart'));assert.equal(repaired.ok,true);assert.ok(r.c.effects.includes('mail'));
assertDenied(fixture({actor:{...baseActor,Edit_All_Approvals:true}}),'handleApprovalAction','RepairStart');

// Read-only status checks stay available to Const and do not send, synchronize
// or finalize anything, even when the profile service is unavailable.
for(const action of ['Check','CheckStart','CheckReject']){
  r=fixture({profile:'Construction Budgeting',profileFailure:true,secondStatus:action==='CheckReject'?'Rejected':'Not Sent'});const before=r.tables(),writes=r.c.writes;const response=call(r,'handleApprovalAction',action,action==='CheckReject'?'72':'71');assert.equal(JSON.parse(response).ok,true);assert.deepEqual(r.tables(),before);assert.equal(r.c.writes,writes);assert.deepEqual(Array.from(r.c.effects),[]);
}
r=fixture({actor:allGrants,status:'Approved',secondStatus:'Not Sent'});const before=r.tables();assert.match(call(r,'handleApprovalAction','unexpected'),/Unsupported approval action/);assert.deepEqual(r.tables(),before);assert.deepEqual(Array.from(r.c.effects),[],'Unknown action cannot trigger the old stale-status synchronization');

// Preserve the actual application owner's trusted report/system paths. A
// username supplied in a request cannot activate this internal Zoho identity.
for(const name of names){r=fixture({login:'test-owner',users:[],profile:'Construction Budgeting',profileFailure:true,status:name==='startApprovalChain'?'Not Sent':'Pending'});assert.doesNotMatch(call(r,name),/ERROR:|"ok":false/);assert.ok(r.c.effects.length>0);}

// A final decision must finish without calling the legacy inline PDF generator,
// including for the 227-item shape that exceeded Creator's statement limit.
for(const otherStatus of ['Approved','Pending',null]){
  const final=fixture({actor:allGrants,status:'Approved',secondStatus:'Pending'});
  final.c.otherStatus=otherStatus;
  vm.runInContext(`
    tables.Add_Budget[0].Const_Budget_Approval_Status='Pending';
    tables.Add_Budget[0].Development_Budget_Approval_Status=otherStatus||'Not Sent';
    if(otherStatus)tables.Budget_Approvals.push({ID:73,Budget:61,Type1:'Development',Title:'VP',Status:otherStatus,Sort_Order:1});
    tables.Budget_Category=Array.from({length:20},(_,i)=>({ID:100+i,Budget:61,Deparment:'Construction',Budget_Total:0}));
    tables.Budget_Item=Array.from({length:227},(_,i)=>({ID:200+i,Budget_Category:100+i%20,Unapproved_Final_Budget_Ttl:i%2?10:-1,Budget_Ttl:0}));
    Number.prototype.toNumber=Number.prototype.toDecimal=function(){return Number(this);};
    var Budget_Ttl='Budget_Ttl';
    Array.prototype.sum=function(name){return this.reduce((total,row)=>total+row[name],0);};
    thisapp.snapshotBudgetItemComponents=function(){return map({ok:true});};
    thisapp.syncBudgetApprovalStatus=function(){tables.Add_Budget[0].Const_Budget_Approval_Status='Approved';return 'OK';};
    thisapp.generateApprovedBudgetPDF=function(){throw Error('Inline export would exhaust the request');};
  `,final.c);
  const result=JSON.parse(call(final,'handleApprovalAction','Approved','72'));
  assert.equal(result.contract,'budget-final-approval-v1');
  assert.equal(result.ok,true);
  assert.equal(result.budgetId,'61');
  assert.equal(result.approvalId,'72');
  assert.equal(result.approvedPdfRequested,otherStatus==='Approved');
  assert.equal(final.tables().Budget_Approvals[1].Status,'Approved');
  assert.ok(final.tables().Budget_Item.every((item,i)=>item.Budget_Ttl===(i%2?10:-1)&&item.Unapproved_Final_Budget_Ttl===0));
  assert.equal(final.tables().Add_Budget[0].Budget_Grand_Total,1016);
  const writes=final.c.writes;
  const status=JSON.parse(call(final,'handleApprovalAction','Check','72'));
  assert.equal(status.financialFinalized,true);
  assert.equal(status.approvedPdfReady,otherStatus==='Approved');
  assert.equal(final.c.writes,writes,'the post-decision check is read-only');
  assert.doesNotMatch(call(final,'handleApprovalAction','Approved','72'),/budget-final-approval-v1/,'repeating a saved decision cannot issue another PDF receipt');
}

// The remaining exposed approval helpers must not be a direct Const bypass.
const source=name=>fs.readFileSync(`creator/functions/${name}.dg`,'utf8');
const prefixProgram=(name,marker)=>compileDelugePO(source(name).slice(0,source(name).indexOf(marker))+'\nreturn "ALLOW";\n}');
const emailGuard=prefixProgram('sendApprovalEmail','/********* SEND ONE APPROVAL EMAIL');
// This fixture covers the attachment-writing PDF/Excel guard. The independent
// full-export suite executes the preceding read-only ALL_DETAIL branch.
const exportSource=source('exportBudgetSnapshot');
const exportGuard=compileDelugePO(exportSource.slice(0,exportSource.indexOf('{')+1)+'\n'+exportSource.slice(exportSource.indexOf('// An export persists'),exportSource.indexOf('/********* MANUAL BUDGET EXPORT ENTRY POINT'))+'\nreturn "ALLOW";\n}');
const statusProgram=compileDelugePO(source('syncBudgetApprovalStatus'));
const manageProgram=compileDelugePO(source('manageBudget'));
const attachmentProgram=compileDelugePO(source('constructionReviewActor'))+';thisapp.constructionReviewActor=constructionReviewActor;'+compileDelugePO(source('createBudgetAttachmentRecord'));
const creationPrefix=source('createBudgetFromSubdivision').slice(0,source('createBudgetFromSubdivision').indexOf('\t\tsubdivisionKey ='))+'\nreturn "ALLOW";\n} catch(testError) { return "ERROR: Guard failed."; }\nreturn "ERROR: Guard ended.";\n}';
const creationProgram=compileDelugePO(creationPrefix);
function surfaceFixture(options={}){
  const rr=fixture(options);vm.runInContext(emailGuard+'\n'+exportGuard+'\n'+statusProgram+'\n'+manageProgram+'\n'+attachmentProgram+'\n'+creationProgram,rr.c);return rr;
}
function surfaceCall(rr,name,action='archive'){
  const args={sendApprovalEmail:[61,71],exportBudgetSnapshot:['61','PDF'],syncBudgetApprovalStatus:[61,'Construction'],manageBudget:['61',action,'19'],createBudgetFromSubdivision:['81','create'],createBudgetAttachmentRecord:[JSON.stringify({contract:'budget-request-attachments-v1',action,budgetId:'61',userAccessId:'19'})]}[name];
  return vm.runInContext(`${name}(${args.map(JSON.stringify).join(',')})`,rr.c);
}
const staleBudgetGrants={...allGrants,Edit_All_Budgets:true,Edit_Owned_Budgets:true,Delete_Archive_Budgets:true};
for(const name of ['sendApprovalEmail','exportBudgetSnapshot','syncBudgetApprovalStatus','manageBudget','createBudgetFromSubdivision','createBudgetAttachmentRecord']){
  for(const options of [{profile:'Construction Budgeting'},{profileFailure:true}]){
    r=surfaceFixture({actor:staleBudgetGrants,...options});const before=r.tables(),writes=r.c.writes;const result=surfaceCall(r,name,name==='createBudgetAttachmentRecord'?'Create':'archive');assert.match(result,/read-only|could not be verified|do not have permission|only add attachments to Purchase Orders/i,name+' denies Const before writes: '+result);assert.deepEqual(r.tables(),before);assert.equal(r.c.writes,writes);assert.deepEqual(Array.from(r.c.effects),[]);
  }
}
for(const profile of ['Construction Budgeting','Dev/Land Acq - Proforma & Budgets']){
  r=surfaceFixture({actor:staleBudgetGrants,profile});const response=JSON.parse(surfaceCall(r,'createBudgetAttachmentRecord','Capabilities'));assert.equal(response.ok,true);assert.equal(response.canWrite,profile!=='Construction Budgeting','Capabilities truthfully describes read-only scope');assert.equal(response.canAttachPO,profile==='Construction Budgeting','PO uploads remain separate from Budget writes');assert.equal(r.c.writes,0);
}
for(const name of ['sendApprovalEmail','exportBudgetSnapshot']){
  r=surfaceFixture();assert.equal(surfaceCall(r,name),'ALLOW','Other native caller behavior is unchanged');
  r=surfaceFixture({login:'test-owner',profile:'Construction Budgeting',profileFailure:true});assert.equal(surfaceCall(r,name),'ALLOW','Owner-run callbacks skip the profile veto');
}
r=surfaceFixture();assert.match(surfaceCall(r,'syncBudgetApprovalStatus'),/synced to Pending/);assert.equal(r.tables().Add_Budget[0].Const_Budget_Approval_Status,'Pending');
for(const action of ['archive','restore']){r=surfaceFixture({actor:staleBudgetGrants});assert.equal(JSON.parse(surfaceCall(r,'manageBudget',action)).success,true);assert.equal(r.tables().Add_Budget[0].Archived,action==='archive');}
r=surfaceFixture({actor:staleBudgetGrants});assert.equal(surfaceCall(r,'createBudgetFromSubdivision'),'ALLOW','Existing budget editors pass the native create guard');
r=surfaceFixture({actor:staleBudgetGrants,users:[staleBudgetGrants,{...staleBudgetGrants,ID:29}]});assert.equal(JSON.parse(surfaceCall(r,'manageBudget')).success,false);assert.equal(r.c.writes,0,'Ambiguous native archive authority fails closed');
console.log('PASS: Budget approval server guards; Const/PO-only, duplicate/missing/profile-failure denial before writes; exact approver identity; sender/global cancel; sender RepairStart; readonly Check modes; owner system/report preservation and unknown-action isolation.');
console.log('PASS: exposed Budget email/status/export/archive/create/attachment profile parity; no Const mutations even with retained flags; truthful attachment capabilities, preserved normal callers/system callbacks and duplicate archive identity denial.');
