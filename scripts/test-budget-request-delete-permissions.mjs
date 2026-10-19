import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

const html=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
function sourceOf(name){const start=html.indexOf('function '+name+'('),line=html.indexOf('\n',start);assert.ok(start>=0,name);return html.slice(start,html.slice(start,line).trimEnd().endsWith('}')?line:html.indexOf('\n}',start)+2);}
let grants={};const b={ID:'90071992547409931'},mod={ID:'90071992547409932',Budget:{ID:b.ID},Status:'Submitted'};
const c=vm.createContext({S:{myAccessId:'90071992547409935'},perms:()=>grants,userOwnsBudget:()=>true,lookupMatchesId:(v,id)=>v?.ID===id,firstRaw:(r,keys)=>keys.map(k=>r?.[k]).find(v=>v!=null),cleanVal:v=>String(v??'').trim(),modWithInfo:()=>({pendingRow:{ID:'90071992547409933'},waitingOnMe:false})});
for(const fn of ['canAdminMods','canDeleteBudgetRequest','canEditBudget','canUseModificationTool'])vm.runInContext(sourceOf(fn),c);
for(const ordinary of [{editOwned:true},{modAdmin:true},{apprAll:true},{deleteArchive:true},{editOwned:true,modAdmin:true,apprAll:true,deleteArchive:true}]){
  grants={editAll:false,...ordinary};assert.equal(c.canDeleteBudgetRequest(b),false);assert.equal(c.canAdminMods(),false);assert.equal(c.canUseModificationTool(mod,b,'delete'),false);
  if(ordinary.editOwned)assert.equal(c.canEditBudget(b),true,'Owned Budget editing remains available without deletion');
}
grants={editAll:true,modAdmin:false};assert.equal(c.canDeleteBudgetRequest(b),true);assert.equal(c.canAdminMods(),true);assert.equal(c.canUseModificationTool(mod,b,'delete'),true);
c.S.myAccessId='';assert.equal(c.canDeleteBudgetRequest(b),false,'A portal display override cannot invent an authenticated access identity');assert.equal(c.canAdminMods(),false);c.S.myAccessId='90071992547409935';
assert.equal(c.canUseModificationTool({...mod,Budget:{ID:'other'}},b,'delete'),false);assert.equal(c.canUseModificationTool({...mod,Reference_Number:'PO:90071992547409934:rev'},b,'delete'),false);

// Execute the actual native guards before their business-record mutation bodies.
const native=fs.readFileSync('creator/functions/modificationAdmin.dg','utf8');
const prefix=native.slice(0,native.indexOf('\tcombinedMod ='))+'\n return "ALLOW";\n}';
const program=translate(prefix).js;
for(const rows of [[],[{User:'actor',Edit_Owned_Budgets:true,Edit_Delete_All_Modifications:true}],[{User:'actor',Edit_All_Budgets:true}],[{User:'actor',Edit_All_Budgets:true},{User:'actor',Edit_All_Budgets:true}]]){
  const context=vm.createContext({rows});vm.runInContext(`var zoho={loginuser:'actor'};function ifnull(v,f){return v??f;}function query(form,predicate){const matches=rows.filter(predicate);return new Proxy(matches,{get(target,key){if(key==='count')return ()=>target.length;return target[key]??target[0]?.[key]??null;}});}${program}`,context);
  for(const action of ['update','delete']){context.action=action;const result=vm.runInContext('modificationAdmin(action,1,2,"","","","","")',context);assert.equal(result==='ALLOW',rows.length===1&&rows[0].Edit_All_Budgets===true,'Native admin requires one authenticated global Budget grant');}
}
const po=fs.readFileSync('creator/functions/managePurchaseOrder.dg','utf8');
const deleteStart=po.indexOf('if(action == "PreviewDelete" || action == "Delete" || action == "CheckDelete")');
assert.ok(deleteStart>=0);const guard=po.slice(deleteStart).match(/if\(access\.Edit_All_Budgets[^\n]+/)[0];
const poGuard=translate('string poDeleteGuard(){result=Map();'+guard+'\n return "ALLOW";\n}').js;
for(const [global,owned,archived] of [[false,true,false],[false,false,false],[true,false,false],[true,true,true]]){
  const context=vm.createContext({access:{Edit_All_Budgets:global,Edit_Owned_Budgets:owned},budget:{Archived:archived}});vm.runInContext('function Map(){return {put(k,v){this[k]=v;},toString(){return JSON.stringify(this);}};}'+poGuard,context);assert.equal(vm.runInContext('poDeleteGuard()',context)==='ALLOW',global&&!archived);
}
console.log('PASS: retired/owned/approval/archive flags cannot delete requests; exact global grant controls modification tools and PO deletion, native cardinality/actor guards and owned editing remain enforced.');
