import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

// Execute checked-in native Deluge bodies with local records. This verifies
// their control flow; native Creator compilation/deployment is a separate gate.
const names=['resolveApprovalRoute','snapshotApprovalRoute','applySharedApprovalPolicy','Start_Proforma_Approval_Chain','Manage_Proforma_Approval_Config','Update_Proforma_Approval_Recipient'];
const sources=Object.fromEntries(names.map(name=>[name,fs.readFileSync(`creator/functions/${name}.dg`,'utf8')]));
function compile(source){
  // Deluge map literals become calls so the subset translator does not treat
  // their curly braces as a Deluge list. None of these literals are nested.
  source=source.replace(/\{((?:"(?:\\.|[^"\\])*"\s*:[^{}\n]+))\}/g,(_,body)=>'delugeMap('+body.replace(/("(?:\\.|[^"\\])*")\s*:/g,'$1,')+')');
  source=source.replace(/\{("(?:\\.|[^"\\])*")\}/g,'[$1]');
  source=source.replace(/insert into (\w+)\s*\[([^\]]+)\]/g,(_,form,fields)=>
    `insertRecord("${form}", delugeMap(${fields.trim().split('\n').map(line=>{const m=line.trim().match(/^(\w+)=(.*)$/);assert.ok(m,line);return JSON.stringify(m[1])+','+m[2];}).join(',')}))`);
  return translate(source).js.replace(/catch\((\w+)\)\s*\{/g,'catch($1) { diagnostics.push($1.message);');
}
const executable=names.map(name=>compile(sources[name])+`;thisapp.${name}=${name};`).join('\n');
const ID='9007199254740993';
const creatorOwner={ID:'19',User:'owner',Send_Pro_Formas_for_Approvals:true,Edit_Owned_Proformas:true};
const users=[creatorOwner,{ID:'11',User:'vp',Full_Name:'First',Approver_Email:'first@example.com',Approval_Routing_Enabled:true},{ID:'12',User:'cfo',Full_Name:'Second',Approver_Email:'second@example.com',Approval_Routing_Enabled:true}];
const steps=[{key:'vp',order:1,roleId:'1',condition:'Always',enabled:true},{key:'cfo',order:2,roleId:'2',condition:'Always',enabled:true}];
const policy={ID:'41',Workflow:'Pro Forma',Status:'Published',Enabled:true,Adapter_Enabled:true,Self_Approval:'Deny',Territory_Key:'',Department_Key:'',Steps_JSON:JSON.stringify(steps)};
const rows=[{ID:'101',Proforma:ID,Type1:'Pro Forma',Sort_Order:1,Title:'Legacy VP',Approver:'legacy@example.com',Status:'Not Sent',Approval_Notes:'',Sent_Date:null,Responded_Date:null},{ID:'102',Proforma:ID,Type1:'Pro Forma',Sort_Order:2,Title:'Legacy CFO',Approver:'legacy@example.com',Status:'Not Sent',Approval_Notes:'',Sent_Date:null,Responded_Date:null}];
function runtime({owner=creatorOwner,mine=true,pfStatus='Draft',locked=false,approvals=[],policies=[policy],assignmentUpdates=[],userUpdates=[],snapshots=[],email='sent',offer=true,mutateAfterResolve=false,extraTables={}}={}){
  const records={
    Add_Pro_Forma:[{ID,Owner:[{ID:mine?'19':'20'}],Territory:'North',Status:pfStatus,Lock_Inputs:locked,Purchasing_Company:offer?'31':null}],
    User_Access:[owner,...users.slice(1).map(person=>({...person,...userUpdates.find(update=>update.ID===person.ID)}))],
    Approval_Policy:policies,Approval_Role:[{ID:'1',Role_Name:'VP',Active:true},{ID:'2',Role_Name:'CFO',Active:true}],
    Approval_Role_Assignment:[{ID:'21',Role:'1',Person:'11',Active:true,Territory_Key:'',Department_Key:''},{ID:'22',Role:'2',Person:'12',Active:true,Territory_Key:'',Department_Key:''}].map(assignment=>({...assignment,...assignmentUpdates.find(update=>update.ID===assignment.ID)})),
    Approval_Route_Snapshot:snapshots,Budget_Approvals:approvals,
    Territory:[{ID:'71',Territory_Name:'North',VP:[{ID:'11'}],Dev_Mgr:[]}],
    Builder:offer?[{ID:'201',Proforma:ID,Builder_Name:'Seller',Email:'seller@example.com',Phone_Number:'555',Street_Address:'123 Main',City_State_ZIP:'Austin TX'}]:[],
    Property:offer?[{ID:'301',Proforma:ID,Common_Name:'Property',Property_ID:'001',County:'Travis',City:'Austin',Acres:10,TerraVault_URL:'https://example.com',Seller:'201',Company1:'31'}]:[],
    ...extraTables
  };
  const c=vm.createContext({initial:structuredClone(records),email,mutateAfterResolve});
  vm.runInContext(`
    var tables=JSON.parse(JSON.stringify(initial)),writes=[],emails=[],diagnostics=[],thisapp={};
    function map(v){Object.defineProperties(v,{get:{value:function(k){return this[k]??null;}},put:{value:function(k,v){this[k]=v;}}});return v;}
    function Map(){return map({});}function delugeMap(...pairs){var data={};for(var i=0;i<pairs.length;i+=2)data[pairs[i]]=pairs[i+1];return map(data);}
    function List(){return [];}function ifnull(v,f){return v==null?f:v;}function choose(c,a,b){return c?a:b;}
    Array.prototype.add=function(v){this.push(v);};Array.prototype.get=function(i){return this[i]??null;};Array.prototype.count=Array.prototype.size=function(){return this.length;};Array.prototype.contains=function(v){return this.includes(v);};
    Array.prototype.toString=function(sep){return this.join(sep??',');};
    Object.prototype.toString=function(){return JSON.stringify(this);};String.prototype.toLong=function(){return BigInt(this);};Number.prototype.toLong=function(){return BigInt(this);};String.prototype.toMap=function(){return map(JSON.parse(this));};String.prototype.toJSONList=function(){return JSON.parse(this).map(JSON.stringify);};String.prototype.matches=function(pattern){return new RegExp('^(?:'+pattern+')$').test(this);};String.prototype.replaceAll=function(pattern,value){return this.replace(new RegExp(pattern,'g'),value);};
    var zoho={loginuser:'owner',currenttime:{toString(){return '20261014120000001';}}};
    function record(form,row){return new Proxy(row,{get(o,k){return o[k]??null;},set(o,k,v){writes.push({form,id:o.ID,field:k,value:typeof v==='bigint'?v.toString():v});o[k]=typeof v==='bigint'?v.toString():v;return true;}});}
    function query(form,predicate,sort){var result=(tables[form]||[]).map(row=>record(form,row)).filter(predicate);if(sort)result.sort((a,b)=>a[sort]>b[sort]?1:a[sort]<b[sort]?-1:0);return new Proxy(result,{get(a,k){return k in a||typeof k==='symbol'?a[k]:a[0]?.[k]??null;},set(a,k,v){if(!a.length)throw Error('Missing record');a[0][k]=v;return true;}});}
    function insertRecord(form,data){data.ID=(tables[form].reduce((max,row)=>BigInt(row.ID)>max?BigInt(row.ID):max,100n)+1n).toString();for(var key of Object.keys(data))if(typeof data[key]==='bigint')data[key]=data[key].toString();tables[form].push(data);writes.push({form,id:data.ID,insert:true});return BigInt(data.ID);}
    thisapp.poCurrencyString=function(value){return /^[0-9]+(?:[.][0-9]{1,2})?$/.test(value)?value:'';};
    thisapp.Send_Proforma_Approval_Email_With_Context=function(pf,id){emails.push({pf,id});if(email==='throw')throw Error('Unknown email reply');if(email==='failed')return delugeMap('success',false,'message','Email failed');var row=query('Budget_Approvals',row=>row.ID==id);row.Sent_Date='2026-10-14';return delugeMap('success',true,'packetFileName','packet.pdf');};
  `+executable,c);
  if(mutateAfterResolve)vm.runInContext(`var realResolve=thisapp.resolveApprovalRoute,resolveCalls=0;thisapp.resolveApprovalRoute=function(context){var result=realResolve(context);if(++resolveCalls===1)tables.User_Access[1].Approver_Email='changed@example.com';return result;};`,c);
  const run=(arg={id:ID,mode:'Check',settingsPreview:true})=>JSON.parse(JSON.stringify(vm.runInContext('Start_Proforma_Approval_Chain('+JSON.stringify(typeof arg==='string'?arg:JSON.stringify(arg))+')',c)));
  const runNative=(name,arg)=>JSON.parse(JSON.stringify(vm.runInContext(name+'('+JSON.stringify(JSON.stringify(arg))+'.toMap())',c)));
  const snapshot=()=>JSON.parse(JSON.stringify(c.tables));
  return{c,run,runNative,snapshot,writes:c.writes,emails:c.emails,diagnostics:c.diagnostics};
}
const clone=v=>JSON.parse(JSON.stringify(v));
const canonical=route=>route.map(({order,key,roleId,role,userAccessId,email})=>({order,key,roleId,role,userAccessId,email}));
let h=runtime({offer:false}),before=h.snapshot(),result=h.run();
assert.equal(result.success,true,JSON.stringify({result,diagnostics:h.diagnostics}));
assert.equal(result.contract,'proforma-approval-settings-v1');assert.equal(result.policyModel,'territory-perpetual-v2');assert.equal(result.mode,'Preview');assert.equal(result.proformaId,ID);assert.equal(result.policyId,'41');
assert.deepEqual(result.route.map(step=>step.email),['first@example.com','second@example.com']);assert.deepEqual(h.snapshot(),before);assert.equal(h.writes.length,0);assert.equal(h.emails.length,0);
const preview=result;
for(const owner of [{ID:'19',User:'owner',Edit_All_Pro_Forma_Approvals:true},{ID:'19',User:'owner',Edit_Owned_Pro_Forma_Approvals:true},{ID:'19',User:'owner',Edit_Owned_Proformas:true},{ID:'19',User:'owner',Send_Pro_Formas_for_Approvals:true},{ID:'19',User:'owner',Send_Pro_Formas_for_Approvals:true,Edit_All_Proformas:true}]){
  h=runtime({owner,mine:owner.Edit_Owned_Pro_Forma_Approvals===true||owner.Edit_Owned_Proformas===true||(!owner.Edit_All_Proformas&&owner.Send_Pro_Formas_for_Approvals===true)});result=h.run();assert.equal(result.success,true,JSON.stringify({owner,result,diagnostics:h.diagnostics}));assert.equal(h.writes.length,0);assert.equal(h.emails.length,0);
}
for(const owner of [{ID:'19',User:'owner'},{ID:'19',User:'owner',Edit_All_Proformas:true},{ID:'19',User:'owner',Edit_Owned_Pro_Forma_Approvals:true},{ID:'19',User:'owner',Edit_Owned_Proformas:true},{ID:'19',User:'owner',Send_Pro_Formas_for_Approvals:true}]){
  h=runtime({owner,mine:false});result=h.run();assert.equal(result.success,false);assert.match(result.message,/permission/);assert.equal(h.writes.length,0);assert.equal(h.emails.length,0);
}
for(const settings of [{policies:[]},{policies:[{...policy,Enabled:false}]},{policies:[policy,{...policy,ID:'42'}]},{assignmentUpdates:[{ID:'22',Active:false}]},{userUpdates:[{ID:'11',Approver_Email:'invalid'}]}]){
  for(const mode of ['Preview','Start','StartSettings']){h=runtime(settings);result=h.run({id:ID,mode,expectedPolicyId:'41',expectedRoute:canonical(preview.route)});assert.equal(result.success,false,JSON.stringify({settings,mode,result}));assert.equal(h.writes.length,0);assert.equal(h.emails.length,0);}
}
const nineSteps=Array.from({length:9},(_,index)=>({...steps[index%2],key:'step-'+index,order:index+1}));
for(const mode of ['Preview','Start','StartSettings']){h=runtime({policies:[{...policy,Steps_JSON:JSON.stringify(nineSteps)}]});result=h.run({id:ID,mode,expectedPolicyId:'41',expectedRoute:canonical(preview.route)});assert.equal(result.success,false);assert.match(result.message,/8 approval steps/);assert.equal(h.writes.length,0);assert.equal(h.emails.length,0);}
h=runtime();result=h.run({id:ID,mode:'Unsupported'});assert.equal(result.success,false);assert.equal(h.writes.length,0);assert.equal(h.emails.length,0);
h=runtime();result=h.run({id:Number(ID),mode:'Preview'});assert.equal(result.success,false);assert.match(result.message,/exact string/);assert.equal(h.writes.length,0);
h=runtime();result=h.run({id:ID,mode:'StartSettings'});assert.equal(result.success,false);assert.match(result.message,/Refresh/);assert.equal(h.writes.length,0);assert.equal(h.emails.length,0);
const submission={id:ID,mode:'StartSettings',expectedPolicyId:preview.policyId,expectedRoute:canonical(preview.route)};
h=runtime();result=h.run(submission);assert.equal(result.success,true,JSON.stringify({result,diagnostics:h.diagnostics}));assert.equal(h.emails.length,1);assert.equal(h.snapshot().Add_Pro_Forma[0].Status,'Pending Approval');assert.deepEqual(h.snapshot().Budget_Approvals.map(row=>row.Approver),['first@example.com','second@example.com']);assert.equal(h.snapshot().Approval_Route_Snapshot.length,1);
const sent=clone(h.snapshot().Budget_Approvals),captured=clone(h.snapshot().Approval_Route_Snapshot);result=h.run(submission);assert.equal(result.success,true);assert.equal(h.emails.length,1,'repeated delivered-first initiation cannot send another email');assert.deepEqual(h.snapshot().Budget_Approvals,sent);assert.deepEqual(h.snapshot().Approval_Route_Snapshot,captured);
for(const field of ['order','key','roleId','role','userAccessId','email']){const expected=clone(submission);expected.expectedRoute[0][field]=field==='order'?9:'changed';h=runtime();result=h.run(expected);assert.equal(result.success,false);assert.match(result.message,/route changed/);assert.equal(h.writes.length,0);assert.equal(h.emails.length,0);}
h=runtime();result=h.run({...submission,expectedPolicyId:'42'});assert.equal(result.success,false);assert.equal(h.writes.length,0);assert.equal(h.emails.length,0);
h=runtime({mutateAfterResolve:true});result=h.run(submission);assert.equal(result.success,false);assert.match(result.message,/during capture/);assert.equal(h.snapshot().Budget_Approvals.length,0);assert.equal(h.emails.length,0);
for(const history of [{Status:'Pending'},{Status:'Approved'},{Status:'Rejected'},{Approval_Notes:'Keep note'},{Sent_Date:'2026-10-13'},{Responded_Date:'2026-10-13'}]){h=runtime({approvals:[{...rows[0],...history},rows[1]],snapshots:captured});before=h.snapshot();result=h.run(submission);assert.equal(result.success,false,JSON.stringify({history,result}));assert.match(result.message,/history/);assert.deepEqual(h.snapshot(),before);assert.equal(h.writes.length,0);assert.equal(h.emails.length,0);}
for(const state of [{pfStatus:'Draft',approvals:rows},{pfStatus:'Pending Approval',approvals:sent},{pfStatus:'Pending Approval',approvals:[{...rows[0],Status:'Pending'},rows[1]]}]){h=runtime(state);before=h.snapshot();result=h.run({id:ID,mode:'Check'});assert.equal(result.success,true);assert.deepEqual(h.snapshot(),before);assert.equal(h.writes.length,0);assert.equal(h.emails.length,0);}
h=runtime();before=h.snapshot();result=h.run({id:ID,mode:'Repair'});assert.equal(result.success,true);assert.deepEqual(h.snapshot(),before);assert.equal(h.writes.length,0,'Repair cannot start untouched legacy rows after a rejected Settings send');assert.equal(h.emails.length,0);
h=runtime({pfStatus:'Pending Approval',approvals:[{...rows[0],Status:'Pending'},rows[1]],snapshots:captured});result=h.run({id:ID,mode:'Repair'});assert.equal(result.success,true);assert.equal(h.emails.length,1);result=h.run({id:ID,mode:'Repair'});assert.equal(h.emails.length,1,'Repair sends only a missing delivery');
h=runtime({pfStatus:'Pending Approval',approvals:[{...rows[0],Status:'Pending'},{...rows[1],Status:'Rejected',Approval_Notes:'Keep decision'}]});before=h.snapshot();result=h.run({id:ID,mode:'Repair'});assert.deepEqual(h.snapshot(),before);assert.equal(h.writes.length,0);assert.equal(h.emails.length,0);
h=runtime({email:'failed'});result=h.run(submission);assert.equal(result.success,false);assert.equal(h.snapshot().Add_Pro_Forma[0].Status,'Draft');assert.equal(h.snapshot().Budget_Approvals[0].Status,'Not Sent');const failedWrites=h.writes.length;h.run({id:ID,mode:'Repair'});assert.equal(h.writes.length,failedWrites);assert.equal(h.emails.length,1);
h=runtime({email:'throw'});result=h.run(submission);assert.equal(result.success,false);assert.equal(h.snapshot().Add_Pro_Forma[0].Status,'Pending Approval');assert.equal(h.snapshot().Budget_Approvals[0].Status,'Pending');
for(const [name,args] of [['Manage_Proforma_Approval_Config',[ID,'delete','101','','','']],['Update_Proforma_Approval_Recipient',[{proformaId:ID,approvalId:'101',approverEmail:'changed@example.com'}]]]){h=runtime({approvals:sent,snapshots:captured});before=h.snapshot();const argCode=args.map(arg=>typeof arg==='object'?'delugeMap("proformaId",'+JSON.stringify(arg.proformaId)+',"approvalId",'+JSON.stringify(arg.approvalId)+',"approverEmail",'+JSON.stringify(arg.approverEmail)+')':JSON.stringify(arg)).join(',');result=clone(vm.runInContext(name+'('+argCode+')',h.c));assert.equal(result.success,false);assert.match(result.message,/Settings > Approval Policies/);assert.deepEqual(h.snapshot(),before);assert.equal(h.writes.length,0);assert.equal(h.emails.length,0);}

// Every workflow uses the record's Territory for VP and every selected Dev Mgr.
// Assignments for these roles cannot override the Territory record.
const wacoUsers=[...users,{ID:'13',User:'dev-one',Full_Name:'Dev One',Approver_Email:'dev1@example.com',Approval_Routing_Enabled:true},{ID:'14',User:'dev-two',Full_Name:'Dev Two',Approver_Email:'dev2@example.com',Approval_Routing_Enabled:true},{ID:'15',User:'other-vp',Full_Name:'Other VP',Approver_Email:'other-vp@example.com',Approval_Routing_Enabled:true}];
const wacoTerritory={ID:'71',Territory_Name:'Waco',VP:[{ID:'11'},{ID:'11'}],Dev_Mgr:[{ID:'13'},{ID:'14'},{ID:'13'}]};
const wacoTables={User_Access:wacoUsers,Approval_Role:[{ID:'1',Role_Name:'VP',Active:true},{ID:'2',Role_Name:'CFO',Active:true},{ID:'3',Role_Name:'Dev Mgr',Active:true}],Approval_Role_Assignment:[{ID:'21',Role:'1',Person:'15',Active:true,Territory_Key:'Waco',Department_Key:''},{ID:'22',Role:'2',Person:'12',Active:true,Territory_Key:'',Department_Key:''},{ID:'23',Role:'3',Person:'15',Active:true,Territory_Key:'Waco',Department_Key:''}],Territory:[wacoTerritory],Add_Pro_Forma:[{ID,Owner:[{ID:'19'}],Territory:'Waco',Status:'Draft',Lock_Inputs:false,Purchasing_Company:'31'}]};
const wacoSteps=[{key:'vp',order:1,roleId:'1',condition:'Always',enabled:true},{key:'dev-mgr',order:2,roleId:'3',condition:'Always',enabled:true},{key:'cfo',order:3,roleId:'2',condition:'Always',enabled:true}];
for(const workflow of ['Pro Forma','Budget','Budget Modification','Contract','Purchase Order']){
  const policySteps=wacoSteps.map(step=>({...step,condition:workflow==='Purchase Order'&&step.roleId!=='2'?'Budget modification attached':'Always'}));
  const scopedPolicy={...policy,Workflow:workflow,Territory_Key:'Waco',Steps_JSON:JSON.stringify(policySteps)};
  const context={workflow,recordId:workflow==='Pro Forma'?ID:'61',budgetId:'61',territory:'Waco',department:workflow==='Budget'?'Development':'',submitterId:'19',amount:'100.00',hasBudgetModification:true,hasBudgetOverrun:true,submissionRevision:'territory-capture-001'};
  h=runtime({policies:[scopedPolicy],extraTables:wacoTables});result=h.runNative('resolveApprovalRoute',context);
  assert.equal(result.success,true,JSON.stringify({workflow,result,diagnostics:h.diagnostics}));
  assert.deepEqual(result.snapshot.route.map(step=>step.userAccessId),['11','13','14','12'],workflow+' Territory people override assignment configuration');assert.deepEqual(result.snapshot.route.map(step=>step.order),[1,2,3,4]);assert.deepEqual(result.snapshot.route.map(step=>step.policyStepOrder),[1,2,2,3]);assert.deepEqual(result.snapshot.route.map(step=>step.key),['vp','dev-mgr-13','dev-mgr-14','cfo']);assert.deepEqual(result.snapshot.route.map(step=>step.assignmentId),['','','','22']);assert.equal(h.writes.length,0);
  if(workflow==='Pro Forma'){const pfPreview=h.run();assert.equal(pfPreview.success,true);assert.deepEqual(pfPreview.route.map(step=>step.userAccessId),['11','13','14','12'],'PF Preview uses persisted Add_Pro_Forma.Territory');}
  if(workflow==='Budget'||workflow==='Budget Modification'){
    const adapter=h.runNative('applySharedApprovalPolicy',context);assert.equal(adapter.success,true,JSON.stringify(adapter));const execution=h.snapshot().Budget_Approvals.filter(row=>workflow==='Budget'?row.Budget==='61'&&row.Type1==='Development':row.Budget_Modification==='61');assert.deepEqual(execution.map(row=>row.Approver),['first@example.com','dev1@example.com','dev2@example.com','second@example.com'],'Every Territory manager has its own native sequential row');
  }
  const capturedResult=h.runNative('snapshotApprovalRoute',context);assert.equal(capturedResult.success,true,JSON.stringify(capturedResult));const immutable=clone(capturedResult.snapshot.route),snapshotRows=clone(h.snapshot().Approval_Route_Snapshot);
  vm.runInContext('tables.Territory[0].VP=[{ID:"15"}];tables.Territory[0].Dev_Mgr=[{ID:"14"},{ID:"13"}];',h.c);
  const newRoute=h.runNative('resolveApprovalRoute',context);assert.equal(newRoute.snapshot.route[0].userAccessId,'15');assert.equal(newRoute.snapshot.route[1].userAccessId,'14');assert.deepEqual(h.snapshot().Approval_Route_Snapshot,snapshotRows,'Editing Territory cannot alter captured approval JSON');
  assert.deepEqual(h.runNative('snapshotApprovalRoute',context).snapshot.route,immutable,'An existing submission snapshot keeps its original VP and manager order');
  for(const territoryUpdate of [{VP:[]},{VP:[{ID:'11'},{ID:'15'}]},{Dev_Mgr:[]},{Dev_Mgr:[{ID:'999'}]}]){h=runtime({policies:[scopedPolicy],extraTables:{...wacoTables,Territory:[{...wacoTerritory,...territoryUpdate}]}});result=h.runNative('resolveApprovalRoute',context);assert.equal(result.success,false,JSON.stringify({workflow,territoryUpdate,result}));assert.equal(h.writes.length,0);}
  for(const personId of ['11','13','14']){h=runtime({policies:[scopedPolicy],extraTables:{...wacoTables,User_Access:wacoUsers.map(person=>person.ID===personId?{...person,Approval_Routing_Enabled:false}:person)}});result=h.runNative('resolveApprovalRoute',context);assert.equal(result.success,false,workflow+' requires every selected Territory approver');assert.equal(h.writes.length,0);}
}
const budgetStart=fs.readFileSync('creator/functions/startApprovalChain.dg','utf8');assert.match(budgetStart,/policyTerritory = ifnull\(budgetRec.Subdivision1.Territory/,'Budget route context uses its assigned Subdivision Territory');
const exportSource=fs.readFileSync('creator/exports/Land_Master_2026-10-11-development.ds','utf8');for(const field of ['Edit_All_Pro_Forma_Approvals','Edit_Owned_Pro_Forma_Approvals','Edit_Owned_Proformas','Edit_All_Proformas','Send_Pro_Formas_for_Approvals'])assert.match(exportSource,new RegExp('\\b'+field+'\\b'));
console.log('Actual Deluge routing passed: read-only PF Settings preview, exact IDs/scope, required policy/adapter, intended recipients, immutable history, duplicate-send/Check/Repair, retired mutations, and all-workflow Territory VP plus every Dev Mgr. Creator compilation remains a separate live gate.');

// Untouched existing PF chains are never replaced by new Settings recipients.
const legacyIntent={id:ID,mode:'Start',expectedExistingRoute:rows.map(r=>({id:r.ID,role:r.Title,email:r.Approver,order:r.Sort_Order}))};
h=runtime({approvals:rows,policies:[]});result=h.run(legacyIntent);assert.equal(result.success,true,JSON.stringify(result));
assert.deepEqual(h.snapshot().Budget_Approvals.map(r=>[r.ID,r.Title,r.Approver,r.Sort_Order]),rows.map(r=>[r.ID,r.Title,r.Approver,r.Sort_Order]));assert.equal(h.snapshot().Approval_Route_Snapshot.length,0);assert.equal(h.emails.length,1);
h=runtime({approvals:rows});before=h.snapshot();result=h.run(submission);assert.equal(result.success,false);assert.match(result.message,/saved approval route/);assert.deepEqual(h.snapshot(),before);assert.equal(h.emails.length,0);
h=runtime({approvals:rows});const changed=clone(legacyIntent);changed.expectedExistingRoute[0].email='changed@example.com';before=h.snapshot();result=h.run(changed);assert.equal(result.success,false);assert.deepEqual(h.snapshot(),before);assert.equal(h.emails.length,0);
// User identity still needs a routing email; allow a submitter recipient with stale Deny.
h=runtime({userUpdates:[{ID:'11',User:'owner'}],owner:{...creatorOwner,ID:'11',Approval_Routing_Enabled:true,Approver_Email:'first@example.com'},extraTables:{Add_Pro_Forma:[{ID,Owner:[{ID:'11'}],Territory:'North',Status:'Draft',Lock_Inputs:false}]}});result=h.run();assert.equal(result.success,true,JSON.stringify(result));assert.equal(result.route[0].userAccessId,'11');
h=runtime({policies:[{...policy,Adapter_Enabled:false}]});result=h.run(submission);assert.equal(result.success,true,JSON.stringify(result));
