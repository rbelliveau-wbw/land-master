import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const moduleSource=fs.readFileSync('widgets/budget-manager/src/app/full-budget-export.js','utf8');
const html=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
const plain=value=>JSON.parse(JSON.stringify(value));
const fixture=vm.createContext({setTimeout});
vm.runInContext(moduleSource,fixture);
const E=fixture.BudgetFullExport;
function row(i){return {id:String(4410926000000000000n+BigInt(i)),values:['Project','Phase 01 - 001','Construction','03100','Site Work','03101','Clearing','',null,0,0,100,0,0,0,'']};}
function page(rows,{after='0',through=rows.at(-1)?.id||'0',total=rows.length,pageSize=20,hasMore=rows.length===pageSize}={}){
  const result={contract:'budget-full-detail-v1',ok:true,rows,total,after,next:rows.at(-1)?.id||after,through,hasMore};
  if(pageSize!==undefined)result.pageSize=pageSize;
  return result;
}
const records=Array.from({length:41},(_,index)=>row(index+1));
const native=body=>({code:3000,result:JSON.stringify(body)});

// The user's live service advertises twenty rows, while older bindings use 200.
{
  const cursors=[],progress=[];
  const all=await E.collect(async cursor=>{
    cursors.push(plain(cursor));
    const start=cursor.after==='0'?0:records.findIndex(row=>row.id===cursor.after)+1;
    return native(page(records.slice(start,start+20),{after:cursor.after,through:records.at(-1).id,total:41}));
  },(count,total)=>progress.push([count,total]),()=>true);
  assert.equal(all.length,41);
  assert.equal(all.elementRows.length,205);
  assert.deepEqual(cursors,[{after:'0',through:'0'},{after:records[19].id,through:records[40].id},{after:records[39].id,through:records[40].id}]);
  assert.deepEqual(progress,[[20,41],[40,41],[41,41]]);
}
{
  let calls=0;
  const all=await E.collect(async cursor=>{
    calls++;
    return page(calls===1?records.slice(0,20):[],{after:cursor.after,through:records[19].id,total:20});
  });
  assert.equal(all.length,20);
  assert.equal(calls,1,'the exact total avoids a redundant empty-page request');
  const legacy=page([row(1)]);delete legacy.pageSize;
  assert.equal((await E.collect(async()=>legacy)).length,1,'unadvertised legacy pages retain their 200-row contract');
}
for(const pageSize of [0,201,-1,1.5,'20',null]){
  await assert.rejects(E.collect(async()=>page([row(1)],{pageSize,hasMore:false})),/page|response|pagination/i);
}
await assert.rejects(E.collect(async()=>page(records.slice(0,21),{pageSize:20,hasMore:false})),/page|response|pagination/i);
{
  let calls=0;
  await assert.rejects(E.collect(async cursor=>page(calls++===0?records.slice(0,20):records.slice(20),{after:cursor.after,through:records.at(-1).id,total:41,pageSize:calls===1?20:200,hasMore:calls===1})),/page|response|pagination|changed/i);
}

// Only native minute throttles replay this read-only operation, at the same cursor.
for(const throttle of [
  {code:2955,description:'Minute API limit reached'},
  {status:429,responseText:'{"code":2955,"description":"Minute API limit reached"}'},
  Object.assign(new Error('wrapped failure'),{cause:{code:2955,description:'Minute API limit reached'}})
]){
  let calls=0;const cursors=[],waits=[],throttles=[],progress=[];
  const rows=await E.collect(async cursor=>{
    cursors.push(plain(cursor));calls++;
    if(calls===1)return native(page(records.slice(0,20),{after:cursor.after,through:records.at(-1).id,total:41}));
    if(calls===2)throw throttle;
    return native(page(records.slice(cursor.after===records[19].id?20:40,cursor.after===records[19].id?40:41),{after:cursor.after,through:records.at(-1).id,total:41}));
  },(count,total)=>progress.push([count,total]),()=>true,{wait:async ms=>waits.push(ms),onThrottle:(...args)=>throttles.push(args)});
  assert.equal(rows.length,41);
  assert.deepEqual(cursors[1],cursors[2],'a retry preserves the exact upper bound and continuation');
  assert.deepEqual(waits,[61000]);
  assert.deepEqual(throttles,[[20,41,61000,1]]);
  assert.deepEqual(progress,[[20,41],[40,41],[41,41]],'retried reads cannot duplicate progress or rows');
}
{
  let calls=0;const waits=[];
  const rows=await E.collect(async()=>++calls===1?{code:2955,description:'Minute API limit reached'}:native(page([row(1)])),null,()=>true,{wait:async ms=>waits.push(ms)});
  assert.equal(rows.length,1);assert.equal(calls,2);assert.deepEqual(waits,[61000],'resolved error envelopes recover too');
}
{
  let calls=0;const waits=[];
  await assert.rejects(E.collect(async()=>{calls++;throw {code:2955,description:'Minute API limit reached'};},null,()=>true,{wait:async ms=>waits.push(ms)}));
  assert.equal(calls,4,'minute throttle recovery is bounded to three retries per cursor');
  assert.deepEqual(waits,[61000,61000,61000]);
}
for(const error of [new Error('Network failed'),{code:2898,message:'Denied'},{code:9400,message:'Unsupported method'}]){
  let calls=0,waits=0;
  await assert.rejects(E.collect(async()=>{calls++;throw error;},null,()=>true,{wait:async()=>waits++}));
  assert.equal(calls,1);assert.equal(waits,0,'other failures never replay');
}
{
  let calls=0,current=true;
  await assert.rejects(E.collect(async()=>{calls++;throw {code:2955};},null,()=>current,{wait:async()=>{current=false;}}),/user or environment changed/);
  assert.equal(calls,1,'a changed actor cancels before retrying a paused page');
}
{
  let decoded=0,calls=0;
  const rows=await E.collect(async()=>{if(++calls===1)throw {fixtureNativeError:true};return page([row(1)]);},null,()=>true,{
    wait:async()=>{},failureCode:error=>{decoded++;return error.fixtureNativeError?'2955':'';}
  });
  assert.equal(rows.length,1);assert.ok(decoded>0,'the production adapter can supply its native envelope decoder');
}

// Execute the real widget transport boundary, preserving legacy write behavior.
function block(name){
  const start=html.indexOf(`function ${name}(`),end=html.indexOf('\n}',start)+2;
  assert.ok(start>=0&&end>start,name);return html.slice(start,end);
}
function harness(){
  const calls=[],logs=[],requests=[];
  const c=vm.createContext({
    S:{liveSDK:true,useMock:false,currentUser:'viewer'},
    CFG:{customApis:{exportBudgetSnapshot:'Export_Budget_Snapshot',manageBudget:'Manage_Budget'}},
    LMRuntime:{apiName:name=>name+'_DEV',current:()=>({environment:'DEVELOPMENT'})},
    LMData:{request(task,invoke,options){requests.push({task,options:plain(options||{})});return Promise.resolve().then(invoke);},responseFailed:response=>!!(response&&response.code!=null&&String(response.code)!=='3000')},
    ZOHO:{CREATOR:{DATA:{async invokeCustomApi(config){calls.push(plain(config));return c.reply;}}}},
    auditLog:(level,message,meta)=>logs.push({level,message,meta:plain(meta||{})}),
    cleanVal:value=>String(value??'').trim(),shortErr:error=>error?.message||String(error),
    Promise,Error,URLSearchParams,Date,setTimeout
  });c.window=c;
  vm.runInContext(moduleSource,c);
  for(const name of ['responseLooksBad','budgetSdkCode','budgetRequest','sdkInvokeCustomApi','sdkRunBudgetFunction'])vm.runInContext(block(name),c);
  return {c,calls,logs,requests};
}
{
  const {c,calls,logs,requests}=harness();
  c.reply=native(page(records.slice(0,20),{total:41,through:records.at(-1).id}));
  await c.sdkRunBudgetFunction('exportBudgetSnapshot',{budgetId:'{"after":"0","through":"0"}',exportType:'ALL_DETAIL'});
  assert.equal(calls[0].api_name,'Export_Budget_Snapshot_DEV');
  assert.equal(calls[0].http_method,'POST');
  assert.equal(requests[0].options.readOnly,true);
  const completed=logs.find(entry=>entry.message==='Budget workflow function completed');
  assert.ok(completed);assert.equal(completed.meta.response.rowCount,20);
  assert.equal(completed.meta.response.total,41);
  assert.ok(JSON.stringify(completed).length<800,'success audit stores bounded page facts rather than every financial row');
  assert.ok(!('rows' in completed.meta.response));
  c.reply={code:3000,result:'Snapshot attachment created'};
  await c.sdkRunBudgetFunction('exportBudgetSnapshot',{budgetId:'42',exportType:'PDF'});
  assert.notEqual(requests[1].options.readOnly,true,'attachment exports retain write semantics');
  assert.deepEqual(logs.filter(entry=>entry.message==='Budget workflow function completed').at(-1).meta.response,c.reply);
  await c.sdkRunBudgetFunction('manageBudget',{budgetId:'42',action:'archive'});
  assert.notEqual(requests[2].options.readOnly,true,'other workflow writes cannot inherit export retry authorization');
}
{
  const {c,calls,logs}=harness();
  c.reply={code:2955,description:'Minute API limit reached'};
  await assert.rejects(c.sdkRunBudgetFunction('exportBudgetSnapshot',{budgetId:'{}',exportType:'ALL_DETAIL'}));
  assert.equal(calls.length,1,'the generic function wrapper does not add a second retry layer');
  assert.ok(!logs.some(entry=>entry.level==='error'),'recoverable read throttling does not trigger a critical-error email before recovery');
}
function deferred(){let resolve;return {promise:new Promise(done=>resolve=done),resolve};}
function installExport(c){
  const nodes={fullBudgetExport:{disabled:false,attributes:{},setAttribute(key,value){this.attributes[key]=value;},removeAttribute(key){delete this.attributes[key];}},fullBudgetExportLabel:{textContent:'Export All Budgets'}};
  const downloads=[],messages=[],toasts=[];
  c.$=id=>nodes[id];c.closeFullBudgetExportMenu=()=>{};c.Blob=Blob;
  c.setMsg=(...args)=>messages.push(args);c.toastShow=(...args)=>toasts.push(args);
  c.triggerBlobDownload=(blob,name)=>downloads.push({blob,name});
  vm.runInContext('var fullBudgetExportBusy=false;\n'+block('runFullBudgetExport'),c);
  return {nodes,downloads,messages,toasts};
}
{
  const {c,calls}=harness(),{nodes,downloads,messages,toasts}=installExport(c),gate=deferred();
  c.ZOHO.CREATOR.DATA.invokeCustomApi=async config=>{
    calls.push(plain(config));if(calls.length===1)await gate.promise;
    const cursor=JSON.parse(config.payload.budgetId),start=cursor.after==='0'?0:records.findIndex(row=>row.id===cursor.after)+1;
    return native(page(records.slice(start,start+20),{after:cursor.after,through:records.at(-1).id,total:41}));
  };
  const pending=c.runFullBudgetExport('csv');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(nodes.fullBudgetExport.disabled,true);
  assert.equal(nodes.fullBudgetExport.attributes['aria-busy'],'true');
  await c.runFullBudgetExport('csv');assert.equal(calls.length,1,'the actual button prevents a duplicate pending export');
  gate.resolve();await pending;
  assert.equal(downloads.length,1);assert.match(downloads[0].name,/^All_Budgets_\d{4}-\d{2}-\d{2}\.csv$/);
  assert.equal((await downloads[0].blob.text()).split('\r\n').length,247,'one header plus 41 parent and 205 element rows');
  assert.equal(messages.length,0);assert.equal(toasts.length,1);
  assert.equal(nodes.fullBudgetExport.disabled,false);assert.equal(nodes.fullBudgetExportLabel.textContent,'Export All Budgets');
  assert.equal(nodes.fullBudgetExport.attributes['aria-busy'],undefined);
}
{
  const {c}=harness(),{downloads,messages,nodes}=installExport(c),gate=deferred();
  c.ZOHO.CREATOR.DATA.invokeCustomApi=async()=>{await gate.promise;return native(page([row(1)]));};
  const pending=c.runFullBudgetExport('csv');await new Promise(resolve=>setImmediate(resolve));
  c.S.currentUser='different-user';gate.resolve();await pending;
  assert.equal(downloads.length,0,'an actor change cannot download another session\'s collected data');
  assert.equal(messages.length,1);assert.match(messages[0][0],/user or environment changed/);
  assert.equal(nodes.fullBudgetExport.disabled,false);
}
{
  const {c,calls}=harness(),{nodes,downloads,messages}=installExport(c),timers=[];
  c.setTimeout=(fn,ms)=>{timers.push({fn,ms});return timers.length;};
  c.ZOHO.CREATOR.DATA.invokeCustomApi=async config=>{
    calls.push(plain(config));if(calls.length===2)return {code:2955,description:'Minute API limit reached'};
    const cursor=JSON.parse(config.payload.budgetId),start=cursor.after==='0'?0:records.findIndex(row=>row.id===cursor.after)+1;
    return native(page(records.slice(start,start+20),{after:cursor.after,through:records.at(-1).id,total:41}));
  };
  const pending=c.runFullBudgetExport('csv');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(timers.length,1);assert.equal(timers[0].ms,61000);
  assert.match(nodes.fullBudgetExportLabel.textContent,/Waiting.*20.*41/,'the actual header retains counts while waiting for Creator');
  assert.equal(nodes.fullBudgetExport.disabled,true);assert.equal(nodes.fullBudgetExport.attributes['aria-busy'],'true');
  timers[0].fn();await pending;
  assert.equal(downloads.length,1);assert.equal(messages.length,0);assert.equal(calls.length,4);
  assert.equal(nodes.fullBudgetExport.disabled,false);assert.equal(nodes.fullBudgetExport.attributes['aria-busy'],undefined);
}
for(const failure of ['missing','network','denied']){
  const {c}=harness(),{downloads,messages,nodes}=installExport(c);
  c.ZOHO.CREATOR.DATA.invokeCustomApi=async()=>{
    if(failure==='network')throw new Error('Network failed');
    return failure==='denied'?{code:2898,message:'Denied'}:native(page([row(1)],{total:2}));
  };
  await c.runFullBudgetExport('csv');
  assert.equal(downloads.length,0,`${failure} cannot produce a partial financial download`);
  assert.equal(messages.length,1);assert.equal(nodes.fullBudgetExport.disabled,false);
  assert.equal(nodes.fullBudgetExport.attributes['aria-busy'],undefined);assert.equal(nodes.fullBudgetExportLabel.textContent,'Export All Budgets');
}
console.log('PASS full export: advertised/legacy page sizes, exact continuation/counts, bounded minute-throttle recovery, actor cancellation, native routing, concise audits and unchanged write semantics.');
