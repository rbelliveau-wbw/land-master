import assert from 'node:assert/strict';
import {ready,drain,deferred,ID,SUB,ACCESS,NEW} from './test-contract-sdk-v2-foundation.mjs';

const LOT=(BigInt(NEW)+200n).toString(),LOT2=(BigInt(NEW)+201n).toString(),OTHER=(BigInt(NEW)+202n).toString(),BUYER=(BigInt(NEW)+203n).toString(),PROJECT=(BigInt(NEW)+204n).toString();
const clone=value=>JSON.parse(JSON.stringify(value));
const writes=h=>h.calls.filter(call=>['add','update','delete'].includes(call.method));
function lot(id=LOT,extra={}){
 return {ID:id,Lot_Code:'EA02-B0A-L92',Block:'0A',Lot_Number:'92',Subdivision:{ID:SUB,zc_display_value:'Fixture phase'},Lot_Size:'50',Base_Price:'65000',Escalator:'7',Status:'Open',Builder1:'',Contract1:'',Contract_Schedule:'',Close_Date:'',Purchase_Date:'',Notes:'Retain this lot',...extra};
}
function setup(h,{editing=false,rows=[lot()],parents=[]}={}){
 const c=h.reports.All_Contracts1[0];
 Object.assign(c,{Contract_Type:'Lot (Master)',Status:'New',Project:{ID:PROJECT},Territory:'Austin',Builder:{ID:BUYER},Parent_Contract:'',Lots1:[],Number_of_Lots:10,Initial_Takedown:2,Initial_Takedown_Days:30,Second_Closing_Lots:2,Second_Closing_Days:45,Subsequent_Takedown_Lots:2,Subsequent_Takedown_Days:30});
 h.reports.All_Contracts1=[c,...parents];h.c.S.contracts=clone(h.reports.All_Contracts1);
 h.reports.All_Active_Lots_Contracts_View=rows;h.c.S.lots=clone(rows);
 h.c.S.projects=[{ID:PROJECT,Project_Name:'Fixture project',Territory:'Austin'}];h.c.S.projectsLoaded=true;
 h.c.S.subdivisions=[{ID:SUB,Subdivision_Name:'Fixture phase',Subdivision_Code:'F01',Project:{ID:PROJECT},Territory:'Austin',Status:'Active'}];
 h.c.S.builders=[{ID:BUYER,Builder_Name:'Coventry'}];
 h.c.S.nc={type:'Lot (Master)',project:PROJECT,parent:'',sub:[SUB],wbw:[],builder:BUYER,name:'Lot ownership safety',territory:'Austin',status:'New',acts:[],seedSource:'none',owners:[ACCESS],lotIds:[],ppf:{50:'1300'},esc:{},escTouched:{},totalLots:'10',emPerLot:'',initLots:'2',initDays:'30',secondLots:'2',secondDays:'45',contLots:'2',contDays:'30'};
 h.c.S.clp=editing?{cid:ID,lots0:[],ppf0:'{"50":"1300"}',esc0:'{}',terms:{Number_of_Lots:'10',Initial_Takedown:'2',Initial_Takedown_Days:'30',Second_Closing_Lots:'2',Second_Closing_Days:'45',Subsequent_Takedown_Lots:'2',Subsequent_Takedown_Days:'30'}}:null;
 h.c.S.lpSub=SUB;h.c.S.lpLoading=false;h.c.S.lpLoadError='';
 return h.c.S.nc;
}

{
 const h=await ready({realDOM:true}),rows=[lot(),lot(LOT2)],draft=setup(h,{rows}),before=h.calls.length;
 // Cached lots and parents both say available; the native reports changed after startup.
 rows[0].Contract1={ID:OTHER,zc_display_value:'Reverse-only contract'};
 h.reports.All_Contracts1.push({ID:OTHER,Contract_Name:'Fresh parent claim',Status:'New',Lots1:[{ID:LOT2}]});
 assert.equal(await h.c.ncLoadPickerLots(),true);
 const reads=h.calls.slice(before).filter(call=>['count','records'].includes(call.method));
 assert.ok(reads.some(call=>call.method==='records'&&call.config.report_name===h.c.CFG.reports.lots&&call.config.criteria==='(Subdivision == '+SUB+')'),'picker freshly reads scoped Lots');
 assert.ok(reads.some(call=>call.method==='records'&&call.config.report_name===h.c.CFG.reports.contracts&&!call.config.criteria),'picker freshly reads the complete Contract claims report');
 assert.equal(h.c.lotPickable(h.c.S.lots.find(row=>row.ID===LOT),h.c.lpClaimIndex()),false,'fresh reverse-only ownership locks the lot');
 assert.equal(h.c.lotPickable(h.c.S.lots.find(row=>row.ID===LOT2),h.c.lpClaimIndex()),false,'fresh parent membership locks the lot');
 h.c.lpToggle(LOT,true);h.c.lpToggle(LOT2,true);h.c.lpSelectBlock('0A');
 assert.deepEqual(Array.from(draft.lotIds),[],'direct and block selection cannot add either claimed lot');
 assert.equal(writes(h).length,0);
 // A second open must refresh both reports again rather than retain stale claimed/available results.
 rows[0].Contract1='';h.reports.All_Contracts1[1].Lots1=[];
 assert.equal(await h.c.ncLoadPickerLots(),true);
 assert.equal(h.c.lotPickable(h.c.S.lots.find(row=>row.ID===LOT),h.c.lpClaimIndex()),true);
 assert.equal(h.c.lotPickable(h.c.S.lots.find(row=>row.ID===LOT2),h.c.lpClaimIndex()),true);
}

for(const status of ['Open','Sold','Scheduled','Contracted','On Hold','Legacy','',null]){
 const h=await ready({realDOM:true}),row=lot(LOT,{Status:status}),draft=setup(h,{rows:[row]});
 assert.equal(await h.c.ncLoadPickerLots(),true);
 assert.equal(h.c.lotPickable(h.c.S.lots[0],h.c.lpClaimIndex()),true,'unassociated '+status+' remains selectable for backfill');
 h.c.lpToggle(LOT,true);assert.deepEqual(Array.from(draft.lotIds),[LOT]);assert.equal(writes(h).length,0,'selection alone never mutates a Lot');
}

{
 const h=await ready({realDOM:true}),row=lot(LOT,{Status:'Sold',Contract1:{ID,zc_display_value:'Own contract'}}),draft=setup(h,{editing:true,rows:[row]});
 h.reports.All_Contracts1[0].Lots1=[{ID:LOT}];h.c.S.contracts=clone(h.reports.All_Contracts1);
 assert.equal(await h.c.ncLoadPickerLots(),true);
 assert.equal(h.c.lotPickable(h.c.S.lots[0],h.c.lpClaimIndex()),true,'an edited contract can retain its own lot');
 assert.deepEqual(Array.from((await h.c.clpValidateLots(ID,[LOT])).ids),[LOT]);
 h.reports.All_Contracts1[0].Lots1=[];h.c.S.contracts=clone(h.reports.All_Contracts1);
 assert.deepEqual(Array.from((await h.c.clpValidateLots(ID,[LOT])).ids),[LOT],'a reverse-only own link also remains valid when editing the exact owner');
 await assert.rejects(h.c.clpValidateLots('',[LOT]),/unavailable|belongs|another contract/,'explicit new-contract validation must not inherit the open editor identity');
 h.c.lpToggle(LOT,true);assert.deepEqual(Array.from(draft.lotIds),[LOT]);assert.equal(writes(h).length,0);
}

for(const status of ['New','Complete','Approval Rejected','Archived']){
 const h=await ready({realDOM:true}),row=lot(),draft=setup(h,{parents:[{ID:OTHER,Contract_Name:'Claimed lot',Status:status,Archive:status==='Archived',Lots1:[{ID:LOT}]}]});
 assert.equal(await h.c.ncLoadPickerLots(),true);
 assert.equal(h.c.lotPickable(h.c.S.lots[0],h.c.lpClaimIndex()),false,status+' membership always blocks reuse');
 h.c.lpToggle(LOT,true);h.c.lpSelectBlock('0A');assert.deepEqual(Array.from(draft.lotIds),[]);
 await assert.rejects(h.c.clpValidateLots('',[LOT]),/unavailable|belongs|another contract/);assert.equal(writes(h).length,0);
}

for(const raw of [undefined,42,{ID:Number(OTHER)},'not-an-id',{value:OTHER},[OTHER,ID]]){
 const h=await ready({realDOM:true}),row=lot(),draft=setup(h,{rows:[row]});
 if(raw===undefined){delete row.Contract1;delete h.c.S.lots[0].Contract1;}else{row.Contract1=raw;h.c.S.lots[0].Contract1=clone(raw);}
 assert.equal(h.c.lotPickable(h.c.S.lots[0],h.c.lpClaimIndex()),false,'unknown or malformed reverse ownership fails closed');
 h.c.lpToggle(LOT,true);assert.deepEqual(Array.from(draft.lotIds),[]);
 assert.equal(await h.c.ncLoadPickerLots(),false,'incomplete ownership fields cannot publish available picker results');
 assert.ok(h.c.S.lpLoadError);
 h.c.lpSelectBlock('0A');assert.deepEqual(Array.from(draft.lotIds),[]);
 await assert.rejects(h.c.clpValidateLots('',[LOT]));assert.equal(writes(h).length,0);
}

for(const Lots1 of [undefined,{ID:42},[OTHER,OTHER]]){
 const h=await ready({realDOM:true}),draft=setup(h),retainedLots=h.c.S.lots,retainedParents=h.c.S.contracts,other={ID:OTHER,Contract_Name:'Unreadable parent'};
 if(Lots1!==undefined)other.Lots1=Lots1;h.reports.All_Contracts1.push(other);
 assert.equal(await h.c.ncLoadPickerLots(),false,'all native parents require a complete valid Lots selection');
 assert.equal(h.c.S.lots,retainedLots);assert.equal(h.c.S.contracts,retainedParents);
 h.c.lpToggle(LOT,true);h.c.lpSelectBlock('0A');assert.deepEqual(Array.from(draft.lotIds),[]);assert.equal(writes(h).length,0);
}

for(const blockedReport of ['lots','contracts']){
 for(const change of ['draft','actor']){
  const h=await ready({realDOM:true}),draft=setup(h),gate=deferred(),native=h.api.getRecords,retainedLots=h.c.S.lots,retainedParents=h.c.S.contracts;
  h.api.getRecords=config=>config.report_name===h.c.CFG.reports[blockedReport]?gate.promise.then(()=>native(config)):native(config);
  const pending=h.c.ncLoadPickerLots();await drain();
  assert.equal(h.c.S.lpLoading,true);h.c.lpToggle(LOT,true);h.c.lpSelectBlock('0A');assert.deepEqual(Array.from(draft.lotIds),[],'pending ownership reads cannot permit selection');
  if(change==='draft')h.c.S.nc={...draft,lotIds:[]};else h.c.LMRuntime.apply({envUrlFragment:'',loginUser:'changed-actor@example.test'});
  gate.resolve();assert.equal(await pending,false,'late '+blockedReport+' read cannot publish after '+change+' changes');
  assert.equal(h.c.S.lots,retainedLots);assert.equal(h.c.S.contracts,retainedParents);
  h.c.lpToggle(LOT,true);h.c.lpSelectBlock('0A');assert.deepEqual(Array.from(h.c.S.nc.lotIds),[],'late reads cannot unlock an unverified selection');assert.equal(writes(h).length,0);
 }
}

for(const lateOutcome of ['success','failure']){
 const h=await ready({realDOM:true}),rows=[lot()],draft=setup(h,{rows}),gate=deferred(),native=h.api.getRecords;
 let frozen=false;
 h.api.getRecords=config=>{
  if(config.report_name===h.c.CFG.reports.contracts&&!config.criteria&&!frozen){
   frozen=true;
   // Freeze the native response before holding it, so the earlier load retains
   // the old unclaimed membership even though the same draft is refreshed again.
   return native(config).then(response=>gate.promise.then(()=>response));
  }
  return native(config);
 };
 const older=h.c.ncLoadPickerLots();await drain();assert.equal(frozen,true);
 h.reports.All_Contracts1[0].Lots1=[{ID:LOT}];rows[0].Base_Price='70000';rows[0].Notes='Newer verified snapshot';
 assert.equal(await h.c.ncLoadPickerLots(),true,'the newer same-draft refresh publishes current ownership');
 const currentLots=h.c.S.lots,currentParents=h.c.S.contracts,currentClaims=h.c.S.lpClaims,currentBanner=h.node('banners').innerHTML;
 assert.equal(h.c.lotPickable(currentLots[0],h.c.lpClaimIndex()),false);
 assert.equal(currentLots[0].Base_Price,'70000');
 if(lateOutcome==='failure')gate.reject(Error('Older ownership read failed'));else gate.resolve();
 assert.equal(await older,false,'older '+lateOutcome+' must not publish after a newer same-draft refresh');
 assert.equal(h.c.S.lots,currentLots);assert.equal(h.c.S.contracts,currentParents);assert.equal(h.c.S.lpClaims,currentClaims);
 assert.equal(h.c.S.lpLoading,false);assert.equal(h.c.S.lpLoadError,'');assert.equal(h.node('banners').innerHTML,currentBanner,'obsolete failure cannot replace the newer success with an error');
 h.c.lpToggle(LOT,true);h.c.lpSelectBlock('0A');assert.deepEqual(Array.from(draft.lotIds),[],'an old response cannot unlock the newer claimed lot');assert.equal(writes(h).length,0);
}

{
 const h=await ready({realDOM:true}),draft=setup(h),olderGate=deferred(),newerGate=deferred(),native=h.api.getRecords;let parentReads=0;
 h.api.getRecords=config=>{
  if(config.report_name===h.c.CFG.reports.contracts&&!config.criteria){
   const gate=++parentReads===1?olderGate:newerGate;
   return native(config).then(response=>gate.promise.then(()=>response));
  }
  return native(config);
 };
 const older=h.c.ncLoadPickerLots();await drain();h.reports.All_Contracts1[0].Lots1=[{ID:LOT}];
 const newer=h.c.ncLoadPickerLots();await drain();assert.equal(parentReads,2);assert.equal(h.c.S.lpLoading,true);
 olderGate.reject(Error('Obsolete ownership failure'));assert.equal(await older,false);
 assert.equal(h.c.S.lpLoading,true,'obsolete failure cannot unlock a still-pending newer refresh');assert.equal(h.c.S.lpLoadError,'');
 h.c.lpToggle(LOT,true);h.c.lpSelectBlock('0A');assert.deepEqual(Array.from(draft.lotIds),[]);
 newerGate.resolve();assert.equal(await newer,true);assert.equal(h.c.S.lpLoading,false);assert.equal(h.c.lotPickable(h.c.S.lots[0],h.c.lpClaimIndex()),false);assert.equal(writes(h).length,0);
}

{
 const h=await ready({realDOM:true}),draft=setup(h,{rows:[lot(),lot(LOT2,{Contract1:{ID:OTHER}})]});
 const unknown=(BigInt(LOT2)+100n).toString(),outside=lot(unknown,{Subdivision:{ID:OTHER}});h.c.S.lots.push(outside);
 h.c.lpToggle(LOT2,true);h.c.lpToggle(unknown,true);h.c.lpToggle((BigInt(LOT2)+101n).toString(),true);
 assert.deepEqual(Array.from(draft.lotIds),[],'direct calls cannot bypass ownership, scope or exact-record guards');
 h.c.lpSelectBlock('0A');assert.deepEqual(Array.from(draft.lotIds),[LOT],'block selection adds only the verified unclaimed scoped lot');
 h.c.lpToggle(LOT,false);assert.deepEqual(Array.from(draft.lotIds),[],'ordinary deselection remains available');assert.equal(writes(h).length,0);
}

for(const editing of [false,true]){
 const h=await ready({realDOM:true}),rows=[lot()],draft=setup(h,{editing,rows});draft.lotIds=[LOT];
 assert.doesNotThrow(()=>h.c.ncPayload(),'the fixture is valid before the ownership check');
 rows[0].Contract1={ID:OTHER,zc_display_value:'Claim established after picker opened'};
 const before=h.calls.length,result=editing?await h.c.clpSave():await h.c.ncSubmit([],[]);
 assert.ok(result&&result.error,'a fresh reverse-only claim rejects '+(editing?'Lots & Pricing':'new contract creation')+' after passing ordinary validation: '+h.node('banners').textContent);
 assert.match(String(result.error.message||result.error),/unavailable|belongs|another contract/);
 assert.equal(writes(h).length,0,'rejected ownership validation sends no parent, pricing or Lot writes');
 assert.ok(h.calls.slice(before).some(call=>call.method==='records'&&call.config.report_name===h.c.CFG.reports.lots));
 assert.ok(h.calls.slice(before).some(call=>call.method==='records'&&call.config.report_name===h.c.CFG.reports.contracts));
 assert.equal(h.c.contractHasReviews(),false,'a rejected read-only check creates no ambiguous mutation');
}

console.log('PASS actual Lot selection safety: fresh scoped Lots and full parent claims, both ownership directions, own editing and explicit new scope, archived/rejected locks, all-status unassociated backfill, strict missing/malformed fields, guarded direct/block selection, stale actor/draft reads, overlapping refresh success/failure exclusion and zero writes from rejected create/edit.');
