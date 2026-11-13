import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
function extract(name){const start=source.indexOf(`function ${name}(`);assert.ok(start>=0,name);const line=source.indexOf('\n',start),end=source.slice(start,line).trimEnd().endsWith('}')?line:source.indexOf('\n}',start)+2;return source.slice(start,end);}
const map=source.match(/var BUDGET_ELEMENTS\s*=\s*(\[[\s\S]*?\]);/)[1];
const BID='4410926000005159046',IID='4410926000005159201',MID='4410926000005159301';
const fields=['Labor_Budget','Materials_Budget','Equipment_Budget','Subcontractor_Budget','Other_Budget'];
const parts=values=>Object.fromEntries(fields.map((field,index)=>[field,values[index]]));
const state={edBudget:{ID:BID},categories:{[BID]:[{ID:'dev',Deparment:'Development'},{ID:'eng',Deparment:'Engineering'},{ID:'con',Deparment:'Construction'}]},modifications:[]};
const item={ID:IID,Budget:{ID:BID},Budget_Category:{ID:'con'},Budget_Ttl:'1500',...parts([100,200,300,400,500])};
const nodes={modAmt:{value:'12.50'},modReason:{value:'Native element fixture'},modRef:{value:'CO-123'},modDate:{value:'11/03/2026'},modSubmitBtn:{}};
const writes=[],api=[],toasts=[];let action;
const context=vm.createContext({S:state,findItemById:id=>String(id)===IID?item:null,budgetModsReady:()=>true,
  $:id=>nodes[id],requireBudgetModsReady:()=>true,approvalProgress:null,modTrackForItem:()=> 'Construction',
  toastShow:value=>toasts.push(value),setMsg:()=>{},renderModModal:()=>{},auditLog:()=>{},shortErr:String,
  budgetNavigationToken:()=> 'scope',budgetNavigationCurrent:()=>false,closeModModal:()=>{state.modModal=null;},
  openModificationProgress:(_id,_bid,_trigger,callback)=>{action=callback();},
  sdkRunBudgetFunction:async(name,args)=>{api.push({name,args});return {result:'ok'};},
  sdkUpdateRecord:async(form,id,data)=>{writes.push({form,id,data});return {code:3000};},
  refreshBudgetWorkflowState:async()=>{},refreshModSurfaces:()=>{},openModDetail:()=>{},
  CFG:{forms:{modification:'Budget_Modification'}}
});
vm.runInContext(`var MOD_REQUEST_TYPES=["Eng","Dev","Muni","Constr","Purch"];var BUDGET_ELEMENTS=${map};\n`+[
  'v','cleanVal','isObj','rawPath','firstRaw','lookupId','lookupMatchesId','catDept','esc','escAttr','modStatusOf','modSignedAmount','modsForItem',
  'budgetElementNumber','budgetElementSnapshot','budgetElementDepartmentIndex','budgetElementValues','budgetPrelimElementSnapshot','budgetElementModAmounts',
  'budgetModSavedElementDetail','fmt','fmtModAmount','budgetModInitialAmounts','budgetModAmountRows','budgetModSignedAmounts','budgetModMultiPayload','budgetModInitialElement','budgetModClassifiedPayload','budgetModComponentPayload','budgetModElementPicker','budgetModElementPreview','submitModification','updateModification'
].map(extract).join('\n'),context);
const plain=value=>JSON.parse(JSON.stringify(value));
assert.equal(context.budgetModInitialElement({...item,Budget_Category:{ID:'dev'}},null),'5');
assert.equal(context.budgetModInitialElement({...item,Budget_Category:{ID:'eng'}},null),'1');
assert.equal(context.budgetModInitialElement(item,null),'5');
assert.equal(context.budgetModInitialElement(item,parts([0,25,0,0,0])),'2','an existing explicit nondefault element is preserved');
assert.equal(context.budgetModInitialElement(item,parts([10,15,0,0,0])),'','mixed legacy modifications require an explicit choice');
assert.equal(context.budgetModInitialElement(item,{Labor_Budget:25}),'','partial legacy allocation cannot silently move elements');
const payload=context.budgetModComponentPayload(12.5,'3');
assert.deepEqual(plain(payload.fields),parts(['0.00','0.00','12.50','0.00','0.00']));
assert.deepEqual(JSON.parse(payload.amount),{contract:'budget-components-v1',components:parts(['0.00','0.00','12.50','0.00','0.00'])});
for(const [amount,element] of [[1,''],[1,'0'],[1,'6'],[0,'1'],[-1,'1'],[1.234,'1'],[NaN,'1'],[Infinity,'1']])assert.throws(()=>context.budgetModComponentPayload(amount,element),'invalid amounts or unselected elements must block writes');
const picker=context.budgetModElementPicker('4',true);assert.match(picker,/id='modElementToggle'[^>]*disabled/);assert.doesNotMatch(picker,/<select/);
for(const label of ['(1) Labor','(2) Materials','(3) Equipment','(4) Subcontractor','(5) Other'])assert.ok(picker.includes(label));
const mod=(ID,amount,type,values)=>({ID,Budget:{ID:BID},Budget_Item:{ID:IID,zc_display_value:'Clearing'},Status:'Approved',Amount:String(amount),Modification_Type:type,...parts(values)});
state.modifications=[mod('prior',50,'Increase',[50,0,0,0,0]),mod(MID,25,'Increase',[0,25,0,0,0]),mod('credit',10,'Decrease',[0,0,10,0,0])];
const before=JSON.stringify({item,mods:state.modifications});
const modal={editId:MID,element:'4',type:'Increase'};
function rows(html){return [...html.matchAll(/<tr data-mod-element-row='(\d)'[^>]*>([\s\S]*?)<\/tr>/g)].map(match=>({key:match[1],values:[...match[2].matchAll(/<td>(.*?)<\/td>/g)].map(cell=>cell[1])}));}
let preview=rows(context.budgetModElementPreview(item,modal,70));
assert.deepEqual(preview[0].values,['$100','$50','$0','$150']);
assert.deepEqual(preview[1].values,['$200','$0','$0','$200'],'the edited approved modification is excluded from prior mods');
assert.deepEqual(preview[2].values,['$300','−$10','$0','$290']);
assert.deepEqual(preview[3].values,['$400','$0','$70','$470']);
preview=rows(context.budgetModElementPreview(item,{...modal,type:'Decrease'},70));assert.deepEqual(preview[3].values,['$400','$0','−$70','$330']);
assert.equal(JSON.stringify({item,mods:state.modifications}),before,'preview never changes native amounts or allocation records');
state.modModal={itemId:IID,type:'Decrease',element:'3',busy:false};context.submitModification();await action;
assert.equal(api.length,1);assert.equal(api[0].name,'createBudgetModification');assert.equal(api[0].args.modType,'Decrease');assert.equal(api[0].args.itemId,IID);assert.deepEqual(JSON.parse(api[0].args.amount),{...JSON.parse(payload.amount),classification:{type:'',comment:''}},'actual create handler sends the selected component envelope');
state.modModal={itemId:IID,editId:MID,type:'Increase',element:'2',busy:false};context.updateModification();for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));
assert.equal(writes.length,1);assert.equal(writes[0].form,'Budget_Modification');assert.equal(writes[0].id,MID);for(const field of fields)assert.equal(writes[0].data[field],field==='Materials_Budget'?'12.50':'0.00');
assert.equal(api.length,2);assert.equal(api[1].name,'modificationAdmin');assert.equal(api[1].args.action,'update');assert.equal(JSON.parse(api[1].args.amount).components.Materials_Budget,'12.50','actual update handler sends the same allocation through admin');
state.modModal={itemId:IID,type:'Increase',element:'',busy:false};context.submitModification();assert.equal(api.length,2,'missing element cannot initiate a write');
console.log('Standalone modification elements: department/existing defaults, explicit choice, five positive component fields, create/update envelopes, independent signed element preview and edit exclusion passed.');

for(const type of ['Eng','Dev','Muni','Constr','Purch']) {
 const result=context.budgetModClassifiedPayload(12.5,'3',{requestType:type,typeComment:'A'.repeat(50)});
 assert.deepEqual(JSON.parse(result.amount).classification,{type,comment:'A'.repeat(50)});
}
assert.throws(()=>context.budgetModClassifiedPayload(12.5,'3',{requestType:'Other'}));
assert.throws(()=>context.budgetModClassifiedPayload(12.5,'3',{typeComment:'A'.repeat(51)}));
state.modModal={itemId:IID,editId:MID,type:'Increase',element:'2',requestType:'Dev',typeComment:'City scope',busy:false};
context.updateModification();for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));
assert.equal(writes.at(-1).data.Type_field,'Dev');assert.equal(writes.at(-1).data.Type_Comment,'City scope');
assert.deepEqual(JSON.parse(api.at(-1).args.amount).classification,{type:'Dev',comment:'City scope'});
console.log('Standalone types: five valid choices, blank legacy values, 50/51-character boundaries and native edit persistence passed.');

// The actual new five-row composer supports mixed signs and net-zero transfers.
function multi(values){const m={itemId:IID,busy:false,elementAmounts:context.budgetModInitialAmounts(null)};values.forEach((n,i)=>{m.elementAmounts[String(i+1)]={amount:String(Math.abs(n)),type:n<0?'Decrease':'Increase'};});return m;}
for(const [values,type,total] of [[[100,-80,0,0,0],'Increase',20],[[-100,80,0,0,0],'Decrease',20],[[100,-100,0,0,0],'Increase',0],[[.1,.2,0,0,0],'Increase',.3]]){
 const modal=multi(values),saved=context.budgetModMultiPayload(modal),envelope=JSON.parse(saved.amount);
 assert.equal(envelope.contract,'budget-components-v2');assert.equal(saved.type,type);assert.equal(saved.total,total);
 const record={Amount:total,Modification_Type:type,Component_Reallocation:true,...saved.fields};
 const reopened=context.budgetModInitialAmounts(record);assert.deepEqual(plain(context.budgetModSignedAmounts({elementAmounts:reopened},true)),values.map(n=>Math.round(n*100)));
 assert.equal(JSON.stringify(modal),JSON.stringify(multi(values)),'serializing cannot mutate the draft');
}
const grid=context.budgetModAmountRows(multi([1,2,3,4,5]));assert.deepEqual([...grid.matchAll(/data-mod-amount-row='(\d)'/g)].map(m=>m[1]),['1','2','3','4','5']);assert.equal((grid.match(/aria-pressed='true'/g)||[]).length,5);assert.doesNotMatch(grid,/<select/);
for(const bad of ['-1','1.001','NaN','Infinity','1e3','abc']){const m=multi([1,0,0,0,0]);m.elementAmounts['1'].amount=bad;assert.throws(()=>context.budgetModMultiPayload(m));}
assert.throws(()=>context.budgetModMultiPayload(multi([0,0,0,0,0])));
let newModal=multi([100,-100,0,0,0]);state.modModal=newModal;const beforeCreate=api.length;context.submitModification();await action;assert.equal(api.length,beforeCreate+1,'one native create for every element');assert.equal(api.at(-1).args.modType,'Increase');assert.equal(JSON.parse(api.at(-1).args.amount).components.Materials_Budget,'-100.00');
newModal={...multi([-100,80,0,0,0]),editId:MID};state.modModal=newModal;context.updateModification();for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(writes.at(-1).data.Amount,'20');assert.equal(writes.at(-1).data.Modification_Type,'Decrease');assert.equal(writes.at(-1).data.Component_Reallocation,true);assert.equal(writes.at(-1).data.Materials_Budget,'-80.00');
const beforeDenied=writes.length;context.sdkRunBudgetFunction=async()=>({result:'ERROR: Unsupported budget component request.'});state.modModal={...multi([10,-5,0,0,0]),editId:MID};context.updateModification();for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(writes.length,beforeDenied,'old/unpromoted native functions cannot leave SDK financial writes behind');
console.log('Five-row modifications: 1–5 order, separate signs, net increase/decrease/zero, exact cents, create/edit round trips, invalid inputs and no SDK writes before native V2 acceptance passed.');

const savedBreakdown=context.budgetModSavedElementDetail({Amount:20,Modification_Type:'Decrease',Component_Reallocation:true,...parts([100,-80,0,0,0])});assert.match(savedBreakdown,/>−\$100</);assert.match(savedBreakdown,/>\+\$80</);assert.match(savedBreakdown,/Gross Changes/);assert.deepEqual([...savedBreakdown.matchAll(/data-mod-element-row='(\d)'/g)].map(m=>m[1]),['1','2','3','4','5']);assert.match(context.budgetModSavedElementDetail({Amount:20,Labor_Budget:20}),/unavailable/);
console.log('Saved approval details retain five ordered signed amounts and net/gross totals without inventing allocations for legacy records.');
