import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Actual shipped UI adapters/save functions; deterministic DOM surfaces and
// native-shaped DTOs only. No browser, Creator writes or notifications.
const source=fs.readFileSync('widgets/budget-manager/src/app/po-ui.js','utf8');
const CONTRACT='po-reallocation-v1',ITEM='90071992547409931',BUDGET='90071992547409930';
const clone=value=>JSON.parse(JSON.stringify(value));
const zeros=()=>({'1':'0.00','2':'0.00','3':'0.00','4':'0.00','5':'0.00'});
function helper(name){const start=source.search(new RegExp('    (?:async )?function '+name+'\\('));assert.ok(start>=0,name);const next=/\n    (?:async )?function /.exec(source.slice(start+1));assert.ok(next,name+' end');return source.slice(start,start+1+next.index);}
function native(){return {budgetItemId:ITEM,reallocationContract:CONTRACT,componentBaselineAvailable:true,issuedComponentsAllocated:true,unallocatedIssuedCents:'0',unallocatedModificationCents:'0',unallocatedModificationCount:0,finalCents:'3400000',modCents:'0',issuedCents:'0',availableCents:'3400000',pendingModificationCents:'0',subdivisionCode:'EP01',minorCode:'3240',componentBalances:['2000000','0','0','1400000','0'].map((value,index)=>({costElement:String(index+1),finalCents:value,modCents:'0',issuedCents:'0',availableCents:value,pendingModificationCents:'0',pendingReductionCents:'0'}))};}
function surface(){
  const nodes=new Map(),events={};let html='',rebuilds=0;
  return {events,nodes,hidden:false,get rebuilds(){return rebuilds;},get innerHTML(){return html;},set innerHTML(value){html=value;rebuilds++;},addEventListener(name,fn){events[name]=fn;},querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',hidden:false,dataset:{}});return nodes.get(selector);}};
}
function fixture(){
  const host=surface(),sends=[],errors=[],changes=[],timers=new Map();let timer=0,creation=true,editor=false,busy=false;
  const c=vm.createContext({setTimeout:fn=>{timers.set(++timer,fn);return timer;},clearTimeout:id=>timers.delete(id)});c.root=c;
  for(const filename of ['po-domain.js','po-reallocation.js','po-reallocation-ui.js'])vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/'+filename,'utf8'),c);
  c.model={id:'90071992547409938',revision:'native-draft',budgetId:BUDGET,vendorId:'90071992547409937',vendors:[{ID:'90071992547409937'}],amount:'33000.00',description:'Fixture PO',requestDate:'2026-11-09',dateNeeded:'2026-11-11',loadState:'loaded',status:'Draft',commitmentState:'None',approvalState:'Not Configured',canEditDraft:true,editable:false,balanceState:'loaded',reallocationContract:CONTRACT,balances:[native()],reservedLines:[],lines:[{key:'one',budgetItemId:ITEM,description:'Concrete',uom:'LS',costElement:'4',pricingMode:'Manual',quantity:null,unitPrice:null,finalAmount:'33000.00'}]};
  c.options={canCreate:()=>creation,canEdit:()=>editor,canEditInFlight:()=>editor,userAccessId:()=> '90071992547409939'};
  c.progress=false;c.visualBusy=false;c.current=()=>true;c.generation=1;c.previewGeneration=0;c.previewTimer=null;c.deleteReview=false;
  c.error=message=>errors.push(message);c.uid=()=> 'reallocation-ui-fixture-token';c.lineCode=()=> 'C_EP01-3240-4';c.mountProgress=()=>{};c.controller={begin:async payload=>sends.push(clone(payload))};
  c.money=value=>'$'+value;c.card={querySelector:()=>({innerHTML:''})};c.patchApprovers=()=>{};
  for(const name of ['canAmend','canCompose','readOnly','totals','allocationRows','save'])vm.runInContext(helper(name),c);
  vm.runInContext(source.slice(source.indexOf('  function dateValid('),source.indexOf('  // Give')),c);
  const ui=c.LMPOReallocationUI.create({host,model:()=>c.model,locked:()=>c.readOnly(),busy:()=>busy,hidden:()=>false,items:()=>[{id:ITEM,code:'C_EP01-3240',name:'Curb & Gutter'}],money:c.money,error:c.error,changed:plan=>{c.model.reallocationPlan=plan;changes.push(clone(plan));}});c.reallocationUI=ui;
  return {c,ui,host,sends,errors,changes,timers,setCreation:value=>creation=value,setEditor:value=>editor=value,setBusy:value=>busy=value};
}
function toggle(h){const target={hasAttribute:name=>name==='data-po-rea-toggle',closest:()=>target};h.host.events.click({target});}
function input(h,element,value,negative=false){const target={dataset:{item:ITEM,element,negative:String(negative)},value,selectionStart:value.length,selectionEnd:value.length,hasAttribute:name=>name==='data-po-rea-amount'};h.host.events.input({target});assert.equal(target.value,value,'Typing never rewrites the active input');assert.equal(target.selectionStart,value.length);return target;}
function reason(h,value){const target={dataset:{item:ITEM},value,hasAttribute:name=>name==='data-po-rea-reason'};h.host.events.input({target});}

let h=fixture();h.ui.update();assert.equal(h.ui.payload(),null);assert.match(h.host.innerHTML,/Add Reallocation/);assert.equal((h.host.innerHTML.match(/data-po-rea-row=/g)||[]).length,5);assert.equal((h.host.innerHTML.match(/data-po-rea-amount/g)||[]).length,5);assert.match(h.host.innerHTML,/One approval round/);assert.equal(h.c.readOnly(),false,'Existing create-only own-Draft capability is sufficient; no Budget edit role is fabricated');
toggle(h);assert.equal(h.c.model.reallocation.items[0].components['4'],'19000.00');assert.match(h.host.innerHTML,/Remove Reallocation/);assert.match(h.host.innerHTML,/Required \$19000.00/);assert.throws(()=>h.ui.payload(),/reason/);
const mounted=h.host.rebuilds;input(h,'1','20,000.00',true);reason(h,'Julie changes 34000 to 33000');assert.equal(h.host.rebuilds,mounted,'Editing amounts/reasons patches projections without remounting controls');assert.equal(h.ui.plan().net,'-1000.00');assert.equal(h.ui.payload().items[0].components['1'],'-20000.00');assert.match(h.host.querySelector('[data-po-rea-totals]').innerHTML,/\$-1000.00/);
input(h,'4','19000.01');assert.equal(h.ui.plan().valid,false);assert.throws(()=>h.ui.payload(),/increase must equal/);input(h,'4','19000.00');
await h.c.save('Submit');assert.deepEqual(h.errors,[]);assert.equal(h.sends.length,1);assert.equal(h.sends[0].amount,'33000.00');assert.equal(h.sends[0].reallocationContract,CONTRACT);assert.deepEqual(h.sends[0].reallocation.items[0].components,{...zeros(),'1':'-20000.00','4':'19000.00'});assert.deepEqual(h.sends[0].expectedComponentBalances,{[ITEM+'|4']:'1400000',[ITEM+'|1']:'2000000'},'Offset elements without a PO line also carry fresh component expectations');assert.deepEqual(h.sends[0].expectedComponentPendingModifications,{[ITEM+'|4']:'0',[ITEM+'|1']:'0'});assert.equal(h.sends[0].automaticModifications,true);
await h.c.save('Save');assert.equal(h.sends[1].action,'Save');assert.equal(h.sends[1].reallocation.items[0].reason,'Julie changes 34000 to 33000');

// Busy, stale/readonly and permission-revoked surfaces cannot edit the model.
const retained=clone(h.c.model.reallocation);h.setBusy(true);input(h,'1','1.00',true);reason(h,'wrong');toggle(h);assert.deepEqual(clone(h.c.model.reallocation),retained);h.setBusy(false);h.setCreation(false);assert.equal(h.c.readOnly(),true);input(h,'1','1.00',true);toggle(h);assert.deepEqual(clone(h.c.model.reallocation),retained);await h.c.save('Submit');assert.equal(h.sends.length,2);h.setCreation(true);

// Changing PO lines or refreshing native balances updates required increases
// while preserving the user's chosen offsets and reason.
h=fixture();h.ui.update();toggle(h);input(h,'1','20000.00',true);reason(h,'Keep this offset');h.c.model.lines[0].finalAmount='32000.00';h.c.model.amount='32000.00';h.ui.update();assert.equal(h.c.model.reallocation.items[0].components['4'],'18000.00');assert.equal(h.c.model.reallocation.items[0].components['1'],'-20000.00');assert.equal(h.c.model.reallocation.items[0].reason,'Keep this offset');assert.match(h.host.innerHTML,/value="18,000.00"/);assert.equal(h.ui.payload().items[0].components['4'],'18000.00');
Object.assign(h.c.model.balances[0].componentBalances[3],{finalCents:'1500000',availableCents:'1500000'});Object.assign(h.c.model.balances[0],{finalCents:'3500000',availableCents:'3500000'});h.ui.update();assert.equal(h.c.model.reallocation.items[0].components['4'],'17000.00','A same-state fresh native balance is still a new calculation context');assert.equal(h.c.model.reallocation.items[0].reason,'Keep this offset');assert.equal(h.ui.plan().net,'-3000.00');
// A source limitation must not trap the requester inside an invalid custom plan.
h.c.model.balances[0].unallocatedModificationCount=1;h.ui.update();assert.match(h.host.innerHTML,/data-po-rea-toggle >Remove Reallocation/);toggle(h);assert.equal(h.c.model.reallocation,null,'Removing an unavailable plan restores the established automatic mode');

// Automatic behavior remains available before the Creator capability is live.
h=fixture();h.c.model.reallocationContract=null;delete h.c.model.balances[0].reallocationContract;h.ui.update();assert.match(h.host.innerHTML,/Creator update/);assert.match(h.host.innerHTML,/data-po-rea-toggle disabled/);toggle(h);assert.equal(h.c.model.reallocation,undefined);assert.equal(h.errors.length,1);h.errors.length=0;await h.c.save('Submit');assert.equal(h.sends.length,1);assert.equal(h.sends[0].reallocation,undefined);assert.equal(h.sends[0].reallocationContract,undefined);assert.deepEqual(h.errors,[]);
h.c.model.reallocation={contract:CONTRACT,items:[{budgetItemId:ITEM,components:{...zeros(),'4':'19000.00'},reason:'Injected'}]};await h.c.save('Submit');assert.equal(h.sends.length,1,'An injected custom plan cannot bypass native capability');assert.match(h.errors[0],/Creator update/);

// Actual PreviewApprovals request: net-zero gross changes still need the
// combined modification route, chosen by the backend rather than UI roles.
h=fixture();h.ui.update();toggle(h);input(h,'1','19000.00',true);reason(h,'Net zero transfer');assert.equal(h.ui.plan().net,'0.00');assert.equal(h.ui.plan().gross,'38000.00');
const previews=[];h.c.call=async payload=>{previews.push(clone(payload));return {contract:'po-v1',success:true,approvalPreview:{roles:[{role:'VP',order:1},{role:'CFO',order:2}]}};};h.c.patchApprovers=()=>{};vm.runInContext(helper('patchContext'),h.c);h.c.patchContext();assert.equal(h.timers.size,1);await [...h.timers.values()][0]();assert.equal(previews.length,1);assert.equal(previews[0].action,'PreviewApprovals');assert.equal(previews[0].hasBudgetModification,true);assert.equal(h.c.model.previewRoles.length,2);assert.equal(h.c.model.previewRoles[0].role,'VP');assert.equal(h.c.model.previewRoles[1].role,'CFO');

// Reload executes the real Get/readBalances/useBalances path. A Draft retains
// its persisted plan; an older snapshot cannot inherit another PO's plan.
h=fixture();h.ui.update();toggle(h);input(h,'1','20000.00',true);reason(h,'Saved draft reason');const persisted=clone(h.ui.payload()),snapshot={...clone(h.c.model),reallocation:persisted};delete snapshot.reallocationPlan;
let snapshotToRead=snapshot;h.c.loadGeneration=0;h.c.balanceGeneration=0;h.c.captureRecovery=()=>{};h.c.render=()=>h.ui.update();h.c.call=async payload=>payload.action==='Get'?{contract:'po-v1',success:true,snapshot:clone(snapshotToRead)}:{contract:'po-v1',success:true,reallocationContract:CONTRACT,balances:[native()]};
for(const name of ['readBalances','useBalances','get'])vm.runInContext(helper(name),h.c);
await h.c.get(snapshot.id,Promise.resolve());assert.deepEqual(clone(h.c.model.reallocation),persisted);h.ui.update();assert.match(h.host.innerHTML,/Saved draft reason/);
snapshotToRead={...snapshot,id:'90071992547409942',revision:'other-draft'};delete snapshotToRead.reallocation;await h.c.get(snapshotToRead.id,Promise.resolve());assert.equal(h.c.model.reallocation,null,'A different/legacy Draft clears the previous plan');assert.equal(h.c.model.reallocationPlan.items[0].reason,'','Fresh projection cannot inherit another Draft reason');

// Readonly historical saved plans show captured changes and totals even after
// approval changes the current baseline, without treating them as a new edit.
h=fixture();h.ui.update();toggle(h);input(h,'1','20000.00',true);reason(h,'Historical plan');h.c.model.preview=true;h.c.model.status='Submitted';h.c.model.approvalState='Approved';h.c.model.approvalBundle={reallocationContract:CONTRACT,modifications:[],rows:[]};const nativeAfter=h.c.model.balances[0];Object.assign(nativeAfter.componentBalances[0],{modCents:'-2000000',availableCents:'0'});Object.assign(nativeAfter.componentBalances[3],{modCents:'1900000',issuedCents:'3300000',availableCents:'0'});Object.assign(nativeAfter,{modCents:'-100000',issuedCents:'3300000',availableCents:'0'});h.c.model.reservedLines=clone(h.c.model.lines);h.ui.update();assert.match(h.host.innerHTML,/Saved Change/);assert.match(h.host.querySelector('[data-po-rea-totals]').innerHTML,/\$-1000.00/);assert.doesNotMatch(h.host.innerHTML,/data-po-rea-toggle/);assert.equal(h.host.querySelector('[data-po-rea-notice]').hidden,true,'Historical saved allocations are not revalidated as new changes against the approved baseline');

console.log('PO reallocation UI/save: actual five-row adapter, stable editable controls, capability and role boundaries, exact offset expectations, draft persistence/reload, combined net-zero approval preview and historical readonly totals passed without native writes.');
