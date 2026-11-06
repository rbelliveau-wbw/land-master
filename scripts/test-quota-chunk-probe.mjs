// Exercise the Development-only probe's authorization/due guards and diagnostics.
// This adapter does not establish native compilation or execution performance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const read=path=>fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n');
const source=read('creator/quota-reduction-2026-11-06/probes/workflowQuotaChunkProbe.dg');
const tokens=value=>value.replace(/\/\/[^\n]*/g,'').replace(/\s+/g,'');
const enqueue=read('creator/functions/workflowExportEnqueue.dg');
const capturedEnqueue=read('creator/functions/workflowExportEnqueueCaptured.dg');
// Canonical legacy behavior is executed against the frozen native source by
// test-quota-starters; the old chunk probe still calls the same public wrapper.
assert.match(enqueue,/return thisapp\.workflowExportEnqueueCaptured\(workflow,-1,"",-1\);/);
assert.equal((capturedEnqueue.match(/actualChunkProfile/g)||[]).length,1);
assert.match(capturedEnqueue,/if\(workflow == "Budgets_Import_Load_GP_Co" \|\| workflow == "Budgets_Import_Great_Plai1" \|\| workflow == "Budgets_Import_Load_HCSS_"\)\s*\{[^}]*actualChunkProfile/);
assert.doesNotMatch(source,/insert into|invokeurl|delete from|\.Resume_At\s*=(?!=)/,'probe has no independent data writer or due-date override');

function compile(value){
  const strings=[];
  let s=value.replace(/"(?:\\.|[^"\\])*"/g,text=>'STRINGTOKEN'+(strings.push(text)-1)+'END').replace(/\/\/[^\n]*/g,'');
  s=s.replace(/^string workflowQuotaChunkProbe\(string requestText\)/,'function workflowQuotaChunkProbe(requestText)');
  s=s.replace(/Workflow_Run_Log\[ID == (auditId|dualId|referenceId).toLong\(\)\]/g,(_all,id)=>'fixtureAuditById('+id+')');
  s=s.replace(/(Add_Budget|Subdivision|External_System_Mapping)\[([^\]]+)\]/g,(_all,table,criteria)=>'fixtureNativeCounts("'+table+'","'+(criteria.includes('Subdivision_Code == mappedCode')?'mapped':'all')+'")');
  s=s.replace(/\.distinct\((\w+)\)/g,'.distinct("$1")');
  s=s.replace(/\.sort\(true\)/g,'.sortNative()').replace(/sourceMapping\.Subdivision1\.ID % 5/g,'fixtureModulo(sourceMapping.Subdivision1.ID,5)');
  s=s.replace(/\{\s*((?:(?:STRINGTOKEN\d+END|\d+)\s*,\s*)+(?:STRINGTOKEN\d+END|\d+))\s*\}/g,'[$1]');
  s=s.replace(/for each\s+(\w+) in ([^\n{]+)/g,'for ($1 of $2)');
  const vars=[...new Set([...s.matchAll(/(?<![.\w])([A-Za-z_]\w*)\s*=(?!=)/g)].map(match=>match[1]).concat([...s.matchAll(/for \((\w+) of/g)].map(match=>match[1])))].filter(name=>name!=='requestText');
  s=s.replace('function workflowQuotaChunkProbe(requestText)\n{','function workflowQuotaChunkProbe(requestText)\n{var '+vars.join(',')+';');
  return s.replace(/STRINGTOKEN(\d+)END/g,(_all,index)=>strings[Number(index)]);
}
const ID='4410926000005794636',ID2='4410926000005794637',NOW=1793991600000;
function harness({environment='development',profile='scan100-write25-v1',due=true,status='Running',phase='waiting',actualPhase='preflight',mutated=0,processed=0,validated=100,recoveryFailure=false,wakeFailure=false,secondDue=true,secondStatus='Running',secondPhase='waiting',secondProfile='scan100-write25-v1',tickFailure=false}={}){
  const state={version:1,workflow:'Budgets_Import_Load_HCSS_',actualChunkProfile:profile,callbackPolicy:'shared-recovery-30m',phase,actualPhase,actualIndex:0,actualValidated:actualPhase==='apply'?202:0,actualReceived:202,tick:0,checkpointAt:NOW-60000,actualDeadline:NOW+120*60000,requests:[{view:'view-1',job:'immutable-job',code:'1004'}]};
  const context=vm.createContext({fixtureId:ID,fixtureId2:ID2,fixtureNow:NOW,fixtureEnvironment:environment,fixtureState:JSON.stringify(state),fixtureStatus:status,fixtureDue:due,fixtureMutated:mutated,fixtureProcessed:processed,fixtureValidated:validated,fixtureRecoveryFailure:recoveryFailure,fixtureWakeFailure:wakeFailure,fixtureSecondDue:secondDue,fixtureSecondStatus:secondStatus,fixtureSecondPhase:secondPhase,fixtureSecondProfile:secondProfile,fixtureTickFailure:tickFailure,fixtureSha256:value=>createHash('sha256').update(String(value)).digest('hex')});
  vm.runInContext(`
    var clock=fixtureNow,calls=[];
    function ifnull(value,fallback){return value==null?fallback:value;}
    function Map(){return {};}
    function List(){return [];}
    Object.defineProperties(Object.prototype,{get:{value:function(key){return this[key]??null;}},put:{value:function(key,value){this[key]=value;}},remove:{value:function(key){delete this[key];}},keys:{value:function(){return Object.keys(this);}},toString:{value:function(){return JSON.stringify(this);}}});
    Array.prototype.add=function(value){this.push(value);};Array.prototype.contains=function(value){return this.includes(value);};Array.prototype.size=function(){return this.length;};Array.prototype.sortNative=function(){return this.sort();};
    String.prototype.toMap=function(){return JSON.parse(this);};String.prototype.matches=function(pattern){return new RegExp('^(?:'+pattern+')$').test(this);};String.prototype.toLong=function(){return this.length>15?String(this):Number(this);};String.prototype.toDateTime=function(){return new Date(String(this));};Number.prototype.toLong=function(){return Number(this);};
    Date.prototype.toLong=function(){return this.getTime();};Date.prototype.addMinutes=function(minutes){return new Date(this.getTime()+minutes*60000);};Date.prototype.toString=function(){return this.toISOString();};
    var audit={ID:fixtureId,Run_Status:fixtureStatus,Resume_At:fixtureDue?fixtureNow-1:fixtureNow+60000,Export_State:fixtureState,Rows_Received:202,Rows_Processed:0,Rows_Created:0,Rows_Updated:0,Rows_Skipped:0,Rows_Failed:0,Stage:'Fixture',Message:null,Details:null};
    var auditTwo={...audit,ID:fixtureId2,Run_Status:fixtureSecondStatus,Resume_At:fixtureSecondDue?fixtureNow-1:fixtureNow+60000,Export_State:JSON.stringify({...JSON.parse(fixtureState),phase:fixtureSecondPhase,actualChunkProfile:fixtureSecondProfile})};
    var fixtureAudits={[fixtureId]:audit,[fixtureId2]:auditTwo};
    function fixtureAuditById(id){const selected=fixtureAudits[id]??null;if(selected==null)return {count(){return 0;}};return new Proxy({count(){return 1;}},{get(target,key){return key in target?target[key]:selected[key]??null;}});}
    function fixtureModulo(id,n){return Number(BigInt(id)%BigInt(n));}
    function fixtureNativeCounts(table,mode){return {count(){return table==='Subdivision'&&mode!=='mapped'?2:1;},distinct(){return ['PHASE-1'];},[Symbol.iterator]:function*(){if(table==='External_System_Mapping')yield {ID:'4410926000005700001',Subdivision1:{ID:'90071992547409960',Subdivision_Code:'PHASE-1'}};}};}
    var zoho={get currenttime(){return new Date(clock);},encryption:{sha256:fixtureSha256}};
    var thisapp={environment:{type:fixtureEnvironment},analyticsExportRows(view,config,id,allowEmpty){calls.push({type:'analytics',view,columns:config.selectedColumns,id,allowEmpty});return Array.from({length:105},(_,i)=>({'H.JobCode':i===104?'':i<101?'LARGE-JOB':'SMALL-JOB','H.Minor Code':3000+i,WS_Job_Number_Trim:i===104?'':i<101?'LARGE-JOB':'SMALL-JOB',Cost_Code_Number_2:3000+i}));},workflowExportRecover(action){calls.push({type:'recovery',action});if(fixtureRecoveryFailure)throw Error('No acknowledged shared recovery successor');return 'recovery-id';},workflowRunLog(event){calls.push({type:'log',event});if(event.exportState!=null)audit.Export_State=event.exportState;if(event.clearResume)audit.Resume_At=null;if(event.resumeAt!=null)audit.Resume_At=new Date(event.resumeAt).getTime();if(event.action==='finish')audit.Run_Status=event.status;return {id:fixtureId};},workflowExportWake(id,tick,due){calls.push({type:'wake',id,tick,due});if(fixtureWakeFailure)throw Error('Unknown wake acknowledgement');return 'Wake acknowledged';},workflowExportPlan(workflow,batch){calls.push({type:'plan',workflow,batch});return {actualScope:batch===1?{'mapped-job':{id:'90071992547409960',code:'PHASE-1'}}:{},requests:batch===1?[{}]:[]};},workflowExportEnqueue(workflow){calls.push({type:'enqueue',workflow});return fixtureId;},workflowExportTick(id){calls.push({type:'tick',id});const next=JSON.parse(audit.Export_State);next.actualValidated=next.actualPhase==='apply'?202:fixtureValidated;next.actualIndex=fixtureProcessed||fixtureValidated;next.tick++;audit.Export_State=JSON.stringify(next);audit.Rows_Processed=fixtureProcessed;audit.Rows_Updated=fixtureMutated;audit.Rows_Skipped=fixtureProcessed-fixtureMutated;clock+=1200;return 'Real tick fixture';}};
    thisapp.workflowExportTick=function(id){calls.push({type:'tick',id});if(fixtureTickFailure)throw Error('Unknown native continuation failure');const selected=id===fixtureId?audit:auditTwo;const next=JSON.parse(selected.Export_State);next.actualValidated=next.actualPhase==='apply'?202:fixtureValidated;next.actualIndex=fixtureProcessed||fixtureValidated;next.tick++;selected.Export_State=JSON.stringify(next);selected.Rows_Processed=fixtureProcessed;selected.Rows_Updated=fixtureMutated;selected.Rows_Skipped=fixtureProcessed-fixtureMutated;clock+=1200;return 'Real tick fixture';};
  `+compile(source),context);
  return {context,run:request=>JSON.parse(vm.runInContext('workflowQuotaChunkProbe('+JSON.stringify(JSON.stringify(request))+')',context)),calls:()=>JSON.parse(vm.runInContext('JSON.stringify(calls)',context))};
}
{
  const h=harness({environment:'production'});
  assert.throws(()=>h.run({action:'enqueue'}),/only in Development/);assert.deepEqual(h.calls(),[]);
}
for(const options of [{due:false},{status:'Success'},{phase:'processing'}]){
  const h=harness(options);const result=h.run({action:'step',auditId:ID});assert.equal(result.ok,false);assert.equal(result.stepAttempted,false);assert.deepEqual(h.calls(),[]);
}
for(const request of [{action:'invalid',auditId:ID},{action:'step',auditId:'bad'},{action:'enqueue',workflow:'Daily_Crew_Labor'}]){
  const h=harness();assert.equal(h.run(request).ok,false);assert.deepEqual(h.calls(),[]);
}
{
  const h=harness({profile:''});assert.equal(h.run({action:'step',auditId:ID}).ok,false);assert.deepEqual(h.calls(),[]);
}
{
  const h=harness();const result=h.run({action:'enqueue'});assert.equal(result.ok,true);assert.equal(result.auditId,ID);assert.deepEqual(h.calls(),[{type:'enqueue',workflow:'Budgets_Import_Load_HCSS_'}]);
}
{
  const h=harness();const result=h.run({action:'step',auditId:ID});assert.equal(result.ok,true);assert.equal(result.delta.validated,100);assert.equal(result.stepElapsedMillis,1200);assert.equal(result.jobs[0].job,'immutable-job');assert.deepEqual(h.calls(),[{type:'tick',id:ID}]);
}
for(const mutated of [0,25,26]){
  const h=harness({actualPhase:'apply',mutated,processed:100});const result=h.run({action:'step',auditId:ID});assert.equal(result.ok,mutated<=25);assert.equal(result.delta.processed,100);assert.equal(result.validation.mutatedAtMost25,mutated<=25);assert.equal(result.validation.fullPreflightBeforeApply,true);
}
{
  const h=harness();const result=h.run({action:'status',auditId:ID});assert.equal(result.ok,true);assert.equal(result.stepAttempted,false);assert.deepEqual(h.calls(),[]);
}
{
  const h=harness();const result=h.run({action:'scopes'});assert.equal(result.ok,true);assert.equal(result.scopes.length,15);assert.equal(result.scopes.filter(scope=>scope.mappedJobs===1&&scope.requests===1).length,3);assert.deepEqual(result.scopes[1].jobCodes,['mapped-job']);assert.equal(result.scopes[1].actualScope['mapped-job'].id,'90071992547409960');assert.equal(result.nativeCounts.eligibleSubdivisions,2);assert.equal(h.calls().length,15);assert.ok(h.calls().every(call=>call.type==='plan'),'scope inspection calls only existing read-only plans, without an audit ID, enqueue, tick or Settings edit');
}
for(const [workflow,view,columns] of [['Budgets_Import_Load_HCSS_','2107789000023717814',['H.JobCode','H.Minor Code']],['Budgets_Import_Load_GP_Co','2107789000031077002',['WS_Job_Number_Trim','Cost_Code_Number_2']],['Budgets_Import_Great_Plai1','2107789000029311186',['WS_Job_Number_Trim','Cost_Code_Number_2']]]){
  const h=harness();const result=h.run({action:'sourceCounts',workflow});assert.equal(result.ok,true);assert.equal(result.sourceRows,105);assert.equal(result.missingJobRows,1);assert.deepEqual(result.jobs.map(job=>[job.job,job.rows]),[['LARGE-JOB',101],['SMALL-JOB',3]]);assert.equal(result.candidates100To400.length,1);assert.equal(result.candidates100To400[0].eligibleDevelopmentMapping,true);assert.equal(result.candidates100To400[0].mappings[0].subdivisionId,'90071992547409960');assert.equal(result.candidates100To400[0].mappings[0].batch,0);assert.deepEqual(h.calls(),[{type:'analytics',view,columns,id:'',allowEmpty:true}],'source counts read only the existing Analytics helper and native records; no audit, queue or business writer');
}
{
  const h=harness();assert.equal(h.run({action:'sourceCounts',workflow:'Daily_Crew_Labor'}).ok,false);assert.deepEqual(h.calls(),[]);
}
for(const auditIds of [null,[],[ID],[ID,ID],[ID,'0'+ID],[ID,'invalid'],[ID,ID2,ID]]){
  const h=harness();assert.equal(h.run({action:'dualStep',auditIds}).ok,false);assert.deepEqual(h.calls(),[],'malformed or duplicate paired IDs cannot execute either worker');
}
for(const options of [{secondDue:false},{secondStatus:'Success'},{secondPhase:'processing'},{secondProfile:'legacy'}]){
  const h=harness(options);assert.equal(h.run({action:'dualStep',auditIds:[ID,ID2]}).ok,false);assert.deepEqual(h.calls(),[],'both complete eligibility guards run before either tick');
}
{
  const h=harness({validated:55});const result=h.run({action:'dualStep',auditIds:[ID,ID2]});assert.equal(result.ok,true);assert.equal(result.aggregate.validated,110);assert.equal(result.aggregate.runsAttempted,2);assert.equal(result.runs.length,2);assert.equal(result.elapsedMillis,2400);assert.deepEqual(h.calls(),[{type:'tick',id:ID},{type:'tick',id:ID2}]);assert.match(result.evidenceType,/no single-slice claim/);
}
{
  const h=harness({actualPhase:'apply',processed:55});const result=h.run({action:'dualStep',auditIds:[ID,ID2]});assert.equal(result.ok,true);assert.equal(result.aggregate.processed,110);assert.equal(result.aggregate.mutated,0);assert.ok(result.runs.every(run=>run.validation.fullPreflightBeforeApply));
}
for(const options of [{actualPhase:'apply',processed:55,mutated:26},{tickFailure:true}]){
  const h=harness(options);const result=h.run({action:'dualStep',auditIds:[ID,ID2]});assert.equal(result.ok,false);assert.equal(result.aggregate.runsAttempted,1);assert.deepEqual(h.calls(),[{type:'tick',id:ID}],'a failed first worker or invalid first result prevents starting the second worker');
}
for(const batch of [-1,5,1.5,'3.0','', '03']){
  const h=harness();assert.equal(h.run({action:'enqueue',batch}).ok,false);assert.deepEqual(h.calls(),[],'invalid explicit batches fail before recovery or audit writes');
}
for(const [workflow,offset] of [['Budgets_Import_Load_HCSS_',1],['Budgets_Import_Load_GP_Co',8],['Budgets_Import_Great_Plai1',9]]){
  const h=harness();const result=h.run({action:'enqueue',workflow,batch:3});assert.equal(result.ok,true);assert.equal(result.capturedBatch,3);
  const calls=h.calls();assert.deepEqual(calls.map(call=>call.type),['recovery','log','plan','log','wake','log']);assert.equal(calls[0].action,'arm');assert.equal(calls[1].event.callbackPolicy,'shared-recovery-30m');assert.equal(calls[1].event.queueWorkflow,workflow);assert.equal(calls[2].batch,3);
  const saved=JSON.parse(calls[3].event.exportState);assert.equal(saved.actualChunkProfile,'scan100-write25-v1');assert.equal(saved.batch,3);assert.equal(saved.actualDeadline,NOW+120*60000);assert.equal(saved.deadline,NOW+(offset+15)*60000);assert.equal(saved.phase,'arming');assert.equal(saved.tick,0);assert.equal(new Date(calls[4].due).getTime(),NOW+offset*60000);assert.equal(JSON.parse(calls[5].event.exportState).phase,'waiting');
}
{
  const h=harness({recoveryFailure:true});assert.equal(h.run({action:'enqueue',batch:3}).ok,false);assert.deepEqual(h.calls().map(call=>call.type),['recovery'],'failed shared recovery creates no audit or primary');
}
{
  const h=harness({wakeFailure:true});const result=h.run({action:'enqueue',batch:3});assert.equal(result.ok,false);assert.equal(result.auditId,ID);const calls=h.calls();assert.equal(calls.at(-1).event.action,'finish');assert.equal(calls.at(-1).event.status,'Failed');assert.equal(calls.filter(call=>call.type==='wake').length,1,'an ambiguous primary is not replayed');assert.ok(!calls.some(call=>call.type==='tick'));
}
{
  const h=harness();vm.runInContext("thisapp.workflowExportClaimRows=function(id,keys){calls.push({type:'claims',id,keys:[...keys]});clock++;return true;};",h.context);
  const first=h.run({action:'claimCapacity'}),second=h.run({action:'claimCapacity'});assert.equal(first.ok,true);assert.equal(first.requested,100);assert.equal(first.acknowledged,true);assert.notEqual(first.nonce,second.nonce);assert.equal(h.calls().length,2);for(const call of h.calls()){assert.equal(call.type,'claims');assert.equal(call.id,'0');assert.equal(new Set(call.keys).size,100);assert.ok(call.keys.every(key=>/^0\|actual-row\|[a-f0-9]{64}$/.test(key)));}assert.equal(new Set(h.calls().flatMap(call=>call.keys)).size,200,'each invocation generates a different key set without a long UI argument');
}
function preparedHarness(ageMinutes=30){
  const h=harness();vm.runInContext(`
    audit.Run_Status='Success';audit.Started_At=new Date(clock-${ageMinutes}*60000);audit.Rows_Received=55;audit.Rows_Processed=55;
    const reference=JSON.parse(audit.Export_State);Object.assign(reference,{phase:'complete',actualPhase:'apply',actualIndex:55,actualValidated:55,actualReceived:55,actualProcessed:55,actualCreated:1,actualUpdated:54,actualSkipped:0,actualReadRetries:2,actualWriteAttempted:true,tick:4,batch:3,actualScope:{'REAL-JOB':{id:'90071992547409960',code:'PHASE-1'}},requests:[{view:'2107789000023717814',code:'1004',job:'immutable-original',allowEmpty:true,config:{selectedColumns:['H.JobCode','H.Minor Code'],criteria:'original-filter'}}]});audit.Export_State=JSON.stringify(reference);
    thisapp.analyticsExportRows=function(view,config,id,allowEmpty){calls.push({type:'verify',view,config:JSON.parse(JSON.stringify(config)),id,allowEmpty});return Array.from({length:55},()=>({'H.JobCode':'REAL-JOB','H.Minor Code':3000}));};
    var fixturePairNumber=0;
    thisapp.workflowRunLog=function(event){calls.push({type:'log',event:JSON.parse(JSON.stringify(event))});if(event.action==='start'){fixturePairNumber++;const id=String(BigInt(fixtureId)+BigInt(10+fixturePairNumber));fixtureAudits[id]={ID:id,Run_Status:'Running',Started_At:new Date(clock),Export_State:'{}'};return {id};}const target=fixtureAudits[event.id];if(event.exportState!=null)target.Export_State=event.exportState;if(event.resumeAt!=null)target.Resume_At=new Date(event.resumeAt);if(event.action==='finish')target.Run_Status=event.status;return {id:event.id};};
  `,h.context);return h;
}
for(const ageMinutes of [30,45]){
  const h=preparedHarness(ageMinutes),result=h.run({action:'preparedPair',referenceAuditId:ID});assert.equal(result.ok,true);assert.equal(result.sourceRows,55);assert.equal(result.auditIds.length,2);assert.notEqual(result.auditIds[0],result.auditIds[1]);const calls=h.calls();assert.deepEqual(calls.map(call=>call.type),['verify','recovery','log','log','log','log']);assert.equal(calls[0].config._resumeJobComplete,false);assert.equal(calls[0].config._resumeJobId,'immutable-original');assert.equal(calls[0].id,'');assert.equal(calls[0].allowEmpty,true);assert.equal(calls[1].action,'arm');
  const updates=calls.filter(call=>call.type==='log'&&call.event.action==='update');assert.equal(updates.length,2);for(const {event} of updates){const state=JSON.parse(event.exportState);assert.equal(state.actualReceived,undefined);for(const key of ['actualIndex','actualValidated','actualProcessed','actualCreated','actualUpdated','actualSkipped','actualReadRetries','tick'])assert.equal(state[key],0,key);assert.equal(state.actualWriteAttempted,false);assert.equal(state.phase,'waiting');assert.equal(state.actualPhase,'preflight');assert.equal(state.actualChunkProfile,'scan100-write25-v1');assert.equal(state.batch,3);assert.equal(state.requests[0].job,'immutable-original');assert.equal(state.requests[0].config.criteria,'original-filter');assert.equal(state.actualScope['REAL-JOB'].id,'90071992547409960');assert.equal(state.actualDeadline,NOW+Math.min(10,50-ageMinutes)*60000);assert.equal(state.deadline,state.actualDeadline);assert.equal(new Date(event.resumeAt).getTime(),NOW);assert.deepEqual(event.counts,{received:0,processed:0,created:0,updated:0,skipped:0,failed:0});}assert.equal(vm.runInContext('audit.Run_Status',h.context),'Success','reference run remains unchanged');assert.ok(!calls.some(call=>call.type==='wake'||call.type==='enqueue'||call.type==='tick'));
}
{
  const h=preparedHarness(51);assert.equal(h.run({action:'preparedPair',referenceAuditId:ID}).ok,false);assert.deepEqual(h.calls(),[],'an old reference is rejected before source reads or creating audits');
}
{
  const h=preparedHarness();vm.runInContext("thisapp.analyticsExportRows=function(){calls.push({type:'verify'});return [];};",h.context);assert.equal(h.run({action:'preparedPair',referenceAuditId:ID}).ok,false);assert.deepEqual(h.calls(),[{type:'verify'}],'source count mismatch creates no new audit');
}
console.log('PASS: exact new-actual-only enqueue profile; Development-only real-worker probe; guarded paired workload; internal fresh 100-key claims; checked immutable prepared sources with fresh audits/counters/deadlines; source diagnostics. Native performance remains a separate check.');
