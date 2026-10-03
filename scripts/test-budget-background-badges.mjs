import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
const adapter=fs.readFileSync('shared/creator-data.js','utf8');
function block(name){const start=source.indexOf(`function ${name}(`),line=source.indexOf('\n',start),end=source.slice(start,line).trimEnd().endsWith('}')?line:source.indexOf('\n}',start)+2;assert.ok(start>=0&&end>start,name);return source.slice(start,end);}
const functions=['cleanVal','isObj','rawPath','firstRaw','lookupId','getReportCandidates','budgetSdkCode','budgetMissingReport','sdkGetAllRecords','budgetFeature','invalidateBudgetFeature','loadBudgetFeature','budgetMeasured','budgetBadgeScope','resetBudgetBadgeSummaries','validateBudgetBadgeRows','loadBudgetBadgeSummary','scheduleBudgetBadgeSummaries','invalidateBudgetBadgeSummary','invalidateBudgetReports','budgetCommentKey','budgetCommentParentId','budgetCommentDeleted','budgetCommentBadge','budgetBadgeCount','budgetBadgeLabel','budgetAttachmentBadge','budgetCommentIcon','budgetCommentButton','budgetAttachmentActionIcon','budgetCommentRecordId','budgetAttachmentButton','syncBudgetCommentButtons','syncBudgetAttachmentButtons','rememberBudgetComments','loadBudgetComments','safeDecodeURIComponent','prettifyAttachmentName','attachmentQueryValue','normalizeAttachmentEntry','collectAttachmentEntries','attachmentRecordBudgetId','normalizeBudgetAttachmentRecord','loadBudgetAttachments','validateLandingCategoryRows','groupLandingCategories','loadAll','boot'];
const clone=value=>JSON.parse(JSON.stringify(value));
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const settle=async()=>{for(let i=0;i<12;i++)await turn();};
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
const BID='90071992547409931',OTHER='90071992547409932',PROJECT='90071992547409951';
const fields=JSON.parse(source.match(/landingCategoryFields:\s*(\[[^\]]+\])/)[1]);
function harness(){
  const reports=Object.fromEntries(['budgets','subdivisions','projects','categories','approvals','comments','attachments'].map(key=>[key,key]));
  const recent=new Date().toISOString(),rows={budgets:[{ID:BID},{ID:OTHER}],subdivisions:[],projects:[],categories:[],approvals:[],
    comments:[{ID:'90071992547409961',Project:{ID:PROJECT},Budget:[],Added_Time:recent,Deleted:false},
      {ID:'90071992547409962',Project:[],Budget:{ID:BID},Added_Time:recent,Deleted:false},
      {ID:'90071992547409963',Project:[],Budget:{ID:BID},Added_Time:recent,Deleted:true}],
    attachments:[{ID:'90071992547409971',Budget:{ID:BID},File_field1:'fixture.pdf'},
      {ID:'90071992547409972',Budget:{ID:BID},File_field1:''},
      {ID:'90071992547409973',Budget:{ID:OTHER},File_field1:'other.docx'},
      {ID:'90071992547409974',Budget:[],File_field1:'unrelated.pdf'}]};
  const calls=[],timers=new Map(),buttons=[],events=[],audits=[],nodes={projList:{innerHTML:''},aqGroups:{innerHTML:''},budgetProjectSearch:{value:'retain current search'},notePopVal:{value:'retain current draft'}};
  let clock=0,renders=0,active=0,maximum=0;const runtime={environment:'PRODUCTION',user:'actual-native-actor',appLinkName:'land-master'};
  const gate={counts:null,records:null,denied:false,incomplete:false,omitted:false,fullOmitted:false};
  function scoped(config){let result=rows[config.report_name];if(config.criteria){const match=config.criteria.match(/\((Budget|Project) == (\d+)\)/);if(match)result=result.filter(row=>row[match[1]]&&row[match[1]].ID===match[2]);}return result;}
  async function invoke(method,config){
    calls.push({method,config:clone(config)});active++;maximum=Math.max(maximum,active);
    try{
      const data=clone(scoped(config));
      const badges=['comments','attachments'].includes(config.report_name);
      if(badges&&gate[method==='count'?'counts':'records'])await gate[method==='count'?'counts':'records'].promise;
      if(badges&&gate.denied&&config.report_name==='comments')throw {code:2898,message:'Denied badge snapshot'};
      if(method==='count')return {code:3000,result:{records_count:data.length+(badges&&gate.incomplete?1:0)}};
      const response=config.field_config==='custom'?data.map(row=>Object.fromEntries(config.fields.split(',').filter(field=>!((gate.omitted||gate.fullOmitted)&&field==='Deleted')).map(field=>[field,clone(row[field])]))):clone(data);
      if(gate.fullOmitted&&config.report_name==='comments')response.forEach(row=>delete row.Deleted);
      return {code:3000,data:response};
    }finally{active--;}
  }
  function button(kind,parent,field){
    const count={textContent:'…'},classes=new Set();
    const btn={dataset:kind==='comments'?{commentField:field,commentId:parent,commentLabel:'Fixture'}:{budgetAttachments:parent,attachmentLabel:'Fixture'},classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);},contains:name=>classes.has(name)},title:'',querySelector:()=>count,setAttribute(name,value){this[name]=value;},count};
    buttons.push(btn);return btn;
  }
  const context=vm.createContext({S:{liveSDK:true,useMock:false,currentUser:runtime.user,startupReady:false,budgets:[],projects:[],approvals:[],commentRowsByParent:{},attachmentsByBudget:{},landingCategories:{}},
    CFG:{reports,forms:{comment:'Comment_Log'},reportCandidates:{},landingCategoryFields:fields,attachmentBudgetField:'Budget',attachmentFileField:'File_field1'},Promise,Error,Date,Number,URL,URLSearchParams,console:{log(){},warn(){},error(){}},
    setTimeout(callback,delay){const id=++clock;timers.set(id,{callback,delay});return id;},clearTimeout:id=>timers.delete(id),
    LMRuntime:{current:()=>runtime},ZOHO:{CREATOR:{DATA:{getRecordCount:config=>invoke('count',config),getRecords:config=>invoke('read',config)}}},
    document:{querySelector:()=>null,querySelectorAll:selector=>buttons.filter(btn=>selector.includes('data-comment-field')?!!btn.dataset.commentField:!!btn.dataset.budgetAttachments)},
    $:id=>nodes[id]||(nodes[id]={innerHTML:'',textContent:'',style:{}}),PFComments:{timestamp:Date.parse},esc:value=>String(value??''),escAttr:value=>String(value??''),
    fetchCurrentUser:async()=>runtime.user,loadUserAccess:async()=>{},hydrateBudgetSubdivisions(){},buildProjects:budgets=>[{key:'project:'+PROJECT,name:'Fixture',phases:budgets}],
    auditLog(level,message,data){audits.push({level,message,data:clone(data||{})});},setLoad(){},setMsg(){},showView(){},perms:()=>({readOnly:false}),updateImportsTabVisibility(){},renderApprQueue(){},applyDeepLink(){},shortErr:error=>error?.message||String(error),safeStringify:JSON.stringify});
  context.window=context;vm.runInContext(adapter,context);for(const name of functions)vm.runInContext(block(name),context);
  context.renderProjList=()=>{
    renders++;events.push('render');
    context.budgetCommentButton('Project',PROJECT,'Project');button('comments',PROJECT,'Project');
    for(const budget of context.S.budgets){assert.match(context.budgetCommentButton('Budget',budget.ID,'Phase'),/comment-activity-count'>…/);button('comments',budget.ID,'Budget');assert.match(context.budgetAttachmentButton(budget,'Phase'),/comment-activity-count'>…/);button('attachments',budget.ID);}
  };
  function runTimers(){for(const [key,timer] of [...timers])if(timer.delay===0){timers.delete(key);timer.callback();}}
  return {c:context,calls,rows,gate,runtime,nodes,buttons,button,events,audits,runTimers,timers,renderCount:()=>renders,maximum:()=>maximum};
}

// Actual boot returns a usable landing while both native badge dependencies remain stalled.
{
  const h=harness(),g=deferred();h.gate.counts=g;
  await h.c.boot();
  assert.equal(h.c.S.startupReady,true);assert.equal(h.renderCount(),1);
  assert.ok(h.c.LMPerf.snapshot().events.some(event=>event.name==='budget:first-usable'));
  assert.equal(h.calls.filter(call=>['comments','attachments'].includes(call.config.report_name)).length,0,'no badge dependency is awaited or read before initial usability');
  const search=h.nodes.budgetProjectSearch,draft=h.nodes.notePopVal;
  h.runTimers();await settle();assert.ok(h.buttons.every(btn=>btn.count.textContent==='…'));
  assert.equal(h.renderCount(),1);assert.equal(h.c.budgetFeature('comments:Budget:'+BID).status,'idle','projected counts cannot mark full discussion ready');
  g.resolve();await settle();
  assert.deepEqual(h.buttons.map(btn=>btn.count.textContent),['1','2','1','0','1'],'all mounted project/phase/file badges become numeric without click; empty file child omitted');
  assert.equal(h.renderCount(),1,'background completion patches mounted badges only');
  assert.equal(h.nodes.budgetProjectSearch,search);assert.equal(search.value,'retain current search');assert.equal(h.nodes.notePopVal,draft);assert.equal(draft.value,'retain current draft');
  assert.equal(h.buttons[0].classList.contains('has-recent'),true);assert.equal(h.buttons[1].classList.contains('has-recent'),true);
  assert.equal(h.c.budgetFeature('attachments:'+BID).status,'idle');assert.equal(h.c.S.attachmentsByBudget[BID],undefined,'projected file metadata is not a cached editor payload');
  assert.deepEqual(h.calls.filter(call=>call.method==='read'&&['comments','attachments'].includes(call.config.report_name)).map(call=>[call.config.report_name,call.config.fields]),[['comments','ID,Project,Budget,Added_Time,Deleted'],['attachments','ID,Budget,File_field1']]);
  assert.ok(h.maximum()>0&&h.maximum()<=3,'core and background native calls share the canonical maximum of three');
  const before=h.calls.length;
  const mounted=h.button('comments',OTHER,'Budget');h.c.syncBudgetCommentButtons();assert.equal(mounted.count.textContent,'0');assert.equal(h.calls.length,before,'filtered/newly mounted rows use the complete snapshot without N+1 reads');
  await h.c.loadBudgetComments('Budget',BID,true);await h.c.loadBudgetAttachments(BID,true);
  const detailReads=h.calls.slice(before).filter(call=>call.method==='read');assert.equal(detailReads.length,2);assert.ok(detailReads.every(call=>call.config.field_config==='all'),'individual open remains a fresh full-field parent read');
  assert.equal(h.c.S.commentRowsByParent['Budget:'+BID].length,2);assert.equal(h.c.S.attachmentsByBudget[BID].length,1);
}

// A failed/incomplete/malformed summary never presents zero or damages the usable landing.
for(const failure of ['denied','incomplete','fullOmitted']){
  const h=harness();h.gate[failure]=true;await h.c.boot();h.runTimers();await settle();
  assert.equal(h.c.S.startupReady,true);assert.equal(h.renderCount(),1);assert.equal(h.c.budgetFeature('comment-badges').status,'error');
  assert.ok(h.buttons.filter(btn=>btn.dataset.commentField).every(btn=>btn.count.textContent==='…'));
  assert.match(h.buttons[0].title,/unavailable/);
  if(failure==='denied')assert.equal(h.c.budgetFeature('comment-badges').error.permissionDenied,true);
  const reads=h.calls.filter(call=>call.method==='read'&&call.config.report_name==='comments');
  assert.equal(reads.length,failure==='denied'?0:failure==='incomplete'?1:2,'full-field fallback happens once only for missing projection fields, never for denied or incomplete native reads');
  if(failure==='fullOmitted'){
    const diagnostic=h.audits.find(entry=>entry.message==='Comment badge counts unavailable');
    assert.deepEqual(diagnostic.data.missingFields,['Deleted']);assert.equal(diagnostic.data.readMode,'all');assert.equal(diagnostic.data.recordCount,3);
    assert.deepEqual(diagnostic.data.availableFields,['Added_Time','Budget','ID','Project']);
    assert.ok(!JSON.stringify(diagnostic.data).includes(BID),'shape diagnostics contain field names/counts, never record IDs or rows');
  }
  h.gate[failure]=false;await h.c.loadBudgetBadgeSummary('comments');assert.equal(h.buttons[0].count.textContent,'1','a failed background batch remains retryable');
}

// A projected omission retries one complete full-field snapshot, without inferring absent lookups as zero.
{
  const h=harness();h.gate.omitted=true;await h.c.boot();h.runTimers();await settle();
  assert.deepEqual(h.buttons.map(btn=>btn.count.textContent),['1','2','1','0','1']);assert.equal(h.renderCount(),1);
  const reads=h.calls.filter(call=>call.method==='read'&&call.config.report_name==='comments');
  assert.equal(reads.length,2);assert.equal(reads[0].config.field_config,'custom');assert.equal(reads[1].config.field_config,'all');
  const evidence=h.audits.find(entry=>entry.message==='Projected badge fields unavailable; reading full fields');
  assert.deepEqual(evidence.data.missingFields,['Deleted']);assert.ok(!JSON.stringify(evidence.data).includes(BID));
  const before=h.calls.length;await h.c.loadBudgetBadgeSummary('comments');assert.equal(h.calls.length,before,'completed fallback is shared across rows and later calls');
}

// Native exact empty lookup objects are empty parents; malformed nonempty objects remain unavailable.
{
  const h=harness();for(const collection of [h.rows.comments,h.rows.attachments])for(const row of collection)for(const field of ['Project','Budget'])if(Array.isArray(row[field])&&row[field].length===0)row[field]={};
  await h.c.boot();h.runTimers();await settle();assert.deepEqual(h.buttons.map(btn=>btn.count.textContent),['1','2','1','0','1']);
  assert.equal(h.c.budgetCommentParentId({Budget:{}},'Budget'),'');assert.equal(h.c.attachmentRecordBudgetId({Budget:{}}),'');
  assert.equal(h.c.S.attachmentsByBudget[BID],undefined);await h.c.loadBudgetAttachments(BID,true);assert.equal(h.c.S.attachmentsByBudget[BID].length,1);
}
for(const kind of ['comments','attachments']){
  const h=harness();h.rows[kind][0].Budget={zc_display_value:'Missing native ID'};
  await h.c.boot();h.runTimers();await settle();
  const feature=kind==='comments'?'comment-badges':'attachment-badges';assert.equal(h.c.budgetFeature(feature).status,'error');
  assert.ok(h.buttons.filter(btn=>kind==='comments'?btn.dataset.commentField:btn.dataset.budgetAttachments).every(btn=>btn.count.textContent==='…'));
  assert.equal(h.calls.filter(call=>call.method==='read'&&call.config.report_name===kind).length,1,'malformed nonempty lookup never triggers a guessed full-field fallback');
}

// Late results from an older startup or actor/environment cannot publish count evidence.
for(const stale of ['startup','actor','environment']){
  const h=harness(),gate=deferred();h.gate.records=gate;await h.c.boot();h.runTimers();await settle();
  if(stale==='startup')h.c.resetBudgetBadgeSummaries();else if(stale==='actor')h.runtime.user='different-current-actor';else h.runtime.environment='DEVELOPMENT';
  gate.resolve();await settle();h.c.syncBudgetCommentButtons();h.c.syncBudgetAttachmentButtons();
  assert.ok(h.buttons.every(btn=>btn.count.textContent==='…'),'obsolete batch cannot assign numeric counts in another context');
  h.gate.records=null;h.c.scheduleBudgetBadgeSummaries();h.runTimers();await settle();assert.equal(h.buttons[0].count.textContent,'1','fresh current context rereads rather than relabeling old cache');
}

// Invalidation refreshes its batch automatically and supersedes prior scoped badge evidence.
// A new boot also supersedes the canonical native query, even while its previous GET is unresolved.
{
  const h=harness(),gate=deferred();h.gate.records=gate;
  await h.c.boot();h.runTimers();await settle();
  assert.equal(h.calls.filter(call=>call.config.report_name==='comments').length,2);
  h.rows.comments.push({ID:'90071992547409965',Project:[],Budget:{ID:BID},Added_Time:new Date().toISOString(),Deleted:false});
  await h.c.boot();h.runTimers();await settle();
  assert.equal(h.calls.filter(call=>call.config.report_name==='comments').length,4,'new startup issues fresh count/read instead of deduplicating an earlier native snapshot');
  gate.resolve();await settle();
  assert.equal(h.c.budgetCommentBadge('Budget',BID).count,3,'late older transport cannot overwrite the current startup snapshot');
  assert.equal(h.c.budgetFeature('comment-badges').status,'loaded');
  assert.ok(h.maximum()<=3);assert.equal(h.renderCount(),2,'only the two requested boots render the landing');
}

// Confirmed writes invalidate only the relevant shared snapshot.
{
  const h=harness();await h.c.boot();h.runTimers();await settle();
  h.c.rememberBudgetComments('Budget',BID,clone(h.rows.comments.filter(row=>row.Budget.ID===BID)));
  const before=h.calls.length;h.rows.comments.push({ID:'90071992547409964',Project:[],Budget:{ID:BID},Added_Time:new Date().toISOString(),Deleted:false});
  h.c.invalidateBudgetReports(['comments']);assert.equal(h.c.budgetBadgeCount(h.c.budgetCommentBadge('Budget',BID)),'…','older scoped full-row count cannot hide invalidation');
  h.runTimers();await settle();assert.equal(h.c.budgetCommentBadge('Budget',BID).count,3);assert.equal(h.buttons[1].count.textContent,'3');
  assert.deepEqual(h.calls.slice(before).map(call=>call.config.report_name),['comments','comments'],'unrelated attachment snapshot stays loaded; one complete comment batch refreshes');
  const next=h.calls.length;h.rows.attachments=h.rows.attachments.filter(row=>row.ID!=='90071992547409971');
  h.c.invalidateBudgetReports(['attachments']);h.runTimers();await settle();assert.equal(h.c.budgetAttachmentBadge(BID).count,0);assert.equal(h.buttons[2].count.textContent,'0');
  assert.deepEqual(h.calls.slice(next).map(call=>call.config.report_name),['attachments','attachments']);assert.equal(h.renderCount(),1);
}

// A newer scoped full response wins over a projection that started earlier.
{
  const h=harness(),gate=deferred();h.gate.records=gate;await h.c.boot();h.runTimers();await settle();
  h.c.rememberBudgetComments('Budget',BID,[{ID:'90071992547409969',Budget:{ID:BID},Added_Time:'2000-01-01',Deleted:false}]);
  gate.resolve();await settle();assert.equal(h.c.budgetCommentBadge('Budget',BID).count,1);assert.equal(h.buttons[1].count.textContent,'1');assert.equal(h.buttons[1].classList.contains('has-recent'),false,'older projection cannot restore stale recent activity over fresh full discussion');
}

// SDK2 lookup labels are display data; exact string IDs and loaded-parent matching remain unchanged.
{
  const context=vm.createContext({});for(const name of ['cleanVal','isObj','rawPath','firstRaw','lookupId','lookupName','lookupMatchesId','modifiedUser'])vm.runInContext(block(name),context);
  const native={ID:'90071992547409991',zc_display_value:'Native Creator label'},before=JSON.stringify(native);
  assert.equal(context.lookupName(native),'Native Creator label');assert.equal(context.modifiedUser({Modified_User:native}),'Native Creator label');
  assert.equal(context.lookupId(native),'90071992547409991');assert.equal(context.lookupMatchesId(native,'90071992547409991'),true);assert.equal(context.lookupMatchesId(native,'90071992547409990'),false);
  assert.equal(context.lookupName({...native,Name:'Explicit field'},['Name']),'Explicit field','caller field precedence retained');
  assert.equal(context.lookupName({ID:native.ID,display_value:'Legacy label'}),'Legacy label');assert.equal(JSON.stringify(native),before,'display fallback does not mutate identity');
}

console.log('Budget actual boot background badges: complete minimal-field counted batches, no-click numeric counts/file filtering, independent unknown failures/retry, startup+identity stale guards, fresh full-detail precedence, automatic scoped invalidation, unchanged controls/drafts, max3 native calls and native lookup labels passed.');
