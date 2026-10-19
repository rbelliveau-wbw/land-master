// Actual widget helpers: request identity, one-record associations and unknown-write recovery.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
export function sourceOf(name){const start=html.indexOf('function '+name+'(');assert.ok(start>=0,name);const line=html.indexOf('\n',start);return html.slice(start,html.slice(start,line).trimEnd().endsWith('}')?line:html.indexOf('\n}',start)+2);}
const bid='90071992547409931',rid='90071992547409932',mid='90071992547409933',fid='90071992547409934';
const b={ID:bid},f={recordId:fid,budgetId:bid,name:'Invoice.pdf',paymentRequestId:'',modificationId:''};
let scope='actor-one',calls=[],read,refreshFailure=false,outcome='success';
const c=vm.createContext({S:{myAccessId:'90071992547409935',attachmentBusy:false,edBudget:b},
  document:{querySelectorAll:()=>[]},attachmentLinkStates:{},attachmentAssociationReview:null,requestAttachmentUI:null,
  budgetCreateScope:()=>scope,canAddBudgetAttachment:()=>true,renderAttachmentPane(){},auditLog(){},
  refreshBudgetAttachmentRecord:async()=>{if(refreshFailure)throw Error('Refresh denied');},
  CFG:{reports:{attachments:'All_Attachments'}},lookupId:v=>typeof v==='object'?v?.ID||'':typeof v==='string'?v:'',
  attachmentRecordBudgetId:r=>r.Budget?.ID||'',
  sdkGetRecordById:async()=>read,
  sdkRunBudgetFunction:async(name,args)=>{calls.push({name,p:JSON.parse(args.budgetId)});if(outcome==='lost')throw Error('Network lost');return {result:JSON.stringify({ok:outcome!=='rejected',contract:'budget-request-attachments-v1',writeState:outcome==='rejected'?'not-started':'acknowledged',budgetId:bid,attachmentId:fid,message:'Rejected before write'})};}
});
for(const name of ['attachmentLinkScope','attachmentLinksReady','attachmentLinkResponse','callAttachmentLink','requestAttachmentContextMatches','changeAttachmentAssociation','recheckAttachmentAssociation'])vm.runInContext(sourceOf(name),c);
c.attachmentLinkStates[bid]={scope,status:'loaded'};
assert.equal(c.requestAttachmentContextMatches({...f,paymentRequestId:rid},{kind:'payment',id:rid}),true);
for(const bad of [{paymentRequestId:rid,modificationId:mid},{paymentRequestId:Number(rid)},{paymentRequestId:rid+'0'},{}])assert.equal(c.requestAttachmentContextMatches({...f,...bad},{kind:'payment',id:rid}),false,'Only the exact exclusive saved parent matches');
assert.equal(c.requestAttachmentContextMatches({...f,modificationId:mid},{kind:'modification',id:mid}),true);
await c.changeAttachmentAssociation(b,f,{kind:'payment',id:rid});
assert.equal(calls.length,1);assert.equal(calls[0].name,'createBudgetAttachmentRecord');assert.equal(calls[0].p.action,'Associate');
assert.equal(calls[0].p.attachmentId,fid);assert.equal(calls[0].p.expectedPaymentRequestId,'');assert.equal(f.paymentRequestId,rid);
assert.equal(c.attachmentAssociationReview,null,'Acknowledged association does not compare native field values');
refreshFailure=true;await c.changeAttachmentAssociation(b,f,{kind:'modification',id:mid});assert.equal(f.modificationId,mid);assert.equal(c.attachmentAssociationReview,null,'A display refresh failure cannot turn a successful save into an unknown write');refreshFailure=false;
outcome='lost';await assert.rejects(c.changeAttachmentAssociation(b,f,{kind:'',id:''}),/Network lost/);assert.equal(c.attachmentAssociationReview.attachmentId,fid);const writes=calls.length;
await assert.rejects(c.changeAttachmentAssociation(b,f,{kind:'payment',id:rid}),/previous/);assert.equal(calls.length,writes,'Unknown association is never replayed');
read={ID:fid,Budget:{ID:bid},Payment_Request:{ID:rid},Budget_Modification:null};await assert.rejects(c.recheckAttachmentAssociation(),/still unverified/);assert.equal(calls.length,writes);
read={ID:fid,Budget:{ID:bid},Payment_Request:null,Budget_Modification:null};await c.recheckAttachmentAssociation();assert.equal(c.attachmentAssociationReview,null);assert.equal(calls.length,writes,'Explicit checking only reads the exact record');
outcome='rejected';await assert.rejects(c.changeAttachmentAssociation(b,f,{kind:'payment',id:rid}),/Rejected/);assert.equal(c.attachmentAssociationReview,null,'An explicit prewrite rejection permits a corrected attempt');
c.canAddBudgetAttachment=()=>false;await assert.rejects(c.changeAttachmentAssociation(b,f,{kind:'payment',id:rid}),/cannot/);
c.canAddBudgetAttachment=()=>true;scope='other-actor';await assert.rejects(c.changeAttachmentAssociation(b,f,{kind:'payment',id:rid}),/cannot/);

// Native source contract is checked in addition to Creator's actual compiler save.
const native=fs.readFileSync('creator/functions/createBudgetAttachmentRecord.dg','utf8');
for(const text of ['budget-request-attachments-v1','"Create"','"Associate"','"Capabilities"','Payment_Request[ID == requestId.toLong() && Budget == budget.ID]','Budget_Modification[ID == modificationId.toLong() && Budget == budget.ID]','Attachment[ID == attachmentId.toLong() && Budget == budget.ID]','access.Edit_All_Budgets','access.Edit_Owned_Budgets','access.Edit_All_Approvals','access.Edit_Owned_Approvals','expectedPaymentRequestId','expectedModificationId','Attachment identities must be exact ID strings.'])assert.ok(native.includes(text),text);
assert.ok(native.indexOf('if(!canWrite)')<native.indexOf('insert into Attachment'),'Native writes retain permissions');
assert.ok(native.indexOf('Choose one associated request.')<native.indexOf('insert into Attachment'));
assert.match(native,/return response\.toString\(\);\s*}\s*$/,'Compile-safe outer fallback');
for(const [file,link] of [['managePurchaseOrder','Payment_Request'],['modificationAdmin','Budget_Modification']]){const code=fs.readFileSync('creator/functions/'+file+'.dg','utf8');assert.match(code,new RegExp('attachedFile\\.'+link+'\\s*=\\s*null'));assert.doesNotMatch(code,/delete from Attachment/,'Deleting a request preserves its Budget file');}
console.log('Request attachments: exact/exclusive string IDs, same-Budget native guards, existing-file link without copying, native acknowledgement, refresh failure, read-only unknown recovery, actor/permission locks and retained Budget files passed.');

// Real upload loop: saved request is captured before insertion and retained through FILE acknowledgement.
function uploadHarness(){
 let actor='one',navigation=1,hold=null,denied=false,rows=[],writes=[];
 const x=vm.createContext({S:{edBudget:b,myAccessId:'90071992547409935'},CFG:{reports:{attachments:'All_Attachments'},attachmentFileField:'File_field1'},Promise,Error,
 attachmentAssociationReview:null,budgetNavigationToken:()=>navigation,budgetCreateScope:()=>actor,attachmentLinkScope:()=>actor,attachmentLinksReady:()=>true,budgetAttachmentModalCurrent:()=>false,
 canAddBudgetAttachment:()=>!denied,renderAttachmentPane(){},setMsg(){},toastShow(){},auditLog(){},setTimeout(){},shortErr:e=>e.message,budgetUploadError:e=>e,cleanVal:v=>String(v??''),
 lookupId:v=>v?.ID||'',attachmentRecordBudgetId:r=>r?.Budget?.ID||'',refreshBudgetAttachmentRecord:async()=>rows,
 sdkRunBudgetFunction:async(name,args)=>{const p=JSON.parse(args.budgetId);writes.push({name,p});if(hold)await hold;rows.push({ID:fid,Budget:{ID:p.budgetId},Payment_Request:p.paymentRequestId?{ID:p.paymentRequestId}:null,Budget_Modification:p.modificationId?{ID:p.modificationId}:null});return {result:JSON.stringify({ok:true,attachmentId:fid,budgetId:bid})};},
 sdkUploadFile:async(_report,id,_field,file)=>{writes.push({name:'FILE',id,file});return {code:3000,data:{}};},sdkGetRecordById:async()=>rows[0]
 });
 for(const name of ['requestAttachmentContextMatches','parseAttachmentCreateResponse','inspectBudgetAttachment','budgetAttachmentMatches','uploadBudgetAttachments'])vm.runInContext(sourceOf(name),x);
 return {x,writes,setActor:v=>actor=v,setNavigation:v=>navigation=v,setDenied:v=>denied=v,setHold:v=>hold=v};
}
{
 const h=uploadHarness(),file={name:'estimate.pdf',size:12};await h.x.uploadBudgetAttachments([file],{kind:'modification',id:mid,budgetId:bid});
 assert.equal(h.writes.length,2);assert.equal(h.writes[0].p.modificationId,mid);assert.equal(h.writes[0].p.paymentRequestId,'');assert.equal(h.writes[0].p.budgetId,bid);assert.equal(h.writes[1].file,file);assert.equal(h.x.S.attachmentUploadReview,undefined,'Native FILE acknowledgement succeeds without optional filename/path metadata');
}
for(const change of ['actor','navigation']){
 const h=uploadHarness();let release;h.setHold(new Promise(r=>release=r));const pending=h.x.uploadBudgetAttachments([{name:'held.pdf',size:1}],{kind:'payment',id:rid,budgetId:bid});await Promise.resolve();await Promise.resolve();if(change==='actor')h.setActor('other');else h.setNavigation(2);release();assert.equal(await pending,false);assert.equal(h.writes.length,1,'A changed '+change+' cannot start FILE or cleanup after creation');assert.equal(h.x.S.attachmentUploadReview.attachmentId,fid);
}
{
 const h=uploadHarness();h.setDenied(true);await h.x.uploadBudgetAttachments([{name:'denied.pdf',size:1}],{kind:'payment',id:rid,budgetId:bid});assert.equal(h.writes.length,0);
 h.setDenied(false);await h.x.uploadBudgetAttachments([{name:'foreign.pdf',size:1}],{kind:'payment',id:rid,budgetId:'999'});assert.equal(h.writes.length,0);
}
console.log('Saved request uploads: exact parent envelope, original File bytes, metadata-free native success, same-Budget/permission checks and actor/navigation changes before FILE passed.');
{
 const own={ID:mid,Budget:{ID:bid}},supplement={ID:'90071992547409936',Budget:{ID:bid}},foreign={ID:'90071992547409937',Budget:{ID:'999'}};
 const x=vm.createContext({S:{checkWireRequestsByBudget:{[bid]:[{_poModificationsState:'loaded',_poModifications:[own,supplement,foreign]}]}},modsForBudget:()=>[own],Set,lookupMatchesId:(value,id)=>value?.ID===String(id)});
 vm.runInContext(sourceOf('requestAttachmentModifications'),x);assert.deepEqual(Array.from(x.requestAttachmentModifications(bid),row=>row.ID),[mid,supplement.ID],'Authorized PO-display children remain reachable for attachment tabs without broadening financial aggregates');
}
{
 const x=vm.createContext({attachmentLinkStates:{},attachmentLinksReady:()=>false,escAttr:String});vm.runInContext(sourceOf('requestAttachmentButton'),x);
 assert.match(x.requestAttachmentButton(b,'payment',rid),/<small>…<\/small>/);x.attachmentLinkStates[bid]={status:'error'};assert.match(x.requestAttachmentButton(b,'payment',rid),/<small>—<\/small>/,'Unavailable is distinct from loading');
 x.attachmentLinksReady=()=>true;x.budgetFeature=()=>({status:'loaded'});x.budgetAttachments=()=>[];x.requestAttachmentContextMatches=()=>true;
 assert.match(x.requestAttachmentButton(b,'payment',rid),/<small>0<\/small>/,'Only a complete request-file read can show zero');
}
