import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
const adapter=fs.readFileSync('shared/creator-data.js','utf8');
function block(name){
  const start=source.indexOf(`function ${name}(`),line=source.indexOf('\n',start);
  const end=source.slice(start,line).trimEnd().endsWith('}')?line:source.indexOf('\n}',start)+2;
  assert.ok(start>=0&&end>start,name);return source.slice(start,end);
}
const clone=value=>JSON.parse(JSON.stringify(value));
const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const BID='90071992547409931',RID='90071992547409991';
const functions=['cleanVal','isObj','rawPath','firstRaw','lookupId','safeDecodeURIComponent','prettifyAttachmentName','attachmentQueryValue','normalizeAttachmentEntry','collectAttachmentEntries','attachmentRecordBudgetId','attachmentAuthorLabel','normalizeBudgetAttachmentRecord','attachmentExt','attachmentIconSvg','attachmentInlineStateHtml','renderAttachmentPage','handleBudgetAttachmentDrop'];
function harness(){
  const pane={innerHTML:''},calls=[],features={},classes=new Set();
  const zone={classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);}},classes};
  let allowed=true;
  const context=vm.createContext({S:{edBudget:{ID:BID},edPhaseIdx:0,globalMode:'attachments',liveSDK:true,attachmentsByBudget:{},accessUsers:[]},
    CFG:{attachmentBudgetField:'Budget',attachmentFileField:'File_field1',reports:{attachments:'All_Contract_Versions'},reportCandidates:{}},Promise,Error,Date,URL,URLSearchParams,Number,
    $:()=>pane,esc,escAttr:esc,phaseName:()=>"Existing Phase",budgetNavigationToken:()=>({}),budgetNavigationCurrent:()=>true,
    budgetFeature:key=>features[key]||(features[key]={status:'loaded',generation:0}),budgetFeatureStateHtml:()=>'<div>Attachments unavailable · Retry</div>',
    budgetAttachments:b=>(context.S.attachmentsByBudget[b.ID]||[]).slice(),canAddBudgetAttachment:()=>allowed,
    uploadBudgetAttachments:files=>{calls.push(files);return Promise.resolve(true);}});
  context.window=context;for(const name of functions)vm.runInContext(block(name),context);
  return {c:context,pane,calls,zone,features,setAllowed:value=>allowed=value};
}

// The real native normalizer keeps record/file identity and uses only the recorded creator.
{
  const {c}=harness(),row={ID:RID,Budget:{ID:BID},File_field1:{filename:'review.pdf',filepath:'/api/file/review.pdf'},Date_field1:'01-Oct-2026',Added_Time:'02-Oct-2026',Modified_Time:'03-Oct-2026',Added_User:{zc_display_value:'Native creator'},Modified_User:'Different editor'};
  const original=clone(row),file=c.normalizeBudgetAttachmentRecord(row,0);
  assert.equal(file.recordId,RID);assert.equal(file.budgetId,BID);assert.equal(file.name,'review.pdf');assert.equal(file.filePath,'/api/file/review.pdf');assert.equal(file.addedTime,'01-Oct-2026');assert.equal(file.addedUser,'Native creator');assert.equal(file.rawRecord,row);assert.deepEqual(row,original);
  const labels=[[' Creator username ','Creator username'],[{display_name:'Full Native Name',zc_display_value:'Second'},'Full Native Name'],[{zc_display_value:'Native Label'},'Native Label'],[{display_value:'Legacy Label'},'Legacy Label'],[{name:'Name value'},'Name value'],[{Name:'Legacy Name'},'Legacy Name'],[{user_name:'native-user'},'native-user'],[{first_name:'First',last_name:'Last'},'First Last'],[{email:'creator@example.test'},'creator@example.test']];
  for(const [value,expected] of labels)assert.equal(c.attachmentAuthorLabel(value),expected);
  for(const value of [null,undefined,{},[],['Wrong'],42,true,{ID:RID},{display_name:42,email:false}])assert.equal(c.attachmentAuthorLabel(value),'');
  const missing=c.normalizeBudgetAttachmentRecord({...row,Added_User:undefined,Added_By:'Unverified custom alias',Modified_User:{display_name:'Last editor'}},0);
  assert.equal(missing.addedUser,'','missing creator never substitutes editor, custom alias or current actor');
  assert.equal(c.normalizeBudgetAttachmentRecord({...row,Date_field1:undefined},0).addedTime,'02-Oct-2026');
  assert.equal(c.normalizeBudgetAttachmentRecord({...row,Date_field1:undefined,Added_Time:undefined},0).addedTime,'03-Oct-2026','existing date fallback retained independently of the author');
}

// Saved creator identity joins only one authoritative existing roster row, across actors.
{
  const {c}=harness();c.S.currentUser='unrelated-current-session';
  c.S.accessUsers=[{id:'90071992547409981',label:'wbdevelopment',email:'wbdevelopment',userName:'wbdevelopment',approverEmail:'creator@example.test',fullName:'Recorded Creator Full Name'},
    {id:'90071992547409982',label:'different-user',email:'different-user',userName:'different-user',approverEmail:'other@example.test',fullName:'Different Person'}];
  for(const value of [' WBDevelopment ',' CREATOR@example.test ',{user_name:'wbdevelopment',display_name:'Old display'}, {email:'creator@example.test',zc_display_value:'Old display'},{zc_display_value:'wbdevelopment'},{username:'wbdevelopment'}])assert.equal(c.attachmentAuthorLabel(value),'Recorded Creator Full Name');
  assert.equal(c.attachmentAuthorLabel('creator@different.test'),'creator@different.test','email local parts never identify a roster user');
  for(const explicit of [{user_name:'unmatched-recorded-creator',email:'unmatched@example.test'},{username:'unmatched-recorded-creator'},{email:'unmatched@example.test'}]){
    const author={...explicit,display_name:'wbdevelopment',zc_display_value:'wbdevelopment',display_value:'wbdevelopment',name:'wbdevelopment'};
    assert.equal(c.attachmentAuthorLabel(author),'wbdevelopment','display aliases cannot override explicit unmatched creator identities');
  }
  assert.equal(c.attachmentAuthorLabel({user_name:'different-user',display_name:'wbdevelopment'}),'Different Person','explicit matching creator outranks another person display alias');
  assert.equal(c.attachmentAuthorLabel({user_name:' ',username:42,email:null,zc_display_value:'wbdevelopment'}),'Recorded Creator Full Name','blank/malformed explicit fields retain native label-only compatibility');
  assert.equal(c.attachmentAuthorLabel('wbdevelopment_1'),'wbdevelopment_1','username suffixes are not stripped');
  assert.equal(c.attachmentAuthorLabel({ID:'90071992547409981'}),'','record ID alone cannot establish Creator actor');
  c.S.accessUsers.push({...c.S.accessUsers[0],id:'90071992547409983',fullName:'Conflicting Full Name'});
  assert.equal(c.attachmentAuthorLabel('wbdevelopment'),'wbdevelopment','ambiguous identity keeps genuine recorded string');
  assert.equal(c.attachmentAuthorLabel({email:'creator@example.test',display_name:'Native creator display'}),'Native creator display');
  c.S.accessUsers[0].fullName='';c.S.accessUsers.pop();assert.equal(c.attachmentAuthorLabel('wbdevelopment'),'wbdevelopment','blank roster name does not substitute current actor');
}

// Actual permission mapping retains additive roster data without changing any flags.
{
  const {c}=harness();Object.assign(c,{accessTruthy:value=>value===true,applyHardcodedPerms(){},auditLog(){}});
  for(const name of ['applyPermsFromFlags','denyBudgetAccess','parseLeanBudgetAccessResponse','budgetSdkCode'])vm.runInContext(block(name),c);
  const user={id:'90071992547409981',label:'creator-username',email:'creator-username',userName:'creator-username',approverEmail:'creator@example.test',fullName:'Creator Full Name'};
  const flags={hasRow:true,found:true,myId:user.id,editAll:true,editOwned:false,apprAll:false,apprOwned:false,send:false,editOwners:false,viewImports:false,editImports:false,modAdmin:false,budgetDeleteArchive:false,users:[user]};
  c.applyPermsFromFlags(flags,'fixture');const permissions=clone(c.S.perms);assert.deepEqual(clone(c.S.accessUsers),[user]);
  const legacy={id:user.id,label:user.label,email:user.email};c.applyPermsFromFlags({...flags,users:[legacy]},'legacy');assert.deepEqual(clone(c.S.perms),permissions);assert.deepEqual(clone(c.S.accessUsers),[legacy],'old roster shape stays compatible');
  c.denyBudgetAccess('fixture',null,{users:[user]});assert.deepEqual(clone(c.S.accessUsers),[user]);assert.equal(c.S.perms.readOnly,true);assert.equal(c.S.perms.editAll,false);
  const envelope={code:3000,result:flags,response:JSON.stringify(flags)};assert.deepEqual(clone(c.parseLeanBudgetAccessResponse(envelope)),flags,'identical repeated additive roster leaf remains valid');
  for(const key of ['userName','approverEmail','fullName'])assert.throws(()=>c.parseLeanBudgetAccessResponse({code:3000,result:flags,response:JSON.stringify({...flags,users:[{...user,[key]:'Conflicting'}]})}),/conflicting or failed lean access/,'conflicting author roster does not pass the lean envelope guard');
}

// Actual renderer matches Legal's drop/card/file-action structure, with escaped provenance.
{
  const h=harness(),files=[{recordId:RID,name:'review.pdf',addedTime:'01-Oct-2026',addedUser:'Native Creator'},
    {recordId:'90071992547409992',name:'<unsafe>.docx',addedTime:'',addedUser:'<unsafe author>'},
    {recordId:'90071992547409993',name:'schedule.xlsx',addedTime:'',addedUser:''}];
  h.c.S.attachmentsByBudget[BID]=files;h.c.renderAttachmentPage(h.c.S.edBudget);
  const html=h.pane.innerHTML;
  assert.match(html,/data-budget-attachment-drop/);assert.match(html,/Drop files here or click to upload/);assert.match(html,/Choose Files/);assert.match(html,/50 MB per file/);
  assert.match(html,/attachment-page-file-icon pdf'>PDF/);assert.match(html,/attachment-page-file-icon doc'>DOC/);assert.match(html,/attachment-page-file-icon xls'>XLS/);
  assert.match(html,/01-Oct-2026 · Added by <b>Native Creator<\/b>/);assert.match(html,/Added · Added by <b>—<\/b>/);
  assert.match(html,/&lt;unsafe&gt;\.docx/);assert.match(html,/&lt;unsafe author&gt;/);assert.doesNotMatch(html,/<unsafe|\[object Object\]/);
  for(let i=0;i<files.length;i++){
    assert.equal((html.match(new RegExp(`data-open-budget-attachment='${i}'`,'g'))||[]).length,2,'file name and eye use the same existing preview index');
    assert.match(html,new RegExp(`data-download-budget-attachment='${i}'`));assert.match(html,new RegExp(`data-delete-budget-attachment='${i}'`));
  }
  assert.doesNotMatch(html,/att-mail|Email Attachment|Click a file to preview|opens the Creator viewer/,'Budget has neither Legal email slider nor bottom helper');
  h.setAllowed(false);h.c.renderAttachmentPage(h.c.S.edBudget);assert.doesNotMatch(h.pane.innerHTML,/data-budget-attachment-drop|data-add-budget-attachment|data-delete-budget-attachment/);assert.match(h.pane.innerHTML,/data-open-budget-attachment|data-download-budget-attachment/);
  h.setAllowed(true);
  for(const mode of ['busy','review']){
    h.c.S.attachmentBusy=mode==='busy';h.c.S.attachmentUploadReview=mode==='review'?{}:null;h.c.S.attachmentStatus='Needs review';
    h.c.renderAttachmentPage(h.c.S.edBudget);
    assert.match(h.pane.innerHTML,/data-budget-attachment-drop aria-disabled='true'/);assert.match(h.pane.innerHTML,/data-add-budget-attachment type='button' disabled/);assert.match(h.pane.innerHTML,/data-delete-budget-attachment='0'[^>]* disabled/);
    if(mode==='review')assert.match(h.pane.innerHTML,/data-recheck-budget-upload/,'existing safe Recheck remains accessible');
  }
  h.features['attachments:'+BID].status='error';h.c.renderAttachmentPage(h.c.S.edBudget);assert.match(h.pane.innerHTML,/unavailable.*Retry/);assert.doesNotMatch(h.pane.innerHTML,/No attachments|attachment-page-row/);
}

// New drop events enter the existing guarded upload flow; no denied/busy/review writes.
{
  const h=harness(),file={name:'drop.pdf',size:42};let prevented=0;
  const event=type=>({type,target:{closest:()=>h.zone},dataTransfer:{files:[file]},preventDefault(){prevented++;}});
  h.c.handleBudgetAttachmentDrop(event('dragover'));assert.equal(h.zone.classes.has('dragover'),true);
  await h.c.handleBudgetAttachmentDrop(event('drop'));assert.equal(h.zone.classes.has('dragover'),false);assert.equal(h.calls.length,1);assert.equal(h.calls[0][0],file,'original File object reaches the existing native upload path');
  for(const condition of ['denied','busy','review','no-budget']){
    h.setAllowed(condition!=='denied');h.c.S.attachmentBusy=condition==='busy';h.c.S.attachmentUploadReview=condition==='review'?{}:null;h.c.S.edBudget=condition==='no-budget'?null:{ID:BID};
    h.c.handleBudgetAttachmentDrop(event('dragover'));assert.equal(h.zone.classes.has('dragover'),false);await h.c.handleBudgetAttachmentDrop(event('drop'));
  }
  assert.equal(h.calls.length,1);assert.equal(prevented,10,'blocked drops still prevent browser file navigation');
  h.c.handleBudgetAttachmentDrop({type:'drop',target:{closest:()=>null},preventDefault(){assert.fail('unrelated browser drop is not intercepted');}});
  assert.match(source,/\["dragover","dragleave","drop"\]\.forEach\(function\(type\)\{document\.addEventListener\(type,handleBudgetAttachmentDrop\);\}\)/,'mounted document listeners call the tested handler');
}

// Real counted detail transport requests creator plus every used file/date/parent field.
{
  const h=harness(),c=h.c,calls=[],rows=[{ID:RID,Budget:{ID:BID},File_field1:{filename:'detail.pdf',filepath:'/api/file/detail.pdf'},Date_field1:'01-Oct-2026',Added_Time:'02-Oct-2026',Modified_Time:'03-Oct-2026',Added_User:'Native author'}];
  c.LMRuntime={current:()=>({environment:'PRODUCTION',user:'unrelated-current-actor',appLinkName:'land-master'})};
  c.ZOHO={CREATOR:{DATA:{getRecordCount:async config=>{calls.push({method:'count',config:clone(config)});return {code:3000,result:{records_count:rows.length}};},getRecords:async config=>{calls.push({method:'read',config:clone(config)});return {code:3000,data:rows.map(row=>Object.fromEntries(config.fields.split(',').filter(field=>Object.hasOwn(row,field)).map(field=>[field,row[field]])))};}}}};
  c.auditLog=()=>{};c.shortErr=error=>error.message;c.syncBudgetAttachmentButtons=()=>{};c.budgetBadgeScope=()=>'';
  c.loadBudgetFeature=(_key,loader,publish)=>loader().then(result=>{publish(result);return result;});
  vm.runInContext(adapter,c);for(const name of ['getReportCandidates','budgetSdkCode','budgetMissingReport','sdkGetAllRecords','loadBudgetAttachments'])vm.runInContext(block(name),c);
  const result=await c.loadBudgetAttachments(BID,true),read=calls.find(call=>call.method==='read').config;
  assert.equal(read.report_name,'All_Contract_Versions');assert.equal(read.criteria,`(Budget == ${BID})`);assert.equal(read.field_config,'custom');assert.equal(read.fields,'ID,Budget,File_field1,Date_field1,Added_Time,Modified_Time,Added_User');
  assert.equal(result[0].recordId,RID);assert.equal(result[0].budgetId,BID);assert.equal(result[0].name,'detail.pdf');assert.equal(result[0].filePath,'/api/file/detail.pdf');assert.equal(result[0].addedTime,'01-Oct-2026');assert.equal(result[0].addedUser,'Native author');
  delete rows[0].Added_User;rows[0].Modified_User='Wrong author';await c.loadBudgetAttachments(BID,true);assert.equal(c.S.attachmentsByBudget[BID][0].addedUser,'');
}

console.log('Budget attachment presentation: Legal-style drop/cards/actions, actual guarded File path, read-only/busy/review controls, escaped native Added_User provenance and exact projected detail metadata passed.');
