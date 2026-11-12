// Execute the shipped loaders with controlled transport completion order.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
function source(name){const start=html.indexOf('function '+name+'('),line=html.indexOf('\n',start);assert.ok(start>=0,name);return html.slice(start,html.slice(start,line).trimEnd().endsWith('}')?line:html.indexOf('\n}',start)+2);}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const bid='4410926000002289002',budget={ID:bid};
function harness(){
  let actor='construction',capability=deferred();const reads=[];
  const c=vm.createContext({S:{features:{},attachmentsByBudget:{}},attachmentLinkStates:{},Promise,
    CFG:{reports:{attachments:'All_Attachments'},attachmentBudgetField:'Budget',attachmentFileField:'File_field1'},
    attachmentLinkScope:()=>actor,attachmentRecordBudgetId:r=>r.Budget.ID,normalizeBudgetAttachmentRecord:r=>({...r,budgetId:r.Budget.ID}),
    budgetBadgeScope:()=>actor,syncBudgetAttachmentButtons(){},syncRequestAttachmentCounts(){},
    callAttachmentLink:()=>capability.promise,
    sdkGetAllRecords:(report,criteria,options)=>{const d=deferred();reads.push({...d,report,criteria,options});return d.promise;}
  });
  for(const name of ['budgetFeature','invalidateBudgetFeature','loadBudgetFeature','attachmentLinksReady','loadBudgetAttachments','ensureRequestAttachments'])vm.runInContext(source(name),c);
  const rows=(ID='91')=>[{ID,Budget:{ID:bid},paymentRequestId:'71',name:'Estimate.pdf'}];
  return {c,reads,rows,setActor:value=>actor=value,capability};
}
for(const oldOutcome of ['success','failure']){
  const h=harness(),first=h.c.loadBudgetAttachments(bid,false),ready=h.c.ensureRequestAttachments(budget);
  await tick();assert.equal(h.reads.length,1);
  h.capability.resolve({ok:true,budgetId:bid,canWrite:false,canAttachPO:true});await tick();
  assert.equal(h.reads.length,2);assert.ok(h.reads[1].options.fields.includes('Payment_Request'));
  h.reads[1].resolve(h.rows('92'));await ready;
  if(oldOutcome==='success')h.reads[0].resolve(h.rows('91'));else h.reads[0].reject(Error('Old read failed'));
  assert.equal((await first)[0].ID,'92','The original panel receives the replacement snapshot, never a superseded-read error');
  assert.equal(h.c.S.attachmentsByBudget[bid][0].ID,'92');
  assert.equal(h.c.attachmentLinkStates[bid].canAttachPO,true);
}
{
  const h=harness(),first=h.c.loadBudgetAttachments(bid,false);await tick();
  const second=h.c.loadBudgetAttachments(bid,true);await tick();
  h.reads[0].resolve(h.rows('91'));await tick();
  let settled=false;first.finally(()=>settled=true);await tick();assert.equal(settled,false,'Wait for the replacement instead of showing stale rows');
  const third=h.c.loadBudgetAttachments(bid,true);await tick();
  h.reads[1].resolve(h.rows('92'));await tick();h.reads[2].resolve(h.rows('93'));
  for(const pending of [first,second,third])assert.equal((await pending)[0].ID,'93');
  assert.equal(h.reads.length,3,'Following a replacement performs no extra report read');
}
{
  const h=harness(),first=h.c.loadBudgetAttachments(bid,false);await tick();
  const second=h.c.loadBudgetAttachments(bid,true);await tick();
  const failures=Promise.all([assert.rejects(first,/Permission denied/),assert.rejects(second,/Permission denied/)]);
  h.reads[1].reject(Error('Permission denied'));await tick();h.reads[0].resolve(h.rows());await failures;
  assert.equal(h.c.budgetFeature('attachments:'+bid).status,'error');
  assert.equal(h.c.S.attachmentsByBudget[bid],undefined,'A real replacement failure cannot publish the stale snapshot');
  const retry=h.c.loadBudgetAttachments(bid,false);await tick();h.reads[2].resolve(h.rows('94'));await retry;
  assert.equal(h.c.budgetFeature('attachments:'+bid).status,'loaded','Retry recovers a real read failure');
}
{
  const h=harness(),first=h.c.loadBudgetAttachments(bid,false);await tick();
  const denied=assert.rejects(first,/context changed/);h.setActor('another-user');
  const second=h.c.loadBudgetAttachments(bid,false);await tick();
  h.reads[1].resolve(h.rows('95'));await second;h.reads[0].resolve(h.rows('91'));await denied;
  assert.equal(h.c.S.attachmentsByBudget[bid][0].ID,'95','An old actor cannot publish rows or follow another actor’s read');
}
{
  const h=harness(),first=h.c.loadBudgetAttachments(bid,false);await tick();
  const denied=assert.rejects(first,/context changed/);h.setActor('another-user');h.reads[0].resolve(h.rows());await denied;
  assert.equal(h.c.S.attachmentsByBudget[bid],undefined,'An actor change blocks publication even before a replacement starts');
}
// Mount the actual request controller with lightweight DOM nodes. This catches
// the pre-capability render without replacing the controller with a test model.
{
  const h=harness(),pane={innerHTML:''},surface={requestContext:{kind:'payment',id:'71',budgetId:bid}};
  Object.assign(h.c,{budgetNavigationToken:()=>1,attachmentInlineStateHtml:()=> 'Loading attachments',attachmentSurfaceCurrent:()=>true,renderAttachmentSurface:()=>h.c.renderAttachmentPage(budget,pane,surface)});
  h.c.S.attachmentStatus='Upload confirmed';h.c.S.attachmentStatusError=false;
  vm.runInContext(source('renderAttachmentPage'),h.c);h.c.renderAttachmentPage(budget,pane,surface);await tick();
  h.reads[0].reject(Error('Permission denied'));await tick();
  assert.match(pane.innerHTML,/data-ra-retry/,'A request panel Retry invokes its own controller, not the separate Budget modal');
  assert.equal(h.c.S.attachmentStatus,'Upload confirmed','Read failures cannot leave a persistent write-status error after recovery');
  assert.equal(h.c.S.attachmentStatusError,false);
}
class Node {
  constructor(){this.isConnected=true;this.dataset={};this.children=new Map();this.hidden=false;this.attributes={};this.listeners={};}
  setAttribute(k,v){this.attributes[k]=v;}removeAttribute(k){delete this.attributes[k];}
  querySelector(k){if(!this.children.has(k))this.children.set(k,new Node());return this.children.get(k);}
  querySelectorAll(){return []; }addEventListener(type,handler,_capture){if(!_capture)this.listeners[type]=handler;}removeEventListener(){}insertBefore(){}remove(){this.isConnected=false;}
}
{
  const c=vm.createContext({window:{},document:{createElement:()=>new Node(),activeElement:null}});
  vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/request-attachments.js','utf8'),c);
  const loads=[],renders=[],root=new Node(),details=new Node();let known=false;
  const ui=c.window.LMRequestAttachments.create({scope:()=> 'construction',files:()=>[],loaded:()=>known,busy:()=>false,
    renderFiles:()=>renders.push('files'),load:()=>{const d=deferred();loads.push(d);return d.promise;}});
  const s=ui.mount({root,details,model:{attachmentTab:'files'},budget,kind:'payment',id:'71',current:()=>true});
  assert.equal(renders.length,0,'Mount must enter loading before calling the file renderer');
  assert.equal(s.loading,true);known=true;loads[0].resolve();await tick();assert.equal(renders.length,1);assert.equal(s.error,'');
  // Retry twice, then deliver the older failure after the newer success.
  function retry(){s.pane.listeners.click({target:{closest:selector=>selector==='[data-ra-retry]'?{}:null}});}
  retry();retry();assert.equal(loads.length,3);
  loads[2].resolve();await tick();loads[1].reject(Error('Older failure'));await tick();
  assert.equal(s.error,'','An older load failure cannot overwrite a newer success');assert.equal(s.loading,false);
  retry();loads[3].reject(Error('Real read failure'));await tick();assert.equal(s.error,'Real read failure');
  retry();loads[4].resolve();await tick();assert.equal(s.error,'','Retry clears the actual failure after success');
  ui.unmount(root);assert.equal(ui.active(),null);
}
console.log('Attachment reads: capability/projection race, overlapping refreshes, replacement failures/retry, exact string parents, actor isolation and mount ordering passed.');
