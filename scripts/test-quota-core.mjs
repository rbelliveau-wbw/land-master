// Execute the changed Deluge bodies against native-shaped records and API replies.
// Creator Save/Execute remains the syntax and live scheduling verification gate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=name=>fs.readFileSync('creator/functions/'+name+'.dg','utf8').replace(/\r\n/g,'\n');
const native=name=>fs.readFileSync('creator/quota-reduction-2026-11-05/native-before/development/'+name+'.dg','utf8').replace(/\r\n/g,'\n').replace(/^ {17}/gm,'');
const tokens=text=>text.match(/"(?:\\.|[^"\\])*"|\/\/[^\n]*|\/\*[\s\S]*?\*\/|[^\s]/g).filter(token=>!token.startsWith('//')&&!token.startsWith('/*')).join('');
assert.equal(tokens(read('workflowExportPlan')),tokens(native('workflowExportPlan')),'captured source selection, mappings and financial data meaning are unchanged');
// Preserve every business branch against the fresh Production snapshot. Only
// the successor startup coordination block is substituted; it is executed
// separately below with hold-order and failed-startup assertions.
const productionRun=fs.readFileSync('creator/quota-five-hour-recovery-2026-11-06/native-before/production-v9.160/workflowExportRun.dg','utf8');
let preservedRun=read('workflowExportRun');
const startupBlock=/nextPolicy = ifnull\(state\.get\("callbackPolicy"\),""\)\.toString\(\);[\s\S]*?nextAt = zoho\.currenttime\.addMinutes\(1\);/;
assert.ok(startupBlock.test(preservedRun)&&startupBlock.test(productionRun),'both versions identify exactly the Budget successor handoff');
preservedRun=preservedRun.replace(startupBlock,productionRun.match(startupBlock)[0]);
assert.equal(tokens(preservedRun),tokens(productionRun),'every deployed business branch and failure/predecessor guard remains identical outside the explicit successor startup handoff');
function compile(source){
  const strings=[];
  let s=source.replace(/"(?:\\.|[^"\\])*"/g,value=>'STRINGTOKEN'+(strings.push(value)-1)+'END');
  s=s.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g,'');
  const head=s.match(/^\s*(string|map|list|bool)\s+(\w+)\(([^)]*)\)\s*\{/);
  const args=head[3].split(',').map(arg=>arg.trim().split(/\s+/).at(-1));
  s=s.replace(head[0],`function ${head[2]}(${args.join(',')}){`);
  s=s.replace(/invokeurl\s*\[([\s\S]*?)\]/g,(_all,request)=>'fixtureHttp({'+request.trim().split('\n').map(line=>line.trim()).filter(Boolean).map(line=>line.replace(/^type\s*:\s*(\w+)$/,(_line,type)=>'type:"'+type+'"')).join(',')+'})');
  s=s.replace(/\b(Workflow_Run_Log|Workflow_Export_Lock)\[([^\]]+)\](?:\s+range from (\d+) to (\d+))?/g,(_all,table,criteria,start,end)=>{
    const expr=criteria.replace(/(?<![.\w])(ID|Claim_Key|Run_Status|Export_State|Cycle_State|Claimed_At|Wake_At|Added_Time)\b/g,'row.$1');
    return `fetchRecords("${table}",row=>${expr},${start??0},${end??100000})`;
  });
  s=s.replace(/\{\s*((?:STRINGTOKEN\d+END|\d+)(?:\s*,\s*(?:STRINGTOKEN\d+END|\d+))*)\s*\}/g,'[$1]');
  s=s.replace(/for each\s+(\w+) in ([^\n{]+)/g,'for ($1 of $2)');
  s=s.replace(/\.length\(\)/g,'.lengthCall()');
  s=s.replace(/\binfo ([^;]+);/g,'fixtureInfo($1);');
  const variables=[...new Set([...s.matchAll(/(?<![.\w])([A-Za-z_]\w*)\s*=(?!=)/g)].map(match=>match[1]).concat([...s.matchAll(/for \((\w+) of/g)].map(match=>match[1])))].filter(name=>!args.includes(name));
  s=s.replace(`function ${head[2]}(${args.join(',')}){`,`function ${head[2]}(${args.join(',')}){var ${variables.join(',')};`);
  return s.replace(/STRINGTOKEN(\d+)END/g,(_all,index)=>strings[Number(index)]);
}

const POLICY='shared-recovery-30m';
const ID='4410926000005159046';
const NOW=Date.parse('2026-11-05T12:00:00Z');
function harness({now=NOW,runs=[],locks=[],httpMode='',jobStatus='1002',refreshOnRecheck=false,starterFailures=[],starterArm=false}={}){
  const context=vm.createContext({console,fixtureNow:now,fixtureRuns:JSON.stringify(runs),fixtureLocks:JSON.stringify(locks),fixtureHttpMode:httpMode,fixtureJobStatus:jobStatus,fixtureRefreshOnRecheck:refreshOnRecheck,fixtureStarterFailures:starterFailures,fixtureStarterArm:starterArm});
  vm.runInContext(`
    var clock=new Date(fixtureNow),requests=[],messages=[],businessCalls=[],starterCalls=[],starterObserved=[],holdCalls=[],formActions=[],nextId=900000;
    function ifnull(value,fallback){return value==null?fallback:value;}
    function Map(){return {};}
    function List(){return [];}
    Object.defineProperties(Object.prototype,{get:{value:function(key){return this[key]??null;}},put:{value:function(key,value){this[key]=value;}},keys:{value:function(){return Object.keys(this);}},toString:{value:function(){return JSON.stringify(this);}}});
    Array.prototype.get=function(index){return this[index]??null;};Array.prototype.size=function(){return this.length;};Array.prototype.add=function(value){this.push(value);};Array.prototype.contains=function(value){return this.includes(value);};
    String.prototype.toMap=function(){return JSON.parse(this);};String.prototype.toList=function(separator){return this.split(separator);};String.prototype.lengthCall=function(){return this.length;};String.prototype.matches=function(pattern){return new RegExp('^(?:'+pattern+')$').test(this);};String.prototype.contains=function(text){return this.includes(text);};String.prototype.left=function(count){return this.slice(0,count);};String.prototype.toLong=function(){const n=BigInt(this);return n>BigInt(Number.MAX_SAFE_INTEGER)?n:Number(n);};
    String.prototype.toDateTime=function(){const m=this.match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4}) (\\d{2}):(\\d{2}):(\\d{2}) (AM|PM)$/);if(!m)return new Date(String(this));return new Date(Date.UTC(+m[3],+m[1]-1,+m[2],(+m[4]%12)+(m[7]==='PM'?12:0),+m[5],+m[6]));};
    Number.prototype.toLong=function(){return Math.trunc(this);};
    Date.prototype.toLong=function(){return this.getTime();};Date.prototype.addMinutes=function(minutes){return new Date(this.getTime()+minutes*60000);};
    Date.prototype.toString=function(format){const pad=n=>String(n).padStart(2,'0');if(format==='mm')return pad(this.getUTCMinutes());if(format==null)return this.toISOString();const hour=this.getUTCHours();return pad(this.getUTCMonth()+1)+'/'+pad(this.getUTCDate())+'/'+this.getUTCFullYear()+' '+pad(hour%12||12)+':'+(format.includes('hh:00:00')?'00:00':pad(this.getUTCMinutes())+':'+pad(this.getUTCSeconds()))+' '+(hour>=12?'PM':'AM');};
    function hydrate(row){for(const field of ['Wake_At','Resume_At','Started_At','Claimed_At'])if(row[field]!=null)row[field]=typeof row[field]==='string'&&row[field].includes('/')?row[field].toDateTime():new Date(row[field]);return row;}
    var tables={Workflow_Run_Log:JSON.parse(fixtureRuns).map(hydrate),Workflow_Export_Lock:JSON.parse(fixtureLocks).map(hydrate)};
    var recheckRefreshed=false;
    function fetchRecords(table,predicate,start,end){if(fixtureRefreshOnRecheck&&!recheckRefreshed&&table==='Workflow_Run_Log'&&predicate.toString().includes('row.ID')){const fresh=JSON.parse(tables[table][0].Export_State);fresh.checkpointAt=clock.getTime();tables[table][0].Export_State=JSON.stringify(fresh);recheckRefreshed=true;}const records=tables[table].filter(predicate).slice(start,end+1);const target={count(){return records.length;},[Symbol.iterator]:function*(){yield* records;}};return new Proxy(target,{get(target,key){return key in target?target[key]:records[0]?.[key]??null;},set(_target,key,value){if(records.length!==1)throw Error('Ambiguous native update');records[0][key]=value;return true;}});}
    function fixtureInfo(value){messages.push(String(value));}
    function fixtureHttp(request){
      const payload=request.parameters?JSON.parse(request.parameters):{};requests.push({url:request.url,type:request.type,payload,headers:request.headers});
      if(request.url.includes('analyticsapi.zoho.com'))return {responseCode:200,responseText:JSON.stringify({status:'success',data:{jobId:'job-1',jobCode:fixtureJobStatus}})};
      const isClock=JSON.stringify(payload).includes('0|recovery|');
      if(fixtureHttpMode==='clock-reject'&&isClock)return {responseCode:500,responseText:'{}'};
      if(request.type==='PATCH'){
        const id=request.url.split('/').at(-1),row=tables.Workflow_Run_Log.find(row=>row.ID===id);if(!row)throw Error('Unknown audit target');Object.assign(row,payload.data);hydrate(row);formActions.push({id,skip:payload.skip_workflow??[]});return {responseCode:200,responseText:JSON.stringify({code:3000,data:{ID:id}})};
      }
      const table=request.url.endsWith('/Workflow_Run_Log')?'Workflow_Run_Log':'Workflow_Export_Lock';
      const rows=Array.isArray(payload.data)?payload.data:[payload.data];
      if(fixtureHttpMode==='tick-owner-race'&&rows.some(row=>row.Claim_Key?.startsWith('${ID}|tick|'))){for(const row of rows)tables.Workflow_Export_Lock.push(hydrate({ID:'late-owner',...row}));}
      const result=[];
      for(const data of rows){
        if(table==='Workflow_Export_Lock'&&tables[table].some(row=>row.Claim_Key===data.Claim_Key)){result.push({code:3001,error:'Duplicate unique key'});continue;}
        const row=hydrate({ID:String(nextId++),...data});tables[table].push(row);formActions.push({id:row.ID,skip:payload.skip_workflow??[]});result.push({code:3000,data:{ID:row.ID,...(data.Claim_Key?{Claim_Key:data.Claim_Key}:{})}});
      }
      if(fixtureHttpMode==='clock-lost'&&isClock)throw Error('Reply lost after clock committed');
      if(fixtureHttpMode==='slot-lost'&&rows.some(row=>row.Claim_Key==='0|tick|'+fixtureNow))throw Error('Reply lost after slot committed');
      let body={code:result.every(row=>row.code===3000)?3000:3001,result};
      if(fixtureHttpMode==='missing-ack-key'&&!isClock&&table==='Workflow_Export_Lock')for(const ack of result)delete ack.data?.Claim_Key;
      if(fixtureHttpMode==='partial-ack'&&!isClock&&result.length>1)result[1]={code:3001,error:'Validation failed'};
      if(fixtureHttpMode==='duplicate-ack'&&!isClock&&result.length>1)result[1]=result[0];
      return {responseCode:200,responseText:JSON.stringify(body)};
    }
    var zoho={get currenttime(){return clock;}};
    var thisapp={environment:{type:'development',linkname:'development'},workflowRecoveryHold(action,identity,target){holdCalls.push({action,identity,target});return 'Open';},workflowStarterDispatch(id){starterCalls.push(id);starterObserved.push({id,requestCount:requests.length,keys:tables.Workflow_Export_Lock.map(row=>row.Claim_Key)});if(fixtureStarterFailures.includes(id))throw Error('Starter frame acknowledgement unknown');if(fixtureStarterArm)thisapp.workflowExportRecover('arm');return 'Frame reconciliation complete';},workflowExportRun(id){businessCalls.push(['run',id]);return 'completed';},budgetActualImportRun(id){businessCalls.push(['actual',id]);return 'completed';},budgetPlanImportRun(id){businessCalls.push(['plan',id]);return 'completed';}};
  `,context);
  for(const name of ['workflowExportClaim','workflowRunLog','workflowExportRecover','workflowExportWake','workflowExportDispatch','workflowExportTick']){
    vm.runInContext(compile(read(name))+`;thisapp.${name}=${name};`,context,{filename:name+'.dg'});
  }
  const exec=code=>vm.runInContext(code,context);
  const json=code=>JSON.parse(exec('JSON.stringify('+code+')'));
  return {exec,json,context};
}
function state(extra={}){return {version:1,callbackPolicy:POLICY,workflow:'Budgets_Import_Load_GP_Co',phase:'waiting',tick:0,checkpointAt:NOW-31*60000,actualPhase:'preflight',actualDeadline:NOW+89*60000,actualDeadlineAt:'11/05/2026 01:29:00 PM',...extra};}
function run(extra={},other={}){return {ID,Run_Status:'Running',Started_At:NOW-40*60000,Export_State:JSON.stringify(state(extra)),Resume_At:NOW-30*60000,Rows_Received:25,Rows_Processed:0,...other};}
function clockLock(due=NOW){return {ID:'501',Claim_Key:'0|recovery|'+due,Wake_At:due};}
function starterLock(id,ageMinutes,extra={}){return {ID:id,Claim_Key:'0|starter|4410926000000000021|'+(NOW-ageMinutes*60000),Cycle_State:JSON.stringify({version:1,kind:'starter-cycle'}),Claimed_At:NOW-ageMinutes*60000,...extra};}

{
  const h=harness({locks:[starterLock('700',40)],starterArm:true});h.exec('workflowExportRecover("arm")');
  assert.deepEqual(h.json('starterCalls'),[],'arm-only calls return before frame scanning, including Frame -> arm recursion');
}
{
  const locks=[clockLock(),starterLock('700',29),starterLock('701',30),starterLock('702',180),starterLock('703',181),starterLock('704',60,{Cycle_State:null}),starterLock('705',60,{Claim_Key:'0|unrelated|1'}),starterLock('706',-1)];
  const h=harness({locks,starterArm:true});h.exec('workflowExportRecover("501")');
  assert.deepEqual(h.json('starterCalls'),['701','702'],'only immutable starter frames in the inclusive thirty-to-one-hundred-eighty-minute recovery window are dispatched');
  const requests=h.json('requests');assert.equal(requests.length,2,'frame dispatch may arm the already established successor without extra API work');
  assert.ok(requests[0].payload.data.Claim_Key.startsWith('0|recovery|'),'successor remains acknowledged before frame work');
  assert.equal(requests[1].payload.data.Claim_Key,'0|tick|'+NOW,'clock-slot ownership precedes frame work');
  for(const observed of h.json('starterObserved')){assert.ok(observed.keys.includes('0|tick|'+NOW));assert.ok(observed.keys.includes('0|recovery|'+(NOW+30*60000)));assert.equal(observed.requestCount,2,'both durable ownership requests completed before any starter callback');}
  assert.deepEqual(h.json('businessCalls'),[],'recovery hands off frames instead of invoking business workers');
  h.exec('workflowExportRecover("501")');assert.deepEqual(h.json('starterCalls'),['701','702'],'a duplicate clock cannot reconcile starter frames twice');
}
{
  const locks=[clockLock(),...Array.from({length:10},(_,index)=>starterLock(String(700+index),40))];
  const h=harness({locks});h.exec('workflowExportRecover("501")');
  assert.equal(h.json('starterCalls.length'),8,'one recovery execution dispatches at most eight eligible starter frames');
  assert.deepEqual(h.json('businessCalls'),[]);
}
{
  const h=harness({runs:[run({phase:'processing',actualPhase:'apply',actualWriteAttempted:true})],locks:[clockLock(),starterLock('700',40),starterLock('701',50)],starterFailures:['700']});
  h.exec('workflowExportRecover("501")');
  assert.deepEqual(h.json('starterCalls'),['700','701'],'one failed frame cannot suppress subsequent frames');
  assert.equal(h.json('tables.Workflow_Run_Log[0].Run_Status'),'Partial','ordinary stale-child recovery still completes after a frame error');
  assert.ok(h.json('messages').some(message=>message.includes('starter frame 700')&&message.includes('No route was replayed')));
  assert.deepEqual(h.json('businessCalls'),[]);
}
{
  const ordinary=harness({runs:[run({checkpointAt:NOW})],locks:[clockLock()]}),complete=harness({runs:[run({checkpointAt:NOW})],locks:[clockLock(),starterLock('700',40)]});
  ordinary.exec('workflowExportRecover("501")');complete.exec('workflowExportRecover("501")');
  assert.deepEqual(complete.json('requests'),ordinary.json('requests'),'a frame dispatch with no remaining writes adds no recovery audit/claim/wake API requests');
}
{
  const h=harness({locks:[clockLock(),starterLock('700',40)],httpMode:'slot-lost'});h.exec('workflowExportRecover("501")');
  assert.deepEqual(h.json('starterCalls'),[],'an unknown clock-slot acknowledgement cannot authorize starter reconciliation');
  assert.deepEqual(h.json('businessCalls'),[]);assert.equal(h.json('requests.length'),2);
}

{
  const h=harness({now:NOW+7*60000});h.exec('workflowExportRecover("arm")');h.exec('workflowExportRecover("arm")');
  assert.equal(h.json('requests').length,1,'many jobs share the same independently created half-hour clock');
  assert.equal(h.json('tables.Workflow_Export_Lock[0].Claim_Key'),'0|recovery|'+(NOW+30*60000));
}
for(const mode of ['clock-lost','clock-reject']){
  const h=harness({httpMode:mode});
  if(mode==='clock-lost')assert.doesNotThrow(()=>h.exec('workflowExportRecover("arm")'));
  else assert.throws(()=>h.exec('workflowExportRecover("arm")'),error=>String(error).includes('No acknowledged'));
  assert.equal(h.json('requests').length,1,'an uncertain clock create is reconciled read-only and never retried');
}
{
  const h=harness({runs:[run()],locks:[clockLock()]});h.exec('workflowExportRecover("501")');
  const req=h.json('requests');assert.ok(req[0].payload.data.Claim_Key.startsWith('0|recovery|'),'successor is armed before claiming/scanning');
  assert.equal(req.filter(request=>Array.isArray(request.payload.data)).length,1,'missed unclaimed primary gets one independent fallback batch');
  assert.equal(h.json('tables.Workflow_Export_Lock.filter(row=>row.Claim_Key===\''+ID+'|wake|0|2\').length'),1);
  assert.deepEqual(h.json('businessCalls'),[],'shared recovery does not inline an importer');
  const before=req.length;h.exec('workflowExportRecover("501")');assert.equal(h.json('requests').length,before,'duplicate clock cannot claim/scan the same slot twice');
}
for(const extra of [{phase:'processing',actualPhase:'apply',actualWriteAttempted:true},{phase:'arming',actualPhase:'preflight'},{phase:'preparing',actualPhase:null,actualDeadline:null}]){
  const h=harness({runs:[run(extra)],locks:[clockLock()]});h.exec('workflowExportRecover("501")');
  assert.equal(h.json('tables.Workflow_Run_Log[0].Run_Status'),extra.actualWriteAttempted?'Partial':'Failed');
  assert.deepEqual(h.json('businessCalls'),[],'stale owned/arming/preparing work is never replayed');
  assert.ok(h.json('formActions').some(item=>item.skip.includes('schedules')),'terminal audit writes retain forms but suppress their redundant timers');
}
{
  const h=harness({runs:[run()],locks:[clockLock(),{ID:'502',Claim_Key:ID+'|tick|0',Claimed_At:NOW-31*60000}]});h.exec('workflowExportRecover("501")');
  assert.equal(h.json('tables.Workflow_Run_Log[0].Run_Status'),'Failed');assert.equal(h.json('requests.filter(r=>Array.isArray(r.payload.data)).length'),0,'claimed waiting tick has no fallback');
}
for(const extra of [{},{actualPhase:null,actualDeadline:null,deadline:NOW-1}]){
  const h=harness({runs:[run(extra)],locks:[clockLock(),{ID:'502',Claim_Key:ID+'|tick|0',Claimed_At:NOW-1000}]});h.exec('workflowExportRecover("501")');
  assert.equal(h.json('tables.Workflow_Run_Log[0].Run_Status'),'Running','fresh tick ownership protects a delayed primary before its first phase checkpoint');
  assert.equal(h.json('requests.filter(r=>r.type==="PATCH").length'),0,'recovery sends no spurious failure audit or notification for a fresh owner');
}
{
  const h=harness({runs:[run({actualPhase:null,actualDeadline:null,deadline:NOW-1})],locks:[clockLock()],httpMode:'tick-owner-race'});h.exec('workflowExportRecover("501")');
  assert.equal(h.json('tables.Workflow_Run_Log[0].Run_Status'),'Running','a primary winning the original tick claim between read and terminal write cancels recovery\'s finish');
  assert.equal(h.json('requests.filter(r=>r.type==="PATCH").length'),0);
}
{
  const h=harness({runs:[run({actualPhase:null,actualDeadline:null,deadline:NOW-1})],locks:[clockLock()]});h.exec('workflowExportRecover("501")');
  assert.equal(h.json('tables.Workflow_Run_Log[0].Run_Status'),'Timed Out');assert.deepEqual(h.json('businessCalls'),[],'expired export never starts business work');
}
{
  const h=harness({runs:[run({checkpointAt:NOW-29*60000})],locks:[clockLock()]});h.exec('workflowExportRecover("501")');
  assert.equal(h.json('tables.Workflow_Run_Log[0].Run_Status'),'Running','recent checkpoints are not failed by another job\'s clock');
}
for(const extra of [{phase:'processing',actualPhase:'apply',actualWriteAttempted:true},{actualPhase:null,actualDeadline:null,deadline:NOW-1}]){
  const h=harness({runs:[run(extra)],locks:[clockLock()],refreshOnRecheck:true});h.exec('workflowExportRecover("501")');
  assert.equal(h.json('tables.Workflow_Run_Log[0].Run_Status'),'Running','durable progress arriving after the scan snapshot prevents a stale terminal write');
  assert.equal(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).checkpointAt'),NOW);
}
{
  const h=harness({runs:Array.from({length:101},(_,i)=>run({}, {ID:String(90000+i),Resume_At:NOW+60000})),locks:[clockLock()]});h.exec('workflowExportRecover("501")');
  assert.ok(h.json('messages').some(message=>message.includes('100-run scan bound')),'a saturated bounded scan reports its backlog rather than claiming full coverage');
}
{
  const h=harness({runs:[run({callbackPolicy:'legacy'})],locks:[clockLock()]});h.exec('workflowExportRecover("501")');
  assert.equal(h.json('tables.Workflow_Run_Log[0].Run_Status'),'Running','new recovery leaves all legacy runs untouched');
}
for(const policy of [POLICY,'legacy']){
  const h=harness({runs:[run({callbackPolicy:policy})]});h.exec('workflowExportWake("'+ID+'",0,"11/05/2026 12:01:00 PM")');
  const creates=h.json('requests.filter(r=>Array.isArray(r.payload.data))');assert.equal(creates.length,1,'all callbacks use one POST');
  assert.equal(creates[0].payload.data.length,policy===POLICY?1:3,'new policy uses one primary; in-flight legacy keeps all safeguards');
}
for(const mode of ['missing-ack-key','partial-ack','duplicate-ack']){
  const h=harness({runs:[run({callbackPolicy:'legacy'})],httpMode:mode});assert.throws(()=>h.exec('workflowExportWake("'+ID+'",0,"11/05/2026 12:01:00 PM")'));
  assert.equal(h.json('requests').length,1,'bad/partial callback acknowledgements never trigger an automatic batch retry');
}
{
  const h=harness();h.exec('workflowRunLog({action:"start",workflow:"Budget import",system:"Analytics",callbackPolicy:"'+POLICY+'",queueWorkflow:"Budgets_Import_Load_GP_Co"})');
  assert.deepEqual(h.json('requests[0].payload.skip_workflow'),['schedules']);
  assert.equal(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).phase'),'preparing');
  assert.equal(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).checkpointAt'),NOW);
  assert.ok(!h.json('requests[0].payload.skip_workflow').includes('form_workflow'),'failure notices and final timestamps stay enabled');
}
{
  const h=harness();h.exec('workflowRunLog({action:"start",workflow:"Unrelated workflow",system:"Projects"})');
  assert.equal(h.json('requests[0].payload.skip_workflow??null'),null,'unrelated audit callers retain their original schedules');
}
{
  const h=harness();h.exec('workflowRunLog({action:"start",workflow:"Legacy opaque state",system:"Projects",exportState:"legacy-opaque-state"})');
  assert.equal(h.json('requests[0].payload.data.Export_State'),'legacy-opaque-state','legacy opaque state remains accepted without introducing a JSON parsing gate');
  const tooLarge=harness();assert.throws(()=>tooLarge.exec('workflowRunLog({action:"start",workflow:"Legacy state",system:"Projects",exportState:"x".repeat(60001)})'),error=>String(error).includes('too large'));
  assert.equal(tooLarge.json('requests').length,0,'the original size guard runs before any parsing or write');
}
for(const [pollNumber,delay] of [[0,1],[1,2],[2,4],[5,4]]){
  const exportState=state({actualPhase:null,actualDeadline:null,phase:'waiting',checkpointAt:NOW,pollNumber,requests:[{view:'view-1',job:'job-1',code:'1002',config:{}}],deadline:NOW+15*60000,deadlineAt:'11/05/2026 12:15:00 PM'});
  const h=harness({runs:[run(exportState,{Resume_At:NOW})]});h.exec('workflowExportTick("'+ID+'")');
  assert.equal(h.json('tables.Workflow_Run_Log[0].Resume_At.toLong()'),NOW+delay*60000,'pending export backs off while retaining its original job');
  assert.equal(h.json('JSON.parse(tables.Workflow_Run_Log[0].Export_State).deadline'),NOW+15*60000);
}
{
  const exportState=state({actualPhase:null,actualDeadline:null,phase:'waiting',checkpointAt:NOW,pollNumber:8,requests:[{view:'view-1',job:'job-1',code:'1002',config:{}}],deadline:NOW+2*60000,deadlineAt:'11/05/2026 12:02:00 PM'});
  const h=harness({runs:[run(exportState,{Resume_At:NOW})]});h.exec('workflowExportTick("'+ID+'")');
  assert.equal(h.json('tables.Workflow_Run_Log[0].Resume_At.toLong()'),NOW+2*60000,'backoff cannot move a continuation beyond the fixed deadline');
}
console.log('PASS: shared immutable clock, successor/slot before work, bounded aged starter-frame recovery with error isolation and arm-only no recursion, unknown-slot no replay, unchanged child recovery/legacy behavior, callback acknowledgements, audit durability and fixed-deadline polling.');
