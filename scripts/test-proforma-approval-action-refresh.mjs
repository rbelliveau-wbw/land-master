import assert from 'node:assert/strict';
import {ready,source,ID,header,held,drain,clone} from './fixtures/proforma-sdk-v2-harness.mjs';

const approvalId='90071992547410021';
const approval=()=>({ID:approvalId,Proforma:{ID},Title:'CFO',Approver:'fixture@example.test',Status:'Pending',Sort_Order:'1',Sent_Date:'05-Nov-2026',Approval_Notes:''});
const approvalSource=source.replace('window.__PFW_TEST__={','window.__PFW_TEST__={runProformaApprovalAction:runProformaApprovalAction,refreshProformaApprovalState:refreshProformaApprovalState,renderApprovalPane:renderApprovalPane,');
const wrap=value=>({code:3000,details:{output:JSON.stringify(value)}});
const isApproval=config=>config.api_name.replace(/_DEV$|_STAGE$/,'')==='Handle_Proforma_Approval_Action';
async function fixture(options={}){
 const h=await ready({source:approvalSource,storage:{All_Pro_Formas_All_Fields:[{...header(),Status:'Pending Approval',Lock_Inputs:true}],All_Budget_Approvals:[approval()]},...options});
 await h.widget.openEdit(ID,'approvals');await drain();
 return h;
}
function typeNote(h,value){const input=h.document.querySelector('[data-pf-appr-note="'+approvalId+'"]');assert.ok(input);input.value=value;h.document.getElementById('edPanes').oninput({target:input});return input;}
function actionCalls(h){return h.calls.filter(call=>call.method==='custom'&&isApproval(call.config));}
{
 const h=await fixture(),revision=h.widget.PFTransport.snapshot().revision;
 const input=typeNote(h,'Approval-only draft');
 h.document.getElementById('edPanes').onchange({target:input});
 h.document.getElementById('edPanes').onclick({target:input});
 assert.equal(h.widget.S.ed.dirty,false,'approval note is not a financial change');
 assert.equal(h.widget.S.ed.loiDirty,false);
 assert.equal(h.widget.PFTransport.snapshot().revision,revision,'approval typing does not invalidate financial loads');
 h.widget.renderApprovalPane();
 assert.match(h.document.querySelector('[data-pf-appr-note="'+approvalId+'"]')?.textContent||'',/Approval-only draft/,'independent note survives a pane repaint');
 assert.equal(h.document.getElementById('btnSave').disabled,true,'approval notes use their own Save Note action');
}
for(const env of ['DEVELOPMENT','PRODUCTION']){
 const h=await fixture({env,invoke:(config,storage)=>{
  if(!isApproval(config))return;
  storage.All_Budget_Approvals[0].Status='Approved';storage.All_Budget_Approvals[0].Approval_Notes=config.payload.approvalNote;
  storage.All_Pro_Formas_All_Fields[0].Status='Approved';return wrap({success:true,message:'Final approval completed.'});
 }});
 const editor=h.widget.S.ed,model=editor.model;
 model.Land_Cost_Acre='12345.67';editor.dirty=true;editor.loi={Special_Provisions:'Unsaved Offer terms'};editor.loiDirty=true;
 typeNote(h,'Native approval with retained financial and Offer drafts');
 const before=h.calls.length,operation=h.widget.runProformaApprovalAction(ID,approvalId,'Approved','Native approval with retained financial and Offer drafts');
 assert.equal(h.widget.runProformaApprovalAction(ID,approvalId,'Approved','duplicate'),undefined,'duplicate click is blocked');
 await operation;
 assert.equal(actionCalls(h).length,1);
 assert.equal(h.widget.S.ed,editor);assert.equal(editor.model,model);
 assert.equal(model.Land_Cost_Acre,'12345.67');assert.equal(editor.loi.Special_Provisions,'Unsaved Offer terms');
 assert.equal(editor.dirty,true);assert.equal(editor.loiDirty,true);
 assert.equal(model.Status,'Approved');assert.equal(model.Lock_Inputs,true);
 assert.equal(h.widget.S.approvals[0].Status,'Approved');assert.equal(h.widget.S.approvalBusy,false);
 assert.equal(h.widget.S.approvalNoteDrafts[approvalId],undefined);
 assert.ok(h.calls.slice(before).filter(call=>call.method==='records').every(call=>call.config.criteria&&call.config.criteria.includes(ID)),'refresh reads only the targeted parent and approval rows');
 assert.equal(h.widget.S.audit.some(event=>event.msg==='Pro Forma approval action failed'),false);
}
{
 let failedRefresh=false;
 const h=await fixture({invoke:(config,storage)=>{
  if(!isApproval(config))return;
  failedRefresh=true;storage.All_Budget_Approvals[0].Status='Approved';return wrap({success:true});
 },read:config=>failedRefresh&&config.report_name==='All_Pro_Formas_All_Fields'?{code:2899,message:'Display read denied'}:undefined});
 typeNote(h,'Committed before display failure');
 await h.widget.runProformaApprovalAction(ID,approvalId,'Approved','Committed before display failure');
 assert.equal(h.widget.S.approvals[0].Status,'Approved','acknowledged decision cannot be offered again after a refresh failure');
 assert.equal(h.widget.S.approvals[0].Approval_Notes,'Committed before display failure');
 assert.equal(h.widget.S.coreFailed,false,'optional approval refresh does not freeze financial data');
 assert.equal(h.widget.S.audit.some(event=>event.msg==='Pro Forma approval action failed'),false);
 assert.ok(h.widget.S.audit.some(event=>event.level==='warn'&&event.msg.includes('approval saved')));
 assert.match(h.document.getElementById('toast').textContent,/Approval saved.*Refresh/);
 await h.widget.runProformaApprovalAction(ID,approvalId,'Approved','must not resend');
 assert.equal(actionCalls(h).length,1);
}
{
 const h=await fixture({invoke:(config,storage)=>{
  if(!isApproval(config))return;
  storage.All_Budget_Approvals[0].Approval_Notes=config.payload.approvalNote;return wrap({success:true});
 }});
 typeNote(h,'Save note without deciding');
 await h.widget.runProformaApprovalAction(ID,approvalId,'Pending','Save note without deciding');
 assert.equal(h.widget.S.approvals[0].Status,'Pending');assert.equal(h.widget.S.approvals[0].Approval_Notes,'Save note without deciding');
 assert.equal(h.widget.S.ed.dirty,false);assert.equal(actionCalls(h).length,1);
}
{
 const h=await fixture(),editor=h.widget.S.ed,model=editor.model;
 model.Land_Cost_Acre='12345.67';editor.dirty=true;
 editor.loi={Special_Provisions:'Retained Offer draft after reset'};editor.loiDirty=true;
 h.storage.All_Pro_Formas_All_Fields[0].Status='Draft';h.storage.All_Pro_Formas_All_Fields[0].Lock_Inputs=false;
 Object.assign(h.storage.All_Budget_Approvals[0],{Status:'Not Sent',Approval_Notes:'',Sent_Date:'',Responded_Date:''});
 await h.widget.refreshProformaApprovalState(ID);
 assert.equal(h.widget.S.proformas[0].Status,'Draft');assert.equal(h.widget.S.proformas[0].Lock_Inputs,false);
 assert.equal(editor.model,model);assert.equal(model.Status,'Draft');assert.equal(model.Lock_Inputs,false,'reset false must unlock the existing editor model');
 assert.equal(model.Land_Cost_Acre,'12345.67');assert.equal(editor.loi.Special_Provisions,'Retained Offer draft after reset');
 assert.equal(editor.dirty,true);assert.equal(editor.loiDirty,true);
 assert.equal(h.widget.S.approvals[0].Status,'Not Sent');assert.equal(h.widget.S.approvals[0].Approval_Notes,'');
}
{
 let gate=null;
 const h=await fixture({read:config=>gate&&config.report_name==='All_Pro_Formas_All_Fields'?gate.promise:undefined});
 const original=clone(h.widget.S.proformas),editor=h.widget.S.ed;
 gate=held();const refresh=h.widget.refreshProformaApprovalState(ID);await drain();
 h.widget.S.navigationGeneration++;
 gate.resolve({code:3000,data:[{...header(),Status:'Approved',Lock_Inputs:true}]});
 await assert.rejects(refresh,error=>error.cancelled===true);
 assert.deepEqual(clone(h.widget.S.proformas),original);assert.equal(h.widget.S.ed,editor);
}
{
 let gates=null,index=0;
 const h=await fixture({read:config=>gates&&config.report_name==='All_Pro_Formas_All_Fields'?gates[index++].promise:undefined});
 gates=[held(),held()];
 const older=h.widget.refreshProformaApprovalState(ID);await drain();
 const newer=h.widget.refreshProformaApprovalState(ID);await drain();
 gates[1].resolve({code:3000,data:[{...header(),Status:'Approved',Lock_Inputs:true}]});await newer;
 gates[0].resolve({code:3000,data:[{...header(),Status:'Pending Approval',Lock_Inputs:true}]});
 await assert.rejects(older,error=>error.cancelled===true);
 assert.equal(h.widget.S.ed.model.Status,'Approved','an older status refresh cannot overwrite a newer result');
}
{
 const h=await fixture({invoke:config=>isApproval(config)?wrap({success:false,message:'No longer pending.'}):undefined});
 await h.widget.runProformaApprovalAction(ID,approvalId,'Approved','Rejected request');
 assert.equal(h.widget.S.approvals[0].Status,'Pending');assert.equal(h.widget.S.approvalBusy,false);
 assert.ok(h.widget.S.audit.some(event=>event.msg==='Pro Forma approval action failed'));
 assert.match(h.document.getElementById('toast').textContent,/Approval action failed/);
}
{
 const h=await fixture({invoke:config=>{if(isApproval(config))throw new Error('Reply lost after dispatch');}});
 await h.widget.runProformaApprovalAction(ID,approvalId,'Approved','Unknown reply');
 assert.ok(h.widget.PFTransport.snapshot().reviews.length,'ambiguous mutation retains its existing review guard');
 await h.widget.runProformaApprovalAction(ID,approvalId,'Approved','Do not replay');
 assert.equal(actionCalls(h).length,1,'no blind replay after a genuinely lost reply');
}
console.log('PASS approval-note isolation, target-only status refresh, retained financial/Offer drafts, committed refresh warning, duplicate/unknown-write guards and stale-navigation exclusion.');
