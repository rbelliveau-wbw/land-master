import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const widgets = JSON.parse(fs.readFileSync(path.join(root, 'manifests/widgets.json'), 'utf8')).widgets;
const errors = [];

for (const widget of widgets) {
  const htmlPath = path.join(root, widget.source_entry);
  const html = fs.readFileSync(htmlPath, 'utf8');
  for (const required of [
    'linear-gradient(180deg,#f7f9fc 0%,#e9eef6 100%)',
    'translateY(-1px)'
  ]) {
    if (!html.includes(required)) errors.push(`${widget.slug}: modern segmented-control treatment is missing ${required}.`);
  }
  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  inlineScripts.forEach((match, index) => {
    try {
      new vm.Script(match[1], { filename: `${widget.slug}:inline-${index + 1}.js` });
    } catch (error) {
      errors.push(`${widget.slug}: inline JavaScript ${index + 1} does not parse: ${error.message}`);
    }
  });

  const reporterPath = path.join(path.dirname(htmlPath), 'critical-error-reporter.js');
  const hasLegacyReporter = html.includes('queueAutomaticErrorEmail') || html.includes('queueErrorEmail');
  const referencesSharedReporter = html.includes('critical-error-reporter.js');
  if (!hasLegacyReporter && !referencesSharedReporter) {
    errors.push(`${widget.slug}: no critical-error email reporter is wired in.`);
  }
  if (referencesSharedReporter) {
    if (!fs.existsSync(reporterPath)) {
      errors.push(`${widget.slug}: critical-error-reporter.js is referenced but missing.`);
    } else {
      const reporter = fs.readFileSync(reporterPath, 'utf8');
      try {
        new vm.Script(reporter, { filename: `${widget.slug}:critical-error-reporter.js` });
      } catch (error) {
        errors.push(`${widget.slug}: critical-error-reporter.js does not parse: ${error.message}`);
      }
      for (const required of ['LLM FIX REQUEST', 'Report_Proforma_Widget_Error', 'sessionSent', '600000']) {
        if (!reporter.includes(required)) errors.push(`${widget.slug}: critical-error reporter is missing ${required}.`);
      }
      if (!html.includes('LMCriticalErrors.markReady')) errors.push(`${widget.slug}: reporter is never marked ready after Creator initialization.`);
    }
  }
}

const budgetHtml = fs.readFileSync(path.join(root, 'widgets/budget-manager/src/app/widget.html'), 'utf8');
if (!budgetHtml.includes('class="audit-top-btn"') || !budgetHtml.includes('.audit-log{position:fixed;top:48px;right:0')) {
  errors.push('budget-manager: audit log control/drawer is not anchored to the top right.');
}

const proformaHtml = fs.readFileSync(path.join(root, 'widgets/proforma-manager/src/app/widget.html'), 'utf8');
if (!proformaHtml.includes('btn-new-icon') || !proformaHtml.includes('POLISHED-CREATE-ACTION')) {
  errors.push('proforma-manager: polished New Pro Forma action is missing.');
}
for (const required of [
  'id="vAttachments"',
  'data-recview="attachments"',
  'function openPfAttachments(',
  'attachmentProformaField:"Pro_Forma"',
  'Create_Proforma_Attachment_Record',
  'Delete_Proforma_Attachment',
  'Get_Proforma_Attachment_Preview'
]) {
  if (!proformaHtml.includes(required)) errors.push(`proforma-manager: Pro Forma attachment workflow is missing ${required}.`);
}
if (!proformaHtml.includes('data-act="attachments"') || !proformaHtml.includes('View Attachments</button>') || !proformaHtml.includes('openPfAttachments(id,"vList")')) {
  errors.push('proforma-manager: list action menu is missing the View Attachments route.');
}
if (!proformaHtml.includes('var files=Array.prototype.slice.call(this.files||[]);') ||
    proformaHtml.indexOf('var files=Array.prototype.slice.call(this.files||[]);') > proformaHtml.indexOf('this.value="";', proformaHtml.indexOf('proformaAttachmentInput'))) {
  errors.push('proforma-manager: attachment files must be snapshotted before clearing the live file input.');
}
if (proformaHtml.includes('View All Pro Formas')) {
  errors.push('proforma-manager: obsolete View All Pro Formas dashboard button is still present.');
}
for (const required of [
  'function proformaApprovalLockReason(pfOrId)',
  'Cancel the approval flow before unlocking this Pro Forma.',
  'This Pro Forma is fully approved. An approval administrator can cancel and reset the approval flow to unlock it.',
  'rowCanEdit=canEditPf(r)&&!approvalState.complete',
  'rowCanLock=canEditPf(r)&&!approvalState.started&&!approvalState.complete'
]) {
  if (!proformaHtml.includes(required)) errors.push(`proforma-manager: approval-protected lock is missing ${required}.`);
}
for (const required of [
  'function isLOIApprovalLocked(m)',
  'host.classList.toggle("approval-lock",approvalLocked);',
  'Approval in progress — Pro Forma and LOI inputs are locked.',
  'canSubmitLOI=canEditPf(r)&&approvalState.complete&&!archived&&!loiDone',
  'The Pro Forma must be fully approved before submitting the LOI to Legal.',
  'LOI Worksheet save blocked — approvals have started'
]) {
  if (!proformaHtml.includes(required)) errors.push(`proforma-manager: approval-locked LOI behavior is missing ${required}.`);
}
for (const required of [
  'function canEditLOI()',
  'if(!canEditLOI()){auditLog("warn","LOI Company quick create blocked',
  'if(!canEditLOI()){closeLOIQuickCreate();auditLog("warn","LOI Company quick create submit blocked',
  'var loiEditable=canEditLOI(),loiDisabled=',
  'if(loiAction&&!canEditLOI())',
  'if(t.closest&&t.closest(\'.ed-pane[data-pane="loi"]\')&&!canEditLOI())'
]) {
  if (!proformaHtml.includes(required)) errors.push(`proforma-manager: read-only LOI mutation guard is missing ${required}.`);
}
for (const required of [
  'var accessUser=String(S.currentUser||"").trim().toLowerCase().split("@")[0];',
  'S.env&&S.env.name==="DEVELOPMENT"',
  'http_method:"POST",content_type:"application/json",payload:{user:accessUser}',
  'lookupUser:accessUser,method:request.http_method'
]) {
  if (!proformaHtml.includes(required)) errors.push(`proforma-manager: DEV impersonated-user access transport is missing ${required}.`);
}
for (const required of [
  'data-loi-field="Street_Address"',
  'data-loi-field="City_State_ZIP"',
  'data-loi-field="City"',
  'Street_Address:String(r.Street_Address||"").trim()',
  'City_State_ZIP:String(r.City_State_ZIP||"").trim()',
  'City:String(r.City||"").trim()',
  'LOI:true'
]) {
  if (!proformaHtml.includes(required)) errors.push(`proforma-manager: LOI Seller/Property row contract is missing ${required}.`);
}
for (const required of [
  'Canonical values copied from the Contract.City Creator picklist.',
  '<datalist id="loiCityList">',
  '<datalist id="loiCountyList">',
  'function loiChoiceMatch(list,text)',
  'if(canon===null){ t.value=""; canon=""; }',
  'table.sub.loi-data-table',
  '.loi-table-wrap{overflow-x:auto',
  'table.sub.loi-sellers th:nth-child(5){width:240px}',
  'table.sub.loi-props th:nth-child(7){width:44px}'
]) {
  if (!proformaHtml.includes(required)) errors.push(`proforma-manager: LOI City picklist/layout polish is missing ${required}.`);
}
// City and County are Creator picklists. They are allowed to render as a searchable
// <input list=...> rather than a <select>, but ONLY bound to the vocabulary datalist -
// never as a bare text field, which is what this guard originally caught.
for (const field of ['City', 'County']) {
  const hits = proformaHtml.match(new RegExp(`<input[^>]*data-loi-field="${field}"[^>]*>`, 'g')) || [];
  if (!hits.length) {
    errors.push(`proforma-manager: no Property ${field} picker found.`);
  }
  for (const tag of hits) {
    if (!tag.includes(`list="loi${field}List"`)) {
      errors.push(`proforma-manager: Property ${field} must be bound to the loi${field}List datalist, not a free text input.`);
    }
  }
}
if (proformaHtml.includes('class="btn rowact workflow-action loi')) {
  errors.push('proforma-manager: Submit LOI to Legal must not render as a standalone row action.');
}

const proformaSave = fs.readFileSync(path.join(root, 'creator/functions/proforma_save.dg'), 'utf8');
for (const required of [
  'approvalRows = Budget_Approvals[Proforma == pfKey]',
  'completedApprovalRows = Budget_Approvals[Proforma == pfKey]',
  'Cancel the approval flow before unlocking this Pro Forma.',
  'This Pro Forma is fully approved and can never be unlocked or edited.'
]) {
  if (!proformaSave.includes(required)) errors.push(`proforma-manager: server approval lock guard is missing ${required}.`);
}

const getUserAccess = fs.readFileSync(path.join(root, 'creator/functions/getUserAccess.dg'), 'utf8');
for (const required of [
  'pfApprAll = row.Edit_All_Pro_Forma_Approvals == true;',
  'pfApprOwned = row.Edit_Owned_Pro_Forma_Approvals == true;',
  'result.put("pfApprAll",pfApprAll);',
  'result.put("pfApprOwned",pfApprOwned);'
]) {
  if (!getUserAccess.includes(required)) errors.push(`getUserAccess: Pro Forma approval permission contract is missing ${required}.`);
}
for (const required of [
  'flags.Edit_All_Pro_Forma_Approvals',
  'flags.Edit_Owned_Pro_Forma_Approvals',
  'function canViewProformaApprovals()',
  'p.apprAll || (!!p.apprOwned&&userOwnsProformaApproval(a))',
  'if(name==="vApprovals"&&!canViewProformaApprovals())name="vList";',
  'if(p==="approvals"&&!canViewProformaApprovals())',
  'if(!canEditProformaApprovalRow(approvalRow)){toast("You do not have permission to edit this approval."'
]) {
  if (!proformaHtml.includes(required)) errors.push(`proforma-manager: Pro Forma approval access gating is missing ${required}.`);
}
if (proformaHtml.includes('flags.Edit_All_Approvals') || proformaHtml.includes('flags.Edit_Owned_Approvals')) {
  errors.push('proforma-manager: Budget approval fields must not grant Pro Forma approval access.');
}

for (const required of [
  'function proformaApprovalReadiness(pfId)',
  'Select a Purchasing Company',
  'Add at least one Seller record',
  'Add at least one Property record',
  'Complete the LOI records before sending',
  'Cancel &amp; Reset Approvals'
]) {
  if (!proformaHtml.includes(required)) errors.push(`proforma-manager: approval readiness/reset behavior is missing ${required}.`);
}
for (const required of [
  'if(state.started&&perms().apprAll)top+=',
  'S.ed.model.Status=String(fresh.Status==null?S.ed.model.Status:fresh.Status);',
  'r.Approval_Notes="";',
  'kp.Status="Draft";'
]) {
  if (!proformaHtml.includes(required)) errors.push(`proforma-manager: completed approval reset/restart behavior is missing ${required}.`);
}
if (proformaHtml.includes('if(state.started&&!state.complete&&perms().apprAll)')) {
  errors.push('proforma-manager: approval administrators must be able to reset a completed approval chain.');
}
const startProformaApproval = fs.readFileSync(path.join(root, 'creator/functions/Start_Proforma_Approval_Chain.dg'), 'utf8');
for (const required of [
  'if(pf.Purchasing_Company == null)',
  'sellerRows = Builder[Proforma == proformaIdLong];',
  'propertyRows = Property[Proforma == proformaIdLong];',
  'sellerRow.Street_Address',
  'propertyRow.City',
  'pf.Status="Pending Approval";'
]) {
  if (!startProformaApproval.includes(required)) errors.push(`Start_Proforma_Approval_Chain: approval readiness/status guard is missing ${required}.`);
}
const killProformaApproval = fs.readFileSync(path.join(root, 'creator/functions/Kill_Proforma_Approval_Flow.dg'), 'utf8');
if (!killProformaApproval.includes('pf.Status="Draft";')) {
  errors.push('Kill_Proforma_Approval_Flow: reset must return the Pro Forma lifecycle status to Draft.');
}
for (const forbidden of [
  '.then(function(){return safeSetProformaLifecycleStatus(id,"Pending Approval","Approval chain started");})',
  '.then(function(){return safeSetProformaLifecycleStatus(id,"Draft","Approval flow cancelled");})'
]) {
  if (proformaHtml.includes(forbidden)) errors.push('proforma-manager: approval lifecycle writes must stay inside Deluge APIs so status-only REST updates do not rerun RUN_EVERYTHING.');
}

for (const required of [
  'function normalizeLandCostPerAcre(m,rescaleInstallments)',
  'inputF("Land_Cost_Acre",{type:"number",step:"1"})',
  'var INT_HDR={ Land_Cost_Acre:1,',
  'if(normalizeLandCostPerAcre(m0,true))',
  'Land Cost / Acre normalized before save'
]) {
  if (!proformaHtml.includes(required)) errors.push(`proforma-manager: whole-dollar Land_Cost_Acre handling is missing ${required}.`);
}
if (proformaHtml.indexOf('if(normalizeLandCostPerAcre(m0,true))') > proformaHtml.indexOf('var m=S.ed.model, errs=validateModel(m);')) {
  errors.push('proforma-manager: Land_Cost_Acre must be normalized before save validation.');
}
if (!proformaSave.includes('pf.Land_Cost_Acre=header.get("Land_Cost_Acre").toDecimal().round(0);')) {
  errors.push('proforma_save: Land_Cost_Acre must be rounded to Creator whole-dollar precision.');
}
for (const required of [
  'loiApprovalRows = Budget_Approvals[Proforma == pfKey];',
  'loiApprovalStarted = false;',
  'Cancel the approval flow before editing the LOI Worksheet.'
]) {
  if (!proformaSave.includes(required)) errors.push(`proforma_save: approval-locked LOI guard is missing ${required}.`);
}
for (const required of [
  'Street_Address=ifnull(ns.get("Street_Address"),"")',
  'City_State_ZIP=ifnull(ns.get("City_State_ZIP"),"")',
  'City=ifnull(np.get("City"),"")',
  'LOI=true'
]) {
  if (!proformaSave.includes(required)) errors.push(`proforma_save: LOI Seller/Property persistence is missing ${required}.`);
}

if (errors.length) {
  console.error('\nWidget JavaScript validation errors:');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Parsed JavaScript and verified critical-error reporting for ${widgets.length} widgets.`);
