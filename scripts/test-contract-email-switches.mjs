import assert from 'node:assert/strict';
import {ready,drain,deferred,ID,NEW} from './test-contract-sdk-v2-foundation.mjs';

for(const kind of ['attachment','approver']){
  for(const rejected of [false,true]){
    const h=await ready({realDOM:true}),field=kind==='attachment'?'Email_Attachment':'Approval_Email';
    const report=kind==='attachment'?h.c.CFG.reports.versions:h.c.CFG.reports.approvals;
    const row={ID:NEW,Contract1:{ID},[field]:'false',File_Upload:'fixture.pdf',Approver:'fixture@example.test',Status:'Not Sent',Type1:'Contract Approver'};
    h.reports[report].push(row);(kind==='attachment'?h.c.S.versions:h.c.S.approvals).push({...row});
    h.c.S.selId=ID;h.c.S.view='detail';
    if(kind==='attachment')h.c.showAttachmentsModal(ID);else h.c.showApprovalsModal(ID);
    const gate=deferred(),native=h.api.updateRecordById;let sends=0;
    h.api.updateRecordById=async config=>{sends++;assert.equal(config.payload.data[field],'true','Creator checkbox update uses a string');await gate.promise;if(rejected)return {code:2897,message:'This profile cannot edit the field'};return native(config);};
    const toggle=()=>kind==='attachment'?h.c.toggleEmailAttach(NEW,ID):h.c.aprToggleEmail(NEW);
    const pending=toggle();await drain();
    assert.equal(h.c.contractWorkflowNativePending(),true);toggle();await drain();assert.equal(sends,1,'duplicate toggle cannot send while Creator is pending');
    gate.resolve();await pending;await drain();
    assert.equal(h.c.S.busy,false);assert.equal(h.c.contractWorkflowNativePending(),false);assert.equal(h.c.contractHasReviews(),false);
    const local=kind==='attachment'?h.c.findVersion(NEW):h.c.findApproval(NEW);
    assert.equal(local[field],rejected?'false':'true');assert.equal(row[field],rejected?'false':'true');
    const close=h.c.document.querySelector('#overlays .modal-x');assert.ok(close);assert.equal(close.disabled,false,'the actual modal close control is restored after either result');
    assert.equal(h.c.canEdit(),true,'a definitive permission rejection does not quarantine the whole widget');
    if(!rejected){h.api.updateRecordById=async config=>{assert.equal(config.payload.data[field],'false');return native(config);};await toggle();assert.equal(row[field],'false','the switch saves both directions');}
  }
}

{
  const h=await ready({realDOM:true}),row={ID:NEW,Contract1:{ID},Email_Attachment:'false',File_Upload:'fixture.pdf'};
  h.reports.All_Contract_Versions.push(row);h.c.S.versions.push({...row});h.c.showAttachmentsModal(ID);
  let sends=0;h.api.updateRecordById=async()=>{sends++;throw new Error('Connection lost after sending');};
  await h.c.toggleEmailAttach(NEW,ID);await drain();
  assert.equal(h.c.contractHasReviews(),true);assert.equal(h.c.canEdit(),false);
  assert.equal(h.c.document.querySelector('#overlays .modal-x').disabled,false,'an uncertain settled write permits closing the modal');
  await h.c.toggleEmailAttach(NEW,ID);assert.equal(sends,1,'unknown outcomes retain the no-replay guard');
}
console.log('PASS actual attachment/approver Email switches: Creator string checkbox payloads, both directions, permission rollback, restored modal controls, pending duplicate exclusion and unknown no-replay.');

{
  const h=await ready({realDOM:true}),row={ID:NEW,Contract1:{ID},Email_Attachment:'No',File_Upload:'fixture.pdf'};
  h.reports.All_Contract_Versions.push(row);h.c.S.versions=await h.c.sdkGetAll(h.c.CFG.reports.versions);h.c.showAttachmentsModal(ID);
  const native=h.api.updateRecordById;
  h.api.updateRecordById=async config=>{const reply=await native(config);row.Email_Attachment=config.payload.data.Email_Attachment==='true'?'Yes':'No';return reply;};
  await h.c.toggleEmailAttach(NEW,ID);
  h.c.S.versions=await h.c.sdkGetAll(h.c.CFG.reports.versions);h.c.showAttachmentsModal(ID);
  assert.equal(row.Email_Attachment,'Yes','the native report retains its configured display label');
  assert.equal(h.c.truthy(h.c.findVersion(NEW).Email_Attachment),true,'a fresh report reload keeps the switch on');
  assert.equal(h.c.document.querySelector('#overlays .att-mail').classList.contains('on'),true);
  await h.c.toggleEmailAttach(NEW,ID);h.c.S.versions=await h.c.sdkGetAll(h.c.CFG.reports.versions);
  assert.equal(row.Email_Attachment,'No');assert.equal(h.c.truthy(h.c.findVersion(NEW).Email_Attachment),false,'a second click saves off after report formatting');
  assert.equal(h.c.contractFieldComparable('Yes','Email_Attachment',h.c.CFG.reports.versions,'true'),true,'explicit recovery understands the same native display label');
  assert.equal(h.c.truthy('True'),true);assert.equal(h.c.truthy('False'),false);
}
console.log('PASS configured Yes/No attachment decision labels: fresh report reload, actual rendered switch, on/off payload selection and explicit recovery; case-insensitive native True/False.');
