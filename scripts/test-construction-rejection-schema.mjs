import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

// Execute the actual native guard candidates. Offline fixtures do not replace
// native unique-field creation, Creator compilation or real profile checks.
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const base='creator/schema-changes/construction-rejection-2026-11-06/';
const change=JSON.parse(read(base+'change.json'));
const permissions=JSON.parse(read(base+'permissions.json'));
const reports=JSON.parse(read(base+'reports.json'));
const form=read(base+'Construction_Review_Log.form.ds');
assert.match(form,/must have unique Claim_Key\s*\(/,'Native unique required claim is the concurrency boundary.');
assert.equal(change.log_fields.length,10);
for(const field of change.log_fields){assert.match(form,new RegExp('\\b'+field.link_name+'\\s*\\('));}
assert.equal(change.parent_field.mandatory,false,'Existing Legal and old requests may retain an empty pointer.');
assert.match(read(base+change.parent_field.source),/Construction_Rejection_Operation\s*\(/);
assert.doesNotMatch(read(base+change.parent_field.source),/must have/);
assert.deepEqual(permissions.new_user_access_flags,[]);
assert.equal(permissions.profiles.length,3);
assert.deepEqual(permissions.profiles.map(p=>p.name),['CFO','Dev/Land Acq - Proforma & Budgets','Construction Budgeting']);
assert.ok(permissions.profiles.every(p=>p.view_decision && !p.edit_audit));
const logRule=permissions.field_rules.find(rule=>rule.form==='Construction_Review_Log');
assert.deepEqual(logRule.requested_profiles,{view:false,add:false,edit:false,delete:false,view_all:false,modify_all:false,export:false});
assert.equal(permissions.field_rules.find(rule=>rule.form==='Contract').requested_profiles.edit,false);
assert.deepEqual(reports.updates.map(report=>report.report),['Construction_Requests','All_Contracts1']);
assert.equal(reports.new_internal_form.profile_view,false);
assert.equal(reports.new_internal_form.profile_edit,false);

const permissionSource=translate(read('creator/functions/hasConstructionPermission.dg')).js;
function runtime(source,input,tables={}){
  const body=translate('string validateReview()\n{\n'+source.replace(/alert\s+([^;]+);/g,'throw Error($1);').replace(/cancel (?:submit|delete);/g,'')+'\nreturn "ok";\n}').js;
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
    var zoho={loginuser:'native_actor'};
    var thisapp={permissions:{profileForUser(){if(tables.__profileError)throw Error('Denied');return tables.__profile||'';}}};
    ${permissionSource}
    thisapp.hasConstructionPermission=hasConstructionPermission;
    ${body}
    var result=validateReview();
  `,context);
  return context.result;
}
const nativeGuard=read(base+'Contract.Construction_Rejection.validate.dg');
const deployedMirror=read('creator/workflows/Field_Validations_Contrac.dg');
assert.ok(deployedMirror.startsWith(nativeGuard.trimEnd()+'\n\n'),'The current deployed workflow mirror includes the rejection guard first.');
assert.equal((deployedMirror.match(/thisapp\.globalCityPolicy\(/g)||[]).length,1,'The existing City policy remains exactly once.');
assert.match(deployedMirror,/constructionEditor = thisapp\.hasConstructionPermission/,'Existing native review permission guard remains.');
const saved={ID:'441092600000000001',Work_Module:'Construction',Status:'Proposed',Construction_Rejection_Operation:''};
assert.equal(runtime(nativeGuard,{...saved}), 'ok','A new empty pointer is allowed.');
assert.equal(runtime(nativeGuard,{...saved},{Contract:[saved]}),'ok');
assert.throws(()=>runtime(nativeGuard,{...saved,Construction_Rejection_Operation:'forged'},{Contract:[saved]}),/only be recorded/);
assert.throws(()=>runtime(nativeGuard,{...saved,Status:'Rejected'},{Contract:[saved]}),/Use Reject in Construction Review/);
assert.equal(runtime(nativeGuard,{...saved,Status:'New'},{Contract:[saved]}),'ok','Unclaimed native Accept stays available.');
const claimed={Contract:[saved],Construction_Review_Log:[{Contract1:saved.ID,Kind:'Decision',State:'recording'}]};
assert.throws(()=>runtime(nativeGuard,{...saved,Status:'New'},claimed),/review is in progress/,'Native Accept may not race a rejection claim.');
assert.equal(runtime(nativeGuard,{...saved,Contract_Name:'Edited Request'},claimed),'ok','Non-status edits retain the existing prewrite conflict check.');
assert.equal(runtime(nativeGuard,{...saved,Status:'New'},{Contract:[saved],Construction_Review_Log:[{Contract1:'another-parent',Kind:'Decision',State:'recording'}]}),'ok','A different parent is not blocked.');
const rejected={...saved,Status:'Rejected',Construction_Rejection_Operation:'saved-operation'};
assert.throws(()=>runtime(nativeGuard,{...rejected,Construction_Rejection_Operation:''},{Contract:[rejected]}),/only be recorded/,'Saved history pointer cannot be cleared.');
assert.equal(runtime(nativeGuard,{...rejected,Contract_Name:'Read Existing Decision'},{Contract:[rejected]}),'ok');
const legal={...saved,Work_Module:'Legal'};
assert.equal(runtime(nativeGuard,{...legal,Status:'Rejected'},{Contract:[legal]}),'ok','Unrelated Legal status handling is unchanged.');
assert.throws(()=>runtime(nativeGuard,{ID:null,Work_Module:'Legal',Construction_Rejection_Operation:'forged'}),/only be recorded/,'Creation cannot spoof server-owned history.');
assert.throws(()=>runtime(read(base+'Construction_Review_Log.validate.dg'),{}),/maintained by the review action/);
assert.throws(()=>runtime(read(base+'Construction_Review_Log.delete.dg'),{}),/cannot be deleted directly/);

for(const profile of permissions.profiles){
  const table={__profile:profile.name};
  assert.equal(runtime('return thisapp.hasConstructionPermission(zoho.loginuser,false);',{},table),profile.default_construction_submit);
  assert.equal(runtime('return thisapp.hasConstructionPermission(zoho.loginuser,true);',{},table),profile.default_construction_review);
  assert.equal(runtime('return thisapp.hasConstructionPermission(zoho.loginuser,true);',{}, {...table,User_Access:[{User:'native_actor',Edit_All_Construction_Requests:true}]}),true,'Existing explicit review grants remain effective.');
}
for(const profile of ['', 'Contract Mgmt']){
  assert.equal(runtime('return thisapp.hasConstructionPermission(zoho.loginuser,false);',{}, {__profile:profile}),false,'Unrelated profile gains no Construction read access.');
}
assert.equal(runtime('return thisapp.hasConstructionPermission(zoho.loginuser,false);',{}, {__profileError:true}),false,'Profile lookup failure is closed.');

const apiManifest=JSON.parse(read('manifests/custom-apis.json')).custom_apis;
for(const name of change.api_names){
  const matches=apiManifest.filter(api=>api.name===name);
  assert.equal(matches.length,1,'Each required environment binding appears once.');
  const api=matches[0];
  assert.equal(api.authentication,'OAuth2');
  assert.equal(api.method,'POST');
  assert.equal(api.matching_creator_function,'manageConstructionReview');
  assert.deepEqual(api.parameters,[{name:'payload',type:'string'}]);
  assert.equal(api.response_type,'Standard');
}
console.log('Construction rejection schema, native guard, profile-default and API contracts passed (offline fixtures).');
