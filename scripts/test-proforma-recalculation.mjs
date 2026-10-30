import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';
import {saveFixture} from './fixtures/proforma-sdk-v2-save-fixture.mjs';
import {held,drain,clone,ID} from './fixtures/proforma-sdk-v2-harness.mjs';

const dir='creator/workflows/proforma-recalculation/';
const before=fs.readFileSync(dir+'Calc_IRR_XIRR_Pro_Forma.before.dg','utf8');
const after=fs.readFileSync(dir+'Calc_IRR_XIRR_Pro_Forma.dg','utf8');
function calculate(source,rows,input={ID,Total_Expenses:500,Net_Profit:200,IRR:12,XIRR:13}){
  const translated=translate('void calculate()\n{\n'+source+'\n}').js.replace(/^\s*info [^\n]*;\s*$/gm,'');
  const c=vm.createContext({rows:clone(rows),input:clone(input)});
  vm.runInContext(`
    var queries=0,Cash_Flow='Cash_Flow',thisapp={forLoop:(a,b)=>Array.from({length:Math.max(0,b-a+1)},(_,i)=>a+i)};
    function ifnull(v,f){return v==null?f:v;}
    function List(){return [];}
    function Map(){return {put(k,v){this[k]=v;},get(k){return this[k]??null;}};}
    Array.prototype.add=function(v){this.push(v);};
    Array.prototype.count=Array.prototype.size=function(){return this.length;};
    Array.prototype.distinct=function(){return [...new Set(this)];};
    Number.prototype.toLong=function(){return Math.trunc(this);};
    function query(form,predicate){
      assertForm(form);queries++;
      const selected=Array.from(rows).filter(predicate);
      selected.sum=key=>selected.reduce((sum,row)=>sum+(row[key]??0),0);
      return new Proxy(selected,{get(a,k){if(k in a||typeof k==='symbol')return a[k];return {getAll:()=>a.map(r=>r[k])};}});
    }
    function assertForm(form){if(form!=='Proforma_Months')throw Error('Unexpected form '+form);}
  `+translated,c);
  vm.runInContext('calculate()',c);
  return {input:clone(c.input),rows:clone(c.rows),queries:c.queries};
}
const row=(month,cash,parent=ID)=>({Proforma:parent,Month1:month,Cash_Flow:cash});
const schedules=[
  [], [row(1,0)], [row(1,null),row(1,-500),row(2,600),row(2,100)],
  [row(1,-500),row(3,700),row(1,999999,'other')],
  Array.from({length:106},(_,i)=>row(i+1,i===0?-1000000:i<12?-10000:25000)),
  Array.from({length:600},(_,i)=>[row(i+1,i===0?-1000000:10000),row(i+1,i%3?-250:500)]).flat()
];
for(const rows of schedules){
  const old=calculate(before,rows),next=calculate(after,rows);
  for(const key of ['ROI1','IRR','XIRR'])
    assert.ok(Object.is(old.input[key],next.input[key])||Math.abs(old.input[key]-next.input[key])<1e-9,
      key+' must retain the existing result for '+rows.length+' phase/month rows');
  assert.deepEqual(next.rows,rows,'the return calculation must not change month rows');
  assert.equal(next.queries,1,'returns read only the selected Pro Forma month collection once');
  if(rows.length>1)assert.ok(old.queries>next.queries);
}
assert.equal(calculate(before,schedules[4]).queries,108);
assert.equal(calculate(after,schedules[4]).queries,1);
console.log('PASS Creator return calculation: unchanged ROI/IRR/XIRR; 108 queries -> 1 for 106 months.');

// Exercise the actual Save pipeline and transport, not a separate timeout helper.
for(const expire of [false,true]){
  const gate=held();let engine=false,settled=false;
  const h=await saveFixture({directRecord:true,update:async(config,apply)=>{
    if(config.report_name==='All_Pro_Formas_All_Fields'&&config.payload.data.Name){engine=true;await gate.promise;}
    apply();return {code:3000,data:{ID:config.id}};
  }});
  const save=h.widget.saveProforma().then(()=>{settled=true;});await drain();
  assert.equal(engine,true);
  assert.equal(settled,false);
  assert.ok([...h.timers.values()].some(t=>t.ms===180000),'the engine gets a bounded three-minute native deadline');
  assert.ok(![...h.timers.values()].some(t=>t.ms===30000),'the active recalculation does not fail at the ordinary write deadline');
  assert.equal(h.widget.saveProforma(),false,'a pending recalculation cannot send another Save');
  if(expire){
    h.tick(180000);await save;
    assert.equal(h.widget.S.ed.dirty,true);
    assert.ok(h.widget.PFTransport.snapshot().reviews.length);
    const writes=h.writes.length;
    assert.equal(h.widget.saveProforma(),false);
    gate.resolve();await drain();
    assert.equal(h.writes.length,writes,'a late reply must never replay the recalculation');
    assert.equal(h.widget.S.ed.dirty,true,'a late reply cannot turn the timed-out save into success');
  }else{
    gate.resolve();await save;
    assert.equal(h.widget.S.ed.dirty,false);
    assert.equal(h.widget.PFTransport.snapshot().reviews.length,0);
  }
}
console.log('PASS recalculation-specific deadline, pending-save lock, unknown-outcome retention and late-reply no-replay.');
