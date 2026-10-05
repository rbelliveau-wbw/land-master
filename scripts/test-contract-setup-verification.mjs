import assert from 'node:assert/strict';
import {ready,NEW,ACCESS,SUB} from './test-contract-sdk-v2-foundation.mjs';

const writes=h=>h.calls.filter(call=>['add','update','delete'].includes(call.method));
function draft(h){
  h.c.S.nc={type:'DA',project:'',parent:'',sub:[SUB],wbw:[],builder:'',name:'Saved parent fixture',territory:'Austin',status:'New',acts:[],seedSource:'default',owners:[ACCESS],lotIds:[],ppf:{},totalLots:'',emPerLot:'',initLots:'',initDays:'',contLots:'',contDays:''};
  return h.c.S.nc;
}
const approvals=[{email:'first@example.test',seq:1,type:'Contract Approval',days:5},{email:'second@example.test',seq:2,type:'Final Approval',days:7}];
const action=[{title:'First action',sort:1}];
const plain=value=>JSON.parse(JSON.stringify(value));

{
  const h=await ready({realDOM:true}),native=h.api.addRecords;draft(h);
  h.api.addRecords=async config=>{
    const response=await native(config);
    if(config.form_name==='Contract_Approvals'){
      const row=h.reports.All_Contract_Approvals.at(-1);
      row.Contract1={ID:row.Contract1,zc_display_value:'Saved parent fixture'};
      row.Approval_Sequence=String(row.Approval_Sequence)+'.00';
      row.Reminder_Interval_Days=String(row.Reminder_Interval_Days);
      row.Approval_Email='FALSE';
    }
    return response;
  };
  const result=await h.c.ncSubmit(action,approvals);
  assert.equal(result.error,null);
  assert.equal(result.rows.filter(row=>row.state==='verified').length,5);
  assert.equal(h.reports.All_Contract_Approvals.length,2);
  assert.equal(h.reports.All_Contracts1.find(row=>row.ID===NEW).Status,'Proposed','verified creation enters Review even when the captured draft still says New');
  assert.equal(writes(h).length,5,'every intended destination is written once and verified');
}

for(const scenario of [
  {field:'Approval_Sequence',kind:'missing',change:row=>{delete row.Approval_Sequence;},restore:()=>{}},
  {field:'Status',kind:'different',persist:true,change:row=>{row.Status='Approved';},restore:h=>{h.reports.All_Contract_Approvals[0].Status='Not Sent';}},
  {field:'Approval_Email',kind:'unverifiable',change:row=>{row.Approval_Email='PRIVATE-CHECKBOX-VALUE';},restore:()=>{}},
  {field:'Approver',kind:'different',change:row=>{row.Approver='PRIVATE-RECIPIENT@example.test';},restore:()=>{}}
]){
  const h=await ready({realDOM:true}),sourceDraft=draft(h),nativeRead=h.api.getRecords,nativeAdd=h.api.addRecords;
  if(scenario.persist)h.api.addRecords=async config=>{const response=await nativeAdd(config);if(config.form_name==='Contract_Approvals')scenario.change(h.reports.All_Contract_Approvals.at(-1));return response;};
  h.api.getRecords=async config=>{
    const response=await nativeRead(config);
    if(!scenario.persist&&config.report_name==='All_Contract_Approvals')response.data.forEach(scenario.change);
    return response;
  };
  const result=await h.c.ncSubmit(action,approvals),run=h.c.S.contractWorkflow;
  assert.ok(result.error);
  assert.equal(run.error.noReplay,true);
  assert.deepEqual(plain(run.error.verification),{
    reportName:'All_Contract_Approvals',reason:'fields',
    fields:{missing:scenario.kind==='missing'?[scenario.field]:[],different:scenario.kind==='different'?[scenario.field]:[],unverifiable:scenario.kind==='unverifiable'?[scenario.field]:[]}
  });
  assert.match(result.error,new RegExp(scenario.field));
  assert.equal(result.rows[0].state,'verified','created parent remains confirmed');
  assert.equal(result.rows[1].state,'verified','prior setup destination remains confirmed');
  assert.equal(result.rows[2].state,'unknown','the first approval remains unverified');
  assert.equal(result.rows[3].state,'not-sent','the second approval is not sent after ambiguity');
  assert.equal(result.rows[4].state,'not-sent','final parent status is not sent after ambiguity');
  assert.equal(h.reports.All_Contracts1.find(row=>row.ID===NEW).Contract_Name,'Saved parent fixture');
  assert.equal(h.reports.All_Contract_Approvals.length,1,'ambiguous first approval exists once');
  assert.equal(writes(h).length,3);
  assert.equal(h.c.S.nc,sourceDraft,'draft remains available for review');
  assert.equal(await h.c.ncSubmit(action,approvals),false);
  assert.equal(writes(h).length,3,'a repeat create cannot duplicate the saved parent or approval');
  assert.equal(await h.c.contractWorkflowRecheck(run),false,'unchanged persisted uncertainty cannot be called success');
  assert.equal(writes(h).length,3,'recheck performs no writes');
  h.api.getRecords=nativeRead;scenario.restore(h);
  assert.equal(await h.c.contractWorkflowRecheck(run),true,'only an exact later readback resolves the attempted approval');
  assert.equal(writes(h).length,3);
  assert.equal(run.entries[2].state,'verified');
  assert.equal(run.entries[3].state,'not-sent','recheck never resumes the unsent approval');
  assert.equal(run.entries[4].state,'not-sent','recheck never sends final status');
  assert.ok(!JSON.stringify(h.c.S.audit).includes('PRIVATE-'));
  assert.ok(!JSON.stringify(h.logs).includes('PRIVATE-'));
}

for(const scenario of [
  {reason:'record-count',rows:[]},
  {reason:'record-count',rows:[{ID:NEW},{ID:NEW}]},
  {reason:'record-id',rows:[{ID:(BigInt(NEW)+10n).toString(),Approver:'PRIVATE-ROW@example.test'}]}
]){
  const h=await ready();h.c.sdkGetAll=async()=>plain(scenario.rows);
  const attempt={scope:h.c.contractMutationScope(),kind:'add',id:NEW,reportName:'All_Contract_Approvals',payload:{Approver:'captured@example.test'}};
  await assert.rejects(h.c.contractReadback(attempt),error=>{
    assert.equal(error.noReplay,true);
    assert.equal(error.verification.reason,scenario.reason);
    assert.ok(!JSON.stringify(error.verification).includes('PRIVATE-'));
    assert.ok(!error.message.includes('PRIVATE-'));
    return true;
  });
}

console.log('PASS saved Contract setup: exact typed readback; missing/different/unreadable field-name-only diagnostics; preserved created parent/prior steps/draft; unknown stop; one send; read-only reconciliation without resuming unsent work; record identity/count failures; no private values in audit.');
