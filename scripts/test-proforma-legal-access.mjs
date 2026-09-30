import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8');
const body=source.slice(source.indexOf('function canSubmitPfToLegal('),source.indexOf('function submitLOIToLegal('));
const button={hidden:true,disabled:false,textContent:''};
const context={S:{view:'vDash',dash:{id:'1'},proformas:[],loiSubmitted:{},loiSubmitting:{}},document:{getElementById:()=>button},grant:false,
  perms(){return {submitLegal:this.grant};},boolValue:v=>v===true||v==='true',lookupId:v=>v?.ID||v,approvalText:v=>String(v||''),proformaApprovalState:r=>({complete:r.approved})};
context.perms=()=>({submitLegal:context.grant});
vm.createContext(context);vm.runInContext(body,context);
const rec={ID:'1',approved:true,Lock_Inputs:true,Purchasing_Company:'company',Status:'Approved',Archive:false};
context.S.proformas=[rec];
assert.equal(context.canSubmitPfToLegal(rec),false,'Missing permission denies fully eligible record');
context.grant=true;assert.equal(context.canSubmitPfToLegal(rec),true);
for(const override of [{approved:false},{Lock_Inputs:false},{Purchasing_Company:''},{Archive:true},{Status:'LOI in Progress'}])assert.equal(context.canSubmitPfToLegal({...rec,...override}),false);
context.syncSubmitLegalButton();assert.equal(button.hidden,false);
context.S.loiSubmitting['1']=true;context.syncSubmitLegalButton();assert.equal(button.disabled,true);
context.S.view='vEdit';context.syncSubmitLegalButton();assert.equal(button.hidden,true);
assert.doesNotMatch(source,/data-act="request-entity"/);
assert.match(source,/submitLegal:\s+t\(flags && \(flags.pfSubmitLegal/);
assert.match(source,/function submitLOIToLegal\(pfId\)\{\s+if\(!perms\(\).submitLegal\)/);
assert.match(source,/if\(!canSubmitPfToLegal\(rec\)\|\|S.loiSubmitting\[key\]\)/);
// Execute the real server preflight with offline records, stopping before Writer or writes.
const adapter=fs.readFileSync('scripts/lib/deluge-pdf-test-runtime.mjs','utf8');
const translate=vm.runInNewContext(adapter.slice(adapter.indexOf('function translate('),adapter.indexOf('export function packetRuntime'))+';translate');
let backend=fs.readFileSync('creator/functions/Create_LOI_Contract.dg','utf8');
backend=backend.slice(0,backend.indexOf('\t\tdocument = thisapp.PF_Build_LOI_Document'))+'\n result.put("success",true);return result.toString();\n } catch(e){return "ERROR";} return "ERROR";\n}';
backend=backend.replace(/\w+Entry.put\("meta",[^\n]+\n/g,'');
const compiled=translate(backend).js;
function check({grant=true,lock=true,approved=true,archive=false,status='Approved',company='company',hasAccess=true}={}){
 const c=vm.createContext({grant,lock,approved,archive,status,company,hasAccess});
 vm.runInContext(`
 function ifnull(v,f){return v==null?f:v;} function Map(){return {put(k,v){this[k]=v;},toString(){return JSON.stringify(this);}};}function List(){return [];}
 Array.prototype.add=function(v){this.push(v);};Array.prototype.count=function(){return this.length;};String.prototype.toLong=function(){return Number(this);};
 var zoho={loginuser:'signed-in@example.com'};
 function query(form,predicate){const rows=form==='User_Access'?(hasAccess?[{User:zoho.loginuser,Submit_to_Legal_Module:grant}]:[]):form==='Add_Pro_Forma'?[{ID:1,Status:status,Lock_Inputs:lock,Archive:archive}]:form==='Budget_Approvals'?[{Proforma:1,Status:approved?'Approved':'Pending'}]:form==='LOI_Worksheet'?[{Proforma:1,Company:company,Is_Current:true}]:[];return new Proxy(rows.filter(predicate),{get(a,k){return k in a||typeof k==='symbol'?a[k]:a[0]?.[k]??null;}});}
 `+compiled,c);return JSON.parse(vm.runInContext('Create_LOI_Contract("1")',c));
}
assert.equal(check().success,true);
for(const input of [{grant:false},{hasAccess:false},{lock:false},{approved:false},{archive:true},{status:'LOI in Progress'},{company:null}])assert.equal(check(input).success,false,JSON.stringify(input));
console.log('Pro Forma Legal submission permission and preflight checks passed.');
