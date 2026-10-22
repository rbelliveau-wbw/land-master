import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app='widgets/land-master/src/app/';
const source=fs.readFileSync(app+'widget.html','utf8');
const c=vm.createContext({Date});c.window=c;
vm.runInContext(fs.readFileSync(app+'property-workspace.js','utf8'),c);
const ui=c.LMPropertyWorkspace,P='90071992547409931',C1='90071992547409932',C2='90071992547409933',T='90071992547409934';
const properties=[{ID:P,Company1:{ID:C1},Acres:'241.5000'}];
const valid={Property:P,From_Company:C1,To_Company:C2,Transfer_Date:'2026-10-14',Transfer_Type:'Plat Recordation',Status:'Pending',Transfer_Scope:'Full'};
for(const type of ui.types)for(const status of ui.statuses)assert.equal(ui.validateTransfer({...valid,Transfer_Type:type,Status:status},properties),null);
for(const [patch,field] of [
  [{To_Company:C1},'To_Company'],[{Property:90071992547409930},'Property'],[{Transfer_Date:'2026-02-29'},'Transfer_Date'],[{Transfer_Type:'Other'},'Transfer_Type'],[{Status:'Complete'},'Status'],
  [{Transfer_Scope:'Partial'},'Amount_Unit'],[{Transfer_Scope:'Partial',Amount_Unit:'Acres',Amount_Transferred:'0'},'Amount_Transferred'],
  [{Transfer_Scope:'Partial',Amount_Unit:'Percentage',Amount_Transferred:'100'},'Amount_Transferred'],[{Transfer_Scope:'Partial',Amount_Unit:'Acres',Amount_Transferred:'241.5'},'Amount_Transferred'],
  [{Transfer_Scope:'Partial',Amount_Unit:'Percentage',Amount_Transferred:'25.12345'},'Amount_Transferred']
])assert.equal(ui.validateTransfer({...valid,...patch},properties).field,field);
assert.equal(ui.validateTransfer({...valid,Transfer_Scope:'Partial',Amount_Unit:'Percentage',Amount_Transferred:'25.1250'},properties),null);
assert.equal(ui.validateTransfer({...valid,Transfer_Scope:'Partial',Amount_Unit:'Acres',Amount_Transferred:'0.0001'},properties),null);
assert.equal(ui.parseDate('02/29/2028'),'2028-02-29');assert.equal(ui.parseDate('02/29/2026'),'');assert.equal(ui.parseDate('10/14/2026'),'2026-10-14');
assert.match(ui.dateField({k:'Transfer_Date',label:'Effective date',req:1},valid.Transfer_Date),/type="hidden".*data-ftype="date"/);
assert.doesNotMatch(ui.dateField({k:'Transfer_Date',label:'Effective date'},valid.Transfer_Date),/\stype="date"/);
const F=(k,label,type,v,extra)=>({k,label,type,v,...extra}),fields=ui.transferFields({Property:{ID:P},From_Company:{ID:C1},To_Company:{ID:C2},Status:'Pending'},F);
assert.equal(fields.filter(f=>f.req).length,7);assert.ok(fields.every(f=>!f.k.includes('Attachment')));
const propertyFields=JSON.parse(fs.readFileSync('creator/generated/fields/Property.json','utf8')).fields.filter(f=>!['section','submit','reset','cancel'].includes(f.type)).map(f=>({k:f.link_name}));
const html=ui.propertyHTML(propertyFields,f=>`<input data-field="${f.k}">`);
for(const f of propertyFields)assert.equal(html.split(`data-field="${f.k}"`).length-1,1,`Retain ${f.k} exactly once in grouped property details`);
assert.doesNotMatch(ui.auditHTML({Added_User:'<script>alert(1)</script>'}),/<script>/);
assert.match(source,/'propertyTransfer','Property Transfer'/);
assert.match(source,/id:"transfers",label:"Property Transfers"/);
const workflow=fs.readFileSync('creator/workflows/Validate_Property_Transfe.dg','utf8');
assert.doesNotMatch(workflow,/\.Company1\s*=|update |insert into|delete from/,'Transfer validation never mutates ownership');
assert.match(workflow,/input\.Amount_Transferred = null/);

function actual(name){const start=source.indexOf('function '+name+'('),end=source.indexOf('\nfunction ',start+1);assert.ok(start>=0&&end>start,name);return source.slice(start,end);}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject};}
let generation=0,scope='DEVELOPMENT:fixture',reads=[],writes=[],paint=0,held=null;
const historyNode={innerHTML:''},tab={querySelector:()=>null,append(){}};
const h=vm.createContext({
  S:{demo:false,liveSDK:true,navigationToken:1,modalOpen:true,editorType:'property',editorId:P,modalTab:'transfers',panelDirty:false,panelSaving:false,propertyTransfers:[],transferHistory:{},properties},
  LandData:{generation:()=>generation},landCreateScope:()=>scope,
  sdkGetAll:async(report,criteria,progress,options)=>{reads.push({report,criteria,options});return held?held.promise:[{ID:T,Property:{ID:P},Transfer_Date:'14-Oct-2026'}];},
  lookupId:v=>v?.ID||'',errMeta:e=>e.message||String(e),auditOnly(){},$:id=>id==='propertyTransferHistory'?historyNode:null,
  propertyTransferRowsHTML:rows=>{paint++;return rows.length+' rows'},
  document:{querySelector:selector=>selector.endsWith('.record-tab-count')?null:tab,createElement:()=>({className:'',textContent:''})}
});
for(const name of ['propertyTransferScope','ensurePropertyTransferBackend','propertyTransferCount','loadPropertyTransferHistory'])vm.runInContext(actual(name),h);
assert.equal(reads.length,0,'Transfers make no startup calls');
await h.loadPropertyTransferHistory(P,false);assert.equal(reads.length,1);assert.equal(reads[0].criteria,'(Property == '+P+')');assert.equal(h.propertyTransferCount(P),1);assert.equal(paint,1);
await h.loadPropertyTransferHistory(P,false);assert.equal(reads.length,1,'Cached property reopening makes no new read');
held=deferred();const pending=h.loadPropertyTransferHistory(P,true);h.S.navigationToken++;h.S.modalTab='details';held.resolve([{ID:T,Property:{ID:P}}]);await pending;assert.equal(paint,1,'Late histories never replace the newer editor/tab');
held=deferred();const stale=h.loadPropertyTransferHistory(P,true);generation++;held.resolve([{ID:T,Property:{ID:P}}]);await stale;assert.equal(h.propertyTransferCount(P),null,'Old generations cannot claim a complete count');
held=null;h.S.modalTab='transfers';await h.loadPropertyTransferHistory(P,true);assert.equal(h.propertyTransferCount(P),1);
held=deferred();const wrong=h.loadPropertyTransferHistory(P,true);held.resolve([{ID:T,Property:{ID:C2}}]);await wrong;assert.equal(h.S.transferHistory[P].status,'error','Reject wrong-property results rather than expose them');
held=deferred();const missing=h.ensurePropertyTransferBackend(generation);held.reject(new Error('Report unavailable'));await assert.rejects(missing);assert.equal(h.S.transferCapability,null,'Missing backend remains retryable');
held=null;await h.ensurePropertyTransferBackend(generation);const capabilityReads=reads.length;await h.ensurePropertyTransferBackend(generation);assert.equal(reads.length,capabilityReads);

// Execute the actual native add path, including exact IDs and ambiguous-reply quarantine.
const create=vm.createContext({S:{demo:false,liveSDK:true,propertyTransfers:[]},landCreateScope:()=>scope,LMData:{request:async(task,fn)=>fn(),responseFailed:()=>false},ZOHO:{CREATOR:{DATA:{addRecords:async config=>{writes.push(config);return{code:3000,data:{ID:T}};}}}},listForType:()=>[],errMeta:()=>'',});create.window=create;
for(const name of ['responseBad','isSuccess','requireMutationSuccess','formForType','extractRecordId','landCreateFreeze','landCreateKey','landCreateStore','landCreateCandidateId','landCreateFailure','createRecord','landCreateFieldType','landCreateDecimal','landCreateDate','landCreateLookup','landCreateComparable','landCreatePayloadMatches'])vm.runInContext(actual(name),create);
const payload={...valid,Transfer_Date:'14-Oct-2026',Transfer_Scope:'Partial',Amount_Unit:'Percentage',Amount_Transferred:'25.1250'};
await create.createRecord('propertyTransfer',payload);assert.equal(writes.length,1);assert.equal(writes[0].form_name,'Property_Transfer');assert.equal(writes[0].payload.data.Property,P);assert.equal(writes[0].payload.data.Amount_Transferred,'25.1250');assert.equal(writes[0].skip_workflow,undefined);
assert.equal(JSON.stringify(properties),JSON.stringify([{ID:P,Company1:{ID:C1},Acres:'241.5000'}]),'No property or Company mutation occurs');
assert.ok(create.landCreatePayloadMatches({...payload,Property:{ID:P},From_Company:{ID:C1},To_Company:{ID:C2},Amount_Transferred:'25.125',Transfer_Date:'10/14/2026'},payload,'propertyTransfer'),'Read-only ambiguous recovery uses native lookup, decimal and date types');
create.ZOHO.CREATOR.DATA.addRecords=async config=>{writes.push(config);return{code:3000}};
await assert.rejects(create.createRecord('propertyTransfer',payload));assert.ok(create.S.createReviews.propertyTransfer);const before=writes.length;await assert.rejects(create.createRecord('propertyTransfer',payload));assert.equal(writes.length,before,'Unknown transfer inserts cannot be replayed');
console.log('PASS: Property transfer validation, scoped lazy history, stale guards, exact native create IDs/decimals, no ownership writes, unknown-create quarantine, and complete grouped property fields.');

// Execute the actual native recalculation with native lookup objects and exact
// string record identities. The adapter replaces Creator queries only.
const activitySource=fs.readFileSync('creator/functions/syncExternalTransferActivity.dg','utf8');
const candidateCriteria=activitySource.match(/propertyRows = Property\[([^\n]+)\];/)[1]
  .replace(/\bID\b/g,'row.ID').replace(/\bExternal_Transfer_Inactive\b/g,'row.External_Transfer_Inactive');
const transferCriteria=activitySource.match(/qualifyingCount = Property_Transfer\[([^\n]+)\]\.count\(\);/)[1]
  .replace(/\bProperty\b/g,'fixtureLookup(transfer.Property)')
  .replace(/\b(Transfer_Type|Transfer_Scope|Status)\b/g,'transfer.$1');
const nativeProperties=[{ID:P,Company1:{ID:C1},External_Transfer_Inactive:false},{ID:C2,Company1:{ID:C2},External_Transfer_Inactive:true}];
let nativeTransfers=[];
const activity=vm.createContext({ifnull:(value,fallback)=>value??fallback,
  fixtureLookup:value=>typeof value==='string'?value:value?.ID,
  Map:()=>({put(key,value){this[key]=value;}})});
const candidateMatch=vm.runInContext(`(row,propertyRecordId)=>${candidateCriteria}`,activity);
const transferMatch=vm.runInContext(`(transfer,propertyRow)=>${transferCriteria}`,activity);
activity.fixtureCandidates=id=>nativeProperties.filter(row=>candidateMatch(row,id));
activity.fixtureCount=row=>nativeTransfers.filter(transfer=>transferMatch(transfer,row)).length;
vm.runInContext('String.prototype.matches=function(pattern){return new RegExp("^(?:"+pattern+")$").test(this);};',activity);
const executable=activitySource.replace(/^map syncExternalTransferActivity\(string propertyId\)\s*\{/,
  'function syncExternalTransferActivity(propertyId){var propertyRecordId,updatedCount,propertyRows,propertyRow,qualifyingCount,inactive,result;')
  .replace('propertyId.toLong()','propertyId')
  .replace(/propertyRows = Property\[[^\n]+\];/,'propertyRows = fixtureCandidates(propertyRecordId);')
  .replace(/qualifyingCount = Property_Transfer\[[^\n]+\]\.count\(\);/,'qualifyingCount = fixtureCount(propertyRow);')
  .replace('for each propertyRow in propertyRows','for (propertyRow of propertyRows)');
vm.runInContext(executable,activity);
const ownershipBefore=JSON.stringify(nativeProperties.map(row=>row.Company1));
for(const [type,scope,status,expected] of [
  ['External','Full','Completed',true],['External','Full','CAD Verified',true],
  ['External','Full','Pending',false],['External','Full','Cancelled',false],
  ['External','Partial','Completed',false],['External','Partial','CAD Verified',false],
  ['Land Investment','Full','Completed',false]
]){
  nativeTransfers=[{ID:T,Property:{ID:P},Transfer_Type:type,Transfer_Scope:scope,Status:status}];
  activity.syncExternalTransferActivity(P);
  assert.equal(nativeProperties[0].External_Transfer_Inactive,expected,[type,scope,status].join('/'));
  assert.equal(nativeProperties[1].External_Transfer_Inactive,false,'An obsolete inactive flag is cleared');
  assert.equal(ui.makesInactive(nativeTransfers[0]),expected,'Demo and native rules agree');
}
nativeTransfers=[{ID:T,Property:{ID:P},Transfer_Type:'External',Transfer_Scope:'Full',Status:'Completed'},
  {ID:C1,Property:{ID:P},Transfer_Type:'External',Transfer_Scope:'Full',Status:'CAD Verified'}];
activity.syncExternalTransferActivity(P);nativeTransfers[0].Status='Cancelled';activity.syncExternalTransferActivity(P);
assert.equal(nativeProperties[0].External_Transfer_Inactive,true,'Another qualifying transfer keeps the property inactive');
nativeTransfers=[{ID:T,Property:{ID:P},Transfer_Type:'External',Transfer_Scope:'Full',Status:'Completed'}];
activity.syncExternalTransferActivity(P);nativeTransfers[0].Property={ID:C2};activity.syncExternalTransferActivity(C2);
assert.equal(nativeProperties[0].External_Transfer_Inactive,false,'Correcting the Property lookup restores the former property');
assert.equal(nativeProperties[1].External_Transfer_Inactive,true);
nativeTransfers=[];activity.syncExternalTransferActivity(C2);
assert.equal(nativeProperties[1].External_Transfer_Inactive,false,'Deleting the last qualifying transfer restores activity');
assert.throws(()=>activity.syncExternalTransferActivity('wrong-id'));
assert.equal(JSON.stringify(nativeProperties.map(row=>row.Company1)),ownershipBefore,'Activity never edits ownership');
assert.deepEqual([...activitySource.matchAll(/^\s*propertyRow\.(\w+)\s*=/gm)].map(m=>m[1]),['External_Transfer_Inactive']);
assert.equal(ui.statuses.includes('Draft'),false);assert.ok(ui.types.includes('External'));assert.ok(ui.statuses.includes('CAD Verified'));

// Exercise the actual main-list filter using native boolean/string values.
const filterContext=vm.createContext({S:{scope:'props',search:'',filters:{activity:['Active']},issuesOnly:false,sortKey:null},
  currentList:()=>[{ID:P},{ID:C1,External_Transfer_Inactive:false},{ID:C2,External_Transfer_Inactive:'true'}],
  cols:()=>[],colValue:(row,key)=>row[key],isIssue:()=>false});
vm.runInContext(actual('truthy'),filterContext);
vm.runInContext(source.slice(source.indexOf('var FILTER_DEFS='),source.indexOf('\nfunction mergeFilterValues')),filterContext);
vm.runInContext(actual('visibleList'),filterContext);
assert.deepEqual(Array.from(filterContext.visibleList(),row=>row.ID),[P,C1],'Active is the default, including legacy blank flags');
filterContext.S.filters.activity=['Inactive'];assert.deepEqual(Array.from(filterContext.visibleList(),row=>row.ID),[C2]);
filterContext.S.filters.activity=[];assert.equal(filterContext.visibleList().length,3,'Clearing Activity shows both');
assert.match(source,/activity:\["Active"\]/);assert.match(source,/data-filter-key="activity"/);

// Transfer success refreshes affected parents without replaying any write.
let activityReply=[{ID:P,External_Transfer_Inactive:true},{ID:C2,External_Transfer_Inactive:false}],activityReads=0;
const refresh=vm.createContext({S:{demo:false,modalOpen:false,properties:[{ID:P},{ID:C2}]},LandData:{generation:()=>1},
  LMLandData:{cancelled:()=>Object.assign(new Error('stale'),{cancelled:true})},propertyTransferScope:()=>scope,
  sdkGetAll:async(report,criteria)=>{activityReads++;assert.equal(report,'All_Property');assert.ok(criteria.includes(P)&&criteria.includes(C2));return activityReply;},
  recordFor:(type,id)=>refresh.S.properties.find(row=>row.ID===id),renderCounts(){},renderTable(){}});
vm.runInContext(actual('readPropertyActivity'),refresh);
vm.runInContext(actual('refreshTransferredProperties'),refresh);
await refresh.refreshTransferredProperties([P,C2],1);assert.equal(activityReads,1);assert.equal(refresh.S.properties[0].External_Transfer_Inactive,true);
activityReply=[{ID:P,External_Transfer_Inactive:false}];await assert.rejects(refresh.refreshTransferredProperties([P,C2],1));
assert.equal(refresh.S.properties[0].External_Transfer_Inactive,true,'Incomplete reads cannot partially replace activity flags');
console.log('PASS: External full/final activity, partial/pending/cancelled exclusions, corrected/deleted transfers, unchanged ownership, Active/Inactive/All filtering and scoped atomic parent refresh.');

// Live Creator omits this new checkbox from the existing report layout. The
// same report's native criteria still identifies inactive records, including a
// scoped parent refresh, without access to anyone else's transfer history.
let fallbackRows=[{ID:P}],fallbackReads=[];
const fallback=vm.createContext({sdkGetAll:async(report,criteria,progress,options)=>{fallbackReads.push({report,criteria,options});return fallbackRows;},LMLandData:{cancelled:()=>Object.assign(new Error('stale'),{cancelled:true})}});
vm.runInContext(actual('readPropertyActivity'),fallback);
const hiddenRows=[{ID:P,Company1:{ID:C1}},{ID:C2}];
let hydrated=await fallback.readPropertyActivity(hiddenRows,null,{});
assert.equal(hydrated[0].External_Transfer_Inactive,true);assert.equal(hydrated[1].External_Transfer_Inactive,false);
assert.equal(hiddenRows[0].External_Transfer_Inactive,undefined,'Hydration is atomic and leaves input rows unchanged');
assert.equal(fallbackReads[0].report,'All_Property');assert.equal(fallbackReads[0].criteria,'(External_Transfer_Inactive == true)');
const scoped='(ID == '+P+')';await fallback.readPropertyActivity([hiddenRows[0]],scoped,{});assert.equal(fallbackReads[1].criteria,'(External_Transfer_Inactive == true) && ('+scoped+')');
fallbackRows=[{ID:T}];await assert.rejects(fallback.readPropertyActivity(hiddenRows,null,{}),/Unexpected inactive Property identity/);
fallbackRows=[{ID:P},{ID:P}];await assert.rejects(fallback.readPropertyActivity(hiddenRows,null,{}),/Unexpected inactive Property identity/);
fallbackRows=[{ID:P}];await assert.rejects(fallback.readPropertyActivity(hiddenRows,null,{isCancelled:()=>true}),error=>error.cancelled);
const priorReadCount=fallbackReads.length;await fallback.readPropertyActivity([{ID:P,External_Transfer_Inactive:false}],null,{});assert.equal(fallbackReads.length,priorReadCount,'A report that already exposes the flag needs no extra query');
console.log('PASS: Hidden native checkbox hydration uses the same permission-scoped Property report, exact identities, server-side criteria and stale guards.');
