import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app='widgets/land-master/src/app/';
const source=fs.readFileSync(app+'widget.html','utf8');
const c=vm.createContext({Date});c.window=c;
vm.runInContext(fs.readFileSync(app+'property-workspace.js','utf8'),c);
const ui=c.LMPropertyWorkspace,P='90071992547409931',C1='90071992547409932',C2='90071992547409933',T='90071992547409934';
const properties=[{ID:P,Company1:{ID:C1},Acres:'241.5000'}];
const valid={Property:P,From_Company:C1,To_Company:C2,Transfer_Date:'2026-10-14',Transfer_Type:'Plat Recordation',Status:'Draft',Transfer_Scope:'Full'};
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
const F=(k,label,type,v,extra)=>({k,label,type,v,...extra}),fields=ui.transferFields({Property:{ID:P},From_Company:{ID:C1},To_Company:{ID:C2},Status:'Draft'},F);
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
