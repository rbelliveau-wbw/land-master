import assert from 'node:assert/strict';
import {ready,drain,ID,SUB,ACCESS,NEW} from './test-contract-sdk-v2-foundation.mjs';

const roles=[
 {label:'editor',known:true,edit:true,propose:false,action:'New'},
 {label:'editor and proposer',known:true,edit:true,propose:true,action:'New'},
 {label:'proposal-only',known:true,edit:false,propose:true,action:'Proposed'},
 {label:'existing degraded access',known:false,edit:false,propose:false,action:'New'}
];
function draft(h,status='New'){
 h.c.S.nc={type:'DA',project:'',parent:'',sub:[SUB],wbw:[],builder:'',name:'New review queue fixture',territory:'Austin',status,acts:[],seedSource:'default',owners:[ACCESS],lotIds:[],ppf:{},totalLots:'',emPerLot:'',initLots:'',initDays:'',contLots:'',contDays:''};
}

for(const role of roles){
 const h=await ready({realDOM:true});Object.assign(h.c.S.acc,role);
 assert.equal(h.c.canPropose(),true,role.label+' retains existing create access');
 // The routing check does not need the separate modal/options-loading surface.
 for(const name of ['ncOpen','ncLoadOptions','ncLoadProjects','ncLoadTemplates','ncLoadUsers'])h.c[name]=()=>{};
 h.c.newContract();assert.equal(h.c.S.nc.status,'Proposed',role.label+' opens a Proposed parent');await drain();
 draft(h,'New');assert.equal(h.c.ncPayload().Status,'Proposed','an old draft default cannot bypass parent review');
 const result=await h.c.ncSubmit([{title:'Retained action default',sort:1}],[{email:'fixture@example.test',seq:1,type:'Legal',days:7}]);
 assert.equal(result.error,null);assert.equal(h.reports.All_Contracts1.find(row=>row.ID===NEW).Status,'Proposed');
 assert.equal(h.calls.find(call=>call.method==='add'&&call.config.form_name==='Contract').config.payload.data.Status,'Proposed','initial persisted parent enters Review before child setup');
 assert.equal(h.reports.All_Contract_Actions.find(row=>row.Contract1===NEW).Status,role.action,role.label+' retains its action default');
 const approval=h.reports.All_Contract_Approvals.find(row=>row.Contract1===NEW);assert.equal(approval.Status,'Not Sent');assert.equal(approval.Approval_Email,false);assert.equal(approval.Reminder_Interval_Days,7);
 assert.ok(h.c.proposedContracts().some(row=>row.ID===NEW));assert.ok(!h.c.filteredContracts().some(row=>row.ID===NEW),'new parents do not enter the main pipeline before Legal accepts');
 assert.equal(h.c.reviewCount(),1,'nested proposed actions count with their parent once');assert.equal(h.c.ContractSetupUI.close(),true);
 h.c.pcRun(NEW,true);await drain();assert.equal(h.reports.All_Contracts1.find(row=>row.ID===NEW).Status,'New','existing Review acceptance still enters New');
 assert.ok(h.c.filteredContracts().some(row=>row.ID===NEW));assert.equal(h.c.proposedContracts().length,0);assert.equal(h.c.reviewCount(),0);
 assert.equal(h.reports.All_Contract_Actions.find(row=>row.Contract1===NEW).Status,'New','acceptance retains its existing proposed-action transition');
 assert.equal(h.reports.All_Contracts1.find(row=>row.ID===ID).Status,'New','existing unrelated parent is unchanged');
}

{
 const h=await ready({realDOM:true});Object.assign(h.c.S.acc,{known:true,edit:false,propose:false});h.c.newContract();assert.equal(h.c.S.nc,null,'existing create denial remains enforced');assert.equal(h.calls.filter(call=>['add','update','delete'].includes(call.method)).length,0);
}
{
 const h=await ready({realDOM:true});h.c.S.demo=true;draft(h);const count=h.c.S.contracts.length;await h.c.ncSubmit([{title:'Demo action',sort:1}],[]);const parent=h.c.S.contracts[count];assert.equal(parent.Status,'Proposed','Demo parents also enter Review');assert.equal(h.c.actionsFor(parent.ID)[0].Status,'New','the existing Demo action default remains New');assert.ok(h.c.proposedContracts().some(row=>row.ID===parent.ID));assert.equal(h.calls.filter(call=>['add','update','delete'].includes(call.method)).length,0);
}
console.log('PASS actual Contract creation: all eligible roles persist Proposed parents initially and finally, Review-only membership, unchanged role action/approval defaults, existing acceptance to New, denied access and Demo behavior.');
