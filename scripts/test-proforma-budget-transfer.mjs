import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fixture} from './fixtures/proforma-budget-transfer.mjs';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';
const folder='widgets/proforma-manager/src/app/';
const jsContext=vm.createContext({});
vm.runInContext(fs.readFileSync(folder+'budget-transfer-model.js','utf8'),jsContext);
const build=jsContext.PFBudgetTransfer.build;
const deluge=translate(fs.readFileSync('creator/functions/PF_Budget_Transfer_Plan.dg','utf8'));
const runtime=vm.createContext({});
vm.runInContext(`
function ifnull(v,f){return v==null?f:v;}
function choose(c,a,b){return c?a:b;}
function List(){return [];}
function Map(){return hydrate({});}
function hydrate(o){if(Array.isArray(o))return o.map(hydrate);if(o&&typeof o==='object'){for(const k of Object.keys(o))o[k]=hydrate(o[k]);Object.defineProperties(o,{get:{value:function(k){return this[k]??null;}},put:{value:function(k,v){this[k]=v;}},size:{value:function(){return Object.keys(this).length;}},keys:{value:function(){return Object.keys(this);}}});}return o;}
Array.prototype.add=function(v){this.push(v);};Array.prototype.get=function(i){return this[i]??null;};Array.prototype.size=function(){return this.length;};Array.prototype.contains=function(v){return this.includes(v);};
String.prototype.contains=function(v){return this.includes(v);};String.prototype.toLong=String.prototype.toDecimal=function(){return Number(this);};Number.prototype.toLong=function(){return Math.trunc(this);};Number.prototype.toDecimal=function(){return Number(this);};Number.prototype.round=function(n){return Math.round((Number(this)+Number.EPSILON)*10**n)/10**n;};Number.prototype.abs=function(){return Math.abs(this);};Number.prototype.floor=function(){return Math.floor(this);};
String.prototype.isNumber=function(){return /^(?:-?\\d+(?:\\.\\d+)?|-?\\.\\d+)$/.test(this);};
var thisapp={forLoop:(start,end)=>Array.from({length:Math.max(0,end-start+1)},()=> 'x')};
${deluge.js}
`,runtime);
const mapping={1:'s1',2:'s2',3:'s3',4:'s4'};
function run(c,map=mapping){
 const local=JSON.parse(JSON.stringify(build(c,map)));
 runtime.fixtureJSON=JSON.stringify(c);runtime.mappingJSON=JSON.stringify(map);
 const server=JSON.parse(vm.runInContext('JSON.stringify(PF_Budget_Transfer_Plan(hydrate(JSON.parse(fixtureJSON)),hydrate(JSON.parse(mappingJSON))))',runtime));
 assert.equal(server.canSend,local.canSend,'Creator and widget eligibility must agree');
 assert.equal(server.total,local.total,'Creator and widget totals must agree');
 assert.deepEqual(server.phases.map(p=>({header:p.header,total:p.total,writes:p.writes})),local.phases.map(p=>({header:p.header,total:p.total,writes:p.writes})),'Creator and widget persisted values must agree');
 assert.equal(server.outliers.length,local.outliers.length);
 return local;
}
const blankStatuses=fixture();blankStatuses.budgets.forEach(b=>{b.Development_Budget_Approval_Status="";b.Const_Budget_Approval_Status="";});blankStatuses.approvals.push({Budget:"b1",Status:""});blankStatuses.modifications.push({Budget:"b1",Amount:0,Status:""});assert.equal(run(blankStatuses).canSend,true);
let plan=run(fixture());assert.equal(plan.canSend,true);
assert.deepEqual(plan.phases.map(p=>p.header.Lot_Total_Residential),[50,46,44,46]);
assert.equal(plan.phases[0].header.Acres,8.88);assert.equal(plan.phases[0].header.Equiv_LF_of_Street,1468);assert.equal(plan.phases[0].header.Lot_Price,62500);assert.equal(plan.phases[0].header.Land_Cost,22000);
assert.equal(plan.phases[0].lines[0].amount,46500);assert.equal(plan.phases[0].lines[1].amount,367000);
assert.equal(plan.phases[0].lines.find(l=>l.unit==='Lot').rate,25.5);assert.equal(plan.phases[0].lines.find(l=>l.unit==='Lot').amount,1275);
assert.equal(plan.phases[2].lines.find(l=>l.code==='3400').amount,400);assert.equal(plan.phases[0].lines.some(l=>l.code==='3400'),false);
assert.equal(plan.phases[2].writes.find(w=>w.itemId==='i33400').notes,'Existing note\n\nAmenity agreement');
assert.equal(plan.outliers[0].notes,'Keep outlier note');assert.match(plan.outliers[0].reason,/Specific Months/);
assert.equal(plan.phases[0].lines.filter(l=>l.code.startsWith('8')).reduce((sum,l)=>sum+l.amount,0),-900);
for(const mutate of [c=>c.pf.Phases=4.5,c=>c.phases[0].Phase=1.5,c=>c.subdivisions.pop(),c=>c.phases[0].Total_Lots=49,c=>c.budgets.pop(),c=>c.budgets[0]._canEdit=false,c=>c.budgets[0].Lock_Prelim_Budget=true,c=>c.budgets[0].Const_Budget_Approval_Status='Approved',c=>c.budgetItems[0].PROJ_Actual=1,c=>c.budgetItems[0].Prelim_Budget_Ttl=1,c=>c.budgetItems[0].Per_Unit=1,c=>c.categories[0].Lock_Category=true,c=>c.approvals.push({Budget:'b1',Status:'Pending'}),c=>c.modifications.push({Budget:'b1',Status:'Approved',Amount:0}),c=>c.budgetItems=c.budgetItems.filter(i=>i.Cost_Code!==2101)]){const c=fixture();mutate(c);assert.equal(run(c).canSend,false);}
assert.equal(run(fixture(),{...mapping,2:'s1'}).canSend,false);
const collision=fixture();collision.items.push({...collision.items[1],ID:'other',Description:'Second permit rate'});assert.ok(run(collision).outliers.some(o=>/share this Budget line/.test(o.reason)));
const missing=fixture();missing.budgetItems=missing.budgetItems.filter(i=>i.Cost_Code!==3400);assert.ok(run(missing).outliers.some(o=>/missing/.test(o.reason)));
for(const unit of ['Acre','LF']){const c=fixture();c.items[1].Unit=unit;const r=run(c);assert.equal(r.phases[0].lines.find(l=>l.unit===unit).amount,Math.round(25.5*(unit==='Acre'?8.88:1468)*100)/100);}
const edited=fixture();edited.headerOverrides={1:{Lot_Total_Residential:'60',Acres:'12.34',Equiv_LF_of_Street:'1600.25',Lot_Price:'65500.50',Land_Cost:'23000.75'},2:{Lot_Total_Residential:'40'}};
const savedBefore=JSON.stringify(edited),editPlan=run(edited);
assert.equal(editPlan.canSend,true);
assert.deepEqual(editPlan.phases[0].header,{Lot_Total_Residential:60,Acres:12.34,Equiv_LF_of_Street:1600.25,Lot_Price:65500.5,Land_Cost:23000.75});
assert.equal(editPlan.phases[0].lines.find(l=>l.unit==='Lot').amount,1530,'destination Lots recalculate per-unit rows');
assert.equal(editPlan.phases[1].lines.find(l=>l.unit==='Lot').amount,1020,'phase edits stay isolated');
assert.equal(editPlan.phases[2].header.Lot_Total_Residential,44);
assert.equal(editPlan.phases[0].lines.find(l=>l.code==='2101').amount,46500,'allocated PF base costs stay unchanged');
assert.equal(JSON.stringify(edited),savedBefore,'destination edits must not alter saved PF or source records');
for(const unit of ['Acre','LF']){const c=fixture();c.items[1].Unit=unit;c.headerOverrides=edited.headerOverrides;const r=run(c);assert.equal(r.phases[0].lines.find(l=>l.unit===unit).amount,Math.round(25.5*(unit==='Acre'?12.34:1600.25)*100)/100);}
for(const override of [{1:{Lot_Total_Residential:'50.5'}},{1:{Acres:'-1'}},{1:{Acres:''}},{1:{Land_Cost:'1.001'}},{1:{Lot_Price:'NaN'}},{1:{Budget_Grand_Total:'100'}},{5:{Acres:'10'}},{'1.0':{Acres:'10'}}]){const c=fixture();c.headerOverrides=override;assert.equal(run(c).canSend,false,'invalid/unknown destination overrides block writes');}
const ui=fs.readFileSync(folder+'budget-transfer-ui.js','utf8');new vm.Script(ui);assert.match(ui,/data-phase-tab/);assert.match(ui,/plan.phases.filter/);assert.match(ui,/e.stopPropagation/);
assert.match(ui,/!s\.api\.canSend\(\)/);assert.match(ui,/!api\.canSend\(\)/);
const widget=fs.readFileSync(folder+'widget.html','utf8');assert.match(widget,/Send Costs to Budgets/);assert.match(widget,/function budgetTransferCall/);assert.ok(!widget.slice(widget.indexOf('function budgetTransferCall'),widget.indexOf('function openBudgetTransfer')).includes('invokeSaveApiOp'));
const accessCode=widget.slice(widget.indexOf('function accessTruthy('),widget.indexOf('function perms(){'));
const accessContext={S:{currentUser:'test-user',view:'vList'},document:{getElementById:()=>null},auditLog:()=>{},syncApprovalAccessVisibility:()=>{},syncSubmitLegalButton:()=>{},syncAiReviewRailBtn:()=>{}};
vm.createContext(accessContext);vm.runInContext(accessCode,accessContext);
for(const [flags,allowed] of [[{},false],[{pfSendCostsToBudgets:false},false],[{pfSendCostsToBudgets:true},true],[{Send_Costs_to_Budgets:true},true]]){
  accessContext.applyPermsFromFlags(flags,'test');assert.equal(accessContext.S.perms.sendCostsToBudgets,allowed);
}
assert.match(widget,/perms\(\)\.sendCostsToBudgets\?'<button type="button" class="pf-row-menu-item" data-act="budget-transfer"/);
assert.match(widget,/if\(!perms\(\)\.sendCostsToBudgets\)\{toast\("Send Costs to Budgets access is required\./);
assert.match(widget,/pfSendCostsToBudgets != null \? flags\.pfSendCostsToBudgets : flags\.Send_Costs_to_Budgets/);
assert.match(widget.slice(widget.indexOf('function budgetTransferCall'),widget.indexOf('function openBudgetTransfer')),/var name="PF_Budget_Transfer"/);
const accessFn=fs.readFileSync('creator/functions/getUserAccess.dg','utf8');assert.match(accessFn,/pfSendCostsToBudgets = row\.Send_Costs_to_Budgets == true/);assert.match(accessFn,/result\.put\("pfSendCostsToBudgets",pfSendCostsToBudgets\)/);
const transferFn=fs.readFileSync('creator/functions/PF_Budget_Transfer.dg','utf8');assert.match(transferFn,/actor\.count\(\) != 1 \|\| actor\.Send_Costs_to_Budgets != true/);assert.ok(transferFn.indexOf('actor.Send_Costs_to_Budgets')<transferFn.indexOf('pf = Add_Pro_Forma'));
assert.match(transferFn,/budgetTransferVersion",if\(data\.get\("budgetTransferClientVersion"\) == 2,2,1\)/);
assert.match(widget,/budgetTransferClientVersion:2/);
assert.ok(transferFn.indexOf('ctx.put("headerOverrides"')<transferFn.indexOf('signature = zoho.encryption.sha256'),'preview token covers edited destination metrics');
assert.ok(!fs.readFileSync('creator/functions/proforma_save.dg','utf8').includes('PF_Budget_Transfer'));
console.log('Pro Forma Budget transfer: allocation, notes, phase lots, per-unit, credits, exclusions, locks, emptiness, and Creator/widget parity passed.');
