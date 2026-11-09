import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const c=vm.createContext({});
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-reallocation.js','utf8'),c);
const R=c.LMPOReallocation,ID='90071992547409931',OTHER='90071992547409932',CONTRACT='po-reallocation-v1';
const copy=value=>JSON.parse(JSON.stringify(value));
const zeros=()=>({'1':'0.00','2':'0.00','3':'0.00','4':'0.00','5':'0.00'});
const line=(amount='33000.00',element='4',id=ID)=>({budgetItemId:id,costElement:element,finalAmount:amount});
function native(id=ID,values=['2000000','0','0','1400000','0']){
  const row={budgetItemId:id,reallocationContract:CONTRACT,componentBaselineAvailable:true,issuedComponentsAllocated:true,unallocatedIssuedCents:'0',unallocatedModificationCents:'0',unallocatedModificationCount:0,componentBalances:values.map((value,index)=>({costElement:String(index+1),finalCents:value,modCents:'0',issuedCents:'0',availableCents:value,pendingModificationCents:'0',pendingReductionCents:'0'}))};
  return rollup(row);
}
function rollup(row){for(const field of ['finalCents','modCents','issuedCents','availableCents','pendingModificationCents'])row[field]=String(row.componentBalances.reduce((total,part)=>total+BigInt(part[field]),0n));return row;}
function opts(){return {signedPending:true,lines:[line()],balances:[native()],reservedLines:[],reservedModifications:[]};}
function payload(components,reason='Julie revised subcontractor amount',id=ID){return {contract:CONTRACT,items:[{budgetItemId:id,components:{...zeros(),...components},reason}]};}
const row=(plan,element,item=0)=>plan.items[item].rows.find(part=>part.costElement===element);
const sum=(items,key)=>items.reduce((total,item)=>total+BigInt(item[key].replace('.','')),0n);

let input=opts(),before=copy(input),p=R.plan(input);
assert.equal(p.available,true);assert.equal(row(p,'4').minimumIncrease,'19000.00');assert.equal(row(p,'1').maximumDecrease,'20000.00');assert.equal(p.increase,'19000.00');assert.equal(p.decrease,'0.00');assert.equal(p.valid,false,'A changed cost code still needs a reason');
const defaults=copy(R.defaults(input));assert.equal(defaults.contract,CONTRACT);assert.deepEqual(defaults.items[0].components,{...zeros(),'4':'19000.00'});assert.equal(defaults.items[0].reason,'');

// Julie: a $34,000 breakdown becomes $33,000, with one mixed signed
// modification on the same cost code. Net-zero is never required.
const julie=payload({'1':'-20000.00','4':'19000.00'});
assert.deepEqual(copy(R.validate(julie,input)),julie);
p=R.plan({...input,reallocation:julie});assert.equal(p.valid,true);assert.equal(p.increase,'19000.00');assert.equal(p.decrease,'20000.00');assert.equal(p.net,'-1000.00');assert.equal(p.gross,'39000.00');assert.equal(sum(p.items[0].rows,'currentBudget'),3400000n);assert.equal(sum(p.items[0].rows,'revisedBudget'),3300000n);assert.equal(row(p,'1').revisedBudget,'0.00');assert.equal(row(p,'4').revisedBudget,'33000.00');assert.equal(row(p,'4').remaining,'0.00');assert.deepEqual(input,before,'Planning and validation never mutate native inputs');assert.doesNotThrow(()=>JSON.stringify(p),'Public outputs never expose BigInt');
for(const changed of [payload({'1':'-20000.00','4':'18999.99'}),payload({'1':'-20000.00','4':'19000.01'}),payload({'1':'-20000.01','4':'19000.00'}),payload({'4':'-0.01'})])assert.throws(()=>R.validate(changed,input),/requires an increase|increase must equal|decrease cannot exceed/);
assert.equal(R.plan({...input,reallocation:payload({'4':'19000.01'})}).valid,false,'An invalid draft remains inspectable without authorizing submission');

input=opts();input.lines=[line('2000.00')];input.balances=[native(ID,['100000','0','0','100000','0'])];
p=R.plan({...input,reallocation:payload({'1':'-1000.00','4':'1000.00'},'Move the labor allowance')});assert.equal(p.valid,true);assert.equal(p.net,'0.00');assert.equal(p.gross,'2000.00');assert.equal(p.items.length,1,'Both directions share one cost-code modification');
assert.equal(R.validate(payload({'1':'-1000.00','4':'1000.00'},'Move the labor allowance'),input).items.length,1);
assert.throws(()=>R.validate(payload({'1':'0.01','4':'1000.00'}),input),/Labor increase must equal the required 0.00/,'An unrelated element cannot be overfunded');

input=opts();input.lines=[line('100.00')];p=R.plan(input);assert.equal(p.valid,true);assert.equal(p.gross,'0.00');assert.equal(R.validate(R.defaults(input),input).items[0].reason,'','A zero-change cost code creates no modification and needs no reason');
assert.equal(R.validate(null,input),null);assert.equal(R.validate(undefined,{lines:[]}),null,'Omitted reallocation preserves legacy automatic handling');

// Gross pending decreases reserve their full debit even if another pending
// credit cancels the net. Unapproved credits never finance a decrease.
input=opts();input.lines=[line('100.00')];let balance=input.balances[0];balance.componentBalances[0].pendingModificationCents='0';balance.componentBalances[0].pendingReductionCents='100000';rollup(balance);p=R.plan(input);assert.equal(row(p,'1').pending,'0.00');assert.equal(row(p,'1').pendingReduction,'1000.00');assert.equal(row(p,'1').maximumDecrease,'19000.00');
assert.throws(()=>R.validate(payload({'1':'-19000.01'}),input),/decrease cannot exceed 19000.00/);
balance.componentBalances[0].pendingModificationCents='100000';rollup(balance);assert.equal(row(R.plan(input),'1').maximumDecrease,'19000.00','Offsetting credit does not release gross debit reserve');
balance.componentBalances[3].pendingModificationCents='-50000';balance.componentBalances[3].pendingReductionCents='50000';rollup(balance);input.lines=[line('14000.00')];p=R.plan(input);assert.equal(row(p,'4').minimumIncrease,'500.00','Another pending debit contributes to the exact mandatory increase');
Object.assign(balance.componentBalances[0],{issuedCents:'2100000',availableCents:'-100000'});rollup(balance);p=R.plan(input);assert.equal(row(p,'1').minimumIncrease,'0.00','This PO never funds an old deficit on an element it does not allocate');assert.equal(row(p,'1').maximumDecrease,'0.00');

// A rejected/pending PO reuses only its own reservations and own signed
// credits/debit reserves. The prior normalized Decrease map is not its sign.
input=opts();balance=input.balances[0];Object.assign(balance.componentBalances[3],{issuedCents:'1500000',availableCents:'-100000',pendingModificationCents:'100000'});Object.assign(balance.componentBalances[0],{pendingModificationCents:'-50000',pendingReductionCents:'50000'});rollup(balance);
input.reservedLines=[line('15000.00')];input.reservedModifications=[{budgetItemId:ID,status:'Submitted',componentReallocation:true,modificationType:'Decrease',components:{...zeros(),'1':'500.00','4':'-1000.00'},signedComponents:{...zeros(),'1':'-500.00','4':'1000.00'}}];
p=R.plan(input);assert.equal(p.available,true);assert.equal(row(p,'4').available,'14000.00');assert.equal(row(p,'4').pending,'0.00');assert.equal(row(p,'4').minimumIncrease,'19000.00');assert.equal(row(p,'1').pendingReduction,'0.00');assert.equal(row(p,'1').maximumDecrease,'20000.00');assert.equal(R.validate(julie,input).items.length,1);
input.lines=[line('15000.00','1')];p=R.plan(input);assert.equal(row(p,'1').maximumDecrease,'5000.00','Moving the PO element keeps the saved reservation scoped to the original element');assert.equal(row(p,'4').allocated,'0.00');

// Native IDs stay strings and each selected cost code is present exactly once.
input=opts();input.lines=[...input.lines,line('1.00','5',OTHER)];input.balances.push(native(OTHER,['0','0','0','0','100']));
let multi=copy(R.defaults(input));multi.items[0].reason='Fund subcontractor';assert.equal(R.validate(multi,input).items.length,2);assert.equal(R.plan(input).items[1].budgetItemId,OTHER);
for(const changed of [
  {...multi,items:[multi.items[0],multi.items[0]]},
  {...multi,items:[multi.items[0]]},
  {...multi,items:[multi.items[0],{...multi.items[1],budgetItemId:'999'}]},
  {...multi,items:[{...multi.items[0],budgetItemId:90071992547409931},multi.items[1]]},
  {...multi,contract:'other'}
])assert.throws(()=>R.validate(changed,input),/selected cost code|duplicate or unrelated|exact Creator ID/);

for(const change of [undefined,null,1,'1,000.00','1.001','+1.00','NaN']){const changed=payload({'4':change});assert.throws(()=>R.validate(changed,opts()),/exact amount/);}
let changed=payload({'4':'19000.00'});delete changed.items[0].components['2'];assert.throws(()=>R.validate(changed,opts()),/all five/);changed=payload({'4':'19000.00'});changed.items[0].components['6']='0.00';assert.throws(()=>R.validate(changed,opts()),/all five/);assert.throws(()=>R.validate(payload({'4':'19000.00'},'  '),opts()),/Enter a reason/);

for(const mutate of [
  o=>{o.signedPending=false;},o=>{delete o.signedPending;},o=>{delete o.balances[0].reallocationContract;},
  o=>{o.balances[0].componentBaselineAvailable=false;},o=>{o.balances[0].unallocatedIssuedCents='1';},o=>{o.balances[0].unallocatedModificationCents='-1';},
  o=>{o.balances[0].unallocatedModificationCount=2;},o=>{delete o.balances[0].unallocatedModificationCount;},o=>{o.balances[0].unallocatedModificationCount='0';},o=>{o.balances[0].unallocatedModificationCount=-1;},o=>{o.balances[0].unallocatedModificationCount=0.5;},
  o=>{o.balances[0].componentBalances.pop();},o=>{o.balances[0].componentBalances[4]={...o.balances[0].componentBalances[0]};},
  o=>{delete o.balances[0].componentBalances[0].pendingModificationCents;},o=>{delete o.balances[0].componentBalances[0].pendingReductionCents;},
  o=>{o.balances[0].componentBalances[0].pendingReductionCents='-1';},o=>{o.balances[0].componentBalances[0].availableCents='1999999';},
  o=>{o.balances.push(copy(o.balances[0]));},o=>{o.reservedModifications=[{budgetItemId:ID,status:'Submitted',components:null}];}
]){
  const fixture=opts();mutate(fixture);assert.equal(R.plan(fixture).available,false,'Unknown/legacy/conflicting baseline cannot become a custom plan');assert.throws(()=>R.validate(julie,fixture));assert.equal(R.validate(null,fixture),null,'Automatic mode remains independent of custom capability');
}

// Approved modifications change Revised Final, preserving raw Final. Unused
// approved increases remain legitimate donors even when raw Final is zero.
input=opts();input.lines=[line('1.00')];balance=input.balances[0];Object.assign(balance.componentBalances[0],{finalCents:'0',modCents:'500000',availableCents:'500000'});rollup(balance);p=R.plan(input);assert.equal(row(p,'1').maximumDecrease,'5000.00');assert.equal(row(p,'1').finalBudget,'0.00');assert.equal(row(p,'1').currentBudget,'5000.00');assert.doesNotThrow(()=>R.validate(payload({'1':'-5000.00'}),input));p=R.plan({...input,reallocation:payload({'1':'-5000.00'})});assert.equal(row(p,'1').revisedBudget,'0.00');assert.equal(row(p,'1').revisedFinal,'0.00');assert.throws(()=>R.validate(payload({'1':'-5000.01'}),input),/decrease cannot exceed|negative revised/);

input=opts();input.lines=[line('0.01','4')];input.balances=[native(ID,['9007199254740993','0','0','1','0'])];p=R.plan(input);assert.equal(row(p,'1').currentBudget,'90071992547409.93','Native money never passes through Number');assert.equal(row(p,'4').remaining,'0.00');assert.doesNotThrow(()=>JSON.stringify(p));
console.log('PO reallocation domain: exact signed five-element plans, Julie 34000→33000, zero/nonzero nets, one mod per cost code, mandatory funding, safe reductions/gross pending debits, owned reservations, capability/legacy guards, complete identities/reasons and BigInt-safe public strings passed.');
