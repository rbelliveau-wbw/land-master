// Executes the shipped Deluge preflight/apply body with native-shaped records.
// This adapter proves business/control flow, not Creator compiler compatibility.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const read = name => fs.readFileSync('creator/functions/'+name+'.dg','utf8').replace(/\r\n/g,'\n');
function compile(source) {
  const strings=[];
  let s=source.replace(/"(?:\\.|[^"\\])*"/g,value=>'STRINGTOKEN'+(strings.push(value)-1)+'END');
  s=s.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g,'');
  const head=s.match(/^\s*(string|map|list|bool)\s+(\w+)\(([^)]*)\)\s*\{/);
  const args=head[3].split(',').map(arg=>arg.trim().split(/\s+/).at(-1));
  s=s.replace(head[0],`function ${head[2]}(${args.join(',')}){`);
  s=s.replace(/insert into (\w+)\s*\[([\s\S]*?)\];/g,(_all,table,fields)=>
    'insertRecord("'+table+'",{'+fields.trim().split('\n').map(line=>line.trim().replace(/^(\w+)\s*=/,'$1:')).join(',')+'});');
  s=s.replace(/invokeurl\s*\[([\s\S]*?)\]/g,(_all,request)=>'fixtureHttp({'+request.trim().split('\n').map(line=>line.trim()).filter(Boolean).map(line=>line.replace(/^type\s*:\s*(\w+)$/,(_line,type)=>'type:"'+type+'"')).join(',')+'})');
  s=s.replace(/\b(Workflow_Run_Log|External_System_Mapping|Add_Budget|Budget_Import_Item|Workflow_Export_Lock|Settings|Subdivision)\[([^\]]+)\]/g,(_all,table,criteria)=>{
    const fields=['ID','External_Code','External_System','Code','Subdivision_Code','Claim_Key'];
    const expr=criteria.replace(/Subdivision1 in batchIds/g,'batchIds.contains(row.Subdivision1?.ID)').replace(/Subdivision_Code in budgetCodes/g,'budgetCodes.contains(row.Subdivision_Code)').replace(new RegExp('(?<![.\\w])('+fields.join('|')+')\\b','g'),'row.$1');
    return `fetchRecords("${table}",row=>${expr})`;
  });
  s=s.replace(/\{\s*((?:(?:STRINGTOKEN\d+END|\d+)\s*,\s*)+(?:STRINGTOKEN\d+END|\d+))\s*\}/g,'[$1]');
  s=s.replace(/for each\s+(\w+) in ([^\n{]+)/g,'for ($1 of $2)');
  s=s.replace(/mapping\.Subdivision1\.ID % 5/g,'nativeModulo(mapping.Subdivision1.ID,5)').replace(/subdivision\.ID % 5/g,'nativeModulo(subdivision.ID,5)');
  s=s.replace(/\.distinct\((\w+)\)/g,'.distinct("$1")').replace(/\.sort\(true\)/g,'.sortNative()');
  s=s.replace(/\.length\(\)/g,'.lengthCall()');
  const variables=[...new Set([...s.matchAll(/(?<![.\w])([A-Za-z_]\w*)\s*=(?!=)/g)].map(match=>match[1]).concat([...s.matchAll(/for \((\w+) of/g)].map(match=>match[1])))].filter(name=>!args.includes(name));
  s=s.replace(`function ${head[2]}(${args.join(',')}){`,`function ${head[2]}(${args.join(',')}){var ${variables.join(',')};`);
  return s.replace(/STRINGTOKEN(\d+)END/g,(_all,index)=>strings[Number(index)]);
}

const ID='4410926000005159046', SUB='90071992547409960', NOW='2026-11-03T12:00:00Z';
const names=['Labor','Materials','Equipment','Subcontractor','Other'];
function sourceRow(index,source='const',extra={}) {
  const values={Labor:'1.1250',Materials:'2.0000',Equipment:'-0.1250',Subcontractor:'3',Other:'4'};
  return source==='hcss' ? {'Major Code':3000,'H.Minor Code':3000+index,TotalActualCost:'10.0000','J.JobCodeFinal':'0007-Job','H.JobCode':'0007-Job',CostCodeDescription:'Measured actual',...values,Unclassified_Actuals:0,...extra} :
    {WS_Job_Number_Trim:'0007-Job',Cost_Code_Number_1:source==='dev'?4000:3000,Cost_Code_Number_2:(source==='dev'?4000:3000)+index,Cost_Code_Description:'Measured actual',Total_Actuals:'10.00',...values,Unclassified_Actuals:0,Unclassified_Count:0,...extra};
}
function harness(rows,{source='const',destinations=[],failWriteAt=0,claimFailure='',wakeFailure=false}={}) {
  const workflow=source==='const'?'Budgets_Import_Load_GP_Co':source==='dev'?'Budgets_Import_Great_Plai1':'Budgets_Import_Load_HCSS_';
  const view=source==='const'?'2107789000031077002':source==='dev'?'2107789000029311186':'2107789000023717814';
  const initial={version:1,phase:'processing',workflow,tick:0,batch:0,requests:[{view,code:'1004',job:'completed-immutable-job',allowEmpty:true,config:{selectedColumns:Object.keys(rows[0]||sourceRow(0,source))}}],actualScope:{'0007-Job':{id:SUB,code:'PHASE-0007'}},actualDeadline:Date.parse(NOW)+120*60000,actualDeadlineAt:'11/03/2026 02:00:00 PM'};
  const context=vm.createContext({console,fixtureRows:JSON.stringify(rows),fixtureState:JSON.stringify(initial),fixtureDestinations:JSON.stringify(destinations),fixtureWorkflow:workflow,fixtureSource:source,fixtureId:ID,fixtureSub:SUB,fixtureNow:NOW,fixtureFailWriteAt:failWriteAt,fixtureClaimFailure:claimFailure,fixtureWakeFailure:wakeFailure,sha256:value=>createHash('sha256').update(String(value)).digest('hex')});
  vm.runInContext(`
    var clock=new Date(fixtureNow),claims=new Set(),events=[],writes=[],wakes=[],downloads=[],writeCount=0;
    function ifnull(value,fallback){return value==null?fallback:value;}
    function Map(){return {};}
    function List(){return [];}
    Object.defineProperties(Object.prototype,{get:{value:function(key){return this[key]??null;}},put:{value:function(key,value){this[key]=value;}},keys:{value:function(){return Object.keys(this);}},toString:{value:function(){return JSON.stringify(this);}}});
    Array.prototype.get=function(index){return this[index]??null;};Array.prototype.size=function(){return this.length;};Array.prototype.add=function(value){this.push(value);};Array.prototype.contains=function(value){return this.includes(value);};Array.prototype.sortNative=function(){return this.sort();};Array.prototype.subList=function(start,end){if(start<0||end>this.length)throw Error('Native subList out of range');return this.slice(start,end);};
    String.prototype.toMap=function(){return JSON.parse(this);};String.prototype.toList=function(separator){return this.split(separator);};String.prototype.toDateTime=function(){return new Date(String(this));};String.prototype.lengthCall=function(){return this.length;};String.prototype.matches=function(pattern){return new RegExp('^(?:'+pattern+')$').test(this);};String.prototype.toLong=function(){const n=BigInt(this);return n>BigInt(Number.MAX_SAFE_INTEGER)?n:Number(n);};String.prototype.toDecimal=function(){if(!/^[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)$/.test(this))throw Error('Invalid native decimal');return Number(this);};
    Number.prototype.toLong=function(){return Math.trunc(this);};Number.prototype.toDecimal=function(){return Number(this);};Number.prototype.abs=function(){return Math.abs(this);};Number.prototype.round=function(places){const scale=10**places;return Math.sign(this)*Math.round(Math.abs(this)*scale+1e-10)/scale;};
    Date.prototype.toLong=function(){return this.getTime();};Date.prototype.addMinutes=function(n){return new Date(this.getTime()+n*60000);};Date.prototype.toString=function(){return this.toISOString();};
    function nativeModulo(id,n){return Number(BigInt(id)%BigInt(n));}
    var sourceRows=JSON.parse(fixtureRows);
    var tables={Workflow_Run_Log:[{ID:fixtureId,Run_Status:'Running',Started_At:new Date(fixtureNow),Resume_At:null,Export_State:fixtureState,Rows_Received:0,Rows_Processed:0,Rows_Created:0,Rows_Updated:0,Rows_Skipped:0}],Budget_Import_Item:JSON.parse(fixtureDestinations),External_System_Mapping:[{External_Code:'0007-Job',External_System:fixtureSource==='hcss'?'HeavyJob':'Great Plains',Subdivision1:{ID:fixtureSub,Subdivision_Code:'PHASE-0007'}}],Add_Budget:[{Subdivision_Code:'PHASE-0007'}],Workflow_Export_Lock:[]};
    function fetchRecords(table,predicate){const records=tables[table].filter(predicate);const target={count(){return records.length;},distinct(field){return [...new Set(records.map(row=>row[field]))];},[Symbol.iterator]:function*(){yield* records;}};return new Proxy(target,{get(target,key){return key in target?target[key]:records[0]?.[key]??null;},set(_target,key,value){if(records.length!==1)throw Error('Ambiguous native update');writeCount++;if(fixtureFailWriteAt&&writeCount===fixtureFailWriteAt)throw Error('Unknown native write outcome');records[0][key]=value;writes.push({table,key,value,code:records[0].Code});return true;}});}
    function insertRecord(table,data){writeCount++;if(fixtureFailWriteAt&&writeCount===fixtureFailWriteAt)throw Error('Unknown native insert outcome');data.ID=String(900000+tables[table].length);tables[table].push(data);writes.push({table,insert:data});return data.ID;}
    var zoho={get currenttime(){return clock;},currentdate:'11/03/2026',loginuser:'fixture-owner',encryption:{sha256}};
    var thisapp={
      workflowRunLog(event){events.push(JSON.parse(JSON.stringify(event)));const run=tables.Workflow_Run_Log[0];if(event.exportState!=null)run.Export_State=event.exportState;if(event.clearResume)run.Resume_At=null;if(event.resumeAt)run.Resume_At=event.resumeAt;if(event.action==='finish')run.Run_Status=event.status;for(const [key,field] of Object.entries({received:'Rows_Received',processed:'Rows_Processed',created:'Rows_Created',updated:'Rows_Updated',skipped:'Rows_Skipped'})){if(event.counts?.[key]!=null)run[field]=event.counts[key];}return {id:fixtureId};},
      workflowPreparedExportRows(view,config,id,allowEmpty){const state=JSON.parse(tables.Workflow_Run_Log[0].Export_State);if(state.requests[0].view!==view||state.requests[0].job!=='completed-immutable-job'||id!==fixtureId||!allowEmpty)throw Error('Wrong captured export');downloads.push(state.requests[0].job);return sourceRows;},
      workflowExportClaim(key){if(fixtureClaimFailure&&key.includes(fixtureClaimFailure))return false;if(claims.has(key))return false;claims.add(key);return true;},
      workflowExportWake(id,tick,due){wakes.push({id,tick,due});if(fixtureWakeFailure)throw Error('Ambiguous wake-up outcome');return 'queued';}
    };
  `+compile(read('budgetActualImportRun')),context);
  const execute=()=>vm.runInContext('budgetActualImportRun(fixtureId)',context);
  const advance=()=>vm.runInContext(`var next=JSON.parse(tables.Workflow_Run_Log[0].Export_State);if(next.phase!=='waiting')throw Error('Not waiting');next.phase='processing';tables.Workflow_Run_Log[0].Export_State=JSON.stringify(next);budgetActualImportRun(fixtureId);`,context);
  const json=expr=>JSON.parse(vm.runInContext('JSON.stringify('+expr+')',context));
  return {context,execute,advance,json};
}

for(const source of ['const','dev','hcss']) {
  const h=harness(Array.from({length:203},(_,i)=>sourceRow(i,source)),{source});
  h.execute();assert.equal(h.json('writes').length,0);assert.equal(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualValidated'),25);
  let validated=25;
  while(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualPhase')==='preflight'){
    h.advance();const next=h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualValidated');assert.ok(next-validated<=25);validated=next;
    assert.equal(h.json('writes').length,0,'all source chunks pass before the first business write');
  }
  assert.equal(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualPhase'),'apply');
  let applied=0;
  while(h.json('tables.Workflow_Run_Log[0].Run_Status')==='Running'){
    h.advance();const next=h.json('tables.Budget_Import_Item').length;assert.ok(next-applied<=25,'every apply is bounded to twenty-five source rows');applied=next;
  }
  const run=h.json('tables.Workflow_Run_Log[0]');assert.equal(run.Run_Status,'Success');assert.equal(run.Rows_Created,203);assert.equal(run.Rows_Processed,203);
  assert.deepEqual(h.json('[...new Set(downloads)]'),['completed-immutable-job'],'all chunks use the original completed job');
  assert.equal(h.json('tables.Budget_Import_Item[0].Labor'),1.125);assert.equal(h.json('tables.Budget_Import_Item[0].Equipment'),-.125);
}
for(const source of ['const','dev','hcss']) {
  const h=harness([sourceRow(0,source)],{source});
  vm.runInContext(compile(read('workflowExportPlan'))+compile(read('workflowExportEnqueue'))+`
    tables.Subdivision=[{ID:fixtureSub,Subdivision_Code:'PHASE-0007'},{ID:String(BigInt(fixtureSub)+1n),Subdivision_Code:'PHASE-OTHER'}];
    tables.Add_Budget.push({Subdivision_Code:'PHASE-OTHER'});
    tables.External_System_Mapping.push({External_Code:'Other-Job',External_System:fixtureSource==='hcss'?'HeavyJob':'Great Plains',Subdivision1:{ID:String(BigInt(fixtureSub)+1n),Subdivision_Code:'PHASE-OTHER'}});
    tables.External_System_Mapping.push({External_Code:'0007-Job',External_System:fixtureSource==='hcss'?'Great Plains':'HeavyJob',Subdivision1:{ID:fixtureSub,Subdivision_Code:'PHASE-0007'}});
    tables.Settings=[{Current_Batch:1}];thisapp.workflowExportPlan=workflowExportPlan;
    var zeroPlan=workflowExportPlan(fixtureWorkflow,0);var onePlan=workflowExportPlan(fixtureWorkflow,1);var emptyPlan=workflowExportPlan(fixtureWorkflow,4);
    workflowExportEnqueue(fixtureWorkflow);
  `,h.context);
  assert.deepEqual(h.json('Object.keys(zeroPlan.actualScope)'),['0007-Job'],'exact long-ID modulo retains the selected subdivision');
  assert.deepEqual(h.json('Object.keys(onePlan.actualScope)'),['Other-Job'],'adjacent long IDs land in distinct native groups');
  assert.match(h.json('zeroPlan.requests[0].config.criteria'),/0007-Job/);assert.doesNotMatch(h.json('zeroPlan.requests[0].config.criteria'),/Other-Job/);
  assert.equal(h.json('emptyPlan.requests.length'),0,'a group with no eligible mappings starts no Analytics export');
  assert.equal(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).batch'),1);assert.equal(h.json('tables.Settings[0].Current_Batch'),1,'enqueue captures but never advances the shared batch');
  assert.throws(()=>vm.runInContext('workflowExportPlan(fixtureWorkflow,5)',h.context));
  vm.runInContext('tables.External_System_Mapping.push({...tables.External_System_Mapping[0],Subdivision1:{ID:String(BigInt(fixtureSub)+1n),Subdivision_Code:"PHASE-OTHER"}});',h.context);
  assert.throws(()=>vm.runInContext('workflowExportPlan(fixtureWorkflow,0)',h.context),error=>String(error).includes('ambiguous'),'same-system duplicates outside the selected group still fail before export');
}

for(const breakRow of [row=>{delete row.Other;},row=>{row.Other='invalid';},row=>{row.Unclassified_Actuals=-4.2;},row=>{row.Unclassified_Count=1;},row=>{row.Other=100;},row=>{row.WS_Job_Number_Trim='UNMAPPED';}]) {
  const rows=Array.from({length:151},(_,i)=>sourceRow(i));breakRow(rows[150]);const h=harness(rows);h.execute();
  assert.throws(()=>{while(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualPhase')==='preflight')h.advance();});assert.equal(h.json('writes').length,0,'a malformed later source row cannot partially apply earlier valid rows');
  const event=h.json('events.at(-1)');assert.equal(event.status,'Failed');assert.equal(event.counts.failed,1);assert.match(event.details,/batch=0; phase=preflight; source row=151/);
}
{
  const rows=Array.from({length:101},(_,i)=>sourceRow(i));rows[100]={...rows[0]};const h=harness(rows);h.execute();assert.throws(()=>{while(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualPhase')==='preflight')h.advance();},error=>String(error).includes('Duplicate actual source key'));assert.equal(h.json('writes').length,0,'cross-chunk source duplicates fail the whole preflight');
}
{
  const h=harness([sourceRow(0)],{claimFailure:'actual-row'});assert.throws(h.execute);assert.equal(h.json('writes').length,0);assert.equal(h.json('events.at(-1).status'),'Failed');assert.throws(h.execute,'a failed claim does not authorize a second automatic run');
}
{
  const h=harness([sourceRow(0)],{failWriteAt:1});h.execute();assert.throws(h.advance);assert.equal(h.json('events.at(-1).status'),'Partial');assert.equal(h.json('events.at(-1).counts.failed'),1);assert.match(h.json('events.at(-1).details'),/key=0007-Job-GP-3000/);assert.throws(h.execute,'unknown native business writes remain terminal and never replay automatically');
}
{
  const h=harness([sourceRow(0)],{wakeFailure:true});assert.throws(h.execute);assert.equal(h.json('events.at(-1).status'),'Failed');assert.equal(h.json('writes').length,0,'ambiguous continuation creation cannot proceed to business writes');
}
{
  const h=harness([sourceRow(0)]);h.execute();vm.runInContext('sourceRows.push({...sourceRows[0],Cost_Code_Number_2:3001});',h.context);assert.throws(h.advance,error=>String(error).includes('row count changed'));assert.equal(h.json('writes').length,0);
}
{
  const h=harness([sourceRow(0)]);vm.runInContext('clock=new Date(clock.getTime()+121*60000);',h.context);assert.throws(h.execute,error=>String(error).includes('deadline'));assert.equal(h.json('writes').length,0);assert.equal(h.json('events.at(-1).status'),'Failed');
}
{
  const h=harness([]);assert.match(h.execute(),/Empty source/);assert.equal(h.json('tables.Workflow_Run_Log[0].Run_Status'),'Skipped');assert.equal(h.json('writes').length,0);
}
{
  const h=harness([sourceRow(0,'const',{Labor:1.1299})]);h.execute();h.advance();assert.equal(h.json('tables.Budget_Import_Item[0].Labor'),1.1299,'GP Construction raw element precision is preserved beside its rounded total');
  const dev=harness([sourceRow(0,'dev',{Labor:1.1299})],{source:'dev'});assert.throws(dev.execute,'GP Development cannot use Construction rounding tolerance');
}
{
  const h=harness([sourceRow(0,'hcss',{Labor:1.12500000001,Unclassified_Actuals:-1e-10})],{source:'hcss'});h.execute();h.advance();
  assert.equal(h.json('tables.Budget_Import_Item[0].Labor'),1.125,'source float residue normalizes to native four-place amounts before reconciliation');
  const mismatch=harness([sourceRow(0,'hcss',{Unclassified_Actuals:0.01})],{source:'hcss'});assert.throws(mismatch.execute,error=>String(error).includes('unclassified'));assert.equal(mismatch.json('writes').length,0,'a representable residual remains blocked before writes');
  const rounded=harness([sourceRow(0,'dev',{Labor:1.125049,Other:4.000049,Total_Actuals:10.000098})],{source:'dev'});assert.throws(rounded.execute,error=>String(error).includes('reconcile'),'unrounded inputs cannot pass a split that stops reconciling at destination precision');
}
{
  const existing={ID:'90071992547409972',Code:'0007-Job-GP-3000',Data_Source:'Great Plains',Subdivision_Code:'PHASE-0007',Major_Code:3000,Minor_Code:3000,Budget_Item:'90071992547409973',Cost_Code_Description:'Keep Saved Description',Cost:10};
  const h=harness([sourceRow(0)],{destinations:[existing]});h.execute();h.advance();
  const saved=h.json('tables.Budget_Import_Item[0]');assert.equal(saved.Labor,1.125);assert.equal(saved.Budget_Item,existing.Budget_Item);assert.equal(saved.Cost_Code_Description,existing.Cost_Code_Description);
  assert.ok(h.json('writes').every(write=>!['Subdivision_Code','Major_Code','Minor_Code','Budget_Item','Cost_Code_Description'].includes(write.key)),'existing identity, lookup and description fields remain untouched');
  for(const mismatch of [{Subdivision_Code:'OTHER'},{Major_Code:9999},{Minor_Code:9999},{Data_Source:'HeavyJob'}]){
    const broken=harness([sourceRow(0)],{destinations:[{...existing,...mismatch}]});assert.throws(broken.execute);assert.equal(broken.json('writes').length,0,'identity/source conflicts fail preflight rather than reassigning an existing row');
  }
  const description=harness([sourceRow(0,'const',{Cost_Code_Description:'x'.repeat(101)})]);assert.throws(description.execute,error=>String(error).includes('100-character'));assert.equal(description.json('writes').length,0);
}
{
  const h=harness([sourceRow(0)]);
  vm.runInContext(compile(read('workflowExportDispatch'))+`
    var watchState=JSON.parse(tables.Workflow_Run_Log[0].Export_State);watchState.actualPhase='apply';watchState.actualWriteAttempted=true;tables.Workflow_Run_Log[0].Export_State=JSON.stringify(watchState);
    tables.Workflow_Export_Lock.push({ID:'501',Claim_Key:fixtureId+'|wake|0|10',Wake_At:new Date(clock.getTime()-60000)});
    workflowExportDispatch('501');
  `,h.context);
  assert.equal(h.json('events.at(-1).status'),'Partial','ten-minute callback records a possible hard-timeout write as Partial');
  assert.equal(h.json('writes').length,0,'watchdog callbacks never replay the uncertain chunk');
  assert.match(h.json('events.at(-1).details'),/source cursor=0/);
}
{
  const h=harness([sourceRow(0)]);
  vm.runInContext(compile(read('workflowExportDispatch'))+`
    var watchState=JSON.parse(tables.Workflow_Run_Log[0].Export_State);watchState.phase='arming';watchState.tick=1;tables.Workflow_Run_Log[0].Export_State=JSON.stringify(watchState);
    tables.Workflow_Export_Lock.push({ID:'501',Claim_Key:fixtureId+'|wake|0|10',Wake_At:new Date(clock.getTime()-60000)});
    workflowExportDispatch('501');
  `,h.context);
  assert.equal(h.json('events.at(-1).status'),'Failed','an unacknowledged successor handoff cannot leave an immortal Running preflight');
  assert.equal(h.json('writes').length,0);
}
{
  const h=harness([sourceRow(0)]);h.execute();
  vm.runInContext(compile(read('workflowExportDispatch'))+compile(read('workflowExportTick'))+`
    thisapp.budgetActualImportRun=budgetActualImportRun;thisapp.workflowExportTick=workflowExportTick;
    clock=new Date(clock.getTime()+121*60000);tables.Workflow_Run_Log[0].Resume_At=new Date(clock.getTime()-60000);
    tables.Workflow_Export_Lock.push({ID:'501',Claim_Key:fixtureId+'|wake|1|10',Wake_At:new Date(clock.getTime()-60000)});
  `,h.context);
  assert.throws(()=>vm.runInContext("workflowExportDispatch('501')",h.context),error=>String(error).includes('deadline'));
  assert.equal(h.json('events.at(-1).status'),'Failed','an expired waiting callback reaches the original deadline guard');
  assert.equal(h.json('writes').length,0,'expired callbacks do not start a late apply');
}
{
  const h=harness([sourceRow(0)]);h.execute();
  vm.runInContext(compile(read('workflowExportDispatch'))+`
    tables.Workflow_Run_Log[0].Resume_At=new Date(clock.getTime()+60000);
    tables.Workflow_Export_Lock.push({ID:'501',Claim_Key:fixtureId+'|wake|0|10',Wake_At:new Date(clock.getTime()-60000)});
    workflowExportDispatch('501');
  `,h.context);
  assert.equal(h.json('tables.Workflow_Run_Log[0].Run_Status'),'Running','stale watchdogs cannot terminate a healthy later tick');
}

const plan=read('workflowExportPlan'),enqueue=read('workflowExportEnqueue'),tick=read('workflowExportTick'),dispatch=read('workflowExportDispatch'),wake=read('workflowExportWake'),claim=read('workflowExportClaim');
for(const workflow of ['Budgets_Import_Load_GP_Co','Budgets_Import_Great_Plai1','Budgets_Import_Load_HCSS_']) {
  assert.ok(plan.includes('workflow == "'+workflow+'"'));assert.ok(enqueue.includes('"'+workflow+'"'));assert.ok(tick.includes('"'+workflow+'"'));assert.ok(dispatch.includes('"'+workflow+'"'));
}
assert.match(plan,/subdivision\.ID % 5 == capturedBatch/);assert.match(plan,/actualScope\.put\(job/);assert.match(plan,/config\.put\("criteria"/);
assert.doesNotMatch(enqueue,/Current_Batch\s*=/,'actual imports capture but do not rotate the shared timer');
assert.match(claim,/actual-row\[\|\]\[a-f0-9\]\{64\}/);assert.match(wake,/delays = \{0,2,10\}/);assert.match(wake,/wakeDue = actualDeadline/);
assert.match(dispatch,/Actual import acknowledgement missing/);assert.match(dispatch,/watchStatus = "Partial"/);assert.match(dispatch,/unarmedSuccessor/);
assert.match(tick,/return thisapp\.budgetActualImportRun\(auditId\)/);
const watchdog=fs.readFileSync('creator/workflows/budget-actual-elements/Workflow_Log_Timeout.action-1.dg','utf8');assert.match(watchdog,/watch\.Wake_At > zoho\.currenttime/);assert.match(watchdog,/Started_At\.addMinutes\(120\)/);
// The native Creator formatter removed nested mixed-operator parentheses when
// this worker was saved/reopened. Keep each new boolean statement to one
// operator family so the stored function has the same meaning as this source.
const actualTick=tick.slice(0,tick.indexOf('// Budget successors'));
for(const [name,source] of [['budgetActualImportRun',read('budgetActualImportRun')],['workflowExportDispatch',dispatch],['workflowExportTick actual continuation',actualTick],['Workflow_Log_Timeout',watchdog]]) {
  const mixed=source.split(/\r?\n/).filter(line=>line.includes('&&')&&line.includes('||'));
  assert.deepEqual(mixed,[],name+': new guards must survive native boolean-parenthesis normalization');
}
const promotion=JSON.parse(fs.readFileSync('creator/workflows/budget-actual-elements/promotion-manifest.json','utf8'));
const captured=JSON.parse(fs.readFileSync('creator/workflows/budget-actual-elements/native-install-progress.json','utf8'));
assert.equal(promotion.actual_import_schedule_wrappers.length,3);
for(const wrapper of promotion.actual_import_schedule_wrappers){
  assert.ok(wrapper.name&&wrapper.name!==wrapper.route_key,'new anchored schedule identity differs from its retained fixed-date predecessor');
  const definition=fs.readFileSync(wrapper.schedule_source,'utf8'),action=fs.readFileSync(wrapper.action_source,'utf8');
  assert.ok(definition.startsWith(wrapper.name+' as "'+wrapper.display_name+'"'));
  assert.match(definition,/form = Settings/);assert.match(definition,/start = Next_Workflow_Run/);assert.match(definition,/frequency = daily/);
  assert.ok(action.includes('workflowExportEnqueue("'+wrapper.route_key+'")'),'physical schedule names must not change queue route ownership');
  assert.ok(promotion.original_actual_schedule_retention.names.includes(wrapper.route_key));
  assert.ok(captured.new_schedules_created.some(entry=>entry.name===wrapper.name&&entry.route_key===wrapper.route_key),'declarations match the names actually captured in native Creator');
}
console.log('PASS: shipped actual import body: all-source bounded preflight before writes, 25-row apply continuations, immutable export reuse, cross-chunk duplicates, source/mapping/schema/element guards, signed precision, native unknown-write no replay, deadline, empty-source protection and Workflow Log failure context.');
