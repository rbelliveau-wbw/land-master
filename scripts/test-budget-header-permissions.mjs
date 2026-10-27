import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8');
function extract(name){const start=source.indexOf('function '+name+'('),brace=source.indexOf('{',start);assert.ok(start>=0,name);let depth=0;for(let i=brace;i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&!--depth)return source.slice(start,i+1);}throw Error(name);}
const S={globalMode:'edit',edPhaseIdx:null,myAccessId:'4410926000000000001',perms:{editAll:false,editOwned:true},items:{},edBudget:null};
const writes=[],handlers={};
const context=vm.createContext({S,CFG:{access:{budgetOwnerFields:['Budget_Owner']}},
  firstRaw:(obj,keys)=>keys.map(k=>obj[k]).find(v=>v!=null),
  budgetTrackIsLocked:(b,track)=>!!b[track+'Locked'],metricRaw:(b,f)=>Number(b[f]||0),
  fmt:n=>'$'+n,escAttr:String,parseMoney:Number,setMsg(){},
  document:{addEventListener:(name,fn)=>{handlers[name]=fn;}},
  queueBudgetSave:(id,field,val)=>writes.push({id,field,val}),renderSummaryMatrices(){},renderProjectRatesLite(){}
});
vm.runInContext(source.slice(source.indexOf('var BUDGET_METRICS ='),source.indexOf('function budgetMetricEditable('))+'\n'+['perms','budgetOwnerList','userOwnsBudget','canEditBudget','budgetMetricEditable','metricDisp','renderBudgetMetrics'].map(extract).join('\n'),context);
const handlerAt=source.indexOf('var inp = e.target.closest(".bmi");');
vm.runInContext(source.slice(source.lastIndexOf('document.addEventListener("change"',handlerAt),source.indexOf('document.addEventListener("focusin"',handlerAt)),context);
const budget={ID:'4410926000000000100',Budget_Owner:[{ID:S.myAccessId,display_value:'Budget Owner'}],Lot_Price:100000.25,Land_Cost:1500000.75,Lot_Total_Residential:20,Acres:10,Equiv_LF_of_Street:1000};
S.edBudget=budget;S.items[budget.ID]=[];
const protectedFields=['Lot_Price','Land_Cost'],quantities=['Lot_Total_Residential','Acres','Equiv_LF_of_Street'];
assert.equal(context.userOwnsBudget(budget),true,'Native multi-select User_Access lookup establishes ownership');
assert.equal(context.canEditBudget(budget),true,'Owner retains normal budget editing');
for(const field of protectedFields)assert.equal(context.budgetMetricEditable(budget,field),false,field+' requires Edit All even for an owner');
for(const field of quantities)assert.equal(context.budgetMetricEditable(budget,field),true,field+' retains owned-budget access');
let html=context.renderBudgetMetrics(budget);
for(const field of protectedFields){assert.doesNotMatch(html,new RegExp("data-bf='"+field+"'"));assert.match(html,new RegExp("data-budget-metric='"+field+"'.*?<div class='v'>"));}
function change(field,value){const input={dataset:{bf:field,kind:'money'},value:String(value),closest:()=>null};handlers.change({target:{closest:selector=>selector==='.bmi'?input:null}});}
for(const field of protectedFields){const previous=budget[field];change(field,42);assert.equal(budget[field],previous,'Denied stale input cannot mutate '+field);}
assert.equal(writes.length,0,'Denied header input never queues a save');
for(const flags of [{editAll:false,editOwned:false},{editAll:false,apprAll:true,send:true,editOwners:true},{}, {editAll:false,editOwned:true}]){S.perms=flags;for(const field of protectedFields)assert.equal(context.budgetMetricEditable(budget,field),false);}
S.perms={editAll:true,editOwned:false};
for(const field of protectedFields)assert.equal(context.budgetMetricEditable(budget,field),true,'Edit All permits '+field);
html=context.renderBudgetMetrics(budget);
for(const field of protectedFields)assert.match(html,new RegExp("data-bf='"+field+"'"));
change('Lot_Price',100000.375);assert.equal(writes.at(-1).val,100000.375,'Authorized save preserves fractional input');
budget.DevelopmentLocked=true;
for(const field of protectedFields)assert.equal(context.budgetMetricEditable(budget,field),false,'Development approval lock remains');
budget.DevelopmentLocked=false;budget.ConstructionLocked=true;
for(const field of protectedFields)assert.equal(context.budgetMetricEditable(budget,field),true,'Unrelated Construction lock does not broaden the rule');
for(const mode of ['view','approvals','attachments']){S.globalMode=mode;for(const field of protectedFields)assert.equal(context.budgetMetricEditable(budget,field),false);}
S.globalMode='edit';S.edPhaseIdx='all';
for(const field of protectedFields)assert.equal(context.budgetMetricEditable(budget,field),false,'All-phase metrics stay read-only');
console.log('Budget Lot Price / Land Cost permission, rendering, stale-input and approval-lock checks passed.');
