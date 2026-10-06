import assert from 'node:assert/strict';
import {saveFixture} from './fixtures/proforma-sdk-v2-save-fixture.mjs';
import {ID,OTHER,clone,ready,held,drain} from './fixtures/proforma-sdk-v2-harness.mjs';

function nativeMix(row){return {...row,Pro_Forma:{ID:row.Pro_Forma.ID||row.Pro_Forma,zc_display_value:'Native PF'},Lot_Count:String(Number(row.Lot_Count)),Lot_Size_Ft:Number(row.Lot_Size_Ft).toFixed(2),Price_LF:'$ '+Number(row.Price_LF).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})};}
// Taylor Farms: both copied/new pricing rows are new records in the same form.
// They must run concurrently without mistaking the second intended row for a replay.
for(const env of ['DEVELOPMENT','PRODUCTION'])for(const identical of [false,true]){
 const h=await saveFixture({env,directRecord:true,model:m=>{
  m.ID=null;m.Lots='1058';m.phaseSales[0].Total_Lots='1058';
  m.lotMix=[{Lot_Size_Ft:'50',Lot_Count:'958',Price_LF:'1300'},
   {Lot_Size_Ft:identical?'50':'40',Lot_Count:'100',Price_LF:identical?'1300':'1200'}];
  if(identical){m.Lots='200';m.phaseSales[0].Total_Lots='200';m.lotMix[0].Lot_Count='100';}
 },read:(cfg,storage)=>cfg.report_name==='All_Lot_Mix_Rows'?{code:3000,data:clone(storage.All_Lot_Mix_Rows.map(nativeMix))}:undefined,
 record:(cfg,storage)=>{if(cfg.report_name==='All_Lot_Mix_Rows'){const row=storage.All_Lot_Mix_Rows.find(row=>row.ID===cfg.id);return row?{code:3000,data:nativeMix(row)}:{code:3100};}}});
 const save=h.widget.saveProforma();assert.equal(h.widget.saveProforma(),false,'double Save stays blocked');await save;
 assert.equal(h.widget.S.ed.dirty,false,JSON.stringify(h.widget.PFTransport.snapshot()));
 assert.equal(h.widget.PFTransport.snapshot().reviews.length,0);
 assert.equal(h.storage.All_Lot_Mix_Rows.length,2,'every intended row is created exactly once');
 assert.equal(new Set(h.storage.All_Lot_Mix_Rows.map(row=>row.ID)).size,2);
 assert.equal(h.storage.All_Pro_Formas_All_Fields.length,2,'only one duplicate parent is created');
 assert.ok(h.widget.PFTransport.snapshot().ledger.every(row=>row.state==='verified'));
 assert.ok(h.maxActive()<=3);
}
// Row identity retains the same-row guard, even while another row is allowed.
{
 const gate=held();let first=true;
 const h=await ready({directRecord:true,create:async(cfg,apply)=>{
  const created=apply();if(first){first=false;await gate.promise;}return {code:3000,data:{ID:created}};
 }});
 const t=h.widget.PFTransport,run=t.begin('Captured pricing rows');
 const data={Pro_Forma:ID,Lot_Count:'100',Lot_Size_Ft:'40',Price_LF:'1200'};
 const pending=h.widget.sdkAdd('Lot_Mix_Row',data,'row:0');await drain();
 await assert.rejects(h.widget.sdkAdd('Lot_Mix_Row',data,'row:0'),/already pending/);
 await h.widget.sdkAdd('Lot_Mix_Row',data,'row:1');
 assert.equal(h.writes.length,2,'only the two distinct captured intents dispatch');
 gate.resolve();await pending;t.end(run);t.close(run);
 assert.equal(t.snapshot().reviews.length,0);
 await assert.rejects(h.widget.sdkAdd('Lot_Mix_Row',data,'row:outside'),/active workflow/);
 assert.equal(h.writes.length,2,'a batch intent cannot bypass the standalone guard');
}
for(const env of ['DEVELOPMENT','PRODUCTION'])for(const existing of [false,true]){
 const h=await saveFixture({env,storage:{All_Lot_Mix_Rows:existing?[{ID:OTHER,Pro_Forma:{ID},Lot_Count:'100',Lot_Size_Ft:'50.00',Price_LF:'$ 1,400.00'}]:[]},model:m=>{if(existing)m.lotMix[0].ID=OTHER;m.lotMix[0].Price_LF='1400.25';},read:(cfg,storage)=>cfg.report_name==='All_Lot_Mix_Rows'?{code:3000,data:clone(storage.All_Lot_Mix_Rows.filter(row=>!cfg.criteria.includes('ID ==')||cfg.criteria.includes(row.ID)).map(nativeMix))}:undefined});
 await h.widget.saveProforma();assert.equal(h.widget.S.ed.dirty,false,JSON.stringify(h.widget.PFTransport.snapshot()));assert.equal(h.widget.PFTransport.snapshot().reviews.length,0);assert.equal(h.storage.All_Lot_Mix_Rows.length,1);assert.equal(h.storage.All_Lot_Mix_Rows[0].Price_LF,'1400.25');
}
for(const kind of ['wrong-parent','wrong-price','missing-field']){
 const h=await saveFixture({read:(cfg,storage)=>{if(cfg.report_name!=='All_Lot_Mix_Rows'||!storage.All_Lot_Mix_Rows.length)return;const rows=storage.All_Lot_Mix_Rows.map(nativeMix);if(kind==='wrong-parent')rows[0].Pro_Forma.ID=OTHER;if(kind==='wrong-price')rows[0].Price_LF='$1,501.00';if(kind==='missing-field')delete rows[0].Lot_Count;return {code:3000,data:rows};}});
 await h.widget.saveProforma();assert.equal(h.widget.S.ed.dirty,true);assert.ok(h.widget.PFTransport.snapshot().reviews.length);h.widget.PFTransportUI.close();const sends=h.writes.length;assert.equal(h.widget.saveProforma(),false);assert.equal(h.writes.length,sends,'uncertain child writes are never replayed');
}
console.log('PASS PF actual save with native lot-mix lookup/currency/decimal responses in Dev and Prod; incorrect parent/price/missing fields retain drafts and block replay.');
