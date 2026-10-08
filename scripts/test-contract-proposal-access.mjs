import assert from 'node:assert/strict';
import {ready,drain,ID,ACTION,SUB,ACCESS,NEW} from './test-contract-sdk-v2-foundation.mjs';

const proposer={ctEdit:false,ctPropose:true,ctApprove:false,ctTemplates:false,ctDeleteArchive:false};
function field(h,grid=false,name='Dev_Notes',value='Proposal user edit'){
 const el=h.node('proposal-field');el.value=value;el.isConnected=true;
 el.setAttribute(grid?'data-id':'data-aid',ACTION);el.setAttribute(grid?'data-f':'data-af',name);return el;
}
function draft(h,type='Acquisition'){
 h.c.S.nc={type,project:'',parent:'',sub:[],wbw:[],builder:'',name:'Manual acquisition fixture',territory:'Austin',status:'Proposed',acts:[],owners:[ACCESS],lotIds:[],ppf:{},totalLots:'',emPerLot:'',initLots:'',initDays:'',secondLots:'',secondDays:'',contLots:'',contDays:''};
}
for(const grid of [false,true]){
 const h=await ready({accessFlags:proposer});
 assert.equal(h.c.canPropose(),true);assert.equal(h.c.canEdit(),false);
 assert.equal(h.calls.find(x=>x.method==='custom').config.api_name,'Get_User_Access','Contracts use the established full authenticated access endpoint');
 assert.equal(await (grid?h.c.gSaveField(field(h,true)):h.c.afSave(field(h))),true,'Proposal-only user can save inline action edits');
 assert.equal(h.reports.All_Contract_Actions[0].Dev_Notes,'Proposal user edit');
 assert.equal(h.calls.filter(x=>x.method==='update').length,1);
 assert.equal(h.c.canApprove(),false);assert.equal(h.c.canDeleteArchive(),false);assert.equal(h.c.canTemplates(),false);
}
{
 const h=await ready({accessFlags:proposer});
 for(const [key,value] of Object.entries({dm:'TM',sd:'2026-10-08',dd:'2026-10-09',cd:'',nt:'Review form edit',st:'Awaiting WBW LEG'}))h.node('f_'+key+'_'+ACTION).value=value;
 h.c.saveAction(ACTION);await drain();assert.equal(h.reports.All_Contract_Actions[0].Dev_Notes,'Review form edit');assert.equal(h.reports.All_Contract_Actions[0].Dev_Mgr,'TM');
 h.c.completeAction(ACTION,true);await drain();assert.equal(h.reports.All_Contract_Actions[0].Complete,true);
 h.c.reopenAction(ACTION);await drain();assert.equal(h.reports.All_Contract_Actions[0].Complete,false);
}
for(const flags of [{ctEdit:false,ctPropose:false},{found:false,hasRow:false,ctEdit:false,ctPropose:false}]){
 const h=await ready({accessFlags:flags});
 assert.equal(await h.c.afSave(field(h)),false);h.c.S.selId=ID;h.c.gAdd('Denied action');h.c.newContract();draft(h);
 assert.equal(await h.c.ncSubmit([{title:'Denied child',sort:1}],[]),false,'A stale open draft cannot bypass create permission');
 assert.equal(h.calls.filter(x=>['add','update','delete'].includes(x.method)).length,0);
}
for(const kind of ['complete','template']){
 const h=await ready({accessFlags:proposer});
 if(kind==='complete')h.c.findContract(ID).Status='Complete';else h.c.findAction(ACTION).Contract1='';
 assert.equal(await h.c.afSave(field(h)),false);assert.equal(h.calls.filter(x=>x.method==='update').length,0,'Proposal editing cannot change completed parents or global templates');
}
{
 const h=await ready({accessFlags:proposer});h.c.S.selId=ID;h.c.gAdd('Proposed grid action');await drain();
 assert.equal(h.calls.find(x=>x.method==='add').config.payload.data.Status,'Proposed','Proposal-only grid additions retain Legal review');
 assert.equal(h.c.canEdit(),false,'Adding proposed actions does not grant general editing');
}
{
 const h=await ready({accessFlags:proposer,realDOM:true});draft(h);
 assert.ok(h.c.ncTypeChoices('').includes('Acquisition'),'Acquisition is available before any type is chosen');
 assert.ok(h.c.ncTypeChoices('DA').includes('Acquisition'),'Acquisition stays available from other types');
 const html=h.c.ncFields();assert.doesNotMatch(html,/nc_sub_wrap|nc_project_wrap|mselb_ncsub|mselb_ncproject/,'Acquisition has no Project or Subdivision fields');
 assert.match(html,/nc_territory/);assert.match(html,/nc_builder_wrap/);
 Object.assign(h.c.S.nc,{type:'Amendment',sub:[SUB],project:SUB});h.c.ncTintModal=()=>{};h.c.ncTypeChange('Acquisition');
 assert.equal(h.c.S.nc.project,'');assert.equal(h.c.S.nc.sub.length,0,'Switching to Acquisition clears hidden location selections');
 Object.assign(h.c.S.nc,{sub:[SUB],project:SUB});const payload=h.c.ncPayload();
 assert.equal(payload.Project,undefined);assert.equal(payload.Subdivision1,undefined,'Stale Acquisition scope never enters the parent payload');
 const native=h.api.addRecords;h.api.addRecords=async config=>{const reply=await native(config);if(config.form_name==='Contract')h.reports.All_Contracts1.find(x=>x.ID===reply.result[0].data.ID).Subdivision1=[];return reply;};
 const result=await h.c.ncSubmit([{title:'Acquisition review action',sort:1}],[]);assert.equal(result.error,null);
 const sent=h.calls.find(x=>x.method==='add'&&x.config.form_name==='Contract').config.payload.data;
 assert.equal(sent.Contract_Type,'Acquisition');assert.equal(sent.Status,'Proposed');assert.equal(sent.Project,undefined);assert.equal(sent.Subdivision1,undefined);
 assert.equal(h.reports.All_Contract_Actions.find(x=>x.Contract1===NEW).Status,'Proposed');assert.ok(h.c.proposedContracts().some(x=>x.ID===NEW));
 assert.equal(h.calls.filter(x=>x.method==='update'&&Object.hasOwn(x.config.payload.data,'Subdivision1')).length,0,'Acquisition setup cannot restore hidden subdivisions');
}
console.log('PASS proposal-only Contract permissions: native access flags, review/inline/grid action edits, complete/reopen, proposed additions, denied/stale draft/locked/template exclusions, manual Acquisition without Project or Subdivision and Proposed Legal routing.');
