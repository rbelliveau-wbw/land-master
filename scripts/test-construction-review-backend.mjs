import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

// Execute the checked-in Deluge bodies against native-shaped fixtures. This is
// offline behavioral coverage, not a substitute for Creator compilation/UI QA.
const CID='90071992547419991', OP='construction-review-operation-0001', OTHER='construction-review-operation-0002';
const names=['hasConstructionPermission','PF_Packet_Escape','constructionReviewActor','constructionReviewSnapshot','buildConstructionRejectionNotification','sendConstructionRejectionNotification','manageConstructionReview','getContractAttachmentPreview'];
const sources=Object.fromEntries(names.map(name=>[name,fs.readFileSync('creator/functions/'+name+'.dg','utf8')]));
function runtime(options={}){
 const fixtures={
  Contract:[{ID:CID,Work_Module:options.module??'Construction',Status:options.status??'Proposed',Contract_Name:'Arroyo <Ranch> & Phase 05\nMUD Bid',Added_User:options.submitter??'jking_wbdevelopment84',Construction_Rejection_Operation:'',Project:'90071992547419992',Subdivision1:['90071992547419993']}],
  User_Access:[{ID:'4410926000003608012',User:'samuel_wbw',Full_Name:'Samuel <Spears>',Edit_All_Construction_Requests:options.edit??false,Submit_Construction_Requests:options.submit??false,Approver_Email:'sam@example.test'},...(options.noSubmitterAccess?[]:[{ID:'4410926000004465004',User:options.submitter??'jking_wbdevelopment84',Approver_Email:options.recipient??'jking@example.test'}])],
  Attachment:[{ID:'90071992547419994',Contract1:CID,File_field1:{actualname:'native.pdf',base64:'JVBERi0xLjcKZml4dHVyZQ=='}}],
  Project:[{ID:'90071992547419992',Project_Name:'Arroyo Project'}],Subdivision:[{ID:'90071992547419993',Subdivision_Name:'Phase <05>'}],Construction_Review_Log:[],Comment_Log:[]
 };
 const c=vm.createContext({fixtures:JSON.stringify(fixtures),options:JSON.stringify(options),console});
 vm.runInContext(`
 var options=JSON.parse(options),tables=JSON.parse(fixtures),mails=[],inserts=[],nextId=1000,hook=null;
 function ifnull(v,f){return v==null?f:v;} function choose(c,a,b){return c?a:b;} function Map(){return {};} function List(){return [];}
 Object.defineProperties(Object.prototype,{put:{value:function(k,v){this[k]=v;},configurable:true},get:{value:function(k){return this[k]??null;},configurable:true},toString:{value:function(){return JSON.stringify(this);},configurable:true}});
 Array.prototype.add=function(v){this.push(v);};Array.prototype.contains=function(v){return this.includes(v);};Array.prototype.size=Array.prototype.count=function(){return this.length;};Array.prototype.get=function(i){return this[i]??null;};
 String.prototype.toMap=function(){return JSON.parse(this);};String.prototype.toLong=function(){return this.toString();};String.prototype.len=function(){return this.length;};String.prototype.matches=function(pattern){return new RegExp(pattern).test(this);};String.prototype.replaceAll=function(a,b){return this.replace(new RegExp(a,'g'),b);};Number.prototype.toLong=function(){return Math.trunc(this);};
 function stamp(epoch=1234567890){return {toLong(){return epoch;},toString(){return 'Nov 6, 2026 · 10:30 AM';}};}
 var zoho={loginuser:options.nativeActor??'samuel_wbw',adminuser:'wbdevelopment',currenttime:stamp(),encryption:{base64Encode(file){return file.base64;}}},thisapp={environment:{type:options.environment??'Production'},permissions:{profileForUser(){return options.profile??'Construction Budgeting';},isUserInProfile(name){return name===(options.profile??'Construction Budgeting');}}};
 tables.Contract[0].Modified_Time=options.noModified?null:stamp();
 function record(row){return new Proxy(row,{get(o,k){return o[k]??null;},set(o,k,v){if(options.failStatus&&k==='Status')throw Error('Status failure');o[k]=v;if(k==='Construction_Rejection_Operation'){o.Modified_Time=stamp(1234567891);if(hook)hook('marker',o);}return true;}});}
 function query(form,predicate,sort){let rows=Array.from(tables[form]??[],record).filter(predicate);if(sort)rows.sort((a,b)=>a[sort]-b[sort]);return new Proxy(rows,{get(a,k){return k in a||typeof k==='symbol'?a[k]:a[0]?.[k]??null;},set(a,k,v){if(k in a||!a.length){a[k]=v;return true;}a[0][k]=v;return true;}});}
 function insertNative(form,data){if(form==='Comment_Log'&&options.failComment)throw Error('Comment insertion failed');if(data.Claim_Key&&tables[form].some(row=>row.Claim_Key===data.Claim_Key))throw Error('Duplicate unique Claim_Key');let row={...data,ID:String(nextId++),Added_Time:stamp()};tables[form].push(row);inserts.push({form,id:row.ID});if(hook)hook('insert',row);return row.ID;}
 function sendMail(from,to,subject,message){if(options.failMail)throw Error('Ambiguous mail exception');mails.push({from,to,subject,body:message});if(hook)hook('mail',mails.at(-1));}
 `,c);
 for(const name of names){
  let source=sources[name].replace(/\.length\(\)/g,'.len()'); // Deluge string length versus JavaScript's numeric property.
  source=source.replace(/(\w+)\s*=\s*insert into\s+(\w+)\s*\[([\s\S]*?)\];/g,(_,v,form,body)=>`${v} = insertNative('${form}',{\n${body.trim().split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{const m=line.match(/^(\w+)\s*=(.*)$/);if(!m)throw Error('Unsupported native insert line '+line);return m[1]+':'+m[2];}).join(',\n')}\n});`);
  source=source.replace(/sendmail\s*\[([\s\S]*?)\]/g,(_,body)=>'sendMail('+['from','to','subject','message'].map(k=>body.match(new RegExp('^\\s*'+k+'\\s*:(.*)$','m'))[1]).join(',')+');');
  const code=translate(source).js;
  try{vm.runInContext(code+';thisapp.'+name+'='+name+';',c);}catch(error){throw Error(name+': '+error.message+'\n'+code,{cause:error});}
 }
 const call=p=>JSON.parse(vm.runInContext('manageConstructionReview('+JSON.stringify(JSON.stringify(p))+')',c));
 const run=(action='reject',extra={})=>call({contractId:CID,operationId:OP,action,userAccessId:'4410926000003608012',reason:'Please revise <plans> & confirm timing.\nUse the final set.',...extra});
 return {c,call,run,eval:code=>vm.runInContext(code,c),get tables(){return c.tables;},get mails(){return c.mails;}};
}

{
 const h=runtime(),r=h.run();assert.equal(r.ok,true,r.message);assert.equal(r.rejectionRecorded,true,r.message);assert.equal(r.commentRecorded,true);assert.equal(r.emailState,'sent');assert.equal(r.writeState,'acknowledged');assert.equal(r.canRetryEmail,false);assert.equal(r.recipient,'jking@example.test');assert.ok(r.emailSentAt);
 assert.equal(h.tables.Contract[0].Status,'Rejected');assert.equal(h.tables.Contract[0].Construction_Rejection_Operation,OP);
 assert.equal(h.tables.Comment_Log.length,1);assert.equal(h.tables.Comment_Log[0].User,'samuel_wbw');assert.match(h.tables.Comment_Log[0].Comment,/Request Rejected\n\nPlease revise/);
 assert.equal(h.tables.Construction_Review_Log.length,2);assert.equal(h.tables.Construction_Review_Log[0].Kind,'Decision');assert.equal(h.tables.Construction_Review_Log[1].Kind,'Email');assert.equal(h.tables.Construction_Review_Log[1].State,'sent');
 const mail=h.mails[0];assert.equal(mail.from,'Notifications@wbdevelopment.com');assert.equal(mail.to,'jking@example.test');assert.match(mail.body,/Samuel &lt;Spears&gt;/);assert.match(mail.body,/Please revise &lt;plans&gt; &amp; confirm timing\.<br>Use the final set\./);assert.match(mail.body,/Arroyo Project · Phase &lt;05&gt;/);assert.doesNotMatch(mail.subject,/[\r\n]/);assert.match(mail.body,/#Page:Construction\?contractId=90071992547419991&amp;recordView=list/);
 h.run();h.run('retry-email');h.run('check');assert.equal(h.tables.Comment_Log.length,1,'replay/check/retry cannot duplicate the comment');assert.equal(h.mails.length,1,'sent mail cannot be resent');
 const original=h.run('check').reason;h.tables.Comment_Log[0].Comment='Edited after rejection';h.tables.Comment_Log[0].Deleted=true;assert.equal(h.run('check').reason,original,'immutable audit retains original reason independently of thread edits/deletes');
}
for(const profile of ['CFO','Dev/Land Acq - Proforma & Budgets']){
 const h=runtime({profile});assert.equal(h.run().ok,false,profile+' remains submit-only');assert.equal(h.tables.Construction_Review_Log.length,0);assert.equal(h.run('check').ok,true,profile+' can read Construction status');
 const editor=runtime({profile,edit:true});assert.equal(editor.run().emailState,'sent',profile+' with explicit edit grant can reject');
}
for(const options of [{profile:'Read'},{module:'Legal'},{status:'New'},{status:'Complete'},{status:'Rejected'},{noModified:true}]){
 const h=runtime(options);assert.equal(h.run().ok,false,JSON.stringify(options));assert.equal(h.tables.Construction_Review_Log.length,0);assert.equal(h.tables.Comment_Log.length,0);assert.equal(h.mails.length,0);
}
for(const extra of [{contractId:Number(CID)},{contractId:'1 OR 1'},{operationId:''},{operationId:'short'},{reason:''},{reason:' '.repeat(10)},{reason:'x'.repeat(5001)},{action:'approve'}]){
 const h=runtime();assert.equal(h.run('reject',extra).ok,false,JSON.stringify(extra).slice(0,100));assert.equal(h.tables.Construction_Review_Log.length,0);
}
for(const environment of ['Development','Stage','Production']){
 const h=runtime({environment});assert.equal(h.run().emailState,'sent');assert.equal(h.mails[0].subject.startsWith('[DEV TEST]'),environment==='Development');assert.equal(h.mails[0].subject.startsWith('[STAGE TEST]'),environment==='Stage');assert.equal(h.mails[0].body.includes('/environment/'),environment!=='Production');
}
{
 const h=runtime({recipient:'',submitter:'unresolved_native_username'}),r=h.run();assert.equal(r.rejectionRecorded,true);assert.equal(r.commentRecorded,true);assert.equal(r.emailState,'missing-recipient');assert.equal(r.canRetryEmail,true);assert.equal(h.mails.length,0);
 h.tables.User_Access[1].Approver_Email='corrected@example.test';const retried=h.run('retry-email');assert.equal(retried.emailState,'sent');assert.equal(retried.recipient,'corrected@example.test');assert.equal(h.tables.Comment_Log.length,1);assert.equal(h.mails.length,1);assert.equal(h.tables.Construction_Review_Log.filter(r=>r.Kind==='Email').length,2);
}
for(const options of [{submitter:'original@example.test',recipient:''},{submitter:'original@example.test',noSubmitterAccess:true}]){
 const h=runtime(options);assert.equal(h.run().recipient,'original@example.test');assert.equal(h.mails[0].to,'original@example.test','valid-email username fallback is allowed');
}
for(const recipient of ['not-an-email','two@example.test,other@example.test','valid@example.test\r\nBcc: other@example.test']){
 const h=runtime({recipient});assert.equal(h.run().emailState,'missing-recipient');assert.equal(h.mails.length,0);
}
{
 const h=runtime();h.tables.User_Access.push({...h.tables.User_Access[1],ID:'duplicate'});assert.equal(h.run().emailState,'missing-recipient');assert.equal(h.mails.length,0,'ambiguous submitter identity cannot pick an arbitrary record');
}
{
 const h=runtime({environment:'Unknown'});assert.equal(h.run().emailState,'failed');assert.equal(h.mails.length,0);h.eval("thisapp.environment.type='Production'");assert.equal(h.run('retry-email').emailState,'sent');assert.equal(h.mails.length,1);
}
{
 const h=runtime({failMail:true});const r=h.run();assert.equal(r.rejectionRecorded,true);assert.equal(r.emailState,'unknown');assert.equal(r.canRetryEmail,false);h.eval('options.failMail=false');h.run('retry-email');h.run();assert.equal(h.mails.length,0,'ambiguous send failures retain their claim and never resend');assert.equal(h.tables.Construction_Review_Log.length,2);
}
{
 const h=runtime();h.eval("hook=function(kind){if(kind==='mail')throw Error('The sender accepted mail but its reply was lost');}");
 const r=h.run();assert.equal(h.mails.length,1);assert.equal(r.emailState,'unknown');assert.equal(r.canRetryEmail,false);h.eval('hook=null');h.run('retry-email');h.run();assert.equal(h.mails.length,1,'accepted mail with a lost reply must not be duplicated');
}
for(const option of ['failComment','failStatus']){
 const h=runtime({[option]:true});const r=h.run();assert.equal(r.writeState,'unknown');assert.equal(r.canRetryEmail,false);assert.equal(h.mails.length,0);const before=h.tables.Construction_Review_Log.length;h.run();h.run('reject',{operationId:OTHER});assert.equal(h.tables.Construction_Review_Log.length,before,'partial recording claim blocks same or new rejection operation');assert.equal(h.tables.Comment_Log.length,0);
}
{
 // Interleave another reviewer after the pointer write has changed Modified_Time
 // but before Status=Rejected. A fresh-version claim must still be blocked.
 const h=runtime();h.eval(`hook=function(kind){if(kind==='marker'){hook=null;var nested=JSON.parse(manageConstructionReview(JSON.stringify({contractId:'${CID}',operationId:'${OTHER}',action:'reject',userAccessId:'4410926000003608012',reason:'Concurrent second reason'})));if(nested.ok!==false)throw Error('Concurrent pointer-gap reject was accepted');}}`);
 assert.equal(h.run().emailState,'sent');assert.equal(h.tables.Construction_Review_Log.filter(r=>r.Kind==='Decision').length,1);assert.equal(h.tables.Comment_Log.length,1);assert.equal(h.mails.length,1);
}
{
 // An already eligible retry prepares its message while a competing retry runs
 // to completion. The stale attempt number must collide instead of sending twice.
 const h=runtime({recipient:''});h.run();h.tables.User_Access[1].Approver_Email='corrected@example.test';
 h.eval(`var originalPrepare=thisapp.buildConstructionRejectionNotification;var raced=false;thisapp.buildConstructionRejectionNotification=function(id){var result=originalPrepare(id);if(!raced){raced=true;sendConstructionRejectionNotification(id,'4410926000003608012');}return result;};`);
 assert.equal(h.run('retry-email').emailState,'sent');assert.equal(h.mails.length,1,'stale prepared retry cannot skip ahead to a second send attempt');assert.equal(h.tables.Construction_Review_Log.filter(r=>r.Kind==='Email').length,2);
}
{
 // Check/retry during a newly inserted send claim must see a non-retryable state.
 const h=runtime();h.eval(`hook=function(kind,row){if(kind==='insert'&&row.Kind==='Email'){var check=constructionReviewSnapshot('${CID}','${OP}','4410926000003608012');if(check.canRetryEmail!==false||check.emailState!=='sending')throw Error('In-flight claim exposed retry');sendConstructionRejectionNotification('1000','4410926000003608012');}}`);
 assert.equal(h.run().emailState,'sent');assert.equal(h.mails.length,1);assert.equal(h.tables.Construction_Review_Log.filter(r=>r.Kind==='Email').length,1);
}
{
 const h=runtime();h.run();h.tables.Contract[0].Status='Proposed';h.tables.Contract[0].Modified_Time=h.eval('stamp(1234567999)');const r=h.run('reject',{operationId:OTHER,reason:'A later explicit review cycle'});assert.equal(r.emailState,'sent');assert.equal(h.tables.Construction_Review_Log.filter(r=>r.Kind==='Decision').length,2,'explicit reopened cycle gets a new immutable receipt');assert.equal(h.mails.length,2);
}
{
 const h=runtime({environment:'Development',nativeActor:'wbdevelopment'});
 assert.equal(h.run().emailState,'sent','Development native owner may preview the existing Construction actor');
 assert.equal(h.tables.Comment_Log[0].User,'samuel_wbw');
 const receipt=JSON.parse(h.tables.Construction_Review_Log[0].Snapshot);
 assert.equal(receipt.actor,'samuel_wbw');assert.equal(receipt.nativeActor,'wbdevelopment');
}
for(const environment of ['Stage','Production']){
 const h=runtime({environment,nativeActor:'ordinary_user',profile:'Read'});
 assert.equal(h.run().ok,false,'A claimed Construction row cannot impersonate its user outside native owner Development preview');assert.equal(h.mails.length,0);
}
for(const extra of [{userAccessId:4410926000003608012},{userAccessId:'999999'},{userAccessId:'1 OR 1'}]){
 const h=runtime({environment:'Development',nativeActor:'wbdevelopment'});assert.equal(h.run('reject',extra).ok,false);assert.equal(h.tables.Construction_Review_Log.length,0);
}
{
 const h=runtime({environment:'Development',nativeActor:'wbdevelopment'});h.tables.User_Access.push({...h.tables.User_Access[0],ID:'22222'});
 assert.equal(h.run().ok,false,'Duplicate selected user identity fails closed');assert.equal(h.mails.length,0);
}
for(const source of Object.values(sources)){assert.doesNotMatch(source,/\bwhile\s*\(|containsKey\(/);assert.match(source,/\n[ \t]+return [^\n]+;\r?\n[ \t]*}\s*$/,'typed helpers retain an unconditional outer fallback return');}
assert.doesNotMatch(sources.manageConstructionReview,/thisapp\.postRecordComment\(/,'rejection cannot emit general owner comment mail');
function previewFixture(options={}){
 const h=runtime(options);
 h.eval("var previewReads=0;thisapp.permissions.profileForUser=function(user){return user==='samuel_wbw'?(options.profile??'Construction Budgeting'):'Read';};zoho.encryption.base64Encode=function(file){previewReads++;return file.base64;};");
 const preview=(parent=CID,id='90071992547419994')=>JSON.parse(h.eval('getContractAttachmentPreview('+JSON.stringify(parent)+','+JSON.stringify(id)+')'));
 return {...h,preview};
}
const devPreviewRequest=JSON.stringify({contractId:CID,userAccessId:'4410926000003608012'});
{
 const h=previewFixture({environment:'Development',nativeActor:'wbdevelopment'});
 assert.equal(h.preview().ok,false,'owner-context Dev denial remains without an explicit View-as identity');
 const r=h.preview(devPreviewRequest);assert.equal(r.ok,true,r.message);assert.equal(r.contractId,CID);assert.equal(r.attachmentId,'90071992547419994');assert.equal(r.base64,'JVBERi0xLjcKZml4dHVyZQ==','service returns exact stored bytes');
 assert.equal(h.tables.Comment_Log.length,0);assert.equal(h.mails.length,0);assert.equal(h.eval('inserts.length'),0,'preview performs no writes');
}
for(const environment of ['Stage','Production']){
 const h=previewFixture({environment});assert.equal(h.preview(devPreviewRequest).ok,false,'demo actor envelopes are Dev only');assert.equal(h.eval('previewReads'),0);assert.equal(h.preview().ok,true,'plain parent-ID callers retain native identity behavior');
}
for(const options of [{environment:'Development',nativeActor:'wbdevelopment',profile:'Read'},{environment:'Development',nativeActor:'wbdevelopment',module:'Legal'},{environment:'Development',nativeActor:'ordinary-unprivileged-user'}]){
 const h=previewFixture(options);assert.equal(h.preview(devPreviewRequest).ok,false,JSON.stringify(options));assert.equal(h.eval('previewReads'),0,'no bytes before native identity, module and permission checks');
}
for(const request of [JSON.stringify({contractId:CID,userAccessId:'missing'}),JSON.stringify({contractId:CID,userAccessId:'4410926000003608999'}),JSON.stringify({contractId:'90071992547419990',userAccessId:'4410926000003608012'})]){
 const h=previewFixture({environment:'Development',nativeActor:'wbdevelopment'});assert.equal(h.preview(request).ok,false);assert.equal(h.eval('previewReads'),0,'invalid actor or parent cannot encode a file');
}
console.log('Construction preview backend: exact saved bytes, reused Dev owner-only View-as resolver, native actor/parent/module permissions, Production/Stage compatibility and zero writes passed (offline).');
console.log('Construction rejection backend: native-shaped identities, immutable notes, profile gates, string IDs, safe mail retries, and concurrent reviewer/send claims passed (offline; native compilation still required).');
