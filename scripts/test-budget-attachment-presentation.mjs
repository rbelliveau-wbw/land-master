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

// Actual mounted landing/attachment handlers, native counted detail reader and existing writers.
// The main list and the already selected editor deliberately belong to different phases.
const OTHER='90071992547409932',OTHER_FILE='90071992547409994';
const tick=async()=>{for(let i=0;i<75;i++)await Promise.resolve();};
function modalHarness(){
  const h=harness(),c=h.c,listeners={},nodes={},calls=[],reads=[],writes=[],scrolls=[];
  function node(id){
    if(nodes[id])return nodes[id];const classes=new Set(),n={id,tagName:'DIV',inert:false,style:{display:''},hidden:false,disabled:false,isConnected:true,dataset:{},innerHTML:'',textContent:'',value:'',focus(){c.document.activeElement=n;},click(){n.clicks=(n.clicks||0)+1;},classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle(k,on){if(on)classes.add(k);else classes.delete(k);}},querySelector(selector){return selector.includes('data-close-budget-attachment-modal')?node('modalClose'):n.focusables&&n.focusables.find(x=>!x.disabled)||null;},querySelectorAll(){return n.focusables||[];},contains(target){return target===n||(n.children||[]).includes(target);},addEventListener(type,fn){(n.events||(n.events={}))[type]=fn;}};nodes[id]=n;return n;
  }
  for(const id of ['mainList','budgetAttachmentModalOverlay','budgetAttachmentModal','budgetAttachmentModalBody','budgetAttachmentModalTitle','budgetAttachmentModalContext','budgetAttachmentModalInput','budgetAttachmentInput','attachmentPhasePanel','attachmentPreviewOverlay','attachmentPreviewBody','attachmentPreviewName','attachmentPreviewDelete','attachmentPreviewDownload','attachmentPreviewClose','attachmentDeleteOverlay','attachmentDeleteTitle','attachmentDeleteName','attachmentDeleteCancel','attachmentDeleteGo','modalClose'])node(id);
  const close=node('modalClose'),choose=node('modalChoose'),last=node('modalLast');
  node('budgetAttachmentModal').focusables=[close,choose,last];node('budgetAttachmentModal').children=[close,choose,last,node('budgetAttachmentModalInput')];
  node('attachmentPreviewOverlay').focusables=[node('attachmentPreviewClose')];node('attachmentPreviewOverlay').children=[node('attachmentPreviewClose')];
  node('attachmentDeleteOverlay').focusables=[node('attachmentDeleteCancel'),node('attachmentDeleteGo')];node('attachmentDeleteOverlay').children=node('attachmentDeleteOverlay').focusables;
  node('budgetAttachmentModalInput').style.display='none';
  c.$=node;c.document={activeElement:null,getElementById:node,body:{style:{overflow:'auto'},children:[node('mainList'),node('budgetAttachmentModalOverlay'),node('attachmentPreviewOverlay'),node('attachmentDeleteOverlay')]},addEventListener(type,fn,capture){(listeners[type]||(listeners[type]=[])).push({fn,capture});},querySelectorAll:()=>[]};
  c.scrollX=7;c.scrollY=533;c.scrollTo=(x,y)=>scrolls.push([x,y]);c.setTimeout=()=>1;c.clearTimeout=()=>{};
  let runtime={environment:'PRODUCTION',user:'actual-native-actor@example.test',appLinkName:'land-master'},allowed=true,heldRead=null,heldWrite=null,failedRead=false;
  Object.assign(c.S,{view:'vBudgets',navigationGeneration:4,badgeGeneration:9,startupReady:true,currentUser:runtime.user,edBudget:{ID:OTHER,untouchedDraft:'retained'},globalMode:'edit',search:'keep this filter',budgets:[{ID:BID,Name:'Phase One'},{ID:OTHER,Name:'Phase Two'}],features:{},attachmentPreviewToken:0});
  const rows=[{ID:RID,Budget:{ID:BID},File_field1:{filename:'phase-one.pdf',filepath:'/api/file/phase-one.pdf'},Added_User:'native author'},{ID:OTHER_FILE,Budget:{ID:OTHER},File_field1:{filename:'phase-two.pdf',filepath:'/api/file/phase-two.pdf'}}];
  c.LMRuntime={current:()=>runtime};c.CFG.creatorOwner='fixture';c.CFG.creatorApp='land-master';c.canAddBudgetAttachment=()=>allowed;c.phaseName=b=>b.Name||'Old Editor';
  c.budgetBadgeScope=()=>JSON.stringify(runtime);c.syncBudgetAttachmentButtons=()=>calls.push('badgePatch');c.invalidateBudgetBadgeSummary=()=>calls.push('badgeInvalidation');
  c.auditLog=()=>{};c.shortErr=e=>e.message;c.setMsg=()=>{};c.toastShow=()=>{};c.updateEditorSideVisibility=()=>{};c.revokeAttachmentPreviewUrl=()=>{};c.previewStateHtml=title=>title;
  c.updateEditorActionVisibility=()=>{};c.budgetPerUnitNavigationAllowed=()=>true;c.closeBudgetRowMenus=()=>{};c.openPhaseEditor=()=>assert.fail('paperclip cannot navigate to the editor');c.renderProjList=()=>assert.fail('modal cannot rebuild the main list');
  c.ZOHO={CREATOR:{DATA:{getRecordCount:async config=>{reads.push({method:'count',config:clone(config)});if(failedRead)throw Object.assign(new Error('denied'),{code:2898});return {code:3000,result:{records_count:rows.filter(row=>!config.criteria||config.criteria.includes(row.Budget.ID)).length}};},getRecords:async config=>{reads.push({method:'read',config:clone(config)});const data=clone(rows.filter(row=>!config.criteria||config.criteria.includes(row.Budget.ID)));if(heldRead){const wait=heldRead;heldRead=null;await wait;}return {code:3000,data};}}}};
  vm.runInContext(adapter,c);
  for(const name of ['budgetFeature','invalidateBudgetFeature','loadBudgetFeature','budgetNavigationToken','budgetNavigationCurrent','getReportCandidates','budgetSdkCode','budgetMissingReport','sdkGetAllRecords','loadBudgetAttachments','budgetAttachments','invalidateBudgetReports','budgetAttachmentModalScope','budgetAttachmentModalCurrent','renderBudgetAttachmentModal','refreshBudgetAttachmentModal','closeBudgetAttachmentModal','openBudgetAttachmentModal','budgetAttachmentActiveDialog','handleBudgetAttachmentModalKey','handleBudgetAttachmentModalFocus','renderAttachmentPane','refreshBudgetAttachmentRecord','closeAttachmentPreview','attachmentPreviewBodyNode','deleteBudgetAttachment','closeAttachmentDeleteConfirm','runDeleteBudgetAttachment','removeLocalBudgetAttachment','uploadBudgetAttachments','parseAttachmentCreateResponse','inspectBudgetAttachment','budgetAttachmentMatches','recheckBudgetAttachmentUpload','showView','handleBudgetAttachmentInput','openBudgetAttachmentPreview'])vm.runInContext(block(name),c);
  c.budgetUploadError=e=>e;c.cleanupEmptyAttachmentRecord=()=>assert.fail('ordinary modal uploads cannot clean up saved files');
  c.sdkRunBudgetFunction=async(name,args)=>{writes.push({name,args:clone(args)});if(name==='createBudgetAttachmentRecord'){if(heldWrite){const wait=heldWrite;heldWrite=null;await wait;}const id='90071992547409995';rows.push({ID:id,Budget:{ID:args.budgetId},File_field1:''});return {result:{ok:true,attachmentId:id}};}assert.equal(name,'deleteBudgetAttachment');const i=rows.findIndex(row=>row.ID===args.attachmentId&&row.Budget.ID===args.budgetId);assert.ok(i>=0);rows.splice(i,1);return {code:3000};};
  c.sdkUploadFile=async(report,id,field,file)=>{writes.push({name:'FILE',report,id,field,file});const row=rows.find(row=>row.ID===id);row.File_field1={filename:file.name,filepath:'/api/file/'+file.name};return {code:3000,data:clone(row.File_field1)};};c.sdkGetRecordById=async(_report,id)=>clone(rows.find(row=>row.ID===id));
  c.attachmentMime=()=> 'application/pdf';c.getBudgetAttachmentPreviewBase64=(b,file)=>{calls.push({previewBudget:b.ID,fileId:file.recordId});return Promise.resolve({base64:'fixture'});};c.renderPdfAttachmentIsolated=(_data,file,token)=>{if(token===c.S.attachmentPreviewToken)calls.push({renderPdf:file.recordId});};
  const landingStart=source.indexOf('document.addEventListener("click", function (e)',source.indexOf('/* ── Landing event delegation'));
  vm.runInContext(source.slice(landingStart,source.indexOf('\n});',landingStart)+4),c);
  const controlsStart=source.indexOf('document.addEventListener("click", function(e){',source.indexOf('/* Budget attachment controls */'));
  vm.runInContext(source.slice(controlsStart,source.indexOf('\n});',controlsStart)+4),c);
  function action(selector,properties={}){const target={...properties,closest:query=>query===selector||query.split(',').includes(selector)?target:null,getAttribute:name=>properties[name]??null};return target;}
  function dispatch(target){const event={target,preventDefault(){},stopPropagation(){}};for(const {fn}of listeners.click)fn(event);}
  function paperclip(id){const target=action('[data-budget-attachments]',{dataset:{budgetAttachments:id},isConnected:true,focus(){c.document.activeElement=target;}});return target;}
  return {c,nodes,reads,writes,calls,rows,scrolls,dispatch,action,paperclip,setAllowed:v=>allowed=v,setRuntime:v=>runtime={...runtime,...v},failRead:v=>failedRead=v,holdRead:promise=>heldRead=promise,holdWrite:promise=>heldWrite=promise};
}
{
  const h=modalHarness(),trigger=h.paperclip(BID),editor=h.c.S.edBudget,body=h.nodes.mainList;body.innerHTML='mounted list';
  h.dispatch(trigger);assert.equal(h.c.S.view,'vBudgets');assert.equal(h.c.S.edBudget,editor);assert.equal(h.c.S.attachmentModal.loading,true);assert.equal(body.inert,true);assert.equal(h.c.document.body.style.overflow,'hidden');await tick();
  assert.equal(h.c.S.attachmentModal.budgetId,BID);assert.equal(h.c.S.attachmentModal.loading,false);assert.match(h.nodes.budgetAttachmentModalBody.innerHTML,/phase-one\.pdf/);assert.doesNotMatch(h.nodes.budgetAttachmentModalBody.innerHTML,/phase-two\.pdf|Email/);assert.equal(h.nodes.budgetAttachmentModalTitle.textContent,'Attachments · 1 file');
  assert.equal(h.reads.length,2);for(const read of h.reads)assert.equal(read.config.criteria,`(Budget == ${BID})`);
  assert.equal(h.c.S.search,'keep this filter');assert.equal(body.innerHTML,'mounted list');assert.equal(h.c.S.navigationGeneration,4);
  h.c.openBudgetAttachmentPreview(0);await tick();assert.deepEqual(h.calls.find(call=>call.previewBudget),{previewBudget:BID,fileId:RID});assert.equal(h.c.document.activeElement,h.nodes.attachmentPreviewClose);
  let prevented=0;h.c.handleBudgetAttachmentModalKey({key:'Escape',preventDefault(){prevented++;},stopPropagation(){}});assert.ok(h.c.S.attachmentModal,'Escape closes the child preview first');assert.equal(h.nodes.attachmentPreviewOverlay.classList.contains('show'),false);
  h.nodes.modalLast.focus();h.c.handleBudgetAttachmentModalKey({key:'Tab',preventDefault(){prevented++;}});assert.equal(h.c.document.activeElement,h.nodes.modalClose);
  h.c.handleBudgetAttachmentModalKey({key:'Tab',shiftKey:true,preventDefault(){prevented++;}});assert.equal(h.c.document.activeElement,h.nodes.modalLast);
  h.c.handleBudgetAttachmentModalFocus({target:body});assert.equal(h.c.document.activeElement,h.nodes.modalClose);
  h.dispatch(h.action('[data-close-budget-attachment-modal]'));assert.equal(h.c.S.attachmentModal,null);assert.equal(body.inert,false);assert.equal(h.c.document.body.style.overflow,'auto');assert.equal(h.c.document.activeElement,trigger);assert.deepEqual(h.scrolls,[[7,533]]);assert.equal(h.c.S.edBudget,editor);assert.equal(prevented,3);
  await h.c.openBudgetAttachmentModal(BID,trigger);assert.equal(h.reads.length,4,'every new main-list open reads fresh complete detail');h.c.closeBudgetAttachmentModal();
  h.c.S.globalMode='attachments';const beforeClose=h.reads.length;await h.c.openBudgetAttachmentModal(BID,trigger);h.c.closeBudgetAttachmentModal();await tick();assert.equal(h.reads.length,beforeClose+2,'retained editor mode cannot trigger an unrelated hidden attachment read on modal close');
  h.c.S.edBudget={ID:OTHER};h.c.S.globalMode='attachments';h.c.S.edPhaseIdx=0;await h.c.loadBudgetAttachments(OTHER,true);h.c.renderAttachmentPage(h.c.S.edBudget);assert.match(h.nodes.attachmentPhasePanel.innerHTML,/phase-two\.pdf/,'the original editor Attachments workspace remains available');
}
{
  const h=modalHarness();let release;h.holdRead(new Promise(resolve=>release=resolve));const pending=h.c.openBudgetAttachmentModal(BID,h.paperclip(BID));await tick();
  assert.equal(h.c.S.attachmentModal.loading,true);h.dispatch(h.action('[data-add-budget-attachment]'));assert.equal(h.nodes.budgetAttachmentModalInput.clicks,undefined);assert.equal(h.c.closeBudgetAttachmentModal(),true,'loading reads can be dismissed');
  await h.c.openBudgetAttachmentModal(OTHER,h.paperclip(OTHER));const content=h.nodes.budgetAttachmentModalBody.innerHTML;release();await pending;assert.equal(h.c.S.attachmentModal.budgetId,OTHER);assert.equal(h.nodes.budgetAttachmentModalBody.innerHTML,content,'a dismissed phase reply cannot replace/reopen the next modal');
  h.c.closeBudgetAttachmentModal();h.failRead(true);await h.c.openBudgetAttachmentModal(BID,h.paperclip(BID));assert.match(h.nodes.budgetAttachmentModalBody.innerHTML,/Attachments unavailable/);assert.equal(h.nodes.budgetAttachmentModalTitle.textContent,'Attachments','a denied read is never a verified zero');h.failRead(false);h.dispatch(h.action('[data-retry-budget-attachment-modal]'));await tick();assert.match(h.nodes.budgetAttachmentModalBody.innerHTML,/phase-one\.pdf/);
  h.setRuntime({user:'different-actor@example.test'});const before=h.reads.length;h.dispatch(h.action('[data-add-budget-attachment]'));h.c.openBudgetAttachmentPreview(0);h.c.deleteBudgetAttachment(0);assert.equal(h.writes.length,0);assert.equal(h.reads.length,before);h.c.renderBudgetAttachmentModal();assert.equal(h.c.S.attachmentModal,null);
  assert.equal(await h.c.openBudgetAttachmentModal('90071992547409999'),false,'unloaded phase IDs cannot acquire attachment scope');
}
{
  const h=modalHarness();h.setAllowed(false);await h.c.openBudgetAttachmentModal(BID,h.paperclip(BID));assert.doesNotMatch(h.nodes.budgetAttachmentModalBody.innerHTML,/data-add-budget-attachment|data-delete-budget-attachment/);h.dispatch(h.action('[data-add-budget-attachment]'));await h.c.uploadBudgetAttachments([{name:'denied.pdf',size:1}]);h.c.deleteBudgetAttachment(0);assert.equal(h.writes.length,0);h.c.closeBudgetAttachmentModal();
  h.setAllowed(true);await h.c.openBudgetAttachmentModal(BID,h.paperclip(BID));h.dispatch(h.action('[data-add-budget-attachment]'));assert.equal(h.nodes.budgetAttachmentModalInput.clicks,1);assert.equal(h.nodes.budgetAttachmentInput.clicks,undefined);
  let release;h.holdWrite(new Promise(resolve=>release=resolve));const file={name:'original.pdf',size:42},upload=h.c.uploadBudgetAttachments([file]);await tick();
  assert.equal(h.c.S.attachmentBusy,true);assert.equal(h.c.closeBudgetAttachmentModal(),false);assert.equal(h.c.showView('vImports'),false);assert.equal(h.c.S.view,'vBudgets');assert.equal(h.nodes.modalClose.disabled,true);
  h.c.deleteBudgetAttachment(0);await h.c.uploadBudgetAttachments([file]);assert.equal(h.writes.length,1,'pending upload blocks Delete, navigation and another child creation');
  release();await upload;await tick();assert.deepEqual(h.writes[0],{name:'createBudgetAttachmentRecord',args:{budgetId:BID}});assert.equal(h.writes[1].name,'FILE');assert.equal(h.writes[1].file,file);assert.match(h.nodes.budgetAttachmentModalTitle.textContent,/2 files/);assert.equal(h.c.S.edBudget.ID,OTHER);assert.ok(h.calls.includes('badgePatch'));
  h.c.deleteBudgetAttachment(0);assert.equal(h.c.document.activeElement,h.nodes.attachmentDeleteCancel);h.c.closeAttachmentDeleteConfirm();await h.c.runDeleteBudgetAttachment(0);await tick();assert.equal(h.writes.length,2,'cancelled confirmation cannot authorize a native delete');
  h.c.deleteBudgetAttachment(0);h.c.runDeleteBudgetAttachment(0);await tick();assert.deepEqual(h.writes[2],{name:'deleteBudgetAttachment',args:{budgetId:BID,attachmentId:RID}});assert.match(h.nodes.budgetAttachmentModalTitle.textContent,/1 file/);assert.equal(h.c.S.search,'keep this filter');assert.equal(h.c.S.edBudget.ID,OTHER);
  h.c.S.attachmentUploadReview={budgetId:BID,attachmentId:'90071992547409995'};h.c.renderAttachmentPane(h.c.S.attachmentModal.budget);h.c.deleteBudgetAttachment(0);await h.c.uploadBudgetAttachments([file]);assert.equal(h.writes.length,3,'unverified outcomes preserve the existing no-replay/Delete locks');assert.equal(await h.c.openBudgetAttachmentModal(OTHER),false,'another phase cannot receive the pending review');
}
{
  const h=modalHarness();await h.c.openBudgetAttachmentModal(BID,h.paperclip(BID));h.dispatch(h.action('[data-add-budget-attachment]'));
  const input=h.nodes.budgetAttachmentModalInput;assert.equal(input._budgetAttachmentModal,h.c.S.attachmentModal);h.c.closeBudgetAttachmentModal();input.files=[{name:'late-picker.pdf',size:42}];input.value='selected';h.c.handleBudgetAttachmentInput.call(input);await tick();
  assert.equal(input.value,'');assert.equal(h.writes.length,0,'a picker returning after close cannot upload into the unrelated retained editor');
  for(const change of [()=>h.c.S.navigationGeneration++,()=>h.c.S.badgeGeneration++,()=>h.setRuntime({environment:'DEVELOPMENT'}),()=>h.setRuntime({appLinkName:'another-app'})]){
    await h.c.openBudgetAttachmentModal(BID,h.paperclip(BID));assert.ok(h.c.S.attachmentModal);change();const before=h.reads.length;assert.equal(await h.c.refreshBudgetAttachmentModal(),false);h.c.deleteBudgetAttachment(0);assert.equal(h.reads.length,before);h.c.renderBudgetAttachmentModal();assert.equal(h.c.S.attachmentModal,null);
  }
}
{
  const h=modalHarness();await h.c.openBudgetAttachmentModal(BID,h.paperclip(BID));let release;h.holdWrite(new Promise(resolve=>release=resolve));const upload=h.c.uploadBudgetAttachments([{name:'changed-context.pdf',size:42}]);await tick();const reads=h.reads.length;
  h.setRuntime({user:'another-actor@example.test'});release();assert.equal(await upload,false);await tick();assert.equal(h.writes.length,1,'a changed native actor after create acknowledgement cannot start FILE or cleanup');assert.equal(h.reads.length,reads,'stale mutation callbacks cannot fresh-read under the new actor');assert.equal(h.c.S.attachmentUploadReview.budgetId,BID);assert.equal(h.c.S.attachmentUploadReview.attachmentId,'90071992547409995');assert.equal(h.c.S.attachmentModal,null);assert.equal(h.c.S.edBudget.ID,OTHER);
}
assert.match(source,/document\.addEventListener\("keydown",handleBudgetAttachmentModalKey,true\)/);assert.match(source,/document\.addEventListener\("focusin",handleBudgetAttachmentModalFocus,true\)/);
assert.match(source,/\["budgetAttachmentInput","budgetAttachmentModalInput"\]\.forEach\(function\(id\)\{var input=\$\(id\);if\(input\)input\.addEventListener\("change",handleBudgetAttachmentInput\);\}\)/);
assert.match(source,/budget-attachment-modal-close\{[^}]*padding:0[^}]*place-items:center/);assert.match(source,/budget-attachment-modal-close svg\{width:15px;height:15px/);assert.match(source,/data-close-budget-attachment-modal[^>]*><svg[^>]*viewBox="0 0 24 24"[^>]*><path d="M6 6l12 12M18 6 6 18"/);
assert.match(source,/budget-attachment-modal\{[^}]*width:min\(940px,96vw\)/);assert.match(source,/budget-attachment-modal-close\{[^}]*width:32px;height:32px[^}]*border-radius:9px;background:#f8fafc;color:#94a3b8/,'modal width and neutral Close follow Legal');
console.log('Budget attachment presentation: actual main-list modal/native counted exact-phase route, retained list/editor/search/scroll, fresh/retry/stale identity guards, nested keyboard/focus/inert behavior, readonly/busy/review and existing upload/preview/delete/count paths passed.');
