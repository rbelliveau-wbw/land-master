import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('widgets/contract-management/src/app/widget.html','utf8');
function fn(name){
  const start=source.indexOf('function '+name+'(');
  assert.ok(start>=0,name);
  const lineEnd=source.indexOf('\n',start);
  return source.slice(start,source.slice(start,lineEnd).trim().endsWith('}')?lineEnd:source.indexOf('\n}',start)+2);
}
const CID='999999999999999991',VID='999999999999999992';
const elements=new Map();
function el(id){
  if(!elements.has(id))elements.set(id,{id,listeners:{},addEventListener(type,callback){this.listeners[type]=callback;},classList:{add(){},remove(){}},click(){this.clicked=true;}});
  return elements.get(id);
}
let mounted='',uploads=[];
const ctx={
  S:{contracts:[{ID:CID,Contract_Name:'Legal Fixture'}],versions:[],users:[],user:'Current Actor'},
  document:{querySelectorAll:()=>[],querySelector:()=>null},$:el,
  mayEdit:()=>true,openModal:html=>{mounted=html;},
  addVersionFiles:(cid,files)=>uploads.push({cid,files}),APR_ICON_CLIP:'',
};
vm.createContext(ctx);
for(const name of ['esc','attr','truthy','asList','lookupId','toInput','fmtDate','findContract','versionsFor','contractFilePaths','fileDisplayName','attachmentExt','attachmentIconSvg','attExtMeta','attachmentCreatorIdentities','attachmentRosterFullName','attachmentRosterAuthor','attachmentAuthorLabel','modalHead','aprMailSwitch','aprAttachmentsTab','attachmentsPanel','wireAttachmentsPanel','attachmentModalRows','showAttachmentsModal','attachCard'])vm.runInContext(fn(name),ctx);

for(const [file,label] of [
 [{filename:'Legal.pdf',filepath:'native_Legal.pdf'},'Legal.pdf'],
 [{filepath:'folder/Legal.pdf'},'Legal.pdf'],
 [{file_path:'folder/Legal.pdf'},'Legal.pdf'],
 [{url:'/download?filepath=Legal.pdf'},'Legal.pdf'],
 [{value:'/download?filepath=Legal.pdf'},'Legal.pdf'],
 [[{filename:'Legal.pdf',filepath:'native_Legal.pdf'}],'Legal.pdf'],
 [{filename:'Legal.pdf'},'Legal.pdf'],
 [{filename:{value:'Legal.pdf'},filepath:'folder/Legal.pdf'},'Legal.pdf'],
 [{filepath:'Legal.pdf',file_path:'Other.pdf'},'Contract file'],
 [[{filepath:'Legal.pdf'},{filepath:'Other.pdf'}],'Contract file'],
 [{filename:{value:'Legal.pdf'}},'Contract file'],
 [{unknown:'Legal.pdf'},'Contract file'],
]){
 const row={ID:VID,Contract1:{ID:CID},File_field1:file,Email_Attachment:true,Added_User:'Alice'},before=JSON.stringify(row);ctx.S.versions=[row];ctx.showAttachmentsModal(CID);
 assert.equal(ctx.fileDisplayName(row),label);
 for(const markup of [mounted,ctx.attachmentsPanel(CID),ctx.aprAttachmentsTab(CID,[row],1),ctx.attachCard(CID)]){assert.ok(markup.includes(ctx.esc(label)));assert.doesNotMatch(markup,/\[object Object\]/);}
 assert.equal(JSON.stringify(row),before,'supported and ambiguous native metadata render without rewriting the cached file field');
}

const cases=[
  ['alice@example.com','alice@example.com'],
  [{display_name:'Alice Display',zc_display_value:'Native Alias',email:'alice@example.com'},'Alice Display'],
  [{display_name:' ',zc_display_value:'Native Alias',display_value:'Legacy Alias'},'Native Alias'],
  [{display_value:'Legacy Alias',name:'Name Alias'},'Legacy Alias'],
  [{name:'Name Alias',Name:'Upper Name'},'Name Alias'],
  [{Name:'Upper Name',user_name:'login-name'},'Upper Name'],
  [{user_name:'login-name',first_name:'Alice',last_name:'Bell'},'login-name'],
  [{first_name:' Alice ',last_name:' Bell ',email:'alice@example.com'},'Alice Bell'],
  [{first_name:11,last_name:false,email:'alice@example.com'},'alice@example.com'],
  [{display_name:{ID:'42'},email:'alice@example.com'},'alice@example.com'],
  [{ID:'42'},'—'],[{},'—'],[[], '—'],[[{display_name:'Array User'}],'—'],[43,'—'],[true,'—'],[null,'—'],[' ','—'],
];
for(const [author,label] of cases){
  const row={ID:VID,Contract1:{ID:CID},File_field1:'/file/Legal.pdf',Date_field1:'10/03/2026',Email_Attachment:true,Added_User:author,Modified_User:'Last Editor',Added_By:'Wrong Custom Author'};
  const before=JSON.stringify(row);
  ctx.S.versions=[row];
  assert.equal(ctx.attachmentAuthorLabel(row),label);
  ctx.showAttachmentsModal(CID);
  const surfaces=[mounted,ctx.attachmentsPanel(CID),ctx.aprAttachmentsTab(CID,[row],1),ctx.attachCard(CID)];
  for(const markup of surfaces){
    assert.ok(markup.includes('Added by <b>'+ctx.esc(label)+'</b>'),`actual file surface shows ${label}`);
    assert.doesNotMatch(markup,/\[object Object\]|Last Editor|Current Actor|Wrong Custom Author/);
    assert.match(markup,/Legal\.pdf/);
  }
  assert.equal(JSON.stringify(row),before,'rendering never mutates creator, parent, email or file data');
}
const roster=[
  {id:'17',label:'wbdevelopment',email:'wbdevelopment',userName:'wbdevelopment',fullName:'Robby Belliveau'},
  {id:'18',label:'alice_wbdevelopment',email:'alice_wbdevelopment',userName:'alice_wbdevelopment',approverEmail:'alice@example.com',fullName:'Alice Bell'},
  {id:'19',label:'other-login',email:'same@example.net',Full_Name:{first_name:'Other',last_name:'User'}},
];
ctx.S.users=roster;
const beforeRoster=JSON.stringify(roster);
for(const [author,label] of [
  ['WBDEVELOPMENT','Robby Belliveau'],
  [{user_name:'wbdevelopment',display_name:'Native Admin Label'},'Robby Belliveau'],
  ['ALICE@EXAMPLE.COM','Alice Bell'],
  [{email:'alice@example.com',display_name:'Short Label'},'Alice Bell'],
  ['alice_wbdevelopment','Alice Bell'],
  ['same@example.net','Other User'],
  ['alice@unrelated.example','alice@unrelated.example'],
  ['rbelliveau@wbdevelopment.com','rbelliveau@wbdevelopment.com'],
  ['missing-login','missing-login'],
  [{ID:'17'},'—'],
  [{user_name:'wbdevelopment',email:'alice@example.com',display_name:'Conflicting Identities'},'Conflicting Identities'],
  [{user_name:'unmatched-recorded-creator',email:'unmatched@example.test',display_name:'wbdevelopment'},'wbdevelopment'],
  [{username:'unmatched-recorded-creator',zc_display_value:'wbdevelopment'},'wbdevelopment'],
  [{email:'unmatched@example.test',display_value:'wbdevelopment'},'wbdevelopment'],
  [{user_name:'alice_wbdevelopment',display_name:'wbdevelopment'},'Alice Bell'],
  [{user_name:' ',username:false,email:null,zc_display_value:'wbdevelopment'},'Robby Belliveau'],
]){
  const row={ID:VID,Contract1:{ID:CID},File_field1:'/file/Legal.pdf',Added_User:author,Email_Attachment:true};
  ctx.S.versions=[row];
  assert.equal(ctx.attachmentAuthorLabel(row),label,'exact creator identity resolves a unique roster full name');
  ctx.showAttachmentsModal(CID);
  for(const markup of [mounted,ctx.attachmentsPanel(CID),ctx.aprAttachmentsTab(CID,[row],1),ctx.attachCard(CID)])assert.ok(markup.includes('Added by <b>'+ctx.esc(label)+'</b>'));
}
assert.equal(JSON.stringify(roster),beforeRoster,'author display does not mutate the access roster');
ctx.S.users=[{id:'18',label:'old-label',email:'old-email-value',userName:'native_exact_username',approverEmail:'alice@example.com',fullName:{first_name:'Alice',last_name:'Bell'}}];
assert.equal(ctx.attachmentAuthorLabel({Added_User:'NATIVE_EXACT_USERNAME'}),'Alice Bell','explicit authoritative userName alias and composite full name are supported');
assert.equal(ctx.attachmentAuthorLabel({Added_User:'ALICE@EXAMPLE.COM'}),'Alice Bell','explicit real approverEmail identity is supported without replacing existing email');
ctx.S.users=[...roster,{id:'20',label:'different-user',email:'ALICE@EXAMPLE.COM',fullName:'Wrong Person'}];
assert.equal(ctx.attachmentAuthorLabel({Added_User:'alice@example.com'}),'alice@example.com','ambiguous duplicate identities never choose a person');
ctx.S.users=[{id:'18',label:'alice_wbdevelopment',email:'alice@example.com',fullName:{first_name:11,last_name:false}}];
assert.equal(ctx.attachmentAuthorLabel({Added_User:{email:'alice@example.com',display_name:'Genuine Native Label'}}),'Genuine Native Label','malformed roster names keep the genuine creator display');
ctx.S.users=[{id:'18',label:'alice_wbdevelopment',email:'alice@example.com',fullName:'<img src=x onerror=boom()>'}];
ctx.S.versions=[{ID:VID,Contract1:{ID:CID},File_field1:'/file/Legal.pdf',Added_User:'alice@example.com'}];
ctx.showAttachmentsModal(CID);
assert.match(mounted,/Added by <b>&lt;img src=x onerror=boom\(\)&gt;<\/b>/);
ctx.S.users=[];
ctx.S.versions=[{ID:VID,Contract1:{ID:CID},File_field1:'/file/Legal.pdf',Added_User:'<img src=x onerror=boom()>',Email_Attachment:false}];
ctx.showAttachmentsModal(CID);
assert.match(mounted,/&lt;img src=x onerror=boom\(\)&gt;/,'creator strings remain escaped text');
assert.doesNotMatch(mounted,/<img src=x/);
assert.doesNotMatch(mounted,/class="modal-foot"|Click a file to preview it in place|opens Creator/,'only the redundant attachment footer is removed');
assert.match(mounted,/class="att-drop" id="attDrop"/);
assert.match(mounted,/Drop files here or click to upload/);
assert.match(mounted,/50 MB max/);
assert.match(mounted,/class="att-row"/);
assert.match(mounted,/class="att-open"/);
assert.match(mounted,/class="att-mail"[\s\S]*toggleEmailAttach/,'Legal retains the Email control');
for(const action of ['previewVersion','downloadVersion','deleteVersion'])assert.ok(mounted.includes(action+'(\''+VID+'\''),'the existing file action keeps its exact string ID');
const files=[{name:'preserved.pdf'}];
el('attFile').files=files;el('attFile').listeners.change();
assert.deepEqual(uploads,[{cid:CID,files}],'modal file input delegates to the existing upload action');
el('attDrop').listeners.drop({preventDefault(){},dataTransfer:{files}});
assert.equal(uploads.length,2,'drop delegates once to the same existing action');
ctx.wireAttachmentsPanel(CID);
el('attPanelFile').files=files;el('attPanelFile').listeners.change();
assert.equal(uploads.length,3);
ctx.S.versions=[{ID:VID,Contract1:{ID:CID},File_field1:'/file/Legal.pdf',Modified_User:'Editor Only'}];
assert.equal(ctx.attachmentAuthorLabel(ctx.S.versions[0]),'—','missing creator never substitutes the last editor');
ctx.showAttachmentsModal(CID);assert.match(mounted,/Added by <b>—<\/b>/);
ctx.S.versions=[];ctx.showAttachmentsModal(CID);
assert.match(mounted,/No attachments yet/);assert.doesNotMatch(mounted,/class="modal-foot"/);
assert.match(source,/version\/2\.0\/widgetsdk-min\.js/,'the retained Legal presentation now uses native SDK2');
assert.doesNotMatch(source,/version\/1\.0\/widgetsdk-min\.js/);
assert.match(source,/\.att-row\{display:flex;align-items:center;gap:14px;padding:13px 6px/);
assert.match(source,/\.att-open\{display:block;font-size:13\.5px/);
assert.match(source,/\.fbtn\{width:34px;height:34px/);
assert.match(source,/\.att-drop\{border:1\.5px dashed #b9c8dc/,'Legal reference upload styling remains intact');
console.log('Legal actual attachment surfaces: creator labels, retained upload/file/email actions, reference styles and footer removal passed.');
