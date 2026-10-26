// Native-shaped updateRecords tests against the actual controller and scheduler.
import assert from 'node:assert/strict';
import {clone,REPORT,FIELD,ID,OTHER,row,drain,held,ready,idsOf,acknowledged,rawThrottle} from './fixtures/tax-batch-harness.mjs';

const rowsFor=count=>Array.from({length:count},(_,index)=>row((90071992547409941n+BigInt(index)).toString()));
const intents=rows=>rows.map(value=>({id:value.ID,payload:{[FIELD]:''}}));
const states=result=>Array.from(result.rows,value=>value.state);
const exact=config=>/^\(ID ==/.test(config.criteria||'');
const reviewKey=id=>'update:'+REPORT+':'+id;

//135 records take one native write;800 take four. All native calls, including
// counts and cursor pages, remain under the same45-call sliding budget.
for(const count of [135,800]){
 const rows=rowsFor(count),h=await ready({rows}),before=h.calls.length,captured=intents(rows),saving=h.tax.batch(REPORT,captured);captured[0].payload[FIELD]='20-Oct-2026';
 const result=await h.finish(saving);assert.ok(result.rows.every(value=>value.state==='verified'));assert.equal(h.writes.length,Math.ceil(count/200));assert.equal(h.calls.filter(call=>call.method==='update').length,0);
 const sent=h.writes.flatMap(idsOf);assert.equal(sent.length,count);assert.equal(new Set(sent).size,count);assert.deepEqual([...sent].sort(),rows.map(value=>value.ID).sort());assert.ok(h.writes.every(value=>value.payload.data[FIELD]===''));
 assert.ok(h.writes.every(value=>!Object.hasOwn(value,'skip_workflow')&&!Object.hasOwn(value.payload,'skip_workflow')&&!Object.hasOwn(value.payload,'process_until_limit')),'default native workflows stay enabled and oversized writes never truncate');
 assert.equal(h.calls.length-before,count===135?7:22);assert.equal(h.published.length,count);assert.equal(h.tax.snapshot().reviews.length,0);assert.equal(h.tax.snapshot().nativeWrites,0);assert.equal(h.tax.snapshot().verificationReads,0);assert.ok(h.now()<61000);
 const readCalls=h.calls.slice(before).filter(call=>call.method==='records');assert.equal(readCalls.filter(call=>exact(call.config)).length,Math.ceil(count/200));
 for(const call of h.calls)assert.ok(h.calls.filter(value=>value.at>call.at-61000&&value.at<=call.at).length<=45);
 assert.equal(h.tax.closeProgress(result.id),true);const fresh=await h.finish(h.tax.search(h.scope.value));assert.ok(fresh.rows.every(value=>value[FIELD]===''));
}

// A partial selection never broadens to all matching Company/year rows. Native
// workflow changes and an edited Status leaving its old filter still publish
// returned values after exact-ID acknowledgement, without value equality gates.
{
 const rows=rowsFor(6),h=await ready({rows});
 h.hooks.batch=(config,apply,ids)=>{apply();for(const id of ids)h.storage[REPORT].find(value=>value.ID===id).Status='Native workflow result';return acknowledged(ids);};
 h.hooks.count=config=>!exact(config)&&h.writes.length?{code:3000,result:{records_count:'0'}}:undefined;
 h.hooks.records=config=>!exact(config)&&h.writes.length?{code:3000,data:[]}:undefined;
 const selected=[rows[1],rows[4]],result=await h.finish(h.tax.batch(REPORT,selected.map(value=>({id:value.ID,payload:{Status:'No Protest'}}))));
 assert.deepEqual(states(result),['verified','verified']);assert.deepEqual(idsOf(h.writes[0]),selected.map(value=>value.ID));assert.deepEqual(h.published.map(value=>value.Status),['Native workflow result','Native workflow result']);assert.equal(h.storage[REPORT].filter(value=>value.Status==='Under Protest').length,4);
 assert.equal(h.calls.filter(call=>call.method==='records'&&exact(call.config)).length,1);assert.equal(h.tax.snapshot().reviews.length,0);
}

// Copy-from fields retain each frozen value. Equal payloads with a different key
// order share one call; distinct values are never coerced or merged together.
{
 const rows=rowsFor(9),h=await ready({rows}),captured=rows.map((value,index)=>({id:value.ID,payload:index%2?{Property_ID:'copy-'+index%3,Status:'No Protest'}:{Status:'No Protest',Property_ID:'copy-'+index%3}}));
 const result=await h.finish(h.tax.batch(REPORT,captured));assert.ok(result.rows.every(value=>value.state==='verified'));assert.equal(h.writes.length,3);
 for(const write of h.writes)for(const id of idsOf(write)){const index=rows.findIndex(value=>value.ID===id);assert.equal(write.payload.data.Property_ID,'copy-'+index%3);}
}

// Many genuinely distinct copy values still share the45-request scheduler;
// unavoidable budget waits never cause a write replay or a false timeout.
{
 const rows=rowsFor(65),h=await ready({rows}),result=await h.finish(h.tax.batch(REPORT,rows.map((value,index)=>({id:value.ID,payload:{Property_ID:'copy-'+index}}))));
 assert.ok(result.rows.every(value=>value.state==='verified'));assert.equal(h.writes.length,65);assert.equal(new Set(h.writes.flatMap(idsOf)).size,65);assert.ok(h.now()>=61000);
 for(const call of h.calls)assert.ok(h.calls.filter(value=>value.at>call.at-61000&&value.at<=call.at).length<=45);
}

// Invalid SDKs and invalid or stale complete selections fail before any write.
{
 const h=await ready({rows:rowsFor(2)});for(const selected of [[ID,ID],[ID,'999'],[7]])await assert.rejects(h.tax.batch(REPORT,selected.map(id=>({id,payload:{[FIELD]:''}}))));
 await assert.rejects(h.tax.batch(REPORT,[{id:ID,payload:{Missing_Field:''}}]));assert.equal(h.writes.length,0);
 h.DATA.updateRecords=undefined;const result=await h.finish(h.tax.batch(REPORT,intents(h.storage[REPORT])));assert.deepEqual(states(result),['not-sent','not-sent']);assert.match(result.error,/batch update bridge/);assert.equal(h.writes.length,0);
}

// A queued write checks the captured actor again at physical dispatch. Earlier
// queued budget work cannot authorize an obsolete user's mutation.
for(const stale of ['actor','scope']){
 const rows=rowsFor(2),h=await ready({rows});await h.advance(61000);h.c.LMData.configure({maxRequestsPerMinute:4});await h.c.LMData.request('fill-budget',()=>true,{readOnly:true});
 const saving=h.tax.batch(REPORT,intents(rows));await drain();assert.equal(h.writes.length,0);assert.equal(h.c.LMPerf.snapshot().rate.reason,'request-budget');if(stale==='actor')h.runtime.user='another-user';else h.scope.value='changed-scope';await h.advance(61000);const result=await saving;assert.deepEqual(states(result),['not-sent','not-sent']);assert.equal(h.writes.length,0);assert.equal(h.tax.snapshot().nativeWrites,0);
}

// The confirmation deadline excludes a known minute-budget idle period for
// every read stage; no pending native request receives an unbounded extension.
{
 const rows=rowsFor(2),h=await ready({rows});await h.advance(61000);h.c.LMData.configure({maxRequestsPerMinute:1});
 const result=await h.finish(h.tax.batch(REPORT,intents(rows)));assert.deepEqual(states(result),['verified','verified']);assert.equal(h.writes.length,1);assert.ok(h.now()>=366000);assert.equal(h.tax.snapshot().reviews.length,0);
}
for(const fault of ['changed-field','missing-id','same-count-foreign','actor','scope']){
 const rows=rowsFor(2),h=await ready({rows});
 if(fault==='changed-field')h.storage[REPORT][0][FIELD]='20-Oct-2026';if(fault==='missing-id')h.storage[REPORT].pop();if(fault==='same-count-foreign')h.storage[REPORT][1].ID='999';if(fault==='actor')h.runtime.user='another-user';if(fault==='scope')h.scope.value='changed-scope';
 if(fault==='actor')await assert.rejects(h.tax.batch(REPORT,intents(rows)));else{const result=await h.finish(h.tax.batch(REPORT,intents(rows)));assert.ok(result.rows.every(value=>value.state==='not-sent'));assert.ok(result.error);}assert.equal(h.writes.length,0);
}

// Missing, duplicate, foreign, numeric, competing or malformed replies retain
// the entire captured chunk. Recovery reads each exact ID and never resends.
for(const fault of ['missing','duplicate','foreign','numeric','no-result','string-result','nested-error','competing','transport-error']){
 const rows=rowsFor(2),h=await ready({rows});h.hooks.batch=(config,apply,ids)=>{apply();const result=acknowledged(ids);if(fault==='missing')result.result.pop();if(fault==='duplicate')result.result[1].data.ID=ids[0];if(fault==='foreign')result.result[1].data.ID='999';if(fault==='numeric')result.result[1].data.ID=7;if(fault==='no-result')delete result.result;if(fault==='string-result')result.result=JSON.stringify(result.result);if(fault==='nested-error')result.details={code:2898,message:'Denied'};if(fault==='competing')result.data={ID:ids[0]};if(fault==='transport-error')result.responseText=JSON.stringify({code:2898,message:'Denied'});return result;};
 const result=await h.finish(h.tax.batch(REPORT,intents(rows)));assert.deepEqual(states(result),['unknown','unknown'],fault);assert.equal(h.published.length,0);assert.equal(h.writes.length,1);assert.equal(h.tax.snapshot().reviews.length,2);await assert.rejects(h.tax.retryBatch(result.id));
 for(const value of rows)assert.equal(await h.finish(h.tax.recheck(reviewKey(value.ID))),true);assert.equal(h.writes.length,1);assert.equal(h.tax.snapshot().reviews.length,0);assert.deepEqual(states(h.tax.ledger(result.id)),['verified','verified']);
}

// Exact mixed acknowledgement sets retain their own native code and outcome.
// Unfamiliar failures stay unknown; rejected rows alone can be deliberately
// retried after all unknown rows have been reconciled through read-only checks.
{
 const rows=rowsFor(3),h=await ready({rows});h.hooks.batch=(config,apply,ids)=>{apply([ids[0],ids[2]]);return {code:3000,result:[{code:3000,data:{ID:ids[0]}},{code:2897,data:{ID:ids[1]},message:'No edit permission'},{code:4590,data:{ID:ids[2]},message:'Workflow returned an unfamiliar result'}]};};
 const result=await h.finish(h.tax.batch(REPORT,intents(rows)));assert.deepEqual(states(result),['verified','rejected','unknown']);assert.equal(String(result.rows[1].code),'2897');assert.equal(String(result.rows[2].code),'4590');assert.equal(h.published.length,1);assert.equal(h.writes.length,1);await assert.rejects(h.tax.retryBatch(result.id));
 assert.equal(await h.finish(h.tax.recheck(reviewKey(rows[2].ID))),true);assert.equal(h.writes.length,1);assert.equal(h.tax.closeProgress(result.id),true);h.hooks.batch=null;
 const retry=await h.finish(h.tax.retryBatch(result.id));assert.deepEqual(states(retry),['verified','verified','verified']);assert.equal(h.writes.length,2);assert.deepEqual(idsOf(h.writes[1]),[rows[1].ID]);
}

// A selected field changed after a definite rejection blocks retry at fresh
// preflight. Previously acknowledged destinations never reenter a retry write.
{
 const rows=rowsFor(2),h=await ready({rows});h.hooks.batch=(config,apply,ids)=>{apply([ids[0]]);return {code:3000,result:[{code:3000,data:{ID:ids[0]}},{code:2898,data:{ID:ids[1]},message:'Denied'}]};};
 const result=await h.finish(h.tax.batch(REPORT,intents(rows)));assert.deepEqual(states(result),['verified','rejected']);assert.equal(h.tax.closeProgress(result.id),true);h.storage[REPORT][1][FIELD]='20-Oct-2026';h.hooks.batch=null;
 const retry=await h.finish(h.tax.retryBatch(result.id));assert.match(retry.error,/changed before/);assert.equal(h.writes.length,1);assert.equal(retry.rows[0].state,'verified');
}

// Own verified destinations may leave the original Status/Company filter.
// Retrying the remaining rejected IDs tolerates only those known departures.
for(const field of ['Status','Company1'])for(const scopeChange of ['own-only','unrelated-missing','foreign-added']){
 const rows=rowsFor(3),h=await ready({rows}),old=field==='Status'?'Under Protest':'90071992547440000',next=field==='Status'?'No Protest':'90071992547449999';
 const current=()=>h.storage[REPORT].filter(value=>(field==='Company1'?value[field]?.ID||value[field]:value[field])===old);
 h.hooks.count=config=>config.report_name===REPORT&&!exact(config)?{code:3000,result:{records_count:String(current().length)}}:undefined;
 h.hooks.records=config=>config.report_name===REPORT&&!exact(config)?{code:3000,data:clone(current())}:undefined;
 h.hooks.batch=(config,apply,ids)=>{apply([ids[0]]);return {code:3000,result:[{code:3000,data:{ID:ids[0]}},{code:2898,data:{ID:ids[1]},message:'Denied'}]};};
 const selected=rows.slice(0,2).map(value=>({id:value.ID,payload:{[field]:next}})),result=await h.finish(h.tax.batch(REPORT,selected));assert.deepEqual(states(result),['verified','rejected']);assert.equal(h.tax.closeProgress(result.id),true);h.hooks.batch=null;
 if(scopeChange==='unrelated-missing')h.storage[REPORT].pop();if(scopeChange==='foreign-added')h.storage[REPORT].push(row('999'));
 const retry=await h.finish(h.tax.retryBatch(result.id));if(scopeChange==='own-only'){assert.deepEqual(states(retry),['verified','verified']);assert.equal(h.writes.length,2);assert.deepEqual(idsOf(h.writes[1]),[rows[1].ID]);}else{assert.match(retry.error,/scope changed/);assert.equal(h.writes.length,1);assert.equal(retry.rows[0].state,'verified');}
}

// A lost transport reply stops future chunks. Physically pending native work
// keeps its shared slot and blocks Close/recheck/retry even after the deadline.
{
 const rows=rowsFor(201),h=await ready({rows}),pause=held();h.hooks.batch=(config,apply,ids)=>pause.promise.then(()=>{apply();return acknowledged(ids);});
 const saving=h.tax.batch(REPORT,intents(rows));await drain();assert.equal(h.writes.length,1);await h.advance(30000);const result=await saving;assert.equal(result.rows.slice(0,200).every(value=>value.state==='unknown'),true);assert.equal(result.rows[200].state,'not-sent');assert.equal(h.tax.snapshot().nativeWrites,1);assert.ok(h.tax.snapshot().reviews.every(value=>value.pending));assert.equal(h.tax.closeProgress(result.id),false);assert.equal(await h.tax.recheck(reviewKey(ID)),false);await assert.rejects(h.tax.retryBatch(result.id));assert.equal(h.c.LMPerf.snapshot().active,1);
 pause.resolve();await drain();assert.equal(h.tax.snapshot().nativeWrites,0);assert.equal(h.writes.length,1);assert.equal(h.published.length,0);assert.equal(h.tax.ledger(result.id).rows[0].state,'unknown');assert.equal(await h.finish(h.tax.recheck(reviewKey(ID))),true);assert.equal(h.writes.length,1);
}
for(const returned of [false,true]){
 const rows=rowsFor(201),h=await ready({rows});h.hooks.batch=(config,apply)=>{apply();if(returned)return {code:2955,message:'Minute API limit reached'};throw rawThrottle;};
 const result=await h.finish(h.tax.batch(REPORT,intents(rows)));assert.equal(result.rows.slice(0,200).every(value=>value.state==='unknown'),true);assert.equal(result.rows[200].state,'not-sent');await h.advance(122000);assert.equal(h.writes.length,1);assert.equal(await h.finish(h.tax.recheck(reviewKey(ID))),true);assert.equal(h.writes.length,1);
}

// Missing/foreign/duplicate records and changed counts after an acknowledgement
// cannot mark any destination saved. A held read deadline never publishes late.
for(const fault of ['missing','foreign','duplicate','count','denied','actor']){
 const rows=rowsFor(2),h=await ready({rows});let counts=0;
 h.hooks.count=config=>exact(config)&&fault==='count'?{code:3000,result:{records_count:String(++counts===1?2:3)}}:undefined;
 h.hooks.records=config=>{if(!exact(config))return;if(fault==='missing')return{code:3000,data:[clone(h.storage[REPORT][0])]};if(fault==='foreign')return{code:3000,data:[clone(h.storage[REPORT][0]),row('999')]};if(fault==='duplicate')return{code:3000,data:[clone(h.storage[REPORT][0]),clone(h.storage[REPORT][0])]};if(fault==='denied')return{code:2898,message:'No read permission'};if(fault==='actor')h.runtime.user='another-user';};
 const result=await h.finish(h.tax.batch(REPORT,intents(rows)));assert.deepEqual(states(result),['unknown','unknown'],fault);assert.equal(h.writes.length,1);assert.equal(h.published.length,0);await assert.rejects(h.tax.retryBatch(result.id));
}
{
 const rows=rowsFor(2),h=await ready({rows}),pause=held();h.hooks.records=config=>exact(config)?pause.promise:undefined;
 const saving=h.tax.batch(REPORT,intents(rows));await drain();await h.advance(30000);const result=await saving;assert.deepEqual(states(result),['unknown','unknown']);assert.equal(h.tax.snapshot().verificationReads,1);assert.equal(h.tax.closeProgress(result.id),false);assert.equal(await h.tax.recheck(reviewKey(ID)),false);
 pause.resolve({code:3000,data:clone(h.storage[REPORT])});await drain();assert.equal(h.published.length,0);assert.equal(h.tax.snapshot().verificationReads,0);assert.equal(h.writes.length,1);h.hooks.records=null;assert.equal(await h.finish(h.tax.recheck(reviewKey(ID))),true);assert.equal(h.writes.length,1);
}

// Native acknowledgement is not downgraded for valid workflow field changes;
// explicitly reconciling an unknown reply retains exact captured-value checks.
{
 const h=await ready();h.hooks.batch=()=>({code:3000});const result=await h.finish(h.tax.batch(REPORT,intents([row(ID)])));assert.equal(result.rows[0].state,'unknown');assert.equal(await h.finish(h.tax.recheck(reviewKey(ID))),false);assert.equal(h.writes.length,1);h.storage[REPORT][0][FIELD]='';assert.equal(await h.finish(h.tax.recheck(reviewKey(ID))),true);assert.equal(h.writes.length,1);
}
console.log('PASS native Tax batches:135 one write/7calls,800 four200-ID writes/22calls; exact selections and returned rows, distinct copy payloads/shared45budget, default workflows, native per-ID receipts, malformed/partial/unknown retention, no replay, physical pending deadlines and read-only recovery.');
