import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {extract} from './fixtures/tax-source.mjs';
import {harness as taxHarness} from './fixtures/tax-effective-harness.mjs';

const shared=fs.readFileSync('shared/success-feedback.js','utf8');
function install(c={}){
  let now=0,sequence=0;const timers=new Map(),children=[];
  const element=()=>({hidden:false,attrs:{},textContent:'',setAttribute(k,v){this.attrs[k]=v;},appendChild(el){children.push(el);},querySelector(){return this.span||(this.span={textContent:''});}});
  c.document={...(c.document||{}),head:element(),body:element(),createElement:element};
  c.setTimeout=(fn,ms)=>{const id=++sequence;timers.set(id,{fn,due:now+ms});return id;};c.clearTimeout=id=>timers.delete(id);
  c.window=c;const context=vm.isContext(c)?c:vm.createContext(c);vm.runInContext(shared,context);
  return {c:context,advance(ms){const end=now+ms;while(true){const next=[...timers].filter(([,t])=>t.due<=end).sort((a,b)=>a[1].due-b[1].due)[0];if(!next)break;now=next[1].due;timers.delete(next[0]);next[1].fn();}now=end;},toast:()=>children.find(el=>el.id==='lmSuccessToast'),text(){return this.toast()?.querySelector('span').textContent;}};
}
{
  const h=install(),api=h.c.LMSuccess,focus={},scroll=145;h.c.document.activeElement=focus;h.c.scrollY=scroll;
  api.show('<img src=x onerror=alert(1)>');assert.equal(h.text(),'<img src=x onerror=alert(1)>');
  assert.equal(h.toast().attrs.role,'status');assert.equal(h.toast().attrs['aria-live'],'polite');
  assert.equal(h.c.document.activeElement,focus);assert.equal(h.c.scrollY,scroll);
  h.advance(2000);api.show('New success');h.advance(1500);assert.equal(h.toast().hidden,false,'older dismissal cannot hide newer success');h.advance(2000);assert.equal(h.toast().hidden,true);
  api.inline('one','Budget item saved.','budget changes');api.inline('two','Budget changes saved.','budget changes');api.inline('one','Budget item saved.','budget changes');
  h.advance(649);assert.equal(h.toast().hidden,true);h.advance(1);assert.equal(h.text(),'2 budget changes saved.');
  let current=true;api.inline('guard','Stale success','changes',()=>current);current=false;h.advance(650);assert.notEqual(h.text(),'Stale success');
  const revision=api.begin('field');api.inline('field','Old success','changes',null,revision);api.begin('field');h.advance(650);assert.equal(h.toast().hidden,true);
  api.inline('error','Should not display','changes');api.clear();h.advance(650);assert.equal(h.toast().hidden,true);
}
const budget=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8');
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
async function drain(){for(let i=0;i<10;i++)await Promise.resolve();}
{
  const marks=[],writes=[],gate=deferred(),S={saveTimers:{}};
  const h=install({S,setEdAutosave(){},markInputState:(el,state)=>marks.push(state),CFG:{forms:{budget:'Budget'}},sdkUpdateRecord(...args){writes.push(args);return gate.promise;},auditLog(){},setMsg(){}});
  vm.runInContext(extract(budget,'queueBudgetSave'),h.c);
  h.c.queueBudgetSave('90071992547409941','Contingency','100',{});h.advance(600);
  assert.equal(writes.length,1);assert.equal(h.toast(),undefined,'pending writes cannot claim success');gate.resolve();await drain();
  assert.ok(marks.includes('saved-ok'),'existing inline green verification stays');h.advance(650);assert.equal(h.text(),'Budget changes saved.');assert.equal(writes.length,1,'feedback performs no extra write');
}
{
  const first=deferred(),second=deferred();let count=0;
  const h=install({S:{saveTimers:{}},setEdAutosave(){},markInputState(){},CFG:{forms:{budget:'Budget'}},sdkUpdateRecord(){return ++count===1?first.promise:second.promise;},auditLog(){},setMsg(){h.c.LMSuccess.clear();}});
  vm.runInContext(extract(budget,'queueBudgetSave'),h.c);
  h.c.queueBudgetSave('41','Contingency','100',{});h.advance(600);h.c.queueBudgetSave('41','Contingency','200',{});first.resolve();await drain();h.advance(650);
  assert.equal(h.toast(),undefined,'older verified response cannot confirm a newer pending edit');second.reject(Error('Denied'));await drain();h.advance(650);assert.equal(h.toast(),undefined,'failed saves cannot show success');
}
for(const name of ['inlineSave','savePropInline']){
  const fixture=taxHarness([name]),c=fixture.context;c.Tax={canEdit:()=>true,currencyText:String};
  const h=install(c),row={id:'90071992547409941'};c.state.data[name==='inlineSave'?'parcelYears':'rawLand'].push(row);
  await c[name](row.id,{[name==='inlineSave'?'Status':'Common_Name']:'Fixture'});assert.equal(fixture.writes.length,1);
  assert.ok(fixture.marks.some(mark=>mark.value==='saved-ok'),'Tax inline green checks remain');h.advance(650);assert.match(h.text(),name==='inlineSave'?/Parcel-year changes saved/:/Property changes saved/);
  c.updateRecord=async()=>{throw Error('Denied');};await assert.rejects(c[name](row.id,{Status:'Changed'}));c.LMSuccess.clear();h.advance(650);assert.equal(h.toast().hidden,true);
}
for(const widget of JSON.parse(fs.readFileSync('manifests/widgets.json','utf8')).widgets){
  const dir='widgets/'+widget.slug+'/src/app/';assert.equal(fs.readFileSync(dir+'success-feedback.js','utf8'),shared);
  assert.match(fs.readFileSync(dir+'widget.html','utf8'),/src="success-feedback\.js\?v=/);
}
console.log('Success feedback: safe text, accessible nonblocking status, timers, grouping, stale revisions, actual Budget/Tax save callbacks and preserved inline checks passed.');
