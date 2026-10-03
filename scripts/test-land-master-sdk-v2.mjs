import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/land-master/src/app/widget.html','utf8');
function section(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);}
assert.match(source,/widgets\/version\/2\.0\/widgetsdk-min\.js/);
assert.match(source,/<script src="creator-data\.js"><\/script>/);
assert.doesNotMatch(source,/CREATOR\.API|CREATOR\.init\(|buildEnvelopes|tryEnvelopes|buildAddEnvelopes|tryAddEnvelopes/);

const calls=[],requests=[];
let response={code:3000,result:[{code:3000,data:{ID:'90071992547409931'}}]};
const context=vm.createContext({S:{liveSDK:true,demo:false},CFG:{reportCandidates:{All_Lots_All_Fields:['All_Lots_All_Fields','All_Active_Lots']}},diag(){},
  LMData:{request:async(task,fn)=>{requests.push(task);return fn();},code:value=>String(value?.code||'')},
  ZOHO:{CREATOR:{DATA:{addRecords:async args=>{calls.push({method:'add',args});return response;},updateRecordById:async args=>{calls.push({method:'update',args});return response;},deleteRecords:async args=>{calls.push({method:'delete',args});return response;},invokeCustomApi:async args=>{calls.push({method:'custom',args});return response;}}}},
  reportForType:type=>type==='externalMapping'?'All_External_System_Mappings':undefined});
context.window=context;
vm.runInContext(section('function responseBad','/* record descriptors */'),context);
vm.runInContext(section('function invokeErrorApi','function sendQueuedErrorEmail'),context);
const id='90071992547409931',data={Facility_ID:'000073',Notes:'',Subdivision:'90071992547409932'};
const created=await context.createRecord('lot',data);
assert.equal(context.extractRecordId(created),id);
assert.equal(calls[0].args.form_name,'Lots');assert.equal(JSON.stringify(calls[0].args.payload.data),JSON.stringify(data));
assert.equal(calls[0].args.payload.data.Facility_ID,'000073');assert.equal(calls[0].args.skip_workflow,undefined,'default Creator workflows remain enabled');
await context.updateRecord(id,data,'All_Lots_All_Fields');
assert.equal(calls[1].args.id,id);assert.equal(calls[1].args.report_name,'All_Lots_All_Fields');assert.equal(calls[1].args.payload.data,data);
await context.deleteRecord('externalMapping',id);
assert.equal(calls[2].args.report_name,'All_External_System_Mappings');assert.equal(calls[2].args.payload.criteria,'(ID == '+id+')');
let before=calls.length;
await assert.rejects(context.deleteRecord('externalMapping','bad'),e=>e.message==='Invalid record ID');
await assert.rejects(context.updateRecord('bad',data,'All_Lots_All_Fields'),e=>e.message==='Invalid record ID');assert.equal(calls.length,before);
response={code:3000,result:[{code:2899,message:'Denied'}]};
for(const action of [()=>context.createRecord('lot',data),()=>context.updateRecord(id,data,'All_Lots_All_Fields'),()=>context.deleteRecord('externalMapping',id)])await assert.rejects(action(),e=>String(e.code)==='2899');
assert.equal(calls.length,before+3,'inner failures must not trigger guessed-envelope retries');
response={code:'3000',result:[{code:'3000',data:{ID:id}}]};assert.equal(context.isSuccess(response),true);
context.S.createReviews={};response={code:3000,result:[{code:3000,data:{ID:id}},{code:2945,message:'Invalid input'}]};assert.equal(context.isSuccess(response),false);
await assert.rejects(context.createRecord('lot',data),e=>String(e.code)==='2945'&&e.raw===response&&e.response===response&&e.noReplay===true&&e.uncertain===true,'a success item cannot hide a later failed item or lose its original envelope');
assert.equal(context.S.createReviews.lot.id,'','a mixed acknowledgement cannot select its successful sibling as the created ID');
before=calls.length;await assert.rejects(context.createRecord('lot',data),e=>e.noReplay===true);assert.equal(calls.length,before,'a later Create click cannot replay a mixed acknowledgement');
context.S.createReviews={};response={code:3000,data:{ID:id}};assert.equal(context.extractRecordId(await context.createRecord('lot',data)),id,'native single-record success must remain supported');
for(const anomaly of [{status:' ERROR '},{status:'failed'},{status:'failure'},{success:false}])for(const nested of [false,true]){
  context.S.createReviews={};const record={code:3000,data:{ID:id},...anomaly};response=nested?{code:3000,result:[record]}:record;
  assert.equal(context.isSuccess(response),false,'Native failure status cannot be reported as saved');const requestCount=calls.length;
  for(const action of [()=>context.createRecord('lot',data),()=>context.updateRecord(id,data,'All_Lots_All_Fields'),()=>context.deleteRecord('externalMapping',id)])await assert.rejects(action());
  assert.equal(calls.length,requestCount+3,'Explicit failure anomalies must not trigger mutation replay');
}
for(const malformed of [{code:3000},{code:3000,result:[]},{code:3000,data:{}},{code:3000,data:{ID:123}},{data:{ID:id}},{code:3000,result:[{code:3000}]}]){
  context.S.createReviews={};response=malformed;assert.equal(context.isSuccess(response),false);const requestCount=calls.length;
  for(const action of [()=>context.createRecord('lot',data),()=>context.updateRecord(id,data,'All_Lots_All_Fields'),()=>context.deleteRecord('externalMapping',id)])await assert.rejects(action(),e=>e.message==='Creator did not confirm the record change.'&&e.response===malformed);
  assert.equal(calls.length,requestCount+3,'unconfirmed record changes must fail without automatic replay');
}
context.S.liveSDK=false;await assert.rejects(context.createRecord('lot',data),e=>e.message==='Creator connection required.');context.S.liveSDK=true;
for(const malformed of [{code:3000,data:{ID:'90071992547409932'}},{code:3000,result:[{code:3000,data:{ID:id}},{code:3000,data:{ID:id}}]},{code:3000,data:{ID:id},result:{code:3000,data:{ID:id}}}]){
  response=malformed;const requestCount=calls.length;
  for(const action of [()=>context.updateRecord(id,data,'All_Lots_All_Fields'),()=>context.deleteRecord('externalMapping',id)])await assert.rejects(action(),error=>error.noReplay===true&&error.response===malformed);
  assert.equal(calls.length,requestCount+2,'Wrong/multiple record confirmations never replay or mark the intended row saved');
}
const custom={api_name:'Get_Land_Master_Choices_DEV',http_method:'GET'};response={code:3000,result:{City:[]}};await context.invokeErrorApi(custom);assert.equal(calls.at(-1).args,custom);assert.equal(requests.at(-1),'custom:Get_Land_Master_Choices_DEV');
assert.equal(Object.hasOwn(calls.at(-1).args,'query_params'),false,'no-argument GET calls must omit query_params');
const audit={api_name:'Report_Proforma_Widget_Error_DEV',http_method:'POST',content_type:'application/json',payload:{payload:JSON.stringify({subject:'test',body:'example'})}};await context.invokeErrorApi(audit);assert.equal(calls.at(-1).args,audit);assert.equal(JSON.parse(calls.at(-1).args.payload.payload).subject,'test');assert.equal(Object.hasOwn(calls.at(-1).args,'query_params'),false);

const readCalls=[],progress=[];
context.LMData.readAll=async options=>{readCalls.push(options);if(options.reportName==='All_Lots_All_Fields')throw {code:2894};options.onProgress({page:1,count:1,expected:1,done:true});return [{ID:id,Facility_ID:'000073',Notes:'full editor field'}];};
const rows=await context.sdkGetAll('All_Lots_All_Fields','(Subdivision == 90071992547409932)',info=>progress.push(info));
assert.equal(rows[0].Notes,'full editor field');assert.equal(readCalls.length,2);
assert.ok(readCalls.every(c=>c.fresh===true&&c.fields===undefined&&c.criteria==='(Subdivision == 90071992547409932)'));
assert.equal(progress.at(-1).report,'All_Lots_All_Fields');assert.equal(progress.at(-1).expected,1);
for(const error of [{code:2898,message:'Denied'},{code:2899,message:'Denied'},new Error('All_Lots_All_Fields: loaded 10000 of 10100 records. Refresh to retry a complete snapshot.'),new Error('Load superseded.')]){
  readCalls.length=0;context.LMData.readAll=async options=>{readCalls.push(options);throw error;};
  await assert.rejects(context.sdkGetAll('All_Lots_All_Fields'),e=>e===error);
  assert.equal(readCalls.length,1,'denied, incomplete, and canceled reads must not switch to a narrower report');assert.equal(readCalls[0].reportName,'All_Lots_All_Fields');
}
context.LMData.readAll=async()=>{throw {code:2894};};await assert.rejects(context.sdkGetAll('All_Companies'),e=>String(e.error.code)==='2894');

function initHarness({framed=true,getInitParams=async()=>({appLinkName:'land',envUrlFragment:'/environment/development',loginUser:'native-fixture'})}={}){
  const statuses=[],events=[],timers=new Map();let next=0,loaded=0,demo=0,applied=0,handshakes=0;
  const c=vm.createContext({S:{liveSDK:false,demo:false,errorQueue:[]},document:{referrer:framed?'https://creatorapp.zoho.com/example/land/':''},
    setTimeout(fn){timers.set(++next,fn);return next;},clearTimeout(id){timers.delete(id);},setStatus:(kind,text)=>statuses.push({kind,text}),loadDemo(){demo++;},loadData:async()=>{loaded++;},auditOnly(){},queueErrorEmail(){},scheduleErrorEmail(){},diag(){},
    LMPerf:{start(name){events.push(name+':start');},end(name,meta){events.push({name,...meta});}},LMData:{},
    ZOHO:{CREATOR:{UTIL:{getInitParams(){handshakes++;return getInitParams();}},DATA:{getRecords(){}}}},location:{href:'https://example.test/widget.html'}});
  c.window=c;c.parent=framed?{}:c;
  vm.runInContext(fs.readFileSync('widgets/land-master/src/app/runtime-context.js','utf8'),c);
  const apply=c.LMRuntime.apply;c.LMRuntime.apply=params=>{applied++;return apply(params);};
  vm.runInContext(section('function creatorFrameContext','S.tablePageSize=CFG.tablePageSize'),c);
  return {c,statuses,events,timers,handshakes:()=>handshakes,stats:()=>({loaded,demo,applied})};
}
let h=initHarness();await h.c.initializeCreatorV2();assert.deepEqual(h.stats(),{loaded:1,demo:0,applied:1});assert.equal(h.c.S.liveSDK,true);assert.equal(h.timers.size,0);assert.equal(h.handshakes(),1);
h=initHarness();h.c.LMFrontendContext={params:{appLinkName:'cached-routing-only',envUrlFragment:'/environment/development'}};await h.c.initializeCreatorV2();assert.deepEqual(h.stats(),{loaded:1,demo:0,applied:1});assert.equal(h.handshakes(),1,'cached loader parameters must not skip the fresh native handshake');
h=initHarness({getInitParams:async()=>{throw {code:5000};}});h.c.LMFrontendContext={params:{appLinkName:'land'}};await h.c.initializeCreatorV2();assert.deepEqual(h.stats(),{loaded:0,demo:0,applied:0});assert.equal(h.c.S.liveSDK,false);assert.equal(h.statuses.at(-1).text,'Creator connection failed');assert.equal(h.handshakes(),1);
h=initHarness({framed:false,getInitParams:async()=>{throw new Error('outside Creator');}});await h.c.initializeCreatorV2();assert.equal(h.stats().demo,1);assert.equal(h.stats().loaded,0);
let release,retry=false;h=initHarness({getInitParams:()=>retry?Promise.resolve({appLinkName:'land',envUrlFragment:'/environment/development',loginUser:'retry-fixture'}):new Promise(resolve=>{release=resolve;})});const initialization=h.c.initializeCreatorV2();await Promise.resolve();h.timers.values().next().value();assert.equal(h.c.S.liveSDK,false);assert.equal(h.statuses.at(-1).text,'Creator connection failed');retry=true;await h.c.initializeCreatorV2();assert.deepEqual(h.stats(),{loaded:1,demo:0,applied:1});assert.equal(h.handshakes(),2);release({appLinkName:'late-production',envUrlFragment:'',loginUser:'late-fixture'});await initialization;assert.deepEqual(h.stats(),{loaded:1,demo:0,applied:1});assert.equal(h.c.LMRuntime.current().environment,'DEVELOPMENT');assert.equal(h.c.LMRuntime.current().user,'retry-fixture','expired native reply cannot replace successful retry actor');
for(const params of [{},[],null,7,'native-context',{envUrlFragment:'/environment/development'},{envUrlFragment:'/environment/development',loginUser:[]},{envUrlFragment:'/environment/development',loginUser:{}},{envUrlFragment:'/environment/development',loginUser:7},{envUrlFragment:'/environment/development',loginUser:false},{envUrlFragment:'/environment/development',loginUser:'(unknown)'},{loginUser:'native-fixture'}]){
  h=initHarness({getInitParams:async()=>params});await h.c.initializeCreatorV2();assert.equal(h.stats().loaded,0,'missing/malformed context or actor must not start report reads');assert.equal(h.stats().demo,0);assert.equal(h.c.S.liveSDK,false);assert.equal(h.c.S.demo,false);assert.equal(h.statuses.at(-1).text,'Creator connection failed');assert.equal(h.timers.size,0);
}
for(const fixture of [c=>{c.ZOHO.CREATOR.loginUser='global-fixture';},c=>{c.ZOHO.CREATOR.LOGIN_USER='global-fixture';},c=>{c.appsetup={loginUser:'global-fixture'};}]){
  h=initHarness({getInitParams:async()=>({envUrlFragment:'/environment/development'})});fixture(h.c);await h.c.initializeCreatorV2();assert.equal(h.stats().loaded,1);assert.equal(h.c.S.liveSDK,true);assert.equal(h.c.LMRuntime.current().user,'global-fixture','real native global actor remains a valid fallback');
}
for(const actor of [{},[],7,false]){
  h=initHarness({getInitParams:async()=>({envUrlFragment:'/environment/development'})});h.c.ZOHO.CREATOR.loginUser=actor;await h.c.initializeCreatorV2();assert.equal(h.stats().loaded,0,'nonstring native global actor cannot start reads');assert.equal(h.c.S.liveSDK,false);assert.equal(h.c.LMRuntime.current().user,'(unknown)');
}

console.log('Land Master SDK v2: documented CRUD, per-record failures, custom APIs, full-field fallback reads, string IDs, real initialization failures, fresh native handshake with cached loader context, and late-handshake guards passed.');
await import('./test-land-master-lazy-data.mjs');

await import('./test-land-master-create-safety.mjs');

await import('./test-land-master-lookup-labels.mjs');
