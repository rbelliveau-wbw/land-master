import assert from 'node:assert/strict';
import {ready,drain,deferred,ID,ACTION,SUB,NEW} from './test-contract-sdk-v2-foundation.mjs';
const SUB2='90071992547419931',OTHER='90071992547419932';
const lotId=index=>(90071992547430000n+BigInt(index)).toString();
function scope(h,subs=[SUB]){h.c.S.nc={sub:subs,lotIds:[],ppf:{}};h.c.S.clp={cid:ID};return h.c.S.nc;}
function lots(h,count=1,sub=SUB){h.reports.All_Active_Lots_Contracts_View=Array.from({length:count},(_,index)=>({ID:lotId(index),Subdivision:{ID:sub,zc_display_value:'Native phase'},Status:'Open',Lot_Code:'F-'+index,Lot_Size:'50'}));return h.reports.All_Active_Lots_Contracts_View;}
function parents(h,extra=[]){h.reports.All_Contracts1[0].Lots1=[];h.reports.All_Contracts1.push(...extra);}
{
 const h=await ready();scope(h);lots(h,5201);parents(h);const before=h.calls.length;
 assert.equal(await h.c.ncLoadPickerLots(),true);assert.equal(h.c.S.lots.length,5201,'complete counted cursor read has no legacy 5000-row cutoff');assert.equal(h.c.S.lpLoadError,'');assert.equal(h.c.S.lpLoading,false);
 const calls=h.calls.slice(before).filter(call=>call.config.report_name===h.c.CFG.reports.lots);assert.equal(calls.filter(call=>call.method==='records').length,6);assert.equal(calls.filter(call=>call.method==='count').length,1);assert.ok(calls.every(call=>call.config.criteria==='(Subdivision == '+SUB+')'));assert.ok(h.maximum()<=3);
 const verified=await h.c.clpValidateLots(ID,[lotId(5200)]);assert.equal(verified.ids[0],lotId(5200));assert.equal(verified.lots.length,5201);
}
for(const status of ['Archived','Rejected','Completed']){
 const h=await ready();scope(h);const [row]=lots(h);parents(h,[{ID:OTHER,Status:status,Archive:status==='Archived',Lots1:[{ID:row.ID}]}]);
 await assert.rejects(h.c.clpValidateLots(ID,[row.ID]),/unavailable|belongs/,'every other parent claim blocks regardless of status');assert.equal(h.calls.filter(call=>['add','update','delete'].includes(call.method)).length,0);
}
{
 const h=await ready();scope(h);const [row]=lots(h);parents(h);h.reports.All_Contracts1[0].Lots1=[{ID:row.ID}];assert.equal((await h.c.clpValidateLots(ID,[row.ID])).ids[0],row.ID,'the edited parent does not block its own exact IDs');
 const other={ID:OTHER,Status:'Rejected'};h.reports.All_Contracts1.push(other);await assert.rejects(h.c.clpValidateLots(ID,[row.ID]),/claim field/);other.Lots1={ID:42};await assert.rejects(h.c.clpValidateLots(ID,[row.ID]),/lookup ID/);
}
{
 const h=await ready();scope(h);const [row]=lots(h);parents(h);const native=h.api.getRecordCount;h.api.getRecordCount=config=>config.report_name===h.c.CFG.reports.contracts?Promise.reject({code:2898,message:'Claims denied'}):native(config);
 await assert.rejects(h.c.clpValidateLots(ID,[row.ID]));assert.equal(h.calls.filter(call=>['add','update','delete'].includes(call.method)).length,0,'a stale cached unclaimed lot does not authorize a write');
}
for(const change of ['draft','scope','navigation','actor']){
 const h=await ready(),original=scope(h),[row]=lots(h),gate=deferred(),native=h.api.getRecords;h.c.S.lots=[{ID:'90071992547429999',Subdivision:{ID:SUB}}];const retained=h.c.S.lots;
 h.api.getRecords=config=>config.report_name===h.c.CFG.reports.lots?gate.promise.then(()=>native(config)):native(config);
 const pending=h.c.ncLoadPickerLots();await drain();if(change==='draft')h.c.S.nc={sub:[SUB],lotIds:[],ppf:{}};else if(change==='scope')original.sub=[SUB2];else if(change==='navigation')h.c.S.contractNavigationGeneration=(h.c.S.contractNavigationGeneration||0)+1;else h.c.LMRuntime.apply({envUrlFragment:'',loginUser:'new-actor@example.test'});
 gate.resolve();assert.equal(await pending,false,'late '+change+' completion is rejected');assert.equal(h.c.S.lots,retained,'late '+change+' completion preserves current list/draft');assert.equal(h.c.S.lots.some(value=>value.ID===row.ID),false);
}
for(const value of [undefined,{}, {ID:SUB2},{ID:5}]){
 const h=await ready();scope(h);const [row]=lots(h);row.Subdivision=value;h.c.S.lots=[{ID:'90071992547429999',Subdivision:{ID:SUB}}];const retained=h.c.S.lots,native=h.api.getRecords;
 // Native malformed report rows are intentionally returned despite the query so actual scope validation, rather than the fixture filter, decides.
 h.api.getRecordCount=async config=>config.report_name===h.c.CFG.reports.lots?{code:3000,result:{records_count:'1'}}: {code:3000,result:{records_count:String(h.reports[config.report_name].length)}};
 h.api.getRecords=config=>config.report_name===h.c.CFG.reports.lots?Promise.resolve({code:3000,data:[row]}):native(config);
 assert.equal(await h.c.ncLoadPickerLots(),false);assert.equal(h.c.S.lots,retained);assert.ok(h.c.S.lpLoadError);assert.equal(h.c.S.lpLoading,false);
}
{
 const h=await ready();scope(h,[Number(SUB)]);lots(h);const before=h.calls.length;assert.equal(await h.c.ncLoadPickerLots(),false);assert.equal(h.calls.length,before,'unsafe numeric scope never reaches native requests');
}
{
 const h=await ready();const base={Contract1:{},Contract_Action:'Template',Sort_Order:'1'};h.reports.All_Contract_Actions=[null,'','   ','Lot (Master)',{zc_display_value:'DA'},{display_value:' '},{ID:NEW}].map((value,index)=>({...base,ID:lotId(index),Contract_Template:value}));
 const native=h.api.getRecordCount;h.api.getRecordCount=config=>{assert.notEqual(config.criteria,'Contract_Template != ""','SDK2 native count cannot use the unsupported nonblank predicate');return native(config);};
 assert.equal(await h.c.ncLoadTemplates(),true);assert.equal(h.c.S.tplActions.length,3);assert.deepEqual(Array.from(h.c.S.tplActions,row=>row.ID),[lotId(3),lotId(4),lotId(6)]);assert.equal(h.c.S.contractTemplatesStatus,'loaded');
 const retained=h.c.S.tplActions;delete h.reports.All_Contract_Actions[0].Contract_Template;assert.equal(await h.c.ncLoadTemplates(),false);assert.equal(h.c.S.tplActions,retained);assert.equal(h.c.S.contractTemplatesStatus,'error');
}
for(const value of [42,[],{ID:42},{zc_display_value:2}]){
 const h=await ready();h.reports.All_Contract_Actions[0].Contract1={};h.reports.All_Contract_Actions[0].Contract_Template=value;assert.equal(await h.c.ncLoadTemplates(),false);assert.equal(h.c.S.contractTemplatesStatus,'error');
}
{
 const h=await ready();h.reports.All_Contracts1[0].Subdivision1=[{ID:SUB2}];assert.equal(await h.c.ncFixSubdivision(ID,[SUB]),true);const writes=h.calls.filter(call=>call.method==='update');assert.equal(writes.length,1);assert.deepEqual(writes[0].config.payload.data.Subdivision1,[SUB]);assert.deepEqual(h.reports.All_Contracts1[0].Subdivision1,[SUB]);
 const before=writes.length;assert.equal(await h.c.ncFixSubdivision(ID,[SUB]),true);assert.equal(h.calls.filter(call=>call.method==='update').length,before,'already exact verification never writes');
}
{
 const h=await ready();h.reports.All_Contracts1[0].Subdivision1=[{ID:SUB2}];let calls=0;h.api.updateRecordById=async config=>{calls++;return {code:3000,data:{ID:config.id}};};await assert.rejects(h.c.ncFixSubdivision(ID,[SUB]));assert.equal(calls,1);await assert.rejects(h.c.ncFixSubdivision(ID,[SUB]));assert.equal(calls,1,'failed exact readback never tries CSV/single/second envelopes');
}
for(const value of [undefined,[{ID:SUB},{ID:SUB}],[{ID:42}]]){
 const h=await ready();h.reports.All_Contracts1[0].Subdivision1=value;await assert.rejects(h.c.ncFixSubdivision(ID,[SUB]));assert.equal(h.calls.filter(call=>call.method==='update').length,0,'unavailable native selection cannot be treated as a landed set');
}
console.log('PASS whole Contracts scoped dependencies: 5201 counted lots, exact subdivision IDs, full fresh claims including archived/rejected parents, scope/actor/draft publication guards, unfiltered complete actions with typed local templates and one-call exact multi-ID reconciliation.');
