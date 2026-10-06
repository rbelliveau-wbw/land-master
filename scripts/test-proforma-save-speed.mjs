import assert from 'node:assert/strict';
import fs from 'node:fs';
import {saveFixture} from './fixtures/proforma-sdk-v2-save-fixture.mjs';
import {ID,OTHER,harness,held,drain,clone} from './fixtures/proforma-sdk-v2-harness.mjs';
const references=new Set(['All_Companies','All_Builders','All_Property']);
for(const env of ['DEVELOPMENT','PRODUCTION']){
 const h=await saveFixture({env,directRecord:true,references:false});
 const before=h.calls.length,save=h.widget.saveProforma();
 assert.equal(h.document.getElementById('pfNativeClose').hidden,true);
 assert.equal(h.document.getElementById('pfNativeSpinner').hidden,false);
 assert.equal(h.document.getElementById('pfNativeDone').parentNode.hidden,true);
 await save;await drain();
 assert.equal(h.widget.S.ed.dirty,false);assert.equal(h.widget.PFTransport.snapshot().reviews.length,0);
 assert.equal(h.document.getElementById('pfNativeProgress').hidden,true);
 assert.equal(h.document.getElementById('pfNativeSpinner').hidden,true);
 const calls=h.calls.slice(before);assert.ok(calls.some(call=>call.method==='record'));
 assert.ok(calls.filter(call=>call.method==='record').every(call=>call.config.field_config==='all'&&typeof call.config.id==='string'));
 assert.ok(!calls.some(call=>references.has(call.config.report_name)||call.config.report_name==='All_Budget_Approvals'));
 assert.ok(!calls.some(call=>call.config.report_name==='All_Pro_Formas_All_Fields'&&call.method==='records'&&!call.config.criteria));
 assert.ok(calls.length<35,'Save and refreshed Dashboard must stay below the per-minute budget');
 console.log(env+' complete Save + Dashboard: '+calls.length+' native requests; verified success auto-closes.');
}
{
 const h=harness({directRecord:true,read:cfg=>references.has(cfg.report_name)?Promise.reject(Error('must remain deferred')):undefined});await h.c.__pfBoot;
 await h.widget.openDashboard(ID);await h.widget.openEdit(ID);await drain();
 assert.equal(h.widget.S.ed.id,ID);assert.equal(h.widget.S.ed.loi,null);
 assert.ok(!h.calls.some(call=>references.has(call.config.report_name)||call.config.report_name==='LOI_Worksheet_Report'));
 assert.equal(h.writes.length,0);
 // Offer still loads the full lookup set, without discarding a typed financial draft.
 h.widget.S.ed.model.Name='Typed draft';h.widget.S.ed.dirty=true;
 const model=h.widget.S.ed.model;await h.widget.setPane('loi');await drain();
 assert.equal(h.widget.S.ed.model,model);assert.equal(model.Name,'Typed draft');assert.equal(h.widget.S.ed.dirty,true);
 assert.equal(h.widget.pfReferencesReady(),false,'failed Offer lookup remains unavailable');
}
for(const raw of [{code:2898,message:'Denied'},{code:3000,data:{ID:OTHER}},{code:3000,data:{ID:Number(ID)}},{code:3000,data:{ID},output:{code:2898,error:'Denied'}}]){
 const h=await saveFixture({directRecord:true,record:()=>raw});await h.widget.saveProforma();
 assert.equal(h.widget.S.ed.dirty,true);assert.ok(h.widget.PFTransport.snapshot().reviews.length);
 assert.equal(h.document.getElementById('pfNativeProgress').hidden,false);assert.equal(h.document.getElementById('pfNativeSpinner').hidden,true);
 assert.equal(h.document.getElementById('pfNativeDone').parentNode.hidden,false);
 const writes=h.writes.length;assert.equal(h.widget.saveProforma(),false);assert.equal(h.writes.length,writes);
}
{
 const gate=held(),h=await saveFixture({directRecord:true,record:()=>gate.promise});
 const pending=h.widget.saveProforma();await drain();assert.equal(h.widget.PFTransportUI.close(),false);assert.equal(h.widget.saveProforma(),false);
 h.tick(180000);await pending;assert.equal(h.widget.S.ed.dirty,true);assert.equal(h.document.getElementById('pfNativeProgress').hidden,false);
 gate.resolve({code:3000,data:clone(h.storage.All_Pro_Formas_All_Fields[0])});await drain();
 assert.equal(h.widget.S.ed.dirty,true,'late record response cannot announce successful Save');
}
console.log('PASS Pro Forma direct record verification, deferred Edit/Offer, failed/unknown retention and automatic success dismissal.');

const MIX_SECOND=String(BigInt(OTHER)+1n);
function pricingModel(m){m.lotMix=[{ID:OTHER,Lot_Size_Ft:'50',Lot_Count:'90',Price_LF:'1500'},{ID:MIX_SECOND,Lot_Size_Ft:'40',Lot_Count:'10',Price_LF:'1200'}];}
const persistedPricing=[{ID:OTHER,Pro_Forma:{ID},Lot_Size_Ft:'50.00',Lot_Count:'90',Price_LF:'$ 1,500.00'},{ID:MIX_SECOND,Pro_Forma:{ID},Lot_Size_Ft:'40.00',Lot_Count:'10',Price_LF:'$ 1,200.00'}];
{
 const h=await saveFixture({env:'PRODUCTION',directRecord:true,references:false,source:fs.readFileSync('releases/proforma-manager/1.80.87/index.html','utf8'),storage:{All_Lot_Mix_Rows:persistedPricing},model:pricingModel});
 while(h.c.LMPerf.snapshot().rate.dispatched<23)await h.c.LMData.request('pre-save fixture read',()=>true,{readOnly:true});
 h.c.LMData.configure({maxRequestsPerMinute:45});
 const before=h.calls.length,save=h.widget.saveProforma();await drain();
 assert.equal(h.c.LMPerf.snapshot().rate.reason,'request-budget','released save pauses at the rolling limit');
 assert.equal(h.widget.S.ed.dirty,true);assert.equal(h.widget.saveProforma(),false);
 h.c.LMData.configure({maxRequestsPerMinute:0});await save;await drain();
 assert.equal(h.widget.S.ed.dirty,false);
 assert.equal(h.writes.filter(w=>w.report_name==='All_Lot_Mix_Rows').length,2);
 assert.ok(h.calls.length-before>=24,'released baseline plus 23 previous requests exceeds 45');
 console.log('Released 1.80.87 saved two-row baseline: '+(h.calls.length-before)+' requests; with 23 previous requests it pauses.');
}
for(const env of ['DEVELOPMENT','PRODUCTION']){
 const h=await saveFixture({env,directRecord:true,references:false,storage:{All_Lot_Mix_Rows:persistedPricing},model:pricingModel});
 // Reproduce the user's Save log: 23 requests already in the rolling window.
 const data=h.c.LMData,perf=h.c.LMPerf;
 while(perf.snapshot().rate.dispatched<23)await data.request('pre-save fixture read',()=>true,{readOnly:true});
 data.configure({maxRequestsPerMinute:45});
 assert.equal(perf.snapshot().rate.dispatched,23);
 const before=h.calls.length;let complete=false;const save=h.widget.saveProforma().then(()=>{complete=true;});await drain();
 assert.equal(complete,true,'unchanged two-row save must finish without advancing the rolling window');await save;
 assert.equal(h.widget.S.ed.dirty,false,JSON.stringify(h.widget.PFTransport.snapshot()));
 assert.equal(h.widget.PFTransport.snapshot().reviews.length,0);
 assert.equal(perf.snapshot().rate.reason,'');assert.equal(perf.snapshot().queued,0);
 const calls=h.calls.slice(before);
 assert.equal(calls.length,20,'fresh full verification and Dashboard reuse require 20 requests');
 assert.equal(h.writes.filter(w=>w.report_name==='All_Lot_Mix_Rows').length,0,'already-matching persisted prices are not written');
 assert.equal(calls.filter(c=>c.config.report_name==='All_Lot_Mix_Rows'&&c.method==='records').length,1,'one fresh counted scope read; Dashboard reuses the verified rows');
 assert.equal(h.widget.S.detail[ID].lotMixRows.length,2);
 assert.equal(new Set(h.widget.S.detail[ID].lotMixRows.map(r=>r.ID)).size,2);
 assert.ok(h.maxActive()<=3);
 console.log(env+' saved two-row pricing: 20 requests + 23 previous = 43; no request-budget pause.');
}
for(const kind of ['changed-cents','stale-draft','incomplete-read']){
 const h=await saveFixture({directRecord:true,references:false,storage:{All_Lot_Mix_Rows:persistedPricing},model:m=>{pricingModel(m);if(kind==='changed-cents')m.lotMix[0].Price_LF='1500.25';},
  read:(cfg,storage)=>{if(kind==='stale-draft'&&cfg.report_name==='All_Lot_Mix_Rows')storage.All_Lot_Mix_Rows[0].Price_LF='1499.75';},
  count:cfg=>kind==='incomplete-read'&&cfg.report_name==='All_Lot_Mix_Rows'?1:undefined});
 await h.widget.saveProforma();await drain();
 const writes=h.writes.filter(w=>w.report_name==='All_Lot_Mix_Rows');
 if(kind==='incomplete-read'){
  assert.equal(writes.length,0);assert.equal(h.widget.S.ed.dirty,true);assert.ok(h.widget.PFTransport.snapshot().reviews.length);
  const sent=h.writes.length;assert.equal(h.widget.saveProforma(),false);assert.equal(h.writes.length,sent);
 }else{
  assert.equal(h.widget.S.ed.dirty,false,JSON.stringify(h.widget.PFTransport.snapshot()));assert.equal(writes.length,1,'only the changed persisted row is written and read back');
  assert.equal(writes[0].id,OTHER);assert.equal(h.storage.All_Lot_Mix_Rows[0].Price_LF,kind==='changed-cents'?'1500.25':'1500');
  assert.equal(h.widget.S.detail[ID].lotMixRows.length,2);
 }
}
console.log('PASS fresh native pricing equality, changed cents/server drift, incomplete scope retention, exact IDs and workflow-scoped Dashboard reuse.');
