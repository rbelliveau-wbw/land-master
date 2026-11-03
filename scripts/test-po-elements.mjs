import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({});
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-domain.js','utf8'),context);
const PO=context.LMPO,ID='4410926000005159046',OTHER='4410926000005159047';
const copy=value=>JSON.parse(JSON.stringify(value));
assert.deepEqual(copy(PO.elements),[{id:'1',label:'(1) Labor'},{id:'2',label:'(2) Materials'},{id:'3',label:'(3) Equipment'},{id:'4',label:'(4) Subcontractor'},{id:'5',label:'(5) Other'}]);
const components=[
  {costElement:'1',finalCents:'10000',modCents:'1000',issuedCents:'4000',availableCents:'7000',pendingModificationCents:'1500'},
  {costElement:'2',finalCents:'20000',modCents:'0',issuedCents:'0',availableCents:'20000',pendingModificationCents:'0'},
  {costElement:'3',finalCents:'0',modCents:'0',issuedCents:'0',availableCents:'0',pendingModificationCents:'0'},
  {costElement:'4',finalCents:'0',modCents:'0',issuedCents:'0',availableCents:'0',pendingModificationCents:'0'},
  {costElement:'5',finalCents:'5000',modCents:'-200',issuedCents:'1000',availableCents:'3800',pendingModificationCents:'0'}
];
const balance={budgetItemId:ID,finalCents:'35000',modCents:'800',issuedCents:'5000',availableCents:'30800',pendingModificationCents:'1500',componentBaselineAvailable:true,componentBalances:components,unallocatedIssuedCents:'0',issuedComponentsAllocated:true,unallocatedModificationCents:'0'};
const lines=[{key:'a',budgetItemId:ID,costElement:'1',finalAmount:'10.00'},{key:'b',budgetItemId:ID,costElement:'1',finalAmount:'2.00'},{key:'c',budgetItemId:ID,costElement:'5',finalAmount:'5.00'}];
const own=[{key:'saved',budgetItemId:ID,costElement:'1',finalAmount:'8.00'}];
const ownMods=[{budgetItemId:ID,status:'Submitted',amount:'5.00',components:{'1':'5.00','2':'0.00','3':'0.00','4':'0.00','5':'0.00'}}];
let result=PO.elementAllocations(lines,[balance],own,ownMods)[0];
assert.equal(result.elements.length,5);
const labor=result.elements[0],other=result.elements[4];
assert.equal(labor.final,10000n);assert.equal(labor.modifications,1000n);assert.equal(labor.modified,11000n);
assert.equal(labor.existingPOs,3200n,'own saved element reservation is removed once from existing POs');
assert.equal(labor.available,7800n);assert.equal(labor.allocated,1200n,'repeated current lines consolidate by item and element');assert.equal(labor.remaining,6600n);
assert.equal(labor.pending,1000n,'own pending component credit is excluded once');assert.equal(labor.shortfall,0n);
assert.equal(other.modifications,-200n);assert.equal(other.modified,4800n);assert.equal(other.available,3800n);assert.equal(other.allocated,500n);assert.equal(other.remaining,3300n);
assert.equal(result.elements[2].final,0n,'native zero baseline remains known');
assert.equal(result.elements[2].verified,true);
assert.equal(PO.elementAllocations([{...lines[0],finalAmount:'100.00'}],[balance],own,ownMods)[0].elements[0].shortfall,1200n);
assert.equal(PO.elementAllocations(lines,[balance],own,[{...ownMods[0],status:'Approved'}])[0].elements[0].pending,1500n,'approved modifications are already in native balance');

let unknown=PO.elementAllocations(lines,[{...balance,unallocatedIssuedCents:'500'}],own,ownMods)[0];
assert.equal(unknown.unallocatedIssued,500n);assert.equal(unknown.elements[0].remaining,null,'legacy commitments without an element cannot create spendable component balances');
assert.equal(unknown.elements[0].final,10000n,'known native budgets stay readable beside unallocated amounts');
unknown=PO.elementAllocations(lines,[{...balance,unallocatedModificationCents:'-100'}],own,ownMods)[0];
assert.equal(unknown.elements[0].remaining,null);
unknown=PO.elementAllocations(lines,[{...balance,componentBalances:components.slice(1)}],own,ownMods)[0];
assert.equal(unknown.componentsAvailable,false);assert.equal(unknown.elements[0].available,null);
unknown=PO.elementAllocations(lines,[{...balance,componentBalances:components.map((part,i)=>i===0?{...part,availableCents:'7001'}:part)}],own,ownMods)[0];
assert.equal(unknown.elements[0].available,null,'nonreconciling native element arithmetic is unavailable');
unknown=PO.elementAllocations(lines,[],own,ownMods)[0];assert.equal(unknown.elements[0].final,null);assert.equal(unknown.elements[0].allocated,1200n);
unknown=PO.elementAllocations([{...lines[0],finalAmount:'typing'}],[balance],own,ownMods)[0];assert.equal(unknown.elements[0].remaining,null,'invalid current entry cannot look like a zero-dollar PO');
unknown=PO.elementAllocations(lines,[balance],own,[{...ownMods[0],components:null}])[0];assert.equal(unknown.elements[0].pending,null);assert.equal(unknown.elements[0].shortfall,null);assert.equal(unknown.elements[0].remaining,6600n,'unallocated pending modification cannot erase known reservation arithmetic');

const missing={...balance,componentBaselineAvailable:false,componentBalances:components.map(part=>({...part,finalCents:null,availableCents:null}))};
result=PO.elementAllocations(lines,[missing],own,ownMods,{[ID]:'5'})[0];
assert.equal(result.derivedBaseline,true);assert.equal(result.elements[0].final,0n);assert.equal(result.elements[4].final,35000n,'department fallback puts the aggregate only in its specified element');
assert.equal(result.elements[0].modifications,1000n);assert.equal(result.elements[0].existingPOs,3200n,'department fallback retains actual element modifications and reservations');
result=PO.elementAllocations(lines,[balance],own,ownMods,{[ID]:'5'})[0];assert.equal(result.derivedBaseline,false);assert.equal(result.elements[0].final,10000n,'explicit native baseline always wins over a department default');
result=PO.elementAllocations([{...lines[0],budgetItemId:OTHER}],[balance],own,ownMods,{[ID]:'5'})[0];assert.equal(result.elements[0].final,null,'another item never receives this item\'s baseline');

const source=fs.readFileSync('widgets/budget-manager/src/app/po-ui.js','utf8');
assert.ok(source.includes("name==='costElement'?root.LMPO.elements"));
assert.ok(source.includes("picker('ELEM',line.costElement,root.LMPO.elements"));
assert.match(source,/data-po-element-value/,'element outputs have stable explicit numeric slots');
assert.match(source,/Element Shortfall/);assert.match(source,/Existing POs without an element/);
console.log('PO elements: native labels/values, exact per-element equations, duplicate/current/own reservations, pending credits, signed modifications, zero/missing/malformed/legacy data and department baseline fallback passed.');
