import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {poTestRuntime,compileDelugePO} from './test-po-test-cfo-backend.mjs';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';
const read=file=>fs.readFileSync(file,'utf8');
const backend=compileDelugePO(read('creator/functions/createBudgetAttachmentRecord.dg'));
const actorResolver=compileDelugePO(read('creator/functions/constructionReviewActor.dg'));
const actor={ID:19,User:'construction',Edit_All_Budgets:false,Edit_Owned_Budgets:false,Edit_All_Approvals:false,Edit_Owned_Approvals:false};
const envelope={contract:'budget-request-attachments-v1',action:'Create',budgetId:'61',userAccessId:'19',paymentRequestId:'71',modificationId:''};
function setup({profile='Construction Budgeting',login='construction',environment='Production',user=actor,users,requestType='Purchase Order',state='Draft',budget=61,profileError=false}={}){
  const r=poTestRuntime({login,environment,users:users||[user],extraTables:{Add_Budget:[{ID:61,Budget_Owner:[]}],Payment_Request:[{ID:71,Budget:budget,Request_Type:requestType,PO_Status:state,Added_User:'another-user'}],Attachment:[],Budget_Modification:[{ID:81,Budget:61}]}});
  vm.runInContext(actorResolver+';thisapp.constructionReviewActor=constructionReviewActor;'+backend,r.c);
  r.c.thisapp.permissions.profileForUser=()=>{if(profileError)throw Error('Profile unavailable');return profile;};
  r.call=(patch={})=>{r.c.attachmentArgument=JSON.stringify({...envelope,...patch});return JSON.parse(vm.runInContext('createBudgetAttachmentRecord(attachmentArgument)',r.c));};
  return r;
}
for(const state of ['Draft','Submitted','Approved','Rejected']){
  const r=setup({state}),result=r.call();assert.equal(result.ok,true,JSON.stringify(result));assert.equal(r.tables().Attachment.length,1);
  const file=r.tables().Attachment[0];assert.equal(file.Budget,61);assert.equal(file.Payment_Request,71);assert.equal(file.Budget_Modification,null);assert.equal(file.Email_Attachment,false);
}
let r=setup(),result=r.call({action:'Capabilities',paymentRequestId:''});
assert.equal(result.ok,true);assert.equal(result.canWrite,false);assert.equal(result.canAttachPO,true);assert.equal(r.c.writes,0);
result=r.call({action:'Validate'});assert.equal(result.ok,true);assert.equal(r.c.writes,0);
for(const patch of [{paymentRequestId:''},{paymentRequestId:'',modificationId:'81'},{paymentRequestId:'71',modificationId:'81'},{paymentRequestId:'999'},{budgetId:'999'},{paymentRequestId:71},{userAccessId:19},{action:'Associate',attachmentId:'91',expectedPaymentRequestId:'',expectedModificationId:''}]){
  const r=setup();assert.equal(r.call(patch).ok,false,JSON.stringify(patch));assert.equal(r.c.writes,0);
}
for(const type of ['Check','Wire']){const r=setup({requestType:type});assert.equal(r.call().ok,false);assert.equal(r.c.writes,0);}
for(const options of [{budget:62},{profile:'Read'},{profileError:true},{user:{...actor,User:''}},{users:[]},{users:[actor,{...actor,ID:29}]}]){const r=setup(options);assert.equal(r.call().ok,false,JSON.stringify(options));assert.equal(r.c.writes,0);}
for(const environment of ['Stage','Production']){const r=setup({environment,login:'test-owner'});assert.equal(r.call().ok,false);assert.equal(r.c.writes,0);}
r=setup({environment:'Development',login:'test-owner'});assert.equal(r.call().ok,true,'Native owner can preview the real Construction actor');
for(const User of ['',null]){const r=setup({environment:'Development',login:'test-owner',user:{...actor,User}});assert.equal(r.call().ok,false);assert.equal(r.c.writes,0);}
for(const user of [{...actor,Edit_All_Budgets:true},{...actor,Edit_All_Approvals:true}]){
  const r=setup({profile:'CFO',user});assert.equal(r.call({paymentRequestId:''}).ok,true,'Existing general attachment grants are preserved');
}

// Execute the entire native validation body, not a mirror of the new predicate.
const validation=read('creator/workflows/Construction_Attachment_Validation.dg').replace(/alert\s+([^;]+);/g,'throw Error($1);').replace(/cancel submit;/g,'');
const validateBody=translate('string validatePOAttachment()\n{\n'+validation+'\nreturn "ok";\n}').js;
function validate(input,tables={},profile='Construction Budgeting'){
  const c=vm.createContext({input,fixtureTables:{Payment_Request:[{ID:71,Budget:61,Request_Type:'Purchase Order'}],Attachment:[],Contract:[],...tables}});
  vm.runInContext(`
    function ifnull(v,f){return v==null?f:v;}
    Array.prototype.count=function(){return this.length;};
    function record(row){return new Proxy(row,{get(o,k){return o[k]??null;}});}
    function query(form,predicate){const rows=Array.from(fixtureTables[form]||[]).map(record).filter(predicate);return new Proxy(rows,{get(a,k){return k in a||typeof k==='symbol'?a[k]:a[0]?.[k]??null;}});}
    input=new Proxy(input,{get(o,k){return o[k]??null;}});
    var zoho={loginuser:'construction'};
    var thisapp={permissions:{isUserInProfile:()=>${JSON.stringify(profile)}==='Construction Budgeting'},hasConstructionPermission:()=>true};
  `+validateBody,c);return vm.runInContext('validatePOAttachment()',c);
}
const input={ID:null,Budget:61,Payment_Request:71,Contract1:null,Pro_Forma:null,Budget_Modification:null};
assert.equal(validate(input),'ok');
for(const PO_Status of ['Draft','Submitted','Approved','Rejected'])assert.equal(validate(input,{Payment_Request:[{ID:71,Budget:61,Request_Type:'Purchase Order',PO_Status}]}),'ok');
for(const patch of [{Budget:62},{Budget:null},{Payment_Request:999},{Contract1:91},{Pro_Forma:91},{Budget_Modification:81}])assert.throws(()=>validate({...input,...patch}));
for(const Request_Type of ['Check','Wire'])assert.throws(()=>validate(input,{Payment_Request:[{ID:71,Budget:61,Request_Type}]}));
const empty={ID:91,Budget:61,Payment_Request:71,File_field1:null,Added_User:'test-owner'};
assert.equal(validate({...input,ID:91},{Attachment:[empty]}),'ok','An empty API-created child can receive its first native FILE upload');
for(const patch of [{Budget:62},{Payment_Request:72},{Contract1:81},{Pro_Forma:81},{Budget_Modification:81}])assert.throws(()=>validate({...input,ID:91},{Attachment:[{...empty,...patch}]}));
assert.throws(()=>validate({...input,ID:91},{Attachment:[{...empty,File_field1:'another.pdf',Added_User:'another-user'}]}),/replacing/);
assert.equal(validate({...input,ID:91},{Attachment:[{...empty,File_field1:'own.pdf',Added_User:'construction'}]}),'ok');
assert.equal(validate({...input,ID:91},{Attachment:[{...empty,File_field1:'another.pdf',Added_User:'another-user'}]},'CFO'),'ok','Unrelated profiles keep their existing native validation');

// Real widget permission helper: trusted server capability, exact actor/Budget,
// PO-only context, and no implicit general upload/delete/association grant.
const html=read('widgets/budget-manager/src/app/widget.html');
const start=html.indexOf('function canAddBudgetAttachment('),end=html.indexOf('\n}',start)+2;
const c=vm.createContext({S:{myAccessId:'19'},attachmentLinkStates:{'61':{status:'loaded',scope:'construction',canAttachPO:true}},attachmentLinkScope:()=> 'construction',canEditBudget:()=>false,canActApproval:()=>false});
vm.runInContext(html.slice(start,end),c);
const context={kind:'payment',id:'71',budgetId:'61',requestType:'Purchase Order'};
assert.equal(c.canAddBudgetAttachment({ID:'61'},context),true);
assert.equal(c.canAddBudgetAttachment({ID:'61'},{...context,id:''}),true,'A new PO can queue locally before saving');
for(const request of [undefined,{...context,kind:'modification'},{...context,requestType:'Check'},{...context,budgetId:'62'},{...context,id:71}])assert.equal(c.canAddBudgetAttachment({ID:'61'},request),false);
for(const change of [state=>state.canAttachPO=false,state=>state.scope='other',state=>state.status='error']){const state=c.attachmentLinkStates['61'],saved={...state};change(state);assert.equal(c.canAddBudgetAttachment({ID:'61'},context),false);Object.assign(state,saved);}
c.S.myAccessId='';assert.equal(c.canAddBudgetAttachment({ID:'61'},context),false);
c.canEditBudget=()=>true;assert.equal(c.canAddBudgetAttachment({ID:'61'}),true);
// Legacy saved requests carry the authoritative native Request_Type too.
const legacy=vm.createContext({S:{edBudget:{ID:'61'},modModal:{},checkWireRequestsByBudget:{'61':[{ID:'71',Budget:{ID:'61'},Request_Type:'Purchase Order'}]}},restoreRequestFileDraft(){},lookupMatchesId:(v,id)=>v.ID===id,cleanVal:String,$:()=>({parentElement:{}}),closeModModal(){},getRequestAttachmentUI:()=>({mount:config=>legacy.config=config})});
const legacyStart=html.indexOf('function mountModRequestAttachments(');vm.runInContext(html.slice(legacyStart,html.indexOf('\n}',legacyStart)+2),legacy);legacy.mountModRequestAttachments('payment','71','Purchase Order');assert.equal(legacy.config.requestType,'Purchase Order');
console.log('PO attachment profile: all POs/states, trusted capability, native identity and parent validation, non-PO denial, immutable file parents, blank-login/actor isolation and existing editor grants passed.');
