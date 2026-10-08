// Captured updates and read-only recovery against an inert native Creator fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const SID='90071992547409931',ids=Array.from({length:6},(_,i)=>'900719925474199'+String(i));
function fixture(extra={}){
  let actor='fixture',generation=1,reads=0,writes=0;
  const rows=ids.map((ID,i)=>({ID,Subdivision:{ID:SID},Archived:false,Lot_Number:String(i+1),Lot_Code:'RS01-B01-L0'+(i+1),Base_Price:'80000.25',Earnest_Money:'8000',Appraised_Value:'80000',Additional_Tax:'0',Lot_Size:45,On_Hold:false,Address:'',Notes:''}));
  const context={setTimeout,clearTimeout,console,ZOHO:{CREATOR:{DATA:{updateRecordById:async config=>{writes++;if(extra.send)return extra.send(config,rows);const row=rows.find(row=>row.ID===config.id);Object.assign(row,config.payload.data);return {code:3000,data:{ID:config.id}};}}}},LMData:{request:(_task,fn)=>extra.queue?extra.queue(fn):Promise.resolve().then(fn)}};
  vm.createContext(context);for(const file of ['takedown-model.js','manage-lots-controller.js','lot-edit-controller.js'])vm.runInContext(fs.readFileSync('widgets/manage-lots/src/app/'+file,'utf8'),context);
  const published=[];
  const editor=context.LMLotEdit.create({report:'All_Lots_All_Fields',allowedBuilder:id=>id==='90071992547409961',validateBuilder:extra.validateBuilder||async function(){},context:()=>actor,generation:()=>generation,ready:()=>true,timeoutMs:extra.timeoutMs||50,read:async selected=>{reads++;if(extra.read)return extra.read(selected,rows,reads);return JSON.parse(JSON.stringify(rows.filter(row=>selected.includes(row.ID))));},publish:row=>published.push(row)});
  return {editor,rows,api:context.LMLotEdit,published,writes:()=>writes,reads:()=>reads,setActor:value=>actor=value,setGeneration:value=>generation=value};
}
{
  const f=fixture({send(config,rows){const row=rows.find(row=>row.ID===config.id);Object.assign(row,config.payload.data,{Notes:'Creator formatted this note'});return {code:3000,data:{ID:config.id}};}});
  const run=await f.editor.commit(f.editor.capture(f.rows.slice(0,2),{Notes:'Entered note'}));assert.equal(run.stage,'verified');assert.equal(f.writes(),2);assert.equal(f.editor.blocked(),false);assert.equal(f.published[0].Notes,'Creator formatted this note');
}
{
  const f=fixture(),op=f.editor.capture(f.rows.slice(0,4),{Base_Price:'12500109.92',On_Hold:true,Notes:'<safe>'});
  assert.equal(Object.isFrozen(op.entries[0].payload),true);
  f.rows[0].Notes='';const run=await f.editor.commit(op);
  assert.equal(run.stage,'verified');assert.equal(f.writes(),4);assert.equal(f.published.length,4);
  assert.deepEqual(Array.from(run.rows,row=>row.id),ids.slice(0,4));assert.ok(run.rows.every(row=>row.state==='verified'));
  assert.equal(f.rows[0].Base_Price,12500109.92);assert.equal(f.rows[0].On_Hold,true);assert.equal(f.rows[0].Notes,'<safe>');
  assert.equal(f.api.payload({Base_Price:'9007199254740993.25'}).Base_Price,'9007199254740993.25');
  assert.equal(f.api.matches({Base_Price:'9007199254740992'}, {Base_Price:'9007199254740993'}),false);
  assert.throws(()=>f.api.payload({Status:'Sold'}),/not editable/);assert.throws(()=>f.api.payload({Lot_Size:'45.5'}),/whole number/);assert.throws(()=>f.api.payload({}),/at least one/);
  assert.throws(()=>f.editor.capture([{...f.rows[0],Archived:true}],{Notes:'x'}),/archived/);
  const missing={...f.rows[0]};delete missing.Base_Price;assert.throws(()=>f.editor.capture([missing],{Base_Price:'1'}),/incomplete/);
  assert.throws(()=>f.editor.capture([f.rows[0],f.rows[0]],{Notes:'x'}),/duplicated/);
}
{
  const f=fixture(),op=f.editor.capture(f.rows,{Base_Price:'90000'});f.rows[5].Base_Price='80000.26';
  const run=await f.editor.commit(op);assert.equal(f.writes(),0);assert.match(run.error,/changed/);assert.ok(run.rows.every(row=>row.state==='not-sent'));
}
{
  const f=fixture(),op=f.editor.capture([f.rows[0]],{Base_Price:'80000.25'}),run=await f.editor.commit(op);assert.equal(run.stage,'verified');assert.equal(f.writes(),0);assert.equal(run.rows[0].message,'Already matches');
}
{
  const f=fixture({read(selected,rows,count){if(count>1)throw Error('Read unavailable');return structuredClone(rows.filter(row=>selected.includes(row.ID)));}}),op=f.editor.capture([f.rows[0]],{Base_Price:'90000'}),run=await f.editor.commit(op);
  assert.equal(run.rows[0].state,'unknown');assert.equal(f.editor.blocked(),true);assert.equal(f.writes(),1);
  assert.throws(()=>f.editor.capture([f.rows[0]],{Base_Price:'95000'}),/previous/);await f.editor.recheck();assert.equal(f.writes(),1,'recheck never repeats a write');
}
{
  let fail=true;
  const f=fixture({read(selected,rows,count){if(count>1&&fail)throw Error('Lost read response');return structuredClone(rows.filter(row=>selected.includes(row.ID)));}});
  const run=await f.editor.commit(f.editor.capture([f.rows[0]],{Notes:'new note'}));assert.equal(run.stage,'review');fail=false;await f.editor.recheck();assert.equal(run.rows[0].state,'verified');assert.equal(f.writes(),1);assert.equal(f.editor.blocked(),false);
}
{
  const f=fixture({send(){throw {code:2898,message:'Permission denied'};}}),run=await f.editor.commit(f.editor.capture(f.rows,{Notes:'new'}));
  assert.equal(run.stage,'review');assert.ok(run.rows.some(row=>row.state==='rejected'));assert.ok(run.rows.some(row=>row.state==='not-sent'));assert.equal(f.editor.blocked(),false);
}
{
  const f=fixture({send(config,rows){Object.assign(rows[0],config.payload.data);return {code:3000,data:{ID:ids[1]}};}}),run=await f.editor.commit(f.editor.capture([f.rows[0]],{Notes:'new'}));assert.equal(run.rows[0].state,'unknown');assert.equal(f.published.length,0);await f.editor.recheck();assert.equal(run.rows[0].state,'verified');assert.equal(f.writes(),1);
}
{
  const f=fixture(),op=f.editor.capture([f.rows[0]],{Notes:'new'});f.setActor('different');await assert.rejects(f.editor.commit(op),/session changed/);assert.equal(f.writes(),0);
}
{
  let queued;
  const f=fixture({timeoutMs:10,queue:fn=>new Promise((resolve,reject)=>{queued=()=>Promise.resolve().then(fn).then(resolve,reject);})});
  const run=await f.editor.commit(f.editor.capture([f.rows[0]],{Notes:'new'}));assert.equal(run.rows[0].state,'not-sent');await queued();assert.equal(f.writes(),0,'an expired queued update cannot send after the result');
}
{
  let settle;
  const f=fixture({timeoutMs:10,send:config=>new Promise(resolve=>{settle=()=>resolve({code:3000,data:{ID:config.id}});})});
  const run=await f.editor.commit(f.editor.capture([f.rows[0]],{Notes:'new'}));assert.equal(run.rows[0].state,'unknown');assert.equal(f.editor.pending(),true);assert.equal(await f.editor.recheck(),false);settle();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(f.editor.pending(),false);assert.equal(f.writes(),1);
}
console.log('PASS: exact decimals/string IDs, field allowlist, all-or-none stale preflight, no-op, scoped readback, partial denial, unknown/wrong-ID response, read-only recovery, session guard and queued/native timeout safety.');
{
  const f=fixture();f.rows[0].Builder1={};const op=f.editor.capture([f.rows[0]],{Builder1:'90071992547409961'});assert.equal((await f.editor.commit(op)).stage,'verified');assert.equal(f.rows[0].Builder1,'90071992547409961');
  assert.equal(f.api.matches({Builder1:{ID:'90071992547409961',display_value:'Builder'}},{Builder1:'90071992547409961'}),true);
  assert.throws(()=>f.editor.capture([f.rows[0]],{Builder1:'90071992547409962'}),/Type Builder/);assert.throws(()=>f.api.payload({Builder1:90071992547409961}),/unreadable/);
  assert.equal((await f.editor.commit(f.editor.capture([f.rows[0]],{Builder1:''}))).stage,'verified');assert.equal(f.rows[0].Builder1,null);
  const stale=fixture({validateBuilder:async()=>{throw Error('No longer Type Builder');}});stale.rows[0].Builder1={};assert.equal((await stale.editor.commit(stale.editor.capture([stale.rows[0]],{Builder1:'90071992547409961'}))).stage,'review');assert.equal(stale.writes(),0);
  console.log('PASS: single Builder lookup, exact string IDs, lookup readback, clear, Builder-only choices and fresh Type preflight.');
}
