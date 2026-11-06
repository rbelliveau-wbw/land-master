// Execute the canonical enqueue, audit and attempt-claim bodies. Native Save and
// combined six-route capacity remain separate gates.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {normalizeNative} from './verify-workflow-quota-native.mjs';

const read=name=>fs.readFileSync('creator/functions/'+name+'.dg','utf8').replace(/\r\n/g,'\n');
const BASELINE='creator/quota-starter-consolidation-2026-11-06/native-before/development/';
const original=fs.readFileSync(BASELINE+'workflowExportEnqueue.dg','utf8').replace(/\r\n/g,'\n');
export const STARTER_ROUTES=['Update_Budgets_w_Projects1','Sync_Final_Acceptance_Due','Budgets_Check_HCSS_Budget1','Budgets_Import_Load_HCSS_','Budgets_Import_Load_GP_Co','Budgets_Import_Great_Plai1'];
const OFFSETS={Daily_Crew_Labor:1,Daily_Crew_Timecards:1,Update_Budgets_w_Projects1:1,Sync_Final_Acceptance_Due:5,Update_Projects_Start_End:6,Budgets_Check_HCSS_Budget1:3,Budgets_Import_Load_GP_Co:8,Budgets_Import_Great_Plai1:9,Budgets_Import_Load_HCSS_1:10,Budgets_Import_Load_HCSS_:1,Budgets_Import_Load_CTC_C:1};
const BATCHED=new Set(STARTER_ROUTES.slice(2));
const ACTUAL=new Set(STARTER_ROUTES.slice(3));
export const FRAME_ID='4410926000005829901',SETTINGS_ID='4410926000000000021',NOW=Date.parse('2026-11-06T17:00:00Z');
const nativeText=epoch=>{const date=new Date(epoch),pad=n=>String(n).padStart(2,'0'),hour=date.getUTCHours();return pad(date.getUTCMonth()+1)+'/'+pad(date.getUTCDate())+'/'+date.getUTCFullYear()+' '+pad(hour%12||12)+':'+pad(date.getUTCMinutes())+':'+pad(date.getUTCSeconds())+' '+(hour>=12?'PM':'AM');};
export function starterFrame({cycleAt=NOW-60*60000,batch=2,...extra}={}){
  return {version:1,kind:'starter-cycle',settingsId:SETTINGS_ID,cycleAt:nativeText(cycleAt),cycleEpoch:cycleAt,batch,routes:[...STARTER_ROUTES],expiresAt:cycleAt+120*60000,expiresAtText:nativeText(cycleAt+120*60000),...extra};
}
export function compileStarter(source){
  const strings=[];
  let text=source.replace(/"(?:\\.|[^"\\])*"/g,value=>'STRINGTOKEN'+(strings.push(value)-1)+'END').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g,'');
  const head=text.match(/^\s*(string|map|list|bool)\s+(\w+)\(([^)]*)\)\s*\{/),args=head[3].split(',').map(arg=>arg.trim().split(/\s+/).at(-1));
  const signature=`function ${head[2]}(${args.join(',')}){`;
  text=text.replace(head[0],signature);
  text=text.replace(/invokeurl\s*\[([\s\S]*?)\]/g,(_all,request)=>'fixtureHttp({'+request.trim().split('\n').map(line=>line.trim()).filter(Boolean).map(line=>line.replace(/^type\s*:\s*(\w+)$/,(_line,type)=>'type:"'+type+'"')).join(',')+'})');
  text=text.replace(/\b(Settings|Workflow_Run_Log|Workflow_Export_Lock)\[([^\]]+)\]/g,(_all,table,criteria)=>'fetchRecords("'+table+'",row=>'+criteria.replace(/(?<![.\w])(ID|Claim_Key|Export_State|Run_Status)\b/g,'row.$1')+')');
  text=text.replace(/\{\s*((?:STRINGTOKEN\d+END|\d+)(?:\s*,\s*(?:STRINGTOKEN\d+END|\d+))*)\s*\}/g,'[$1]');
  text=text.replace(/for each\s+(\w+) in ([^\n{]+)/g,'for ($1 of $2)').replace(/\.length\(\)/g,'.lengthCall()').replace(/\binfo ([^;]+);/g,'fixtureInfo($1);');
  const variables=[...new Set([...text.matchAll(/(?<![.\w])([A-Za-z_]\w*)\s*=(?!=)/g)].map(match=>match[1]).concat([...text.matchAll(/for \((\w+) of/g)].map(match=>match[1])))].filter(name=>!args.includes(name));
  text=text.replace(signature,signature+(variables.length?'var '+variables.join(',')+';':''));
  return text.replace(/STRINGTOKEN(\d+)END/g,(_all,index)=>strings[Number(index)]);
}
export function starterHarness({frame=starterFrame(),frameKey=null,settings=[{ID:SETTINGS_ID,Current_Batch:3}],locks=[],mode='',planMillis=0,recoveryFailure=false,environment='development',baseline=false,now=NOW}={}){
  const initialLocks=frame===null?[...locks]:[{ID:FRAME_ID,Claim_Key:frameKey??('0|starter|'+frame.settingsId+'|'+frame.cycleEpoch),Cycle_State:JSON.stringify(frame),Claimed_At:now-1000},...locks];
  const context=vm.createContext({fixtureNow:now,fixtureLocks:JSON.stringify(initialLocks),fixtureSettings:JSON.stringify(settings),fixtureMode:mode,fixturePlanMillis:planMillis,fixtureRecoveryFailure:recoveryFailure,fixtureEnvironment:environment});
  vm.runInContext(`
    var clock=new Date(fixtureNow),requests=[],calls=[],wakes=[],messages=[],holds=[],startupTimeline=[],settingsReads=0,nextId=90071992547409950n;
    function randomNumber(min,max){return min;}
    function ifnull(value,fallback){return value==null?fallback:value;}
    function Map(){return {};}
    function List(){return [];}
    Object.defineProperties(Object.prototype,{get:{value:function(key){return this[key]??null;}},put:{value:function(key,value){this[key]=value;}},keys:{value:function(){return Object.keys(this);}},toString:{value:function(){return JSON.stringify(this);}}});
    Array.prototype.get=function(index){return this[index]??null;};Array.prototype.size=function(){return this.length;};Array.prototype.add=function(value){this.push(value);};Array.prototype.contains=function(value){return this.includes(value);};
    String.prototype.toMap=function(){return JSON.parse(this);};String.prototype.matches=function(pattern){return new RegExp('^(?:'+pattern+')$').test(this);};String.prototype.contains=function(text){return this.includes(text);};String.prototype.lengthCall=function(){return this.length;};String.prototype.left=function(count){return this.slice(0,count);};String.prototype.toLong=function(){const n=BigInt(this);return n>BigInt(Number.MAX_SAFE_INTEGER)?n:Number(n);};
    String.prototype.toDateTime=function(){const parts=this.match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4}) (\\d{2}):(\\d{2}):(\\d{2}) (AM|PM)$/);if(!parts)throw Error('Invalid native datetime');return new Date(Date.UTC(+parts[3],+parts[1]-1,+parts[2],(+parts[4]%12)+(parts[7]==='PM'?12:0),+parts[5],+parts[6]));};
    Number.prototype.toLong=function(){return Math.trunc(this);};Date.prototype.toLong=function(){return this.getTime();};Date.prototype.addMinutes=function(minutes){return new Date(this.getTime()+minutes*60000);};
    Date.prototype.toString=function(){const pad=n=>String(n).padStart(2,'0'),hour=this.getUTCHours();return pad(this.getUTCMonth()+1)+'/'+pad(this.getUTCDate())+'/'+this.getUTCFullYear()+' '+pad(hour%12||12)+':'+pad(this.getUTCMinutes())+':'+pad(this.getUTCSeconds())+' '+(hour>=12?'PM':'AM');};
    function hydrate(row){for(const field of ['Claimed_At','Started_At','Resume_At','Wake_At','Added_Time'])if(row[field]!=null)row[field]=typeof row[field]==='string'?row[field].toDateTime():new Date(row[field]);return row;}
    var tables={Settings:JSON.parse(fixtureSettings),Workflow_Export_Lock:JSON.parse(fixtureLocks).map(hydrate),Workflow_Run_Log:[]};
    function fetchRecords(table,predicate){if(table==='Settings')settingsReads++;const records=tables[table].filter(predicate);return new Proxy({count(){return records.length;},[Symbol.iterator]:function*(){yield*records;}},{get(target,key){return key in target?target[key]:records[0]?.[key]??null;}});}
    function fixtureInfo(message){messages.push(String(message));}
    function fixtureHttp(request){
      const payload=JSON.parse(request.parameters);startupTimeline.push({type:'http',url:request.url,method:request.type});requests.push({url:request.url,type:request.type,payload,headers:request.headers});
      const isAudit=request.url.includes('Workflow_Run_Log'),isStart=isAudit&&request.type==='POST';
      let row;
      if(request.type==='PATCH'){
        row=tables.Workflow_Run_Log.find(row=>row.ID===request.url.split('/').at(-1));if(!row)throw Error('Unknown audit target');Object.assign(row,payload.data);hydrate(row);
        const state=row.Export_State?JSON.parse(row.Export_State):{};
        if((fixtureMode==='arming-lost'&&state.phase==='arming'&&row.Run_Status==='Running')||(fixtureMode==='waiting-lost'&&state.phase==='waiting'&&row.Run_Status==='Running'))throw Error('Audit update reply lost after commit');
      }else{
        const table=isAudit?'Workflow_Run_Log':'Workflow_Export_Lock',data=payload.data;
        if(table==='Workflow_Export_Lock'&&tables[table].some(row=>row.Claim_Key===data.Claim_Key))return {responseCode:200,responseText:JSON.stringify({code:3001,error:'Duplicate unique key'})};
        row=hydrate({ID:String(nextId++),Added_Time:new Date(clock.getTime()),...data});tables[table].push(row);
        if((fixtureMode==='start-lost'&&isStart)||(fixtureMode==='claim-lost'&&!isAudit))throw Error('Independent create reply lost after commit');
      }
      return {responseCode:200,responseText:JSON.stringify({code:3000,data:{ID:row.ID}})};
    }
    var zoho={get currenttime(){return clock;}};
    var thisapp={environment:{type:fixtureEnvironment,linkname:fixtureEnvironment==='production'?'':fixtureEnvironment},
      workflowRecoveryHold(action,identity,target){
        calls.push({type:'hold',action,identity,target});startupTimeline.push({type:'hold',action,identity,target});
        if(fixtureMode==='hold-begin-lost'&&action==='begin')throw Error('Startup hold reply unknown; no target accepted');
        if(fixtureMode==='hold-close-lost'&&action==='close')throw Error('Startup hold close reply unknown');
        if(fixtureMode==='hold-check-before'&&action==='check')throw Error('Startup hold cannot authorize target create');
        if(fixtureMode==='hold-close-expired'&&action==='close')throw Error('Startup hold target committed after deadline');
        if(action==='begin'){const hold={id:String(9410926000000000000n+BigInt(holds.length+1)),kind:identity,target,status:'open',expiresAt:clock.getTime()+30*60000};holds.push(hold);thisapp.workflowExportRecover('arm');return hold.id;}
        if(action==='settle'){const frame=tables.Workflow_Export_Lock.find(row=>row.ID===identity);if(!frame)throw Error('Frame settlement missing target');const children=tables.Workflow_Run_Log.filter(row=>{const state=JSON.parse(row.Export_State||'{}');return state.starterFrameId===identity&&state.kind!=='starter-notice';});if(children.length===6)frame.Wake_At=null;return frame.Wake_At==null?'Closed':'Open';}
        const hold=holds.find(item=>item.id===identity);if(!hold)throw Error('Startup hold missing');
        if(hold.status==='failed')throw Error('Startup hold failed; no work authorized');
        if(action==='check'){if(hold.expiresAt<=clock.getTime())throw Error('Startup hold expired');return identity;}
        if(action==='close'||action==='target'){
          const records=(hold.kind==='frame'?tables.Workflow_Export_Lock:tables.Workflow_Run_Log).filter(row=>row.ID===String(target));
          if(records.length!==1)throw Error('Startup hold target missing or ambiguous');
          const row=records[0],state=JSON.parse(hold.kind==='frame'?row.Cycle_State:row.Export_State);
          if(state.startupHoldId!==identity||(hold.kind==='frame'?row.Claim_Key!==hold.target:state.startupHoldTarget!==hold.target)||row.Added_Time==null||row.Added_Time.getTime()>hold.expiresAt)throw Error('Startup hold target differs or committed late');
          if(action==='close'){if(clock.getTime()>=hold.expiresAt)throw Error('Startup hold acknowledgement after deadline');hold.status='closed';hold.targetId=String(target);}
          return identity;
        }
        throw Error('Unknown startup hold action');
      },
      workflowExportRecover(action){startupTimeline.push({type:'recover',action});calls.push({type:'recover',action});if(fixtureRecoveryFailure)throw Error('No acknowledged shared recovery successor');return '90071992547409999';},
      workflowExportPlan(workflow,batch){startupTimeline.push({type:'plan',workflow,batch});calls.push({type:'plan',workflow,batch});clock=new Date(clock.getTime()+fixturePlanMillis);if(fixtureMode==='plan-error')throw Error('Captured mapping is ambiguous');return {requests:[{view:'original-view',config:{selectedColumns:['Original']},allowEmpty:true}],actualScope:{'original-job':{id:'90071992547409960',code:'ORIGINAL'}}};},
      workflowExportWake(id,tick,due){wakes.push({id,tick,due});calls.push({type:'wake',id,tick,due});if(fixtureMode==='wake-lost')throw Error('Wake reply lost after independent commit');return 'Acknowledged';}
    };
  `,context);
  for(const name of ['workflowExportClaim','workflowRunLog','workflowExportEnqueueCaptured','workflowExportEnqueue'])vm.runInContext(compileStarter(read(name))+';thisapp.'+name+'='+name+';',context);
  if(baseline)vm.runInContext(compileStarter(original.replace('workflowExportEnqueue(','legacyBaselineEnqueue(')),context);
  const exec=code=>vm.runInContext(code,context),json=code=>JSON.parse(exec('JSON.stringify('+code+')'));
  const captured=(index,batch=frame?.batch??2)=>exec('workflowExportEnqueueCaptured('+JSON.stringify(STARTER_ROUTES[index])+','+batch+','+JSON.stringify(FRAME_ID)+','+index+')');
  const attempt=index=>{if(!exec('workflowExportClaim('+JSON.stringify(FRAME_ID+'|starter|'+index)+')'))return null;return captured(index);};
  return {context,exec,json,captured,attempt};
}

// Strip only the newly added startup protection from comparisons; the real
// holds helper has its own executable protocol tests. Existing audits, plans,
// callback ordering, Settings fallback, offsets and deadlines still match.
function withoutStartup(value){
  if(Array.isArray(value))return value.filter(item=>item?.type!=='hold').map(withoutStartup);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['startupHoldId','startupHoldTarget'].includes(key)).map(([key,item])=>[key,key==='Export_State'?JSON.stringify(withoutStartup(JSON.parse(item))):withoutStartup(item)]));
  return value;
}
// Every existing entry point retains its old event order, Settings fallback,
// plan, offsets, monetary profile and deadlines through the thin wrapper.
for(const workflow of Object.keys(OFFSETS))for(const batch of [null,-1,0,2,4,5]){
  const options={frame:null,settings:[{ID:SETTINGS_ID,Current_Batch:batch}],baseline:true,planMillis:12500};
  const old=starterHarness(options),next=starterHarness(options);
  assert.equal(old.exec('legacyBaselineEnqueue('+JSON.stringify(workflow)+')'),next.exec('workflowExportEnqueue('+JSON.stringify(workflow)+')'));
  for(const expression of ['requests','calls','wakes','settingsReads','tables.Workflow_Run_Log'])assert.deepEqual(withoutStartup(next.json(expression)),withoutStartup(old.json(expression)),workflow+' legacy behavior '+expression);
}
for(const settings of [[],[{ID:SETTINGS_ID},{ID:'4410926000000000022'}]]){
  const old=starterHarness({frame:null,settings,baseline:true}),next=starterHarness({frame:null,settings,baseline:true});
  for(const [h,name] of [[old,'legacyBaselineEnqueue'],[next,'workflowExportEnqueue']])assert.throws(()=>h.exec(name+'("Budgets_Import_Load_HCSS_")'),/exactly one Settings/);
  assert.deepEqual(withoutStartup(next.json('requests')),withoutStartup(old.json('requests')),'invalid legacy Settings still creates and independently fails its audit');
}
for(const mode of ['start-lost','arming-lost','wake-lost','waiting-lost','plan-error']){
  const old=starterHarness({frame:null,baseline:true,mode}),next=starterHarness({frame:null,baseline:true,mode});
  for(const [h,name] of [[old,'legacyBaselineEnqueue'],[next,'workflowExportEnqueue']])assert.throws(()=>h.exec(name+'("Budgets_Import_Load_HCSS_")'));
  for(const expression of ['requests','calls','wakes','tables.Workflow_Run_Log'])assert.deepEqual(withoutStartup(next.json(expression)),withoutStartup(old.json(expression)),'legacy '+mode+' failure handling '+expression);
}
for(const environment of ['development','stage','production'])for(let index=0;index<STARTER_ROUTES.length;index++){
  const h=starterHarness({environment,planMillis:12500});const id=h.attempt(index),route=STARTER_ROUTES[index];
  assert.equal(typeof id,'string');assert.equal(h.json('settingsReads'),0,'captured routes never reread the moving Settings cursor');
  const rows=h.json('tables.Workflow_Run_Log'),run=rows[0],state=JSON.parse(run.Export_State),start=h.json('requests.find(request=>request.url.endsWith("/form/Workflow_Run_Log"))');
  const seed=JSON.parse(start.payload.data.Export_State),expectedBatch=BATCHED.has(route)?2:0;
  for(const checkpoint of [seed,state]){assert.equal(checkpoint.starterFrameId,FRAME_ID);assert.equal(checkpoint.starterRouteIndex,index);assert.equal(checkpoint.batch,expectedBatch);assert.equal(checkpoint.workflow,route);assert.equal(checkpoint.callbackPolicy,'shared-recovery-30m');assert.ok(checkpoint.checkpointAt>=NOW);}
  assert.equal(seed.phase,'preparing');assert.equal(state.phase,'waiting');assert.equal(run.Run_Status,'Running');
  assert.equal(h.json('calls.find(call=>call.type==="plan").batch'),expectedBatch);
  assert.equal(state.deadline,NOW+12500+(OFFSETS[route]+15)*60000,'the export window starts at its original scheduled queue offset');
  if(ACTUAL.has(route)){assert.equal(state.actualDeadline,NOW+120*60000,'a delayed first launch gets a fresh fixed import window, not the old frame clock');assert.equal(state.actualChunkProfile,'scan100-write25-v1');assert.equal(state.actualScope['original-job'].id,'90071992547409960');}
  else assert.equal(state.actualDeadline,undefined);
  assert.equal(h.json('wakes.length'),1);assert.equal(h.attempt(index),null,'already owned routes never enter the core a second time');assert.equal(h.json('tables.Workflow_Run_Log.length'),1);assert.equal(h.json('wakes.length'),1);
  assert.ok(h.json('requests').every(request=>environment==='production'?request.headers.environment===undefined:request.headers.environment===environment));
  assert.deepEqual(start.payload.skip_workflow,['schedules'],'atomic route metadata preserves the logger schedule-only suppression');
}

const invalidFrames=[{version:2},{kind:'other'},{batch:5},{routes:STARTER_ROUTES.slice(1)},{routes:[...STARTER_ROUTES].reverse()},{settingsId:'0'},{cycleEpoch:NOW},{expiresAt:NOW+5*60000},{expiresAtText:nativeText(NOW+5*60000)}];
for(const changed of invalidFrames){const h=starterHarness({frame:starterFrame(changed)});assert.throws(()=>h.captured(3,2));assert.equal(h.json('requests.length'),0);assert.equal(h.json('calls.length'),0);}
for(const frame of [starterFrame({cycleAt:NOW+60000}),starterFrame({cycleAt:NOW-120*60000})]){
  const h=starterHarness({frame});assert.throws(()=>h.captured(3,2));assert.equal(h.json('requests.length'),0,'future and expired frames fail before audits/recovery');
}
for(const options of [{},{frame:null},{frameKey:'0|starter|'+SETTINGS_ID+'|0'},{locks:[{ID:'99',Claim_Key:FRAME_ID+'|starter|3'}]},{locks:[{ID:'99',Claim_Key:FRAME_ID+'|starter|3',Claimed_At:NOW},{ID:'100',Claim_Key:FRAME_ID+'|starter|3',Claimed_At:NOW}]}]){
  const h=starterHarness(options);assert.throws(()=>h.captured(3));assert.equal(h.json('requests.length'),0);assert.equal(h.json('calls.length'),0);
}
for(const [workflow,batch,frameId,index] of [[STARTER_ROUTES[3],-1,FRAME_ID,3],[STARTER_ROUTES[3],3,FRAME_ID,3],[STARTER_ROUTES[3],2,'0'+FRAME_ID,3],[STARTER_ROUTES[3],2,FRAME_ID,6],[STARTER_ROUTES[3],2,FRAME_ID,2],[STARTER_ROUTES[3],2,'',-1],['Daily_Crew_Labor',2,FRAME_ID,0]]){
  const h=starterHarness();assert.throws(()=>h.exec('workflowExportEnqueueCaptured('+JSON.stringify(workflow)+','+batch+','+JSON.stringify(frameId)+','+index+')'));assert.equal(h.json('requests.length'),0);assert.equal(h.json('calls.length'),0);
}
for(const mode of ['start-lost','arming-lost','wake-lost','waiting-lost','plan-error']){
  const h=starterHarness({mode});assert.throws(()=>h.attempt(3));
  const rows=h.json('tables.Workflow_Run_Log');assert.equal(rows.length,1);const state=JSON.parse(rows[0].Export_State);assert.equal(state.starterFrameId,FRAME_ID);assert.equal(state.starterRouteIndex,3);
  assert.equal(rows[0].Run_Status,mode==='start-lost'?'Running':'Failed');
  const requests=h.json('requests.length'),wakes=h.json('wakes.length');assert.equal(h.attempt(3),null);assert.equal(h.json('requests.length'),requests);assert.equal(h.json('wakes.length'),wakes,'lost replies never repeat the wake or audit create');
}
{
  const h=starterHarness({mode:'claim-lost'});assert.equal(h.attempt(3),null);assert.equal(h.json('tables.Workflow_Run_Log.length'),0);assert.equal(h.json('calls.length'),0);assert.equal(h.attempt(3),null);assert.equal(h.json('requests.length'),1,'a lost independent attempt claim cannot authorize the core or be retried');
}
{
  const h=starterHarness({recoveryFailure:true});assert.throws(()=>h.attempt(3),/recovery successor/);assert.equal(h.json('tables.Workflow_Run_Log.length'),0);assert.equal(h.json('wakes.length'),0);
}
{
  const h=starterHarness();h.exec('thisapp.workflowExportRecover=function(){clock=new Date(clock.getTime()+61*60000);return "clock";};');
  assert.throws(()=>h.attempt(3),/expired before its first audit/);assert.equal(h.json('tables.Workflow_Run_Log.length'),0);assert.equal(h.json('wakes.length'),0,'recovery arming cannot carry a frame past its first-launch deadline');
}
for(const key of [FRAME_ID+'|starter|0',FRAME_ID+'|starter|5',FRAME_ID+'|starter-notice|0',FRAME_ID+'|starter-notice|5',FRAME_ID+'|tick|0',FRAME_ID+'|process',FRAME_ID+'|actual|preflight|100',FRAME_ID+'|actual-row|'+'a'.repeat(64)]){
  const h=starterHarness();assert.equal(h.exec('workflowExportClaim('+JSON.stringify(key)+')'),true);assert.equal(h.exec('workflowExportClaim('+JSON.stringify(key)+')'),false);
}
for(const key of [FRAME_ID+'|starter|-1',FRAME_ID+'|starter|6',FRAME_ID+'|starter|01',FRAME_ID+'|starter|1|extra',FRAME_ID+'|starter-notice|6',FRAME_ID+'|starter-notice|01','bad|starter|1']){
  const h=starterHarness();assert.throws(()=>h.exec('workflowExportClaim('+JSON.stringify(key)+')'));assert.equal(h.json('requests.length'),0);
}
// Exercise canonical startup integration: durable intent and recovery precede
// the first independent audit; target acknowledgement precedes all planning.
{
  const h=starterHarness({frame:null});h.exec('workflowExportEnqueue("Budgets_Import_Load_HCSS_")');
  const trace=h.json('startupTimeline'),at=(type,action)=>trace.findIndex(e=>e.type===type&&(!action||e.action===action));
  const firstAudit=trace.findIndex(e=>e.type==='http'&&e.method==='POST'&&e.url.includes('/form/Workflow_Run_Log'));
  assert.ok(at('hold','begin')<at('recover'),'startup intent exists before recovery arming');
  assert.ok(at('recover')<at('hold','check')&&at('hold','check')<firstAudit,'the create gate follows acknowledged recovery and precedes audit POST');
  assert.ok(firstAudit<at('hold','close')&&at('hold','close')<at('plan'),'only the acknowledged exact audit can close protection and reach source planning');
  const hold=h.json('holds[0]'),run=h.json('tables.Workflow_Run_Log[0]'),state=JSON.parse(run.Export_State);
  assert.equal(hold.targetId,run.ID);assert.equal(state.startupHoldId,hold.id);assert.equal(state.startupHoldTarget,hold.target);
}
for(const mode of ['hold-begin-lost','hold-check-before','hold-close-expired','hold-close-lost']){
  const h=starterHarness({frame:null,mode});assert.throws(()=>h.exec('workflowExportEnqueue("Budgets_Import_Load_HCSS_")'),/Startup hold/);
  const expectedAudits=['hold-close-expired','hold-close-lost'].includes(mode)?1:0;
  assert.equal(h.json('tables.Workflow_Run_Log.length'),expectedAudits,'failed startup gate retains only an already acknowledged audit');
  assert.equal(h.json('calls.filter(call=>call.type==="plan").length'),0,'ambiguous startup cannot plan or start an import');
  assert.equal(h.json('wakes.length'),0,'no callback is queued after unknown startup protection');
  assert.equal(h.json('requests.filter(r=>r.type==="POST"&&r.url.includes("/form/Workflow_Run_Log")).length'),expectedAudits,'first audit is never retried');
}
{
  const holdId='9410926000000000001',h=starterHarness({frame:starterFrame({startupHoldId:holdId})});
  h.exec('holds.push({id:'+JSON.stringify(holdId)+',kind:"frame",target:"original-frame",targetId:'+JSON.stringify(FRAME_ID)+',status:"failed",expiresAt:clock.getTime()-1});');
  assert.throws(()=>h.attempt(3),/Startup hold failed/);assert.equal(h.json('tables.Workflow_Run_Log.length'),0);assert.equal(h.json('wakes.length'),0);
  assert.equal(h.json('calls.filter(call=>call.type==="plan").length'),0,'a failed frame startup remains barred before source work');
}

const claimBefore=fs.readFileSync(BASELINE+'workflowExportClaim.dg','utf8');
assert.equal(normalizeNative(read('workflowExportClaim').replace('|starter[|][0-5]|starter-notice[|][0-5]','')),normalizeNative(claimBefore),'claim implementation changes only its accepted key grammar');
assert.match(read('workflowExportEnqueue'),/return thisapp\.workflowExportEnqueueCaptured\(workflow,-1,"",-1\);\s*}\s*$/);
assert.doesNotMatch(read('workflowExportEnqueueCaptured'),/while\s*\(|insert into|invokeurl|\.Current_Batch\s*=(?!=)/);
assert.match(read('workflowExportEnqueueCaptured'),/return "";\s*}\s*$/);
console.log('PASS: canonical legacy parity across all eleven routes and batch fallbacks; captured immutable frame/route/batch guards; atomic first-audit metadata; fresh fixed first-launch clocks; exact environment routing; lost audit/wake/claim no replay; unchanged claim implementation.');
