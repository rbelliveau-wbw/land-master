import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {drain} from './fixtures/proforma-sdk-v2-harness.mjs';

const source=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8').replaceAll('\r','');
function fn(name){
  const start=source.indexOf('function '+name+'('),line=source.indexOf('\n',start);
  assert.ok(start>=0,name);
  return source.slice(start,source.slice(start,line).trim().endsWith('}')?line:source.indexOf('\n}',start)+2);
}
const PF='90071992547409931',RID='90071992547409992',NEWID='90071992547409993',OTHER='90071992547409932';
const elements=new Map(),native=[],routes=[],classes=new Set();
function el(id){
  if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',listeners:{},files:[],value:'',
    hidden:false,disabled:false,inert:false,isConnected:true,style:{},attrs:{},scrollTop:73,
    classList:{add:name=>classes.add(id+name),remove:name=>classes.delete(id+name),contains:name=>classes.has(id+name),toggle(name,on){if(on)classes.add(id+name);else classes.delete(id+name);}},contains(node){return node===this||node===el('proformaAttachmentModalClose');},
    getAttribute(name){return this.attrs[name];},setAttribute(name,value){this.attrs[name]=value;},getClientRects:()=>[{}],querySelectorAll:()=>[],querySelector:()=>null,
    focus(){c.document.activeElement=this;},addEventListener(type,callback){this.listeners[type]=callback;},click(){this.clicks=(this.clicks||0)+1;}});
  return elements.get(id);
}
let allowed=true,resolveCreate,confirmDelete=false;
const pending=new Promise(resolve=>{resolveCreate=resolve;});
const row={ID:RID,Pro_Forma:{ID:PF},File_field1:{filename:'<file>.pdf',filepath:'/private/exact.pdf',url:'https://example.test/download?filepath=%2Fprivate%2Fexact.pdf&digestValue=private'},Date_field1:'2026-10-03 12:34:56',Added_User:{user_name:'WBDEVELOPMENT',display_name:'Old native display'},Modified_User:'Other Editor'};
let reportRows=[row],readHook=null,countHook=null;
const scopeRows=config=>{const criteria=String(config.criteria||''),record=criteria.match(/\bID == (\d+)/),parent=criteria.match(/\bPro_Forma == (\d+)/);return reportRows.filter(row=>(!record||row.ID===record[1])&&(!parent||row.Pro_Forma?.ID===parent[1]));};
const c=vm.createContext({
  S:{liveSDK:true,coreReady:true,coreFailed:false,useMock:false,currentUser:'creator',env:{name:'PRODUCTION',fragment:''},attachmentPfId:PF,attachmentBusy:false,attachmentsByPf:{},attachmentsLoading:{},attachmentErrors:{},attachmentEpochs:{},attachmentVerifiedCounts:{},attachmentModal:null,attachmentModalToken:0,attachmentCounts:{status:'idle',counts:{},pending:{},promise:null,generation:0,scope:''},users:[{id:'17',label:'wbdevelopment',email:'wbdevelopment',userName:'wbdevelopment',approverEmail:'creator@example.test',fullName:'Creator Full Name'}],proformas:[{ID:PF,Name:'<Legal PF>'},{ID:OTHER,Name:'Other PF'}]},
  CFG:{reports:{attachments:'All_Contract_Versions'},attachmentProformaField:'Pro_Forma',attachmentFileField:'File_field1',customApis:{createProformaAttachmentRecord:'Create_Proforma_Attachment_Record',deleteProformaAttachment:'Delete_Proforma_Attachment'}},
  Blob,File,Uint8Array,atob,btoa,Promise,setTimeout,clearTimeout,
  MONTHS_S:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],document:{referrer:'https://creator.example.test/',getElementById:el,querySelectorAll:()=>[],addEventListener(type,callback){this[type]=callback;},body:{style:{overflow:'auto'},children:[el('listView'),el('proformaAttachmentModal'),el('confirmModal'),el('proformaAttachmentPreview')]}},
  REPORT_CAND_MEMO:{},canEditPf:()=>allowed,candidates:name=>[name],toast(){},auditLog(){},errMeta:err=>({message:err.message}),
  sdkAdd(){assert.fail('Normal upload must use its existing Custom API without direct add');},
  sdkDelete(){assert.fail('Normal delete must use its existing Custom API without direct delete');},
  sdkInvoke(config){if(config.api_name==='getProformaAttachmentPreview')return Promise.resolve({code:3000,result:JSON.stringify({ok:true,base64:Buffer.from('fixture').toString('base64')})});native.push({kind:config.api_name==='Create_Proforma_Attachment_Record'?'create':'delete',config});if(config.api_name==='Create_Proforma_Attachment_Record')return pending;reportRows=reportRows.filter(row=>row.ID!==config.payload.attachmentId);return Promise.resolve({code:3000,result:JSON.stringify({ok:true,attachmentId:config.payload.attachmentId})});},
  previewPfAttachment:file=>routes.push({kind:'preview',file}),downloadPfAttachment:file=>routes.push({kind:'download',file}),uiConfirm:async()=>confirmDelete,
  closePfAttachmentPreview(){el('proformaAttachmentPreview').classList.remove('show');},
  ZOHO:{CREATOR:{UTIL:{getInitParams:async()=>({envUrlFragment:'',loginUser:'creator'})},DATA:{
    getRecordCount:async config=>{native.push({kind:'count',config});return countHook?countHook(config):{code:3000,result:{records_count:String(scopeRows(config).length)}};},
    getRecords:async config=>{native.push({kind:'read',criteria:config.criteria,config});const rows=scopeRows(config),offset=Number(config.record_cursor||0),snapshot=rows.slice(offset,offset+200);return readHook?readHook(config,snapshot):{code:3000,data:snapshot,...(offset+200<rows.length?{record_cursor:String(offset+200)}:{})};},
    invokeCustomApi:async config=>{const result=await c.sdkInvoke(config);if(config.api_name==='Create_Proforma_Attachment_Record'){const body=JSON.parse(result.result);reportRows.push({...row,ID:body.attachmentId,Pro_Forma:{ID:config.payload.proformaId},File_field1:''});}return result;}
  },FILE:{
    uploadFile:async config=>{native.push({kind:'upload',config});const current=reportRows.find(row=>row.ID===config.id);assert.ok(current,'Native FILE target must be the freshly confirmed child');current.File_field1={filename:config.file.name,filepath:'/private/new.pdf'};return {code:3000,data:{filename:config.file.name,filepath:'/private/new.pdf'}};},
    readFile:async()=>new Blob(['fixture'])
  }}},
});
c.window=c;c.location={href:'https://example.test/prod/proforma-manager/',pathname:'/prod/proforma-manager/',search:''};
for(const file of ['runtime-context.js','creator-data.js','pf-controller.js'])vm.runInContext(fs.readFileSync('widgets/proforma-manager/src/app/'+file,'utf8'),c,{filename:file});
const controllerStart=source.indexOf('var PFTransport=LMPFPreparation.create('),controllerEnd=source.indexOf('\nif(window.PFTransportUI)',controllerStart);assert.ok(controllerStart>=0&&controllerEnd>controllerStart);vm.runInContext(source.slice(controllerStart,controllerEnd),c);await c.PFTransport.start();
for(const name of ['pfPublicReady','pfUnknownCustom','rememberReportCandidate','sdkGetAll','esc','lookupId','responseBad','dateToInputValue','dateToCreatorValue','pfAttachmentExt','pfAttachmentMime','pfAttachmentIcon','pfAttachmentDecode','pfAttachmentQuery','pfAttachmentName','pfAttachmentNormalizeFile','pfAttachmentRecordPfId','pfAttachmentAuthorLabel','syncPfAttachmentAuthorLabels','pfAttachmentDateLabel','pfAttachmentActionIcon','normalizePfAttachment','pfAttachmentRec','pfAttachments','pfAttachmentScope','pfAttachmentParent','pfAttachmentStoredFile','pfAttachmentReadError','readPfAttachmentRows','resetPfAttachmentCounts','pfAttachmentBadge','pfListAttachmentAction','syncListAttachmentButtons','loadPfAttachmentSummaries','pfAttachmentStatusHtml','renderPfAttachments','pfAttachmentActionContext','pfAttachmentContextActive','renderPfAttachmentSurfaces','openPfAttachmentModal','closePfAttachmentModal','pfAttachmentModalKeydown','pfAttachmentModalFocus','handlePfAttachmentClick','handlePfAttachmentDrop','handlePfAttachmentPicker','parsePfAttachmentApi','invokePfAttachmentApi','createdRecordId','createPfAttachmentRecord','deletePfAttachmentRecord','pfSdkUploadFile','pfSdkReadFile','pfAttachmentBase64Blob','pfAttachmentResponseBlob','getPfAttachmentBlob','uploadPfAttachments','loadPfAttachments'])vm.runInContext(fn(name),c);
assert.equal(c.pfPublicReady(),true);c.S.coreReady=false;assert.equal(c.pfPublicReady(),false);c.S.coreReady=true;
c.scrollX=7;c.scrollY=533;const restoredScroll=[];c.scrollTo=(x,y)=>restoredScroll.push([x,y]);
c.S.attachmentCounts.scope=c.pfAttachmentScope();

// Actual normalizer preserves persisted parent/file/date metadata and record objects.
const original=JSON.stringify(row),file=c.normalizePfAttachment(row,0);
assert.equal(file.recordId,RID);assert.equal(file.proformaId,PF);assert.equal(file.filePath,'/private/exact.pdf');assert.equal(file.url,row.File_field1.url);
assert.equal(file.addedTime,row.Date_field1);assert.equal(file.addedUser,'Creator Full Name');assert.equal(file.rawRecord,row);assert.equal(JSON.stringify(row),original);
for(const value of ['/download?filepath=%2Fprivate%2Fexact.pdf&filename=review.pdf',{file_name:'review.pdf',file_path:'/private/exact.pdf'},[{filename:'review.pdf',filepath:'/private/exact.pdf'}]]){
  const normalized=c.normalizePfAttachment({...row,File_field1:value},0);
  assert.equal(normalized.recordId,RID);assert.equal(normalized.proformaId,PF);assert.equal(normalized.filePath,'/private/exact.pdf');
}
assert.equal(c.normalizePfAttachment({...row,Added_User:undefined,Added_By:'Wrong custom creator'},0).addedUser,'','missing creator never substitutes last editor/custom field/current actor');
assert.equal(c.normalizePfAttachment({...row,Date_field1:undefined,Added_Time:'03-Oct-2026 12:34:56'},0).addedTime,'03-Oct-2026 12:34:56','date fallback stays independent of creator identity');

// Genuine recorded identities match one authoritative loaded roster entry, never inferred aliases.
for(const author of ['wbdevelopment','CREATOR@EXAMPLE.TEST',{user_name:'wbdevelopment'},{username:'wbdevelopment'},{email:'creator@example.test',display_name:'Short'},{zc_display_value:'wbdevelopment'}])assert.equal(c.pfAttachmentAuthorLabel(author),'Creator Full Name');
for(const author of ['creator@different.test','wbdevelopment_1','missing-person'])assert.equal(c.pfAttachmentAuthorLabel(author),author);
for(const explicit of [{user_name:'unmatched-recorded-creator',email:'unmatched@example.test'},{username:'unmatched-recorded-creator'},{email:'unmatched@example.test'}])assert.equal(c.pfAttachmentAuthorLabel({...explicit,display_name:'wbdevelopment',zc_display_value:'wbdevelopment',display_value:'wbdevelopment',name:'wbdevelopment'}),'wbdevelopment','display aliases never establish another person when explicit creator identity exists');
assert.equal(c.pfAttachmentAuthorLabel({user_name:' ',username:false,email:null,zc_display_value:'wbdevelopment'}),'Creator Full Name','label-only native shape remains supported when explicit fields are blank/malformed');
for(const author of [null,{},[],['wbdevelopment'],17,true,{ID:'17'}])assert.equal(c.pfAttachmentAuthorLabel(author),'');
const displays=[[{display_name:'Full Native Name',zc_display_value:'Second'},'Full Native Name'],[{zc_display_value:'Native Label'},'Native Label'],[{display_value:'Legacy Label'},'Legacy Label'],[{name:'Name value'},'Name value'],[{Name:'Legacy Name'},'Legacy Name'],[{username:'unknown-username'},'unknown-username'],[{first_name:'First',last_name:'Last'},'First Last'],[{email:'unknown@example.test'},'unknown@example.test']];
for(const [author,label]of displays)assert.equal(c.pfAttachmentAuthorLabel(author),label);
c.S.users.push(null,[],false);assert.equal(c.pfAttachmentAuthorLabel('wbdevelopment'),'Creator Full Name','malformed extra roster rows cannot break attachment rendering');c.S.users.splice(1);
c.S.users.push({...c.S.users[0],id:'18',fullName:'Other Person'});assert.equal(c.pfAttachmentAuthorLabel('wbdevelopment'),'wbdevelopment','ambiguous identity never chooses the wrong full name');c.S.users.pop();
c.S.users.push({id:'18',label:'other-user',email:'other-user',userName:'other-user',fullName:'Other Person'});
assert.equal(c.pfAttachmentAuthorLabel({user_name:'other-user',display_name:'wbdevelopment'}),'Other Person','explicit identity wins over another person display alias');
assert.equal(c.pfAttachmentAuthorLabel({user_name:'wbdevelopment',email:'other-user',display_name:'Genuine Display'}),'Genuine Display','conflicting recorded identities retain genuine display');c.S.users.pop();

// The actual full-access caller/consumer retains the additive roster keys. A late roster reply
// patches only author text from the saved creator, without repainting cached rows or a draft.
{
 const savedUsers=c.S.users,savedActor=c.S.currentUser,savedInvoke=c.sdkInvoke,savedQuery=c.document.querySelectorAll;
 Object.assign(c,{HARDCODED_PF_PERMS:{},syncApprovalAccessVisibility(){},syncSubmitLegalButton(){},syncAiReviewRailBtn(){}});
 for(const name of ['accessTruthy','parseAccessFnResponse','hardcodedPfPermsForCurrentUser','applyPermsFromFlags','loadUserAccess'])vm.runInContext(fn(name),c);
 c.S.users=[];c.S.currentUser='different-viewer@example.test';c.resetPfAttachmentCounts();await c.loadPfAttachments(PF,true);c.renderPfAttachments();
 const cached=c.S.attachmentsByPf[PF][0],authorNode=el('cachedAuthor');authorNode.attrs={'data-pf-attachment-author':RID,'data-pf-attachment-parent':PF};authorNode.textContent='Old native display';
 const wrongParent=el('wrongParentAuthor');wrongParent.attrs={'data-pf-attachment-author':RID,'data-pf-attachment-parent':OTHER};wrongParent.textContent='Retained other parent';
 c.document.querySelectorAll=selector=>selector==='[data-pf-attachment-author][data-pf-attachment-parent]'?[authorNode,wrongParent]:[];
 const roster=[{id:'17',label:'wbdevelopment',email:'wbdevelopment',userName:'wbdevelopment',approverEmail:'creator@example.test',fullName:'Creator <Full> & Name'}];
 let deliver;const accessReply=new Promise(resolve=>deliver=resolve),accessConfigs=[];c.sdkInvoke=config=>{accessConfigs.push(config);return accessReply;};
 const panelHtml=el('proformaAttachmentPanel').innerHTML;c.S.ed={id:OTHER,model:{draft:'preserve this editor'}};const loading=c.loadUserAccess();assert.equal(authorNode.textContent,'Old native display');
 deliver({code:3000,details:{output:JSON.stringify({found:true,hasRow:true,pfEditAll:false,pfEditOwned:false,myId:'18',users:roster})}});await loading;
 assert.deepEqual(JSON.parse(JSON.stringify(c.S.users)),roster);assert.equal(cached.addedUser,'Old native display','cached normalization does not need to be rebuilt');assert.equal(authorNode.textContent,'Creator <Full> & Name');assert.equal(wrongParent.textContent,'Retained other parent');assert.equal(el('proformaAttachmentPanel').innerHTML,panelHtml);assert.equal(c.S.ed.model.draft,'preserve this editor');assert.equal(accessConfigs.length,1);assert.equal(accessConfigs[0].http_method,'GET');
 c.renderPfAttachments();assert.match(el('proformaAttachmentPanel').innerHTML,/Added by <b[^>]*>Creator &lt;Full&gt; &amp; Name<\/b>/);
 // Report-field visibility is required: a missing creator cannot be reconstructed from a roster or current viewer.
 const noCreator={...row};delete noCreator.Added_User;c.S.attachmentsByPf[PF]=[c.normalizePfAttachment(noCreator,0)];c.syncPfAttachmentAuthorLabels();assert.equal(authorNode.textContent,'—');
 c.S.attachmentsByPf[PF]=[cached];c.S.currentUser='changed-actor@example.test';authorNode.textContent='Before stale roster patch';c.syncPfAttachmentAuthorLabels();assert.equal(authorNode.textContent,'Before stale roster patch','old actor cache cannot update provenance');
 c.S.currentUser=savedActor;c.S.users=savedUsers;c.sdkInvoke=savedInvoke;c.document.querySelectorAll=savedQuery;c.resetPfAttachmentCounts();c.S.ed=null;native.length=0;
}

// Actual mounted renderer keeps Legal treatment and named controls; only editable records get writes.
c.S.attachmentsByPf[PF]=[file];c.renderPfAttachments();let html=el('proformaAttachmentPanel').innerHTML;
assert.match(html,/data-pf-attachment-drop/);assert.match(html,/Choose Files/);assert.match(html,/50 MB max/);assert.match(html,/Added by <b[^>]*>Creator Full Name<\/b>/);assert.match(html,/10\/03\/2026/);assert.match(html,/&lt;file&gt;\.pdf/);assert.match(html,/&lt;Legal PF&gt;/);
assert.doesNotMatch(html,/Other Editor|att-mail|toggleEmailAttach|digestValue|private\/exact|Click a file to preview|opens Creator/);
for(const key of ['preview','download','delete'])assert.match(html,new RegExp(`aria-label='${key[0].toUpperCase()+key.slice(1)} &lt;file&gt;\\.pdf'`));
allowed=false;c.renderPfAttachments();html=el('proformaAttachmentPanel').innerHTML;
assert.doesNotMatch(html,/data-pf-attachment-drop|data-pf-attachment-delete/);assert.match(html,/data-pf-attachment-preview|data-pf-attachment-download/);
allowed=true;c.S.attachmentBusy=true;c.renderPfAttachments();html=el('proformaAttachmentPanel').innerHTML;
assert.match(html,/data-pf-attachment-add disabled/);assert.match(html,/data-pf-attachment-delete='0' disabled/);c.S.attachmentBusy=false;
c.S.users[0].fullName='<img src=x onerror=boom()>';c.renderPfAttachments();assert.match(el('proformaAttachmentPanel').innerHTML,/Added by <b[^>]*>&lt;img src=x onerror=boom\(\)&gt;<\/b>/);c.S.users[0].fullName='Creator Full Name';

// Execute the real click/drop/picker listeners from the widget, not duplicated handler logic.
const start=source.indexOf('document.getElementById("proformaAttachmentPanel").addEventListener("click"'),end=source.indexOf('document.getElementById("proformaAttachmentPreviewClose")',start);
assert.ok(start>=0&&end>start);vm.runInContext(source.slice(start,end),c);
const control=kind=>({getAttribute:()=> '0'}),event=kind=>({target:{closest:selector=>selector===`[data-pf-attachment-${kind}]`?control(kind):null}});
for(const kind of ['preview','preview','download'])el('proformaAttachmentPanel').listeners.click(event(kind));
assert.deepEqual(routes.map(route=>route.kind),['preview','preview','download']);assert.ok(routes.every(route=>route.file===file),'file name/eye/download each route the exact original file model');
const drop=el('drop'),files=[new File(['fixture'],'one.pdf',{type:'application/pdf'})];let prevented=0;
const dropEvent={target:{closest:selector=>selector==='[data-pf-attachment-drop]'?drop:null},preventDefault(){prevented++;},dataTransfer:{files}};
el('proformaAttachmentPanel').listeners.dragover(dropEvent);assert.ok(classes.has('dropdragover'));
allowed=false;el('proformaAttachmentPanel').listeners.drop(dropEvent);await Promise.resolve();assert.equal(native.length,0);allowed=true;
el('proformaAttachmentPanel').listeners.click(event('add'));assert.equal(el('proformaAttachmentInput').clicks,1,'Choose Files/hint opens the existing picker once');
el('proformaAttachmentPanel').listeners.drop(dropEvent);await drain();assert.equal(native.filter(call=>call.kind==='create').length,1);
el('proformaAttachmentPanel').listeners.drop(dropEvent);
el('proformaAttachmentInput').files=files;el('proformaAttachmentInput').value='selected';el('proformaAttachmentInput').listeners.change.call(el('proformaAttachmentInput'));
el('proformaAttachmentPanel').listeners.click(event('add'));await Promise.resolve();
assert.equal(el('proformaAttachmentInput').value,'');assert.equal(el('proformaAttachmentInput').clicks,1);assert.equal(native.filter(call=>call.kind==='create').length,1,'busy second drop/picker/click never duplicate native create');
resolveCreate({code:3000,result:JSON.stringify({ok:true,attachmentId:NEWID})});await drain();
assert.equal(native.filter(call=>call.kind==='create').length,1);assert.equal(native.filter(call=>call.kind==='upload').length,1);
const create=native.find(call=>call.kind==='create'),upload=native.find(call=>call.kind==='upload');
assert.equal(create.config.payload.proformaId,PF);assert.equal(upload.config.id,NEWID);assert.equal(upload.config.file,files[0]);assert.equal(upload.config.field_name,'File_field1');assert.equal(c.S.attachmentBusy,false);
assert.equal(c.PFTransport.close(c.PFTransport.workflow()),true,'dismiss the actual retained terminal result before another file action');
assert.ok(native.some(call=>call.kind==='read'&&call.criteria===`(Pro_Forma == ${PF})`),'native reload keeps the exact existing parent criteria alongside child-ID verification reads');
assert.equal(prevented,3,'active dragover and drop handlers prevent navigation; duplicate actions stop at the actual readiness barrier');assert.equal(JSON.stringify(row),original);
const writes=()=>native.filter(call=>['create','upload','delete'].includes(call.kind)).length;
const beforeWrites=writes();allowed=false;c.uploadPfAttachments(files);assert.equal(writes(),beforeWrites);allowed=true;
c.uploadPfAttachments([{name:'oversize.pdf',size:50*1024*1024+1}]);assert.equal(writes(),beforeWrites,'existing 50 MB rejection stays before writes');
el('proformaAttachmentPanel').listeners.click(event('delete'));await drain();assert.equal(writes(),beforeWrites,'cancel preserves the existing file');
confirmDelete=true;el('proformaAttachmentPanel').listeners.click(event('delete'));await drain();
const deletion=native.filter(call=>call.kind==='delete');assert.equal(deletion.length,1);assert.equal(deletion[0].config.payload.proformaId,PF);assert.equal(deletion[0].config.payload.attachmentId,RID);
assert.match(source,/\.pf-attachment-drop\{border:1\.5px dashed #b9c8dc/);assert.match(source,/\.pf-attachment-action\{width:34px;height:34px/);
assert.match(source,/\.pf-attachment-name:focus-visible/);

// The actual list renderer mounts the paperclip alongside comments before optional reads settle.
const mounted=[];el('listBody').querySelectorAll=selector=>selector==='button[data-act]'?mounted:[];
const mountedBadge=el('mountedBadge'),listButton=el('listAttachmentButton');listButton.attrs={'data-act':'attachments','data-actid':PF};listButton.querySelector=()=>mountedBadge;mounted.push(listButton);
c.document.querySelectorAll=selector=>selector==='.pf-row-attachments[data-actid]'?mounted:[];
Object.assign(c,{boolValue:Boolean,hasVal:v=>v!=null&&v!=='',num:v=>Number(v)||0,parseDateAny:()=>null,compareListValues:()=>0,
  proformaApprovalState:()=>({complete:false,started:false}),migrationEditAccess:()=>false,proformaEditDisabledReason:()=>'',protectedInputLock:()=>false,canEditOwner:()=>false,canEditProbability:()=>false,
  perms:()=>({}),proformaSendApprovalsGate:()=>({can:false}),loiCompleteness:()=>({ready:false}),approvalText:v=>String(v||''),canSubmitPfToLegal:()=>false,canViewProformaApprovals:()=>false,canDuplicatePf:()=>false,canSendProformaApprovalsFor:()=>false,
  pfListCommentAction:()=>'<button class="test-comment">Comments</button>',proformaCreatedLabel:()=>'',proformaApprovalLockReason:()=>'',ownerPillsHtml:()=>'',probChipClass:()=>'',proformaLifecycleStatusMarkup:()=>'',fmtN:String,fmtPct:String,ymShort:()=>'',
  loadPfCommentSummaries(){},updateListSortHeaders(){},closeProFormaMenus(){},userOwnsPf:rec=>rec.Owner==='creator'});
c.S.fTerritories=[];c.S.fProbs=[];c.S.listSort={};c.S.loiSubmitted={};c.S.loiSubmitting={};c.S.view='vList';c.S.ed={id:OTHER,dirty:true,model:{draft:'preserved'}};
vm.runInContext(fn('renderList'),c);
let releaseBackground;const heldBackground=new Promise(resolve=>releaseBackground=resolve);
readHook=(config,snapshot)=>config.criteria?{code:3000,data:snapshot}:heldBackground.then(()=>({code:3000,data:snapshot}));
reportRows=[row,{...row,ID:NEWID},{...row,ID:'90071992547409994',Pro_Forma:{},File_field1:row.File_field1},{...row,ID:'90071992547409995',File_field1:{}}];
c.resetPfAttachmentCounts();const beforeBackground=native.length;c.renderList();
assert.match(el('listBody').innerHTML,/test-comment[\s\S]*pf-row-attachments/);assert.match(el('listBody').innerHTML,/rec-comment-count">…/);assert.equal(c.S.view,'vList');assert.equal(c.S.ed.model.draft,'preserved');
assert.match(el('listBody').innerHTML,/<span class="pf-row-discussion-actions"><button class="test-comment">Comments<\/button>[\s\S]*pf-row-attachments[\s\S]*<\/button><\/span>/);
assert.match(source,/\.pf-row-discussion-actions\{[^}]*gap:7px/);assert.match(source,/\.pf-row-discussion-actions>\.btn\.rowact\{margin:0\}/);assert.match(fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8'),/\.ptable \.acts\{gap:7px\}/,'the pair uses Budget’s final action gap');
const listHTML=el('listBody').innerHTML,scroll=el('listBody').scrollTop,search=el('listSearch').value;
await drain();c.loadPfAttachmentSummaries();assert.equal(native.slice(beforeBackground).filter(call=>call.kind==='read').length,1,'same-generation badge loading has one global page, no per-PF reads');
releaseBackground();await drain();readHook=null;
assert.equal(mountedBadge.textContent,'2');assert.equal(c.pfAttachmentBadge(OTHER).text,'0','zero is known only after the complete counted reference snapshot');
assert.equal(el('listBody').innerHTML,listHTML,'background badges patch mounted elements without rebuilding rows');assert.equal(el('listBody').scrollTop,scroll);assert.equal(el('listSearch').value,search);assert.equal(c.S.ed.model.draft,'preserved');
assert.equal(native.slice(beforeBackground).filter(call=>call.kind==='count').length,1,'global reference badges do not repeat the count; scoped mutation verification still does');assert.equal(native.slice(beforeBackground).filter(call=>call.kind==='read').length,1);

// Real list click opens in place, with exact selected-record permissions and focus/inert restoration.
c.S.proformas[0].Owner='creator';c.S.proformas[1].Owner='another';c.perms=()=>({editOwned:true});vm.runInContext(fn('canEditPf'),c);
listButton.listeners.click({stopPropagation(){}});assert.equal(c.S.attachmentModal.id,PF);assert.equal(c.S.attachmentPfId,PF);assert.equal(c.S.ed.id,OTHER);assert.equal(c.S.view,'vList');assert.equal(el('listView').inert,true);assert.equal(el('proformaAttachmentModal').hidden,false);assert.equal(c.document.body.style.overflow,'hidden');
assert.match(el('proformaAttachmentModalPanel').innerHTML,/2 files|Choose Files/);assert.equal(c.document.activeElement,el('proformaAttachmentModalClose'));
el('proformaAttachmentModal').querySelector=()=>el('proformaAttachmentModalClose');c.document.activeElement=el('backgroundInput');c.document.focusin({target:el('backgroundInput')});assert.equal(c.document.activeElement,el('proformaAttachmentModalClose'),'forced programmatic background focus returns to the mounted dialog');
el('proformaAttachmentModal').querySelectorAll=()=>[el('proformaAttachmentModalClose'),el('lastModalButton')];c.document.activeElement=el('lastModalButton');let trapped=0;
c.pfAttachmentModalKeydown({key:'Tab',preventDefault(){trapped++;}});assert.equal(c.document.activeElement,el('proformaAttachmentModalClose'));assert.equal(trapped,1);
c.pfAttachmentModalKeydown({key:'Escape',preventDefault(){},stopImmediatePropagation(){}});assert.equal(el('proformaAttachmentModal').hidden,true);assert.equal(el('listView').inert,false);assert.equal(c.document.activeElement,listButton);assert.equal(c.document.body.style.overflow,'auto');assert.deepEqual(restoredScroll.at(-1),[7,533]);
c.openPfAttachmentModal(OTHER,listButton);assert.doesNotMatch(el('proformaAttachmentModalPanel').innerHTML,/data-pf-attachment-add|data-pf-attachment-delete/,'selected readonly PF stays readonly even while another owned PF is loaded');
const readonlyWrites=writes();el('proformaAttachmentModalPanel').listeners.drop(dropEvent);el('proformaAttachmentModalPanel').listeners.click(event('delete'));assert.equal(writes(),readonlyWrites);c.closePfAttachmentModal();

// Late record loads, session changes and stale file-picker replies never paint or write a newer dialog.
let releaseScoped;const heldScoped=new Promise(resolve=>releaseScoped=resolve);delete c.S.attachmentsByPf[PF];
readHook=(config,snapshot)=>config.criteria?.includes(PF)?heldScoped.then(()=>({code:3000,data:snapshot})):{code:3000,data:snapshot};
c.openPfAttachmentModal(PF,listButton);await drain();c.closePfAttachmentModal();c.openPfAttachmentModal(OTHER,listButton);const otherHTML=el('proformaAttachmentModalPanel').innerHTML;releaseScoped();await drain();readHook=null;
assert.equal(c.S.attachmentModal.id,OTHER);assert.equal(el('proformaAttachmentModalPanel').innerHTML,otherHTML);c.closePfAttachmentModal();
c.openPfAttachmentModal(PF,listButton);el('proformaAttachmentModalPanel').listeners.click(event('add'));c.closePfAttachmentModal();c.openPfAttachmentModal(OTHER,listButton);
el('proformaAttachmentModalInput').files=files;const stalePickerWrites=writes();el('proformaAttachmentModalInput').listeners.change.call(el('proformaAttachmentModalInput'));assert.equal(writes(),stalePickerWrites,'old chooser cannot upload into replacement dialog');c.closePfAttachmentModal();

// A modal upload holds all close/duplicate paths and uses its captured parent, not workspace/editor IDs.
let finishModalCreate;const nativeInvoke=c.sdkInvoke;c.sdkInvoke=config=>{if(config.api_name!=='Create_Proforma_Attachment_Record')return nativeInvoke(config);native.push({kind:'create',config});return new Promise(resolve=>finishModalCreate=resolve);};
c.S.attachmentPfId=OTHER;c.openPfAttachmentModal(PF,listButton);el('proformaAttachmentModalPanel').listeners.drop(dropEvent);await drain();
const modalCreates=native.filter(call=>call.kind==='create').length;assert.equal(c.S.attachmentBusy,true);assert.equal(c.closePfAttachmentModal(),false);assert.equal(c.openPfAttachmentModal(OTHER,listButton),false);assert.equal(el('proformaAttachmentModalClose').disabled,true);
el('proformaAttachmentModalPanel').listeners.drop(dropEvent);c.pfAttachmentModalKeydown({key:'Escape',preventDefault(){},stopImmediatePropagation(){}});assert.equal(c.S.attachmentModal.id,PF);assert.equal(native.filter(call=>call.kind==='create').length,modalCreates);
finishModalCreate({code:3000,result:JSON.stringify({ok:true,attachmentId:'90071992547409996'})});await drain();c.sdkInvoke=nativeInvoke;
assert.equal(native.findLast(call=>call.kind==='create').config.payload.proformaId,PF);assert.equal(c.S.attachmentBusy,false);assert.equal(c.S.attachmentCounts.counts[PF],3);assert.equal(mountedBadge.textContent,'3');assert.equal(c.S.ed.model.draft,'preserved');assert.equal(c.S.attachmentPfId,OTHER);
assert.equal(c.PFTransport.close(c.PFTransport.workflow()),true);
el('proformaAttachmentModalPanel').listeners.click(event('preview'));assert.equal(routes.at(-1).file.proformaId,PF);assert.equal(routes.at(-1).file.filePath,'/private/exact.pdf');
confirmDelete=true;await el('proformaAttachmentModalPanel').listeners.click(event('delete'));await drain();assert.equal(native.findLast(call=>call.kind==='delete').config.payload.proformaId,PF);assert.equal(mountedBadge.textContent,'2');c.closePfAttachmentModal();

// Native counted reads reject all incomplete/denied/schema failures; no capped or phantom-zero summary.
for(const setup of [
  ()=>{countHook=()=>({code:2899,message:'Denied'});},
  ()=>{countHook=()=>({code:3000,result:{records_count:'1',status:' failure '}});},
  ()=>{countHook=()=>({code:3000,result:{records_count:'3'}});reportRows=[row];},
  ()=>{reportRows=[row,{...row}];},
  ()=>{reportRows=[{...row,ID:17}];},
  ()=>{reportRows=[{...row,Pro_Forma:{label:'not an ID'}}];},
  ()=>{reportRows=[{...row,File_field1:undefined}];delete reportRows[0].File_field1;},
  ()=>{reportRows=[{...row,File_field1:{unknown:'missing file'}}];},
  ()=>{readHook=()=>({code:3000,status:'failed',data:[row]});},
  ()=>{readHook=()=>({code:3000,data:[row],result:{code:2898}});},
  ()=>{readHook=()=>({code:3000,data:[row],result:{status:'failure'}});},
  ()=>{readHook=()=>({code:3000,data:[row],result:[{code:2898,error:'Denied'}]});},
  ()=>{countHook=()=>({code:3000,result:{records_count:'1',result:{code:2898}}});},
]){
  reportRows=[row];countHook=null;readHook=null;setup();c.resetPfAttachmentCounts();await c.loadPfAttachmentSummaries();assert.equal(c.S.attachmentCounts.status,'error');assert.equal(c.pfAttachmentBadge(PF).text,'?');
}
countHook=null;readHook=null;reportRows=[];c.resetPfAttachmentCounts();await c.loadPfAttachmentSummaries();assert.equal(c.pfAttachmentBadge(PF).text,'0');

// Retain the old safe readonly recovery: unsupported/empty parent criteria use a COMPLETE global read.
for(const condition of ['unsupported','empty']){
  reportRows=[row];c.resetPfAttachmentCounts();const beforeFallback=native.length;
  countHook=config=>config.criteria?condition==='unsupported'?{code:3330,message:'Unsupported criteria'}:{code:3000,result:{records_count:'0'}}:{code:3000,result:{records_count:'1'}};
  const files=await c.loadPfAttachments(PF,true);assert.equal(files.length,1);assert.equal(files[0].recordId,RID);assert.equal(files[0].proformaId,PF);
  assert.equal(native.slice(beforeFallback).filter(call=>call.kind==='read'&&!call.config.criteria).length,1,'fallback is one complete native report read with exact parent filter');
}
for(const condition of ['denied','incomplete']){
  reportRows=[row];c.resetPfAttachmentCounts();const beforeDenied=native.length;
  countHook=config=>config.criteria?condition==='denied'?{code:2898,message:'Denied'}:{code:3000,result:{records_count:'2'}}:{code:3000,result:{records_count:'1'}};
  await assert.rejects(c.loadPfAttachments(PF,true));assert.equal(native.slice(beforeDenied).filter(call=>['count','read'].includes(call.kind)&&!call.config.criteria).length,0,'denied/incomplete scope cannot recover by another broader read or pretend zero');
}
countHook=null;reportRows=[row];c.resetPfAttachmentCounts();let releaseOldBatch,firstGlobal=true;
readHook=(config,snapshot)=>{if(!config.criteria&&firstGlobal){firstGlobal=false;return new Promise(resolve=>releaseOldBatch=()=>resolve({code:3000,data:snapshot}));}return {code:3000,data:snapshot};};
const oldBatch=c.loadPfAttachmentSummaries();await drain();reportRows=[{...row,Pro_Forma:{ID:OTHER}}];
assert.equal((await c.loadPfAttachments(PF,true)).length,0,'fresh exact-parent fallback verifies no files');releaseOldBatch();await oldBatch;
assert.equal(c.pfAttachments(PF).length,0);assert.equal(c.pfAttachmentBadge(PF).text,'0','a later global batch cannot overwrite a newer authoritative scoped result with its old count');readHook=null;
reportRows=Array.from({length:5201},(_,i)=>({...row,ID:String(100000+i)}));c.resetPfAttachmentCounts();const beforeLarge=native.length;await c.loadPfAttachmentSummaries();assert.equal(c.pfAttachmentBadge(PF).text,'5201');assert.equal(native.slice(beforeLarge).filter(call=>call.kind==='read').length,27,'counted cursor fixture completes all 5201 rows in 200-row native pages');

// A second startup is independent; older responses cannot seed its cache or badge snapshot.
reportRows=[row];let finishOld;readHook=(config,snapshot)=>new Promise(resolve=>finishOld=()=>resolve({code:3000,data:snapshot}));c.resetPfAttachmentCounts();const old=c.loadPfAttachmentSummaries();await drain();
reportRows=[row,{...row,ID:NEWID}];readHook=null;c.resetPfAttachmentCounts();await c.loadPfAttachmentSummaries();finishOld();await old;assert.equal(c.pfAttachmentBadge(PF).text,'2');
let finishActor;readHook=(config,snapshot)=>new Promise(resolve=>finishActor=()=>resolve({code:3000,data:snapshot}));c.resetPfAttachmentCounts();const actorRead=c.loadPfAttachmentSummaries();await drain();c.S.currentUser='another-actor';finishActor();await actorRead;assert.notEqual(c.pfAttachmentBadge(PF).text,'0');assert.notEqual(c.S.attachmentCounts.status,'loaded');readHook=null;

// Cached file rows cannot cross a changed actor/environment, and actual tab routing safely closes.
c.S.currentUser='creator';c.S.env={name:'PRODUCTION',fragment:''};c.resetPfAttachmentCounts();await c.loadPfAttachmentSummaries();assert.equal(c.S.attachmentsByPf[PF].length,2);
let finishCacheRead;readHook=(config,snapshot)=>new Promise(resolve=>finishCacheRead=()=>resolve({code:3000,data:snapshot}));c.S.env={name:'DEVELOPMENT',fragment:'development'};
c.openPfAttachmentModal(PF,listButton);assert.match(el('proformaAttachmentModalPanel').innerHTML,/Loading attachments/);assert.doesNotMatch(el('proformaAttachmentModalPanel').innerHTML,/Added by/,'old environment cache is invalidated before any file render');await drain();
c.S.currentUser='new-actor';c.renderPfAttachments(c.pfAttachmentActionContext(true));assert.equal(c.S.attachmentModal,null);assert.equal(el('proformaAttachmentModal').hidden,true);finishCacheRead();await drain();readHook=null;assert.equal(c.S.attachmentsByPf[PF],undefined);
c.S.currentUser='creator';c.S.env={name:'PRODUCTION',fragment:''};c.resetPfAttachmentCounts();await c.loadPfAttachmentSummaries();
Object.assign(c,{syncRecSwitch(){},syncAiReviewRailBtn(){}});vm.runInContext(fn('showView'),c);c.S.view='vList';c.openPfAttachmentModal(PF,listButton);
c.S.attachmentBusy=true;c.showView('vEdit');assert.equal(c.S.view,'vList');assert.ok(c.S.attachmentModal,'busy file dialog blocks a conflicting tab change');c.S.attachmentBusy=false;c.showView('vDash');assert.equal(c.S.attachmentModal,null);assert.equal(c.S.view,'vDash');assert.equal(c.S.ed.model.draft,'preserved');assert.equal(el('listBody').scrollTop,scroll);
c.openPfAttachmentModal(PF,listButton);const savedRecord=c.S.proformas.shift(),beforeMissing=writes();el('proformaAttachmentModalPanel').listeners.click(event('add'));assert.equal(c.S.attachmentModal,null);assert.equal(writes(),beforeMissing,'removed source record expires the dialog before file actions');c.S.proformas.unshift(savedRecord);
// A changed actor after the existing create returns cannot start FILE under that new session.
let finishChangedCreate;c.sdkInvoke=config=>{native.push({kind:'create',config});return new Promise(resolve=>finishChangedCreate=resolve);};
c.S.view='vList';c.openPfAttachmentModal(PF,listButton);const beforeChangedFile=native.filter(call=>call.kind==='upload').length;
el('proformaAttachmentModalPanel').listeners.drop(dropEvent);await drain();c.S.currentUser='changed-during-create';
finishChangedCreate({code:3000,result:JSON.stringify({ok:true,attachmentId:'90071992547409997'})});await drain();
assert.equal(native.filter(call=>call.kind==='upload').length,beforeChangedFile,'a native create acknowledgement under the old actor cannot issue FILE in a new session');assert.equal(c.S.attachmentBusy,false);assert.equal(c.S.attachmentModal,null);c.sdkInvoke=nativeInvoke;
assert.match(source,/\.pf-attachment-modal-dialog\{[^}]*width:min\(940px,100%\)/);assert.match(source,/\.pf-attachment-modal-close\{[^}]*width:32px;height:32px[^}]*background:#f8fafc[^}]*border-radius:9px;color:#94a3b8/);assert.match(source,/\.pf-attachment-modal-close:hover\{background:#eef2f8/);
assert.match(source,/role="dialog" aria-modal="true" aria-labelledby="proformaAttachmentModalTitle"/);assert.match(source,/\.pf-attachment-modal-close\{[^}]*padding:0;display:grid;place-items:center/);
console.log('Pro Forma actual attachment presentation: native access roster/cached creator text patches, separated list controls, escaped named controls, preserved file/path/parent/date, read-only/busy routes and one-call drop/picker upload passed.');
