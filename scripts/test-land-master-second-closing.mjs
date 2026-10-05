import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/land-master/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
function actual(name){const start=source.indexOf('function '+name+'('),end=source.indexOf('\nfunction ',start+1);assert.ok(start>=0&&end>start,name);return source.slice(start,end);}
const clone=value=>JSON.parse(JSON.stringify(value));
const ID='90071992547409931';
const legacy={ID,Status:'Active',Total_Lot_Obligation:'80',Initial_Closing_Date:'2026-10-01',Initial_Takedown:'10',Initial_Delay_Days:'30',Second_Closing_Lots:'',Second_Closing_Days:'',Continued_Takedown:'3',Continued_Takedown_Delay_Days:'90'};
async function settle(){for(let i=0;i<20;i++)await Promise.resolve();}
function harness(record=legacy,isNew=false){
  const rec=clone(record),nodes=new Map(),inputs=[],writes=[],statuses=[];
  function node(id){if(!nodes.has(id))nodes.set(id,{id,value:'',textContent:'',disabled:false,attributes:{},focus(){this.focused=true;},classList:{add(){},remove(){}},getAttribute(key){return this.attributes[key]??null;},setAttribute(key,value){this.attributes[key]=value;},removeAttribute(key){delete this.attributes[key];}});return nodes.get(id);}
  for(const key of Object.keys(legacy).filter(key=>key!=='ID')){const input=node('f_'+key);input.value=rec[key]??'';input.attributes={'data-field':key,'data-original':String(input.value),'data-ftype':key==='Initial_Closing_Date'?'date':key==='Status'?'text':'number'};inputs.push(input);}
  const copy=node('copy'),c=vm.createContext({S:{editorType:'takedown',editorId:ID,editorNew:isNew,modalTab:'details',panelSaving:false,panelLoading:false,coreRefreshing:false,modalOpen:true,editorDraft:rec,takedownSchedules:[rec]},
    $:node,document:{querySelectorAll:selector=>selector.includes('[data-req]')?[]:selector.includes('[data-copy-second-closing]')?[...inputs,copy]:inputs},
    currentEditor:()=>rec,allowTableEdit:()=>true,landCreateReviewForEditor:()=>c.review||null,markInlineState:(el,state)=>{el.inlineState=state;},setStatus:(kind,message)=>statuses.push(message),showLandCreateReview(){},
    updateRecord:async(id,data,report)=>{writes.push({kind:'update',id,data:clone(data),report});return{code:3000,data:{ID:id}};},createRecord:async(type,data)=>{writes.push({kind:'create',type,data:clone(data)});return{code:3000,data:{ID}};},
    diag(){},renderCounts(){},closeRecordModal(){c.S.modalOpen=false;},showToast(){},renderPanel(){},errMeta:error=>error.message,
    listForType:()=>[],reportForType:()=> 'All_Takedown_Schedules',extractRecordId:response=>response.data.ID,
    toZohoDate:value=>value,toDateInput:value=>value,nlToBr:value=>value,lookupLabel:()=>'',lookupId:value=>String(value?.ID||''),asList:value=>Array.isArray(value)?value:[],displayValue:value=>value??'',typeLabel:()=> 'Takedown Schedule',
    OPTS:{scheduleStatus:['Active','Behind','Completed']},esc:value=>String(value??'').replace(/[<>&"]/g,'')});
  for(const name of ['F','descriptor','fieldHTML','inputRaw','normalizedRaw','takedownWholeValue','secondClosingFieldError','showTakedownCadenceError','validateTakedownCadenceFields','copySecondClosingToSubsequent','panelHasChanges','updatePanelActionState','payloadValue','applyLocalField','savePanel'])vm.runInContext(actual(name),c);
  return{c,rec,inputs,writes,statuses,node,copy};
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
console.log('Land Master Second Closing: legacy unrelated saves, required terms on cadence/total/anchor edits, integer validation, zero-day support, conditional recurrence and guarded explicit staged copy passed.');
