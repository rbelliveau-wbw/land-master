import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
function extract(name){const start=source.indexOf(`function ${name}(`);assert.ok(start>=0,name);const line=source.indexOf('\n',start),end=source.slice(start,line).trimEnd().endsWith('}')?line:source.indexOf('\n}',start)+2;return source.slice(start,end);}
const map=source.match(/var BUDGET_ELEMENTS\s*=\s*(\[[\s\S]*?\]);/)[1];
const fields=['Prelim_Labor_Budget','Prelim_Materials_Budget','Prelim_Equipment_Budget','Prelim_Subcontractor_Budget','Prelim_Other_Budget'];
const finalFields=fields.map(field=>field.slice(7));
const BID='4410926000005159046',B2='4410926000005159047',IID='4410926000005159201';
const parts=values=>Object.fromEntries(fields.map((field,index)=>[field,values[index]]));
const final=Object.fromEntries(finalFields.map((field,index)=>[field,(index+1)*100]));
function harness(itemExtra={}){
  const budget={ID:BID,Lot_Total_Residential:3},second={ID:B2,Lot_Total_Residential:4};
  const item={ID:IID,Budget:{ID:BID},Budget_Category:{ID:'dev',zc_display_value:'Development'},Prelim_Budget_Ttl:10,...final,...itemExtra};
  const S={globalMode:'edit',edPhaseIdx:0,edBudget:budget,budgets:[budget,second],categories:{[BID]:[{ID:'dev',Deparment:'Development'},{ID:'eng',Deparment:'Engineering'},{ID:'con',Deparment:'Construction'}],[B2]:[{ID:'other-eng',Deparment:'Engineering'}]},items:{[BID]:[item],[B2]:[]},saveTimers:{}};
  const writes=[],messages=[],statuses=[],marks=[],timers=new Map(),listeners={};let next=0,fail=false,patches=0;
  const context=vm.createContext({S,Number,Promise,window:{},CFG:{forms:{item:'Budget_Item'}},
    findItemById:id=>Object.values(S.items).flat().find(row=>String(row.ID)===String(id)),
    canEditBudget:b=>!b.denied,budgetCategoryIsLocked:b=>!!b.locked,
    metricRaw:(b,field)=>Number(b[field])||0,isReimbursementBudgetItem:it=>!!it?.reimbursement,
    setTimeout:callback=>{const id=++next;timers.set(id,callback);return id;},clearTimeout:id=>timers.delete(id),
    setEdAutosave:state=>statuses.push(state),setMsg:message=>messages.push(message),markInputState:(_node,state)=>marks.push(state),
    auditLog:()=>{},flushBudgetDeferredEditorRefresh:()=>{},
    sdkUpdateRecord:async(form,id,data)=>{writes.push({form,id,data:JSON.parse(JSON.stringify(data))});if(fail)throw Error('Native save failed');return {code:3000};},
    mxEl:{addEventListener:(type,listener)=>{listeners[type]=listener;}},
    refreshBudgetElementValues:()=>patches++,updateCatSubtotal:()=>{},updateProjectMatrixLive:()=>{},
    document:{activeElement:null}
  });
  vm.runInContext(`var BUDGET_ELEMENTS=${map};var BUDGET_UNIT_CHOICES=['Acre','LF','Lot'];\n`+[
    'v','cleanVal','isObj','rawPath','firstRaw','lookupId','catDept','budgetElementNumber','budgetElementSnapshot','budgetElementDepartmentIndex','budgetElementValues',
    'budgetPrelimElementSnapshot','projectBudgetPrelimElements','budgetPrelimElementWrite','finishBudgetPrelimElementSave','budgetPrelimSaveAllowed',
    'budgetUnitNumber','budgetUnitRate','budgetPerUnitEnabled','budgetPerUnitQuantity','budgetPerUnitStatus','syncBudgetPerUnitItem','budgetItemCanEditPerUnit',
    'reimbursementMoneyField','normalizeReimbursementValue','queueSave','queueBudgetPerUnitSave','parseMoney'
  ].map(extract).join('\n'),context);
  const inputAt=source.indexOf('mxEl.addEventListener("input"');
  vm.runInContext(source.slice(inputAt,source.indexOf('mxEl.addEventListener("focusin"',inputAt)),context);
  const settle=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
  async function flush(){const pending=[...timers.values()];timers.clear();pending.forEach(callback=>callback());await settle();}
  return {S,item,budget,second,context,writes,messages,statuses,marks,timers,listeners,flush,settle,setFail:value=>{fail=value;},patches:()=>patches};
}
const plain=value=>JSON.parse(JSON.stringify(value));
let h=harness(parts([null,null,null,null,null]));const finalBefore=JSON.stringify(Object.fromEntries(finalFields.map(field=>[field,h.item[field]])));
h.context.queueSave(IID,'Prelim_Budget_Ttl',12.3456);await h.flush();
assert.equal(h.writes.length,1,'manual parent and derived split use one existing SDK write');
assert.deepEqual(h.writes[0].data,{Prelim_Budget_Ttl:12.3456,...parts([0,0,0,0,12.3456])});
assert.equal(JSON.stringify(Object.fromEntries(finalFields.map(field=>[field,h.item[field]]))),finalBefore,'Preliminary writes never overwrite frozen Final fields');
assert.deepEqual(plain(h.context.budgetElementValues(h.item,'Prelim_Budget_Ttl')),[0,0,0,0,12.3456]);
assert.equal(h.messages.length,0);

h=harness({...parts([0,0,0,0,17]),Budget_Category:{ID:'eng'}});
h.context.projectBudgetPrelimElements(h.item,0);h.context.projectBudgetPrelimElements(h.item,21.25);h.context.queueSave(IID,'Prelim_Budget_Ttl',21.25);await h.flush();
assert.deepEqual(h.writes[0].data,{Prelim_Budget_Ttl:21.25,...parts([0,0,0,0,21.25])},'existing single nondefault allocation survives normal entry, including a zero crossing');
for(const split of [parts([10,20,0,0,0]),{Prelim_Labor_Budget:10}]){
  h=harness(split);h.context.queueSave(IID,'Prelim_Budget_Ttl',50);await h.flush();
  assert.deepEqual(h.writes[0].data,{Prelim_Budget_Ttl:50},'mixed/partial explicit allocations cannot silently redistribute');
  assert.ok(h.messages.at(-1).includes('split needs review'));assert.equal(h.statuses.at(-1),'elements-unavailable');
  for(const field of fields)assert.equal(h.item[field],split[field],'stored split remains unchanged');
}
h=harness();h.context.projectBudgetPrelimElements(h.item,25);h.context.queueSave(IID,'Prelim_Budget_Ttl',25);await h.flush();
assert.deepEqual(h.writes[0].data,{Prelim_Budget_Ttl:25},'unpromoted schema/report does not block existing parent save');
assert.ok(h.messages.at(-1).includes('promote the Preliminary element fields'));assert.equal(h.statuses.at(-1),'elements-unavailable');
assert.ok(fields.every(field=>!Object.hasOwn(h.item,field)),'local projection cannot fabricate report-field capability');
h.context.queueSave(IID,'Prelim_Budget_Ttl',30);await h.flush();assert.deepEqual(h.writes[1].data,{Prelim_Budget_Ttl:30},'a second edit cannot mistake projected fields for promoted metadata');
h=harness(parts([null,null,null,null,null]));h.context.queueSave(IID,'Prelim_Budget_Ttl',12.123456);await h.flush();assert.deepEqual(h.writes[0].data,{Prelim_Budget_Ttl:12.123456},'legacy parent precision remains exact without rounding into four-decimal component fields');assert.match(h.messages.at(-1),/four decimal places/);

h=harness({...parts([null,null,null,null,null]),_perUnit:true,Unit:'Lot',Per_Unit:1.25});
assert.equal(h.context.syncBudgetPerUnitItem(h.budget,h.item),true);assert.equal(h.item.Prelim_Budget_Ttl,3.75);
h.context.queueBudgetPerUnitSave(h.budget,h.item);await h.flush();assert.equal(h.writes.length,1);assert.deepEqual(h.writes[0].data,{Unit:'Lot',Per_Unit:1.25,Prelim_Budget_Ttl:3.75,...parts([0,0,0,0,3.75])},'per-unit path uses the same atomic parent/component payload');
h=harness({...parts([null,null,null,null,null]),reimbursement:true});h.context.queueSave(IID,'Prelim_Budget_Ttl',25.5);await h.flush();assert.deepEqual(h.writes[0].data,{Prelim_Budget_Ttl:-25.5,...parts([0,0,0,0,-25.5])},'reimbursements remain signed credits in both parent and component');

for(const kind of ['locked','denied']){
  h=harness(parts([null,null,null,null,null]));h.budget[kind]=true;h.context.queueSave(IID,'Prelim_Budget_Ttl',20);h.context.queueBudgetPerUnitSave(h.budget,h.item);await h.flush();assert.equal(h.writes.length,0,kind+' blocks both existing write paths');
  h=harness(parts([null,null,null,null,null]));h.context.queueSave(IID,'Prelim_Budget_Ttl',20);h.budget[kind]=true;await h.flush();assert.equal(h.writes.length,0,'a '+kind+' change during debounce cannot write');
}
h=harness(parts([null,null,null,null,null]));h.setFail(true);h.context.queueSave(IID,'Prelim_Budget_Ttl',22);await h.flush();assert.equal(h.writes.length,1);assert.equal(h.statuses.at(-1),'error');assert.ok(h.marks.includes('save-error'));assert.ok(fields.every(field=>h.item[field]===null),'failed native writes cannot publish saved component fields');
h=harness(parts([null,null,null,null,null]));h.context.queueSave(IID,'Prelim_Budget_Ttl',1);h.context.queueSave(IID,'Prelim_Budget_Ttl',2);await h.flush();assert.equal(h.writes.length,1);assert.equal(h.writes[0].data.Prelim_Other_Budget,2,'rapid edits persist only the latest scheduled split');
h=harness();h.context.queueSave(IID,'Description','Note');await h.flush();assert.deepEqual(h.writes[0].data,{Description:'Note'},'unrelated existing note save remains unchanged');

h=harness(parts([null,null,null,null,null]));const eng={ID:'4410926000005159202',Budget:{ID:B2},Budget_Category:{ID:'other-eng'},...parts([null,null,null,null,null]),Prelim_Budget_Ttl:4};h.S.items[B2]=[eng];h.S.edPhaseIdx='all';h.context.queueSave(eng.ID,'Prelim_Budget_Ttl',10.125);await h.flush();assert.deepEqual(h.writes[0].data,{Prelim_Budget_Ttl:10.125,...parts([10.125,0,0,0,0])},'all-phase entry persists the other phase exact item and department');
h=harness(parts([null,null,null,null,null]));const nativeInput={value:'45.1250',dataset:{id:IID,f:'Prelim_Budget_Ttl'},classList:{toggle(){}},closest:selector=>selector==='.ci'?nativeInput:null};h.context.markInputState=()=>{};h.listeners.input({target:nativeInput});assert.equal(h.item.Prelim_Budget_Ttl,45.125);assert.deepEqual(plain(h.item._prelimElementDraft),[0,0,0,0,45.125]);assert.equal(h.patches(),1,'actual typing handler patches child values immediately');assert.equal(h.writes.length,0,'typing preserves the existing blur-save boundary');
console.log('Preliminary element persistence: atomic manual/per-unit writes, proven report capability, pending promotion, precision, explicit outliers, failed/locked/stale saves, all-phase IDs and live child projection passed.');
