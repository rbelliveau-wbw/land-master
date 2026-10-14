import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const widget=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8');
function fn(name){const start=widget.indexOf('function '+name+'('),end=widget.indexOf('\nfunction ',start+1);assert.ok(start>=0&&end>start,name);return widget.slice(start,end);}
const route=[
 {order:1,policyStepOrder:1,key:'vp',roleId:'441092600000000003',role:'VP',assignmentId:'',userAccessId:'441092600000000013',name:'Waco VP',email:'waco-vp@example.com'},
 {order:2,policyStepOrder:2,key:'coo',roleId:'441092600000000002',role:'COO',assignmentId:'441092600000000022',userAccessId:'441092600000000012',name:'COO',email:'coo@example.com'}
];
const pf={ID:'4410926000004947002',Name:'test vp approval routing - Waco',Territory:'Waco',Status:'Draft',mine:true};
const snapshot={success:true,contract:'proforma-approval-settings-v1',policyModel:'territory-perpetual-v2',proformaId:pf.ID,policyId:'441092600000000041',route};
const host={innerHTML:''};
const c=vm.createContext({
 S:{liveSDK:true,currentUser:'robby',proformas:[pf],approvals:[],ed:{model:pf,id:pf.ID,dirty:false,loiDirty:false}},
 runtime:{environment:'production',actor:'robby'},LMRuntime:{current(){return c.runtime;}},
 approvalText:v=>String(v??'').trim(),intN:v=>Number(v)||0,lookupId:v=>v?.ID||v,
 esc:v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),
 perms:()=>({sendApprovals:true,editAll:false,apprAll:false}),userOwnsPf:r=>!!r.mine,boolValue:v=>v===true,
 proformaApprovalReadiness:()=>({ready:true,issues:[]}),pfReferencesReady:()=>true,
 canViewProformaApprovals:()=>true,canEditProformaApprovalRow:()=>false,
 document:{querySelector:()=>host},auditLog(){},errMeta:e=>({message:e.message}),
 setApprovalBusy(value){c.S.approvalBusy=value;},setPane(){},pfApprovalProgress:null,
});
vm.runInContext(['approvalPfId','approvalRowsForPf','approvalRole','approvalStatus','approvalEmail','approvalNote','approvalDate','proformaApprovalState','approvalStateLabel','approvalStatusMarkup','approvalStepperHtml','canSendProformaApprovalsFor','proformaSendApprovalsGate','sendApprovalsWhyText','sendApprovalsWhyIcon','proformaApprovalSettingsKey','proformaApprovalSettingsEntry','validateProformaApprovalSettings','loadProformaApprovalSettings','proformaApprovalStartPayload','renderApprovalPane','runStartProformaApproval'].map(fn).join('\n'),c);

assert.equal(c.validateProformaApprovalSettings(snapshot,pf.ID),snapshot);
for(const invalid of [
 {success:true,proformaId:pf.ID,rowCount:5,firstStatus:'Not Sent'},
 {...snapshot,proformaId:Number(pf.ID)},
 {...snapshot,policyModel:'scope-v1'},
 {...snapshot,policyId:Number(snapshot.policyId)},
 {...snapshot,route:[]},
 {...snapshot,route:[{...route[0],userAccessId:Number(route[0].userAccessId)}]},
 {...snapshot,route:[{...route[0],order:2}]},
 {...snapshot,route:[{...route[0],email:''}]},
 {...snapshot,route:Array.from({length:9},(_,i)=>({...route[0],order:i+1,key:'step-'+i}))}
])assert.throws(()=>c.validateProformaApprovalSettings(invalid,pf.ID),/Settings|Creator|approver/);

let calls=[],resolvePreview;
c.invokeProformaApprovalApi=(key,args)=>{calls.push({key,args});return new Promise(resolve=>{resolvePreview=resolve;});};
const first=c.loadProformaApprovalSettings(pf),second=c.loadProformaApprovalSettings(pf);
assert.equal(first,second,'duplicate route reads share one pending request');
assert.equal(calls.length,1);
assert.deepEqual(JSON.parse(calls[0].args.proformaId),{id:pf.ID,mode:'Check',settingsPreview:true},'preview uses existing read-only mode on an old backend');
resolvePreview(snapshot);await first;
assert.equal(c.proformaApprovalSettingsEntry(pf).status,'ready');
assert.equal(await c.loadProformaApprovalSettings(pf),snapshot);assert.equal(calls.length,1);

c.renderApprovalPane();
assert.match(host.innerHTML,/Waco VP/);assert.match(host.innerHTML,/waco-vp@example.com/);
assert.doesNotMatch(host.innerHTML,/VP_EMAIL|data-pf-appr-config|data-pf-appr-recipient|Add Approver|draggable=/);
assert.equal(c.proformaSendApprovalsGate(pf).can,true,'old default rows do not govern sending readiness');
c.S.approvals=[];assert.equal(c.proformaSendApprovalsGate(pf).can,true,'Settings creates execution rows at submission');

const forced=c.loadProformaApprovalSettings(pf,true);assert.equal(calls.length,2);
c.runtime={environment:'development',actor:'robby'};resolvePreview(snapshot);
await assert.rejects(forced,/context changed/);
assert.equal(c.proformaApprovalSettingsEntry(pf),null,'previous environment cannot publish a route');
c.runtime={environment:'production',actor:'robby'};

// An old native Check response blocks the submit path before a confirmation or
// write. It cannot be mistaken for Settings capability or a usable route.
let confirmations=[],sent=[];
c.invokeProformaApprovalApi=(_key,args)=>{calls.push({args});return Promise.resolve({success:true,proformaId:pf.ID,status:'Draft',rowCount:5});};
c.uiConfirm=options=>{confirmations.push(options);return Promise.resolve(true);};
c.executeStartProformaApproval=(id,value)=>{sent.push({id,value});};
await c.runStartProformaApproval(pf.ID);
assert.equal(sent.length,0);assert.equal(confirmations.length,1);assert.equal(confirmations[0].title,'Approval route unavailable');
assert.match(confirmations[0].message,/Settings update/);
assert.ok(calls.every(call=>!call.args||JSON.parse(call.args.proformaId).mode==='Check'),'all preliminary calls are read only');

c.invokeProformaApprovalApi=()=>Promise.resolve(snapshot);confirmations=[];
c.uiConfirm=options=>{confirmations.push(options);return Promise.resolve(false);};
await c.runStartProformaApproval(pf.ID);assert.equal(sent.length,0);
assert.deepEqual(JSON.parse(JSON.stringify(confirmations[0].steps)),['VP — waco-vp@example.com','COO — coo@example.com']);
c.uiConfirm=()=>Promise.resolve(true);await c.runStartProformaApproval(pf.ID);
assert.equal(sent.length,1);assert.equal(sent[0].id,pf.ID);
const startPayload=JSON.parse(c.proformaApprovalStartPayload(pf.ID,sent[0].value).proformaId);
assert.equal(startPayload.mode,'StartSettings');assert.equal(startPayload.expectedPolicyId,snapshot.policyId);
assert.deepEqual(startPayload.expectedRoute,route.map(({order,key,roleId,role,userAccessId,email})=>({order,key,roleId,role,userAccessId,email})), 'confirmed exact recipient intent is checked before native writes');

// An existing unsent route is preserved without requesting Settings.
c.S.approvals=[{ID:'123',Proforma:pf.ID,Title:'Original VP',Approver:'original@example.com',Sort_Order:1,Status:'Not Sent'}];
c.invokeProformaApprovalApi=()=>{throw new Error('existing routes must not call Settings');};
c.renderApprovalPane();assert.match(host.innerHTML,/Original VP/);assert.match(host.innerHTML,/original@example.com/);assert.doesNotMatch(host.innerHTML,/Refresh Route|waco-vp@example.com/);
c.invokeProformaApprovalApi=()=>Promise.resolve({success:true,proformaId:pf.ID,rowCount:1,firstId:'123'});
await assert.rejects(c.loadProformaApprovalSettings(pf,true),/Promote the Creator/);
c.invokeProformaApprovalApi=()=>Promise.resolve({success:true,savedRouteContract:'proforma-approval-existing-v1',proformaId:pf.ID,rowCount:1,firstId:'123'});
assert.equal((await c.loadProformaApprovalSettings(pf,true)).saved,true);
const saved=await c.loadProformaApprovalSettings(pf,false);assert.equal(saved.saved,true);
assert.deepEqual(JSON.parse(c.proformaApprovalStartPayload(pf.ID,saved).proformaId),{id:pf.ID,mode:'Start',expectedExistingRoute:[{id:'123',role:'Original VP',email:'original@example.com',order:1}]});

// Existing history stays mounted as a read-only captured route, with its saved
// notes and recipient. Viewing it makes no Settings preview request.
c.S.approvals=[{ID:'saved-1',Proforma:pf.ID,Title:'Saved CEO',Approver:'historical@example.com',Sort_Order:1,Status:'Approved',Sent_Date:'2026-10-13',Approval_Notes:'Keep historical note'}];
c.canSendProformaApprovalsFor=()=>false;
c.invokeProformaApprovalApi=()=>{throw new Error('submitted routes must not request a Settings preview');};
c.renderApprovalPane();assert.match(host.innerHTML,/historical@example.com/);assert.match(host.innerHTML,/Keep historical note/);assert.doesNotMatch(host.innerHTML,/waco-vp@example.com|Refresh Route|data-pf-appr-config/);
c.S.approvals=[];pf.Status='Pending Approval';assert.equal(c.proformaApprovalState(pf).started,true,'parent status protects a route when approval-row reads are unavailable');
pf.Status='Draft';c.S.approvals=[{Proforma:pf.ID,Status:'Not Sent',Approval_Notes:'Retained history'}];assert.equal(c.proformaApprovalState(pf).started,true);

// A definite rejected Start checks persisted state once and cannot repair old
// untouched rows into a live chain after a Settings preflight failed.
let repairs=0,terminal;
const progress=vm.createContext({pfApprovalProgress:null,Date,PF_APPROVAL_TICK:560,clearTimeout(){},pfApprovalInspect:()=>false,pfApprovalRender(){},pfApprovalPace(){},pfApprovalSchedule(){},auditLog(){},errMeta:e=>e,pfApprovalFinish(_p,kind,message){terminal={kind,message};},pfProgressSnapshot(_p,mode){if(mode==='Repair')repairs++;return Promise.resolve({status:'Draft',firstStatus:'Not Sent',pendingCount:0});}});
vm.runInContext(fn('pfApprovalCheck'),progress);
const attempt={id:pf.ID,startRejected:'Settings route changed. Refresh it.',terminal:'',pendingFinish:null,repairUsed:false,startedAt:Date.now()-10000};progress.pfApprovalProgress=attempt;
progress.pfApprovalCheck(attempt);await Promise.resolve();assert.equal(repairs,0);assert.deepEqual(terminal,{kind:'error',message:attempt.startRejected});

console.log('Pro Forma Settings routing: safe read-only capability, exact confirmed recipients, no legacy controls/default fallback, scoped cache, preserved history and rejected-start recovery passed.');

// Transport exceptions retain the native business-rule message for route display.
const transport=vm.createContext({S:{liveSDK:true},CFG:{customApis:{startProformaApproval:'Start_Proforma_Approval_Chain'}},auditLog(){},responseBad:()=>false});
vm.runInContext([fn('parseApprovalApiResult'),fn('invokeProformaApprovalApi'),fn('pfReadOnlyInvoke')].join('\n'),transport);
for(const raw of [{code:3000,result:JSON.stringify({success:false,message:'Native route reason'})},{code:3000,details:{output:JSON.stringify({success:false,message:'Native route reason'})}}]){
 transport.sdkInvoke=()=>Promise.reject(Object.assign(new Error('Custom API returned an explicit failure.'),{raw}));
 await assert.rejects(transport.invokeProformaApprovalApi('startProformaApproval',{proformaId:JSON.stringify({id:pf.ID,mode:'Check',settingsPreview:true})}),e=>e.message==='Native route reason'&&e.acknowledgedFailure===true);
}
for(const mode of ['Check','Repair','Start','StartSettings'])assert.equal(transport.pfReadOnlyInvoke({api_name:'Start_Proforma_Approval_Chain',payload:{proformaId:JSON.stringify({id:pf.ID,mode,settingsPreview:true})}}),mode==='Check');
const {ready}=await import('./fixtures/proforma-sdk-v2-harness.mjs');
const live=await ready({invoke:cfg=>cfg.api_name.replace(/_DEV$/,'')==='Start_Proforma_Approval_Chain'?{code:3000,result:JSON.stringify({success:false,message:'Native route reason'})}:undefined});
await assert.rejects(live.widget.sdkInvoke({api_name:'Start_Proforma_Approval_Chain',payload:{proformaId:JSON.stringify({id:pf.ID,mode:'Check',settingsPreview:true})}}));
assert.equal(live.widget.PFTransport.snapshot().reviews.length,0,'failed read-only route preview cannot lock writes as an unknown mutation');assert.equal(live.widget.PFTransport.snapshot().ledger.length,0);
