import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const c=vm.createContext({setTimeout,clearTimeout});
for(const filename of ['po-domain.js','po-controller.js'])vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/'+filename,'utf8'),c);
const C=c.LMPOController,CONTRACT='po-reallocation-v1',ITEM='90071992547409931',OTHER='90071992547409932';
const copy=value=>JSON.parse(JSON.stringify(value));
const zeros=()=>({'1':'0.00','2':'0.00','3':'0.00','4':'0.00','5':'0.00'});
function fixture(components={'1':'-20000.00','4':'19000.00'}){
  const request={budgetItemId:ITEM,components:{...zeros(),...components},reason:'Julie revised subcontractor amount'};
  const wanted={action:'Submit',id:'90071992547409935',token:'reallocation-test-token-0001',budgetId:'90071992547409930',department:'Development',vendorId:'90071992547409933',userAccessId:'90071992547409934',amount:'33000.00',description:'Fixture PO',requestDate:'2026-11-09',dateNeeded:'2026-11-11',automaticModifications:true,reallocationContract:CONTRACT,reallocation:{contract:CONTRACT,items:[request]},lines:[{key:'subcontractor',budgetItemId:ITEM,description:'Concrete',uom:'LS',costElement:'4',pricingMode:'Manual',quantity:null,unitPrice:null,finalAmount:'33000.00',costCode:'C_EP01-3240-4'}]};
  let net=0n,gross=0n;for(const value of Object.values(request.components)){const number=value[0]==='-'?-c.LMPO.money(value.slice(1)):c.LMPO.money(value);net+=number;gross+=number<0n?-number:number;}
  const normalized={};for(const [key,value] of Object.entries(request.components)){const number=value[0]==='-'?-c.LMPO.money(value.slice(1)):c.LMPO.money(value);normalized[key]=c.LMPO.currency(net<0n?-number:number);}
  const mod={id:'90071992547409936',budgetItemId:ITEM,reference:'Synthetic PO',status:'Submitted',componentReallocation:true,modificationType:net<0n?'Decrease':'Increase',amount:c.LMPO.currency(net<0n?-net:net),components:normalized,signedComponents:{...request.components},reason:request.reason};
  const snapshot={...copy(wanted),revision:wanted.token,status:'Submitted',commitmentState:'Reserved',approvalState:'Pending',budgetModificationId:gross?mod.id:null,lines:wanted.lines.map((line,index)=>({...line,ID:'9007199254740994'+String(index)})),approvalBundle:{reallocationContract:CONTRACT,modifications:gross?[mod]:[],rows:gross?[{id:'90071992547409950',role:'VP',order:1,status:'Pending'},{id:'90071992547409951',role:'CFO',order:2,status:'Not Sent'}]:[{id:'90071992547409951',role:'CFO',order:1,status:'Pending'}],emailSent:true}};
  return {wanted,snapshot,mod};
}
let f=fixture();assert.equal(C.verify(f.snapshot,f.wanted),f.snapshot);assert.equal(C.verify(f.snapshot,f.wanted,true),f.snapshot,'Read-only recovery verifies the exact captured custom plan');
assert.equal(f.mod.amount,'1000.00');assert.equal(f.mod.modificationType,'Decrease');assert.equal(f.mod.components['1'],'20000.00');assert.equal(f.mod.components['4'],'-19000.00');assert.equal(f.mod.signedComponents['1'],'-20000.00');
for(const components of [{'1':'-19000.00','4':'19000.00'},{'4':'19000.00'},{...zeros()}]){const x=fixture(components);assert.equal(C.verify(x.snapshot,x.wanted),x.snapshot);if(x.mod.amount==='0.00'&&Object.values(components).some(value=>value!=='0.00'))assert.equal(x.snapshot.approvalBundle.modifications.length,1,'A net-zero transfer still has one gross-change modification');}

// Every selected cost code appears in the plan; unchanged ones create no mod.
f=fixture();f.wanted.lines.push({...f.wanted.lines[0],key:'other',budgetItemId:OTHER,finalAmount:'1.00'});f.wanted.amount='33001.00';f.wanted.reallocation.items.push({budgetItemId:OTHER,components:zeros(),reason:''});f.snapshot.amount=f.wanted.amount;f.snapshot.lines.push({...f.wanted.lines[1],ID:'90071992547409941'});assert.equal(C.verify(f.snapshot,f.wanted),f.snapshot);
const missing=copy(f.wanted);missing.reallocation.items.pop();assert.throws(()=>C.verify(f.snapshot,missing),/cost-code count/);

for(const mutate of [
  x=>{delete x.wanted.reallocationContract;},x=>{x.wanted.reallocation.contract='wrong';},x=>{delete x.snapshot.approvalBundle.reallocationContract;},
  x=>{x.snapshot.approvalBundle.modifications=[];},x=>{x.snapshot.approvalBundle.modifications.push(copy(x.mod));},
  x=>{x.mod.id=90071992547409936;},x=>{x.mod.budgetItemId=OTHER;},x=>{x.mod.status='Approved';},x=>{delete x.mod.componentReallocation;},x=>{x.mod.componentReallocation='true';},
  x=>{x.mod.modificationType='Increase';},x=>{x.mod.amount='-1000.00';},x=>{x.mod.amount='1000';},x=>{x.mod.reason='Different reason';},
  x=>{x.mod.components['1']='-20000.00';},x=>{x.mod.signedComponents['1']='20000.00';},x=>{delete x.mod.components['5'];},x=>{delete x.mod.signedComponents;},
  x=>{x.mod.components['6']='0.00';},x=>{x.snapshot.budgetModificationId='999';},
  x=>{x.wanted.reallocation.items[0].budgetItemId=OTHER;},x=>{x.wanted.reallocation.items[0].reason='  ';},
  x=>{x.wanted.reallocation.items[0].components['1']=-20000;},x=>{x.wanted.reallocation.items[0].components['1']='-20000.001';}
]){
  const x=fixture();mutate(x);assert.throws(()=>C.verify(x.snapshot,x.wanted),/reallocation|Reallocation/,'Conflicting or incomplete custom acknowledgement cannot report success');
}

// Two changed cost codes retain one distinct native record per cost code.
f=fixture();f.wanted.amount='33001.00';f.wanted.lines.push({...f.wanted.lines[0],key:'other',budgetItemId:OTHER,finalAmount:'1.00'});f.wanted.reallocation.items.push({budgetItemId:OTHER,components:{...zeros(),'5':'1.00'},reason:'Fund other element'});f.snapshot.amount=f.wanted.amount;f.snapshot.lines.push({...f.wanted.lines[1],ID:'90071992547409941'});f.snapshot.approvalBundle.modifications.push({...copy(f.mod),id:'90071992547409937',budgetItemId:OTHER,modificationType:'Increase',amount:'1.00',components:{...zeros(),'5':'1.00'},signedComponents:{...zeros(),'5':'1.00'},reason:'Fund other element'});assert.equal(C.verify(f.snapshot,f.wanted),f.snapshot);
const reused=copy(f.snapshot);reused.approvalBundle.modifications[1].id=reused.approvalBundle.modifications[0].id;assert.throws(()=>C.verify(reused,f.wanted),/modification/,'Record IDs are unique across cost codes');

// Editing an already pending PO keeps the captured approval identities while
// verifying the signed reallocation instead of starting another chain.
f=fixture();f.wanted.action='Save';f.wanted.preserveApproval=true;f.wanted.retainedApprovalIds=f.snapshot.approvalBundle.rows.map(row=>row.id);f.snapshot.approvalBundle.rows[0].status='Approved';f.snapshot.approvalBundle.rows[1].status='Pending';assert.equal(C.verify(f.snapshot,f.wanted),f.snapshot);
const altered=copy(f.snapshot);altered.approvalBundle.modifications[0].signedComponents['4']='18999.00';assert.throws(()=>C.verify(altered,f.wanted),/allocation/);

// Capability-marked automatic submissions may carry signed pending debits.
f=fixture();delete f.wanted.reallocation;f.wanted.expectedBalances={[ITEM]:'3400000'};f.wanted.expectedPendingModifications={[ITEM]:'-100000'};f.wanted.expectedComponentBalances={[ITEM+'|4']:'1400000'};f.wanted.expectedComponentPendingModifications={[ITEM+'|4']:'-100000'};f.snapshot.approvalBundle.modifications=[{id:'90071992547409936',budgetItemId:ITEM,status:'Submitted',amount:'20000.00'}];assert.equal(C.verify(f.snapshot,f.wanted),f.snapshot);
const old=copy(f.wanted);delete old.reallocationContract;assert.throws(()=>C.verify(f.snapshot,old),/component balance/,'Unmarked legacy payloads cannot silently gain signed pending semantics');

// Real controller execution: a verified custom receipt settles normally; a
// lost reply permits only a read-only Check with the same captured plan.
f=fixture();const receipt={contract:'po-v1',success:true,writeState:'verified',snapshot:f.snapshot},calls=[];let lose=true;
const controller=C.create({onState(){},call:async p=>{calls.push(copy(p));if(lose){lose=false;throw Error('Lost custom reply');}return receipt;}});
await controller.begin(f.wanted);assert.equal(controller.state().unknown,true);assert.equal(calls.length,1);await assert.rejects(()=>controller.begin(f.wanted),/unresolved/);await controller.check();assert.equal(controller.state().unknown,false);assert.equal(controller.state().snapshot.id,f.snapshot.id);assert.equal(calls.length,2);assert.equal(calls[1].action,'Check');assert.equal(calls[1].reallocation,undefined);assert.equal(calls[1].lines,undefined);
console.log('PO reallocation controller: exact custom item/record counts, signed and normalized allocations, positive/negative/zero nets, zero-change omission, single retained chain, guarded signed pending semantics and read-only lost-reply recovery passed.');
