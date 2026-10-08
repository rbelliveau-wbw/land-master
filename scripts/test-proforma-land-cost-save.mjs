import assert from 'node:assert/strict';
import fs from 'node:fs';
import {saveFixture} from './fixtures/proforma-sdk-v2-save-fixture.mjs';
import {ID} from './fixtures/proforma-sdk-v2-harness.mjs';

for (const env of ['DEVELOPMENT','PRODUCTION']) {
  for (const saved of ['12500109.90','12500109.92']) {
    let sends=0;
    const h=await saveFixture({env,directRecord:true,model:m=>{
      m.Total_Acres='236.44';m.Land_Cost_Acre='52868';
      m.Const_Cost_FF='300.1234';m.Total_Street_LF='5001';
      m.purchaseInstallments=[{Installment:'1',Month1:'1',Percent1:'100',Cost:'12500109.92'}];
      m.items=[{Item_Name:'Edited cost',Department:'Development',Category:'Misc',Add_l_Cost:'20.25',Cost_Application:'Across Phases',Start_Phase:'1',End_Phase:'1'}];
    },invoke:(config,storage,body,apply)=>{
      if (!body.op&&body.header) {
        sends++;const result=apply();storage.All_Pro_Formas_All_Fields.find(row=>row.ID===ID).Land_Cost=saved;return result;
      }
    }});
    assert.deepEqual(JSON.parse(JSON.stringify(h.widget.validateModel(h.model))),[]);
    assert.equal(h.payload.header.Const_Cost_FF,'300.1234','entered unit rate remains exact');
    assert.equal(h.payload.header.Construction_Cost_Base,'1500917.12','computed currency retains cents');
    await h.widget.saveProforma();
    assert.equal(sends,1);
    assert.equal(h.widget.S.ed.dirty,false);
    assert.equal(h.document.getElementById('pfNativeError').hidden,true);
    assert.equal(h.document.getElementById('pfNativeProgress').hidden,true);
    assert.equal(h.widget.PFTransport.snapshot().reviews.length,0);
  }
}
const backend=fs.readFileSync('creator/functions/proforma_save.dg','utf8');
assert.match(backend,/pf\.Construction_Cost_Base=header\.get\("Construction_Cost_Base"\)\.toDecimal\(\);/,'Creator must preserve the same captured cents');
console.log('PASS Land Cost cents mismatch stays visible, retained/no-replay, exact cents complete in both environments.');
