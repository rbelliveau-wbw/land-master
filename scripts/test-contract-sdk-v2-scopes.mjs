import assert from 'node:assert/strict';
import {ready,drain,deferred,ID,ACTION,SUB,NEW} from './test-contract-sdk-v2-foundation.mjs';
const SUB2='90071992547419931',OTHER='90071992547419932';
const lotId=index=>(90071992547430000n+BigInt(index)).toString();
function scope(h,subs=[SUB]){h.c.S.nc={sub:subs,lotIds:[],ppf:{}};h.c.S.clp={cid:ID};return h.c.S.nc;}
function lots(h,count=1,sub=SUB){h.reports.All_Active_Lots_Contracts_View=Array.from({length:count},(_,index)=>({ID:lotId(index),Subdivision:{ID:sub,zc_display_value:'Native phase'},Status:'Open',Lot_Code:'F-'+index,Lot_Size:'50',Contract1:''}));return h.reports.All_Active_Lots_Contracts_View;}
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
 const h=await ready();const base={Contract1:{},Contract_Action:'Template',Type_field:'DA',Sort_Order:'1'};h.reports.All_Contract_Actions=[true,false,'true',' FALSE ','Yes','No','1','0',1,0,null,''].map((value,index)=>({...base,ID:lotId(index),Template_Action:value}));
 h.reports.All_Contract_Actions.push({...base,ID:lotId(20),Template_Action:true,Contract1:{ID}}, {...base,ID:lotId(21),Template_Action:true,Type_field:''});
 const native=h.api.getRecordCount;h.api.getRecordCount=config=>{assert.notEqual(config.criteria,'Contract_Template != ""','SDK2 native count cannot use the unsupported nonblank predicate');return native(config);};
 const core=h.c.S.actions,templateStart=h.calls.length;assert.equal(await h.c.ncLoadTemplates(),true);assert.deepEqual(Array.from(h.c.S.tplActions,row=>row.ID),[0,2,4,6,8].map(lotId),'Only checked, typed, parentless records belong to the template');assert.equal(h.c.S.contractTemplatesStatus,'loaded');assert.equal(h.c.S.actions,core,'The optional read does not replace core ordinary-action records');
 const retained=h.c.S.tplActions;delete h.reports.All_Contract_Actions[0].Template_Action;assert.equal(await h.c.ncLoadTemplates(),false);assert.equal(h.c.S.tplActions,retained);assert.equal(h.c.S.contractTemplatesStatus,'error');assert.equal(h.c.ncSeedSource('DA').source,'unavailable');
 assert.ok(h.calls.slice(templateStart).filter(call=>['count','records'].includes(call.method)&&call.config.report_name==='All_Contract_Approvals').every(call=>call.config.criteria==='Contract_Template == "Builder"'),'The Builder approvals rule is unchanged');assert.equal(h.calls.filter(call=>['add','update','delete'].includes(call.method)).length,0);
}
for(const value of [42,[],{ID:42},{zc_display_value:2},'Maybe']){
 const h=await ready();Object.assign(h.reports.All_Contract_Actions[0],{Contract1:{},Type_field:'DA',Template_Action:value});assert.equal(await h.c.ncLoadTemplates(),false);assert.equal(h.c.S.contractTemplatesStatus,'error');assert.equal(h.c.ncSeedSource('DA').source,'unavailable');
}
{
 const h=await ready();const ordinary=h.c.S.actions[0],base={Contract1:{},Type_field:'DA',Contract_Action:'Native template',Template_Action:true,Sort_Order:'1'};
 h.c.S.actions=[{...ordinary,Template_Action:false,Type_field:'DA'},{...base,ID:lotId(0),Sort_Order:'2'},{...base,ID:lotId(1),Contract_Action:'First template'},{...base,ID:lotId(2),Template_Action:false,Contract_Action:'Typed orphan'},{...base,ID:lotId(3),Contract1:{ID},Contract_Action:'Saved contract action'},{...base,ID:lotId(4),Type_field:'Lot (Master)',Contract_Action:'Master template'}];
 const original=JSON.stringify(h.c.S.actions);assert.deepEqual(Array.from(h.c.templatesFor('DA'),row=>row.ID),[lotId(1),lotId(0)]);assert.deepEqual(Array.from(h.c.ncSeedSource('DA').actions,row=>row.title),['First template','Native template']);assert.equal(h.c.ncSeedSource('Issue').source,'none','Verified absence uses no template rather than generic defaults');assert.deepEqual(Array.from(h.c.ncSeedSource('Lot (Amendment)').actions,row=>row.title),['Master template'],'Existing Master fallback is retained');
 h.c.S.maType='DA';h.c.maLoadDraft();assert.deepEqual(Array.from(h.c.maBaseline(),row=>row.id),[lotId(1),lotId(0)]);assert.equal(JSON.stringify(h.c.S.actions),original,'Membership and seeding do not mutate ordinary or saved contract actions');assert.equal(h.calls.filter(call=>['add','update','delete'].includes(call.method)).length,0);
 h.c.S.actions.find(row=>row.ID===lotId(4)).Type_field='Lot';assert.equal(h.c.ncSeedSource('Lot (Amendment)').actions[0].title,'Master template','Legacy Lot type fallback is retained');
 const draft=h.c.S.maDraft;delete h.c.S.actions[0].Template_Action;assert.equal(h.c.contractTemplateCapability(h.c.S.actions),'unavailable');assert.throws(()=>h.c.templatesFor('DA'),/unavailable/);assert.equal(h.c.maLoadDraft(),false);assert.equal(h.c.S.maDraft,draft,'Unavailable scope cannot clear a retained template draft');assert.equal(h.c.maDirty(),true,'An unavailable baseline cannot claim the draft clean');h.c.maPickType('Issue');assert.equal(h.c.S.maType,'DA');assert.equal(h.c.S.maDraft,draft);h.c.renderManageActions();assert.match(h.node('view').innerHTML,/Action templates unavailable/);assert.doesNotMatch(h.node('view').innerHTML,/No template actions|Save Template/);
 h.c.S.nc={type:'DA',acts:[{title:'Retained custom action'}]};assert.equal(h.c.ncSeedActs(),false);assert.equal(h.c.S.nc.acts[0].title,'Retained custom action');assert.equal(h.c.S.nc.seedSource,'unavailable');assert.match(h.c.ncActionsPanel(),/Action templates unavailable/);assert.doesNotMatch(h.c.ncActionsPanel(),/No template for|default set/);
 h.flags.ctTemplates=true;h.c.ncApplyAccess(h.flags);h.c.maSave();h.c.ncConfirm();assert.equal(h.calls.filter(call=>['add','update','delete'].includes(call.method)).length,0,'Unavailable fields cannot save a template or create a contract');
}
{
 const h=await ready();h.c.S.actions=h.reports.All_Contract_Actions.map(row=>({...row,Contract_Template:'Builder'}));assert.equal(h.c.contractTemplateCapability(h.c.S.actions),'legacy');assert.equal(h.c.ncSeedSource('DA').source,'default');assert.equal(h.c.ncSeedSource('DA').actions.length,7,'Only genuine complete old-schema records allow captured defaults');assert.equal(h.c.templatesSupported(),false);h.c.S.actions[0].Type_field='DA';assert.equal(h.c.ncSeedSource('DA').source,'unavailable','Mixed/missing current fields do not imply legacy defaults');
}
for(const failure of ['incomplete','denied','duplicate','missing-id']){
 const h=await ready(),base={Contract1:{},Type_field:'DA',Contract_Action:'Native template',Template_Action:true,Sort_Order:'1'};
 h.reports.All_Contract_Actions=Array.from({length:2001},(_,index)=>({...base,ID:lotId(index),Template_Action:index%2===0}));
 assert.equal(await h.c.ncLoadTemplates(),true);assert.equal(h.c.S.tplActions.length,1001);const retained=h.c.S.tplActions,core=h.c.S.actions,nativeRead=h.api.getRecords,nativeCount=h.api.getRecordCount;assert.equal(h.calls.filter(call=>call.method==='records'&&call.config.report_name==='All_Contract_Actions').length,4,'Three complete unfiltered cursor pages precede local filtering, plus the original core page');assert.ok(h.maximum()<=3);
 if(failure==='incomplete')h.api.getRecords=config=>config.report_name==='All_Contract_Actions'?Promise.resolve({code:3000,data:h.reports.All_Contract_Actions.slice(0,1000)}):nativeRead(config);
 else if(failure==='denied')h.api.getRecordCount=config=>config.report_name==='All_Contract_Actions'?Promise.reject({code:2898,message:'Denied'}):nativeCount(config);
 else if(failure==='duplicate')h.reports.All_Contract_Actions[1].ID=h.reports.All_Contract_Actions[0].ID;
 else delete h.reports.All_Contract_Actions[1].ID;
 assert.equal(await h.c.ncLoadTemplates(),false);assert.equal(h.c.S.tplActions,retained);assert.equal(h.c.S.actions,core);assert.equal(h.c.ncSeedSource('DA').source,'unavailable');
 h.api.getRecords=nativeRead;h.api.getRecordCount=nativeCount;h.reports.All_Contract_Actions[1].ID=lotId(1);assert.equal(await h.c.ncLoadTemplates(),true);assert.equal(h.c.ncSeedSource('DA').source,'template');assert.equal(h.c.ncSeedSource('DA').actions.length,1001);assert.equal(h.calls.filter(call=>['add','update','delete'].includes(call.method)).length,0,'Complete retries are read only');
}
for(const change of ['actor','generation','later-request']){
 const h=await ready(),base={ID:lotId(0),Contract1:{},Type_field:'DA',Contract_Action:'Complete template',Template_Action:true,Sort_Order:'1'},gate=deferred(),native=h.api.getRecords;
 h.reports.All_Contract_Actions=[base];assert.equal(await h.c.ncLoadTemplates(),true);const snapshot=h.c.S.actionTemplateSnapshot,core=h.c.S.actions;
 h.api.getRecords=config=>config.report_name==='All_Contract_Actions'?gate.promise.then(()=>native(config)):native(config);const pending=h.c.ncLoadTemplates();await drain();
 if(change==='actor')h.c.LMRuntime.apply({envUrlFragment:'',loginUser:'different@example.test'});
 else if(change==='generation')h.c.S.contractDataGeneration++;
 else {h.api.getRecords=native;h.api.getRecordCount=config=>config.report_name==='All_Contract_Actions'?Promise.reject({code:2898,message:'Latest denied'}):Promise.resolve({code:3000,result:{records_count:'0'}});assert.equal(await h.c.ncLoadTemplates(),false);}
 gate.resolve();assert.equal(await pending,false);assert.equal(h.c.S.actionTemplateSnapshot,snapshot,'A late '+change+' scope cannot overwrite the captured snapshot');assert.equal(h.c.S.actions,core);if(change==='later-request')assert.equal(h.c.S.contractTemplatesStatus,'error','A superseded success cannot clear the latest unavailable result');assert.equal(h.calls.filter(call=>['add','update','delete'].includes(call.method)).length,0);
}
{
 const h=await ready();h.reports.All_Contracts1[0].Subdivision1=[{ID:SUB2}];assert.equal(await h.c.ncFixSubdivision(ID,[SUB]),true);const writes=h.calls.filter(call=>call.method==='update');assert.equal(writes.length,1);assert.deepEqual(writes[0].config.payload.data.Subdivision1,[SUB]);assert.deepEqual(h.reports.All_Contracts1[0].Subdivision1,[SUB]);
 const before=writes.length;assert.equal(await h.c.ncFixSubdivision(ID,[SUB]),true);assert.equal(h.calls.filter(call=>call.method==='update').length,before,'already exact verification never writes');
}
{
 const h=await ready();h.reports.All_Contracts1[0].Subdivision1=[{ID:SUB2}];let calls=0;h.api.updateRecordById=async config=>{calls++;return {code:3000,data:{ID:config.id}};};assert.equal(await h.c.ncFixSubdivision(ID,[SUB]),true);assert.equal(calls,1,'a successful corrective save does not require another field comparison or send');
}
for(const value of [undefined,[{ID:SUB},{ID:SUB}],[{ID:42}]]){
 const h=await ready();h.reports.All_Contracts1[0].Subdivision1=value;await assert.rejects(h.c.ncFixSubdivision(ID,[SUB]));assert.equal(h.calls.filter(call=>call.method==='update').length,0,'unavailable native selection cannot be treated as a landed set');
}
console.log('PASS whole Contracts scoped dependencies: 5201 counted lots, exact subdivision IDs, full fresh claims including archived/rejected parents, scope/actor/draft publication guards, unfiltered complete actions with typed local templates and one-call exact multi-ID reconciliation.');
