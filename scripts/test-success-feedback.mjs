import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {extract} from './fixtures/tax-source.mjs';
import {harness as taxHarness} from './fixtures/tax-effective-harness.mjs';

const shared=fs.readFileSync('shared/success-feedback.js','utf8');
function install(c={},options={}){
  let now=0,sequence=0;const timers=new Map(),elements=[],popoverCalls=[];
  const element=(tag='div')=>{
    const el={tagName:String(tag).toUpperCase(),hidden:false,attrs:{},textContent:'',children:[],parentNode:null,
      setAttribute(k,v){this.attrs[k]=String(v);},getAttribute(k){return this.attrs[k]??null;},removeAttribute(k){delete this.attrs[k];},hasAttribute(k){return k in this.attrs;},
      appendChild(child){child.remove();this.children.push(child);child.parentNode=this;return child;},
      remove(){if(this.parentNode){const siblings=this.parentNode.children;siblings.splice(siblings.indexOf(this),1);this.parentNode=null;}},
      querySelector(selector){assert.equal(selector,'span');return this.span||(this.span={textContent:''});},
      contains(child){return child===this||this.children.some(item=>item.contains(child));},
      focus(){c.document.activeElement=this;},scrollIntoView(){c.scrollY=-1;},
      get isConnected(){return c.document.head.contains(this)||c.document.body.contains(this);}
    };
    if(options.popover){
      el.showPopover=function(){popoverCalls.push({kind:'show',node:this});if(options.throwShow)throw Error('Popover unavailable in this host');assert.equal(this.getAttribute('popover'),'manual');assert.equal(this.hidden,false);assert.equal(this.isConnected,true);this.popoverOpen=true;};
      if(!options.missingHide)el.hidePopover=function(){popoverCalls.push({kind:'hide',node:this});if(options.throwHide)throw Error('Popover already closed');this.popoverOpen=false;};
    }
    elements.push(el);return el;
  };
  c.document={...(c.document||{}),head:element('head'),body:element('body'),createElement:element,
    querySelectorAll(selector){assert.equal(selector,'dialog:modal');if(options.throwModalQuery)throw Error('Unsupported :modal');return elements.filter(el=>el.tagName==='DIALOG'&&el.modal&&el.isConnected);}
  };
  c.setTimeout=(fn,ms)=>{const id=++sequence;timers.set(id,{fn,due:now+ms});return id;};c.clearTimeout=id=>timers.delete(id);
  c.window=c;const context=vm.isContext(c)?c:vm.createContext(c);vm.runInContext(shared,context);
  return {c:context,popoverCalls,openDialog(){const el=element('dialog');el.modal=true;c.document.body.appendChild(el);return el;},style:()=>elements.find(el=>el.tagName==='STYLE')?.textContent,
    advance(ms){const end=now+ms;while(true){const next=[...timers].filter(([,t])=>t.due<=end).sort((a,b)=>a[1].due-b[1].due)[0];if(!next)break;now=next[1].due;timers.delete(next[0]);next[1].fn();}now=end;},toast:()=>elements.find(el=>el.id==='lmSuccessToast'),text(){return this.toast()?.querySelector('span').textContent;}};
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
// Exercise the same helper in native-top-layer and legacy hosts. The toast must
// remain a noninteractive live region in the active modal's accessible subtree.
for(const popover of [false,true]){
  const h=install({}, {popover}),api=h.c.LMSuccess,focus={},scroll=471;
  h.c.document.activeElement=focus;h.c.scrollY=scroll;
  api.show('Comment added.');const toast=h.toast();
  assert.equal(toast.parentNode,h.c.document.body);
  assert.equal(toast.getAttribute('popover'),popover?'manual':null);
  assert.equal(Boolean(toast.popoverOpen),popover);
  assert.equal(toast.hasAttribute('tabindex'),false);assert.equal(toast.hasAttribute('autofocus'),false);
  assert.doesNotMatch(toast.innerHTML,/<(?:button|a|input|select|textarea)\b|\b(?:tabindex|autofocus)\s*=/i);
  assert.match(h.style(),/z-index:2147483647(?:;|})/,'legacy fallback exceeds the existing modal overlay layers');
  assert.match(h.style(),/pointer-events:none/);
  const backdrop=h.style().match(/#lmSuccessToast::backdrop\{([^}]+)\}/)?.[1]||'';
  assert.match(backdrop,/background:transparent/);assert.match(backdrop,/pointer-events:none/);
  const lower=h.openDialog(),active=h.openDialog();
  api.show('Comment updated.');
  assert.equal(h.toast(),toast,'reuse the existing live region');
  assert.equal(toast.parentNode,active,'host in the last active native dialog so it is not inert');
  assert.equal(Boolean(toast.popoverOpen),popover);
  active.modal=false;active.remove();assert.equal(toast.isConnected,false);
  api.show('Comment deleted.');assert.equal(toast.parentNode,lower,'a detached dialog cannot retain the next status');
  lower.modal=false;lower.remove();api.show('Audit log copied.');
  assert.equal(toast.parentNode,h.c.document.body,'rehost in body after all native dialogs close');
  assert.equal(toast.isConnected,true);assert.equal(h.c.document.activeElement,focus);assert.equal(h.c.scrollY,scroll);
  h.advance(3500);assert.equal(toast.hidden,true);assert.equal(Boolean(toast.popoverOpen),false,'timer must release the top layer');assert.equal(h.text(),'');
  api.show('Saved again.');api.clear();assert.equal(toast.hidden,true);assert.equal(Boolean(toast.popoverOpen),false,'clear must release the top layer');
  if(popover)assert.ok(h.popoverCalls.filter(call=>call.kind==='hide').length>=5);
}
{
  const h=install({}, {popover:true,throwShow:true,throwHide:true}),api=h.c.LMSuccess;
  assert.doesNotThrow(()=>api.show('Comment added.'));
  assert.equal(h.toast().getAttribute('popover'),null,'an unavailable native popover must return to the visible CSS fallback');
  assert.equal(h.toast().hidden,false);assert.equal(h.text(),'Comment added.');
  api.show('Second success.');assert.equal(h.popoverCalls.filter(call=>call.kind==='show').length,1,'do not repeatedly call an unsupported native API');
  assert.doesNotThrow(()=>h.advance(3500));assert.equal(h.toast().hidden,true);
}
{
  const h=install({}, {throwModalQuery:true});
  assert.doesNotThrow(()=>h.c.LMSuccess.show('Saved.'));
  assert.equal(h.toast().parentNode,h.c.document.body,'older selectors still receive CSS feedback');
}
{
  const h=install({}, {popover:true,missingHide:true});h.c.LMSuccess.show('Saved.');
  assert.equal(h.toast().getAttribute('popover'),null,'a partial native API must use the dismissible CSS fallback');
  assert.equal(h.popoverCalls.length,0);h.advance(3500);assert.equal(h.toast().hidden,true);
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
const widgets=JSON.parse(fs.readFileSync('manifests/widgets.json','utf8')).widgets;
assert.equal(widgets.length,10,'every deployed widget receives the shared feedback fix');
for(const widget of widgets){
  const dir='widgets/'+widget.slug+'/src/app/';assert.equal(fs.readFileSync(dir+'success-feedback.js','utf8'),shared);
  const stamp=fs.readFileSync(dir+'widget.html','utf8').match(/src="success-feedback\.js\?v=([^"&]+)"/)?.[1];
  assert.equal(stamp,widget.version,widget.slug+' must invalidate the old feedback asset cache for its current release');
}
console.log('Success feedback: native/legacy modal layering, detached host recovery, timers/top-layer cleanup, unsupported API fallback, safe text, nonblocking focus/scroll, grouping, stale revisions, actual Budget/Tax save callbacks, inline checks and ten-widget asset stamps passed.');
