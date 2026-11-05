import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app='widgets/lot-sales-explorer/src/app/',source=fs.readFileSync(app+'sales-app.js','utf8'),html=fs.readFileSync(app+'widget.html','utf8'),css=fs.readFileSync(app+'insights-navigation.css','utf8');
const start=source.indexOf('  let diagnosticsCopyGeneration = 0;'),end=source.indexOf('  function notice(',start);assert.ok(start>=0&&end>start);
const registrations=source.split('\n').filter(line=>['audit','closeAudit','copyAudit','diagnostics'].some(id=>line.trim().startsWith("$('"+id+"').addEventListener("))).join('\n');
const logFunction=source.split('\n').find(line=>line.trim().startsWith('function log(message)'));
const diagnosticVersion=html.match(/class="version">([^<]+)<\/span>/)?.[1];assert.ok(diagnosticVersion);
assert.doesNotMatch(html,/workspace-toolbar|workspace-breadcrumb|workspace-tools|tool-label/,'The entire redundant breadcrumb/tool strip must be removed');
const sidebar=html.slice(html.indexOf('<aside '),html.indexOf('</aside>'));
for(const id of ['refresh','audit','connection']){assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);assert.ok(sidebar.includes('id="'+id+'"'),'Report controls/status belong in the sidebar');}
assert.match(sidebar,/<div class="navigation-foot">[\s\S]*id="refresh"[\s\S]*id="audit"/);
assert.match(html,/<button id="closeAudit"[^>]*><svg[^>]*>[\s\S]*?<\/svg><\/button>/,'Diagnostics close uses centered SVG geometry');
assert.match(html,/<pre id="auditText" tabindex="0"/);assert.match(html,/id="copyAudit"[^>]*>[\s\S]*?Copy Log<\/button>/);
assert.match(css,/#diagnostics\[open\]\{display:flex;flex-direction:column\}/);
assert.match(css,/#diagnostics #auditText\{[^}]*min-height:0;[^}]*overflow:auto/,'Only log content scrolls within the bounded dialog');

function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
function harness({version=diagnosticVersion,clipboard='ok',fallback=true}={}){
  const nodes=new Map(),copies=[],fallbackCopies=[],fallbackParents=[],selection={node:null,removeAllRanges(){this.node=null;},addRange(range){this.node=range.node;}};let active=null,context;
  function node(id){if(!nodes.has(id))nodes.set(id,{id,textContent:'',disabled:false,open:false,dataset:{},style:{},attributes:{},children:[],scrollTop:0,clientHeight:200,scrollHeight:200,isConnected:true,listeners:{},
    addEventListener(event,handler){this.listeners[event]=handler;},setAttribute(key,value){this.attributes[key]=String(value);},removeAttribute(key){delete this.attributes[key];if(key==='data-state')delete this.dataset.state;},focus(){active=this;},select(){this.selected=true;},
    appendChild(child){child.parentNode=this;this.children.push(child);},remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(child=>child!==this);this.parentNode=null;this.isConnected=false;},
    showModal(){this.open=true;this.shows=(this.shows||0)+1;},close(){this.open=false;this.listeners.close?.();node('audit').focus();}});return nodes.get(id);}
  const document={get activeElement(){return active;},querySelector(selector){assert.equal(selector,'#diagnostics .version');return version===null?null:{textContent:version};},createElement(tag){assert.equal(tag,'textarea');return{...node('temporary-'+nodes.size),tagName:'TEXTAREA'};},createRange(){return{selectNodeContents(target){this.node=target;}};}};
  if(fallback!=='missing')document.execCommand=command=>{assert.equal(command,'copy');assert.equal(active.tagName,'TEXTAREA');assert.equal(active.selected,true);fallbackParents.push(active.parentNode.id);fallbackCopies.push(active.value);if(fallback==='throw')throw new Error('Legacy copy unavailable');return fallback;};
  const navigator={};if(clipboard!=='missing')navigator.clipboard={writeText(text){copies.push(text);return typeof clipboard==='function'?clipboard(text):clipboard==='ok'?Promise.resolve():Promise.reject(new Error('Clipboard blocked'));}};
  context=vm.createContext({document,navigator,$:node,state:{log:['fixture diagnostic']},LMRuntime:{current:()=>({environment:'DEVELOPMENT',appLinkName:'fixture-app'})},getSelection:()=>selection});context.window=context;
  vm.runInContext(source.slice(start,end)+'\n'+logFunction+'\n'+registrations,context);node('audit').focus();
  return{context,node,copies,fallbackCopies,fallbackParents,selection,active:()=>active};
}
for(const version of [diagnosticVersion,'  v99.88.77  ','',null]){
  const h=harness({version});h.node('audit').listeners.click();assert.equal(h.node('auditText').textContent.split('\n')[0],'Land Master Insights '+(version?.trim()||'version unavailable'));assert.ok(h.node('auditText').textContent.includes('fixture-app'));assert.ok(h.node('auditText').textContent.endsWith('fixture diagnostic'));assert.equal(h.node('diagnostics').open,true);
}
{
  const h=harness(),c=h.context;h.node('audit').listeners.click();const original=h.node('auditText').textContent;c.log('new diagnostic while open');assert.notEqual(h.node('auditText').textContent,original);assert.ok(h.node('auditText').textContent.endsWith('new diagnostic while open'));
  for(let index=0;index<60;index++)c.log('Log '+index+' '+('Long native diagnostic '.repeat(30)));
  assert.equal(c.state.log.length,60);await h.node('copyAudit').listeners.click();assert.equal(h.copies.length,1);assert.equal(h.copies[0],h.node('auditText').textContent);for(const entry of c.state.log)assert.ok(h.copies[0].includes(entry),'Copy includes every current audit entry without display truncation');assert.equal(h.node('auditCopyStatus').textContent,'Log copied.');assert.equal(h.node('copyAudit').disabled,false);assert.equal(h.active(),h.node('copyAudit'));
  h.node('closeAudit').listeners.click();assert.equal(h.node('diagnostics').open,false);assert.equal(h.active(),h.node('audit'));c.state.log.push('latest reopen entry');h.node('audit').listeners.click();assert.equal(h.node('diagnostics').shows,2);assert.equal(h.node('auditCopyStatus').textContent,'');assert.ok(h.node('auditText').textContent.endsWith('latest reopen entry'));assert.equal(h.node('auditText').scrollTop,0);
}
for(const clipboard of ['blocked','missing'])for(const fallback of [true,false,'missing','throw']){
  const h=harness({clipboard,fallback});h.node('audit').listeners.click();await h.node('copyAudit').listeners.click();assert.equal(h.node('copyAudit').disabled,false);assert.equal(h.node('diagnostics').children.length,0,'Legacy copy textarea must always be removed');
  if(fallback!=='missing'){assert.deepEqual(h.fallbackParents,['diagnostics'],'Legacy copy stays inside the active native dialog');assert.equal(h.fallbackCopies[0],h.node('auditText').textContent);}
  if(fallback===true){assert.equal(h.node('auditCopyStatus').textContent,'Log copied.');assert.equal(h.active(),h.node('copyAudit'));}
  else{assert.equal(h.node('auditCopyStatus').textContent,'Log selected. Press Ctrl+C to copy.');assert.equal(h.node('auditCopyStatus').dataset.state,'error');assert.equal(h.selection.node,h.node('auditText'));assert.equal(h.active(),h.node('auditText'));}
}
{
  const held=deferred(),h=harness({clipboard:()=>held.promise});h.node('audit').listeners.click();const copying=h.node('copyAudit').listeners.click();assert.equal(h.node('copyAudit').disabled,true);await h.context.copyDiagnostics();assert.equal(h.copies.length,1,'Pending copies cannot be duplicated');h.node('closeAudit').listeners.click();h.node('audit').listeners.click();held.reject(new Error('Late clipboard rejection'));await copying;assert.equal(h.node('auditCopyStatus').textContent,'','An old copy cannot repaint a reopened dialog');assert.equal(h.node('copyAudit').disabled,false);assert.equal(h.fallbackCopies.length,0);
}
console.log('PASS Insights sidebar tools and diagnostics: removed breadcrumb, bounded log, complete current copies, native clipboard/fallback outcomes, selection, focus, repeated opens, live updates and stale-copy isolation.');
