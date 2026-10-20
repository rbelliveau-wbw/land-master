import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {sourceOf} from './test-budget-request-attachments.mjs';
const c=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/request-attachments.js','utf8'),c);
const D=c.window.LMRequestAttachments.Draft;
const scope='actor|production|1001',target={kind:'modification',id:'90071992547409931',budgetId:'1001'};
const file=name=>({name,size:20,lastModified:1});
let writes=[],allowed=true,current=true,mode='success';
const adapter={current:()=>current,allowed:()=>allowed,upload:async(f,t)=>{writes.push({file:f,target:t});return mode==='unknown'?{unknown:true,message:'Lost reply',attachmentId:'7001'}:mode==='failed'&&f.name==='second.pdf'?{safeRetry:true,message:'Rejected before file write'}:{success:true,attachmentId:'7002'};}};
{
 const model={},q=D.get(model,scope);assert.equal(D.get(model,'other'),q);
 D.add(q,[file('first.pdf'),file('first.pdf'),file('second.pdf')]);assert.equal(q.entries.length,2);assert.equal(writes.length,0,'Selecting files never writes');
 assert.equal(D.add(q,[file('third.pdf'),{name:'large.pdf',size:50*1024*1024+1}]),false);assert.equal(q.entries.length,2,'Oversized batch is rejected before staging');
 for(const bad of [{...target,id:''},{...target,id:90071992547409931},{...target,kind:'foreign'}])await assert.rejects(D.flush(q,bad,adapter),/Save the request/);
 mode='failed';let result=await D.flush(q,target,adapter);assert.equal(result.saved,1);assert.equal(result.complete,false);assert.equal(q.entries[1].status,'failed');
 mode='success';result=await D.flush(q,target,adapter);assert.equal(result.complete,true);assert.deepEqual(writes.map(w=>w.file.name),['first.pdf','second.pdf','second.pdf']);assert.ok(writes.every(w=>w.target.id===target.id&&w.target.budgetId==='1001'));
 await D.flush(q,target,adapter);assert.equal(writes.length,3,'Completed files are not uploaded again');
 await assert.rejects(D.flush(q,{...target,id:'999'},adapter),/another request/);
}
{
 writes=[];mode='unknown';const q=D.get({},scope);D.add(q,[file('lost.pdf'),file('later.pdf')]);let r=await D.flush(q,target,adapter);assert.equal(r.unknown,true);assert.equal(q.entries[0].attachmentId,'7001');assert.equal(q.entries[1].status,'queued');
 mode='success';await D.flush(q,target,adapter);assert.equal(writes.length,1,'Unknown file uploads never replay');assert.equal(D.add(q,[file('new.pdf')]),false);
}
{
 writes=[];const q=D.get({},scope);D.add(q,[file('held.pdf'),file('later.pdf')]);let release;adapter.upload=async(f)=>{writes.push(f);await new Promise(r=>release=r);return {success:true};};
 const pending=D.flush(q,target,adapter);assert.equal(q.busy,true);await D.flush(q,target,adapter);assert.equal(writes.length,1,'Concurrent flushes cannot duplicate a child');current=false;release();await pending;assert.equal(writes.length,1,'Context change prevents the next file');assert.equal(q.entries[1].status,'blocked');current=true;
 allowed=false;await D.flush(q,target,adapter);assert.equal(writes.length,1,'Permission loss prevents writes');allowed=true;
}
{
 const b={ID:'1001'},model={attachmentDraft:D.get({},scope)},q=model.attachmentDraft;D.add(q,[file('lost.pdf'),file('later.pdf')]);q.entries[0].status='unknown';q.entries[0].attachmentId='7001';
 let checks=0,uploads=0;
 const w=vm.createContext({S:{edBudget:b,attachmentUploadReview:{budgetId:'1001',attachmentId:'7001',requestContext:target}},LMRequestAttachments:c.window.LMRequestAttachments,requestFileDrafts:{},requestAttachmentUI:null,approvalProgress:null,budgetNavigationToken:()=>1,attachmentLinkScope:()=>scope,canAddBudgetAttachment:()=>true,ensureRequestAttachments:async()=>{},shortErr:e=>e.message,recheckBudgetAttachmentUpload:async()=>{checks++;return true;},uploadBudgetAttachments:async()=>{uploads++;return true;}});
 for(const name of ['requestFileDraftKey','flushRequestAttachmentDraft'])vm.runInContext(sourceOf(name),w);
 await w.flushRequestAttachmentDraft(model,b,target,false);assert.equal(checks,0);assert.equal(uploads,0);
 await w.flushRequestAttachmentDraft(model,b,{...target,id:'foreign'},true);assert.equal(checks,0);
 await w.flushRequestAttachmentDraft(model,b,target,true);assert.equal(checks,1);assert.equal(q.entries[0].status,'saved');assert.equal(uploads,0,'Check status performs no upload and stops before remaining files');
}
{
 const model={attachmentDraft:{entries:[{file:file('estimate.pdf'),status:'queued'}]}};let parentCreates=0,flushes=[],checks=0;
 const pctx=vm.createContext({S:{edBudget:{ID:'1001'},modifications:[]},approvalProgress:null,requireBudgetModsReady:()=>true,$:()=>({hidden:true}),approvalProgressButtons(){},startApprovalProgressAttempt(){},budgetFunctionResultText:r=>r.result,flushRequestAttachmentDraft:async(m,b,t)=>{assert.equal(m,model);flushes.push(t);return {complete:true,total:1,saved:1};},scheduleApprovalProgressCheck:()=>checks++,finishApprovalProgress(){},auditLog(){}});
 vm.runInContext(sourceOf('openModificationProgress'),pctx);
 pctx.openModificationProgress('','1001',null,async()=>{parentCreates++;return {result:'OK: Modification 90071992547409931 submitted.'};},model);
 await new Promise(r=>setTimeout(r,0));assert.equal(parentCreates,1);assert.equal(flushes.length,1);assert.equal(flushes[0].id,target.id);assert.equal(checks,1);
 pctx.approvalProgress=null;flushes=[];
 pctx.openModificationProgress('','1001',null,async()=>({result:'Unknown response'}),model);await new Promise(r=>setTimeout(r,0));assert.equal(flushes.length,0,'Unidentified parent cannot receive any files');
}
console.log('PASS draft attachment queue: no pre-save writes, 50MB/duplicate guards, exact saved parent, one-time parent handoff, partial retry without replay, unknown read-only recovery, context/permission changes and original File preservation.');
