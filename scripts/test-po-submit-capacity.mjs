import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {poTestRuntime,compileDelugePO} from './test-po-test-cfo-backend.mjs';
import {runtime as reallocationRuntime,payload as reallocationPayload} from './test-po-reallocation-backend.mjs';

// Execute the checked-in collectors and their real saved-PO/element readers.
// This verifies bounded work and financial parity, not Creator compilation or
// the native statement counter. Submit uses local records and the existing mail
// adapter below; no native submission or real email is sent by this test.
const names=['poCurrencyString','poSnapshot','poBudgetBalancesForItems','poBudgetBalances','budgetElementExportValues','budgetElementExportRows','poElementExportRows'];
const programs=names.map(name=>{
  let source=fs.readFileSync(`creator/functions/${name}.dg`,'utf8');
  // The query adapter reserves row for each predicate's native record.
  if(name==='poSnapshot')source=source.replace(/\brow\b/g,'savedPOLine');
  return compileDelugePO(source)+`;thisapp.${name}=${name};`;
}).join('\n');
const fields=['Labor_Budget','Materials_Budget','Equipment_Budget','Subcontractor_Budget','Other_Budget'];
const parts=values=>Object.fromEntries(fields.map((field,i)=>[field,values[i]]));
const selected=['71','72','73'];
const clone=value=>JSON.parse(JSON.stringify(value));
function fixture(){
  const items=Array.from({length:227},(_,index)=>({ID:71+index,Budget:61,Budget_Category:81,Template_Item:false,Item_Name:`Item ${index+1}`,Cost_Code:3200+index,Budget_Ttl:1500.12,...parts([100.1234,200,300,400,500])}));
  const lines=[['71','4','25.00'],['71','4','5.00'],['72','1','20.00'],['73','5','40.00'],['73','5','10.00']].map(([item,element,amount],index)=>({ID:401+index,Purchase_Order:303,Revision:'saved-revision',Line_Order:index+1,Budget_Item:Number(item),Line_Key:`line-${index}`,Revision_Line_Key:`saved-revision-line-${index}`,Description:`Saved line ${index+1}`,Cost_Element:element,UOM:'LS',Cost_Code:`C_EP01-${3200+Number(item)-71}-${element}`,Pricing_Mode:'Manual',Quantity:null,Unit_Price:null,Quantity_Exact:null,Unit_Price_Exact:null,Final_Amount:Number(amount),Final_Amount_Exact:amount}));
  const pending={ID:600,Budget:61,Budget_Item:73,Status:'Submitted',Modification_Type:'Increase',Amount:4,Reference_Number:'PO-linked',...parts([0,0,0,0,4])};
  const intended={id:'600',budgetItemId:'73',amount:'4.00',reference:'PO-linked',components:{'1':'0.00','2':'0.00','3':'0.00','4':'0.00','5':'4.00'}};
  const context={workflow:'Purchase Order',budgetId:'61',recordId:'303',submitterId:'12',submissionRevision:'saved-revision',hasBudgetModification:true,amount:'100.00',modifications:[intended]};
  const route={context,route:[{order:1,key:'cfo',roleId:'1',role:'CFO',userAccessId:'12',email:'normal@example.com',reason:'Required step'}]};
  const tables={
    Add_Budget:[{ID:61,Subdivision1:{Subdivision_Code:'EP01'}}],
    Budget_Category:[{ID:81,Budget:61,Deparment:'Construction'}],
    Budget_Item:items,
    Payment_Request:[
      {ID:301,Budget:61,Request_Type:'Purchase Order',PO_Revision:'',Budget_Item:71,Request_Amount:25.5,Element:'4'},
      {ID:302,Budget:61,Request_Type:'Purchase Order',PO_Revision:'',Budget_Item:72,Request_Amount:10.01,Element:null},
      {ID:303,Budget:61,Vendor:91,Request_Type:'Purchase Order',PO_Revision:'saved-revision',PO_Status:'Submitted',PO_Commitment_State:'Reserved',PO_Approval_State:'Pending',PO_Line_Count:5,PO_Amount_Exact:'100.00',Request_Amount:100,Request_Date:'2026-11-09',Date_Needed:'2026-11-11',Budget_Item:null,Accounting_Project_Code:null,Element:null,Final_Accounting_Code:null}
    ],
    PO_Item:lines,
    Budget_Modification:[
      {ID:601,Budget:61,Budget_Item:71,Status:'Approved',Modification_Type:'Increase',Amount:10,...parts([0,0,0,10,0])},
      {ID:602,Budget:61,Budget_Item:71,Status:'Approved',Modification_Type:'Decrease',Amount:2.5,...parts([0,0,0,2.5,0])},
      {ID:603,Budget:61,Budget_Item:72,Status:'Approved',Modification_Type:'Increase',Amount:7},
      {ID:604,Budget:61,Budget_Item:72,Status:'Approved',Modification_Type:'Decrease',Amount:7},
      {ID:605,Budget:61,Budget_Item:73,Status:'Approved',Modification_Type:'Increase',Amount:15,...parts([2,0,0,3,10])},
      pending
    ],
    Budget_Approvals:[{ID:501,Budget:61,Type1:'Purchase Order',Sort_Order:1,Title:'CFO',Approver:'normal@example.com',Status:'Pending',Sent_Date:null,Responded_Date:null}],
    Approval_Route_Snapshot:[{ID:701,Workflow:'Purchase Order',Record_ID:'303',Submission_Revision:'saved-revision',Context_JSON:JSON.stringify(context),Route_JSON:JSON.stringify(route),Execution_JSON:'["501"]'}]
  };
  const r=poTestRuntime({extraTables:tables,login:'normal-cfo'});
  vm.runInContext(`
    String.prototype.subString=String.prototype.substring;
    String.prototype.toList=function(separator){return this.split(separator);};
    String.prototype.contains=function(value){return this.includes(value);};
    Number.prototype.floor=function(){return Math.floor(this);};
    Number.prototype.toDecimal=function(){return Number(this);};
    Number.prototype.abs=function(){return Math.abs(this);};
    // Model Creator lookup IDs plus their native record dereference in exports.
    record=function(object){return new Proxy(object,{get(o,key){
      if(key==='valueOf')return ()=>o.ID;
      if(key==='toString')return ()=>String(o.ID);
      if(key==='Budget_Item'&&typeof o[key]==='number'){
        var related=tables.Budget_Item.find(item=>item.ID===o[key]);
        return related?record(related):null;
      }
      if(key==='Budget_Category'&&typeof o[key]==='number'){
        var related=tables.Budget_Category.find(item=>item.ID===o[key]);
        return related?record(related):null;
      }
      return o[key]??null;
    },set(){throw Error('Capacity readers cannot write');}});};
  `+programs+`
    var capacityCurrencyReads=0,capacityScopes=[];
    var originalCurrency=thisapp.poCurrencyString;
    thisapp.poCurrencyString=function(value){capacityCurrencyReads++;return originalCurrency(value);};
    var originalScoped=thisapp.poBudgetBalancesForItems;
    thisapp.poBudgetBalancesForItems=function(id,items){capacityScopes.push(clone(items));return originalScoped(id,items);};
  `,r.c);
  r.read=(scope)=>{r.c.capacityScope=clone(scope);r.c.capacityCurrencyReads=0;return JSON.parse(vm.runInContext('JSON.stringify(thisapp.poBudgetBalancesForItems("61",map(capacityScope)))',r.c));};
  r.full=()=>{r.c.capacityCurrencyReads=0;return r.run('poBudgetBalances','61');};
  return r;
}

let r=fixture();
const before=r.tables();
const full=r.full(),fullReads=r.c.capacityCurrencyReads;
assert.equal(full.success,true,JSON.stringify(full));
assert.equal(full.balances.length,227);
assert.deepEqual(clone(r.c.capacityScopes.at(-1)),[],'Public full-phase signature retains all items through an empty internal scope');
const scoped=r.read(selected),scopedReads=r.c.capacityCurrencyReads;
assert.equal(scoped.success,true,JSON.stringify(scoped));
assert.deepEqual(scoped.balances,full.balances.filter(row=>selected.includes(row.budgetItemId)),'Selected financial DTOs exactly match the full authoritative reader');
assert.equal(fullReads-scopedReads,224,'Unselected items perform no Final-budget currency work');
assert.ok(scopedReads<fullReads/4,`Selected collector is bounded: ${scopedReads} vs ${fullReads} currency conversions`);
const [first,second,third]=scoped.balances;
assert.equal(first.issuedCents,'5550','Repeated current lines and the historical parent are each counted once');
assert.equal(first.modCents,'750','Approved increase/decrease retain signed math');
assert.equal(first.componentBalances[0].finalCents,'10012','Native four-decimal baseline is floored only to spendable cents');
assert.equal(first.componentBalances[3].issuedCents,'5550');
assert.equal(second.issuedCents,'3001');
assert.equal(second.unallocatedIssuedCents,'1001');
assert.equal(second.issuedComponentsAllocated,false);
assert.equal(second.unallocatedModificationCents,'0');
assert.equal(second.unallocatedModificationCount,2,'Cancelling unknown legacy allocations stay unknown');
assert.equal(third.issuedCents,'5000');
assert.equal(third.pendingModificationCents,'400');
assert.equal(third.componentBalances[4].pendingModificationCents,'400');
assert.equal(third.modCents,'1500','Pending credit never enters approved modification totals');
assert.equal(r.c.writes,0);
assert.deepEqual(r.tables(),before,'Full and scoped calculations remain read-only');

// A selected reader cannot silently fall back to the full phase on bad scope.
for(const scope of [null,[71],['71',null],['71','71'],['not-an-id'],['999999'],['71','900'],['71','901']]){
  r=fixture();
  r.c.tables.Budget_Item.push({...r.c.tables.Budget_Item[0],ID:900,Budget:62},{...r.c.tables.Budget_Item[0],ID:901,Template_Item:true});
  const baseline=r.tables(),result=r.read(scope);
  assert.equal(result.success,false,JSON.stringify({scope,result}));
  assert.ok(result.error,'Invalid/foreign/template/missing scope reports an explicit error');
  assert.equal(result.balances,undefined,'A rejected scope exposes no successful partial balance list');
  assert.equal(r.c.writes,0);
  assert.deepEqual(r.tables(),baseline);
}

// Capacity isolation is observable with a bad unrelated baseline: selected
// items still work, while selecting that item or the full phase rejects it.
r=fixture();r.c.tables.Budget_Item[226].Budget_Ttl='not-currency';
assert.equal(r.read(selected).success,true);
assert.equal(r.read(['297']).success,false);
assert.equal(r.full().success,false);

// The actual export reader derives its scope from the saved CURRENT revision,
// deduplicates repeated lines, and retains all five rows for every selected item.
r=fixture();
r.c.tables.PO_Item.push({...r.c.tables.PO_Item[0],ID:999,Revision:'old-revision',Budget_Item:297,Final_Amount_Exact:'900.00'});
let exported=r.run('poElementExportRows','303');
assert.equal(exported.length,15,JSON.stringify(exported));
assert.deepEqual(clone(r.c.capacityScopes.at(-1)),selected);
assert.deepEqual([...new Set(exported.map(row=>row.budgetItemId))],selected);
for(const id of selected)assert.deepEqual(exported.filter(row=>row.budgetItemId===id).map(row=>row.costElement),['1','2','3','4','5']);
assert.deepEqual(exported.find(row=>row.budgetItemId==='71'&&row.costElement==='4').values.slice(5),[25.5,382,0,30,352],'Export excludes this PO reservation once and preserves existing legacy commitments');
assert.deepEqual(exported.find(row=>row.budgetItemId==='73'&&row.costElement==='5').values.slice(5),[0,510,4,50,464],'Only this captured pending modification enters Remaining');
assert.equal(r.c.writes,0);
const scopeCalls=r.c.capacityScopes.length;r.c.tables.PO_Item=r.c.tables.PO_Item.filter(row=>row.Revision!=='saved-revision');
exported=r.run('poElementExportRows','303');
assert.deepEqual(exported,[]);
assert.equal(r.c.capacityScopes.length,scopeCalls,'An empty current revision cannot expand into a whole-budget balance read');

// Exercise the actual Submit entry point, not just its accounting helper. A
// future full-phase call here must fail even though its small fixtures still fit.
const submit=reallocationRuntime();
const originalItem=submit.tables().Budget_Item[0];
for(let index=1;index<3;index++)submit.c.tables.Budget_Item.push({...originalItem,ID:71+index,Cost_Code:3245+index});
for(let index=0;index<224;index++)submit.c.tables.Budget_Item.push({...originalItem,ID:1000+index,Cost_Code:4000+index});
assert.equal(submit.tables().Budget_Item.length,227);
const submitPayload=reallocationPayload();
const lineTemplate=submitPayload.lines[0],reviewTemplate=submitPayload.reallocation.items[0];
const componentTemplate=submitPayload.expectedComponentBalances;
submitPayload.amount='99000.00';
submitPayload.lines=[
  ['71','16000.00'],['71','17000.00'],['72','33000.00'],['73','16000.00'],['73','17000.00']
].map(([id,amount],index)=>({...lineTemplate,key:'submit-capacity-'+index,budgetItemId:id,costCode:'C_EP01-'+(3245+Number(id)-71)+'-4',finalAmount:amount}));
submitPayload.reallocation.items=selected.map(id=>({...structuredClone(reviewTemplate),budgetItemId:id}));
submitPayload.expectedBalances=Object.fromEntries(selected.map(id=>[id,'3400000']));
submitPayload.expectedPendingModifications=Object.fromEntries(selected.map(id=>[id,'0']));
submitPayload.expectedComponentBalances={};
submitPayload.expectedComponentPendingModifications={};
for(const id of selected)for(let element=1;element<=5;element++){
  submitPayload.expectedComponentBalances[id+'|'+element]=componentTemplate['71|'+element];
  submitPayload.expectedComponentPendingModifications[id+'|'+element]='0';
}
vm.runInContext([
  'var submitScopeCalls=[];',
  'var submitScopedCollector=thisapp.poBudgetBalancesForItems;',
  'thisapp.poBudgetBalancesForItems=function(budgetId,items){',
  '  submitScopeCalls.push({budgetId,items:clone(items)});',
  '  return submitScopedCollector(budgetId,items);',
  '};',
  'thisapp.poBudgetBalances=function(){throw Error("Submit must not calculate every item in the phase");};'
].join('\n'),submit.c);
const submitted=submit.call(submitPayload);
assert.equal(submitted.success,true,JSON.stringify(submitted));
assert.deepEqual(clone(submit.c.submitScopeCalls),[{budgetId:'61',items:selected}],'Actual Submit passes only the distinct keys derived from its five validated lines');
assert.equal(submitted.snapshot.lines.length,5);
assert.equal(submitted.snapshot.amount,'99000.00');
assert.equal(submitted.snapshot.status,'Submitted');
assert.deepEqual(submitted.snapshot.approvalBundle.modifications.map(row=>row.budgetItemId),selected);
assert.equal(submit.tables().Budget_Item.length,227,'Submit leaves all unrelated Budget Items intact');
assert.equal(submit.tables().Approval_Route_Snapshot.length,1,'Selected items share the original grouped approval flow');
assert.equal(submit.tables().PO_Phase_Lock.length,0);
assert.equal(submit.tables().PO_Operation[0].Status,'Complete');
console.log('PO Submit entry point: actual five-line/three-item submission on a 227-item phase calls only scoped balances, preserves one approval round, completes its receipt and releases its lock.');

console.log(`PO Submit capacity: actual 227-item full/scoped parity, ${fullReads}/${scopedReads} currency reads, five lines/three items, exact component/approved/pending/legacy math, invalid scopes, current-revision export scope and no writes passed.`);
