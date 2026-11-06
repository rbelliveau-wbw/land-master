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
  s=s.replace(/\binfo ([^;]+);/g,'fixtureInfo($1);');
  s=s.replace(/mapping\.Subdivision1\.ID % 5/g,'nativeModulo(mapping.Subdivision1.ID,5)').replace(/subdivision\.ID % 5/g,'nativeModulo(subdivision.ID,5)');
  s=s.replace(/\.distinct\((\w+)\)/g,'.distinct("$1")').replace(/\.sort\(true\)/g,'.sortNative()');
  s=s.replace(/\.length\(\)/g,'.lengthCall()');
  const variables=[...new Set([...s.matchAll(/(?<![.\w])([A-Za-z_]\w*)\s*=(?!=)/g)].map(match=>match[1]).concat([...s.matchAll(/for \((\w+) of/g)].map(match=>match[1])))].filter(name=>!args.includes(name));
  s=s.replace(`function ${head[2]}(${args.join(',')}){`,`function ${head[2]}(${args.join(',')}){`+(variables.length?`var ${variables.join(',')};`:''));
  return s.replace(/STRINGTOKEN(\d+)END/g,(_all,index)=>strings[Number(index)]);
}

const ID='4410926000005159046', SUB='90071992547409960', NOW='2026-11-03T12:00:00Z';
const SCAN_PROFILE='scan100-write25-v1';
const names=['Labor','Materials','Equipment','Subcontractor','Other'];
function sourceRow(index,source='const',extra={}) {
  const values={Labor:'1.1250',Materials:'2.0000',Equipment:'-0.1250',Subcontractor:'3',Other:'4'};
  return source==='hcss' ? {'Major Code':3000,'H.Minor Code':3000+index,TotalActualCost:'10.0000','J.JobCodeFinal':'0007-Job','H.JobCode':'0007-Job',CostCodeDescription:'Measured actual',...values,Unclassified_Actuals:0,...extra} :
    {WS_Job_Number_Trim:'0007-Job',Cost_Code_Number_1:source==='dev'?4000:3000,Cost_Code_Number_2:(source==='dev'?4000:3000)+index,Cost_Code_Description:'Measured actual',Total_Actuals:'10.00',...values,Unclassified_Actuals:0,Unclassified_Count:0,...extra};
}
function destinationRow(index,source='const',extra={}) {
  const row=sourceRow(index,source),hcss=source==='hcss';
  const minor=row[hcss?'H.Minor Code':'Cost_Code_Number_2'];
  return {ID:String(90071992547409972n+BigInt(index)),Code:'0007-Job'+(hcss?'-HJ-':'-GP-')+minor,Data_Source:hcss?'HeavyJob':'Great Plains',Subdivision_Code:'PHASE-0007',Major_Code:row[hcss?'Major Code':'Cost_Code_Number_1'],Minor_Code:minor,Cost:Number(row[hcss?'TotalActualCost':'Total_Actuals']),...Object.fromEntries(names.map(name=>[name,Number(row[name])])),...extra};
}
function harness(rows,{source='const',destinations=[],failWriteAt=0,claimFailure='',wakeFailure=false,rowClaimMode='',callbackPolicy=null,actualChunkProfile=null,recoveryFailure=false}={}) {
  const workflow=source==='const'?'Budgets_Import_Load_GP_Co':source==='dev'?'Budgets_Import_Great_Plai1':'Budgets_Import_Load_HCSS_';
  const view=source==='const'?'2107789000031077002':source==='dev'?'2107789000029311186':'2107789000023717814';
  const initial={version:1,phase:'processing',workflow,tick:0,batch:0,requests:[{view,code:'1004',job:'completed-immutable-job',allowEmpty:true,config:{selectedColumns:Object.keys(rows[0]||sourceRow(0,source))}}],actualScope:{'0007-Job':{id:SUB,code:'PHASE-0007'}},actualDeadline:Date.parse(NOW)+120*60000,actualDeadlineAt:'11/03/2026 02:00:00 PM'};
  if(callbackPolicy!==null)initial.callbackPolicy=callbackPolicy;
  if(actualChunkProfile!==null)initial.actualChunkProfile=actualChunkProfile;
  const context=vm.createContext({console,fixtureRows:JSON.stringify(rows),fixtureState:JSON.stringify(initial),fixtureDestinations:JSON.stringify(destinations),fixtureWorkflow:workflow,fixtureSource:source,fixtureId:ID,fixtureSub:SUB,fixtureNow:NOW,fixtureFailWriteAt:failWriteAt,fixtureClaimFailure:claimFailure,fixtureWakeFailure:wakeFailure,fixtureRowClaimMode:rowClaimMode,fixtureRecoveryFailure:recoveryFailure,sha256:value=>createHash('sha256').update(String(value)).digest('hex')});
  vm.runInContext(`
    var clock=new Date(fixtureNow),claims=new Set(),claimRequests=[],events=[],writes=[],wakes=[],downloads=[],recoveryArms=[],startupHolds=[],callOrder=[],writeCount=0;
    function randomNumber(min,max){return min;}
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
    function fixtureInfo(message){}
    function fixtureHttp(request){
      const payload=JSON.parse(request.parameters);claimRequests.push(payload);
      const result=payload.data.map((row,index)=>{
        if((fixtureClaimFailure&&row.Claim_Key.includes(fixtureClaimFailure))||claims.has(row.Claim_Key)||(fixtureRowClaimMode==='partial'&&index===1))return {code:3001,message:'Claim rejected'};
        const saved={ID:String(90071992547409930n+BigInt(tables.Workflow_Export_Lock.length)),Claim_Key:row.Claim_Key};
        claims.add(row.Claim_Key);tables.Workflow_Export_Lock.push(saved);return {code:3000,data:{...saved}};
      });
      if(fixtureRowClaimMode==='lost-after-persist')throw Error('Claim response lost after independent commit');
      if(fixtureRowClaimMode==='deadline-after-ack')clock=new Date(clock.getTime()+121*60000);
      return {responseCode:200,responseText:JSON.stringify({code:3000,result})};
    }
    var zoho={get currenttime(){return clock;},currentdate:'11/03/2026',loginuser:'fixture-owner',encryption:{sha256}};
    var thisapp={
      environment:{type:'development',linkname:'development'},
      workflowRunLog(event){callOrder.push('log:'+event.action);events.push(JSON.parse(JSON.stringify(event)));const run=tables.Workflow_Run_Log[0];if(event.exportState!=null)run.Export_State=event.exportState;if(event.clearResume)run.Resume_At=null;if(event.resumeAt)run.Resume_At=event.resumeAt;if(event.action==='finish')run.Run_Status=event.status;for(const [key,field] of Object.entries({received:'Rows_Received',processed:'Rows_Processed',created:'Rows_Created',updated:'Rows_Updated',skipped:'Rows_Skipped'})){if(event.counts?.[key]!=null)run[field]=event.counts[key];}return {id:fixtureId};},
      // The recovery worker has its own runtime suite. This import fixture only
      // stubs its enqueue-time arming contract, before an audited run exists.
      workflowRecoveryHold(action,identity,target){
        callOrder.push('hold:'+action);
        if(action==='begin'){const hold={id:'90071992547409998',target:target,status:'open',expires:clock.getTime()+30*60000};startupHolds.push(hold);thisapp.workflowExportRecover('arm');return hold.id;}
        const hold=startupHolds.find(item=>item.id===identity);if(!hold||hold.status!=='open'||clock.getTime()>=hold.expires)throw Error('Startup hold missing, closed or expired');
        if(action==='check')return identity;
        if(action==='close'){const state=JSON.parse(tables.Workflow_Run_Log[0].Export_State);if(String(target)!==fixtureId||state.startupHoldId!==identity||state.startupHoldTarget!==hold.target)throw Error('Startup hold target differs');hold.status='closed';return 'Closed';}
        throw Error('Unexpected startup action in actual import fixture');
      },
      workflowExportRecover(action){if(action!=='arm')throw Error('Import fixture supports recovery arming only');callOrder.push('recovery:arm');recoveryArms.push(action);if(fixtureRecoveryFailure)throw Error('No acknowledged shared recovery successor');return '90071992547409999';},
      workflowPreparedExportRows(view,config,id,allowEmpty){const state=JSON.parse(tables.Workflow_Run_Log[0].Export_State);if(state.requests[0].view!==view||state.requests[0].job!=='completed-immutable-job'||id!==fixtureId||!allowEmpty)throw Error('Wrong captured export');downloads.push(state.requests[0].job);return sourceRows;},
      workflowExportClaim(key){if(fixtureClaimFailure&&key.includes(fixtureClaimFailure))return false;if(claims.has(key))return false;claims.add(key);return true;},
      workflowExportWake(id,tick,due){wakes.push({id,tick,due});if(fixtureWakeFailure)throw Error('Ambiguous wake-up outcome');return 'queued';}
    };
  `+compile(read('workflowExportClaimRows'))+'\nthisapp.workflowExportClaimRows=workflowExportClaimRows;\n'+compile(read('budgetActualImportRun')),context);
  const execute=()=>vm.runInContext('budgetActualImportRun(fixtureId)',context);
  const advance=()=>vm.runInContext(`var next=JSON.parse(tables.Workflow_Run_Log[0].Export_State);if(next.phase!=='waiting')throw Error('Not waiting');next.phase='processing';tables.Workflow_Run_Log[0].Export_State=JSON.stringify(next);budgetActualImportRun(fixtureId);`,context);
  const json=expr=>JSON.parse(vm.runInContext('JSON.stringify('+expr+')',context));
  return {context,execute,advance,json};
}

for(const actualChunkProfile of [null,SCAN_PROFILE])for(const callbackPolicy of [null,'shared-recovery-30m'])for(const source of ['const','dev','hcss']) {
  const scanLimit=actualChunkProfile===SCAN_PROFILE?100:25;
  const h=harness(Array.from({length:203},(_,i)=>sourceRow(i,source)),{source,callbackPolicy,actualChunkProfile});
  h.execute();assert.equal(h.json('writes').length,0);assert.equal(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualValidated'),scanLimit);
  assert.equal(h.json('claimRequests.length'),1,'the first validated source chunk uses one independent claim request');
  assert.equal(h.json('claimRequests[0].data.length'),scanLimit);
  let validated=scanLimit;
  while(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualPhase')==='preflight'){
    h.advance();const next=h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualValidated');assert.equal(next-validated,Math.min(scanLimit,203-validated));validated=next;
    assert.equal(h.json('writes').length,0,'all source chunks pass before the first business write');
  }
  assert.equal(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualPhase'),'apply');
  assert.equal(h.json('claimRequests.length'),Math.ceil(203/scanLimit),'203 validated keys use three new-profile or nine legacy independent requests');
  let applied=0;
  while(h.json('tables.Workflow_Run_Log[0].Run_Status')==='Running'){
    h.advance();const next=h.json('tables.Budget_Import_Item').length;assert.equal(next-applied,Math.min(25,203-applied),'write-heavy apply never exceeds twenty-five creates, including the final tail');applied=next;
  }
  const run=h.json('tables.Workflow_Run_Log[0]');assert.equal(run.Run_Status,'Success');assert.equal(run.Rows_Created,203);assert.equal(run.Rows_Processed,203);
  assert.equal(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).callbackPolicy??null'),callbackPolicy,'new callback policy survives every chunk while unflagged legacy runs remain unflagged');
  assert.equal(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualChunkProfile??null'),actualChunkProfile,'the captured chunk profile survives every chunk and missing legacy profiles stay missing');
  assert.equal(h.json('downloads.length'),Math.ceil(203/scanLimit)+Math.ceil(203/25),'changing every row retains the old maximum native write count while reducing preflight callbacks');
  assert.deepEqual(h.json('[...new Set(downloads)]'),['completed-immutable-job'],'all chunks use the original completed job');
  assert.equal(h.json('tables.Budget_Import_Item[0].Labor'),1.125);assert.equal(h.json('tables.Budget_Import_Item[0].Equipment'),-.125);
}
for(const source of ['const','dev','hcss']) {
  const rows=Array.from({length:203},(_,i)=>sourceRow(i,source));
  const h=harness(rows,{source,actualChunkProfile:SCAN_PROFILE,callbackPolicy:'shared-recovery-30m',destinations:rows.map((_row,i)=>destinationRow(i,source))});
  h.execute();while(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualPhase')==='preflight')h.advance();
  assert.equal(h.json('claimRequests.length'),3);assert.equal(h.json('writes.length'),0);
  const cursors=[];
  while(h.json('tables.Workflow_Run_Log[0].Run_Status')==='Running'){
    h.advance();cursors.push(h.json('tables.Workflow_Run_Log[0].Rows_Processed'));assert.equal(h.json('writes.length'),0,'unchanged scans do not write destination fields');
  }
  assert.deepEqual(cursors,[100,200,203],'unchanged apply scans advance one hundred rows and then the exact tail');
  const run=h.json('tables.Workflow_Run_Log[0]');assert.equal(run.Run_Status,'Success');assert.equal(run.Rows_Skipped,203);assert.equal(run.Rows_Created+run.Rows_Updated,0);
  assert.equal(h.json('downloads.length'),6,'203 unchanged rows complete in six executions instead of eighteen');
}
{
  const rows=Array.from({length:120},(_,i)=>sourceRow(i));
  const changed=new Set(Array.from({length:25},(_,i)=>i*3+2).concat([90,101]));
  const destinations=rows.flatMap((_row,i)=>changed.has(i)&&i%2===0?[]:[destinationRow(i,'const',changed.has(i)?{Cost:0}:{})]);
  const h=harness(rows,{actualChunkProfile:SCAN_PROFILE,destinations});
  h.execute();h.advance();assert.equal(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualPhase'),'apply');
  assert.deepEqual(h.json('claimRequests.map(request=>request.data.length)'),[100,20]);
  // A malformed following row must not even be validated after mutation 25.
  vm.runInContext("sourceRows[75].Other='invalid';",h.context);h.advance();
  let run=h.json('tables.Workflow_Run_Log[0]');
  assert.equal(run.Run_Status,'Running');assert.equal(run.Rows_Processed,75);assert.equal(run.Rows_Created,13);assert.equal(run.Rows_Updated,12);assert.equal(run.Rows_Skipped,50);
  assert.equal(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualIndex'),75,'the cap persists the completed prefix, not the planned 100-row slice end');
  assert.equal(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualValidated'),120);
  vm.runInContext("sourceRows[75].Other='4';",h.context);h.advance();
  run=h.json('tables.Workflow_Run_Log[0]');assert.equal(run.Run_Status,'Success');assert.equal(run.Rows_Processed,120);assert.equal(run.Rows_Created,14);assert.equal(run.Rows_Updated,13);assert.equal(run.Rows_Skipped,93);
  assert.deepEqual(h.json('[...claims].filter(key=>key.includes("|actual|apply|"))'),[ID+'|actual|apply|0',ID+'|actual|apply|75'],'the tail resumes exactly once under a new immutable cursor claim');
}
for(const actualChunkProfile of ['unknown-profile', 'scan100-write100-v1']) {
  const h=harness([sourceRow(0)],{actualChunkProfile});assert.throws(h.execute,error=>String(error).includes('Unknown actual import chunk profile'));
  assert.equal(h.json('downloads.length'),0);assert.equal(h.json('claims.size'),0);assert.equal(h.json('claimRequests.length'),0);assert.equal(h.json('writes.length'),0);assert.equal(h.json('wakes.length'),0);
  assert.equal(h.json('events.at(-1).status'),'Failed','unknown profiles fail before source reads or immutable claims');
}
for(const source of ['const','dev','hcss']) {
  const h=harness([sourceRow(0,source)],{source});
  vm.runInContext(compile(read('workflowExportPlan'))+compile(read('workflowExportEnqueueCaptured'))+';thisapp.workflowExportEnqueueCaptured=workflowExportEnqueueCaptured;'+compile(read('workflowExportEnqueue'))+`
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
  assert.deepEqual(h.json('recoveryArms'),['arm']);
  assert.ok(h.json('callOrder.indexOf("hold:begin")')<h.json('callOrder.indexOf("recovery:arm")'),'durable startup intent precedes recovery arming');
  assert.ok(h.json('callOrder.indexOf("log:start")')<h.json('callOrder.indexOf("hold:close")'),'only the exact audited target closes the startup intent');
  assert.equal(h.json('startupHolds[0].status'),'closed');
  assert.ok(h.json('callOrder.indexOf("recovery:arm")')<h.json('callOrder.indexOf("log:start")'),'new queue arms shared recovery before creating its audited run');
  assert.equal(h.json('events.find(event=>event.action==="start").callbackPolicy'),'shared-recovery-30m');
  assert.equal(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).callbackPolicy'),'shared-recovery-30m');
  assert.equal(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualChunkProfile'),SCAN_PROFILE,'new actual runs opt into the bounded larger scan');
  assert.throws(()=>vm.runInContext('workflowExportPlan(fixtureWorkflow,5)',h.context));
  vm.runInContext('tables.External_System_Mapping.push({...tables.External_System_Mapping[0],Subdivision1:{ID:String(BigInt(fixtureSub)+1n),Subdivision_Code:"PHASE-OTHER"}});',h.context);
  assert.throws(()=>vm.runInContext('workflowExportPlan(fixtureWorkflow,0)',h.context),error=>String(error).includes('ambiguous'),'same-system duplicates outside the selected group still fail before export');
}
{
  const h=harness([sourceRow(0)],{recoveryFailure:true});
  vm.runInContext(compile(read('workflowExportEnqueueCaptured'))+';thisapp.workflowExportEnqueueCaptured=workflowExportEnqueueCaptured;'+compile(read('workflowExportEnqueue')),h.context);
  assert.throws(()=>vm.runInContext('workflowExportEnqueue(fixtureWorkflow)',h.context),/recovery successor/);
  assert.deepEqual(h.json('recoveryArms'),['arm']);assert.equal(h.json('events.length'),0,'failed recovery arming creates no audited run with suppressed per-record timers');
  assert.equal(h.json('wakes.length'),0);assert.equal(h.json('writes.length'),0);
}

for(const actualChunkProfile of [null,SCAN_PROFILE])for(const breakRow of [row=>{delete row.Other;},row=>{row.Other='invalid';},row=>{row.Unclassified_Count=1;},row=>{row.Total_Actuals=null;},row=>{row.WS_Job_Number_Trim='UNMAPPED';}]) {
  const rows=Array.from({length:151},(_,i)=>sourceRow(i));breakRow(rows[150]);const h=harness(rows,{actualChunkProfile});h.execute();
  assert.throws(()=>{while(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualPhase')==='preflight')h.advance();});assert.equal(h.json('writes').length,0,'a malformed later source row cannot partially apply earlier valid rows');
  const event=h.json('events.at(-1)');assert.equal(event.status,'Failed');assert.equal(event.counts.failed,1);assert.match(event.details,/batch=0; phase=preflight; source row=151/);
}
for(const actualChunkProfile of [null,SCAN_PROFILE]) {
  const rows=Array.from({length:101},(_,i)=>sourceRow(i));rows[100]={...rows[0]};const h=harness(rows,{actualChunkProfile});h.execute();assert.throws(()=>{while(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualPhase')==='preflight')h.advance();},error=>String(error).includes('Duplicate actual source key'));assert.equal(h.json('writes').length,0,'cross-chunk source duplicates fail the whole preflight');
  assert.equal(h.json('events.at(-1).counts.processed'),0);assert.match(h.json('events.at(-1).details'),/source row=101/);
}
{
  const h=harness([sourceRow(0)],{claimFailure:'actual-row'});assert.throws(h.execute);assert.equal(h.json('writes').length,0);assert.equal(h.json('events.at(-1).status'),'Failed');assert.throws(h.execute,'a failed claim does not authorize a second automatic run');
}
for(const actualChunkProfile of [null,SCAN_PROFILE]) {
  const chunkSize=actualChunkProfile===SCAN_PROFILE?100:25;
  const rows=Array.from({length:chunkSize},(_,i)=>sourceRow(i));rows[chunkSize-1].Other='invalid';const h=harness(rows,{actualChunkProfile});
  assert.throws(h.execute);assert.equal(h.json('claimRequests.length'),0,'every row in the chunk validates before its row-claim request');
  assert.equal(h.json('tables.Workflow_Export_Lock.length'),0);assert.equal(h.json('writes').length,0);
}
for(const actualChunkProfile of [null,SCAN_PROFILE])for(const rowClaimMode of ['partial','lost-after-persist','deadline-after-ack']) {
  const chunkSize=actualChunkProfile===SCAN_PROFILE?100:25;
  const h=harness(Array.from({length:chunkSize},(_,i)=>sourceRow(i)),{rowClaimMode,actualChunkProfile});
  assert.throws(h.execute);assert.equal(h.json('writes').length,0,'an uncertain claim batch never authorizes business writes');
  assert.equal(h.json('events.at(-1).status'),'Failed');assert.equal(h.json('claimRequests.length'),1);
  assert.ok(h.json('tables.Workflow_Export_Lock.length')>0,'independent row claims can survive the rejected chunk');
  assert.equal(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).actualValidated??null'),null,'the preflight cursor advances only after timely acknowledgement of the entire claim batch');
  assert.throws(h.execute);assert.equal(h.json('claimRequests.length'),1,'partial, lost or late replies do not trigger an automatic batch replay');
}
for(const actualChunkProfile of [null,SCAN_PROFILE]) {
  const h=harness([sourceRow(0)],{failWriteAt:1,actualChunkProfile});h.execute();assert.throws(h.advance);assert.equal(h.json('events.at(-1).status'),'Partial');assert.equal(h.json('events.at(-1).counts.failed'),1);assert.match(h.json('events.at(-1).details'),/key=0007-Job-GP-3000/);assert.throws(h.execute,'unknown native business writes remain terminal and never replay automatically');
}
{
  const h=harness([sourceRow(0)],{wakeFailure:true});assert.throws(h.execute);assert.equal(h.json('events.at(-1).status'),'Failed');assert.equal(h.json('writes').length,0,'ambiguous continuation creation cannot proceed to business writes');
}
{
  const h=harness([sourceRow(0)]);h.execute();vm.runInContext('sourceRows.push({...sourceRows[0],Cost_Code_Number_2:3001});',h.context);assert.throws(h.advance,error=>String(error).includes('row count changed'));assert.equal(h.json('writes').length,0);
}
for(const actualChunkProfile of [null,SCAN_PROFILE]) {
  const h=harness([sourceRow(0)],{actualChunkProfile});vm.runInContext('clock=new Date(clock.getTime()+121*60000);',h.context);assert.throws(h.execute,error=>String(error).includes('deadline'));assert.equal(h.json('writes').length,0);assert.equal(h.json('events.at(-1).status'),'Failed');
}
{
  const h=harness([]);assert.match(h.execute(),/Empty source/);assert.equal(h.json('tables.Workflow_Run_Log[0].Run_Status'),'Skipped');assert.equal(h.json('writes').length,0);
}
{
  const h=harness([sourceRow(0,'const',{Labor:1.1299})]);h.execute();h.advance();assert.equal(h.json('tables.Budget_Import_Item[0].Labor'),1.1299,'GP Construction raw element precision is preserved beside its rounded total');
  const dev=harness([sourceRow(0,'dev',{Labor:1.1299})],{source:'dev'});dev.execute();dev.advance();assert.equal(dev.json('tables.Budget_Import_Item[0].Labor'),1.1299);assert.equal(dev.json('tables.Budget_Import_Item[0].Cost'),10,'GP Development selected amounts are independent from its preserved parent');
}
{
  const h=harness([sourceRow(0,'hcss',{Labor:1.12500000001,Unclassified_Actuals:-1e-10})],{source:'hcss'});h.execute();h.advance();
  assert.equal(h.json('tables.Budget_Import_Item[0].Labor'),1.125,'source values normalize independently to native four-place storage');
  const rounded=harness([sourceRow(0,'dev',{Labor:1.125049,Other:4.000049,Total_Actuals:10.000098})],{source:'dev'});rounded.execute();rounded.advance();assert.equal(rounded.json('tables.Budget_Import_Item[0].Cost'),10.0001);assert.equal(rounded.json('tables.Budget_Import_Item[0].Labor'),1.125);assert.equal(rounded.json('tables.Budget_Import_Item[0].Other'),4,'rounding the parent never reallocates a difference into Other');
}
for(const source of ['const','dev','hcss']){
  const amountKey=source==='hcss'?'TotalActualCost':'Total_Actuals';
  const parent=source==='const'?77.12:-77.1234;
  const selected={Labor:'1.1250',Materials:'0',Equipment:'-2.2500',Subcontractor:'3.1250',Other:'4.0000'};
  const rows=[sourceRow(0,source,{...selected,[amountKey]:parent,Unclassified_Actuals:123.45}),sourceRow(1,source,{Labor:0,Materials:0,Equipment:0,Subcontractor:0,Other:0,[amountKey]:5,Unclassified_Actuals:null})];
  const h=harness(rows,{source});h.execute();assert.equal(h.json('writes').length,0,'independent amounts still complete full-source preflight before writes');h.advance();
  assert.equal(h.json('tables.Workflow_Run_Log[0].Run_Status'),'Success');
  const saved=h.json('tables.Budget_Import_Item');assert.equal(saved[0].Cost,parent);assert.deepEqual(names.map(name=>saved[0][name]),[1.125,0,-2.25,3.125,4],'nonzero diagnostic residual cannot change any selected field');assert.equal(saved[1].Cost,5);assert.deepEqual(names.map(name=>saved[1][name]),[0,0,0,0,0],'a positive parent does not fabricate any selected element amounts');
  assert.equal(h.json('events.some(event=>event.status==="Failed"||event.status==="Partial")'),false,'permitted differences do not produce failures');
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

const plan=read('workflowExportPlan'),enqueue=read('workflowExportEnqueueCaptured'),tick=read('workflowExportTick'),dispatch=read('workflowExportDispatch'),wake=read('workflowExportWake'),claim=read('workflowExportClaim');
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
console.log('PASS: new 100-row preflight/unchanged scans with a combined 25-create/update cap and exact mixed-prefix resume, legacy 25-row behavior, independent actual amounts, complete preflight, immutable source, guards, signed precision, deadline and unknown-write no replay.');
