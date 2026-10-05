import assert from 'node:assert/strict';
import {saveFixture} from './fixtures/proforma-sdk-v2-save-fixture.mjs';
import {ID,OTHER,clone} from './fixtures/proforma-sdk-v2-harness.mjs';

function nativeMix(row){return {...row,Pro_Forma:{ID:row.Pro_Forma.ID||row.Pro_Forma,zc_display_value:'Native PF'},Lot_Count:String(Number(row.Lot_Count)),Lot_Size_Ft:Number(row.Lot_Size_Ft).toFixed(2),Price_LF:'$ '+Number(row.Price_LF).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})};}
for(const env of ['DEVELOPMENT','PRODUCTION'])for(const existing of [false,true]){
 const h=await saveFixture({env,storage:{All_Lot_Mix_Rows:existing?[{ID:OTHER,Pro_Forma:{ID},Lot_Count:'100',Lot_Size_Ft:'50.00',Price_LF:'$ 1,400.00'}]:[]},model:m=>{if(existing)m.lotMix[0].ID=OTHER;m.lotMix[0].Price_LF='1400.25';},read:(cfg,storage)=>cfg.report_name==='All_Lot_Mix_Rows'?{code:3000,data:clone(storage.All_Lot_Mix_Rows.filter(row=>!cfg.criteria.includes('ID ==')||cfg.criteria.includes(row.ID)).map(nativeMix))}:undefined});
 await h.widget.saveProforma();assert.equal(h.widget.S.ed.dirty,false,JSON.stringify(h.widget.PFTransport.snapshot()));assert.equal(h.widget.PFTransport.snapshot().reviews.length,0);assert.equal(h.storage.All_Lot_Mix_Rows.length,1);assert.equal(h.storage.All_Lot_Mix_Rows[0].Price_LF,'1400.25');
}
for(const kind of ['wrong-parent','wrong-price','missing-field']){
 const h=await saveFixture({read:(cfg,storage)=>{if(cfg.report_name!=='All_Lot_Mix_Rows'||!storage.All_Lot_Mix_Rows.length)return;const rows=storage.All_Lot_Mix_Rows.map(nativeMix);if(kind==='wrong-parent')rows[0].Pro_Forma.ID=OTHER;if(kind==='wrong-price')rows[0].Price_LF='$1,501.00';if(kind==='missing-field')delete rows[0].Lot_Count;return {code:3000,data:rows};}});
 await h.widget.saveProforma();assert.equal(h.widget.S.ed.dirty,true);assert.ok(h.widget.PFTransport.snapshot().reviews.length);h.widget.PFTransportUI.close();const sends=h.writes.length;assert.equal(h.widget.saveProforma(),false);assert.equal(h.writes.length,sends,'uncertain child writes are never replayed');
}
console.log('PASS PF actual save with native lot-mix lookup/currency/decimal responses in Dev and Prod; incorrect parent/price/missing fields retain drafts and block replay.');
