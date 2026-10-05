import assert from 'node:assert/strict';
import {ready,drain,deferred,ID,NEW,ACCESS,SUB} from './test-contract-sdk-v2-foundation.mjs';
const LOT=(BigInt(NEW)+90n).toString(),BUILDER=(BigInt(NEW)+91n).toString(),SCHEDULE=(BigInt(NEW)+92n).toString(),PLACEHOLDER=(BigInt(NEW)+93n).toString(),OTHER=(BigInt(NEW)+94n).toString(),POLICY='open-blank-placeholder-v1';
const clone=value=>JSON.parse(JSON.stringify(value)),lookup=value=>typeof value==='string'?value:value?.ID||null;
const lot=(id=LOT,extra={})=>({ID:id,Lot_Size:'40',Base_Price:'',Escalator:'',Status:'Open',Builder1:{},Contract1:{},Contract_Schedule:{},Close_Date:'',Purchase_Date:'',...extra});
const snapshot=row=>({...clone(row),Builder1:lookup(row.Builder1),Contract1:lookup(row.Contract1),Contract_Schedule:lookup(row.Contract_Schedule)});
const pricing=rows=>Object.fromEntries(rows.map(row=>[row.ID,{Lot_Size:40,Base_Price:5000,Escalator:3}]));
function install(h,rows,handler=()=>{},checkOverride={}){
 const parent=h.c.findContract(ID);Object.assign(parent,{Contract_Type:'Lot (Master)',Builder:{ID:BUILDER},Lots1:rows.map(row=>({ID:row.ID}))});Object.assign(h.reports.All_Contracts1[0],clone(parent));h.reports.All_Active_Lots_Contracts_View=rows;h.c.S.lots=clone(rows);
 const calls=[],base=h.api.invokeCustomApi;
 h.api.invokeCustomApi=async config=>{if(!config.api_name.startsWith('Complete_Lot_Contract'))return base(config);assert.equal('lotTransferCapture' in config,false,'private preflight evidence never reaches Creator');const p=config.payload;calls.push(clone(p));
  if(p.mode==='Check')return {code:3000,details:{output:JSON.stringify({contractId:ID,mode:'Check',lotTransferPolicy:POLICY,preserveExisting:true,builderId:BUILDER,placeholderBuilderIds:[PLACEHOLDER],lotIds:h.reports.All_Contracts1.find(row=>row.ID===ID).Lots1.map(lookup),...checkOverride})}};
  return handler(p,rows);
 };return {parent,calls,expect:{ids:rows.map(row=>row.ID),allIds:rows.map(row=>row.ID),buyerId:BUILDER,prById:pricing(rows)}};
}
function response(p,before,rows,changes={},states={}){
 const outcomes=rows.map(row=>({id:row.ID,state:states[row.ID]||((changes[row.ID]||[]).length?'updated':'preserved'),reason:'fixture decision',fields:changes[row.ID]||[],before:before[row.ID],after:snapshot(row),verified:true}));
 const body={contractId:ID,mode:p.mode,lotTransferPolicy:POLICY,builderId:BUILDER,requestedIds:p.lotIds,linkedIds:outcomes.filter(row=>row.after.Contract1===ID).map(row=>row.id),updatedIds:outcomes.filter(row=>row.state==='updated').map(row=>row.id),preserved:outcomes.filter(row=>row.state==='preserved').map(row=>({id:row.id,reason:row.reason})),skipped:p.mode==='Complete'?outcomes.filter(row=>row.state==='skipped').map(row=>row.id):outcomes.filter(row=>row.state==='skipped').map(row=>({id:row.id,reason:row.reason})),skippedLots:outcomes.filter(row=>row.state==='skipped').map(row=>({id:row.id,reason:row.reason})),outcomes,lots:rows.map(snapshot),updated:outcomes.filter(row=>row.state==='updated').map(row=>row.id),scheduleId:SCHEDULE,steps:[{key:'validate',state:'done'},{key:'takedown',state:'done'},{key:'lots',state:'done'}]};
 return {code:3000,details:{output:JSON.stringify(body)}};
}
const beforeRows=rows=>Object.fromEntries(rows.map(row=>[row.ID,snapshot(row)]));
const nativeLotWrites=h=>h.calls.filter(call=>['update','add','delete'].includes(call.method)&&call.config.report_name==='All_Active_Lots_Contracts_View');
async function complete(h,f){h.c.completeLotViaApi(f.parent,f.expect,h.c.actionsFor(ID));await drain();}

{
 const h=await ready({realDOM:true}),rows=[lot(),lot(OTHER,{Base_Price:0,Escalator:0,Builder1:{ID:PLACEHOLDER,display_value:'Placeholder'}})],f=install(h,rows,(p,rows)=>{
  const before=beforeRows(rows),changes={};for(const row of rows){const update={Status:'Contracted',Builder1:BUILDER,Contract1:ID,Contract_Schedule:SCHEDULE};if(row.Base_Price==='')update.Base_Price=5000;if(row.Escalator==='')update.Escalator=3;Object.assign(row,update);changes[row.ID]=Object.keys(update);}return response(p,before,rows,changes);
 });await complete(h,f);assert.deepEqual(f.calls.map(row=>row.mode),['Check','Complete']);assert.equal(rows[0].Status,'Contracted');assert.equal(rows[1].Builder1,BUILDER);assert.equal(rows[1].Base_Price,0);assert.equal(rows[1].Escalator,0);assert.equal(rows[1].Lot_Size,'40');assert.equal(h.reports.All_Contracts1[0].Status,'Complete');assert.equal(h.reports.All_Contract_Actions[0].Complete,true);assert.equal(nativeLotWrites(h).length,0,'verification never repairs a Lot with native updates');
}
for(const extra of [{Status:'Sold'},{Status:'Scheduled'},{Status:'Contracted'},{Builder1:{ID:BUILDER}},{Builder1:{ID:OTHER}},{Contract1:{ID:OTHER}},{Contract_Schedule:{ID:OTHER}},{Close_Date:'01-Oct-2026'},{Purchase_Date:'01-Oct-2026'}]){
 const h=await ready({realDOM:true}),row=lot(LOT,extra),original=clone(row),f=install(h,[row],(p,rows)=>response(p,beforeRows(rows),rows));await complete(h,f);assert.deepEqual(row,original);assert.equal(nativeLotWrites(h).length,0);assert.equal(h.reports.All_Contracts1[0].Status,'Complete','truthful protected skips do not stop the other verified completion phases');
}
{
 const h=await ready({realDOM:true}),row=lot(),f=install(h,[row],()=>{throw Error('old policy must never reach Complete');},{lotTransferPolicy:undefined});await complete(h,f);assert.deepEqual(f.calls.map(row=>row.mode),['Check']);assert.equal(h.reports.All_Contracts1[0].Status,'New');assert.equal(h.calls.filter(row=>row.method==='update').length,0);assert.equal(h.c.contractHasReviews(),false,'read-only preflight rejection is safe to retry');
}
{
 const h=await ready({realDOM:true}),row=lot(),f=install(h,[row],()=>{throw Error('changed size must fail before Complete');}),native=h.api.getRecords;h.api.getRecords=config=>{if(config.report_name==='All_Active_Lots_Contracts_View')row.Lot_Size='60';return native(config);};await complete(h,f);assert.deepEqual(f.calls.map(row=>row.mode),['Check']);assert.equal(row.Base_Price,'');assert.equal(h.reports.All_Contracts1[0].Status,'New');
}
{
 const h=await ready({realDOM:true}),row=lot(),f=install(h,[row],(p,rows)=>response(p,beforeRows(rows),rows,{[LOT]:['Base_Price','Status','Builder1','Contract1','Contract_Schedule']}));await complete(h,f);assert.equal(row.Base_Price,'');assert.equal(h.reports.All_Contracts1[0].Status,'New');assert.equal(h.c.contractHasReviews(),true,'missing server writes remain unknown');assert.equal(nativeLotWrites(h).length,0);await complete(h,f);assert.equal(f.calls.filter(row=>row.mode==='Complete').length,1,'unknown completion is never replayed');
}
{
 const h=await ready({realDOM:true}),row=lot(),f=install(h,[row],(p,rows)=>{const before=beforeRows(rows),update={Base_Price:5000,Escalator:3,Status:'Contracted',Builder1:BUILDER,Contract1:ID,Contract_Schedule:SCHEDULE};Object.assign(row,update);const out=response(p,before,rows,{[LOT]:Object.keys(update)});row.Base_Price=77777;return out;});await complete(h,f);assert.equal(row.Base_Price,77777,'a concurrent filled price is never overwritten by client repair');assert.equal(h.reports.All_Contracts1[0].Status,'New');assert.equal(h.c.contractHasReviews(),true);assert.equal(nativeLotWrites(h).length,0);
}
{
 const h=await ready({realDOM:true}),row=lot(LOT,{Base_Price:0}),f=install(h,[row],(p,rows)=>{const before=beforeRows(rows);row.Base_Price=5000;return response(p,before,rows,{[LOT]:['Base_Price']});});await complete(h,f);assert.equal(h.reports.All_Contracts1[0].Status,'New');assert.equal(h.c.contractHasReviews(),true,'a backend that claims it changed populated zero is quarantined');assert.equal(nativeLotWrites(h).length,0);
}
{
 const h=await ready({realDOM:true}),rows=[lot(LOT,{Builder1:{ID:PLACEHOLDER},Base_Price:0}),lot(OTHER,{Builder1:{ID:BUILDER}})],f=install(h,rows,(p,rows)=>{assert.equal(p.mode,'LinkOnly');const before=beforeRows(rows);rows.forEach(row=>row.Contract1=ID);return response(p,before,rows,Object.fromEntries(rows.map(row=>[row.ID,['Contract1']])));});
 await h.c.clpBackfillLinks(ID,rows.map(row=>row.ID));assert.deepEqual(f.calls.map(row=>row.mode),['Check','LinkOnly']);assert.equal(rows[0].Base_Price,0);assert.equal(rows[0].Status,'Open');assert.equal(rows[0].Lot_Size,'40');assert.equal(nativeLotWrites(h).length,0,'dormant backfill also uses the guarded LinkOnly operation');
}
{
 const h=await ready({realDOM:true}),row=lot(),gate=deferred(),f=install(h,[row],(p,rows)=>gate.promise.then(()=>response(p,beforeRows(rows),rows,{}, {[LOT]:'skipped'})));
 const pending=h.c.clpBackfillLinks(ID,[LOT]);await drain();h.tick(30000);await assert.rejects(pending,/may have changed data|deadline/);assert.equal(h.c.contractWorkflowNativePending(),true,'native promise remains in flight after the UI deadline');await assert.rejects(h.c.clpBackfillLinks(ID,[LOT]),/previous captured Custom API/);assert.equal(f.calls.filter(row=>row.mode==='LinkOnly').length,1);gate.resolve();await drain();assert.equal(h.c.contractHasReviews(),true);assert.equal(nativeLotWrites(h).length,0);
}
for(const change of [{Base_Price:77777},{Lot_Size:60},{Status:'Sold'},{Builder1:OTHER},{Contract1:OTHER}]){
 const h=await ready({realDOM:true}),row=lot(),f=install(h,[row],(p,rows)=>{Object.assign(row,change);return response(p,beforeRows(rows),rows);});await complete(h,f);assert.equal(h.reports.All_Contracts1[0].Status,'New','changed preflight price, size or target cannot become a confirmed completion');assert.equal(h.c.contractHasReviews(),true);assert.equal(nativeLotWrites(h).length,0);for(const [field,value] of Object.entries(change))assert.equal(row[field],value);
}
{
 const h=await ready({realDOM:true}),rows=[lot(),lot(OTHER)],f=install(h,rows,()=>{throw Error('mismatched selection must never be sent');}),capture=await h.c.checkLotTransfer(f.parent,[LOT],'LinkOnly');await assert.rejects(h.c.sdkInvoke({api_name:h.c.CFG.customApis.completeLotContract,http_method:'POST',content_type:'application/json',payload:{contractId:ID,mode:'LinkOnly',lotIds:[OTHER]},lotTransferCapture:capture}),/exact selection/);assert.deepEqual(f.calls.map(row=>row.mode),['Check']);assert.equal(h.c.contractHasReviews(),false);
}
{
 const h=await ready({realDOM:true}),rows=[lot(LOT,{Contract1:ID,Builder1:BUILDER}),lot(OTHER,{Status:'Sold'})],f=install(h,rows,(p,rows)=>response(p,beforeRows(rows),rows)),run=h.c.contractWorkflowBegin('lots-pricing','Lots and pricing',{parent:f.parent,cid:ID,lotIds:[LOT,OTHER]});await h.c.contractWorkflowBackfill(run);assert.equal(run.entries[0].note,'1 links confirmed; 1 protected lots skipped.');assert.equal(nativeLotWrites(h).length,0);
}
{
 const h=await ready({realDOM:true}),row=lot(LOT,{Contract1:ID,Builder1:BUILDER}),f=install(h,[row],(p,rows)=>{const result=response(p,beforeRows(rows),rows),body=JSON.parse(result.details.output);body.linkedIds=[];result.details.output=JSON.stringify(body);return result;});await assert.rejects(h.c.clpBackfillLinks(ID,[LOT]),/inconsistent confirmed/);assert.equal(h.c.contractHasReviews(),true,'confirmed link counts must match the verified outcome snapshots');assert.equal(nativeLotWrites(h).length,0);
}
{
 const h=await ready({realDOM:true}),row=lot(),gate=deferred(),f=install(h,[row],(p,rows)=>gate.promise.then(()=>{const before=beforeRows(rows);row.Contract1=ID;return response(p,before,rows,{[LOT]:['Contract1']});})),run=h.c.contractWorkflowBegin('lots-pricing','Lots and pricing',{parent:f.parent,cid:ID,lotIds:[LOT]}),pending=h.c.contractWorkflowBackfill(run);await drain();h.tick(30000);await assert.rejects(pending,/may have changed data|deadline/);assert.equal(run.entries[0].state,'unknown');assert.equal(await h.c.contractWorkflowRecheck(run),false,'still-pending native operations cannot be dismissed or rechecked');h.c.S.lotRun={running:false,message:'Transfer needs review.'};assert.equal(h.c.lotRunClose(),false);assert.match(h.c.lrunFootHTML(h.c.S.lotRun),/disabled>Close/);h.c.S.lotRun=null;gate.resolve();await drain();assert.equal(h.c.contractHasReviews(),true,'late native success remains quarantined until fresh readback');assert.equal(await h.c.contractWorkflowRecheck(run),true);assert.equal(run.entries[0].state,'verified');assert.equal(run.entries[0].note,'1 links confirmed; 0 protected lots skipped.');assert.equal(h.c.contractHasReviews(),false);assert.equal(f.calls.filter(row=>row.mode==='LinkOnly').length,1,'read-only recheck never replays the transfer');assert.equal(nativeLotWrites(h).length,0);
}
function completedEditor(h,checkOverride={}){
 const rows=[lot(LOT,{Subdivision:{ID:SUB},Base_Price:0,Escalator:0,Status:'Contracted',Builder1:BUILDER,Contract1:ID,Contract_Schedule:SCHEDULE}),lot(OTHER,{Subdivision:{ID:SUB},Lot_Size:'50',Builder1:PLACEHOLDER})],f=install(h,rows,(p,rows)=>response(p,beforeRows(rows),rows),checkOverride);
 Object.assign(f.parent,{Status:'Complete',Lots1:[{ID:LOT}],Owner:[{ID:ACCESS}],Subdivision1:[{ID:SUB}],Project:{},Parent_Contract:{},Territory:'Austin',Number_of_Lots:20,Initial_Takedown:null,Initial_Takedown_Days:null,Subsequent_Takedown_Lots:null,Subsequent_Takedown_Days:null});Object.assign(h.reports.All_Contracts1[0],clone(f.parent));
 h.c.S.nc={type:'Lot (Master)',project:'',builder:BUILDER,parent:'',sub:[SUB],lotIds:[LOT,OTHER],ppf:{40:'125',50:'200'}};h.c.S.clp={cid:ID,lots0:[LOT],ppf0:'{"40":"100"}',terms:{Number_of_Lots:'20',Initial_Takedown:'',Initial_Takedown_Days:'',Subsequent_Takedown_Lots:'',Subsequent_Takedown_Days:''}};
 h.reports.Contract_Pricing_Report=[{ID:(BigInt(NEW)+95n).toString(),Contract1:{ID},Lot_Size:'40',Price_per_Ft:'100',Base_Price:'4000'},{ID:(BigInt(NEW)+96n).toString(),Contract1:{ID},Lot_Size:'80',Price_per_Ft:'100',Base_Price:'8000'}];h.c.S.pricing=clone(h.reports.Contract_Pricing_Report);return {...f,rows};
}
{
 const h=await ready({realDOM:true}),f=completedEditor(h),native=h.api.updateRecordById,pricesAtParentSave=[];
 h.api.updateRecordById=async config=>{const result=await native(config);if(config.report_name==='All_Contracts1'){
   const newPrice=h.reports.Contract_Pricing_Report.find(row=>Number(row.Lot_Size)===50);pricesAtParentSave.push(newPrice?.Base_Price);assert.equal(h.reports.Contract_Pricing_Report.length,2,'obsolete size is removed before the parent can trigger transfer');assert.equal(newPrice.Base_Price,10000);Object.assign(f.rows[1],{Base_Price:newPrice.Base_Price,Status:'Contracted',Builder1:BUILDER,Contract1:ID,Contract_Schedule:SCHEDULE});
  }return result;};
 const result=await h.c.clpSave();assert.equal(result.error,null);assert.deepEqual(pricesAtParentSave,[10000]);assert.equal(f.rows[1].Base_Price,10000);assert.equal(f.rows[0].Base_Price,0);assert.deepEqual(h.reports.All_Contracts1[0].Lots1,[LOT,OTHER]);assert.deepEqual(f.calls.map(row=>row.mode),['Check','Check','LinkOnly']);assert.equal(nativeLotWrites(h).length,0);
 const parentIndex=h.calls.findIndex(call=>call.method==='update'&&call.config.report_name==='All_Contracts1'),priceIndices=h.calls.map((call,index)=>({call,index})).filter(({call})=>call.method==='delete'||call.method==='add'&&call.config.form_name==='Contract_Pricing'||call.method==='update'&&call.config.report_name==='Contract_Pricing_Report').map(({index})=>index);assert.ok(priceIndices.every(index=>index<parentIndex),'every verified pricing reconciliation write precedes the completed parent write');
}
{
 const h=await ready({realDOM:true}),f=completedEditor(h),native=h.api.addRecords;h.api.addRecords=config=>config.form_name==='Contract_Pricing'?Promise.resolve({code:2945,message:'pricing fixture rejection'}):native(config);const result=await h.c.clpSave();assert.ok(result.error);assert.deepEqual(h.reports.All_Contracts1[0].Lots1,[{ID:LOT}]);assert.equal(h.calls.filter(call=>call.method==='update'&&call.config.report_name==='All_Contracts1').length,0,'failed pricing cannot trigger a completed-parent transfer with old prices');assert.equal(f.rows[1].Base_Price,'');assert.equal(f.rows[1].Status,'Open');assert.deepEqual(f.calls.map(row=>row.mode),['Check']);assert.equal(nativeLotWrites(h).length,0);
}
{
 const h=await ready({realDOM:true}),f=completedEditor(h,{lotTransferPolicy:undefined}),result=await h.c.clpSave();assert.ok(result.error);assert.equal(h.calls.filter(call=>['update','add','delete'].includes(call.method)).length,0,'a completed parent edit fails closed before pricing or native completion without the safe backend');assert.deepEqual(f.calls.map(row=>row.mode),['Check']);
}
{
 const h=await ready({realDOM:true}),f=completedEditor(h),native=h.api.updateRecordById;h.api.updateRecordById=async config=>{const result=await native(config);if(config.report_name==='Contract_Pricing_Report')h.reports.All_Contracts1[0].Lots1=[{ID:OTHER}];return result;};const result=await h.c.clpSave();assert.ok(result.error);assert.match(result.error,/selection changed/);assert.equal(h.calls.filter(call=>call.method==='update'&&call.config.report_name==='All_Contracts1').length,0);assert.deepEqual(h.reports.All_Contracts1[0].Lots1,[{ID:OTHER}]);assert.equal(f.rows[1].Base_Price,'');assert.equal(nativeLotWrites(h).length,0);
}
console.log('PASS actual Lot transfer safety: capability gate, exact captures, Open/blank/Placeholder eligibility, protected states/builders/links/dates, zero/size preservation, stale size rejection, missing-write and concurrent-fill readback failures, truthful protected/confirmed counts, guarded LinkOnly, pending/unknown quarantine, read-only recheck, verified pricing before completed parent save and zero native Lot updates.');
