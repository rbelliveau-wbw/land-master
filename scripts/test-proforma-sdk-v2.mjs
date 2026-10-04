// Whole current PF SDK2 IIFE; only native transport/layout boundaries mocked.
import assert from 'node:assert/strict';
import {harness,ready,held,drain,header,ID,OTHER,ACCESS,source,clone} from './fixtures/proforma-sdk-v2-harness.mjs';
{
 const h=await ready();assert.equal(h.handshakes(),1);assert.equal(h.widget.S.proformas.length,1);assert.equal(h.widget.S.users[0].fullName,'Fixture Owner');assert.equal(h.widget.S.proformaOwners[ID][0],ACCESS);assert.ok(h.maxActive()<=3);assert.equal(h.widget.PFTransport.snapshot().reviews.length,0);assert.equal(h.widget.S.view,'vList');
}
{
 const h=await ready({env:'PRODUCTION'}),call=h.calls.find(x=>x.method==='custom'&&x.config.api_name==='Get_User_Access');assert.ok(call);assert.equal(call.config.http_method,'GET');for(const key of ['parameters','query_params','payload'])assert.equal(Object.hasOwn(call.config,key),false);assert.equal(h.widget.S.perms.editAll,true);
}
for(const init of [{},[],{loginUser:{},envUrlFragment:''},{loginUser:false,envUrlFragment:''}]){
 const h=harness({init:()=>init}),result=await h.c.__pfBoot;assert.equal(result.published,false);assert.equal(h.calls.length,0);assert.equal(h.widget.S.liveSDK,false);assert.equal(h.widget.S.useMock,false);assert.equal(h.widget.S.coreReady,false);
}
{
 const h=await ready({storage:{All_Property:Array.from({length:12017},(_,i)=>({ID:(90071992548000000n+BigInt(i)).toString(),Common_Name:'Fixture Property '+i,Property_ID:'000073'}))},pageSize:200});assert.equal(h.widget.S.properties.length,12017);assert.equal(new Set(h.widget.S.properties.map(r=>r.ID)).size,12017);assert.equal(h.calls.filter(x=>x.method==='records'&&x.config.report_name==='All_Property').length,61);assert.ok(h.maxActive()<=3);
}
for(const kind of ['missing','duplicate','count-failure']){
 const h=harness({storage:{All_Pro_Formas_All_Fields:kind==='duplicate'?[header(),header()]:[header()]},count:cfg=>cfg.report_name==='All_Pro_Formas_All_Fields'?(kind==='count-failure'?{code:3000,result:{records_count:'0'},output:JSON.stringify({code:2898,error:'Denied'})}:2):undefined});const result=await h.c.__pfBoot;assert.equal(result.published,false);assert.equal(h.widget.S.coreReady,false);assert.equal(h.widget.S.proformas.length,0);assert.equal(h.widget.changeLockFromList(ID,false),false);assert.equal(h.widget.saveProforma(),false);assert.equal(h.writes.length,0);
}
{
 const h=await ready();await h.widget.sdkUpdate(h.widget.CFG.reports.proformas,ID,{Name:'Persisted fixture'});assert.equal(h.writes.length,1);assert.equal(h.writes[0].report_name,'All_Pro_Formas_All_Fields');assert.equal(h.writes[0].id,ID);assert.deepEqual(h.writes[0].payload,{data:{Name:'Persisted fixture'}});assert.equal(h.widget.S.proformas[0].Name,'Persisted fixture');assert.equal(h.widget.PFTransport.snapshot().ledger[0].state,'verified');
}
// Native lookup clear returns an exact empty object. Nonempty malformed objects
// remain uncertain, and the saved input still uses the original empty string.
{
 const h=await ready({storage:{All_Pro_Formas_All_Fields:[{...header(),Purchasing_Company:{ID:OTHER,zc_display_value:'Fixture Company'}}]},read:(cfg,storage)=>{if(cfg.report_name==='All_Pro_Formas_All_Fields'){const row=storage[cfg.report_name][0];if(row.Purchasing_Company==='')row.Purchasing_Company={};}}});await h.widget.sdkUpdate(h.widget.CFG.reports.proformas,ID,{Purchasing_Company:''});assert.equal(h.writes.length,1);assert.deepEqual(h.writes[0].payload,{data:{Purchasing_Company:''}});assert.equal(h.widget.PFTransport.snapshot().reviews.length,0);assert.equal(h.widget.PFTransport.snapshot().ledger[0].state,'verified');
}
for(const stored of [{ID:''},{zc_display_value:''},[],{ID:Number(ID)}]){
 const h=await ready({read:(cfg,storage)=>{if(cfg.report_name==='All_Pro_Formas_All_Fields'){const row=storage[cfg.report_name][0];if(row.Purchasing_Company==='')row.Purchasing_Company=stored;}}});await assert.rejects(h.widget.sdkUpdate(h.widget.CFG.reports.proformas,ID,{Purchasing_Company:''}),e=>e.noReplay===true);assert.equal(h.writes.length,1);assert.equal(h.widget.PFTransport.snapshot().reviews.length,1);
}
for(const wrapper of [{details:{message:'Updated successfully'}},{response:{message:'Updated successfully'}},{output:JSON.stringify({message:'Updated successfully'})}]){
 const h=await ready({update:(cfg,apply)=>{apply();return {code:3000,data:{ID},...wrapper};}});await h.widget.sdkUpdate(h.widget.CFG.reports.proformas,ID,{Name:'Informational native success'});assert.equal(h.writes.length,1);assert.equal(h.widget.PFTransport.snapshot().reviews.length,0);assert.equal(h.widget.PFTransport.snapshot().ledger[0].state,'verified');assert.equal(h.widget.S.proformas[0].Name,'Informational native success');
}
for(const wrapper of [{details:{code:3000,data:{ID}}},{response:{ID:OTHER}},{output:JSON.stringify({result:[{code:3000,data:{ID}}]})}]){
 const h=await ready({update:(cfg,apply)=>{apply();return {code:3000,data:{ID},...wrapper};}});await assert.rejects(h.widget.sdkUpdate(h.widget.CFG.reports.proformas,ID,{Name:'Competing native success'}),e=>e.noReplay===true);await assert.rejects(h.widget.sdkUpdate(h.widget.CFG.reports.proformas,ID,{Name:'Competing native success'}),e=>e.noReplay===true);assert.equal(h.writes.length,1);assert.equal(h.widget.PFTransport.snapshot().reviews.length,1);
}
{
 const h=await ready({update:(cfg,apply)=>{apply();throw new Error('Applied response lost');}});await assert.rejects(h.widget.sdkUpdate(h.widget.CFG.reports.proformas,ID,{Name:'Retained uncertain draft'}),e=>e.noReplay===true);await assert.rejects(h.widget.sdkUpdate(h.widget.CFG.reports.proformas,ID,{Name:'Retained uncertain draft'}),e=>e.noReplay===true);assert.equal(h.writes.length,1);assert.equal(h.widget.S.proformas[0].Name,'Fixture Pro Forma 0');const review=h.widget.PFTransport.snapshot().reviews[0];assert.equal(await h.widget.PFTransport.recheck(review.key),true);assert.equal(h.writes.length,1);assert.equal(h.widget.S.proformas[0].Name,'Retained uncertain draft');
}
for(const raw of [{code:3000,data:{ID},details:{code:2899,error:'Denied'}},{code:2899,output:JSON.stringify({code:3000,data:{ID}})},{code:3000,result:[{code:3000,data:{ID}},{code:2899,error:'Denied'}]}]){
 const h=await ready({update:(cfg,apply)=>{apply();return raw;}});await assert.rejects(h.widget.sdkUpdate(h.widget.CFG.reports.proformas,ID,{Name:'Unknown exact field'}),e=>e.noReplay===true&&String(e.code)==='2899');assert.equal(h.widget.PFTransport.snapshot().reviews.length,1);assert.equal(h.writes.length,1);assert.equal(h.widget.PFTransport.snapshot().ledger[0].state,'unknown');
}
// The seven persisted child collections remain identical to the actual source.
{
 const h=await ready(),m=h.widget.newModel();assert.deepEqual(Array.from(h.widget.FORK_CHILD_LISTS),['purchaseInstallments','saleInstallments','pidMud','items','curve','lotMix','phaseSales']);m.ID=ID;m.Name='Fixture';m.Owner=ACCESS;for(const key of h.widget.FORK_CHILD_LISTS)m[key]=[{ID:OTHER,marker:key}];const before=clone(m),copy=h.widget.forkModel(m);assert.deepEqual(clone(m),before);assert.equal(copy.ID,null);for(const key of h.widget.FORK_CHILD_LISTS){assert.equal(copy[key][0].ID,null);assert.notEqual(copy[key][0],m[key][0]);}
}
assert.doesNotMatch(source,/ZOHO\.CREATOR\.(?:API|init)\b/);assert.doesNotMatch(source,/addEventListener\(["']beforeunload/);
console.log('PASS PF SDK2 whole actual IIFE startup/full access/core cursor completeness/strict native writes/retained uncertainty and seven fork collections. Broader Save/FILE/native gates remain pending.');
