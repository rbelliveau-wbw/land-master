import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

// Execute real native guard candidates; local fixtures do not establish
// Creator compilation, unique-index creation, profile grants or publication.
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const base='creator/schema-changes/po-outcome-activity-2026-11-10/';
const change=JSON.parse(read(base+'change.json'));
const permissions=JSON.parse(read(base+'permissions.json'));
const reports=JSON.parse(read(base+'reports.json'));
const contacts=JSON.parse(read(base+'contacts.json'));
const form=read(base+'Activity_Log.form.ds');
const fields=['Claim_Key','Object_Type','Object_ID','Context_Type','Context_ID','Process','Event','Operation_ID','Attempt_No','Status','Recipient_Email','Recipient_Name','Subject','Started_At','Sent_At','Error_Detail','Snapshot','Actor_ID'];

assert.equal(change.generated_metadata_refreshed,false,'Candidate definitions do not rewrite historical generated metadata.');
assert.match(form,/form Activity_Log\s*\{/);
assert.match(form,/must have unique Claim_Key\s*\(/,'A native unique required key is the concurrency boundary.');
for(const field of fields)assert.equal([...form.matchAll(new RegExp('^\\s*(?:must have (?:unique )?)?'+field+'\\s*\\(', 'gm'))].length,1,field+' has one native definition');
assert.deepEqual(change.new_form.required_fields,['Claim_Key','Object_Type','Object_ID']);
assert.deepEqual(change.new_form.status_choices,['Preparing','Sending','Sent','Failed','Unknown','Skipped']);
for(const field of ['Object_Type','Object_ID','Context_Type','Context_ID','Process','Event','Actor_ID'])assert.match(form,new RegExp('\\b'+field+'\\s*\\(\\s*type = text\\b'),'Generic evidence does not require PO-only parent lookup columns.');
assert.doesNotMatch(form,/values\s*=\s*(?:Payment_Request|Add_Budget)\.ID/,'Other processes can reuse the log.');
assert.match(form,/Sent_At\s*\(\s*type = datetime/);
assert.match(form,/Snapshot\s*\(\s*type = textarea/);
assert.deepEqual(permissions.Activity_Log.ordinary_profiles,{view:false,add:false,edit:false,delete:false,view_all:false,modify_all:false,export:false});
assert.equal(reports.new_internal_report.source_form,'Activity_Log');
assert.equal(reports.new_internal_report.link_name,'Activity_Log_Report');
assert.equal(reports.new_internal_report.display_name,'Activity Log Report');
assert.equal(reports.new_internal_report.superseded_candidate_link_name,'All_Activity_Logs');
assert.equal(reports.new_internal_report.native_observation.access_development_fragment,'#Report:Activity_Log_Report');
assert.equal(reports.new_internal_report.native_observation.builder_path,'/reportbuilder/Activity_Log_Report/edit');
assert.equal(reports.new_internal_report.runtime_dependency,false,'Scoped budget helpers do not read the raw generated report.');
for(const field of fields)assert.ok(reports.new_internal_report.required_fields.includes(field));
assert.deepEqual(reports.updates.find(row=>row.report==='All_Settings').add_fields,['PO_Approved_Recipients','PO_Rejected_Recipients']);
assert.equal(reports.updates.find(row=>row.report==='User_Access_Report').new_profile_grants,false,'Notification support never broadens the roster report.');
const profileEvidence=JSON.parse(read(base+permissions.Activity_Log.native_profile_readback.capture));
assert.equal(profileEvidence.length,9);assert.equal(new Set(profileEvidence.map(row=>row.profile)).size,9);
for(const profile of profileEvidence){
  assert.equal(profile.activity.length,1,'One observed Activity Log permission row per profile.');
  assert.match(profile.activity[0].text,/^Activity Log\b/);
  assert.deepEqual(profile.activity[0].inputs.map(input=>input.id.replace('4410926000005894481-','')).sort(),['add','delete','edit','more','view']);
  assert.ok(profile.activity[0].inputs.every(input=>input.checked===false),profile.profile+' retains all five visible controls unchecked.');
}
assert.equal(permissions.Activity_Log.native_profile_readback.permission_changes_made,false);

const settings=read(base+'Settings.PO_Recipients.fields.ds');
assert.match(settings,/Purchase_Order_Notifications\s*\([\s\S]*?visibility = true/);
for(const field of ['PO_Approved_Recipients','PO_Rejected_Recipients'])assert.match(settings,new RegExp('\\b'+field+'\\s*\\(\\s*type = list[\\s\\S]*?values = User_Access\\.ID'));
const pm=read(base+'Territory.Construction_PM.field.ds');
assert.match(pm,/Construction_PM\s*\(\s*type = picklist\s*displayname = "Construction PM"\s*values = User_Access\.ID/,'Construction PM is a single person, not an approval role.');
assert.match(pm,/displayformat = \[Full_Name \+ " - " \+ Approver_Email\]/);
const user=read(base+'User_Access.User.field.ds');
assert.match(user,/^User\s*\(\s*type = picklist\s*module = users/m);
assert.doesNotMatch(user,/^\s*must have User\b/m,'Only native User becomes optional.');
assert.deepEqual(change.user_access.keep_mandatory,['Full_Name','Approver_Email']);
assert.equal(permissions.notification_contacts.User,null);
assert.equal(permissions.notification_contacts.Approval_Routing_Enabled,false);
assert.deepEqual(permissions.notification_contacts.permission_grants,[]);
assert.deepEqual(permissions.notification_contacts.profiles,[]);
assert.deepEqual(contacts.contacts,[
  {Full_Name:'Sokha Sim',Approver_Email:'ssim@wbdevelopment.com'},
  {Full_Name:'Kimberly M. Singer',Approver_Email:'kim.singer@wbdevelopment.com'},
  {Full_Name:'Michael Wilson',Approver_Email:'mwilson@wbdevelopment.com'}
]);
assert.equal(new Set(contacts.contacts.map(row=>row.Approver_Email.toLowerCase())).size,3);
assert.equal(contacts.required_existing_person.name,'Samuel Spears');
assert.equal(contacts.required_existing_person.email,'sspears@wbdevelopment.com','Sam uses the authenticated Production report readback, not a guessed address.');
assert.deepEqual(contacts.required_existing_person.provenance,{
  environment:'Production',report:'User_Access_Report',verified_on:'2026-11-10',
  method:'Authenticated native report read-only inspection by the parent agent',
  native_record_id:'4410926000005497010',native_user:'sspears_wbdevelopment',production_record_changed:false
});
assert.equal(typeof contacts.required_existing_person.provenance.native_record_id,'string','Production identity remains an exact native ID string.');
assert.equal(contacts.required_existing_person.development_seed.Full_Name,'Samuel Spears');
assert.equal(contacts.required_existing_person.development_seed.Approver_Email,contacts.required_existing_person.email);
assert.equal(contacts.required_existing_person.development_seed.User,null,'A Development contact does not copy the Production Creator login.');
assert.equal(contacts.required_existing_person.development_seed.Approval_Routing_Enabled,false);
assert.equal(Object.hasOwn(contacts.required_existing_person.development_seed,'ID'),false,'Native lookup IDs cannot cross environments.');
assert.equal(contacts.create_only_when_no_match.User,null);
assert.equal(contacts.create_only_when_no_match.Approval_Routing_Enabled,false);

function executeGuard(source,input,tables={}){
  const body=translate('string validateSchema()\n{\n'+source.replace(/alert\s+([^;]+);/g,'throw Error($1);').replace(/cancel (?:submit|delete);/g,'')+'\nreturn "ok";\n}').js;
  const context=vm.createContext({fixtureJSON:JSON.stringify({input,tables})});
  vm.runInContext(`
    var fixture=JSON.parse(fixtureJSON),input=fixture.input,tables=fixture.tables;
    function ifnull(value,fallback){return value==null?fallback:value;}
    Array.prototype.count=function(){return this.length;};
    function record(row){return new Proxy(row,{get(object,key){return object[key]??null;}});}
    function query(form,predicate){
      var rows=(tables[form]||[]).map(record).filter(predicate);
      return new Proxy(rows,{get(array,key){return key in array||typeof key==='symbol'?array[key]:array[0]?.[key]??null;}});
    }
    ${body}
    var result=validateSchema();
  `,context);
  return context.result;
}

const guard=read(base+'User_Access.validate.dg');
const roster={User_Access:[{ID:'100',User:null,Full_Name:'First Contact'},{ID:'101',User:'',Full_Name:'Second Contact'},{ID:'102',User:'real.login',Full_Name:'Existing User'}]};
for(const User of [null,'','   '])assert.equal(executeGuard(guard,{ID:null,User,Approval_Routing_Enabled:false},roster),'ok','Several blank-login notification contacts remain valid.');
assert.throws(()=>executeGuard(guard,{ID:null,User:null,Approval_Routing_Enabled:true},roster),/needs a Creator login/,'An email contact cannot become a routed approver.');
assert.throws(()=>executeGuard(guard,{ID:null,User:'real.login',Approval_Routing_Enabled:false},roster),/already has a User Access record/);
assert.throws(()=>executeGuard(guard,{ID:'999',User:'real.login',Approval_Routing_Enabled:false},roster),/already has a User Access record/);
assert.equal(executeGuard(guard,{ID:'102',User:'real.login',Approval_Routing_Enabled:true},roster),'ok','An existing login may edit its own identity and keep its actual routing flag.');
assert.equal(executeGuard(guard,{ID:null,User:'another.login',Approval_Routing_Enabled:false},roster),'ok');
assert.throws(()=>executeGuard(read(base+'Activity_Log.validate.dg'),{}),/maintained by the application/);
assert.throws(()=>executeGuard(read(base+'Activity_Log.delete.dg'),{}),/cannot be deleted directly/);

// Native setup evidence is a complete source-and-result capture, not an
// inferred success from an editor save message or a contact form submission.
const setupEvidence=JSON.parse(read(base+'setup-verification.json'));
const setupSource=read('creator/functions/setupPurchaseOrderNotifications.dg');
const setupNative=read(base+setupEvidence.native_capture);
const hash=value=>createHash('sha256').update(value).digest('hex');
function setupTokens(value){
  const literals=[];
  const code=value.replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,token=>token.startsWith('"')?'LIT'+literals.push(token)+'TOKEN':'').replace(/\s+/g,'');
  return {code,literals};
}
assert.equal(hash(setupSource),setupEvidence.source_sha256);
assert.equal(hash(setupNative),setupEvidence.native_capture_sha256);
const sourceTokens=setupTokens(setupSource),nativeTokens=setupTokens(setupNative);
assert.deepEqual(sourceTokens,nativeTokens,'Final native installer must preserve all code tokens, grouping and exact string literals.');
assert.equal(hash(sourceTokens.code+JSON.stringify(sourceTokens.literals)),setupEvidence.comparison.canonical_sha256);
const applied=JSON.parse(read(base+setupEvidence.execution.apply_result));
const checked=JSON.parse(read(base+setupEvidence.execution.read_only_check_after));
for(const result of [applied,checked]){
  assert.equal(result.success,true);assert.equal(result.contract,'po-notification-setup-v1');
  assert.equal(result.configurationState,'Configured');assert.equal(result.missingCount,0);assert.equal(result.setupLockPresent,false);
  assert.equal(result.settingsId,setupEvidence.execution.settings_id);
  assert.equal(new Set(result.approvedIds).size,4);assert.ok(result.approvedIds.every(id=>typeof id==='string'));
  assert.deepEqual(result.rejectedIds,['4410926000005910064']);
  assert.deepEqual(result.contacts.map(contact=>contact.id).sort(),setupEvidence.development_contacts.map(contact=>contact.id).sort());
}
assert.equal(applied.action,'Apply');assert.equal(applied.writeState,'verified');assert.equal(applied.approvedCount,4);assert.equal(applied.rejectedCount,1);
assert.deepEqual(applied.createdIds,['4410926000005894715']);
assert.equal(checked.action,'Check');assert.equal(checked.writeState,'not-started');assert.ok(checked.contacts.every(contact=>contact.matches===1));
assert.deepEqual(applied.approvedIds.slice().sort(),checked.approvedIds.slice().sort(),'Native multi-select ordering may differ without changing the exact recipient set.');
assert.equal(setupEvidence.boundaries.email_sent,false);assert.equal(setupEvidence.boundaries.production_changed,false);assert.equal(setupEvidence.boundaries.creator_published,false);

console.log('PO notification schema, reusable audit identities, native blank-login/duplicate-user guards, restricted log access and exact contact-seed contracts passed (offline fixtures).');

await import('./test-po-notification-setup.mjs');
