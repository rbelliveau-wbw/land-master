import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('shared/creator-data.js','utf8'),drain=async()=>{for(let i=0;i<20;i++)await new Promise(r=>setImmediate(r));};
function harness(){let now=0,seq=0;const timers=new Map();const c=vm.createContext({Date:{now:()=>now},LMRuntime:{current:()=>({user:'fixture',environment:'PRODUCTION'})},setTimeout(fn,ms){const id=++seq;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id)});vm.runInContext(source,c);return {data:c.LMData,timers,advance(ms){now+=ms;for(const [id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn();}}};}
{
 const h=harness();let calls=0;await Promise.all(Array.from({length:70},()=>h.data.request('default',()=>++calls)));assert.equal(calls,70,'other widgets retain their existing default scheduling');assert.equal(h.timers.size,0);
}
{
 const h=harness();h.data.configure({maxRequestsPerMinute:45});let calls=0;const p=Promise.all(Array.from({length:50},()=>h.data.request('paced',()=>++calls)));await drain();assert.equal(calls,45);h.advance(60000);await drain();assert.equal(calls,45);h.advance(1000);await p;assert.equal(calls,50);
}
for(const raw of [{status:429,responseText:JSON.stringify({code:2955,description:'Minute API limit reached'})},{code:2955,message:'Minute API limit reached'}]){
 const h=harness();h.data.configure({maxRequestsPerMinute:45,readRetryOnThrottle:true});let calls=0;const p=h.data.request('read',()=>{if(++calls===1)throw raw;return 'fresh';},{readOnly:true});await drain();assert.equal(calls,1);h.advance(61000);assert.equal(await p,'fresh');assert.equal(calls,2);assert.equal(h.data.failureCode(raw),'2955');
 const e=h.data.failure('Native',raw);assert.match(e.message,/Minute API limit/);
}
{
 const h=harness();h.data.configure({maxRequestsPerMinute:45,readRetryOnThrottle:true});let calls=0;const raw={status:429,responseText:'{"code":2955,"description":"Limit reached"}'};await assert.rejects(h.data.request('write',()=>{calls++;throw raw;}));h.advance(61000);await drain();assert.equal(calls,1,'a throttled write is never automatically replayed');
}
{
 const h=harness();h.data.configure({maxRequestsPerMinute:1});let cancel=false,calls=0;await h.data.request('first',()=>true);const p=h.data.readAll({reportName:'Test',isCancelled:()=>cancel,api:{getRecordCount:()=>{calls++;return {code:3000,result:{records_count:'0'}};},getRecords:()=>{throw Error('unexpected');}}});await drain();cancel=true;h.advance(61000);await assert.rejects(p,e=>e.cancelled===true);assert.equal(calls,0,'a superseded queued read cannot dispatch');
}
console.log('PASS opt-in request pacing; default widget behavior unchanged; 429 native decoding/read-only recovery; writes never replay; cancellation checked at dispatch.');
