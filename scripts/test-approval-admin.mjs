import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const context=vm.createContext({});
vm.runInContext(await readFile(new URL('../widgets/settings-manager/src/app/approval-admin.js',import.meta.url),'utf8'),context);
const admin=context.LMApprovalAdmin;
const run={action:'SavePolicy',token:'unique-operation-token',data:{id:'',companyId:'9007199254740993',workflow:'Purchase Order',version:2,enabled:false,steps:[{key:'step-one',order:1,roleId:'7001',condition:'Above',threshold:'100.00',enabled:true}]}};
const receipt={contract:'approval-policy-v1',success:true,writeState:'verified',token:run.token,after:{...run.data,id:'9007199254740994',status:'Draft',adapterEnabled:false}};
assert.equal(admin.verify(receipt,run).id,'9007199254740994');
const reordered=structuredClone(receipt);reordered.after.steps=[Object.fromEntries(Object.entries(run.data.steps[0]).reverse())];
admin.verify(reordered,run);
for(const change of [{token:'other-token'},{writeState:'unknown'},{success:false},{contract:'legacy'},{after:{...receipt.after,id:9007199254740994}},{after:{...receipt.after,adapterEnabled:true}},{after:{...receipt.after,status:'Published'}}])assert.throws(()=>admin.verify({...receipt,...change},run));
const publish={action:'Publish',token:run.token,data:{id:receipt.after.id}};
assert.throws(()=>admin.verify(receipt,publish),/Publication/);
admin.verify({...receipt,after:{...receipt.after,status:'Published'}},publish);
assert.equal(admin.equal({route:[{id:'1',order:1}]},{route:[{order:1,id:'1'}]}),true);
assert.equal(admin.equal({route:['1','2']},{route:['2','1']}),false);
assert.equal(admin.equal({enabled:false},{enabled:'false'}),false);
console.log('Approval admin field, token, ordered-route and audited state verification passed.');

assert.equal(admin.verify({...receipt,after:{...receipt.after,steps:[{...run.data.steps[0],threshold:'100.01'}]}},run).steps[0].threshold,'100.01');

const html=await readFile(new URL('../widgets/settings-manager/src/app/widget.html',import.meta.url),'utf8');
const transport=html.slice(html.indexOf('function approvalScope()'),html.indexOf("document.getElementById('approval-admin').onclick"));
for(const environment of ['DEVELOPMENT','PRODUCTION']){
  const calls=[];
  const transportContext=vm.createContext({S:{live:true,recId:'1'},LMRuntime:{current:()=>({environment,user:'owner',appLinkName:'land-master'}),apiName:name=>name+(environment==='DEVELOPMENT'?'_DEV':'')},LMApprovalAdmin:{create:options=>options},LMData:{request:(_key,run)=>run()},ZOHO:{CREATOR:{DATA:{invokeCustomApi:async request=>{calls.push(request);return request.api_name.startsWith('Get_User_Access_Lean')?{code:3000,result:JSON.stringify({found:true,myId:'123'})}:{code:3000,result:JSON.stringify({contract:'approval-policy-v1',success:true})};}}}}});
  vm.runInContext('window={LMApprovalAdmin};'+transport,transportContext);
  await vm.runInContext("getApprovalAdmin().call({action:'List'})",transportContext);
  assert.equal(calls[0].http_method,environment==='DEVELOPMENT'?'POST':'GET');
  if(environment==='PRODUCTION'){assert.equal('payload' in calls[0],false);assert.equal('query_params' in calls[0],false);}
  else assert.equal(calls[0].payload.user,'owner');
  assert.equal(calls[1].api_name,'Manage_Approval_Policies'+(environment==='DEVELOPMENT'?'_DEV':''));
  assert.equal(calls[1].http_method,'POST');assert.equal(JSON.parse(calls[1].payload.payload).userAccessId,'123');
}
console.log('Actual approval admin transport: Production authenticated GET, Development POST, exact caller ID and environment-specific policy API passed.');
