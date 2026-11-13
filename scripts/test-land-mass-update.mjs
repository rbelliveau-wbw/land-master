import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app='widgets/land-master/src/app/',source=fs.readFileSync(app+'widget.html','utf8');
function actual(name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0);return source.slice(start,source.indexOf('\nfunction ',start));}
const clone=value=>JSON.parse(JSON.stringify(value));
function harness(count=100,linked=false){
 const c=vm.createContext({});c.window=c;
 for(const file of ['property-lots.js','property-subtypes.js','mass-update.js'])vm.runInContext(fs.readFileSync(app+file,'utf8'),c);
 Object.assign(c,{LMData:{responseFailed:r=>!!r.error||r.success===false||r.code!=null&&String(r.code)!=='3000',failureCode:r=>r?.code}});
 for(const name of ['responseBad','isSuccess','requireMutationSuccess'])vm.runInContext(actual(name),c);
 const rows=Array.from({length:count},(_,i)=>({ID:String(90071992547409940n+BigInt(i)),Land_Type:'Residential',Subtype:'L&B Res',Company1:{ID:'123',zc_display_value:'Old Company'},...(linked?{Lots:{ID:String(1000+i)},Subdivisions:[{ID:'2000'}],Projects:[{ID:'3000'}]}:{})}));
 const calls=[],published=[],progress=[],refreshes=[];let epoch='session:1',hold=null;
 const api={updateRecords:async config=>{calls.push(config);if(hold)return hold(config);return {code:3000,result:ids(config).map(id=>({code:3000,data:{ID:id}}))};}};
 const ctx={scope:()=>epoch,ready:()=>true,demo:()=>false,api:()=>api,request:async(task,run)=>run(),record:(type,id)=>rows.find(row=>row.ID===id),prepare:c.LMPropertySubtypes.prepare,failed:c.LMData.responseFailed,accept:c.requireMutationSuccess,
  read:async(report,criteria,check)=>{refreshes.push({report,criteria});const selected=[...criteria.matchAll(/ID == (\d+)/g)].map(m=>m[1]);assert.ok(selected.length<=25);if(report==='All_Lots_All_Fields')return selected.map(ID=>({ID,Subdivision:{ID:'2000'}}));if(report==='All_Subdivisions')return selected.map(ID=>({ID,Project:{ID:'3000'}}));return rows.filter(row=>selected.includes(row.ID));},
  saved:(type,id,payload)=>published.push({id,payload:clone(payload)}),refreshed:()=>{},progress:ledger=>progress.push(clone(ledger))};
 const controller=c.LMMassUpdate.create(ctx),input={type:'property',report:'All_Property',ids:rows.map(row=>row.ID),payload:{Company1:'456'}};
 return {c,rows,calls,published,progress,refreshes,ctx,input,controller,hook:fn=>hold=fn,scope:()=>epoch='session:2'};
}
function ids(config){return [...config.payload.criteria.matchAll(/ID == (\d+)/g)].map(m=>m[1]);}
for(const count of [1,100,200,201,450]){
 const h=harness(count),result=await h.controller.run(h.input);
 assert.equal(h.calls.length,Math.ceil(count/200));assert.equal(h.published.length,count);assert.ok(result.entries.every(row=>row.state==='saved'));
 assert.deepEqual(h.calls.flatMap(ids),h.input.ids);assert.ok(h.calls.every(call=>!Object.hasOwn(call.payload,'skip_workflow')&&!Object.hasOwn(call.payload,'process_until_limit')));
 assert.ok(h.calls.every(call=>call.report_name==='All_Property'&&call.payload.data.Company1==='456'));
 assert.equal(h.refreshes.length,Math.ceil(count/25));
}
{
 const h=harness(100,true),result=await h.controller.run(h.input);assert.equal(h.calls.length,1);assert.equal(h.published.length,100);assert.equal(h.refreshes.length,9,'four Lot reads, one shared Subdivision read, four display reads');assert.ok(result.finished);
}
{
 const h=harness(3);h.input.ids=[h.rows[0].ID,h.rows[2].ID];await h.controller.run(h.input);assert.deepEqual(ids(h.calls[0]),h.input.ids,'selection never broadens to the report or filter');
}
{
 const h=harness(2,true);h.rows[1].Projects=[];const result=await h.controller.run(h.input);assert.equal(h.calls.length,0);assert.match(result.error,/Projects/);assert.ok(result.entries.every(row=>row.state==='not-sent'));
}
{
 const h=harness(2);h.input.payload={Subtype:'Farm'};const result=await h.controller.run(h.input);assert.equal(h.calls.length,0);assert.match(result.error,/Subtype/);
}
{
 const h=harness(2);h.rows[1].Subtype='';h.input.payload={Land_Type:'Commercial'};await h.controller.run(h.input);assert.equal(h.calls.length,2,'different prepared payloads never merge');assert.equal(h.calls[0].payload.data.Subtype,'');assert.ok(!Object.hasOwn(h.calls[1].payload.data,'Subtype'));
}
for(const malformed of ['missing','duplicate','foreign','numeric','outer-error','nested-error','transport']){
 const h=harness(201);h.hook(config=>{const result=ids(config).map(ID=>({code:3000,data:{ID}}));if(malformed==='transport')throw new Error('Network reply lost');if(malformed==='missing')result.pop();if(malformed==='duplicate')result[1]=result[0];if(malformed==='foreign')result[0].data.ID='999';if(malformed==='numeric')result[0].data.ID=Number(result[0].data.ID);if(malformed==='nested-error')result[0].data.error='Validation failed';return {code:malformed==='outer-error'?3001:3000,result};});
 const result=await h.controller.run(h.input);assert.equal(h.calls.length,1);assert.ok(result.entries.some(row=>row.state==='unknown'));assert.equal(result.entries.at(-1).state,'not-sent');await assert.rejects(h.controller.run(h.input),/earlier update needs review/);assert.equal(h.calls.length,1,'unknown replies never replay');
}
{
 const h=harness(2);h.hook(config=>({code:3000,result:ids(config).map((ID,i)=>({code:i?2897:3000,data:{ID},message:i?'Native validation rejected':''}))}));const result=await h.controller.run(h.input);assert.deepEqual(Array.from(result.entries,e=>e.state),['saved','rejected']);assert.equal(h.published.length,1);h.hook(null);h.input.ids=[h.rows[1].ID];assert.equal((await h.controller.run(h.input)).entries[0].state,'saved','only confirmed rejections can be deliberately sent again');
}
{
 const h=harness(3);h.hook(config=>({code:3000,result:ids(config).reverse().map(ID=>({code:3000,data:{ID}}))}));const result=await h.controller.run(h.input);assert.ok(result.entries.every(row=>row.state==='saved'),'native results match by exact IDs, independent of order');
}
{
 const h=harness(2);h.ctx.read=async()=>{throw new Error('Refresh unavailable');};const result=await h.controller.run(h.input);assert.ok(result.entries.every(row=>row.state==='saved'));assert.match(result.refreshError,/unavailable/);
}
{
 const h=harness(201);h.hook(config=>{h.scope();return {code:3000,result:ids(config).map(ID=>({code:3000,data:{ID}}))};});const result=await h.controller.run(h.input);assert.equal(h.calls.length,1);assert.equal(result.entries[0].state,'unknown');assert.equal(result.entries.at(-1).state,'not-sent');
}
{
 const h=harness(100);let resolve;h.hook(config=>new Promise(done=>resolve=()=>done({code:3000,result:ids(config).map(ID=>({code:3000,data:{ID}}))})));const saving=h.controller.run(h.input);await Promise.resolve();await assert.rejects(h.controller.run(h.input),/already running/);h.input.payload.Company1='changed';resolve();await saving;assert.equal(h.calls[0].payload.data.Company1,'456','the sent payload is captured before async work');
}
assert.match(source,/MassUpdate\.run\(input\)/);assert.doesNotMatch(source.slice(source.indexOf('function applyBulk(){'),source.indexOf('/* Property transfer history')),/updateRecord\(|setTimeout\(closeBulkModal/);
console.log('Land mass update: native batches, exact selection, relationship guards, native envelopes, partial/unknown no-replay, session and duplicate locks passed.');
