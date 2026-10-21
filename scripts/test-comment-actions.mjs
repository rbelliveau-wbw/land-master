import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {extract} from './fixtures/tax-source.mjs';

const source=fs.readFileSync('widgets/proforma-manager/src/app/comments.js','utf8');
const now=Date.parse('2026-10-21T18:00:00Z'),parent='4410926000000000001',comment='4410926000000000002';
const drain=async()=>{for(let n=0;n<15;n++)await Promise.resolve();};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
// Evaluate the relevant z-index cascade from the real shared stylesheet and host
// <style> tags in document order. A selector-presence assertion cannot catch a
// later host rule with equal specificity overriding the shared modal layer.
function hostStyles(html,sharedCss){
  html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  return [...html.matchAll(/<link\b[^>]*>|<style\b[^>]*>[\s\S]*?<\/style>/gi)].flatMap(match=>{
    if(/^<style\b/i.test(match[0]))return [match[0].replace(/^<style\b[^>]*>|<\/style>$/gi,'')];
    return /href=["'][^"']*comments\.css(?:[?"'])/i.test(match[0])?[sharedCss]:[];
  });
}
function matchesLayerSelector(selector,node){
  // Layer rules use type, ID, class and descendant selectors. Ignore selectors
  // for unrelated structural/pseudo states rather than pretending to render DOM.
  if(!/^[\w.#*\s-]+$/.test(selector))return false;
  const parts=selector.trim().split(/\s+/);
  function compound(part,candidate){
    if(!candidate)return false;
    const tag=part.match(/^[\w-]+/)?.[0];
    return (!tag||tag.toLowerCase()===candidate.tag)&&[...part.matchAll(/([.#])([\w-]+)/g)].every(([,kind,value])=>kind==='#'?candidate.id===value:candidate.classes.includes(value));
  }
  if(!compound(parts.pop(),node))return false;
  let ancestor=node.parent;
  while(parts.length){const part=parts.pop();while(ancestor&&!compound(part,ancestor))ancestor=ancestor.parent;if(!ancestor)return false;ancestor=ancestor.parent;}
  return true;
}
function effectiveLayer(styles,node){
  let winner=null,order=0;
  for(const css of styles)for(const rule of css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    const declarations=[...rule[2].matchAll(/(?:^|;)\s*z-index\s*:\s*(-?\d+)\s*(!important)?\s*(?=;|$)/gi)];
    if(!declarations.length)continue;
    const value=declarations.at(-1);
    for(const raw of rule[1].split(',')){
      const selector=raw.trim();order++;if(!matchesLayerSelector(selector,node))continue;
      const ids=(selector.match(/#/g)||[]).length,classes=(selector.match(/\./g)||[]).length,tags=selector.split(/\s+/).filter(part=>/^[\w-]+/.test(part)).length;
      const rank=[Number(Boolean(value[2])),ids,classes,tags,order],entry={value:Number(value[1]),selector,rank};
      if(!winner||rank.some((n,i)=>n!==winner.rank[i]&&rank.slice(0,i).every((prior,j)=>prior===winner.rank[j])&&n>winner.rank[i]))winner=entry;
    }
  }
  assert.ok(winner,'a real stylesheet layer must match '+(node.id||node.classes.join('.')));return winner;
}
function fixture({field='Pro_Forma',user='rbelliveau@wbdevelopment.com',age=1000,owner='wbdevelopment',deleted=false,writeGate,confirmGate}={}){
  let actor=user,focus=null,buttons=[],inline=null,loads=0,confirms=0;
  const handlers={},writes=[],status={textContent:'',classList:{toggle(){}}},preview={hidden:true},name={textContent:''},send={dataset:{pc:'send'},disabled:false};
  const box={matches(){return false;},value:'',selectionStart:0,selectionEnd:0,focus(){focus=box;},scrollIntoView(){},setRangeText(value,start,end){this.value=this.value.slice(0,start)+value+this.value.slice(end);this.selectionStart=this.selectionEnd=start+value.length;}};
  const element=()=>({value:'',hidden:false,classList:{toggle(){}},focus(){focus=this;},setSelectionRange(){},scrollIntoView(){},isConnected:true});
  const list={get innerHTML(){return this.html||'';},set innerHTML(value){this.html=value;buttons=[...value.matchAll(/<button[^>]*data-pc="([^"]+)"[^>]*data-id="([^"]+)"[^>]*>/g)].map(match=>Object.assign(element(),{dataset:{pc:match[1],id:match[2]},closest(){return this;}}));const m=value.match(/data-pc-edit-input="([^"]+)"[^>]*>([\s\S]*?)<\/textarea>/);inline=m?Object.assign(element(),{value:m[2],id:m[1]}):null;}};
  const el={innerHTML:'',classList:{contains(){return false;}},addEventListener(type,fn){handlers[type]=fn;},querySelector(selector){return ({'.pc-status':status,'.pc-messages':list,'.pc-compose-name':name,'.pc-input':box,'[data-pc="send"]':send,'.pc-preview':preview,'.pc-emoji':{hidden:true}})[selector]||(selector.startsWith('[data-pc-edit-input=')?inline:null);},querySelectorAll(selector){return buttons.concat(inline&&selector.includes('[data-pc-edit-input]')?[inline]:[]);}};
  class FixedDate extends Date {static now(){return now;}}
  const context={module:{exports:{}},Date:FixedDate,Intl,TextEncoder,setInterval(){return 1;},clearInterval(){},LMSuccess:{show(){},clear(){}}};
  vm.runInNewContext(source,context);const api=context.module.exports.PFComments;
  const row={ID:comment,[field]:{ID:parent},User:owner,Added_User:owner,Added_Time:new Date(now-age).toISOString(),Comment:'Original message',Deleted:deleted};
  const thread=api.mount(el,{parentField:field,currentUser:()=>actor,ownerAliases:()=>api.ownerAliases(user),users:()=>[],error:e=>e.message,load:async()=>{loads++;return [row];},confirm:()=>{confirms++;return confirmGate?confirmGate.promise:Promise.resolve(true);},add:async data=>{writes.push(['add',data]);if(writeGate)await writeGate.promise;},update:async(id,data)=>{writes.push(['update',id,data]);if(writeGate)await writeGate.promise;Object.assign(row,data);}});
  function click(action,forged=false){const button=buttons.find(b=>b.dataset.pc===action)||Object.assign(element(),{dataset:{pc:action,id:comment},closest(){return this;}});assert.ok(forged||buttons.includes(button),'visible '+action+' action required');handlers.click({target:button});return button;}
  return {api,thread,row,box,list,writes,status,click,actions:()=>buttons.map(b=>b.dataset.pc),focus:()=>focus,setActor:value=>{actor=value;},typeDraft(value){box.value=value;handlers.input({target:box});},keyPost(){handlers.keydown({target:box,key:'Enter',ctrlKey:true,preventDefault(){}});},get inline(){return inline;},get loads(){return loads;},get confirms(){return confirms;}};
}

for(const field of ['Pro_Forma','Project','Budget','Contract1']){
  const h=fixture({field});await h.thread.open(parent);assert.deepEqual(h.actions(),['reply','edit','delete'],field+' shares all author actions');
  h.box.value='Retained draft';h.box.selectionStart=h.box.selectionEnd=h.box.value.length;h.click('reply');assert.match(h.box.value,/Retained draft[\s\S]*> wbdevelopment: Original message/);
  h.click('edit');assert.equal(h.inline.value,'Original message');h.inline.value='Edited message';h.click('inline-save');await drain();
  assert.equal(h.writes.length,1);assert.deepEqual(JSON.parse(JSON.stringify(h.writes[0])),['update',comment,{Comment:'Edited message'}]);assert.equal(h.row[field].ID,parent);
  assert.match(h.list.innerHTML,/<svg viewBox="0 0 24 24" aria-hidden="true">/,'shared actions use centered SVG icons');
}
for(const options of [{user:'another-admin@wbdevelopment.com'},{age:86400000},{deleted:true}]){
  const h=fixture(options);await h.thread.open(parent);assert.ok(!h.actions().includes('edit'));h.click('edit',true);assert.equal(h.writes.length,0,'forged Edit does not grant ownership');
}
{
  const h=fixture();assert.deepEqual(Array.from(h.api.ownerAliases(' RBELLIVEAU@WBDEVELOPMENT.COM ')),['wbdevelopment']);
  for(const user of ['another-admin@wbdevelopment.com','rbelliveau@elsewhere.com','rbelliveau'])assert.equal(h.api.ownerAliases(user).length,0,'exact admin alias predicate');
}
{
  const gate=deferred(),h=fixture({confirmGate:gate});await h.thread.open(parent);h.typeDraft('Keep this draft');const trigger=h.click('delete');await drain();
  h.click('delete');assert.equal(h.confirms,1,'duplicate confirmation is blocked');assert.equal(h.writes.length,0);
  gate.resolve(false);await drain();assert.equal(h.focus(),trigger,'Cancel returns to the exact Delete control');assert.equal(h.box.value,'Keep this draft');assert.equal(h.writes.length,0);
}
{
  const gate=deferred(),h=fixture({writeGate:gate});await h.thread.open(parent);h.click('edit');h.inline.value='Pending edit';h.click('inline-save');await drain();assert.equal(h.inline.disabled,true,'inline editor cannot accept unsaved keystrokes while its captured value is saving');
  h.click('delete',true);h.keyPost();assert.equal(h.writes.length,1,'conflicting edit/delete/Post cannot add another write');gate.resolve();await drain();
}
{
  const h=fixture();await h.thread.open(parent);h.click('edit');h.inline.value='Blocked after completion';h.setActor('');h.click('inline-save');h.keyPost();await drain();
  assert.equal(h.writes.length,0,'callable save refuses a now read-only/completed parent even with an author alias');assert.match(h.status.textContent,/read-only/);
  await h.thread.open(parent);assert.ok(!h.actions().includes('edit'),'read-only parent cannot inherit the admin alias');
}
{
  const budget=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8'),legal=fs.readFileSync('widgets/contract-management/src/app/widget.html','utf8'),css=fs.readFileSync('widgets/proforma-manager/src/app/comments.css','utf8');
  for(const slug of ['proforma-manager','budget-manager','contract-management'])assert.match(fs.readFileSync('widgets/'+slug+'/src/app/widget.html','utf8'),/ownerAliases:function\(\)\{return PFComments\.ownerAliases\(S\.currentUser\);\}/);
  assert.match(css,/\.pc-inline-editor textarea\{/);assert.match(css,/\.pc-actions\{opacity:1!important\}/);
  const body={tag:'body',classes:[]},overlays={tag:'div',id:'overlays',classes:[],parent:body};
  const legalConfirm={tag:'div',classes:['modal-back','comment-confirm-back'],parent:overlays};
  const legalDialog={tag:'div',id:'contractCommentModal',classes:['pf-comment-modal','show'],parent:body};
  const legalStyles=hostStyles(legal,css),legalLayer=effectiveLayer(legalStyles,legalConfirm);
  assert.equal(legalLayer.value,10060,'Legal confirmation must beat the later .modal-back host rule');
  assert.ok(legalLayer.value>effectiveLayer(legalStyles,legalDialog).value,'Legal confirmation paints above the comment modal');
  const oldStyles=hostStyles(legal,css.replace(/\.modal-back\.comment-confirm-back/g,'.comment-confirm-back'));
  assert.equal(effectiveLayer(oldStyles,legalConfirm).value,80,'negative control reproduces the previous equal-specificity failure with actual host CSS order');
  for(const [slug,html,confirmId,commentId,classes] of [
    ['Budget',budget,'budgetCommentConfirm','budgetCommentModal',['kill-overlay','show']],
    ['Pro Forma',fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8'),'confirmModal','commentModal',['show','danger']]
  ]){
    const styles=hostStyles(html,css),confirmation={tag:'div',id:confirmId,classes,parent:body},dialog={tag:'div',id:commentId,classes:['pf-comment-modal','show'],parent:body};
    assert.ok(effectiveLayer(styles,confirmation).value>effectiveLayer(styles,dialog).value,slug+' confirmation paints above the comment modal under the actual stylesheet order');
  }
  const nodes={budgetCommentModal:{inert:false},budgetCommentConfirm:{hidden:true,classList:{add(){},remove(){}}},budgetCommentKeep:{focus(){this.focused=true;}}};let answer;
  const c=vm.createContext({$:id=>nodes[id],budgetCommentConfirm:ok=>{answer=ok;},budgetCommentConfirmInert:false});
  vm.runInContext(extract(budget,'openBudgetCommentConfirm')+'\n'+extract(budget,'finishBudgetCommentConfirm'),c);c.openBudgetCommentConfirm();assert.equal(nodes.budgetCommentModal.inert,true);assert.equal(nodes.budgetCommentKeep.focused,true);c.finishBudgetCommentConfirm(false);assert.equal(answer,false);assert.equal(nodes.budgetCommentModal.inert,false);assert.equal(nodes.budgetCommentConfirm.hidden,true);
  assert.match(budget,/if\(budgetCommentConfirm\)\{e.preventDefault\(\);finishBudgetCommentConfirm\(false\);return;\}/,'Escape cancels only the nested confirmation');
  const modal={inert:false},back={classList:{add(name){this.added=name;}},setAttribute(){}};let options;
  const l=vm.createContext({$:id=>id==='contractCommentModal'?modal:{querySelector:()=>back},confirmDialog:input=>{options=input;}});vm.runInContext(extract(legal,'confirmContractCommentDelete'),l);
  const result=l.confirmContractCommentDelete();assert.equal(modal.inert,true);assert.equal(back.classList.added,'comment-confirm-back');options.onDismiss();assert.equal(await result,false);assert.equal(modal.inert,false);
}
for(const wasInert of [false,true]){
  const pf=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8'),gate=deferred(),handlers={};
  const modal={inert:wasInert},doc={activeElement:null,getElementById:id=>id==='commentModal'?modal:confirm,addEventListener(type,fn){handlers[type]=fn;},removeEventListener(type,fn){assert.equal(handlers[type],fn);delete handlers[type];}};
  const first={hidden:false,disabled:false,getClientRects:()=>[{}],focus(){doc.activeElement=first;}},last={hidden:false,disabled:false,getClientRects:()=>[{}],focus(){doc.activeElement=last;}},confirm={classList:{contains:()=>true},querySelectorAll:()=>[first,last],contains:node=>[first,last].includes(node)};
  const c=vm.createContext({document:doc,uiConfirm:()=>gate.promise});vm.runInContext(extract(pf,'confirmPfCommentDelete'),c);
  const result=c.confirmPfCommentDelete();assert.equal(modal.inert,true,'PF comment thread is inert under its confirmation');
  let prevented=false;doc.activeElement=last;handlers.keydown({key:'Tab',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(doc.activeElement,first,'Tab wraps within PF confirmation');
  handlers.keydown({key:'Tab',shiftKey:true,preventDefault(){}});assert.equal(doc.activeElement,last,'Shift+Tab wraps within PF confirmation');
  handlers.focusin({target:{}});assert.equal(doc.activeElement,first,'outside focus returns to confirmation');
  gate.resolve(false);assert.equal(await result,false);assert.equal(modal.inert,wasInert,'PF confirmation restores the exact previous inert state');assert.deepEqual(Object.keys(handlers),[],'scoped traps are removed after cancellation');
}
console.log('PASS shared comment actions across Pro Forma, Project, Budget, Legal/Construction: author/24h/read-only guards, exact admin alias, inline edit, retained cancel draft/focus, write lock and nested confirmation layers.');
