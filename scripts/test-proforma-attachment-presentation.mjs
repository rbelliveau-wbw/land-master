import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8').replaceAll('\r','');
function fn(name){
  const start=source.indexOf('function '+name+'('),line=source.indexOf('\n',start);
  assert.ok(start>=0,name);
  return source.slice(start,source.slice(start,line).trim().endsWith('}')?line:source.indexOf('\n}',start)+2);
}
const PF='90071992547409931',RID='90071992547409992';
const elements=new Map(),native=[],routes=[],classes=new Set();
function el(id){
  if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',listeners:{},files:[],value:'',
    classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)},contains:()=>false,
    addEventListener(type,callback){this.listeners[type]=callback;},click(){this.clicks=(this.clicks||0)+1;}});
  return elements.get(id);
}
let allowed=true,resolveCreate,confirmDelete=false;
const pending=new Promise(resolve=>{resolveCreate=resolve;});
const row={ID:RID,Pro_Forma:{ID:PF},File_field1:{filename:'<file>.pdf',filepath:'/private/exact.pdf',url:'https://example.test/download?filepath=%2Fprivate%2Fexact.pdf&digestValue=private'},Date_field1:'2026-10-03 12:34:56',Added_User:{user_name:'WBDEVELOPMENT',display_name:'Old native display'},Modified_User:'Other Editor'};
const c=vm.createContext({
  S:{liveSDK:true,attachmentPfId:PF,attachmentBusy:false,attachmentsByPf:{},attachmentsLoading:{},users:[{id:'17',label:'wbdevelopment',email:'wbdevelopment',userName:'wbdevelopment',approverEmail:'creator@example.test',fullName:'Creator Full Name'}],proformas:[{ID:PF,Name:'<Legal PF>'}]},
  CFG:{reports:{attachments:'All_Contract_Versions'},attachmentProformaField:'Pro_Forma',attachmentFileField:'File_field1',customApis:{createProformaAttachmentRecord:'Create_Proforma_Attachment_Record',deleteProformaAttachment:'Delete_Proforma_Attachment'}},
  MONTHS_S:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],document:{getElementById:el},
  canEditPf:()=>allowed,candidates:name=>[name],toast(){},auditLog(){},errMeta:err=>({message:err.message}),
  sdkAdd(){assert.fail('Normal upload must use its existing Custom API without direct add');},
  sdkDelete(){assert.fail('Normal delete must use its existing Custom API without direct delete');},
  sdkInvoke(config){native.push({kind:config.api_name==='Create_Proforma_Attachment_Record'?'create':'delete',config});return config.api_name==='Create_Proforma_Attachment_Record'?pending:Promise.resolve({code:3000,result:JSON.stringify({ok:true,attachmentId:RID})});},
  sdkGetAll:async(report,criteria)=>{native.push({kind:'read',report,criteria});return [row];},
  previewPfAttachment:file=>routes.push({kind:'preview',file}),downloadPfAttachment:file=>routes.push({kind:'download',file}),uiConfirm:async()=>confirmDelete,
  ZOHO:{CREATOR:{API:{uploadFile:async config=>{native.push({kind:'upload',config});return{code:3000};}}}},
});
for(const name of ['esc','lookupId','responseBad','dateToInputValue','dateToCreatorValue','pfAttachmentExt','pfAttachmentIcon','pfAttachmentDecode','pfAttachmentQuery','pfAttachmentName','pfAttachmentNormalizeFile','pfAttachmentRecordPfId','pfAttachmentAuthorLabel','pfAttachmentDateLabel','pfAttachmentActionIcon','normalizePfAttachment','pfAttachmentRec','pfAttachments','pfAttachmentStatusHtml','renderPfAttachments','parsePfAttachmentApi','invokePfAttachmentApi','createdRecordId','createPfAttachmentRecord','deletePfAttachmentRecord','pfSdkUploadFile','uploadPfAttachments','loadPfAttachments'])vm.runInContext(fn(name),c);

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

// Actual mounted renderer keeps Legal treatment and named controls; only editable records get writes.
c.S.attachmentsByPf[PF]=[file];c.renderPfAttachments();let html=el('proformaAttachmentPanel').innerHTML;
assert.match(html,/data-pf-attachment-drop/);assert.match(html,/Choose Files/);assert.match(html,/50 MB max/);assert.match(html,/Added by <b>Creator Full Name<\/b>/);assert.match(html,/10\/03\/2026/);assert.match(html,/&lt;file&gt;\.pdf/);assert.match(html,/&lt;Legal PF&gt;/);
assert.doesNotMatch(html,/Other Editor|att-mail|toggleEmailAttach|digestValue|private\/exact|Click a file to preview|opens Creator/);
for(const key of ['preview','download','delete'])assert.match(html,new RegExp(`aria-label='${key[0].toUpperCase()+key.slice(1)} &lt;file&gt;\\.pdf'`));
allowed=false;c.renderPfAttachments();html=el('proformaAttachmentPanel').innerHTML;
assert.doesNotMatch(html,/data-pf-attachment-drop|data-pf-attachment-delete/);assert.match(html,/data-pf-attachment-preview|data-pf-attachment-download/);
allowed=true;c.S.attachmentBusy=true;c.renderPfAttachments();html=el('proformaAttachmentPanel').innerHTML;
assert.match(html,/data-pf-attachment-add disabled/);assert.match(html,/data-pf-attachment-delete='0' disabled/);c.S.attachmentBusy=false;
c.S.users[0].fullName='<img src=x onerror=boom()>';c.renderPfAttachments();assert.match(el('proformaAttachmentPanel').innerHTML,/Added by <b>&lt;img src=x onerror=boom\(\)&gt;<\/b>/);c.S.users[0].fullName='Creator Full Name';

// Execute the real click/drop/picker listeners from the widget, not duplicated handler logic.
const start=source.indexOf('document.getElementById("proformaAttachmentPanel").addEventListener("click"'),end=source.indexOf('document.getElementById("proformaAttachmentPreviewClose")',start);
assert.ok(start>=0&&end>start);vm.runInContext(source.slice(start,end),c);
const control=kind=>({getAttribute:()=> '0'}),event=kind=>({target:{closest:selector=>selector===`[data-pf-attachment-${kind}]`?control(kind):null}});
for(const kind of ['preview','preview','download'])el('proformaAttachmentPanel').listeners.click(event(kind));
assert.deepEqual(routes.map(route=>route.kind),['preview','preview','download']);assert.ok(routes.every(route=>route.file===file),'file name/eye/download each route the exact original file model');
const drop=el('drop'),files=[{name:'one.pdf',size:123,type:'application/pdf'}];let prevented=0;
const dropEvent={target:{closest:selector=>selector==='[data-pf-attachment-drop]'?drop:null},preventDefault(){prevented++;},dataTransfer:{files}};
el('proformaAttachmentPanel').listeners.dragover(dropEvent);assert.ok(classes.has('dragover'));
allowed=false;el('proformaAttachmentPanel').listeners.drop(dropEvent);await Promise.resolve();assert.equal(native.length,0);allowed=true;
el('proformaAttachmentPanel').listeners.click(event('add'));assert.equal(el('proformaAttachmentInput').clicks,1,'Choose Files/hint opens the existing picker once');
el('proformaAttachmentPanel').listeners.drop(dropEvent);await Promise.resolve();await Promise.resolve();assert.equal(native.filter(call=>call.kind==='create').length,1);
el('proformaAttachmentPanel').listeners.drop(dropEvent);
el('proformaAttachmentInput').files=files;el('proformaAttachmentInput').value='selected';el('proformaAttachmentInput').listeners.change.call(el('proformaAttachmentInput'));
el('proformaAttachmentPanel').listeners.click(event('add'));await Promise.resolve();
assert.equal(el('proformaAttachmentInput').value,'');assert.equal(el('proformaAttachmentInput').clicks,1);assert.equal(native.filter(call=>call.kind==='create').length,1,'busy second drop/picker/click never duplicate native create');
resolveCreate({code:3000,result:JSON.stringify({ok:true,attachmentId:RID})});for(let i=0;i<30;i++)await Promise.resolve();
assert.equal(native.filter(call=>call.kind==='create').length,1);assert.equal(native.filter(call=>call.kind==='upload').length,1);
const create=native.find(call=>call.kind==='create'),upload=native.find(call=>call.kind==='upload');
assert.equal(create.config.payload.proformaId,PF);assert.equal(upload.config.id,RID);assert.equal(upload.config.file,files[0]);assert.equal(upload.config.fieldName,'File_field1');assert.equal(c.S.attachmentBusy,false);
assert.equal(native.find(call=>call.kind==='read').criteria,`(Pro_Forma == ${PF})`,'native reload keeps the exact existing parent criteria');
assert.ok(prevented>=4);assert.equal(JSON.stringify(row),original);
const writes=()=>native.filter(call=>['create','upload','delete'].includes(call.kind)).length;
const beforeWrites=writes();allowed=false;c.uploadPfAttachments(files);assert.equal(writes(),beforeWrites);allowed=true;
c.uploadPfAttachments([{name:'oversize.pdf',size:50*1024*1024+1}]);assert.equal(writes(),beforeWrites,'existing 50 MB rejection stays before writes');
el('proformaAttachmentPanel').listeners.click(event('delete'));for(let i=0;i<5;i++)await Promise.resolve();assert.equal(writes(),beforeWrites,'cancel preserves the existing file');
confirmDelete=true;el('proformaAttachmentPanel').listeners.click(event('delete'));for(let i=0;i<30;i++)await Promise.resolve();
const deletion=native.filter(call=>call.kind==='delete');assert.equal(deletion.length,1);assert.equal(deletion[0].config.payload.proformaId,PF);assert.equal(deletion[0].config.payload.attachmentId,RID);
assert.match(source,/\.pf-attachment-drop\{border:1\.5px dashed #b9c8dc/);assert.match(source,/\.pf-attachment-action\{width:34px;height:34px/);
assert.match(source,/\.pf-attachment-name:focus-visible/);
console.log('Pro Forma actual attachment presentation: native creator/roster labels, escaped named controls, preserved file/path/parent/date, read-only/busy routes and one-call drop/picker upload passed.');
