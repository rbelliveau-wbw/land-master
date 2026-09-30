import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const widget=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8');
const names=['canEditPf','canEditOwner','ownerEditBlockedReason','canViewProformaApprovals','canSendProformaApprovalsFor','canConfigureProformaApprovalsFor'];
const ctx={S:{proformas:[]},permissions:{},perms(){return {editAll:false,editOwned:false,editOwner:false,sendApprovals:false,...ctx.permissions};},userOwnsPf:r=>!!r?.mine,protectedInputLock:r=>!!r?.locked};
vm.createContext(ctx);for(const name of names){const i=widget.indexOf('function '+name+'(');const end=widget.indexOf('\nfunction ',i+1);vm.runInContext(widget.slice(i,end).split('\n/*')[0],ctx);}
const owned={ID:'1',mine:true},other={ID:'2',mine:false};
ctx.permissions={editOwned:true};assert.equal(ctx.canEditPf(owned),true);assert.equal(ctx.canEditPf(other),false);
assert.equal(ctx.canEditOwner(owned),true);assert.equal(ctx.canEditOwner(other),false);assert.equal(ctx.canEditOwner({...owned,locked:true}),false);
assert.equal(ctx.canConfigureProformaApprovalsFor(owned),true);assert.equal(ctx.canConfigureProformaApprovalsFor(other),false);assert.equal(ctx.canSendProformaApprovalsFor(owned),false);
ctx.permissions={sendApprovals:true};assert.equal(ctx.canSendProformaApprovalsFor(owned),true);assert.equal(ctx.canSendProformaApprovalsFor(other),false);assert.equal(ctx.canEditOwner(owned),false);
ctx.permissions={sendApprovals:true,editAll:true};assert.equal(ctx.canSendProformaApprovalsFor(other),true);
ctx.permissions={ownerEditSend:true};assert.equal(ctx.canEditPf(owned),false);assert.equal(ctx.canSendProformaApprovalsFor(owned),false);
ctx.permissions={editOwner:true};assert.equal(ctx.canEditOwner(other),true);assert.equal(ctx.canEditOwner({...other,locked:true}),false);
assert.doesNotMatch(widget,/ownerEditSend|pfOwnerEditSend|Owner_Edit_Send_Approvals|Owner Edit &amp; Send Approvals/);
const affected=['getUserAccess','Update_Proforma_Approval_Recipient','Start_Proforma_Approval_Chain','Manage_Proforma_Approval_Config','proforma_save'];
for(const name of affected)assert.doesNotMatch(fs.readFileSync('creator/functions/'+name+'.dg','utf8'),/Owner_Edit_Send_Approvals|pfOwnerEditSend/);
const adapter=fs.readFileSync('scripts/lib/deluge-pdf-test-runtime.mjs','utf8');const translate=vm.runInNewContext(adapter.slice(adapter.indexOf('function translate('),adapter.indexOf('export function packetRuntime'))+';translate');
const save=fs.readFileSync('creator/functions/proforma_save.dg','utf8');
const i=save.indexOf('// Never trust a supplied User Access ID');const end=save.indexOf('ownerIds = List();',i);
const code=translate('string preflight()\n{\nresp = Map();\n'+save.slice(i,end)+'\nresp.put("success",true);return resp.toString();\n}').js;
function server({mine=true,editOwned=true,editOwner=false,locked=false,status='Draft',approval='Not Sent',legacy=false}={}){
 const c=vm.createContext({mine,editOwned,editOwner,locked,status,approval,legacy});vm.runInContext(`
 function Map(){return {put(k,v){this[k]=v;},toString(){return JSON.stringify(this);}};}function ifnull(v,f){return v==null?f:v;}Array.prototype.count=function(){return this.length;};
 var zoho={loginuser:'real-user'},pfKey=1,quickPf={Lock_Inputs:locked,Status:status,Owner:[{ID:mine?10:20}]},quickAccess={ID:999,Edit_Proforma_Owner:true};
 function query(form,predicate){const rows=form==='User_Access'?[{ID:10,User:'real-user',Edit_Owned_Proformas:editOwned,Edit_Proforma_Owner:editOwner,Owner_Edit_Send_Approvals:legacy}]:[{Proforma:1,Status:approval}];return new Proxy(rows.filter(predicate),{get(a,k){return k in a||typeof k==='symbol'?a[k]:a[0]?.[k]??null;}});}
 `+code,c);return JSON.parse(vm.runInContext('preflight()',c));
}
assert.equal(server().success,true);assert.equal(server({mine:false}).success,false);assert.equal(server({editOwned:false,legacy:true}).success,false);
assert.equal(server({mine:false,editOwned:false,editOwner:true}).success,true);
for(const input of [{locked:true},{status:'Approved'},{approval:'Pending'},{approval:'Approved'},{approval:'Rejected'}])assert.equal(server(input).success,false,JSON.stringify(input));
assert.ok(save.indexOf('// Validate changed owner assignments')<save.indexOf('instIds = List();',save.indexOf('header = data.get("header")')),'normal save checks owner changes before writes');
console.log('Split Pro Forma owner/edit/send access and signed-in owner update checks passed.');

const recipientSource=fs.readFileSync('creator/functions/Update_Proforma_Approval_Recipient.dg','utf8');
const recipientGate=translate('string recipientGate()\n{\nresponse = Map();\n'+recipientSource.slice(recipientSource.indexOf('isPfOwner = false;'),recipientSource.indexOf('// Fetch by the Creator record ID'))+'\nresponse.put("success",true);return response.toString();\n}').js;
for(const mine of [false,true])for(const send of [false,true])for(const editAll of [false,true])for(const editOwned of [false,true])for(const apprAll of [false,true]){
 const c=vm.createContext({mine,send,editAll,editOwned,apprAll});
 vm.runInContext('function Map(){return {put(k,v){this[k]=v;},toString(){return JSON.stringify(this);}};}var accessRow={ID:10,Send_Pro_Formas_for_Approvals:send,Edit_All_Proformas:editAll,Edit_Owned_Proformas:editOwned,Edit_All_Pro_Forma_Approvals:apprAll},pf={Owner:[{ID:mine?10:20}]};'+recipientGate,c);
 assert.equal(JSON.parse(vm.runInContext('recipientGate()',c)).success,apprAll||(send&&(editAll||mine))||(editOwned&&mine));
}
console.log('Recipient backend grant/scope combinations passed.');
