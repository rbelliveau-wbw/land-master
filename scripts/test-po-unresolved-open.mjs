import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('widgets/budget-manager/src/app/po-ui.js','utf8');
const section=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const clone=value=>JSON.parse(JSON.stringify(value));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return {promise,resolve};};
const wanted={action:'Submit',id:'5',expectedRevision:'draft-before-submit',token:'original-unresolved-submit-token',budgetId:'1',userAccessId:'3',vendorId:'2',budgetModificationId:null,amount:'1.00',requestDate:'2026-11-09',dateNeeded:'2026-11-10',automaticModifications:true,expectedBalances:{'4':'1000'},expectedPendingModifications:{'4':'0'},lines:[{key:'first',budgetItemId:'4',description:'Saved work',costElement:'1',costCode:'C_QA01-3225-1',uom:'EA',pricingMode:'Manual',quantity:null,unitPrice:null,finalAmount:'1.00'}]};
const draft=id=>({...clone(wanted),id,revision:'draft-before-submit',status:'Draft',commitmentState:'None',approvalState:'Not Configured',canEditDraft:true,lines:wanted.lines.map(line=>({...line,ID:'41'}))});
const submitted={...draft('5'),revision:wanted.token,status:'Submitted',commitmentState:'Reserved',approvalState:'Pending',approvalBundle:{modifications:[],rows:[{id:'51',role:'CFO',status:'Pending',order:1}],emailSent:true}};

async function fixture(){
 const calls=[],mounts=[],renders=[],saved=[],attachmentHandoffs=[],nodes=new Map();
 const node=key=>{if(!nodes.has(key))nodes.set(key,{hidden:false,disabled:false,textContent:'',innerHTML:'',style:{},focus(){this.focused=true;},querySelector(){return node(key+'/i');},insertAdjacentHTML(_,html){this.innerHTML+=html;},remove(){}});return nodes.get(key);};
 const c=vm.createContext({Promise,Date,JSON,Map,Set,BigInt,Error,setTimeout,clearTimeout,performance:{now:()=>0},window:{matchMedia:()=>({matches:true})},document:{activeElement:null}});c.root=c;
 for(const file of ['po-domain.js','po-controller.js'])vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/'+file,'utf8'),c);
 Object.assign(c,{model:null,overlay:null,card:null,controller:null,trigger:null,previousInert:[],generation:0,loadGeneration:0,balanceGeneration:0,visualBusy:false,progress:false,openedAt:0,popover:null,deleteReview:false,vendorDialog:null,previewTimer:null,previewGeneration:0,unresolved:{},esc:value=>String(value??''),money:value=>'$'+value,localDate:()=> '2026-11-09',lineNew:()=>({key:'new'}),uid:()=> 'new-unsent-operation-token',closePopover(){},dateValid:()=>true,lineCode:line=>line.costCode});
 let scope='Development:CFO',getReply=null,checkReply=null;
 c.options={scope:()=>scope,userAccessId:()=> '3',phaseName:()=> 'QA Phase',canEdit:()=>true,canCreate:()=>true,canDelete:()=>true,vendors:async()=>[{ID:'2',Vendor_Name:'QA Vendor'}],saveAttachments:async(model,snapshot)=>{attachmentHandoffs.push(snapshot.id);return {complete:true,total:1,saved:1};},saved:snapshot=>saved.push(clone(snapshot)),call:async payload=>{calls.push(clone(payload));if(payload.action==='Submit')throw Error('Creator Custom API error: outcome unknown');if(payload.action==='Check')return checkReply||{contract:'po-v1',success:false,writeState:'unknown',error:'Still unresolved'};if(payload.action==='Get')return getReply||{contract:'po-v1',success:true,snapshot:draft(payload.id)};if(payload.action==='Balances')return {contract:'po-v1',success:true,balances:[]};throw Error('Unexpected action '+payload.action);}};
 c.current=()=>c.model&&c.model.scope===c.options.scope();c.error=message=>{c.model.error=message;};
 c.mount=()=>{c.card={style:{},focus(){},querySelector:node,querySelectorAll:()=>[]};c.overlay={remove(){},classList:{remove(){},toggle(){}},querySelector:node};};
 c.render=()=>renders.push({id:c.model.id,preview:c.model.preview,loaded:c.model.loadState,pending:c.model.operationPending,readOnly:c.readOnly()});
 c.mountProgress=action=>{c.progress=true;c.openedAt=0;mounts.push({action,model:c.model});};
 c.LMPOProgress={update(){}};
 for(const [start,end] of [['    function canAmend(','    function picker('],['    function call(','    var chevron='],['    function close(){','    function keydown('],['    function totals()','    function patchTotal('],['    async function readBalances()','    function setDeleteReview('],['    function onState(','    async function save('],['    async function save(','    async function get('],['    async function get(','    function click('],['    function click(','    async function open('],['    async function open(','    return {open:']])vm.runInContext(section(start,end),c);
 c.publicUI=vm.runInContext('(function(){'+section('    return {open:','\n  }\n')+'})()',c);
 c.captureRecovery=()=>{};
 const originalModel={...draft('5'),scope:scope,phase:'QA Phase',editable:true,preview:false,loadState:'loaded',reservedLines:[],vendors:[{ID:'2',Vendor_Name:'QA Vendor'}],balances:[],balanceState:'loaded',error:'',attachmentDraft:{entries:[{file:{name:'retained.pdf'},status:'queued'}]}};
 c.model=originalModel;c.controller=c.LMPOController.create({call:c.call,onState:c.onState});c.mount();
 await c.controller.begin(wanted);const originalController=c.controller,run=originalController.state();assert.equal(run.unknown,true);c.close();assert.equal(c.unresolved['1'].controller,originalController);assert.equal(c.unresolved['1'].model,originalModel);
 return {c,calls,mounts,renders,saved,nodes,originalModel,originalController,run,attachmentHandoffs,setScope:value=>scope=value,setGet:value=>getReply=value,setCheck:value=>checkReply=value};
}
const press=(c,attribute)=>c.click({target:{closest:selector=>selector==='button,input[data-po-date]'?{dataset:{},hasAttribute:name=>name===attribute}:null}});

for(const intent of ['view','edit','attachments']){
 const f=await fixture();await f.c.open({ID:'1'},null,'5',intent);
 assert.equal(f.mounts.length,0,'Saved record entry must not mount retained progress');assert.equal(f.c.model.id,'5');assert.equal(f.c.model.preview,intent!=='edit');assert.equal(f.c.readOnly(),true,'Saved records remain locked until the original operation is checked');assert.equal(f.c.model.operationPending,true);assert.match(f.c.model.operationError,/Custom API/);
 assert.deepEqual(f.calls.map(row=>row.action),['Submit','Get','Balances'],'Eye/Pencil perform reads without automatic Check or retry');
 assert.equal(f.c.unresolved['1'].model,f.originalModel);assert.equal(f.c.unresolved['1'].controller,f.originalController);assert.deepEqual(clone(f.run.payload),wanted,'Original payload/token/actor must remain immutable');
 await f.c.save('Save');await f.c.save('Submit');assert.equal(f.calls.length,3,'Pending saved editor cannot commit or replay');assert.equal(f.c.canDelete(),false);
 f.c.close();assert.equal(f.c.unresolved['1'].controller,f.originalController,'Closing a fresh preview must retain the original unknown controller');await f.c.open({ID:'1'},null,'5',intent);assert.equal(f.mounts.length,0);assert.equal(f.run.unknown,true);
}

let f=await fixture();await f.c.open({ID:'1'},null,'6','view');assert.equal(f.c.model.id,'6','Another saved PO in the same phase must be readable');assert.equal(f.mounts.length,0);assert.equal(f.c.model.operationPending,true);f.c.close();await f.c.open({ID:'1'},null,'6','edit');assert.equal(f.c.model.id,'6');assert.equal(f.c.model.preview,false);assert.equal(f.c.model.operationPending,true);assert.equal(f.c.unresolved['1'].model,f.originalModel);
assert.equal(f.c.publicUI.hasUnresolvedOperation('1','5'),true);assert.equal(f.c.publicUI.hasUnresolvedOperation('1','6'),true);assert.equal(f.c.publicUI.hasUnresolvedOperation('1','7'),false,'Other request IDs are not attachment-locked');assert.equal(f.c.publicUI.hasUnresolvedOperation('2','5'),false);
await assert.rejects(()=>f.originalController.begin(wanted),/unresolved/,'Original controller must remain quarantined');
f.setCheck({contract:'po-v1',success:true,writeState:'verified',snapshot:submitted});press(f.c,'data-po-check-operation');await tick();await new Promise(resolve=>setTimeout(resolve,5));
assert.equal(f.mounts.length,1);assert.equal(f.mounts[0].model,f.originalModel,'Explicit Check uses the captured operation, not the unrelated preview');const checked=f.calls.find(row=>row.action==='Check');assert.deepEqual(checked,{action:'Check',budgetId:'1',userAccessId:'3',token:wanted.token});assert.equal(f.calls.filter(row=>row.action==='Submit').length,1);assert.equal(f.run.unknown,false);assert.equal(f.c.unresolved['1'],null,'Only verified read-only Check releases the local quarantine');f.c.close();await f.c.open({ID:'1'},null,'6','edit');assert.equal(!!f.c.model.operationPending,false);
assert.equal(f.run.readOnlyCheck,true);assert.equal(f.attachmentHandoffs.length,0,'Explicit status Check cannot start the retained attachment upload adapter');assert.equal(f.originalModel.attachmentDraft.entries[0].status,'queued');assert.equal(f.run.attachmentResult.complete,false);

const direct=await fixture(),acknowledged={payload:wanted,snapshot:submitted,readOnlyCheck:false};direct.c.model=direct.originalModel;direct.c.controller={state:()=>acknowledged};direct.c.mount();direct.c.mountProgress('Submit');direct.c.onState(acknowledged,'settled');await new Promise(resolve=>setTimeout(resolve,5));assert.equal(direct.attachmentHandoffs.length,1,'Direct acknowledged saves retain their existing one-time attachment handoff');direct.c.onState(acknowledged,'settled');await tick();assert.equal(direct.attachmentHandoffs.length,1);

f=await fixture();const slow=deferred();f.setGet(slow.promise);const opening=f.c.open({ID:'1'},null,'6','view');await tick();press(f.c,'data-po-check-operation');await tick();slow.resolve({contract:'po-v1',success:true,snapshot:draft('6')});await opening;assert.equal(f.c.model,f.originalModel,'A superseded saved-record read cannot overwrite the captured Check model');assert.equal(f.run.unknown,true);assert.equal(f.calls.filter(row=>row.action==='Submit').length,1);

f=await fixture();await f.c.open({ID:'1'},null,null);assert.equal(f.mounts.length,1,'New PO entry still exposes the existing unresolved result');assert.deepEqual(f.calls.map(row=>row.action),['Submit'],'Resuming progress must not automatically retry');f.c.close();f.setScope('Development:another-actor');await assert.rejects(()=>f.c.open({ID:'1'},null,'5','view'),/another Creator session/);assert.equal(f.calls.length,1,'Changed actor cannot check or replay the captured operation');

f=await fixture();f.setGet({contract:'po-v1',success:false,error:'Saved PO read failed'});await f.c.open({ID:'1'},null,'5','edit');assert.equal(f.c.model.loadState,'unavailable');assert.equal(f.c.model.operationPending,true);assert.equal(f.c.readOnly(),true);assert.equal(f.c.unresolved['1'].controller,f.originalController);

// Execute the actual request-context write gates, preserving ordinary Budget
// files, Check/Wire IDs and standalone modification attachments.
const widget=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
const widgetFunction=name=>{const start=widget.indexOf('function '+name+'(');return widget.slice(start,widget.indexOf('\n}',start)+2);};
let attachmentWrites=0;
const attachments=vm.createContext({Promise,Error,JSON,Object,purchaseOrderUI:{hasUnresolvedOperation:(budget,id)=>budget==='1'&&id==='5'},S:{edBudget:{ID:'1'},attachmentBusy:false},attachmentAssociationReview:null,setMsg(){},budgetAttachments:()=>[{recordId:'70',paymentRequestId:'5'}],canAddBudgetAttachment:()=>true,LMRequestAttachments:{Draft:{summary:q=>({total:q.entries.length,saved:0,complete:false})}},sdkRunBudgetFunction(){attachmentWrites++;throw Error('No attachment mutation may start');}});
for(const name of ['requestAttachmentWritesLocked','flushRequestAttachmentDraft','uploadBudgetAttachments','changeAttachmentAssociation','deleteBudgetAttachment','runDeleteBudgetAttachment'])vm.runInContext(widgetFunction(name),attachments);
const pendingContext={kind:'payment',id:'5',budgetId:'1'};
assert.equal(attachments.requestAttachmentWritesLocked(pendingContext),true);
for(const context of [undefined,{kind:'payment',budgetId:'1'},{kind:'payment',id:'',budgetId:'1'},{kind:'payment',id:'7',budgetId:'1'},{kind:'modification',id:'5',budgetId:'1'},{kind:'payment',id:'5',budgetId:'2'}])assert.equal(attachments.requestAttachmentWritesLocked(context),false,'Unrelated Budget/request attachments remain unchanged');
assert.equal(attachments.requestAttachmentWritesLocked(undefined,{operationPending:true}),true);
await attachments.flushRequestAttachmentDraft({operationPending:true,attachmentDraft:{entries:[{status:'queued'}]}},{ID:'1'},pendingContext);
assert.equal(await attachments.uploadBudgetAttachments([{name:'blocked.pdf',size:1}],pendingContext),false);
await assert.rejects(()=>attachments.changeAttachmentAssociation({ID:'1'},{recordId:'70',paymentRequestId:''},pendingContext),/pending PO/);
await assert.rejects(()=>attachments.changeAttachmentAssociation({ID:'1'},{recordId:'70',paymentRequestId:'5'},{kind:'',id:''}),/pending PO/);
assert.equal(attachments.deleteBudgetAttachment(0),false);assert.equal(await attachments.runDeleteBudgetAttachment(0),false);assert.equal(attachmentWrites,0);

// The real gate must retain the phase lock after reallocation repaints too.
const gate=vm.createContext({model:{operationPending:true,reallocation:null},overlay:{},progress:false,card:{querySelectorAll:()=>buttons}}),buttons=[{disabled:false},{disabled:false}];vm.runInContext(section('    function patchReallocationGate(','    function numericFocus('),gate);gate.patchReallocationGate();assert.ok(buttons.every(button=>button.disabled&&/Check Status/.test(button.title)));
console.log('PO unresolved navigation: fresh Eye/Pencil/attachments and unrelated PO reads, retained exact unknown operation, read-only writes/files/recovery, explicit scoped Check, close/reopen, failed/stale reads and actor isolation passed without replay.');
