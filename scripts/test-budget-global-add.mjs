import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8');
const start=source.indexOf('var globalBudgetAdd = null;');
const end=source.indexOf('$("budgetCreateClose").addEventListener',start);
const elements=new Map();
const el=id=>{if(!elements.has(id))elements.set(id,{id,hidden:false,disabled:false,value:'',textContent:'',innerHTML:'',isConnected:true,inert:false,tagName:'DIV',classList:{add(){},remove(){}},focus(){},setAttribute(){}});return elements.get(id);};
const calls=[];
let permissions={editOwned:true},scope='dev',token=0,loadResolve,apiResolve;
const context={
  $,window:{matchMedia:()=>({matches:true})},document:{body:{children:[el('main'),el('budgetCreateOverlay')]}},
  S:{sdkInitFailed:false,budgets:[]},approvalProgress:null,Promise,setTimeout,clearTimeout,
  perms:()=>permissions,cleanVal:v=>String(v??'').trim(),getSubdivisionRecord:b=>b.Subdivision1,
  lookupId:v=>String(v?.ID||v||''),subdivisionCode:b=>String(b.Subdivision_Code||''),
  esc:v=>String(v),escAttr:v=>String(v),shortErr:e=>e.message,budgetArchived:b=>!!b.Archived,
  budgetCreateScope:()=>scope,sdkGetAllRecords:(report)=>Promise.resolve(report==='subs'?context.subdivisions:context.budgets),
  CFG:{reports:{subdivisions:'subs',budgets:'budgets'}},toastShow:m=>calls.push(['toast',m]),
  phaseName:b=>b.Phase,projectName:b=>b.Project,canSubmitMod:b=>b.canEdit,
  budgetNavigationToken:()=>token,budgetNavigationCurrent:(t,v,id)=>t===token,
  openPhaseEditor:(id,mode)=>{calls.push(['editor',id,mode]);token++;return new Promise(resolve=>{loadResolve=resolve;});},
  budgetDetailReady:()=>true,budgetModsReady:()=>true,
  openModModal:(id,mode)=>calls.push(['mod',id,mode]),openCheckWireRequest:t=>calls.push(['request',t]),
  sdkRunBudgetFunction:(name,args)=>{calls.push(['api',name,args]);return new Promise(resolve=>{apiResolve=resolve;});},
  unwrapBudgetManageResponse:r=>r,refreshBudgetWorkflowState:async id=>calls.push(['refresh',id])
};
function $(id){return el(id);}
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const a='900000000000000001',b='900000000000000002',c='900000000000000003';
context.subdivisions=[{ID:a,Subdivision_Code:'A',Subdivision_Name:'Existing'},{ID:b,Subdivision_Code:'B',Subdivision_Name:'Archived'},{ID:c,Subdivision_Code:'C',Subdivision_Name:'New'}];
context.budgets=[{ID:'800000000000000001',Subdivision1:{ID:a}},{ID:'800000000000000002',Subdivision_Code:'B',Archived:true}];
context.openGlobalBudgetAdd('budget');await settle();
assert.deepEqual(Array.from(context.globalBudgetAdd.rows,r=>r.id),[c],'existing and archived budgets exclude their subdivision, without rounding IDs');
context.selectGlobalBudgetParent(c);context.runGlobalBudgetCreate();context.runGlobalBudgetCreate();
assert.equal(calls.filter(c=>c[0]==='api').length,1,'duplicate commit is blocked');
context.closeGlobalBudgetAdd();assert.ok(context.globalBudgetAdd,'busy writes cannot dismiss');
apiResolve({success:true,verified:false,subdivisionId:c,budgetId:'700000000000000001'});await settle();await settle();
assert.match(el('budgetCreateStatus').textContent,/could not be verified/);
context.runGlobalBudgetCreate();assert.equal(calls.at(-1)[2].action,'check','unverified success allows only a read-only recheck');
apiResolve({success:true,verified:true,subdivisionId:c,budgetId:'700000000000000001',categoryCount:3,itemCount:20,approvalCount:6});
await new Promise(resolve=>setTimeout(resolve,20));
assert.equal(el('budgetCreateBar').value,3);assert.match(el('budgetCreateStatus').textContent,/20 items/);
context.closeGlobalBudgetAdd();assert.equal(el('main').inert,false);
for(const malformed of [{budgetId:700000000000000001},{approvalCount:5},{categoryCount:undefined}]){
  context.openGlobalBudgetAdd('budget');await settle();context.selectGlobalBudgetParent(c);context.runGlobalBudgetCreate();
  apiResolve({...{success:true,verified:true,subdivisionId:c,budgetId:'700000000000000001',categoryCount:3,itemCount:20,approvalCount:6},...malformed});
  await settle();await settle();assert.equal(el('budgetCreateConfirm').textContent,'Check Saved Records','rounded IDs or incomplete record counts cannot pass verification');context.closeGlobalBudgetAdd();
}
permissions={};context.openGlobalBudgetAdd('budget');assert.equal(context.globalBudgetAdd,null,'read-only users cannot create');
permissions={editAll:true};context.S.budgets=[{ID:a,Phase:'Phase 01',Project:'Project',canEdit:true},{ID:b,Phase:'Phase 02',Project:'Project',Archived:true}];
context.openGlobalBudgetAdd('purchase-order');await settle();assert.equal(context.globalBudgetAdd.rows.length,1);
context.selectGlobalBudgetParent(a);assert.deepEqual(calls.at(-1),['editor',a,'modifications']);
loadResolve();await settle();assert.deepEqual(calls.at(-1),['request','Purchase Order'],'global PO enters the existing request composer after loading the selected budget');
context.openGlobalBudgetAdd('wire');await settle();context.selectGlobalBudgetParent(a);token++;loadResolve();await settle();
assert.notEqual(calls.at(-1)[0],'request','a stale budget detail reply cannot open the request on another budget');
context.openGlobalBudgetAdd('budget');context.closeGlobalBudgetAdd();await settle();assert.equal(context.globalBudgetAdd,null,'dismissed picker replies stay dismissed');
const backend=fs.readFileSync('creator/functions/createBudgetFromSubdivision.dg','utf8');
assert.match(backend,/User_Access\[User == zoho\.loginuser\]/);
assert.match(backend,/Edit_All_Budgets != true && accessRow\.Edit_Owned_Budgets != true/);
assert.match(backend,/newBudgetRec\.Budget_Owner=owners/);
assert.doesNotMatch(backend,/Budget_Approvals\[ID != 0\]/,'creation does not mutate other budgets');
assert.match(backend,/actionText == "create" && existingBudgets\.count\(\) > 0/);
assert.match(backend,/\n\treturn result\.toString\(\);\n}\s*$/);
assert.ok(source.includes('data-request-kind=\'purchase-order\''));
console.log('Global Budget Add: parent filtering, exact IDs, permissions, busy guard, verification/recheck, request reuse and stale navigation passed.');
