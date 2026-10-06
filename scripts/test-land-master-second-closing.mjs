import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/land-master/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
function actual(name){const start=source.indexOf('function '+name+'('),end=source.indexOf('\nfunction ',start+1);assert.ok(start>=0&&end>start,name);return source.slice(start,end);}
const clone=value=>JSON.parse(JSON.stringify(value));
const ID='90071992547409931';
const legacy={ID,Status:'Active',Total_Lot_Obligation:'80',Initial_Closing_Date:'2026-10-01',Initial_Takedown:'10',Initial_Delay_Days:'30',Second_Closing_Lots:'',Second_Closing_Days:'',Continued_Takedown:'3',Continued_Takedown_Delay_Days:'90'};
async function settle(){for(let i=0;i<90;i++)await Promise.resolve();}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
function harness(record=legacy,isNew=false){
  const rec={Lots_Expected:'10',Takedown_End_Date:'12/30/2027',...clone(record)},server={...clone(rec)},nodes=new Map(),inputs=[],writes=[],reads=[],statuses=[],toasts=[];
  function node(id){if(!nodes.has(id))nodes.set(id,{id,value:'',textContent:'',disabled:false,attributes:{},focus(){this.focused=true;},classList:{add(){},remove(){}},getAttribute(key){return this.attributes[key]??null;},setAttribute(key,value){this.attributes[key]=value;},removeAttribute(key){delete this.attributes[key];}});return nodes.get(id);}
  for(const key of Object.keys(legacy).filter(key=>key!=='ID')){const input=node('f_'+key);input.value=rec[key]??'';input.attributes={'data-field':key,'data-original':String(input.value),'data-ftype':key==='Initial_Closing_Date'?'date':key==='Status'?'text':'number'};inputs.push(input);}
  const copy=node('copy'),c=vm.createContext({S:{liveSDK:true,editorType:'takedown',editorId:ID,editorNew:isNew,modalTab:'details',panelSaving:false,panelLoading:false,coreRefreshing:false,modalOpen:true,editorDraft:rec,takedownSchedules:isNew?[]:[rec],navigationToken:0},CFG:{reportCandidates:{}},generation:1,scope:'development:fixture',
    $:node,document:{querySelectorAll:selector=>selector.includes('[data-req]')?[]:selector.includes('[data-copy-second-closing]')?[...inputs,copy]:inputs},
    currentEditor:()=>rec,allowTableEdit:()=>true,landCreateReviewForEditor:()=>c.review||null,markInlineState:(el,state)=>{el.inlineState=state;},setStatus:(kind,message)=>statuses.push(message),showLandCreateReview(){},
    updateRecord:async(id,data,report)=>{writes.push({kind:'update',id,data:clone(data),report});return{code:3000,data:{ID:id}};},createRecord:async(type,data)=>{writes.push({kind:'create',type,data:clone(data)});return{code:3000,data:{ID}};},
    diag(){},renderCounts(){},closeRecordModal(){c.S.modalOpen=false;},showToast:message=>toasts.push(message),renderPanel(){c.renders=(c.renders||0)+1;},errMeta:error=>error?.message||String(error),
    listForType:()=>c.S.takedownSchedules,reportForType:()=> 'All_Takedown_Schedules',landCreateScope:()=>c.scope,landCreateGeneration:()=>c.generation,
    LMData:{request:(name,run)=>Promise.resolve().then(run),code:error=>String(error?.code||''),readAll:async config=>{reads.push(config);if(c.readError)throw c.readError;if(c.heldRead)await c.heldRead.promise;return clone(c.readRows??(c.readTransform?[c.readTransform(clone(server))]:[server]));}},
    ZOHO:{CREATOR:{DATA:{updateRecordById:async config=>nativeWrite('update',config),addRecords:async config=>nativeWrite('create',config)}}},
    nlToBr:value=>value,lookupLabel:()=>'',lookupId:value=>String(value?.ID||''),asList:value=>Array.isArray(value)?value:[],displayValue:value=>value??'',typeLabel:()=> 'Takedown Schedule',
    OPTS:{scheduleStatus:['Active','Behind','Completed']},esc:value=>String(value??'').replace(/[<>&"]/g,'')});
  async function nativeWrite(kind,config){writes.push(kind==='update'?{kind,id:config.id,data:clone(config.payload.data),report:config.report_name}:{kind,type:'takedown',data:clone(config.payload.data)});if(!c.dontPersist)Object.assign(server,clone(config.payload.data),c.derived||{});if(c.heldWrite)await c.heldWrite.promise;if(c.writeError)throw c.writeError;return c.writeResponse??{code:3000,data:{ID:config.id||ID}};}
  for(const name of ['toDateInput','toZohoDate','responseBad','candidates','sdkGetAll','isSuccess','requireMutationSuccess','extractRecordId','landCreateFreeze','landCreateCandidateId','landCreatedRow','F','descriptor','fieldHTML','inputRaw','normalizedRaw','takedownWholeValue','secondClosingFieldError','showTakedownCadenceError','validateTakedownCadenceFields','copySecondClosingToSubsequent','panelHasChanges','updatePanelActionState','payloadValue','takedownSaveStore','takedownSaveReviewForEditor','takedownSaveContextCurrent','takedownSavedNumber','takedownMutationItem','takedownMutationEvidenceSafe','takedownMutationCanonicalId','takedownSaveRowMatches','readTakedownSave','takedownSaveDefiniteRejection','saveTakedownRecord','showTakedownSaveReview','recheckTakedownSave','applyLocalField','landSuccessLabel','savePanel'])vm.runInContext(actual(name),c);
  return{c,rec,server,inputs,writes,reads,statuses,toasts,node,copy};
}

// Existing unmigrated schedules remain blank; unrelated updates retain their terms.
{
  const h=harness(),fields=h.c.descriptor('takedown',h.rec).fields;
  assert.equal(fields.find(field=>field.k==='Second_Closing_Lots').v,'');
  assert.equal(fields.find(field=>field.k==='Second_Closing_Days').v,'');
  assert.equal(h.c.panelHasChanges(),false);
  const lots=h.c.fieldHTML(fields.find(field=>field.k==='Second_Closing_Lots'));
  const days=h.c.fieldHTML(fields.find(field=>field.k==='Second_Closing_Days'));
  assert.match(lots,/Second Closing \(Lots\)/);
  assert.match(days,/Copy Second Closing to Subsequent Closings/);
  assert.match(days,/type="button" data-copy-second-closing/);
  assert.match(days,/value=""/,'Rendering must not fill blank legacy terms');
  assert.equal((fields.filter(field=>field.copySecond)).length,1);
  h.node('f_Status').value='Behind';h.c.savePanel();await settle();
  assert.deepEqual(h.writes,[{kind:'update',id:ID,data:{Status:'Behind'},report:'All_Takedown_Schedules'}]);
  assert.equal(h.rec.Second_Closing_Lots,'');assert.equal(h.rec.Second_Closing_Days,'');
}

// Every actual change to pace, total or its anchor requires explicit second terms.
for(const field of ['Total_Lot_Obligation','Initial_Closing_Date','Initial_Takedown','Initial_Delay_Days','Continued_Takedown','Continued_Takedown_Delay_Days']){
  const h=harness();h.node('f_'+field).value=field==='Initial_Closing_Date'?'2026-10-02':String(Number(h.node('f_'+field).value)+1);
  h.c.savePanel();await settle();assert.equal(h.writes.length,0,field);assert.match(h.node('panelMsg').textContent,/Second Closing lots/);
  assert.equal(h.node('f_Second_Closing_Lots').getAttribute('aria-invalid'),'true');
}
{
  const h=harness(legacy,true);h.c.savePanel();await settle();assert.equal(h.writes.length,0,'New schedules require Second Closing');
}
// Native DATA can bypass form validation: reject every numeric input that the
// shared helper cannot calculate, while preserving an untouched legacy record.
for(const [field,value] of [
  ['Total_Lot_Obligation','0'],['Total_Lot_Obligation','-1'],['Total_Lot_Obligation','1.5'],['Total_Lot_Obligation',''],
  ['Initial_Takedown','-1'],['Initial_Takedown','1.5'],['Initial_Takedown',''],
  ['Initial_Delay_Days','-1'],['Initial_Delay_Days','1.5'],['Initial_Delay_Days',''],
]){
  const h=harness({...legacy,Second_Closing_Lots:'7',Second_Closing_Days:'45'});h.node('f_'+field).value=value;h.c.savePanel();await settle();
  assert.equal(h.writes.length,0,'Invalid '+field+' must fail before the native DATA write');
  assert.equal(h.node('f_'+field).getAttribute('aria-invalid'),'true');assert.equal(h.node('f_'+field).focused,true);
  assert.equal(h.rec[field],legacy[field],'Rejected input must not mutate the saved snapshot');
}
{
  const h=harness({...legacy,Total_Lot_Obligation:'0',Initial_Takedown:'',Initial_Delay_Days:''});h.node('f_Status').value='Behind';h.c.savePanel();await settle();
  assert.deepEqual(h.writes[0].data,{Status:'Behind'},'Unrelated legacy edits do not force repair of historical numeric terms');
}
{
  const h=harness({...legacy,Second_Closing_Lots:'7',Second_Closing_Days:'45'});h.node('f_Initial_Takedown').value='0';h.node('f_Initial_Delay_Days').value='0';h.c.savePanel();await settle();
  assert.deepEqual(h.writes[0].data,{Initial_Takedown:'0',Initial_Delay_Days:'0'},'Explicit zero initial lots and zero grace match the shared helper');
}
{
  const h=harness({...legacy,Total_Lot_Obligation:'',Second_Closing_Lots:'7',Second_Closing_Days:'45'});h.node('f_Second_Closing_Lots').value='8';h.c.savePanel();await settle();
  assert.equal(h.writes.length,0,'Adding second terms cannot bypass an invalid existing total');
  assert.equal(h.node('f_Total_Lot_Obligation').getAttribute('aria-invalid'),'true');
}
for(const [field,value] of [['Second_Closing_Lots','0'],['Second_Closing_Lots','-1'],['Second_Closing_Lots','1.5'],['Second_Closing_Lots',''],['Second_Closing_Days','-1'],['Second_Closing_Days','1.5'],['Second_Closing_Days','']]){
  const h=harness({...legacy,Second_Closing_Lots:'7',Second_Closing_Days:'45'});h.node('f_'+field).value=value;h.c.savePanel();await settle();
  assert.equal(h.writes.length,0,field+' '+value);assert.equal(h.node('f_'+field).getAttribute('aria-invalid'),'true');
}
{
  const h=harness();h.node('f_Second_Closing_Lots').value='7';h.node('f_Second_Closing_Days').value='0';h.c.savePanel();await settle();
  assert.deepEqual(h.writes[0].data,{Second_Closing_Lots:'7',Second_Closing_Days:'0'},'Explicit zero-day Second Closing saves without filling or rewriting the recurrence');
  assert.equal(h.rec.Continued_Takedown,'3');assert.equal(h.rec.Continued_Takedown_Delay_Days,'90');
}
for(const [field,value] of [['Continued_Takedown','0'],['Continued_Takedown','1.5'],['Continued_Takedown_Delay_Days','0'],['Continued_Takedown_Delay_Days','1.5']]){
  const h=harness({...legacy,Second_Closing_Lots:'7',Second_Closing_Days:'45'});h.node('f_'+field).value=value;h.c.savePanel();await settle();
  assert.equal(h.writes.length,0,'Remaining obligation requires a usable recurring pace');assert.equal(h.node('f_'+field).getAttribute('aria-invalid'),'true');
}
{
  const h=harness({...legacy,Total_Lot_Obligation:'20',Continued_Takedown:'',Continued_Takedown_Delay_Days:''});h.node('f_Second_Closing_Lots').value='10';h.node('f_Second_Closing_Days').value='45';h.c.savePanel();await settle();
  assert.deepEqual(h.writes[0].data,{Second_Closing_Lots:'10',Second_Closing_Days:'45'},'No recurring pace is required when initial and second meet the obligation');
}
for(const [field,value] of [['Continued_Takedown','-1'],['Continued_Takedown','1.5'],['Continued_Takedown_Delay_Days','-1'],['Continued_Takedown_Delay_Days','1.5']]){
  const h=harness({...legacy,Total_Lot_Obligation:'20',Second_Closing_Lots:'10',Second_Closing_Days:'45',Continued_Takedown:'',Continued_Takedown_Delay_Days:''});h.node('f_'+field).value=value;h.c.savePanel();await settle();
  assert.equal(h.writes.length,0,'Supplied recurrence still follows helper numeric rules after the obligation is exhausted');
  assert.equal(h.node('f_'+field).getAttribute('aria-invalid'),'true');
}

// Explicit copy stages only the recurring pair; neither editing nor copying writes.
{
  const h=harness();h.node('f_Second_Closing_Lots').value='7';h.node('f_Second_Closing_Days').value='45';h.c.updatePanelActionState();
  assert.equal(h.node('f_Continued_Takedown').value,'3');assert.equal(h.node('f_Continued_Takedown_Delay_Days').value,'90');
  assert.equal(h.c.copySecondClosingToSubsequent(),true);assert.equal(h.writes.length,0);
  assert.equal(h.rec.Second_Closing_Lots,'');assert.equal(h.rec.Continued_Takedown,'3','Copy must not mutate the saved record before Save');
  assert.equal(h.node('f_Continued_Takedown').value,'7');assert.equal(h.node('f_Continued_Takedown_Delay_Days').value,'45');
  assert.equal(h.node('f_Continued_Takedown').getAttribute('data-original'),'3');assert.equal(h.c.S.panelDirty,true);
  h.c.savePanel();await settle();assert.deepEqual(h.writes[0].data,{Second_Closing_Lots:'7',Second_Closing_Days:'45',Continued_Takedown:'7',Continued_Takedown_Delay_Days:'45'});
}
for(const guard of ['panelSaving','panelLoading','coreRefreshing','review']){
  const h=harness({...legacy,Second_Closing_Lots:'7',Second_Closing_Days:'45'});if(guard==='review')h.c.review={};else h.c.S[guard]=true;
  assert.equal(h.c.copySecondClosingToSubsequent(),false,guard);assert.equal(h.node('f_Continued_Takedown').value,'3');
  if(guard==='panelSaving'||guard==='review'){h.c.updatePanelActionState();assert.equal(h.copy.disabled,true,'Copy is locked with the committing controls');}
}
{
  const h=harness();assert.equal(h.c.copySecondClosingToSubsequent(),false);assert.equal(h.node('f_Continued_Takedown').value,'3');
}
assert.match(source,/closest\('\[data-copy-second-closing\]'\)\)\{copySecondClosingToSubsequent\(\);return;\}/,'The explicit click is connected to the staged copy action');

// The actual mounted Save uses a fresh exact-ID read before any success UI,
// and copies the server's calculated values rather than the staged status.
{
  const h=harness({...legacy,Second_Closing_Lots:'7',Second_Closing_Days:'45'}),held=deferred();h.c.heldRead=held;
  h.c.derived={Lots_Expected:27,Takedown_End_Date:'05/21/2027',Status:'Behind'};
  h.node('f_Second_Closing_Lots').value='8';h.node('f_Status').value='Completed';h.c.savePanel();await settle();
  assert.equal(h.writes.length,1);assert.equal(h.reads.length,1);assert.equal(h.reads[0].reportName,'All_Takedown_Schedules');
  assert.equal(h.reads[0].criteria,'(ID == '+ID+')');assert.equal(h.reads[0].fresh,true);
  assert.equal(h.toasts.length,0);assert.equal(h.c.S.panelSaving,true);assert.equal(h.node('btnPanelSave').disabled,true);assert.equal(h.copy.disabled,true);
  assert.equal(h.rec.Lots_Expected,'10');assert.equal(h.rec.Status,'Active','Do not publish staged or derived data before readback');
  assert.equal(h.c.savePanel(),false,'Captured saves block another click while verification is pending');assert.equal(h.writes.length,1);
  held.resolve();await settle();assert.equal(h.rec.Second_Closing_Lots,'8');assert.equal(h.rec.Lots_Expected,27);
  assert.equal(h.rec.Takedown_End_Date,'05/21/2027');assert.equal(h.rec.Status,'Behind','Server status can differ from the submitted status');
  assert.equal(h.c.S.modalOpen,false);assert.equal(h.toasts.length,1);assert.equal(h.c.takedownSaveReviewForEditor(),null);
}

// Every submitted numeric/anchor field must be present and equal, even if
// native formatting differs. A zero value must never collapse into blank.
const migrated={...legacy,Second_Closing_Lots:'7',Second_Closing_Days:'45'};
for(const field of ['Total_Lot_Obligation','Initial_Takedown','Initial_Delay_Days','Second_Closing_Lots','Second_Closing_Days','Continued_Takedown','Continued_Takedown_Delay_Days','Initial_Closing_Date'])for(const fault of ['mismatch','missing']){
  const h=harness(migrated);h.node('f_'+field).value=field==='Initial_Closing_Date'?'2026-10-02':String(Number(h.node('f_'+field).value)+1);
  h.c.readTransform=row=>{if(fault==='missing')delete row[field];else row[field]=field==='Initial_Closing_Date'?'10/03/2026':String(Number(row[field])+1);return row;};
  h.c.savePanel();await settle();assert.equal(h.writes.length,1,field+' '+fault);assert.equal(h.toasts.length,0);
  assert.equal(h.c.S.modalOpen,true);assert.ok(h.c.S.takedownSaveReviews[ID]);assert.equal(h.node('btnPanelSave').disabled,true);
  assert.equal(h.statuses.at(-1),'Save needs review','Unverified persistence must not be reported as a definite failed write');
  assert.equal(h.c.copySecondClosingToSubsequent(),false,'Copy cannot change a captured uncertain write');
  assert.equal(h.c.savePanel(),false);assert.equal(h.writes.length,1,'Read mismatch cannot blindly replay '+field);
  assert.equal(h.rec[field],migrated[field]);
}
for(const field of ['Initial_Takedown','Initial_Delay_Days','Second_Closing_Days'])for(const returned of [0,'0.0','',null]){
  const h=harness(migrated);h.node('f_'+field).value='0';h.c.readTransform=row=>({...row,[field]:returned});h.c.savePanel();await settle();
  assert.equal(h.toasts.length,returned===0||returned==='0.0'?1:0,field+' returned '+String(returned));
  assert.equal(h.writes[0].data[field],'0','The explicit zero is sent');
}
{
  const h=harness(migrated);h.node('f_Total_Lot_Obligation').value='1000';h.c.readTransform=row=>({...row,Total_Lot_Obligation:'1,000.00'});h.c.savePanel();await settle();
  assert.equal(h.toasts.length,1,'Creator display formatting is compared numerically');assert.equal(h.rec.Total_Lot_Obligation,'1,000.00');
  const fields=h.c.descriptor('takedown',h.rec).fields;
  for(const field of fields.filter(field=>field.type==='number')){
    const html=h.c.fieldHTML(field),value=html.match(/ value="([^"]*)"/)[1],original=html.match(/data-original="([^"]*)"/)[1];
    assert.equal(value,original,'Reopened numeric inputs and their saved baseline must agree');assert.doesNotMatch(value,/,/,'Native number inputs may not receive display commas');
    const input=h.node('f_'+field.k);input.value=value;input.attributes['data-original']=original;
  }
  assert.equal(h.node('f_Total_Lot_Obligation').value,'1000');assert.equal(h.c.panelHasChanges(),false,'Formatted authoritative hydration reopens without losing the total or marking it changed');
}
for(const raw of [null,'',0,'0.00','1,000.00']){
  const h=harness({...legacy,Second_Closing_Days:raw}),field=h.c.descriptor('takedown',h.rec).fields.find(field=>field.k==='Second_Closing_Days'),html=h.c.fieldHTML(field),expected=raw===null||raw===''?'':raw==='1,000.00'?'1000':'0';
  assert.ok(html.includes('value="'+expected+'"'));assert.ok(html.includes('data-original="'+expected+'"'),'Number rendering preserves blank versus zero');
}
{
  const h=harness(migrated);h.node('f_Initial_Closing_Date').value='2026-10-02';h.c.readTransform=row=>({...row,Initial_Closing_Date:'02-Oct-2026'});h.c.savePanel();await settle();
  assert.equal(h.writes[0].data.Initial_Closing_Date,'10/02/2026');assert.equal(h.toasts.length,1,'Native and editor date formats identify the same anchor');
}
{
  const h=harness(migrated),attempt={payload:{Takedown_Start_Date:'10/02/2026'}};
  assert.equal(h.c.takedownSaveRowMatches({...h.server,Takedown_Start_Date:'2026-10-02'},attempt),true);
  assert.equal(h.c.takedownSaveRowMatches({...h.server,Takedown_Start_Date:'2026-10-03'},attempt),false,'A submitted auto-clock anchor must match too');
  assert.equal(h.c.takedownSaveRowMatches(h.server,attempt),false,'A submitted clock field may not disappear');
}
for(const returned of ['',null,0,'0',undefined]){
  const h=harness({...migrated,Total_Lot_Obligation:'17'});h.node('f_Continued_Takedown').value='';h.node('f_Continued_Takedown_Delay_Days').value='';
  h.c.readTransform=row=>{for(const field of ['Continued_Takedown','Continued_Takedown_Delay_Days'])if(returned===undefined)delete row[field];else row[field]=returned;return row;};
  h.c.savePanel();await settle();assert.deepEqual(h.writes[0].data,{Continued_Takedown:'',Continued_Takedown_Delay_Days:''});
  assert.equal(h.toasts.length,returned===''||returned===null?1:0,'Explicit blank recurrence: '+String(returned));
}
for(const field of ['Lots_Expected','Takedown_End_Date','Status']){
  const h=harness(migrated);h.node('f_Second_Closing_Lots').value='8';h.c.readTransform=row=>{delete row[field];return row;};h.c.savePanel();await settle();
  assert.equal(h.toasts.length,0,'Missing calculated field '+field+' cannot be called refreshed');assert.ok(h.c.S.takedownSaveReviews[ID]);
}
for(const patch of [{Lots_Expected:'invalid'},{Lots_Expected:{}},{Takedown_End_Date:'invalid'},{Status:''},{Status:null}]){
  const h=harness(migrated);h.node('f_Second_Closing_Lots').value='8';h.c.readTransform=row=>({...row,...patch});h.c.savePanel();await settle();
  assert.equal(h.toasts.length,0,'Malformed calculated fields retain the review');assert.ok(h.c.S.takedownSaveReviews[ID]);
}
{
  const h=harness({...legacy,Lots_Expected:'',Takedown_End_Date:''});h.node('f_Status').value='Behind';h.c.savePanel();await settle();
  assert.equal(h.toasts.length,1,'Historical blank calculations may remain blank after an unrelated edit');assert.equal(h.rec.Lots_Expected,'');assert.equal(h.rec.Second_Closing_Lots,'');
}
for(const rows of [[],[{...migrated,ID:'90071992547409932'}],[{...migrated,ID:Number(ID)}],[{...migrated},{...migrated}]]){
  const h=harness(migrated);h.node('f_Second_Closing_Lots').value='8';h.c.readRows=rows;h.c.savePanel();await settle();
  assert.equal(h.toasts.length,0);assert.ok(h.c.S.takedownSaveReviews[ID]);assert.equal(h.c.savePanel(),false);assert.equal(h.writes.length,1,'Missing, competing, numeric or wrong IDs cannot permit replay');
}

// Permission/read errors happen after a confirmed mutation too: retain the
// attempted save and recover through a new read, never through another write.
for(const error of [new Error('Read unavailable'),Object.assign(new Error('Read denied'),{code:2899})]){
  const h=harness(migrated);h.node('f_Second_Closing_Lots').value='8';h.c.readError=error;h.c.savePanel();await settle();
  assert.equal(h.toasts.length,0);assert.ok(h.c.S.takedownSaveReviews[ID]);assert.equal(h.node('f_Second_Closing_Lots').disabled,true);
  assert.match(h.node('panelMsg').innerHTML,/Recheck saved record/);assert.equal(h.c.savePanel(),false);assert.equal(h.writes.length,1);
  delete h.c.readError;h.c.derived={};h.server.Lots_Expected='28';h.server.Takedown_End_Date='05/21/2027';h.server.Status='Behind';
  assert.equal(await h.c.recheckTakedownSave(ID),true);assert.equal(h.writes.length,1);assert.equal(h.reads.length,2);
  assert.equal(h.rec.Second_Closing_Lots,'8');assert.equal(h.rec.Lots_Expected,'28');assert.equal(h.rec.Status,'Behind');assert.equal(h.c.S.takedownSaveReviews[ID],undefined);
}
{
  const h=harness(migrated);h.node('f_Second_Closing_Lots').value='8';h.c.writeError=new Error('Lost acknowledgement');h.c.savePanel();await settle();
  assert.ok(h.c.S.takedownSaveReviews[ID]);assert.equal(h.reads.length,0);assert.equal(h.c.savePanel(),false);assert.equal(h.writes.length,1);
  assert.equal(await h.c.recheckTakedownSave(ID),true,'The captured known update ID permits safe read-only reconciliation after a lost reply');assert.equal(h.writes.length,1);
}
{
  const h=harness(migrated);h.node('f_Second_Closing_Lots').value='8';h.c.writeResponse={code:1060,message:'Validation rejected'};h.c.dontPersist=true;h.c.savePanel();await settle();
  assert.equal(h.c.S.takedownSaveReviews[ID],undefined,'An unambiguous rejected mutation can be corrected and resubmitted');assert.equal(h.reads.length,0);assert.equal(h.toasts.length,0);
  delete h.c.writeResponse;delete h.c.dontPersist;h.c.savePanel();await settle();assert.equal(h.writes.length,2);assert.equal(h.toasts.length,1);
}
for(const response of [
  {code:2899,details:{code:3000,data:{ID}}},
  {code:2899,details:{record:{ID}}},
  {code:2899,success:true},
  {code:2899,status:'Saved'},
  {code:3000,result:[{code:2899,details:{code:3000,data:{ID}}}]},
  {code:2899,details:JSON.stringify({code:3000,data:{ID}})},
  {code:2899,details:{output:JSON.stringify({code:3000,data:{ID}})}},
  {code:2899,responseText:'{"code":3000,"data":{"ID":'},
]){
  const h=harness(migrated);h.node('f_Second_Closing_Lots').value='8';h.c.writeResponse=response;h.c.savePanel();await settle();
  assert.ok(h.c.S.takedownSaveReviews[ID],'Competing nested ID or success evidence keeps the attempted save');assert.equal(h.c.savePanel(),false);assert.equal(h.writes.length,1);assert.equal(h.toasts.length,0);
  assert.equal(await h.c.recheckTakedownSave(ID),true,'The known update ID can reconcile only by reading');assert.equal(h.writes.length,1);
}
for(const response of [{code:2899,message:'Denied',details:{field:'Status',message:'Access denied'}},{code:3000,result:[{code:2899,message:'Denied'}]}]){
  const h=harness(migrated);h.node('f_Second_Closing_Lots').value='8';h.c.writeResponse=response;h.c.dontPersist=true;h.c.savePanel();await settle();
  assert.equal(h.c.S.takedownSaveReviews[ID],undefined,'One canonical rejection without competing evidence remains correctable');assert.equal(h.toasts.length,0);
}

// Only canonical native data.ID can identify a new record. Any other ID
// evidence quarantines the acknowledgement, even if the wrong row matches.
const OTHER='90071992547409932';
for(const response of [
  {code:3000,ID:OTHER,data:{ID}},
  {code:3000,id:OTHER,data:{ID}},
  {code:3000,data:{ID,id:OTHER}},
  {code:3000,details:{record:{ID:OTHER}},data:{ID}},
  {code:3000,ID:OTHER,result:[{code:3000,data:{ID}}]},
]){
  const h=harness(migrated,true);h.c.writeResponse=response;h.c.readRows=[{...h.server,ID:OTHER}];h.c.savePanel();await settle();
  assert.equal(h.reads.length,0,'A conflicting acknowledgement may not choose either record for verification');assert.equal(h.c.S.editorNew,true);assert.equal(h.c.S.takedownSchedules.length,0);assert.ok(h.c.S.takedownSaveReviews.new);
  assert.equal(h.c.S.takedownSaveReviews.new.id,'');assert.equal(h.toasts.length,0);assert.equal(h.c.savePanel(),false);assert.equal(h.writes.length,1);
  assert.equal(await h.c.recheckTakedownSave('new'),false);assert.equal(h.reads.length,0);assert.equal(h.writes.length,1);
}

// New schedules share the same predicate and become one cached exact-ID row.
for(const failure of ['none','read','unknown-id']){
  const h=harness(migrated,true);h.c.derived={Lots_Expected:20,Takedown_End_Date:'05/21/2027',Status:'Active'};
  if(failure==='read')h.c.readError=new Error('Read unavailable');if(failure==='unknown-id')h.c.writeResponse={code:3000};
  h.c.savePanel();await settle();assert.equal(h.writes.length,1);assert.equal(h.writes[0].kind,'create');
  if(failure==='none'){assert.equal(h.c.S.editorNew,false);assert.equal(h.c.S.editorId,ID);assert.equal(h.c.S.takedownSchedules.length,1);assert.equal(h.rec.Lots_Expected,20);}
  else{assert.equal(h.c.S.editorNew,true);assert.equal(h.c.S.takedownSchedules.length,0);assert.ok(h.c.S.takedownSaveReviews.new);assert.equal(h.c.savePanel(),false);assert.equal(h.writes.length,1);assert.equal(h.toasts.length,0);
    delete h.c.readError;assert.equal(await h.c.recheckTakedownSave('new'),failure==='read');assert.equal(h.writes.length,1);
    if(failure==='read'){assert.equal(h.c.S.editorNew,false);assert.equal(h.c.S.takedownSchedules.length,1);assert.equal(h.c.S.takedownSchedules[0].Lots_Expected,20);}
    else assert.equal(h.reads.length,0,'An unknown created ID cannot be searched by similar terms or inserted again');
  }
}
for(const change of ['navigation','draft-identity','already-newer-draft']){
  const h=harness(migrated,true);h.c.readError=new Error('Read unavailable');h.c.savePanel();await settle();delete h.c.readError;
  const laterDraft={Second_Closing_Lots:'12',Second_Closing_Days:'60'},held=deferred();h.c.heldRead=held;
  if(change==='already-newer-draft'){h.c.S.navigationToken++;h.c.S.editorDraft=laterDraft;h.c.S.editorId=null;}
  const checking=h.c.recheckTakedownSave('new');await settle();
  if(change!=='already-newer-draft'){if(change==='navigation')h.c.S.navigationToken++;h.c.S.editorDraft=laterDraft;h.c.S.editorId=null;}
  h.node('f_Second_Closing_Lots').value='12';h.node('f_Second_Closing_Days').value='60';const renders=h.c.renders||0;
  held.resolve();assert.equal(await checking,true,'Original saved row may still be verified and cached');
  assert.equal(h.c.S.editorNew,true,'A late recheck cannot turn the later new editor into the old saved record');assert.equal(h.c.S.editorId,null);assert.equal(h.c.S.editorDraft,laterDraft);assert.equal(h.node('f_Second_Closing_Lots').value,'12');
  assert.equal(h.c.renders||0,renders,'A late or unrelated recovery cannot repaint the newer panel');assert.equal(h.c.S.takedownSchedules.length,1);assert.equal(h.c.S.takedownSchedules[0].ID,ID);assert.equal(h.writes.length,1);
}
for(const change of ['generation','actor']){
  const h=harness(migrated),held=deferred();h.node('f_Second_Closing_Lots').value='8';h.c.heldRead=held;h.c.savePanel();await settle();
  if(change==='generation')h.c.generation++;else h.c.scope='production:another actor';held.resolve();await settle();
  assert.equal(h.toasts.length,0);assert.equal(h.rec.Second_Closing_Lots,'7');assert.ok(h.c.S.takedownSaveReviews[ID]);assert.equal(h.c.savePanel(),false);assert.equal(h.writes.length,1);
  delete h.c.heldRead;assert.equal(await h.c.recheckTakedownSave(ID),change==='generation','A read-only recheck requires the captured actor but can use newly loaded data');assert.equal(h.writes.length,1);
}
{
  const h=harness(migrated),held=deferred();h.c.heldWrite=held;const payload={Second_Closing_Lots:'8',Second_Closing_Days:'0'};
  const saving=h.c.saveTakedownRecord(ID,payload,false);await settle();payload.Second_Closing_Lots='99';
  assert.equal(h.c.S.takedownSaveReviews[ID].payload.Second_Closing_Lots,'8');assert.ok(Object.isFrozen(h.c.S.takedownSaveReviews[ID].payload));
  assert.equal(await h.c.recheckTakedownSave(ID),false,'Read-only recovery cannot race an active write');assert.equal(h.reads.length,0);
  held.resolve();const response=await saving;assert.equal(response.verifiedRow.Second_Closing_Lots,'8');assert.equal(h.writes.length,1);
}
{
  const h=harness();h.c.S.editorType='company';h.node('f_Status').value='Behind';h.c.savePanel();await settle();
  assert.equal(h.writes.length,1);assert.equal(h.reads.length,0,'Other object editors retain their existing generic save path');assert.equal(h.toasts.length,1);
}
assert.match(source,/closest\('\[data-recheck-takedown-save\]'\)/,'The mounted review action is connected to read-only recovery');
console.log('Land Master Second Closing passed: cadence validation and explicit copy; fresh exact-ID save/readback; numeric zero/blank/date comparisons; authoritative derived refresh; historical unrelated edits; uncertain write/read quarantine and read-only recovery; new records, context changes and generic-save preservation.');
