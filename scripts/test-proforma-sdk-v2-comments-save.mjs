import assert from 'node:assert/strict';
import {ready,ID,OTHER} from './fixtures/proforma-sdk-v2-harness.mjs';
import {saveFixture} from './fixtures/proforma-sdk-v2-save-fixture.mjs';

for(const env of ['DEVELOPMENT','PRODUCTION']){
 const h=await ready({env,create:(cfg,apply)=>{const id=apply();const row=h.storage.Comment_Log_Report.find(r=>r.ID===id);row.Pro_Forma={ID,zc_display_value:'Fixture PF'};return {code:3000,data:{ID:id}};}});
 const ack=await h.widget.sdkAdd('Comment_Log',{Pro_Forma:ID,Comment:'Retained native lookup',Deleted:false});
 await h.widget.sdkUpdate('Comment_Log_Report',ack.data.ID,{Comment:'Edited comment'});
 await h.widget.sdkUpdate('Comment_Log_Report',ack.data.ID,{Deleted:true});
 assert.equal(h.widget.PFTransport.snapshot().reviews.length,0);
}
for(const kind of ['wrong-parent']){
 const h=await ready({create:(cfg,apply)=>{const id=apply(),row=h.storage.Comment_Log_Report.find(r=>r.ID===id);row.Pro_Forma={ID:kind==='wrong-parent'?OTHER:ID};if(kind==='missing-text')delete row.Comment;return {code:3000,data:{ID:id}};}});
 await assert.rejects(h.widget.sdkAdd('Comment_Log',{Pro_Forma:ID,Comment:'Do not clear this draft'}),e=>e.noReplay===true);
 assert.equal(h.widget.PFTransport.snapshot().reviews.length,1);
 await assert.rejects(h.widget.sdkAdd('Comment_Log',{Pro_Forma:ID,Comment:'Do not replay'}));
 assert.equal(h.writes.length,1);
}
for(const env of ['DEVELOPMENT','PRODUCTION']){
 const h=await saveFixture({env,model:m=>{m.items=[{Department:'Construction',Item_Name:'Fixture cost',Category:'Other',Description:'Fixed cost',Add_l_Cost:'25000',Cost_Application:'Across Phases',Start_Phase:'1',End_Phase:'1'}];},
  invoke:(cfg,storage,body,apply)=>{if(!body.op&&body.header){const raw=apply();for(const row of storage.Proforma_Item_Report){row.Per_Unit='0.00';row.Add_l_Cost='$25,000.00';}return raw;}}
 });
 await h.widget.saveProforma();
 assert.equal(h.widget.S.ed.dirty,false,JSON.stringify(h.widget.PFTransport.snapshot().reviews));
 assert.equal(h.widget.PFTransport.snapshot().reviews.length,0);
}
console.log('PASS PF comments native lookup + exact parent checks; Save_PF fixed-cost rows with native zero/rate/currency in Dev and Prod.');
for(const wrap of [value=>({code:3000,details:{output:JSON.stringify(value)}}),value=>({code:3000,response:{result:JSON.stringify(value)}}),value=>({code:3000,result:JSON.stringify(value),details:{message:'Executed'}})]){
 const h=await saveFixture({invoke:(cfg,storage,body,apply)=>{if(!body.op&&body.header)return wrap(JSON.parse(apply().result));}});
 await h.widget.saveProforma();assert.equal(h.widget.S.ed.dirty,false,JSON.stringify(h.widget.PFTransport.snapshot().reviews));
}
{
 let sends=0;
 const h=await saveFixture({model:m=>{m.items=[{Department:'Construction',Item_Name:'Fixture cost',Add_l_Cost:'25000',Cost_Application:'Across Phases',Start_Phase:'1',End_Phase:'1'}];},invoke:(cfg,storage,body,apply)=>{if(!body.op&&body.header){sends++;const raw=apply();storage.Proforma_Item_Report[0].Add_l_Cost='26000';return raw;}}});
 await h.widget.saveProforma();assert.equal(h.widget.S.ed.dirty,false);assert.equal(sends,1);assert.equal(h.widget.PFTransport.snapshot().reviews.length,0,'Different saved cost does not fail a successful Custom API');
}
console.log('PASS PF custom envelope wrappers and field-specific unknown-save diagnostics without replay.');

{
 const h=await ready({create:(cfg,apply)=>{const id=apply();delete h.storage.Comment_Log_Report.find(r=>r.ID===id).Comment;return {code:3000,data:{ID:id}};}});
 await h.widget.sdkAdd('Comment_Log',{Pro_Forma:ID,Comment:'Native formatted text'});
 assert.equal(h.widget.PFTransport.snapshot().reviews.length,0,'Comment text readback is no longer compared');
}
