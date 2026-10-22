import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('widgets/settings-manager/src/app/workflow-log.js','utf8');
let markup='',pending=null,context={environment:'DEVELOPMENT',user:'owner@example.test',appLinkName:'land-master'};
const controls=new Map();
const control=key=>{if(!controls.has(key))controls.set(key,{dataset:{},disabled:false,textContent:'',setAttribute(){}});return controls.get(key);};
const host={get innerHTML(){return markup;},set innerHTML(value){markup=value;},querySelector:selector=>selector===':focus'?null:control(selector),querySelectorAll:()=>[]};
const settings={live:true,demo:false,ready:true,loadBlocked:false,recId:'4410926000000000123'};
const requests=[];
const sandbox={console,Intl,Date,document:{getElementById:()=>host},LMRuntime:{current:()=>context},LMData:{readAll:async options=>{requests.push(options);if(pending)return pending;return rows;}}};
sandbox.window=sandbox;
vm.runInNewContext(source,sandbox);
const log=sandbox.LMWorkflowLog;
let rows=[
 {ID:'4410926000000000190',Started_At:'10/21/2026 12:05:00 PM',Workflow_Name:'Afternoon sync',External_System:'Analytics',Run_Status:'Success',Rows_Received:'10',Rows_Processed:'10',Rows_Created:'2',Rows_Updated:'8',Rows_Skipped:'0',Rows_Failed:'0'},
 {ID:'4410926000000000189',Started_At:'10/21/2026 09:00:00 AM',Workflow_Name:'<img src=x onerror=alert(1)>',External_System:'Analytics',Run_Status:'Failed',Message:'<script>bad()</script>',Notification_Error:'No recipients configured'},
 {ID:'4410926000000000188',Started_At:'10/20/2026 11:55:00 PM',Workflow_Name:'Prior evening',External_System:'Projects',Run_Status:'Partial'}
];
log.mount({state:settings});
assert.equal(requests.length,0,'History is lazy; opening Settings does not download all execution history');
assert.equal(log.cutoff(1,new Date('2026-10-21T02:30:00Z')),'10/20/2026 12:00:00 AM','Date ranges use the application Chicago timezone, not UTC/browser local timezone');
assert.equal(log.cutoff(7,new Date('2026-10-21T16:00:00Z')),'10/15/2026 12:00:00 AM');
assert.ok(log.dateOrder('10/21/2026 12:05:00 PM')>log.dateOrder('10/21/2026 09:00:00 AM'));
assert.ok(log.dateOrder('10/21/2026 12:05:00 AM')<log.dateOrder('10/21/2026 09:00:00 AM'));
await log.load();
assert.equal(requests.length,1);
assert.match(requests[0].criteria,/^\(Started_At >= '\d{2}\/\d{2}\/\d{4} 12:00:00 AM'\)$/);
assert.ok(requests[0].fields.includes('Notification_Error'));
assert.deepEqual(Array.from(log.visible(),row=>row.ID),rows.map(row=>row.ID));
assert.match(markup,/&lt;img src=x onerror=alert\(1\)&gt;/);
assert.match(markup,/&lt;script&gt;bad\(\)&lt;\/script&gt;/);
assert.doesNotMatch(markup,/<script>|<img src=x/);
host.onchange({target:{matches:selector=>selector==='[data-wl-failures]',checked:true}});
assert.deepEqual(Array.from(log.visible(),row=>row.Run_Status),['Failed','Partial']);
host.oninput({target:{name:'workflow-search',value:'prior'}});
assert.equal(log.visible().length,1);
host.oninput({target:{name:'workflow-search',value:''}});
host.onchange({target:{matches:()=>true,checked:false}});
const before=markup;
let settle;
pending=new Promise(resolve=>{settle=resolve;});
const loading=log.load();
assert.equal(markup,before,'Refresh keeps the complete authorized rows mounted while pending');
assert.equal(controls.get('[data-wl-refresh]').disabled,true);
settle(rows);await loading;pending=null;
pending=Promise.reject(new Error('Temporary source outage'));
await log.load();pending=null;
assert.equal(log.visible().length,3,'A transient failed refresh retains the prior complete authorized history');
assert.match(markup,/Temporary source outage/);
pending=Promise.reject(Object.assign(new Error('Access denied'),{permissionDenied:true}));
await log.load();pending=null;
assert.equal(log.visible().length,0,'An access failure clears private history');
await log.load();
context={...context,user:'different@example.test'};
log.mount({state:settings});
assert.equal(log.visible().length,0,'Identity changes clear history and animation identities');
rows=Array.from({length:123},(_,i)=>({...rows[0],ID:String(4410926000000000200n+BigInt(i))}));
await log.load();
assert.equal((markup.match(/<tr data-wl-id=/g)||[]).length,50,'Only one page of rows is mounted');
host.onclick({target:{closest:selector=>selector==='[data-wl-next]'?{}:null}});
assert.match(markup,/Page 2 of 3/);
settings.loadBlocked=true;log.mount({state:settings});assert.equal(log.visible().length,0);
assert.equal(await log.load(),false);
console.log('PASS: workflow history Chicago dates, newest-first order, filtering, escaped details, bounded pages, refresh continuity, identity/access guards and read-only loading.');

// Execute the native retention action with a supplied native calendar cutoff.
// The fixture adapts record criteria only; Creator Save validates Deluge syntax.
const retention=fs.readFileSync('creator/integration-audit/prepared/Workflow_Log_Retention.action-1.dg','utf8');
const schedule=fs.readFileSync('creator/integration-audit/prepared/Workflow_Log_Retention.ds','utf8');
assert.match(schedule,/frequency\s*=\s*daily\b/);
assert.match(schedule,/time zone\s*=\s*"America\/Chicago"/);
const scheduleBody=schedule.match(/on load\s*\(([\s\S]*)\)\s*\}\s*\}\s*\}/)[1];
const normalize=value=>value.replace(/\/\/[^\n]*|\s+/g,'');
assert.equal(normalize(scheduleBody),normalize(retention),'The deployable schedule must contain the verified action');
const executable=retention.replace(/\/\/[^\n]*/g,'')
  .replace(/\bretentionCutoff\s*=/,'var retentionCutoff =')
  .replace(/delete from (\w+)\[([^\]]+)\];/g,(_,form,criteria)=>`deleteRecords("${form}", row => ${criteria.replace(/\bStarted_At\b/g,'row.Started_At')});`);
for(const cutoffText of ['2026-07-23T02:15:00-05:00','2026-10-23T02:15:00-05:00','2028-02-29T02:15:00-06:00']){
  const cutoff=Date.parse(cutoffText);
  const statuses=['Running','Success','Failed','Partial','Skipped','Timed Out'];
  const fixtures=statuses.flatMap(Run_Status=>[-1,0,1].map(offset=>({ID:`${Run_Status}/${offset}`,Run_Status,Started_At:cutoff+offset})));
  fixtures.push({ID:'unknown-start',Started_At:null});
  let deleted,cutoffCalls=0;
  vm.runInNewContext(executable,{
    zoho:{currenttime:{subMonth(months){assert.equal(months,3,'Retention must use three calendar months');cutoffCalls++;return cutoff;}}},
    deleteRecords(form,predicate){assert.equal(form,'Workflow_Run_Log','Retention must never delete business records');assert.equal(deleted,undefined,'Use one native criteria deletion');deleted=fixtures.filter(predicate).map(row=>row.ID);}
  });
  assert.equal(cutoffCalls,1);
  assert.deepEqual(deleted,statuses.flatMap(status=>[`${status}/-1`,`${status}/0`]),'Delete expired logs in every status; preserve newer and missing-start records');
}
console.log('PASS: workflow log retention schedule, exact expiry boundary, every run status, null dates and log-only deletion.');
