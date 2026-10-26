import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

// Execute the checked-in validation body against explicit record fixtures.
// This is an offline behavior check; native compilation remains a release gate.
const read = path => fs.readFileSync(path, 'utf8');
const permissionBody=translate(read('creator/functions/hasConstructionPermission.dg')).js;
function runValidation(path, input, tables = {}, rawSource = null) {
  const source = (rawSource??read(path)).replace(/alert\s+([^;]+);/g, 'throw Error($1);').replace(/cancel (?:submit|delete);/g, '');
  const body = translate(`string validateConstruction()\n{\n${source}\nreturn "ok";\n}`).js.replace(/\.length\(\)/g, '.length');
  const context = vm.createContext({inputJson:JSON.stringify(input), tablesJson:JSON.stringify(tables)});
  vm.runInContext(`
    var input=JSON.parse(inputJson),tables=JSON.parse(tablesJson);
    function ifnull(value,fallback){return value==null?fallback:value;}
    function Map(){return {put(key,value){this[key]=value;},toString(){return JSON.stringify(this);}};}
    Array.prototype.size=Array.prototype.count=function(){return this.length;};
    Array.prototype.contains=function(value){return this.includes(value);};
    String.prototype.toLong=function(){return Number(this);};
    Number.prototype.addDay=function(days){return this+days;};
    Number.prototype.addHour=function(hours){return this+hours;};
    var zoho={loginuser:'signed-in-user',currentdate:100,currenttime:100};
    var thisapp={permissions:{profileForUser(user){if(tables.__profileError)throw Error('Denied profile');return user===zoho.loginuser?tables.__profile||'':'';},isUserInProfile(profile){return tables.__profile===profile;}}};
    function record(row){return new Proxy(row||{},{get(object,key){return object[key]??null;}});}
    function query(form,predicate){
      const rows=(tables[form]||[]).map(record).filter(predicate);
      return new Proxy(rows,{get(array,key){return key in array||typeof key==='symbol'?array[key]:array[0]?.[key]??null;},set(array,key,value){if(key in array)array[key]=value;else if(array[0])array[0][key]=value;return true;}});
    }
  `+permissionBody+';thisapp.hasConstructionPermission=hasConstructionPermission;'+body,context);
  const result=vm.runInContext('validateConstruction()',context);
  return {input:context.input, tables:context.tables, result};
}
const grants = ({edit=false,submit=false,legal=false}={}) => ({ID:10,User:'signed-in-user',Edit_All_Construction_Requests:edit,Submit_Construction_Requests:submit,Edit_Contracts:legal});
const request = (overrides={}) => ({ID:null,Work_Module:'Construction',Contract_Type:'Internal',Subdivision1:[30],Project:999,Territory:'spoofed',Status:'Complete',Contract_Actions:[],Approvals1:[],Parent_Contract:null,...overrides});
const scope = {Subdivision:[{ID:30,Project:40,Company1:50,County:'Bell',City:'Temple'}],Project:[{ID:40,Territory:'Temple/Belton'}]};
const parentWorkflow='creator/workflows/Field_Validations_Contrac.dg';
for(const edit of [false,true])for(const submit of [false,true])for(const legal of [false,true]){
  const tables={...scope,User_Access:[grants({edit,submit,legal})]};
  if(!edit&&!submit){assert.throws(()=>runValidation(parentWorkflow,request(),tables),/permission is required/);continue;}
  const result=runValidation(parentWorkflow,request(),tables);
  assert.equal(result.input.Status,'Proposed','no caller can bypass intake with a supplied status');
  assert.equal(result.input.Project,40);assert.equal(result.input.Territory,'Temple/Belton');
  assert.equal(result.input.Company_Entity,50);assert.equal(result.input.County,'Bell');assert.equal(result.input.City,'Temple');
}
for(const edit of [false,true]){
  const saved=request({ID:20,Status:'New'}),tables={...scope,Contract:[saved],User_Access:[grants({edit,submit:true,legal:true})]};
  if(edit)assert.equal(runValidation(parentWorkflow,saved,tables).input.Status,'New');
  else assert.throws(()=>runValidation(parentWorkflow,saved,tables),/Edit All Construction Requests/);
  assert.throws(()=>runValidation(parentWorkflow,{...saved,Work_Module:'Legal'},tables),/cannot be moved/);
  if(edit)assert.throws(()=>runValidation(parentWorkflow,saved,{...tables,Contract:[{...saved,Status:'Complete'}]}),/read-only/);
}
assert.throws(()=>runValidation(parentWorkflow,request({Contract_Actions:[{ID:null}]}),{...scope,User_Access:[grants({submit:true})]}),/reviewer/);
assert.throws(()=>runValidation(parentWorkflow,request({Approvals1:[{ID:80}]}),{...scope,User_Access:[grants({edit:true})]}),/Legal contract approvals/);
assert.throws(()=>runValidation(parentWorkflow,request({Parent_Contract:20}),{...scope,Contract:[{ID:20,Work_Module:null,Parent_Contract:null}],User_Access:[grants({edit:true})]}),/same Work Module/);
assert.throws(()=>runValidation(parentWorkflow,request({Work_Module:'Legal'}),scope),/Construction Work Module/);
assert.equal(runValidation(parentWorkflow,request(),{...scope,Subdivision:[{...scope.Subdivision[0],Territory:'North Austin'}],User_Access:[grants({submit:true})]}).input.Territory,'North Austin','Subdivision territory wins over optional Project territory');
assert.doesNotThrow(()=>runValidation(parentWorkflow,request({Parent_Contract:21,Builder:101}),{...scope,Contract:[{ID:21,Work_Module:'Construction',Parent_Contract:null,Contract_Type:'Offsite',Builder:202,Project:404}],User_Access:[grants({edit:true})]}),'Construction parenting does not inherit Legal lot-amendment Builder/Project restrictions');
assert.equal(runValidation(parentWorkflow,request({Work_Module:null,Contract_Type:'Issue',Subdivision1:[],Status:'New'})).input.Status,'New','blank legacy mode stays Legal without a construction grant');
// No new nonblank native requirements: the UI owns construction input requirements.
assert.equal(runValidation(parentWorkflow,request({Subdivision1:[],Construction_Plans:null,MUD:null,Priority:null,Date_Needed:null,Description:null}),{User_Access:[grants({submit:true})]}).input.Status,'Proposed');

const taskWorkflow='creator/workflows/Construction_Contract_Actions_Validation.dg';
const parent={ID:20,Work_Module:'Construction',Contract_Type:'Amenity',Status:'New'};
const task={ID:null,Contract1:20,Work_Module:'Legal',Type_field:'Issue',Template_Action:true};
for(const edit of [false,true])for(const submit of [false,true])for(const legal of [false,true]){
  const tables={Contract:[parent],User_Access:[grants({edit,submit,legal})]};
  if(!edit)assert.throws(()=>runValidation(taskWorkflow,task,tables),/Edit All Construction Requests/);
  else{
    const result=runValidation(taskWorkflow,task,tables).input;
    assert.equal(result.Work_Module,'Construction');assert.equal(result.Type_field,'Amenity');assert.equal(result.Template_Action,false);
  }
}
assert.throws(()=>runValidation(taskWorkflow,{...task,ID:60,Contract1:null,Work_Module:'Legal',Type_field:'Issue'},{Contract:[parent],Contract_Actions:[{...task,ID:60}],User_Access:[grants({edit:true})]}),/cannot be moved/);
assert.throws(()=>runValidation(taskWorkflow,task,{Contract:[{...parent,Status:'Complete'}],User_Access:[grants({edit:true})]}),/read-only/);
assert.throws(()=>runValidation(taskWorkflow,{...task,Contract1:null,Work_Module:'Construction',Type_field:'Internal'},{User_Access:[grants({submit:true,legal:true})]}),/Edit All Construction Requests/);
assert.equal(runValidation(taskWorkflow,{...task,Work_Module:null,Contract1:null,Type_field:'Issue'}).input.Type_field,'Issue','legacy Legal templates retain existing rules');

const approveSource=read('creator/workflows/Set_Contract_Approved_Con.dg');
for(const module of [null,'Legal','Construction']){
  const snapshot={ID:20,Work_Module:module,Status:'New'};
  // This success workflow has no alerts; use the same runtime with the actual source.
  const result=runValidation('creator/workflows/Set_Contract_Approved_Con.dg',{Contract1:20},{Contract:[snapshot],Contract_Approvals:[]});
  assert.equal(result.tables.Contract[0].Status,module==='Construction'?'New':'Approved');
}
assert.match(approveSource,/contract\.Work_Module/);
const approvalWorkflow='creator/workflows/Construction_Contract_Approvals_Validation.dg';
assert.throws(()=>runValidation(approvalWorkflow,{Contract1:20},{Contract:[parent]}),/Legal contract approvals/);
assert.doesNotThrow(()=>runValidation(approvalWorkflow,{Contract1:20},{Contract:[{...parent,Work_Module:null}]}));

const attachmentWorkflow='creator/workflows/Construction_Attachment_Validation.dg';
for(const edit of [false,true])for(const submit of [false,true])for(const legal of [false,true]){
  const tables={Contract:[parent],User_Access:[grants({edit,submit,legal})]};
  const execute=()=>runValidation(attachmentWorkflow,{ID:null,Contract1:20},tables);
  if(edit||submit)assert.doesNotThrow(execute);else assert.throws(execute,/Construction request access/);
  const comment=()=>runValidation('creator/workflows/Validate_Comment_Log.dg',{ID:null,Comment:'Plan attached',Contract1:20,Project:null,Budget:null,Pro_Forma:null},tables);
  if(edit||submit)assert.equal(comment().input.User,'signed-in-user');else assert.throws(comment,/Construction request access/);
}
assert.throws(()=>runValidation(attachmentWorkflow,{ID:90,Contract1:20},{Contract:[parent],Attachment:[{ID:90,Contract1:20,Added_User:'another-user'}],User_Access:[grants({submit:true})]}),/own construction attachments/);
assert.throws(()=>runValidation(attachmentWorkflow,{ID:null,Contract1:20},{Contract:[{...parent,Status:'Complete'}],User_Access:[grants({submit:true})]}),/read-only/);
for(const name of ['createContractAttachmentRecord','deleteContractAttachment']){
  const source=read(`creator/functions/${name}.dg`),start=source.indexOf('\tif(ifnull(contractRows.Work_Module'),end=source.indexOf('\ttry',start);
  assert.ok(start>=0&&end>start);
  const gate='response = Map();\ncontractRows = Contract[ID == input.Contract1];\n'+source.slice(start,end)+'\nresponse.put("ok",true);return response.toString();';
  for(const edit of [false,true])for(const submit of [false,true])for(const legal of [false,true]){
    const result=JSON.parse(runValidation(null,{Contract1:20},{Contract:[parent],User_Access:[grants({edit,submit,legal})]},gate).result);
    assert.equal(result.ok,name==='createContractAttachmentRecord'?(edit||submit):edit,`${name}: independent grants`);
  }
}
for(const name of ['Send_Contract_Approvals','Send_Contract_Approval_Email']){
  const source=read(`creator/functions/${name}.dg`),start=source.indexOf('if(ifnull(contract.Work_Module'),end=source.indexOf('\n\t}',start)>=0&&name==='Send_Contract_Approvals'?source.indexOf('\n\t}',start)+4:source.indexOf('\n\t\t}',start)+5;
  assert.ok(start>=0&&end>start);
  const gate='resp = Map();response = Map();\ncontract = Contract[ID == input.Contract1];\n'+source.slice(start,end)+'\nresp.put("success",true);return resp.toString();';
  for(const module of [null,'Legal','Construction']){
    const result=runValidation(null,{Contract1:20},{Contract:[{...parent,Work_Module:module}]},gate).result;
    const response=typeof result==='string'?JSON.parse(result):result;
    assert.equal(response.success,module!=='Construction',`${name}: no construction approval mail`);
  }
}
const digestSource=read('creator/workflows/Contracts_Previous_Day_Ac.dg');
const digestPrefix=digestSource.slice(0,digestSource.indexOf('if(vCreatedCount > 0 || vModifiedCount > 0)')).replace(/sort by (\w+) asc/g,'sort by $1');
// Complete the existing recipient guard before returning the actual row counts.
const digestRun=digestPrefix+'\ninput.createdCount = vCreatedCount;input.modifiedCount = vModifiedCount;\n}';
const actions=[
  {ID:1,Added_User:'Public',Added_Time:99,Modified_User:'Public',Modified_Time:99,Work_Module:null,Contract1:{ID:20,Work_Module:null,Contract_Name:'Legacy Legal'},Dev_Notes:'Legal created'},
  {ID:2,Added_User:'Public',Added_Time:99,Modified_User:'Public',Modified_Time:99,Work_Module:'Construction',Contract1:{ID:21,Work_Module:'Construction',Contract_Name:'Construction'},Dev_Notes:'Construction created'},
  {ID:3,Added_User:'Public',Added_Time:98,Modified_User:'Public',Modified_Time:99,Work_Module:null,Contract1:{ID:21,Work_Module:'Construction',Contract_Name:'Construction'},Dev_Notes:'Legacy blank action on Construction parent'},
  {ID:4,Added_User:'Public',Added_Time:98,Modified_User:'Public',Modified_Time:99,Work_Module:'Legal',Contract1:{ID:20,Work_Module:'Legal',Contract_Name:'Legal'},Dev_Notes:'Legal modified'},
  {ID:5,Added_User:'Public',Added_Time:99,Modified_User:'Public',Modified_Time:99,Work_Module:'Construction',Contract1:null,Dev_Notes:'Construction template'}
];
const digestResult=runValidation(null,{}, {Settings:[{ID:1,Receive_Legal_Notifications:'legal@example.test'}],Contract_Actions:actions},digestRun).input;
assert.equal(digestResult.createdCount,1,'Legal digest excludes Construction rows/templates and includes blank legacy Legal');
assert.equal(digestResult.modifiedCount,1,'Legal digest excludes blank child mode when its parent is Construction and avoids duplicate created rows');

for(const profile of ['Dev/Land Acq - Proforma & Budgets','CFO','Construction Budgeting']){
 const tables={...scope,__profile:profile,Contract:[parent]},editor=profile==='Construction Budgeting';
 assert.equal(runValidation(parentWorkflow,request(),tables).input.Status,'Proposed');
 const update=()=>runValidation(parentWorkflow,request({...parent}),tables);
 if(editor)assert.doesNotThrow(update);else assert.throws(update,/Edit All Construction/);
 const template=()=>runValidation(taskWorkflow,{...task,Contract1:null,Work_Module:'Construction',Type_field:'Internal'},tables);
 if(editor)assert.doesNotThrow(template);else assert.throws(template,/Edit All Construction/);
 assert.doesNotThrow(()=>runValidation(attachmentWorkflow,{ID:null,Contract1:20},tables));
 assert.equal(runValidation('creator/workflows/Validate_Comment_Log.dg',{ID:null,Contract1:20,Comment:'Plan details'},tables).input.User,'signed-in-user');
 if(editor){
  assert.throws(()=>runValidation(parentWorkflow,request({Work_Module:'Legal',Contract_Type:'Issue'}),tables),/only create or edit Construction/);
  assert.throws(()=>runValidation(taskWorkflow,{...task,Contract1:null,Work_Module:'Legal',Type_field:'Issue'},tables),/only change Construction/);
  assert.throws(()=>runValidation(attachmentWorkflow,{ID:null,Contract1:21},{...tables,Contract:[{ID:21,Work_Module:'Legal'}]}),/only attach files to Construction/);
  assert.throws(()=>runValidation('creator/workflows/Validate_Comment_Log.dg',{ID:null,Contract1:21,Comment:'Denied'},{...tables,Contract:[{ID:21,Work_Module:'Legal'}]}),/only comment on Construction/);
 }
}
assert.throws(()=>runValidation(parentWorkflow,request(),{...scope,__profileError:true}),/permission is required/);

// Const's Construction grants cannot be used to create or change shared Budget/Project children.
const constructionOnly={__profile:'Construction Budgeting',Contract:[parent]};
for(const field of ['Budget','Pro_Forma','Payment_Request','Budget_Modification']){
 assert.throws(()=>runValidation(attachmentWorkflow,{ID:null,Contract1:20,[field]:70},constructionOnly),/cannot also be linked/,'A second input parent cannot write a Budget attachment through Construction');
 assert.throws(()=>runValidation(attachmentWorkflow,{ID:90,Contract1:20,[field]:null},{...constructionOnly,Attachment:[{ID:90,Contract1:20,[field]:70,Added_User:'signed-in-user'}]}),/cannot also be linked/,'Clearing the input does not authorize editing an existing shared attachment');
}
for(const field of ['Project','Budget','Pro_Forma']){
 assert.throws(()=>runValidation('creator/workflows/Validate_Comment_Log.dg',{ID:null,Contract1:20,Comment:'Scope fixture',[field]:70},constructionOnly),/cannot also be linked/,'A Construction parent cannot authorize a Budget/Project comment');
 assert.throws(()=>runValidation('creator/workflows/Validate_Comment_Log.dg',{ID:91,Contract1:20,Comment:'Scope fixture',[field]:null},{...constructionOnly,Comment_Log:[{ID:91,Contract1:20,[field]:70,Added_User:'signed-in-user',Added_Time:99,Comment:'Original'}]}),/cannot also be linked/,'An existing shared comment stays read-only even when the input hides its other parent');
}
assert.doesNotThrow(()=>runValidation(attachmentWorkflow,{ID:90,Contract1:20},{...constructionOnly,Attachment:[{ID:90,Contract1:20,Added_User:'signed-in-user'}]}),'Pure Construction file editing stays available');
assert.equal(runValidation('creator/workflows/Validate_Comment_Log.dg',{ID:91,Contract1:20,Comment:'Edited Construction detail'},{...constructionOnly,Comment_Log:[{ID:91,Contract1:20,Added_User:'signed-in-user',Added_Time:99,Comment:'Original',Deleted:false}]}).input.Comment,'Edited Construction detail','Pure Construction author/time edit remains intact');
for(const profile of ['Dev/Land Acq - Proforma & Budgets','CFO']){
 const tables={__profile:profile,Contract:[parent]};
 assert.doesNotThrow(()=>runValidation(attachmentWorkflow,{ID:null,Contract1:20,Budget:70},tables),'Unrelated profile parent policy is preserved');
 assert.doesNotThrow(()=>runValidation('creator/workflows/Validate_Comment_Log.dg',{ID:null,Contract1:20,Comment:'Unrelated scope fixture',Project:70},tables));
}

// Existing Legal profiles can delete from shared native reports. Construction
// child deletion must still enforce its editor grant and completed-record lock.
for(const name of ['Construction_Action_Delete_Validation','Construction_Attachment_Delete_Validation']){
 const path='creator/workflows/'+name+'.dg';
 for(const profile of ['Dev/Land Acq - Proforma & Budgets','CFO','Construction Budgeting']){
  const tables={__profile:profile,Contract:[parent]},editor=profile==='Construction Budgeting';
  const execute=()=>runValidation(path,{Contract1:20,Work_Module:'Legal'},tables);
  if(editor)assert.doesNotThrow(execute);else assert.throws(execute,/Edit All Construction/);
  assert.throws(()=>runValidation(path,{Contract1:20,Work_Module:'Construction'},{...tables,Contract:[{...parent,Status:'Complete'}]}),/open request/);
  const legal=()=>runValidation(path,{Contract1:20,Work_Module:'Legal'},{...tables,Contract:[{...parent,Work_Module:'Legal'}]});
  if(editor)assert.throws(legal,/only manage Construction/);else assert.doesNotThrow(legal);
 }
}
assert.throws(()=>runValidation('creator/workflows/Construction_Comment_Delete_Validation.dg',{Contract1:20},{Contract:[parent]}),/comment controls/);
assert.doesNotThrow(()=>runValidation('creator/workflows/Construction_Comment_Delete_Validation.dg',{Contract1:20},{Contract:[{...parent,Work_Module:'Legal'}]}));

console.log('PASS construction backend: independent grants, enforced review intake, submit-only edits/tasks/templates denied, inferred scope, immutable mode, completion lock, Legal approval isolation and legacy Legal compatibility.');
if(process.argv.includes('--behavior-only')){
 console.log('PASS scoped workflow behavior only: Const dual-parent create/update/cleared-input denial and pure Construction/other-profile preservation. Native saved-body evidence gate was not run.');
 process.exit(0);
}

// Check the complete independently reloaded Workflow Builder capture, including
// its action count. Comparing only the first body can conceal duplicate actions.
const deployment=JSON.parse(read('creator/schema-changes/construction-backend-deployment.json'));
const pageDeployment=JSON.parse(read('creator/schema-changes/construction-page-access-2026-10-20/deployment.json'));
const currentWorkflows=new Map([...deployment.existingWorkflows,...deployment.newWorkflows,...pageDeployment.workflows].map(w=>[w.link,w]));
function canonicalDeluge(source){
  const strings=[];
  return source.replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,token=>token.startsWith('"')?`STRING${strings.push(token)}TOKEN`:'').replace(/\s+/g,'')+'\n'+JSON.stringify(strings);
}
for(const workflow of currentWorkflows.values()){
  assert.equal(workflow.savedAndReloaded,true,`${workflow.link}: independently saved and reopened`);
  const capture=JSON.parse(read(workflow.capture));
  assert.equal(capture.nativeScriptActionCount,1,`${workflow.link}: one native script action`);
  assert.equal(capture.scripts.length,1,`${workflow.link}: capture must include every native script action`);
  assert.equal(canonicalDeluge(capture.scripts[0]),canonicalDeluge(read(workflow.source)),`${workflow.link}: complete body, literal content and parentheses match`);
  assert.equal(canonicalDeluge(capture.scripts[0]),canonicalDeluge(read(workflow.evidence)),`${workflow.link}: authoritative after source`);
}
for(const f of pageDeployment.functions){
 assert.equal(f.savedAndReloaded,true,`${f.name}: independently reselected`);
 assert.equal(canonicalDeluge(read(f.evidence)),canonicalDeluge(read(f.source)),`${f.name}: complete native body and literals match`);
}
const nativeParent=read(currentWorkflows.get('Field_Validations_Contrac').evidence);
assert.doesNotThrow(()=>runValidation(null,request({Parent_Contract:21,Builder:101}),{...scope,Contract:[{ID:21,Work_Module:'Construction',Parent_Contract:null,Contract_Type:'Offsite',Builder:202,Project:404}],User_Access:[grants({edit:true})]},nativeParent),'native formatter preserved non-Lot parent semantics');
for(const name of ['Send_for_Approvals','Send_for_Approvals_Contra1']){
  const source=read(`creator/workflows/${name}.dg`);
  assert.match(source,/^if\(ifnull\(input\.Work_Module,""\) != "Construction"\)/);
  assert.match(source,/sendmail\s*\[/);
  assert.doesNotMatch(source,/\bCost_Curve\b|\btype\s*=|\bas\s+"/,'report schema projections must never be extracted as Deluge');
}
console.log(`PASS native Construction deployment gate: ${currentWorkflows.size} workflows each have one independently reloaded reviewed body; ${pageDeployment.functions.length} saved function bodies, native parent semantics and report-action source are verified.`);
