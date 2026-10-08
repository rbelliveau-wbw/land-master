import assert from 'node:assert/strict';
import {ready,drain,deferred,ID,ACTION,NEW} from './test-contract-sdk-v2-foundation.mjs';
function input(h,value,grid=false){const el=h.node('inline-field');el.value=value;el.isConnected=true;el.setAttribute(grid?'data-id':'data-aid',ACTION);el.setAttribute(grid?'data-f':'data-af','Dev_Notes');return el;}
// Regression for the production "Captured action batch stopped / different Dev_Notes" report.
{
 const h=await ready({actionsCount:2,criticalReporter:true}),second=h.reports.All_Contract_Actions[1].ID,native=h.api.updateRecordById;
 h.api.updateRecordById=async config=>{const reply=await native(config);h.reports.All_Contract_Actions.find(row=>row.ID===config.id).Dev_Notes='<p>'+config.payload.data.Dev_Notes+'</p>';return reply;};
 assert.equal(await h.c.contractActionBatch([[ACTION,{Dev_Notes:'First note'}],[second,{Dev_Notes:'Second note'}]],false),true);
 assert.equal(h.calls.filter(call=>call.method==='update').length,2,'a changed readback must not stop the next action');
 assert.equal(h.c.contractHasReviews(),false);
 assert.equal(h.c.S.audit.some(row=>row.type==='error'),false,'no critical-error breadcrumb from returned note formatting');
 assert.equal(h.calls.some(call=>call.method==='custom'&&/Report_Proforma_Widget_Error|reportProformaWidgetError/.test(call.config.api_name)),false,'no critical report dispatched');
}
{
 const h=await ready(),el=input(h,'typed first'),waits=[],configs=[],nativeUpdate=h.api.updateRecordById;
 h.api.updateRecordById=config=>{configs.push(structuredClone(config));const gate=deferred();waits.push(gate);return gate.promise.then(()=>nativeUpdate(config));};
 const first=h.c.afSave(el);await drain();assert.equal(configs.length,1);el.value='typed newer';const second=h.c.afSave(el);await drain();assert.equal(configs.length,1,'later revision queues until prior verification finishes');
 assert.equal(configs[0].payload.data.Dev_Notes,'typed first');waits[0].resolve();await drain();assert.equal(await first,true);assert.equal(configs.length,2);assert.equal(h.c.findAction(ACTION).Dev_Notes,'typed newer');assert.equal(el.classList.contains('saved-ok'),false,'older successful revision cannot mark newer text Saved');
 assert.equal(configs[1].payload.data.Dev_Notes,'typed newer');waits[1].resolve();await drain();assert.equal(await second,true);assert.equal(h.reports.All_Contract_Actions[0].Dev_Notes,'typed newer');assert.equal(el.classList.contains('saved-ok'),true);assert.equal(h.c.contractHasFieldDrafts(),false);
}
for(const envelope of [{code:3000},{code:3000,data:{ID:ACTION,status:'failure'}},{code:3000,data:{ID:ID}},{code:3000,data:{ID:ACTION},result:[{code:3000,data:{ID:ACTION}}]},{code:3000,result:[{code:3000,data:{ID:ACTION},result:[{code:2899}]}]}]){
 const h=await ready(),el=input(h,'retained unknown',true);let calls=0;h.api.updateRecordById=async config=>{calls++;h.reports.All_Contract_Actions[0].Dev_Notes=config.payload.data.Dev_Notes;return envelope;};
 assert.equal(await h.c.gSaveField(el),false);assert.equal(calls,1);assert.equal(h.c.findAction(ACTION).Dev_Notes,'retained unknown');assert.equal(el.value,'retained unknown');assert.equal(el.classList.contains('eg-saved'),false);assert.equal(el.classList.contains('save-err'),true);assert.equal(await h.c.loadData(),false,'refresh cannot erase retained failed/unknown draft');
 await h.c.gSaveField(el);assert.equal(calls,1,'unknown outcome blocks same-field second action');const key=h.c.contractFieldKey(ACTION,'Dev_Notes');assert.equal(await h.c.contractRecheckField(key),true,'read-only exact captured ID/value resolves an applied-but-unknown acknowledgement');assert.equal(calls,1);assert.equal(h.c.contractHasFieldDrafts(),false);
}
{
 const h=await ready(),el=input(h,'retained rejected'),nativeUpdate=h.api.updateRecordById;let calls=0;h.api.updateRecordById=async()=>{calls++;return {code:2945,message:'Invalid input'};};
 assert.equal(await h.c.afSave(el),false);assert.equal(calls,1);assert.equal(el.value,'retained rejected');assert.equal(h.c.findAction(ACTION).Dev_Notes,'retained rejected');assert.equal(el.classList.contains('saved-ok'),false);assert.equal(h.c.contractFieldDrafts()[h.c.contractFieldKey(ACTION,'Dev_Notes')].status,'failed');
 h.api.updateRecordById=nativeUpdate;assert.equal(await h.c.afSave(el),true,'a definite native rejection permits a later explicit corrected retry');
}
{
 const h=await ready(),el=input(h,'before late reply'),gate=deferred(),nativeUpdate=h.api.updateRecordById;h.api.updateRecordById=config=>gate.promise.then(()=>nativeUpdate(config));
 const save=h.c.afSave(el);await drain();h.c.S.contractNavigationGeneration++;el.isConnected=false;h.c.S.selId='another-contract';gate.resolve();assert.equal(await save,true);assert.equal(el.classList.contains('saved-ok'),false);assert.equal(h.c.S.selId,'another-contract','late response cannot navigate or paint another selected contract');
}
{
 const h=await ready(),el=input(h,'blocked during reload'),gate=deferred(),nativeRecords=h.api.getRecords;h.api.getRecords=config=>config.report_name==='All_Contract_Actions'?gate.promise.then(()=>nativeRecords(config)):nativeRecords(config);
 const binding=h.c.findAction(ACTION),refresh=h.c.loadData();await drain();assert.equal(h.c.S.coreRefreshing,true);assert.equal(h.c.findAction(ACTION),binding,'atomic refresh retains current bindings until complete');assert.equal(el.disabled,true);
 const before=h.calls.filter(call=>call.method==='update').length;assert.equal(await h.c.afSave(el),false);assert.equal(h.calls.filter(call=>call.method==='update').length,before);gate.resolve();assert.equal(await refresh,true);assert.equal(h.c.S.coreReady,true);
}
console.log('PASS whole Contracts inline controller: immutable revision queue, exact record confirmation before Saved, failed/newer draft retention, uncertain one-call/manual recheck, late navigation and atomic refresh edit/write gate.');
{
 const h=await ready({realDOM:true}),PRICE=(BigInt(NEW)+110n).toString(),row={ID:PRICE,Contract1:{ID},Lot_Size:'40',Price_per_Ft:'100',Base_Price:'4000',Escalator:''};h.reports.Contract_Pricing_Report=[row];h.c.S.pricing=structuredClone([row]);const el=h.c.document.createElement('input');el.value='125';h.c.document.body.appendChild(el);let writes=0;
 h.api.updateRecordById=async config=>{writes++;Object.assign(row,structuredClone(config.payload.data));return {code:3000,data:{ID:PRICE},details:{code:2899}};};assert.equal(await h.c.prSave(PRICE,el.value,el),false);assert.equal(el.value,'125');assert.equal(el.classList.contains('dirty'),true);assert.equal(el.classList.contains('saved-ok'),false);assert.equal(await h.c.loadData(),false);assert.equal(await h.c.prSave(PRICE,'150',el),false);assert.equal(writes,1);assert.equal(await h.c.contractRecheckPricing(PRICE+':Price_per_Ft'),true);assert.equal(writes,1);assert.equal(h.c.findPricing(PRICE).Base_Price,5000);assert.equal(el.classList.contains('dirty'),false);
}
console.log('PASS actual pricing inline failed/unknown draft retention, no Saved/no second send, refresh gate and exact-ID/financial-payload read-only recovery.');
for(const entered of ['-$9,007,199,254,740,993.123456','($9,007,199,254,740,993.123456)','−$9,007,199,254,740,993.123456']){
 const h=await ready(),PRICE=(BigInt(NEW)+111n).toString(),row={ID:PRICE,Contract1:{ID},Lot_Size:'40',Price_per_Ft:'100',Base_Price:'4000'},el=h.node('exact-price');h.reports.Contract_Pricing_Report=[row];h.c.S.pricing=structuredClone([row]);el.value=entered;el.isConnected=true;
 const native=h.api.updateRecordById;h.api.updateRecordById=async config=>{const response=await native(config);row.Price_per_Ft='−$9,007,199,254,740,993.12345600';return response;};
 assert.equal(await h.c.prSave(PRICE,el.value,el),true);const sent=h.calls.find(call=>call.method==='update').config.payload.data;
 assert.equal(sent.Price_per_Ft,'-9007199254740993.123456','Actual pricing payload keeps all entered monetary digits');assert.equal(sent.Base_Price,40*Number('-9007199254740993.123456'),'Calculated base price keeps its numeric calculation');assert.equal(el.classList.contains('saved-ok'),true);assert.equal(h.c.contractHasReviews(),false);
}
{
 const h=await ready(),PRICE=(BigInt(NEW)+112n).toString(),row={ID:PRICE,Contract1:{ID},Lot_Size:'40',Price_per_Ft:'100',Base_Price:'4000'},el=h.node('lost-price-digit');h.reports.Contract_Pricing_Report=[row];h.c.S.pricing=structuredClone([row]);el.value='9007199254740993.123456';el.isConnected=true;
 const native=h.api.updateRecordById;h.api.updateRecordById=async config=>{const response=await native(config);row.Price_per_Ft='9007199254740993.123455';return response;};
 assert.equal(await h.c.prSave(PRICE,el.value,el),true);assert.equal(h.calls.find(call=>call.method==="update").config.payload.data.Price_per_Ft,el.value);assert.equal(h.c.contractHasReviews(),false);assert.equal(el.classList.contains("saved-ok"),true);assert.equal(h.calls.filter(call=>call.method==="update").length,1);
}
{
 const h=await ready();h.node('prNewSize').value='40';h.node('prNewPpf').value='$ 12,345,678.123456';h.node('prNewEsc').value='';h.c.prAdd(ID);await drain();
 const sent=h.calls.find(call=>call.method==='add'&&call.config.form_name==='Contract_Pricing').config.payload.data;
 assert.equal(sent.Price_per_Ft,'12345678.123456');assert.equal(sent.Base_Price,40*Number('12345678.123456'));assert.equal(sent.Lot_Size,40);assert.equal(sent.Contract1,ID);assert.equal(h.c.contractHasReviews(),false);
}
{
 const h=await ready(),PRICE=(BigInt(NEW)+113n).toString(),row={ID:PRICE,Contract1:{ID},Lot_Size:'40',Price_per_Ft:'100',Base_Price:'4000'};h.reports.Contract_Pricing_Report=[row];h.c.S.pricing=structuredClone([row]);
 const native=h.api.updateRecordById;h.api.updateRecordById=async config=>{const response=await native(config);row.Price_per_Ft='$0.000000010000';row.Base_Price='$0.0000004000';return response;};assert.equal(await h.c.prSave(PRICE,'0.00000001',h.node('tiny-price')),true);assert.equal(h.calls.find(call=>call.method==='update').config.payload.data.Price_per_Ft,'0.00000001');
}
for(const malformed of ['-$-12.34','(-$12.34)','$12,34.56','($12.34','1e3']){
 const h=await ready(),PRICE=(BigInt(NEW)+114n).toString(),row={ID:PRICE,Contract1:{ID},Lot_Size:'40',Price_per_Ft:'100',Base_Price:'4000'};h.reports.Contract_Pricing_Report=[row];h.c.S.pricing=structuredClone([row]);assert.equal(await h.c.prSave(PRICE,malformed,h.node('invalid-price')),false);assert.equal(h.calls.filter(call=>call.method==='update').length,0,'Malformed money cannot be rewritten as zero');
}
console.log('PASS actual pricing edit/add payload preserves exact entered money, equivalent native credit formats, acknowledged high-precision differences, numeric computed totals, small decimal calculations and malformed-input write exclusion.');
