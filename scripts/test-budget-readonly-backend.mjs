// Execute the actual native function bodies with lookup-shaped, exact-ID fixtures.
// Native Creator compilation and signed-in API verification remain separate checks.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

const names=['createBudgetModification','submitBudgetModification','setProjectProforma','deleteBudgetAttachment','modificationAdmin','sendModificationEmail'];
const program=names.map(name=>{
  let source=fs.readFileSync(`creator/functions/${name}.dg`,'utf8');
  source=source.replace(/\{((?:"(?:\\.|[^"\\])*"\s*:[^{}\n]+))\}/g,(_,body)=>'delugeMap('+body.replace(/("(?:\\.|[^"\\])*")\s*:/g,'$1,')+')');
  source=source.replace(/insert into (\w+)\s*\[([^\]]+)\]/g,(_,form,fields)=>'insertRecord("'+form+'",delugeMap('+fields.trim().split('\n').map(line=>{const match=line.trim().match(/^(\w+)=(.*)$/);assert.ok(match,line);return JSON.stringify(match[1])+','+match[2];}).join(',')+'))');
  source=source.replace(/delete from (\w+)\[([^\]]+)\];/g,(_,form,criteria)=>'removeRecords("'+form+'",row=>'+criteria.replace(/\b([A-Za-z_]\w*)\s*(==|!=|>=|<=|>|<)/g,'row.$1 $2')+');');
  source=source.replace(/sendmail\s*\[[\s\S]*?\]/g,'captureMail();');
  return translate(source).js+`;thisapp.${name}=${name};`;
}).join('\n');
const id={actor:'90071992547409931',other:'90071992547409932',budget:'90071992547409941',foreignBudget:'90071992547409942',item:'90071992547409951',foreignItem:'90071992547409952',mod:'90071992547409961',foreignMod:'90071992547409962',attachment:'90071992547409971',project:'90071992547409981',foreignProject:'90071992547409982',sub:'90071992547409991',foreignSub:'90071992547409992',pf:'90071992547409801'};

function runtime({grant={},login='demo',owners=[id.actor],duplicate=false,modStatus='Draft',reference='',admin='publishing-admin',profile='',profileFailure=false,approvals=[]}={}){
  const initial={
    User_Access:[{ID:id.actor,User:'demo',...grant},{ID:id.other,User:'other',Edit_All_Budgets:true}],
    Add_Budget:[{ID:id.budget,Subdivision1:id.sub,Budget_Owner:owners},{ID:id.foreignBudget,Subdivision1:id.foreignSub,Budget_Owner:[id.other]}],
    Budget_Item:[{ID:id.item,Budget:id.budget,Budget_Category:'81'},{ID:id.foreignItem,Budget:id.foreignBudget,Budget_Category:'82'}],
    Budget_Modification:[{ID:id.mod,Budget:id.budget,Budget_Item:id.item,Amount:100,Status:modStatus,Reference_Number:reference},{ID:id.foreignMod,Budget:id.foreignBudget,Budget_Item:id.foreignItem,Amount:100,Status:'Draft',Reference_Number:''}],
    Attachment:[{ID:id.attachment,Budget:id.budget}],Project:[{ID:id.project,Proforma:null},{ID:id.foreignProject,Proforma:null}],
    Subdivision:[{ID:id.sub,Project:id.project},{ID:id.foreignSub,Project:id.foreignProject}],Add_Pro_Forma:[{ID:id.pf}],Budget_Approvals:approvals
  };
  if(duplicate)initial.User_Access.push({ID:'90071992547409933',User:'demo',Edit_All_Budgets:true});
  const c=vm.createContext({initial:structuredClone(initial),login,admin,profile,profileFailure});
  vm.runInContext(`
    var tables=JSON.parse(JSON.stringify(initial)),writes=[],policyCalls=[],emails=[],thisapp={};
    function map(value){Object.defineProperties(value,{get:{value:function(k){return this[k]??null;}},put:{value:function(k,v){this[k]=v;}}});return value;}
    function Map(){return map({});}function List(){return [];}function ifnull(value,fallback){return value==null?fallback:value;}
    function delugeMap(...pairs){var value={};for(var i=0;i<pairs.length;i+=2)value[pairs[i]]=pairs[i+1];return map(value);}
    Array.prototype.add=function(value){this.push(value);};Array.prototype.count=Array.prototype.size=function(){return this.length;};
    Object.prototype.toString=function(){return JSON.stringify(this,(_,value)=>typeof value==='bigint'?value.toString():value);};
    String.prototype.toLong=Number.prototype.toLong=function(){return BigInt(this);};BigInt.prototype.toLong=function(){return this.valueOf();};String.prototype.toDecimal=function(){return Number(this);};String.prototype.toDate=function(){return String(this);};
    var zoho={loginuser:login,adminuser:admin,currentdate:'2026-10-26',currenttime:'2026-10-26T12:00:00'};
    thisapp.permissions={profileForUser(){if(profileFailure)throw Error('Profile lookup failed');return profile;}};
    var lookups={Budget:'Add_Budget',Budget_Item:'Budget_Item',Budget_Category:'Budget_Category',Subdivision1:'Subdivision',Project:'Project'};
    function lookup(form,id){var row=(tables[form]||[]).find(row=>row.ID==id)||{ID:String(id)};return new Proxy(row,{get(o,k){if(k==='valueOf')return ()=>BigInt(o.ID);if(k==='toString')return ()=>String(o.ID);return o[k]??null;}});}
    function record(form,row){return new Proxy(row,{get(o,k){if(k==='Budget_Owner'&&o[k]!=null)return o[k].map(owner=>lookup('User_Access',typeof owner==='object'?owner.ID:owner));if(k in lookups&&o[k]!=null)return lookup(lookups[k],o[k]);return o[k]??null;},set(o,k,v){writes.push({form,id:o.ID,field:k});o[k]=typeof v==='bigint'?v.toString():v;return true;}});}
    function query(form,predicate,sort){var rows=(tables[form]||[]).map(row=>record(form,row)).filter(predicate);if(sort)rows.sort((a,b)=>a[sort]>b[sort]?1:a[sort]<b[sort]?-1:0);return new Proxy(rows,{get(a,k){return k in a||typeof k==='symbol'?a[k]:a[0]?.[k]??null;},set(a,k,v){if(!a.length)throw Error('Missing record');a[0][k]=v;return true;}});}
    function insertRecord(form,data){throw Error('Unexpected insertion in permission preflight fixture');}
    function removeRecords(form,predicate){tables[form]=tables[form].filter(row=>!predicate(record(form,row)));writes.push({form,remove:true});}
    thisapp.poCurrencyString=function(value){return value;};
    thisapp.resolveApprovalRoute=function(context){policyCalls.push('preview');return delugeMap('success',false,'error','Fixture route unavailable');};
    thisapp.applySharedApprovalPolicy=function(context){policyCalls.push('apply');return delugeMap('success',false,'error','Fixture route unavailable');};
    thisapp.sendModificationEmail=function(){emails.push('unexpected');throw Error('No email in preflight fixture');};
    thisapp.recalcItemRevisedFinal=thisapp.recalcBudgetModifiedTotals=function(){policyCalls.push('recalc');return 'OK';};
    function captureMail(){emails.push('captured native mail');}
  `+program,c);
  const call=(name,args)=>vm.runInContext(`thisapp.${name}(${args.map(value=>JSON.stringify(value)).join(',')})`,c);
  return {c,call,create:(item=id.item)=>call('createBudgetModification',[item,'Increase','100.00','Permission fixture','','2026-10-26','Construction']),submit:(mod=id.mod)=>call('submitBudgetModification',[mod]),associate:(project=id.project,pf=id.pf)=>JSON.parse(call('setProjectProforma',[project,pf])),remove:(budget=id.budget)=>call('deleteBudgetAttachment',[budget,id.attachment]),admin:(action,reference='')=>call('modificationAdmin',[action,id.mod,id.budget,'','','',reference,'']),send:(action='created')=>call('sendModificationEmail',[id.mod,action]),snapshot:()=>JSON.parse(JSON.stringify(c.tables))};
}

for(const setup of [{},{grant:{Create_Purchase_Orders:true}},{grant:{Edit_Delete_All_Modifications:true}},{login:'unknown'},{grant:{Edit_All_Budgets:true},duplicate:true}]){
  const h=runtime(setup),before=h.snapshot();
  assert.match(h.create(),/^ERROR: Budget edit access/);
  assert.match(h.submit(),/^ERROR: Budget edit access/);
  assert.equal(h.associate().ok,false);
  assert.match(h.remove(),/^ERROR: Budget attachment edit access/);
  assert.match(h.admin('reopen'),/^ERROR:/);assert.match(h.admin('repair'),/^ERROR:/);assert.match(h.admin('repair-send'),/^ERROR:/);assert.match(h.admin('repair-reject','301'),/^ERROR:/);
  assert.match(h.send(),/^ERROR:/);assert.match(h.send('approved'),/^ERROR:/);assert.match(h.send('rejected'),/^ERROR:/);
  assert.deepEqual(h.snapshot(),before,'Denied functions cannot mutate data or emit emails');
  assert.equal(h.c.policyCalls.length,0);assert.equal(h.c.emails.length,0);assert.equal(h.c.writes.length,0);
}
for(const grant of [{Edit_All_Budgets:true},{Edit_Owned_Budgets:true}]){
  const h=runtime({grant});
  assert.match(h.create(),/^ERROR: Approval routing unavailable/,'Authorized editor reaches unchanged routing preflight');
  assert.match(h.submit(),/^ERROR: Approval template could not be loaded/);
  assert.equal(h.associate().ok,true);assert.equal(h.snapshot().Project[0].Proforma,id.pf);
  assert.equal(h.associate(id.project,'').ok,true);assert.equal(h.snapshot().Project[0].Proforma,null);
  assert.match(h.remove(),/Attachment deleted/);assert.equal(h.snapshot().Attachment.length,0);
}
for(const owners of [[id.other],[],null]){
  const h=runtime({grant:{Edit_Owned_Budgets:true},owners});
  assert.match(h.create(),/^ERROR: Budget edit access/);assert.match(h.submit(),/^ERROR: Budget edit access/);
  assert.equal(h.associate().ok,false);assert.match(h.remove(),/^ERROR: Budget attachment edit access/);assert.equal(h.c.writes.length,0);
}
let h=runtime({grant:{Edit_Owned_Budgets:true}});
assert.match(h.create(id.foreignItem),/^ERROR: Budget edit access/);assert.match(h.submit(id.foreignMod),/^ERROR: Budget edit access/);
assert.equal(h.associate(id.foreignProject).ok,false,'An owned Budget in another Project grants no association rights');assert.equal(h.c.writes.length,0);
for(const grant of [{Edit_All_Approvals:true},{Edit_Owned_Approvals:true}]){
  h=runtime({grant});assert.match(h.create(),/^ERROR: Budget edit access/);assert.match(h.submit(),/^ERROR: Budget edit access/);assert.equal(h.associate().ok,false);
  assert.match(h.remove(),/Attachment deleted/,'Existing approver attachment rights remain');
}
h=runtime({grant:{Edit_Owned_Approvals:true},owners:[id.other]});assert.match(h.remove(),/^ERROR:/);assert.equal(h.c.writes.length,0);
h=runtime({grant:{Edit_All_Budgets:true}});assert.match(h.remove(id.foreignBudget),/not found/);assert.equal(h.c.writes.length,0,'Attachment parent mismatch never deletes');
h=runtime({login:'publishing-admin'});assert.match(h.submit(),/^ERROR: Approval template could not be loaded/,'Authenticated admin can retain approvalWatchdog repair execution');assert.deepEqual(Array.from(h.c.policyCalls),['apply']);
h=runtime({grant:{Edit_All_Budgets:true},reference:'PO:fixture'});assert.match(h.submit(),/approved with its Purchase Order/);assert.equal(h.c.policyCalls.length,0);

const approval=(Status='Pending',Approver='demo-route@example.test')=>({ID:'301',Budget:id.budget,Budget_Modification:id.mod,Type1:'Modification',Status,Approver,Sort_Order:1,Title:'CFO',Sent_Date:null,Responded_Date:null,Approval_Notes:''});
for(const setup of [{profile:'Construction Budgeting',grant:{Create_Purchase_Orders:true,Edit_All_Budgets:true,Edit_All_Approvals:true,Approver_Email:'demo-route@example.test'}},{profileFailure:true,grant:{Edit_All_Budgets:true,Edit_All_Approvals:true}}]){
  h=runtime({...setup,modStatus:'Submitted',approvals:[approval('Rejected')]});const before=h.snapshot();
  assert.match(h.create(),/^ERROR:/);assert.match(h.submit(),/^ERROR:/);assert.equal(h.associate().ok,false);assert.match(h.remove(),/^ERROR:/);
  for(const action of ['reopen','repair','repair-send','repair-reject'])assert.match(h.admin(action,'301'),/^ERROR:/);
  for(const action of ['created','approved','rejected'])assert.match(h.send(action),/^ERROR:/);
  assert.deepEqual(h.snapshot(),before);assert.equal(h.c.writes.length,0);assert.equal(h.c.emails.length,0);
}
for(const grant of [{Edit_All_Budgets:true},{Edit_Owned_Budgets:true}]){
  h=runtime({grant,modStatus:'Rejected',approvals:[approval('Rejected')]});assert.match(h.admin('reopen'),/^OK:/);assert.equal(h.snapshot().Budget_Modification[0].Status,'Draft');assert.equal(h.snapshot().Budget_Approvals.length,0);
}
h=runtime({grant:{Edit_All_Approvals:true},modStatus:'Rejected',approvals:[approval('Rejected')]});assert.match(h.admin('reopen'),/^ERROR: Budget edit access/);assert.equal(h.c.writes.length,0,'Approval administration does not grant revision of a rejected request');
for(const [action,status] of [['created','Pending'],['approved','Approved'],['rejected','Rejected']]){
  h=runtime({grant:{Approver_Email:'demo-route@example.test'},modStatus:'Submitted',approvals:[approval(status)]});assert.doesNotMatch(h.send(action),/^ERROR:/,'Recorded unrelated approver retains their own authenticated decision/email path without global flags');assert.ok(h.c.writes.length>0);
}
h=runtime({grant:{Approver_Email:'demo-route@example.test'},modStatus:'Submitted',approvals:[approval('Pending')]});const repairedMail=h.admin('repair-send');assert.doesNotMatch(repairedMail,/^ERROR:/);assert.equal(h.c.emails.length,1,'The current recorded approver can repair its own pending delivery: '+repairedMail);
h=runtime({grant:{Approver_Email:'demo-route@example.test'},modStatus:'Submitted',approvals:[approval('Rejected')]});assert.doesNotMatch(h.admin('repair-reject','301'),/^ERROR:/);assert.equal(h.snapshot().Budget_Modification[0].Status,'Rejected');
for(const setup of [{grant:{Approver_Email:'different@example.test'}},{grant:{Approver_Email:'demo-route@example.test'},approvals:[approval('Not Sent')]},{grant:{Approver_Email:''},approvals:[approval('Pending','')]},{login:'',approvals:[approval('Pending','')]},{login:'demo-route',approvals:[approval()]}]){
  h=runtime({modStatus:'Submitted',approvals:[approval()],...setup});assert.match(h.send(),/^ERROR:/);assert.equal(h.c.writes.length,0);assert.equal(h.c.emails.length,0);
}
h=runtime({grant:{Approver_Email:'demo-route@example.test'},modStatus:'Submitted',approvals:[approval('Rejected')]});assert.match(h.admin('repair-reject','302'),/^ERROR:/);assert.equal(h.c.writes.length,0,'An approver cannot reconcile another approval row');
h=runtime({login:'demo-route@example.test',modStatus:'Submitted',approvals:[approval()]});assert.doesNotMatch(h.send(),/^ERROR:/,'Exact authenticated email retains recorded-approver access without a User Access row');
h=runtime({login:'publishing-admin',profileFailure:true,modStatus:'Submitted',approvals:[approval()]});assert.doesNotMatch(h.send(),/^ERROR:/);assert.equal(h.c.emails.length,1,'Only the actual authenticated publishing admin retains scheduled mail despite profile lookup failure');
console.log('PASS: six actual native mutation bodies deny PO-only/read-only/missing/duplicate actors and Construction override; exact lookup IDs and own/foreign scope; editor/approver and watchdog preservation; exact recorded-approver email, action/status and row; zero-write and zero-mail denials.');
