import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';
import {ready,harness,drain,ID} from './test-contract-sdk-v2-foundation.mjs';
const source=fs.readFileSync('creator/functions/buildContractCommentNotification.dg','utf8');
const postSource=fs.readFileSync('creator/functions/postRecordComment.dg','utf8');
function runtime({field='Contract1',module='Legal',environment='Production',owners=['1','2','3','4','5'],deleted=false,extraParent=false,failMail=false,profile='CFO',constructionAllowed=true,complete=false}={}){
 const fixtures={Comment_Log:[],Contract:[{ID,Work_Module:module,Contract_Name:'Cedar <Grove>\nTract',Owner:owners,Status:complete?'Complete':'Hold'}],Add_Pro_Forma:[{ID,Name:'Pro Forma <one>',Owner:owners,Status:'Draft'}],Add_Budget:[{ID,Budget_Name:'Budget <one>',Budget_Owner:owners,Status:'Draft',Subdivision1:{Project:ID}}],Project:[{ID,Project_Name:'Project <one>'}],User_Access:[{ID:'1',Approver_Email:'Owner@Example.test',User:'owner'},{ID:'2',Approver_Email:'owner@example.test',User:'duplicate'},{ID:'3',Approver_Email:'',User:'second@example.test'},{ID:'4',Approver_Email:'',User:'unresolved'},{ID:'5',Approver_Email:'author@example.test',User:'author',Full_Name:'Stored <Author>'}],Contract_Actions:[{ID:'a2',Contract1:ID,Current_Action:true,Complete:false,Contract_Action:'Later action',Sort_Order:2},{ID:'a1',Contract1:ID,Current_Action:true,Complete:false,Contract_Action:'Review <terms>',Sort_Order:1}]};
 fixtures.Comment_Log.push({ID:'90071992547419991',Contract1:null,Pro_Forma:null,Budget:null,Project:extraParent?'other':null,[field]:ID,Comment:'Please review <script>x</script> & terms.\nSecond line.',Author_Name:'Stored <Author>',User:'author',Added_User:'author',Added_Time:{},Deleted:deleted});
 const context=vm.createContext({environment,failMail,profile,constructionAllowed,fixtures:JSON.stringify(fixtures)});
 vm.runInContext(`
 var tables=JSON.parse(fixtures),zoho={loginuser:'author',loginuserid:'author@example.test',adminuser:'admin'},thisapp={environment:{type:environment},permissions:{profileForUser(){return profile;}},hasConstructionPermission(){return constructionAllowed;}},mails=[];
 function ifnull(v,f){return v==null?f:v;}function List(){return [];}function Map(){return {put(k,v){this[k]=v;},get(k){return this[k]??null;},toString(){return JSON.stringify(this);}};}
 Array.prototype.add=function(v){this.push(v);};Array.prototype.addAll=function(v){this.push(...v);};Array.prototype.contains=function(v){return this.includes(v);};Array.prototype.size=Array.prototype.count=function(){return this.length;};
 String.prototype.toLong=function(){return this.toString();};String.prototype.len=function(){return this.length;};String.prototype.contains=function(v){return this.includes(v);};String.prototype.left=function(n){return this.slice(0,n);};String.prototype.matches=function(pattern){return new RegExp(pattern).test(this);};String.prototype.replaceAll=function(a,b){return this.replace(new RegExp(a,'g'),b);};
 function stamp(){return {toString(){return 'Oct 21, 2026 · 1:00 PM';}};} tables.Comment_Log[0].Added_Time=stamp();
 function query(form,predicate,sort){let rows=Array.from(tables[form]||[]).filter(predicate);if(sort)rows.sort((a,b)=>a[sort]-b[sort]);return new Proxy(rows,{get(a,k){return k in a||typeof k==='symbol'?a[k]:a[0]?.[k]??null;}});}
 function sendMail(from,to,subject,message){if(failMail)throw Error('Mail failed');mails.push({from,to,subject,message});}
 function insertComment(contract,pf,budget,project,comment,actor,authorName){let row={ID:'90071992547419992',Contract1:contract,Pro_Forma:pf,Budget:budget,Project:project,Comment:comment,User:actor,Author_Name:authorName,Added_User:actor,Added_Time:stamp(),Deleted:false,Edited:false};tables.Comment_Log.push(row);return row.ID;}
 `,context);
 for(const name of ['PF_Packet_Escape','buildContractCommentNotification','postRecordComment']){
  let code=fs.readFileSync('creator/functions/'+name+'.dg','utf8');
  code=code.replace(/commentId = insert into Comment_Log\s*\[[\s\S]*?\];/,'commentId = insertComment(contractLink,pfLink,budgetLink,projectLink,messageText,actor,authorName);').replace(/sendmail\s*\[([\s\S]*?)\]/g,(_,b)=>'sendMail('+['from','to','subject','message'].map(k=>b.match(new RegExp('^\\s*'+k+'\\s*:(.*)$','m'))[1]).join(',')+');');
  let body=translate(code).js.replace('Subdivision1.row.Project','row.Subdivision1.Project').replace('"The comment notification could not be prepared."','String(notificationError.stack)');vm.runInContext(body+';thisapp.'+name+'='+name+';',context);
 }
 return {context,run:()=>vm.runInContext('buildContractCommentNotification("90071992547419991")',context),post:(f=field,p=ID,text='New comment')=>JSON.parse(vm.runInContext('postRecordComment('+JSON.stringify(f)+','+JSON.stringify(p)+','+JSON.stringify(text)+')',context))};
}
for(const field of ['Contract1','Pro_Forma','Budget','Project'])for(const environment of ['Production','Development','Stage']){
 const h=runtime({field,environment}),r=h.run();assert.equal(r.eligible,true,r.reason);assert.deepEqual(Array.from(r.to),['owner@example.test','second@example.test']);assert.equal(r.missingOwners,1);assert.match(r.body,/Stored &lt;Author&gt;/);assert.doesNotMatch(r.body,/<script>/);assert.match(r.body,/&lt;script&gt;x&lt;\/script&gt; &amp; terms\.<br>Second line/);
 const page=field==='Contract1'?'Legal':field==='Pro_Forma'?'Proforma_Management1':'Budget_Management1',param={Contract1:'contractId',Pro_Forma:'proformaId',Budget:'budgetId',Project:'projectId'}[field];assert.ok(r.commentsUrl.endsWith('#Page:'+page+'?'+param+'='+ID+'&recordView=comments'));assert.ok(r.recordUrl.endsWith('&recordView=list'));assert.equal(r.commentsUrl.includes('/environment/'),environment!=='Production');
 const out=h.post();assert.equal(out.ok,true,out.message);assert.equal(out.id,'90071992547419992');assert.equal(out.notificationState,'sent');assert.equal(h.context.tables.Comment_Log.length,2);assert.equal(h.context.mails.length,1);assert.equal(h.context.mails[0].from,'Notifications@wbdevelopment.com');assert.deepEqual(Array.from(h.context.mails[0].to),['owner@example.test','second@example.test']);
}
for(const options of [{owners:[]},{owners:['5']},{deleted:true},{extraParent:true},{module:'Other'},{environment:'Unknown'}]){const h=runtime(options);assert.equal(h.run().eligible,false);}
for(const options of [{profile:'Read'},{profile:'Accounting - Lot Management'},{profile:'Construction Budgeting'},{complete:true},{module:'Construction',constructionAllowed:false}]){let h=runtime(options),out=h.post();assert.equal(out.ok,false);assert.equal(out.writeState,'not-started');assert.equal(h.context.tables.Comment_Log.length,1);assert.equal(h.context.mails.length,0);}
for(const profile of ['Administrator','Write','Dev/Land Acq - Proforma & Budgets','Contract Mgmt','CFO'])assert.equal(runtime({profile}).post().ok,true);
assert.equal(runtime({module:'Construction',profile:'Construction Budgeting'}).post().ok,true);
for(const field of ['Budget','Project','Pro_Forma'])assert.equal(runtime({field,profile:'Construction Budgeting'}).post().ok,false);
for(const bad of [['Unknown',ID,'x'],['Contract1','1 OR 1','x'],['Contract1',ID,''],['Contract1',ID,'x'.repeat(60001)]]){const h=runtime();assert.equal(h.post(...bad).ok,false);assert.equal(h.context.tables.Comment_Log.length,1);}
const failed=runtime({failMail:true}),out=failed.post();assert.equal(out.ok,true);assert.equal(out.notificationState,'failed');assert.equal(failed.context.tables.Comment_Log.length,2,'email failure retains saved comment');
assert.equal(runtime({owners:['5']}).post().notificationState,'skipped');
assert.doesNotMatch(source,/sendmail|insert into|delete from/);
assert.ok(!fs.existsSync('creator/workflows/Notify_Contract_Comment_Owners.dg'));
for(const mode of ['legal','construction'])for(const view of ['comments','list','']){
 const h=await ready({realDOM:true,pageParams:{workMode:mode},accessFlags:{ctEdit:true,constructionSubmit:true}}),c=h.c;
 Object.assign(c.findContract(ID),{Work_Module:mode==='construction'?'Construction':'Legal',Status:'Proposed',Archive:true});
 c.S.search='hidden';c.S.fStatuses=['Complete'];c.S.loiMine=true;
 let opened='';c.openContractComments=id=>{opened=id;return Promise.resolve();};
 const before=h.calls.filter(x=>['add','update','delete'].includes(x.method)).length;
 assert.equal(await c.openContractDeepLink({contractId:ID,recordView:view}),true);
 if(view){assert.equal(c.S.view,'home');assert.equal(c.S.mode,'list');assert.equal(c.S.drill[ID],true);assert.equal(c.S.search,'');assert.equal(c.S.loiMine,false);assert.ok(c.filteredContracts().some(r=>r.ID===ID));assert.equal(opened,view==='comments'?ID:'');}
 else assert.equal(c.S.view,'detail','legacy contractId links keep the detail view');
 c.S.search='keep this';assert.equal(await c.openContractDeepLink({contractId:ID,recordView:view}),false);assert.equal(c.S.search,'keep this','refresh cannot replay the link over user navigation');
 assert.equal(await c.openContractDeepLink({contractId:'90071992547419999',recordView:'comments'}),false);assert.equal(await c.openContractDeepLink({contractId:'1 OR 1',recordView:'list'}),false);
 assert.equal(h.calls.filter(x=>['add','update','delete'].includes(x.method)).length,before,'links never write records or assignment preferences');
}
{
 const h=await ready(),c=h.c;let opened=false;c.openContractComments=()=>{opened=true;};c.findContract(ID).Work_Module='Construction';assert.equal(await c.openContractDeepLink({contractId:ID,recordView:'comments'}),false);assert.equal(opened,false,'Legal links cannot expose Construction records');
}
for(const mode of ['legal','construction'])for(const recordView of ['list','comments']){
 const h=harness({realDOM:true,pageParams:{workMode:mode,contractId:ID,recordView},accessFlags:{constructionSubmit:true}});
 if(mode==='construction'){h.reports.All_Contracts1[0].Work_Module='Construction';h.reports.All_Contract_Actions[0].Work_Module='Construction';}
 let comments='';h.c.openContractComments=id=>{comments=id;return Promise.resolve();};await drain();
 assert.equal(h.c.S.coreReady,true);assert.equal(h.c.S.view,'home');assert.equal(h.c.S.drill[ID],true);assert.equal(comments,recordView==='comments'?ID:'','boot routes page parameters after the scoped native snapshot');
}
console.log('Owner email rendering/routing/deduplication, saved-comment failure isolation and both module deep-link contracts passed.');

// Shared Custom API envelope and genuine Pro Forma native mutation path.
const {ready:pfReady,ID:PFID,OTHER}=await import('./fixtures/proforma-sdk-v2-harness.mjs');
for(const notificationState of ['sent','failed','skipped']){
 const h=await pfReady({invoke:(config,storage)=>{if(config.api_name.replace(/_DEV$|_STAGE$/,'')!=='Post_Record_Comment')return;assert.equal(config.payload.parentId,PFID);assert.equal(config.payload.parentField,'Pro_Forma');storage.Comment_Log_Report.push({ID:OTHER,Pro_Forma:PFID,Comment:config.payload.commentText});return {code:3000,result:JSON.stringify({contract:'record-comments-v1',ok:true,id:OTHER,parentField:'Pro_Forma',parentId:PFID,notificationState,writeState:'acknowledged'})};}});
 const result=await h.widget.sdkAdd('Comment_Log',{Pro_Forma:PFID,Comment:'One saved comment'});assert.equal(result.data.ID,OTHER);assert.equal(result.notificationState,notificationState);assert.equal(h.storage.Comment_Log_Report.length,1);assert.equal(h.calls.filter(x=>x.method==='custom'&&/Post_Record_Comment/.test(x.config.api_name)).length,1);assert.equal(h.calls.filter(x=>x.method==='create').length,0);assert.equal(h.widget.PFTransport.snapshot().reviews.length,0);
}
{
 const h=await pfReady({invoke:config=>/Post_Record_Comment/.test(config.api_name)?Promise.reject(new Error('Lost reply')):undefined});
 await assert.rejects(h.widget.sdkAdd('Comment_Log',{Pro_Forma:PFID,Comment:'Do not replay'}));assert.equal(h.widget.PFTransport.snapshot().reviews.length,1);await assert.rejects(h.widget.sdkAdd('Comment_Log',{Pro_Forma:PFID,Comment:'Do not replay'}));assert.equal(h.calls.filter(x=>x.method==='custom'&&/Post_Record_Comment/.test(x.config.api_name)).length,1);
}
const componentContext={module:{exports:{}},Intl,Date};vm.runInNewContext(fs.readFileSync('widgets/proforma-manager/src/app/comments.js','utf8'),componentContext);const component=componentContext.module.exports.PFComments;
for(const parentField of ['Contract1','Budget','Project','Pro_Forma']){
 let calls=0;const response=await component.create({[parentField]:ID,Comment:'A comment'},async cfg=>{calls++;assert.equal(cfg.payload.parentField,parentField);assert.equal(cfg.payload.parentId,ID);return {code:3000,details:{output:JSON.stringify({ok:true,contract:'record-comments-v1',id:OTHER,parentField,parentId:ID,notificationState:'sent'})}};});assert.equal(response.data.ID,OTHER);assert.equal(calls,1);
}
await assert.rejects(component.create({Budget:ID,Comment:'x'},async()=>({code:3000,result:JSON.stringify({ok:false,contract:'record-comments-v1',writeState:'not-started',message:'Denied'})})),e=>e.definite&&e.code==='2894');
await assert.rejects(component.create({Budget:ID,Comment:'x'},async()=>({code:3000,result:JSON.stringify({ok:true,contract:'record-comments-v1',id:OTHER,parentField:'Project',parentId:ID})})),e=>e.noReplay);
console.log('Shared Custom API adapters, all four parent identities, single create/notification call and Pro Forma unknown-reply quarantine passed.');

{const h=await pfReady({invoke:config=>/Post_Record_Comment/.test(config.api_name)?{code:3000,result:JSON.stringify({ok:false,contract:'record-comments-v1',writeState:'not-started',message:'Permission denied'})}:undefined});for(let i=0;i<2;i++)await assert.rejects(h.widget.sdkAdd('Comment_Log',{Pro_Forma:PFID,Comment:'Rejected before writing'}),/Permission denied/);assert.equal(h.widget.PFTransport.snapshot().reviews.length,0);}

{let native=0;const fallback=async()=>{native++;return {code:3000,data:{ID:OTHER}};};assert.equal((await component.create({Budget:ID,Comment:'Old backend'},async()=>({code:9350}),fallback)).notificationState,'unavailable');assert.equal(native,1);await assert.rejects(component.create({Budget:ID,Comment:'Unknown'},async()=>{throw Error('Lost reply');},fallback));assert.equal(native,1,'unknown replies never fall back to a second create');}

for(const view of ['comments','list']){const h=await pfReady();const w=h.widget;w.S.deepLink={proformaId:PFID,recordView:view};w.S.deepLinkOpened='';w.S.proformaAssignedToMe=true;w.S.fTerritories=['hidden'];assert.equal(w.openDeepLinkProforma(),true);await drain();assert.equal(w.S.view,'vList');assert.equal(w.S.proformaAssignedToMe,false);assert.equal(w.S.fTerritories.length,0);assert.equal(h.document.getElementById('commentModal').classList.contains('show'),view==='comments');assert.equal(h.writes.length,0);}
const budgetHtml=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8');const a=budgetHtml.indexOf('function applyDeepLink()'),b=budgetHtml.indexOf('\n}',a)+2;
for(const field of ['Project','Budget'])for(const view of ['list','comments']){
 const calls=[],params={recordView:view,[field==='Project'?'projectId':'budgetId']:ID};const c=vm.createContext({S:{projects:[{key:'project-one',name:'Project',projectRecord:{ID},phases:[{ID}]}],budgets:[{ID}],projectFilter:['hidden'],territoryFilter:['hidden'],statusFilter:['hidden'],budgetAssignedToMe:true},Promise,readDeepLinkBudgetId:async()=>params.budgetId||'',readDeepLinkPage:async()=>'',readDeepLinkModificationId:async()=>'',readDeepLinkPurchaseOrderId:async()=>'',readDeepLinkParam:async k=>params[k]||'',budgetNavigationToken:()=>1,cleanVal:v=>String(v||''),$:()=>({value:''}),setActiveTab:v=>calls.push(v),showView:v=>calls.push(v),renderProjList(){},document:{querySelector:()=>({scrollIntoView(){}})},phaseName:()=> 'Phase',openBudgetComments:(f,p)=>calls.push({f,p}),auditLog(){},setMsg(){}});vm.runInContext(budgetHtml.slice(a,b),c);await c.applyDeepLink();assert.equal(c.S.budgetAssignedToMe,false);assert.equal(c.S.projectFilter.length,0);assert.ok(calls.includes('vBudgets'));assert.equal(calls.filter(x=>typeof x==='object').length,view==='comments'?1:0);if(view==='comments')assert.deepEqual(calls.at(-1),{f:field,p:ID});
}
console.log('Pro Forma list/comment links and both Budget/Project entry links preserve string identities and make no writes.');
