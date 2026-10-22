import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
function sourceOf(name){const start=html.indexOf('function '+name+'(');assert.ok(start>=0,name);const line=html.indexOf('\n',start);return html.slice(start,html.slice(start,line).trimEnd().endsWith('}')?line:html.indexOf('\n}',start)+2);}
const bid='90071992547409931',mid='90071992547409932',aid='90071992547409933';
let actor='reviewer',owned=true,admin=false,ready=true,writeMode='success',releaseWrite,calls=[],rejections=[],notices=[];
const mod={ID:mid,Budget:{ID:bid},Status:'Submitted'};
const row={ID:aid,Budget:{ID:bid},Budget_Modification:{ID:mid,display_value:'18750'},Type1:'Modification',Status:'Pending',Approver:'cfo@example.test',Title:'CFO',Approval_Notes:'Retained note',Sort_Order:'1'};
const c=vm.createContext({S:{modifications:[mod],approvals:[row]},CFG:{forms:{approval:'Budget_Approvals'}},approvalProgress:null,
  budgetCreateScope:(kind,parent)=>JSON.stringify([actor,'production',kind,String(parent)]),
  cleanVal:v=>String(v??'').trim(),firstRaw:(r,keys)=>keys.map(k=>r?.[k]).find(v=>v!=null),v:v=>Number(v)||0,
  lookupMatchesId:(value,id)=>String(value?.ID??value)===String(id),
  esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),
  escAttr:v=>String(v??'').replaceAll('&','&amp;').replaceAll("'",'&#39;').replaceAll('"','&quot;').replaceAll('<','&lt;'),
  requireBudgetModsReady:()=>ready,userOwnsApproval:()=>owned,canAdminMods:()=>admin,
  modificationBudgetId:()=>bid,budgetNavigationToken:()=>1,fmtDateUS:()=> '10/22/2026',
  sdkUpdateRecord:async(form,id,fields)=>{calls.push({form,id,fields});if(writeMode==='hold')await new Promise(resolve=>releaseWrite=resolve);if(writeMode==='fail')throw Error('Creator rejected update');return {code:3000,data:{ID:id}};},
  sdkRunBudgetFunction:async(name,args)=>{calls.push({name,args});return {result:'OK'};},
  refreshBudgetWorkflowState:async()=>{},refreshModSurfaces(){},renderModModal(){},
  toastShow:message=>notices.push(message),shortErr:e=>e.message,auditLog(){},
  openModificationRejectProgress:(...args)=>rejections.push(args),document:{activeElement:{},querySelectorAll:()=>[]}
});
for(const name of ['modChainRows','modApprovalNote','clearModApprovalNote','modApprovalCommentsHtml','captureModApprovalNote','handleModDecision'])vm.runInContext(sourceOf(name),c);
const key=()=>c.budgetCreateScope('mod-approval-note',aid);
function draft(text){c.S.modApprovalNoteDrafts??={};c.S.modApprovalNoteDrafts[key()]=text;}
function reset(){mod.Status='Submitted';row.Status='Pending';row.Approval_Notes='Retained note';c.S.modApprovalNoteDrafts={};calls=[];rejections=[];notices=[];writeMode='success';owned=true;admin=false;ready=true;actor='reviewer';}

const saved={...row,ID:'90071992547409934',Status:'Approved',Approver:'previous@example.test',Title:'CFO',Responded_Date:'10/21/2026',Approval_Notes:'Reviewed <scope> & pricing'};
let view=c.modApprovalCommentsHtml([saved,row],row,true,false);
assert.match(view,/previous@example\.test/);assert.match(view,/10\/21\/2026/);assert.match(view,/Reviewed &lt;scope&gt; &amp; pricing/);
assert.match(view,new RegExp("data-modnote='"+aid+"'"));assert.match(view,/Retained note/);assert.doesNotMatch(view,/<button|Add comment|Post|Save Note/);
assert.doesNotMatch(c.modApprovalCommentsHtml([saved],null,false,false),/<textarea/,'Read-only history never grants a composer');
assert.match(c.modApprovalCommentsHtml([row],row,true,true),/id='modRejNotes' aria-required='true'/);
draft('Draft for CFO');assert.equal(c.modApprovalNote(row),'Draft for CFO');actor='other';assert.equal(c.modApprovalNote(row),'Retained note','Drafts cannot leak across actor/environment scope');actor='reviewer';
c.clearModApprovalNote(aid,'Older draft',key());assert.equal(c.modApprovalNote(row),'Draft for CFO','An older completion preserves a newer draft');

reset();draft('  Scope confirmed.\nProceed.  ');await c.handleModDecision(mid,aid,true);
assert.equal(calls[0].form,'Budget_Approvals');assert.equal(calls[0].id,aid);assert.equal(typeof calls[0].id,'string');
assert.deepEqual(JSON.parse(JSON.stringify(calls[0].fields)),{Status:'Approved',Responded_Date:'10/22/2026',Approval_Notes:'Scope confirmed.\nProceed.'});
assert.equal(row.Approval_Notes,'Scope confirmed.\nProceed.');assert.equal(c.S.modApprovalNoteDrafts[key()],undefined);
assert.deepEqual(JSON.parse(JSON.stringify(calls[1])),{name:'sendModificationEmail',args:{modificationId:mid,action:'approved'}},'Reuse existing routing/email helper');
await c.handleModDecision(mid,aid,true);assert.equal(calls.length,2,'A decided row cannot be submitted again');
reset();draft('');await c.handleModDecision(mid,aid,true);assert.equal(calls[0].fields.Approval_Notes,'','Approval comments remain optional');

reset();draft('Please revise scope');await c.handleModDecision(mid,aid,false);assert.equal(calls.length,0);assert.equal(rejections[0][0],mid);assert.equal(rejections[0][1],aid);assert.equal(rejections[0][2],'Please revise scope');
assert.equal(c.modApprovalNote(row),'Please revise scope','Rejection keeps its draft until the existing progress write is acknowledged');
assert.match(sourceOf('openModificationRejectProgress'),/Status:"Rejected", Responded_Date:fmtDateUS\(\), Approval_Notes:p\.note/);
reset();draft('');await c.handleModDecision(mid,aid,false);assert.equal(rejections.length,0);assert.match(notices[0],/required/,'Existing mandatory rejection reason remains');

for(const deny of [()=>{owned=false;},()=>{row.Status='Approved';},()=>{mod.Status='Rejected';},()=>{ready=false;}]){reset();deny();await c.handleModDecision(mid,aid,true);assert.equal(calls.length,0,'Stale/unauthorized/not-ready actions cannot write');}
reset();await c.handleModDecision(mid,'90071992547409935',true);assert.equal(calls.length,0,'A different approval ID cannot receive the note');
reset();owned=false;admin=true;await c.handleModDecision(mid,aid,true);assert.equal(calls[0].id,aid,'Existing modification admin delegation remains');

reset();draft('Preserve on failure');writeMode='fail';await c.handleModDecision(mid,aid,true);assert.equal(c.modApprovalNote(row),'Preserve on failure');assert.equal(row.Status,'Pending');assert.equal(c.S.modApprovalBusy[key()],undefined);
reset();draft('First note');writeMode='hold';const pending=c.handleModDecision(mid,aid,true);await c.handleModDecision(mid,aid,true);assert.equal(calls.length,1,'Double click makes one native write');draft('Newer edit');releaseWrite();await pending;assert.equal(c.modApprovalNote(row),'Newer edit','An in-flight completion cannot erase a newer draft');

for(const name of ['renderModModal','renderModDetailView','buildModApprovalPageSection'])assert.match(sourceOf(name),/modApprovalCommentsHtml\(/,name+' uses the shared per-approval comments');
assert.match(sourceOf('approvalProgressPayload'),/approvalNote:action === "Approved" \|\| action === "Rejected" \? p\.note/,'Budget track decisions already persist their note');
const po=fs.readFileSync('widgets/budget-manager/src/app/po-ui.js','utf8');assert.match(po,/data-po-approval-note/);assert.match(po,/approvalId:bundle\.active\.id[\s\S]*?note:note/,'PO note uses the captured active approval row');
assert.match(fs.readFileSync('creator/functions/handlePurchaseOrderApproval.dg','utf8'),/row\.Approval_Notes=note/);
console.log('PASS Budget approval comments: exact native row/status/date/note payload, author/date history, all modification surfaces, optional approval/required rejection, drafts, permissions, failures and duplicate guards; existing Budget/PO note contracts retained.');
