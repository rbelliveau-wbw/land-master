import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {ready,ID,ACCESS,SUB} from './test-contract-sdk-v2-foundation.mjs';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

// Optional capture directories run the same checks against reopened Creator
// source without requiring native capture artifacts in ordinary repository CI.
const captureOption=name=>process.argv.find(arg=>arg.startsWith(name+'='))?.slice(name.length+1);
const functionCapture=captureOption('--native-function-dir'),workflowCapture=captureOption('--native-workflow-dir');
const nativeSource=(kind,name)=>fs.readFileSync((kind==='functions'?functionCapture:workflowCapture)?path.join(kind==='functions'?functionCapture:workflowCapture,name+'.reopened.dg'):path.join('creator',kind,name+'.dg'),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
const legacy={ID,Contract_Type:'Lot (Master)',Status:'New',Subdivision1:[{ID:SUB}],Number_of_Lots:50,Initial_Takedown:10,Initial_Takedown_Days:30,Subsequent_Takedown_Lots:5,Subsequent_Takedown_Days:30};
const modern={...legacy,Second_Closing_Lots:15,Second_Closing_Days:45};
const terms=record=>Object.fromEntries(['Number_of_Lots','Initial_Takedown','Initial_Takedown_Days','Second_Closing_Lots','Second_Closing_Days','Subsequent_Takedown_Lots','Subsequent_Takedown_Days'].map(field=>[field,record[field]==null?'':String(record[field])]));
const h=await ready({realDOM:true}),c=h.c;
c.S.nc={sub:[SUB],lotIds:[]};
assert.deepEqual(plain(c.clpTermChanges(legacy,terms(legacy))),{},'untouched legacy terms are not migrated during unrelated edits');
assert.throws(()=>c.clpTermChanges(legacy,{...terms(legacy),Initial_Takedown_Days:'31'}),/Second Closing lots/,'editing historical terms requires an explicit second pair');
assert.deepEqual(plain(c.clpTermChanges(legacy,terms(modern))),{Second_Closing_Lots:15,Second_Closing_Days:45});
for(const [field,values] of [['Number_of_Lots',['',0,-1,1.5]],['Initial_Takedown',['',-1,1.5]],['Initial_Takedown_Days',['',-1,1.5]]])for(const value of values){
 assert.throws(()=>c.clpTermChanges(modern,{...terms(modern),[field]:value}),/Total lots|total lot count|Initial Closing|whole numbers/,'converted term saves reject invalid '+field);
 assert.ok(c.lotCompletionBlockers({...modern,[field]:value}).length,'completion rejects invalid three-tier '+field);
}
assert.deepEqual(plain(c.clpTermChanges({...legacy,Number_of_Lots:0},terms({...legacy,Number_of_Lots:0}))),{},'untouched legacy zero total does not widen the validation scope');
assert.deepEqual(plain(c.clpTermChanges(modern,terms({...modern,Initial_Takedown:0,Initial_Takedown_Days:0}))),{Initial_Takedown:0,Initial_Takedown_Days:0},'explicit zero initial inputs remain valid');
for(const value of ['',0,-1,1.5,'bad'])assert.throws(()=>c.clpTermChanges(modern,{...terms(modern),Second_Closing_Lots:value}),/Second Closing|whole numbers/);
for(const value of ['',-1,1.5,'bad'])assert.throws(()=>c.clpTermChanges(modern,{...terms(modern),Second_Closing_Days:value}),/Second Closing|whole numbers/);
assert.deepEqual(plain(c.clpTermChanges(modern,{...terms(modern),Second_Closing_Days:'0'})),{Second_Closing_Days:0},'zero second delay is explicit and valid');
assert.throws(()=>c.clpTermChanges(modern,{...terms(modern),Subsequent_Takedown_Days:'0'}),/greater than zero/);
assert.deepEqual(plain(c.clpTermChanges({...modern,Number_of_Lots:25},terms({...modern,Number_of_Lots:25,Subsequent_Takedown_Lots:0,Subsequent_Takedown_Days:0}))),{Subsequent_Takedown_Lots:0,Subsequent_Takedown_Days:0},'recurring cadence may be zero when initial plus second exhausts the obligation');
assert.deepEqual(plain(c.lotCompletionBlockers(legacy)),[],'untouched legacy completion remains available');
assert.ok(c.lotCompletionBlockers({...legacy,Second_Closing_Lots:15}).some(value=>/Second Closing days/.test(value)),'partial second pair blocks completion');
assert.deepEqual(plain(c.lotCompletionBlockers({...modern,Number_of_Lots:25,Subsequent_Takedown_Lots:null,Subsequent_Takedown_Days:null})),[]);
assert.doesNotMatch(c.lotClosingSummary(legacy),/Second:/,'legacy summaries never infer a Second Closing');
assert.equal(c.lotClosingSummary(modern),"Initial: 10 lots / 30 days\nSecond: 15 lots / 45 days\nCont'd: 5 lots / 30 days");

c.S.nc={type:'Lot (Master)',project:'p1',parent:'',sub:[SUB],builder:'b1',name:'Three closings',territory:'Waco',wbw:[],owners:[],lotIds:[],ppf:{},totalLots:'50',initLots:'10',initDays:'30',secondLots:'15',secondDays:'0',contLots:'5',contDays:'30'};
c.S.projects=[{ID:'p1',Territory:'Waco'}];c.S.subdivisions=[{ID:SUB,Project:{ID:'p1'},Territory:'Waco'}];
let payload=c.ncPayload();assert.equal(payload.Second_Closing_Lots,15);assert.equal(payload.Second_Closing_Days,0);assert.equal(payload.Initial_Takedown_Days,30);assert.equal(c.ncSeqDone('terms'),true);
c.S.nc.secondDays='';assert.throws(()=>c.ncPayload(),/Second Closing days/);assert.equal(c.ncSeqDone('terms'),false);c.S.nc.secondDays='45';
const html=c.ncClosingFields(c.S.nc);assert.match(html,/Initial Closing.*Second Closing.*Copy to Subsequent.*Subsequent Closings/);assert.match(html,/id="nc_slots".*id="nc_sdays"/);
assert.equal(c.ncCopySecondClosing(),true);assert.equal(c.S.nc.contLots,'15');assert.equal(c.S.nc.contDays,'45');
c.S.nc.secondLots='20';c.S.nc.secondDays='60';assert.equal(c.S.nc.contLots,'15');assert.equal(c.S.nc.contDays,'45','copy is one-shot, later second edits are not linked');
c.S.nc.contLots='7';assert.equal(c.S.nc.secondLots,'20','subsequent edits do not alter Second Closing');
c.S.clp={cid:ID,terms:terms(modern)};let repaints=0;c.clpRepaint=()=>{repaints++;};
assert.equal(c.clpCopySecondClosing(),true);assert.equal(repaints,1);assert.equal(c.S.clp.terms.Subsequent_Takedown_Lots,'15');assert.equal(c.S.clp.terms.Subsequent_Takedown_Days,'45');
c.S.clp.terms.Second_Closing_Lots='18';assert.equal(c.S.clp.terms.Subsequent_Takedown_Lots,'15');assert.deepEqual(plain(c.clpTermChanges(modern,c.S.clp.terms)),{Second_Closing_Lots:18,Subsequent_Takedown_Lots:15,Subsequent_Takedown_Days:45},'copied values are ordinary pending field changes');
const clpHTML=c.clpTermsPanel();assert.match(clpHTML,/Initial Closing.*Second Closing.*Subsequent Closings/);assert.match(clpHTML,/onclick="clpCopySecondClosing\(\)"[^>]*>Copy to Subsequent/);assert.match(clpHTML,/aria-label="Second Closing — After initial due \(days\)" value="45"/);
assert.equal(h.calls.filter(call=>['add','update','delete'].includes(call.method)).length,0,'typing and copying do not persist or update a schedule');

Object.assign(c.S,{myAccessId:ACCESS,acc:{known:true,edit:true},contracts:[{...modern,Status:'Complete',Owner:[{ID:ACCESS}]}],clp:{cid:ID},nc:{sub:[SUB],lotIds:[]}});
assert.equal(c.lockBlocks(c.CFG.reports.contracts,ID,{Second_Closing_Lots:18,Second_Closing_Days:60}),false,'completed owners can save only approved term fields in the active editor');
assert.equal(c.lockBlocks(c.CFG.reports.contracts,ID,{Second_Closing_Lots:18,Status:'New'}),true);
c.S.clp=null;assert.equal(c.lockBlocks(c.CFG.reports.contracts,ID,{Second_Closing_Lots:18}),true);
h.reports.All_Contracts1=[{...modern,Status:'New'}];c.S.contracts=plain(h.reports.All_Contracts1);
await c.updateRecord(ID,{Second_Closing_Lots:18,Second_Closing_Days:0},c.CFG.reports.contracts);
assert.equal(h.reports.All_Contracts1[0].Second_Closing_Lots,18);assert.equal(h.reports.All_Contracts1[0].Second_Closing_Days,0);
assert.ok(h.calls.filter(call=>['add','update','delete'].includes(call.method)).every(call=>call.config.report_name===c.CFG.reports.contracts),'Contract edits never synchronize or rewrite existing schedules');
const missing=await ready();let writes=0;missing.api.updateRecordById=async config=>{writes++;return {code:3000,data:{ID:config.id}};};
await assert.rejects(missing.c.updateRecord(ID,{Second_Closing_Lots:15,Second_Closing_Days:45},missing.c.CFG.reports.contracts),/verif|field|match/i);assert.equal(writes,1,'omitted report fields cannot claim a verified save');

const backend=nativeSource('functions','Complete_Lot_Contract'),native=nativeSource('workflows','Create_Takedown_Schedule_1'),validation=nativeSource('workflows','Lot_Contract_Required_Fie'),email=nativeSource('functions','Send_Contract_Approval_Email');
for(const field of ['Second_Closing_Lots','Second_Closing_Days']){
 assert.match(backend,new RegExp(field+'=c\\.'+field));assert.match(native,new RegExp(field+'=input\\.'+field));
 for(const name of ['Hide_Lockdown_Fields_Cont','Show_Type_Specific_Fields','Set_Subdivision_Fields_Co']){const source=nativeSource('workflows',name);assert.ok(source.includes('show '+field+';'));assert.ok(source.includes('hide '+field+';'));}
}
assert.match(backend,/if\(tdsched.count\(\) == 0\)/);assert.match(native,/if\(existingTdsched.count\(\) == 0\)/);assert.doesNotMatch(backend,/tdsched\.Second_Closing_\w+\s*=/);
assert.match(validation,/oldContract\.Second_Closing_Lots != input\.Second_Closing_Lots/);assert.match(validation,/termsChanged \|\| hasSecond/);
assert.match(validation,/thisapp\.Calculate_Takedown_Cadence\(cadenceTerms\)/,'native converted-contract validation uses the shared complete cadence guard');
assert.match(backend,/if\(c\.Number_of_Lots == null \|\| c\.Number_of_Lots <= 0\)/);assert.match(backend,/c\.Initial_Takedown_Days\.toDecimal\(\) != c\.Initial_Takedown_Days\.toDecimal\(\)\.floor\(\)/);
assert.match(email,/contract\.Second_Closing_Lots.*second[\s\S]*contract\.Second_Closing_Days.*days after initial due/);
assert.equal((email.match(/from :"Notifications@wbdevelopment\.com"/g)||[]).length,2,'both attachment and plain-email paths preserve the captured live sender');
// Execute the selected native Contract validator and pre-write completion
// guards locally. This checks business behavior, not Creator compilation.
const engineJs=translate(fs.readFileSync('creator/functions/Calculate_Takedown_Cadence.dg','utf8')).js;
const validatorJs=translate('void validateContract()\n{\n'+validation.replace(/\balert\s+([^;]+);/g,'alert($1);').replace(/cancel submit;/g,'cancelSubmit();')+'\n}').js;
const completionGuard=backend.slice(backend.indexOf('\tmissing = List();'),backend.indexOf('\tsVal = Map();'));
const completionJs=translate('list completionMissing()\n{\n'+completionGuard+'\nreturn missing;\n}').js;
function nativeGuards(row,saved=null){
 const context=vm.createContext({rowJson:JSON.stringify(row),savedJson:JSON.stringify(saved)});
 vm.runInContext(`
  var alerts=[];function ifnull(v,f){return v==null?f:v;}
  function Map(){return {put(k,v){this[k]=v;},get(k){return this[k]??null;}};}function List(){return [];}
  Array.prototype.add=function(v){this.push(v);};Array.prototype.size=Array.prototype.count=function(){return this.length;};
  Number.prototype.toDecimal=function(){return Number(this);};Number.prototype.toLong=function(){return Math.trunc(this);};
  Number.prototype.floor=function(){return Math.floor(this);};Number.prototype.ceil=function(){return Math.ceil(this);};
  String.prototype.toDecimal=function(){return Number(this);};
  function record(row){return new Proxy(row,{get(o,k){return o[k]??null;}});}
  var input=record(JSON.parse(rowJson)),c=input,saved=JSON.parse(savedJson);
  function query(form,predicate){var rows=saved?[record(saved)].filter(predicate):[];return new Proxy(rows,{get(o,k){return k in o||typeof k==='symbol'?o[k]:o[0]?.[k]??null;}});}
  function alert(message){alerts.push(message);}function cancelSubmit(){throw Error('CANCEL_SUBMIT');}
  ${engineJs}
  var thisapp={Calculate_Takedown_Cadence};
  ${validatorJs}
  ${completionJs}
  try{validateContract();}catch(error){if(error.message!=='CANCEL_SUBMIT')throw error;}
  var nativeResult={alerts,missing:completionMissing()};
 `,context);
 return plain(context.nativeResult);
}
const nativeRow=record=>({...record,Subdivision1:[SUB],Lots1:[],Status:'Complete'});
assert.deepEqual(nativeGuards(nativeRow(legacy),nativeRow(legacy)),{alerts:[],missing:[]},'unchanged legacy native validation/completion stays available');
assert.deepEqual(nativeGuards(nativeRow(modern)),{alerts:[],missing:[]},'complete new three-tier Contract reaches the write stages');
for(const [field,values] of [['Number_of_Lots',[null,0,-1,1.5]],['Initial_Takedown',[null,-1,1.5]],['Initial_Takedown_Days',[null,-1,1.5]],['Second_Closing_Lots',[null,0,-1,1.5]],['Second_Closing_Days',[null,-1,1.5]],['Subsequent_Takedown_Lots',[null,0,-1,1.5]],['Subsequent_Takedown_Days',[null,0,-1,1.5]]])for(const value of values){
 const result=nativeGuards(nativeRow({...modern,[field]:value}),nativeRow(modern));assert.equal(result.alerts.length,1,'native term save rejects '+field+'='+value);assert.ok(result.missing.length,'completion stops before schedule/Lot writes for '+field+'='+value);
}
assert.deepEqual(nativeGuards(nativeRow({...modern,Number_of_Lots:25,Subsequent_Takedown_Lots:null,Subsequent_Takedown_Days:null})),{alerts:[],missing:[]},'exhausted obligation supports blank recurrence on both native paths');
const shell={ID,Contract_Type:'Lot (Master)',Status:'Complete',Subdivision1:[],Lots1:[]};assert.equal(nativeGuards(shell,shell).alerts.length,0,'native no-scope Master shell remains valid');
function nativeWorkflowScope(name,row){
 const source=nativeSource('workflows',name),creation=name==='Create_Takedown_Schedule_1';
 const body=creation?source.slice(0,source.indexOf('\n{'))+'\n{ wouldCreate = true; }\nreturn wouldCreate;':source.replace(/\b(show|hide|disable)\s+([\w.]+);/g,'$1("$2");');
 const context=vm.createContext({inputJson:JSON.stringify({...row,Approvals1:[]})});
 vm.runInContext(`
  var input=JSON.parse(inputJson),visibility={},disabled=[];
  Array.prototype.size=function(){return this.length;};
  function show(field){visibility[field]='shown';}function hide(field){visibility[field]='hidden';}function disable(field){disabled.push(field);}
  ${translate('bool scopeWorkflow()\n{\n'+body+'\n}').js}
  var scopeResult={wouldCreate:!!scopeWorkflow(),visibility,disabled};
 `,context);
 return plain(context.scopeResult);
}
for(const type of ['Lot','Lot (Master)','Lot (Amendment)','DA'])for(const subdivisions of [[],[SUB]])for(const status of ['New','Complete']){
 const row={Contract_Type:type,Subdivision1:subdivisions,Status:status},lot=type!=='DA',scoped=lot&&subdivisions.length>0;
 for(const name of ['Hide_Lockdown_Fields_Cont','Show_Type_Specific_Fields','Set_Subdivision_Fields_Co']){
  const result=nativeWorkflowScope(name,row);for(const field of ['Initial_Takedown','Second_Closing_Lots','Second_Closing_Days','Subsequent_Takedown_Lots'])assert.equal(result.visibility[field],scoped?'shown':'hidden',name+' preserves intended Lot/subdivision scope');
  if(name==='Hide_Lockdown_Fields_Cont')assert.ok(result.disabled.includes('Pricing.Base_Price'),'live pricing lockdown remains');
 }
 assert.equal(nativeWorkflowScope('Create_Takedown_Schedule_1',row).wouldCreate,status==='Complete'&&scoped,'native creation requires Complete, a Lot type and subdivisions');
 assert.equal(nativeGuards({...row,ID,Lots1:[]}).alerts.length,scoped?1:0,'only applicable scoped Lot records require their new closing inputs');
}
console.log('PASS Contract Second Closing: six-term inputs, explicit zero days, one-shot copy, untouched legacy compatibility, changed-term validation, persisted SDK2 numeric read-back, completed-owner limits, native creation parity and no existing-schedule sync.');
