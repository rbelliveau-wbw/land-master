import assert from 'node:assert/strict';
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
