// Actual Tax controller/shared request engine; advancing clock, no native writes.
import assert from 'node:assert/strict';
import {clone,REPORT,FIELD,ID,OTHER,row,rawThrottle,drain,held,ready,idsOf} from './fixtures/tax-batch-harness.mjs';

// The135-destination clear is one native batch and two counted selection reads.
// Every intended ID is acknowledged; per-record verification calls are removed.
{
 const rows=Array.from({length:135},(_,index)=>row((90071992547409941n+BigInt(index)).toString())),h=await ready({rows});
 const before=h.calls.length,ledger=await h.finish(h.tax.batch(REPORT,rows.map(value=>({id:value.ID,payload:{[FIELD]:''}}))));
 assert.equal(ledger.rows.length,135);assert.ok(ledger.rows.every(value=>value.state==='verified'));assert.equal(h.writes.length,1);assert.equal(new Set(idsOf(h.writes[0])).size,135);
 assert.ok(h.storage[REPORT].every(value=>value[FIELD]===''));assert.equal(h.tax.snapshot().reviews.length,0);assert.equal(h.tax.snapshot().verificationReads,0);assert.ok(h.now()<61000);
 for(const call of h.calls)assert.ok(h.calls.filter(value=>value.at>call.at-61000&&value.at<=call.at).length<=45,'all Tax native reads and writes share the45-request sliding budget');
 assert.equal(h.calls.filter(value=>value.method==='batch').length,1);assert.equal(h.calls.length-before,7,'three preflight reads + one batch write + three confirmation reads');
 assert.equal(h.calls.filter(value=>value.method==='records'&&/^\(ID ==/.test(value.config.criteria||'')).length,0,'the complete original search read replaces135 per-record reads');
 assert.equal(h.calls.filter(value=>value.method==='count'&&/^\(ID ==/.test(value.config.criteria||'')).length,0,'the complete original scope retains both counts');
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
