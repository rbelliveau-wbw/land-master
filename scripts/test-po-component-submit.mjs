import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the shipped save handler and decimal contract with native-shaped
// Balances DTOs. The fixture captures payloads; it never calls Creator.
const ui=fs.readFileSync('widgets/budget-manager/src/app/po-ui.js','utf8');
const domain=fs.readFileSync('widgets/budget-manager/src/app/po-domain.js','utf8');
const ITEM='90071992547409931',VALLEY='90071992547409932',INLET='90071992547409933';
const clone=value=>JSON.parse(JSON.stringify(value));
const line=(key,id,amount,element='4')=>({key,budgetItemId:id,description:key,uom:'LS',costElement:element,pricingMode:'Manual',quantity:null,unitPrice:null,finalAmount:amount});
function balance(id,available,subcontractor=available){
  return {budgetItemId:id,finalCents:available,modCents:'0',issuedCents:'0',availableCents:available,pendingModificationCents:'0',componentBaselineAvailable:true,unallocatedIssuedCents:'0',unallocatedModificationCents:'0',componentBalances:['1','2','3','4','5'].map(costElement=>({costElement,finalCents:costElement==='4'?subcontractor:costElement==='1'?String(BigInt(available)-BigInt(subcontractor)):'0',modCents:'0',issuedCents:'0',availableCents:costElement==='4'?subcontractor:costElement==='1'?String(BigInt(available)-BigInt(subcontractor)):'0',pendingModificationCents:'0'}))};
}
function fixture(){
  const sends=[],errors=[];
  const c=vm.createContext({progress:false,visualBusy:false,current:()=>true,readOnly:()=>false,uid:()=> 'fixture-token',lineCode:()=> 'C_EP01-3240-4',mountProgress:()=>{c.mounts++;},error:message=>errors.push(message),options:{userAccessId:()=> '90071992547409939'},controller:{begin:async payload=>sends.push(clone(payload))}});
  c.root=c;c.mounts=0;vm.runInContext(domain,c);
  c.model={id:'90071992547409938',revision:'draft-revision',budgetId:'90071992547409930',department:'Development',vendorId:'90071992547409937',vendors:[{ID:'90071992547409937'}],requestDate:'2026-11-09',dateNeeded:'2026-11-11',status:'Draft',balanceState:'loaded',reservedLines:[],balances:[balance(ITEM,'14973000'),balance(VALLEY,'1364000'),balance(INLET,'4093500','822000')],lines:[line('curb',ITEM,'144440.00'),line('ribbon',ITEM,'3562.50'),line('wings',VALLEY,'9520.00'),line('valley',VALLEY,'4120.00'),line('inlet',INLET,'5480.00')]};
  for(const [start,end] of [['  function dateValid(','  // Give'],['    function totals()','    function patchTotal()'],['    function allocationRows()','    function summaryRows()'],['    async function save(action)','    function loadVendors()']]){
    const a=ui.indexOf(start),b=ui.indexOf(end,a);assert.ok(a>=0&&b>a,start);vm.runInContext(ui.slice(a,b),c);
  }
  c.itemRows=()=>c.model.lines.map(line=>({id:line.budgetItemId,department:'Development'}));
  c.canAmend=()=>false;
  return {c,sends,errors};
}
let h=fixture();await h.c.save('Save');assert.equal(h.sends.length,1);assert.equal(h.sends[0].amount,'167122.50');assert.equal(h.sends[0].expectedComponentBalances,undefined,'Draft saves retain their existing no-reservation contract');
await h.c.save('Submit');assert.deepEqual(h.errors,[]);const payload=h.sends[1];
assert.deepEqual(payload.expectedComponentBalances,{[ITEM+'|4']:'14973000',[VALLEY+'|4']:'1364000',[INLET+'|4']:'822000'});
assert.deepEqual(payload.expectedComponentPendingModifications,{[ITEM+'|4']:'0',[VALLEY+'|4']:'0',[INLET+'|4']:'0'});
assert.deepEqual(payload.expectedBalances,{[ITEM]:'14973000',[VALLEY]:'1364000',[INLET]:'4093500'});
assert.equal(payload.lines.length,5,'Repeated lines consolidate expectations without changing PO lines');

// Reserved amendment: restore this PO's prior element reservation exactly once,
// excluding its own pending component credit from other-PO pending amounts.
h=fixture();const b=balance(ITEM,'10000','7000');b.issuedCents='3000';b.availableCents='7000';b.pendingModificationCents='1500';Object.assign(b.componentBalances[3],{issuedCents:'3000',availableCents:'4000',pendingModificationCents:'1500'});
h.c.model.balances=[b];h.c.model.lines=[line('new-sub',ITEM,'75.00'),line('new-labor',ITEM,'5.00','1')];h.c.model.reservedLines=[line('old-sub',ITEM,'20.00'),line('old-sub-two',ITEM,'5.00'),line('old-labor',ITEM,'1.00','1')];
h.c.model.status='Submitted';h.c.model.approvalState='Pending';h.c.model.approvalBundle={rows:[{id:'90071992547409940'}],modifications:[{budgetItemId:ITEM,status:'Submitted',amount:'5.00',components:{'1':'0.00','2':'0.00','3':'0.00','4':'5.00','5':'0.00'}}]};h.c.canAmend=()=>true;
await h.c.save('Save');assert.deepEqual(h.errors,[]);assert.equal(h.sends[0].preserveApproval,true);assert.deepEqual(h.sends[0].expectedComponentBalances,{[ITEM+'|4']:'6500',[ITEM+'|1']:'3100'});assert.deepEqual(h.sends[0].expectedComponentPendingModifications,{[ITEM+'|4']:'1000',[ITEM+'|1']:'0'});
// A moved line gets only the reservation for its newly selected element.
h.c.model.lines=[line('moved',ITEM,'75.00','2')];await h.c.save('Save');assert.deepEqual(h.sends[1].expectedComponentBalances,{[ITEM+'|2']:'0'});

h=fixture();h.c.model.balances[0].componentBaselineAvailable=false;h.c.model.balances[0].componentBalances=[];await h.c.save('Submit');assert.deepEqual(h.errors,[]);assert.equal(h.sends[0].expectedComponentBalances[ITEM+'|4'],undefined,'A legacy/department-derived display baseline never fabricates native component expectations');assert.equal(h.sends[0].expectedBalances[ITEM],'14973000');
h=fixture();h.c.model.balances[0].unallocatedIssuedCents='100';h.c.model.balances[0].unallocatedModificationCents='50';await h.c.save('Submit');assert.deepEqual(h.errors,[]);assert.equal(h.sends[0].expectedComponentBalances[ITEM+'|4'],'14973000','Unallocated legacy display warnings do not discard known native expectations');
h=fixture();Object.assign(h.c.model.balances[0].componentBalances[3],{availableCents:'-1',pendingModificationCents:'0'});await h.c.save('Submit');assert.deepEqual(h.errors,[]);assert.equal(h.sends[0].expectedComponentBalances[ITEM+'|4'],'-1','Negative availability remains exact for server-side modification planning');

for(const mutate of [
  b=>{b.componentBalances=[];},
  b=>{b.componentBalances.push({...b.componentBalances[3]});},
  b=>{b.componentBalances[3].availableCents=null;},
  b=>{b.componentBalances[3].availableCents=14973000;},
  b=>{b.componentBalances[3].availableCents='149730.00';},
  b=>{delete b.componentBalances[3].pendingModificationCents;},
  b=>{b.componentBalances[3].pendingModificationCents='-1';}
]){
  h=fixture();mutate(h.c.model.balances[0]);await h.c.save('Submit');assert.equal(h.sends.length,0,'Unavailable/conflicting component expectations prevent the write');assert.equal(h.c.mounts,0);assert.match(h.errors[0],/component.*balance|Component balance/);
}
h=fixture();h.c.model.lines=[line('large',ITEM,'1.01')];h.c.model.balances[0].componentBalances[3].availableCents='900719925474099312345';await h.c.save('Submit');assert.equal(h.sends[0].expectedComponentBalances[ITEM+'|4'],'900719925474099312345','Cents never pass through Number');
console.log('PO component submission: actual EP01-shaped five-line draft/submit, exact scoped expectations, amendment reservations/credits, moved elements, legacy baselines, malformed/duplicate/unknown blocking and signed large cents passed.');
