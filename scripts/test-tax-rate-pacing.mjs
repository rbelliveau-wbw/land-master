// Actual Tax controller + shared request engine, with native-shaped replies and
// an advancing clock. No Creator writes, source rewrites, or real minute waits.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {source,readTaxScript} from './fixtures/tax-source.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));
const REPORT='All_Tax_Parcel_Years',FIELD='Arbitration_Notice_Received';
const ID='90071992547409941',OTHER='90071992547409942';
const reports={parcelYears:REPORT,rawLand:'All_Property',companies:'All_Companies',subdivisions:'All_Subdivisions',jurisdictions:'All_Taxing_Jurisdictions',projects:'All_Projects'};
const fieldsByReport=Object.fromEntries([['Tax_Parcel_Year',REPORT],['Property',reports.rawLand]].map(([form,report])=>[report,Object.fromEntries(JSON.parse(fs.readFileSync('creator/generated/fields/'+form+'.json','utf8')).fields.map(field=>[field.link_name,field]))]));
const row=id=>({ID:id,Tax_Parcel_Year_Code:'fixture-'+id,Tax_Year:'2026',Company1:{ID:'90071992547440000',zc_display_value:'Series 125'},Property_ID:'000073',[FIELD]:'28-Sep-2026'});
const rawThrottle={status:429,responseText:JSON.stringify({code:2955,description:'Minute API limit reached'})};
const drain=async()=>{for(let index=0;index<20;index++)await new Promise(resolve=>setImmediate(resolve));};
function held(){let resolve;return {promise:new Promise(yes=>resolve=yes),resolve:value=>resolve(value)};}

function harness(options={}){
 let now=0,sequence=0;
 class FakeDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const timers=new Map(),calls=[],writes=[],published=[],hooks={};
 const runtime={user:'fixture',environment:'PRODUCTION',appLinkName:'land-master'};
 const storage={[REPORT]:clone(options.rows||[row(ID)]),[reports.rawLand]:[{ID:'90071992547420000',Property_ID:'000073'}]};
 const selected=config=>{const rows=storage[config.report_name]||[],match=String(config.criteria||'').match(/^\(ID == (\d+)\)$/);return match?rows.filter(value=>value.ID===match[1]):rows;};
 async function native(method,config,action){calls.push({method,config:clone(config),at:now});return action();}
 const DATA={
  getRecordCount:config=>native('count',config,async()=>{const value=hooks.count?await hooks.count(config):undefined;return value===undefined?{code:3000,result:{records_count:String(selected(config).length)}}:value;}),
  getRecords:config=>native('records',config,async()=>{const value=hooks.records?await hooks.records(config):undefined;return value===undefined?{code:3000,data:clone(selected(config))}:value;}),
  updateRecordById:config=>native('update',config,async()=>{writes.push(clone(config));const apply=()=>Object.assign(storage[config.report_name].find(value=>value.ID===config.id),clone(config.payload.data));if(hooks.update)return hooks.update(config,apply);apply();return {code:3000,data:{ID:config.id}};}),
 };
 const c=vm.createContext({Date:FakeDate,performance:{now:()=>now},setTimeout(fn,ms){const id=++sequence;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),LMRuntime:{current:()=>runtime,apply:()=>runtime},ZOHO:{CREATOR:{UTIL:{getInitParams:async()=>({})},DATA}}});
 c.window=c;
 for(const name of ['creator-data.js','tax-controller.js'])vm.runInContext(readTaxScript(name),c);
 const configuration=source.match(/if\(window\.LMData\)LMData\.configure\(\{maxRequestsPerMinute:45,readRetryOnThrottle:true\}\);/);
 assert.ok(configuration,'Tax startup must opt into the proven shared request budget and safe read retry');
 vm.runInContext(configuration[0],c);
 const tax=c.LMTaxPreparation.create({reports,forms:{property:'Property',parcelYear:'Tax_Parcel_Year'},fieldsByReport,scopeKey:()=>'(Tax_Year == 2026)',verificationTimeoutMs:options.verificationTimeoutMs,onRecovery:(operation,value)=>published.push(clone(value)),onBatchOpen(){}});
 async function advance(ms){const until=now+ms;for(let steps=0;steps<10000;steps++){const first=[...timers].filter(([,timer])=>timer.at<=until).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!first)break;now=first[1].at;timers.delete(first[0]);first[1].fn();await drain();}now=until;await drain();}
 async function finish(promise){let done=false,result,failure;promise.then(value=>{done=true;result=value;},error=>{done=true;failure=error;});for(let step=0;step<2000&&!done;step++){await drain();if(done)break;const next=Math.min(...[...timers.values()].map(timer=>timer.at));assert.ok(Number.isFinite(next),'a pending fixture needs a real request or deadline timer');await advance(next-now);}assert.equal(done,true,'the captured request must settle');if(failure)throw failure;return result;}
 return {c,tax,calls,writes,published,storage,hooks,runtime,timers,advance,finish,now:()=>now};
}
async function ready(options){const h=harness(options);await h.finish(h.tax.start());assert.equal((await h.finish(h.tax.reloadReferences())).published,true);assert.equal((await h.finish(h.tax.search('(Tax_Year == 2026)'))).published,true);return h;}

// Reproduce the actual135-destination workflow: each clear still requires its
// native acknowledgement plus counted ID read and final stable count. Multiple
// minute boundaries do not turn queued verification into an unknown write.
{
 const rows=Array.from({length:135},(_,index)=>row((90071992547409941n+BigInt(index)).toString())),h=await ready({rows});
 const ledger=await h.finish(h.tax.batch(REPORT,rows.map(value=>({id:value.ID,payload:{[FIELD]:''}}))));
 assert.equal(ledger.rows.length,135);assert.ok(ledger.rows.every(value=>value.state==='verified'));assert.equal(h.writes.length,135);assert.equal(new Set(h.writes.map(value=>value.id)).size,135);
 assert.ok(h.storage[REPORT].every(value=>value[FIELD]===''));assert.equal(h.tax.snapshot().reviews.length,0);assert.equal(h.tax.snapshot().verificationReads,0);assert.ok(h.now()>61000);
 for(const call of h.calls)assert.ok(h.calls.filter(value=>value.at>call.at-61000&&value.at<=call.at).length<=45,'all Tax native reads and writes share the45-request sliding budget');
 assert.equal(h.calls.filter(value=>value.method==='update').length,135);
 assert.equal(h.calls.filter(value=>value.method==='records'&&/^\(ID ==/.test(value.config.criteria||'')).length,135,'every acknowledged destination retains its exact-ID read');
 assert.equal(h.calls.filter(value=>value.method==='count'&&/^\(ID ==/.test(value.config.criteria||'')).length,270,'both identity counts remain for every destination');
 assert.equal(h.tax.closeProgress(ledger.id),true);
 const fresh=await h.finish(h.tax.search('(Tax_Year == 2026)'));assert.ok(fresh.rows.every(value=>value[FIELD]===''),'a fresh scope retains the persisted clears');
}

// Smaller budget makes a wait between verification stages unavoidable. Both the
// first count/row pair and the final count may cross a full61-second window.
{
 const h=await ready();await h.advance(61000);h.c.LMData.configure({maxRequestsPerMinute:2});
 const result=await h.finish(h.tax.update(ID,{[FIELD]:''}));assert.equal(result.data.ID,ID);assert.equal(h.writes.length,1);assert.equal(h.tax.snapshot().reviews.length,0);assert.ok(h.now()>=122000);
}

// Every Tax read entry point decodes a raw HTTP429 Creator2955 envelope and
// retries read-only once after the shared cooldown. The successful write never
// repeats when one of its counted verification calls receives that response.
for(const returned of [false,true])for(const phase of ['direct-count','first-count','records','final-count']){
 const h=await ready();await h.advance(61000);let counts=0,failures=0;
 const throttle=()=>{if(returned)return {code:2955,message:'Minute API limit reached'};throw rawThrottle;};
 h.hooks.count=config=>{if(config.report_name!==REPORT)return;const exact=/^\(ID ==/.test(config.criteria||''),eligible=phase==='direct-count'?!exact:exact;if(!eligible)return;counts++;if(phase==='direct-count'&&counts===1||phase==='first-count'&&counts===1||phase==='final-count'&&counts===2){failures++;return throttle();}};
 if(phase==='records')h.hooks.records=config=>{if(/^\(ID ==/.test(config.criteria||'')&&!failures++)return throttle();};
 const result=await h.finish(phase==='direct-count'?h.tax.count(REPORT,''):h.tax.update(ID,{[FIELD]:''}));
 assert.equal(phase==='direct-count'?result:result.data.ID,phase==='direct-count'?1:ID);assert.equal(h.writes.length,phase==='direct-count'?0:1);assert.equal(h.tax.snapshot().reviews.length,0);assert.ok(h.calls.some(value=>value.at>=122000),'a throttled read waits for Creator cooldown');
 assert.ok(h.c.LMPerf.snapshot().events.some(value=>value.name==='creator:read-throttled'));
}

// Creator write throttles remain unknown and never replay, even when the native
// write applied before its reply was lost. Recovery is exact-ID read-only.
{
 const h=await ready();h.hooks.update=(config,apply)=>{apply();throw rawThrottle;};
 await assert.rejects(h.finish(h.tax.update(ID,{[FIELD]:''})),error=>error.uncertain&&h.c.LMData.failureCode(error)==='2955');assert.equal(h.writes.length,1);
 await h.advance(122000);assert.equal(h.writes.length,1);await assert.rejects(h.tax.update(ID,{[FIELD]:''}),/not ready|Recheck/);
 const key=h.tax.snapshot().reviews[0].key;assert.equal(await h.finish(h.tax.recheck(key)),true);assert.equal(h.writes.length,1);assert.equal(h.tax.snapshot().reviews.length,0);
}

// A truly pending native verification read still hits its30-second bound,
// retains the unknown write and blocks recovery until its actual native reply.
// A late reply cannot publish or silently mark the retained operation saved.
{
 const h=await ready(),pause=held();h.hooks.records=config=>/^\(ID ==/.test(config.criteria||'')?pause.promise:undefined;
 const saving=h.tax.update(ID,{[FIELD]:''});let failure;saving.catch(error=>failure=error);await drain();await h.advance(29999);assert.equal(failure,undefined);await h.advance(1);await assert.rejects(saving,error=>error.timedOut&&error.noReplay);
 assert.equal(h.tax.snapshot().reviews.length,1);assert.equal(h.tax.snapshot().verificationReads,1);assert.equal(await h.tax.recheck(h.tax.snapshot().reviews[0].key),false);assert.equal(h.published.length,0);
 pause.resolve({code:3000,data:[clone(h.storage[REPORT][0])]});await drain();assert.equal(h.tax.snapshot().verificationReads,0);assert.equal(h.published.length,0);assert.equal(h.tax.snapshot().reviews.length,1);assert.equal(h.writes.length,1);
 h.hooks.records=null;assert.equal(await h.finish(h.tax.recheck(h.tax.snapshot().reviews[0].key)),true);assert.equal(h.writes.length,1);
}

// The same real timeout begins again after an explained rate wait resumes.
{
 const h=await ready(),pause=held();await h.advance(61000);h.c.LMData.configure({maxRequestsPerMinute:1});h.hooks.count=config=>/^\(ID ==/.test(config.criteria||'')?pause.promise:undefined;
 const saving=h.tax.update(ID,{[FIELD]:''});let failure;saving.catch(error=>failure=error);await drain();await h.advance(61000);assert.equal(failure,undefined);assert.equal(h.tax.snapshot().verificationReads,1);await h.advance(29999);assert.equal(failure,undefined);await h.advance(1);await assert.rejects(saving,error=>error.timedOut&&error.noReplay);assert.equal(h.writes.length,1);
 pause.resolve({code:3000,result:{records_count:'1'}});await drain();await h.advance(61000);assert.equal(h.calls.filter(value=>value.method==='records'&&/^\(ID ==/.test(value.config.criteria||'')).length,0,'expired queued verification never dispatches its next native read');assert.equal(h.writes.length,1);
}

// Short configured bounds remain meaningful, and unexplained queue blocking is
// still bounded rather than being mistaken for the known budget cooldown.
{
 const h=await ready({verificationTimeoutMs:20}),pause=held();h.hooks.records=config=>/^\(ID ==/.test(config.criteria||'')?pause.promise:undefined;
 const saving=h.tax.update(ID,{[FIELD]:''});saving.catch(()=>{});await drain();await h.advance(20);await assert.rejects(saving,error=>error.timedOut);pause.resolve({code:3000,data:[clone(h.storage[REPORT][0])]});await drain();assert.equal(h.writes.length,1);
}

// Exact identity/count/session safeguards remain authoritative. Successful native
// saves do not compare editable values, but explicit unknown recovery does.
{
 const h=await ready();h.hooks.update=()=>({code:2898,message:'Permission denied'});
 await assert.rejects(h.finish(h.tax.update(ID,{[FIELD]:''})),error=>String(error.code)==='2898');assert.equal(h.tax.snapshot().reviews.length,0,'a definite primary write rejection remains editable');assert.equal(h.writes.length,1);
 h.hooks.update=null;await h.finish(h.tax.update(ID,{[FIELD]:''}));assert.equal(h.writes.length,2,'only a deliberate corrected submit can send a rejected write again');
}
for(const fault of ['wrong-id','duplicate','changed-count','denied']){
 const h=await ready();let counts=0;
 h.hooks.records=config=>{if(!/^\(ID ==/.test(config.criteria||''))return;if(fault==='wrong-id')return {code:3000,data:[row(OTHER)]};if(fault==='duplicate')return {code:3000,data:[row(ID),row(ID)]};if(fault==='denied')return {code:2898,error:'Permission denied'};};
 h.hooks.count=config=>/^\(ID ==/.test(config.criteria||'')&&fault==='changed-count'?{code:3000,result:{records_count:String(++counts===1?1:2)}}:undefined;
 await assert.rejects(h.finish(h.tax.update(ID,{[FIELD]:''})));assert.equal(h.tax.snapshot().reviews.length,1,fault+' retains unresolved save');assert.equal(h.published.length,0);assert.equal(h.writes.length,1);
 await assert.rejects(h.tax.update(ID,{[FIELD]:''}),/not ready|Recheck/);assert.equal(h.writes.length,1,'an acknowledged write cannot repeat after its verification read failed');
 h.hooks.records=null;h.hooks.count=null;h.storage[REPORT][0][FIELD]='28-Sep-2026';assert.equal(await h.finish(h.tax.recheck(h.tax.snapshot().reviews[0].key)),false,'unknown recovery still compares the captured clear');assert.equal(h.writes.length,1);
 h.storage[REPORT][0][FIELD]='';assert.equal(await h.finish(h.tax.recheck(h.tax.snapshot().reviews[0].key)),true);assert.equal(h.writes.length,1);
}
{
 const h=await ready();h.hooks.records=config=>/^\(ID ==/.test(config.criteria||'')?{code:3000,data:[row(ID)]}:undefined;
 await h.finish(h.tax.update(ID,{[FIELD]:''}));assert.equal(h.tax.snapshot().reviews.length,0,'acknowledged saves preserve the automatic field-comparison policy');assert.equal(h.writes.length,1);
}
{
 const h=await ready();await h.advance(61000);h.c.LMData.configure({maxRequestsPerMinute:1});const first=h.c.LMData.request('fill-budget',()=>true,{readOnly:true});await first;
 const saving=h.tax.update(ID,{[FIELD]:''});saving.catch(()=>{});await drain();h.runtime.user='another-user';await h.advance(61000);await assert.rejects(saving,/session/);assert.equal(h.writes.length,0,'a stale queued actor cannot dispatch a native write');
}
{
 const h=await ready();await h.advance(61000);h.c.LMData.configure({maxRequestsPerMinute:1});const saving=h.tax.update(ID,{[FIELD]:''});saving.catch(()=>{});await drain();h.runtime.user='another-user';await h.advance(61000);await assert.rejects(saving);assert.equal(h.writes.length,1);assert.equal(h.calls.filter(value=>value.method==='count'&&/^\(ID ==/.test(value.config.criteria||'')).length,0,'stale queued verification checks its actor before native dispatch');assert.equal(h.published.length,0);
}
console.log('PASS Tax135-destination budget pacing; raw429 read cooldown; writes never replay; real and resumed verification bounds; late/stale cancellation; identity/count and read-only recovery guards.');
