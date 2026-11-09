import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
const module=fs.readFileSync('widgets/budget-manager/src/app/budget-requests-workspace.js','utf8');
function source(name){const start=html.indexOf('function '+name+'('),line=html.indexOf('\n',start);assert.ok(start>=0,name);return html.slice(start,html.slice(start,line).trimEnd().endsWith('}')?line:html.indexOf('\n}',start)+2);}
const c=vm.createContext({console,Map,Set,Number,Date,Promise,Error,document:{activeElement:null,addEventListener(){}}});c.window=c;vm.runInContext(module,c);
const api=c.LMBudgetRequests;
const entry=(id,rank,extra={})=>({kind:'payment',record:{ID:id},rank,budgetId:'90071992547409931',project:'Eagle Prairie',projectKey:'100',territory:'Austin',phase:'Phase 01',type:'Purchase Order',status:'Draft',search:'Eagle Prairie Phase 01 Austin Vendor',children:[],...extra});
const rows=[entry('90071992547409933',NaN),entry('90071992547409932',100),entry('90071992547409935',200),entry('90071992547409934',200),entry('90071992547409936',300,{project:'Windmill',projectKey:'101',territory:'San Antonio',type:'Wire',status:'Submitted',search:'Windmill San Antonio Vendor'})];
const ui={search:'',types:[],statuses:[],order:'newest',by:'date'};
assert.deepEqual(Array.from(api.select(rows,ui),e=>e.record.ID),['90071992547409936','90071992547409935','90071992547409934','90071992547409932','90071992547409933']);
assert.deepEqual(Array.from(api.select(rows,{...ui,order:'oldest'}),e=>e.record.ID),['90071992547409932','90071992547409934','90071992547409935','90071992547409936','90071992547409933'],'Unknown dates stay last in both orders, string IDs preserve close ties');
assert.equal(api.select(rows,{...ui,search:'san antonio'}).length,1);
assert.equal(api.select(rows,{...ui,types:['Wire'],statuses:['Draft']}).length,0);
assert.equal(api.select([entry('1',1,{children:[{ID:'2'}]})],{...ui,types:['Bud Mod']}).length,1,'Bud Mod filtering retains the owning PO and linked child');
assert.deepEqual(Array.from(api.bucket(api.select(rows,ui),'project'),g=>[g.label,g.entries.length]),[['Eagle Prairie',4],['Windmill',1]]);
assert.deepEqual(Array.from(api.bucket(rows,'territory'),g=>g.label),['Austin','San Antonio']);
assert.equal(api.bucket([entry('1',0),entry('2',NaN)],'date')[1].label,'Date Unavailable');
assert.equal(api.bucket([entry('1',0),entry('2',0,{projectKey:'102'})],'project').length,2,'Same display names do not merge different projects');
const deferred=()=>{let resolve,reject;return {promise:new Promise((a,b)=>{resolve=a;reject=b;}),get resolve(){return resolve;},get reject(){return reject;}};};
const turn=()=>new Promise(r=>setImmediate(r));
function harness(count=102){
 let scope='actor-one',reads=0,deny='',modFailure=false,indexFailure=null,indexGate=null,lastOptions=null,lastFresh=null;
 const events={},newRequests=[],menuItems=[];
 const newToggle={focus(){c.document.activeElement=this;}};
 const kinds=[['modification','Bud Mod',true],['check','Check Request',true],['wire','Wire Request',false],['purchase-order','Purchase Order',true]];
 kinds.filter(row=>row[2]).forEach(row=>menuItems.push({kind:row[0],focus(){c.document.activeElement=this;}}));
 const host={innerHTML:'',replaceChildren(){this.innerHTML='';},querySelector(selector){return selector==='[data-requests-new-toggle]'?newToggle:selector==='.requests-global-add [role="menuitem"]:not(:disabled)'?menuItems[0]:null;},querySelectorAll(selector){return selector==='.requests-global-add [role="menuitem"]:not(:disabled)'?menuItems:[];},addEventListener(type,handler){events[type]=handler;}};
 const budgets=Array.from({length:count},(_,i)=>({ID:String(9000+i)}));
 const model=api.create({host,scope:()=>scope,budgets:()=>budgets,visible:()=>true,newRequestKinds:()=>kinds,openNewRequest:(kind,trigger)=>newRequests.push({kind,trigger}),renderGroup:()=>'<article>Real Request</article>',onError:error=>{throw error;},openPhase(){},openAction(){},
  entries:ids=>ids.map(id=>entry(id,1)),loadIndex:async(fresh,options)=>{reads++;lastOptions=options;lastFresh=fresh;if(indexGate)await indexGate.promise;await turn();if(indexFailure)throw indexFailure;return {loaded:budgets.map(row=>row.ID).filter(id=>id!==deny),failed:deny?[deny]:[],mods:!modFailure,error:modFailure?'Permission denied':'',reportDenied:modFailure};}});
 return {model,host,events,newRequests,newToggle,menuItems,get reads(){return reads;},get options(){return lastOptions;},get fresh(){return lastFresh;},set scope(v){scope=v;},set deny(v){deny=v;},set modFailure(v){modFailure=v;},set failure(v){indexFailure=v;},set gate(v){indexGate=v;}};
}
const h=harness();assert.equal(h.reads,0,'Construction is inert until first explicit open');
const first=h.model.open(),duplicate=h.model.open();await Promise.all([first,duplicate]);
assert.equal(h.reads,1,'102 phases use one complete index read rather than per-phase readers');assert.equal(h.model.state().loaded.length,102);assert.match(h.host.innerHTML,/102<\/strong> Requests/);
await h.model.open();assert.equal(h.reads,1,'Reopening a ready tab reuses the actor-scoped cache');
h.model.ui.by='territory';h.model.ui.order='oldest';h.model.render();assert.equal(h.reads,1,'Grouping/sorting are local and read-only');
h.failure=Object.assign(Error('API minute limit reached'),{code:'2955'});await h.model.refresh();assert.equal(h.reads,2);assert.equal(h.model.state().status,'error');assert.equal(h.model.state().loaded.length,102,'A failed same-scope refresh retains the last complete authorized rows');assert.match(h.host.innerHTML,/Could Not Refresh Requests/);assert.match(h.host.innerHTML,/API minute limit reached/);assert.doesNotMatch(h.host.innerHTML,/aria-busy="true"/);await h.model.open();assert.equal(h.reads,2,'Quota failure does not trigger automatic fallback or a retry on tab reopening');
h.failure=null;h.deny='9003';h.modFailure=true;await h.model.refresh();assert.equal(h.reads,3);assert.equal(h.model.state().failed.length,1);assert.equal(h.model.state().loaded.length,101);assert.equal(h.model.state().mods,false);assert.match(h.host.innerHTML,/Bud Mods Unavailable/);assert.match(h.host.innerHTML,/Requests unavailable for 1 phase/);assert.match(h.host.innerHTML,/Check \/ wire requests unavailable/);assert.equal(h.fresh,true);
const failed=harness();failed.failure=Error('Bulk reader unavailable');await failed.model.open();assert.equal(failed.reads,1);assert.equal(failed.model.state().loaded.length,0);assert.match(failed.host.innerHTML,/Requests Unavailable/);assert.doesNotMatch(failed.host.innerHTML,/No Requests Available|Loading Requests/);
const stale=harness(1),gate=deferred();stale.gate=gate;const loading=stale.model.open();await turn();stale.scope='actor-two';stale.model.render();assert.equal(stale.host.innerHTML,'','An actor change clears private rows immediately');gate.resolve();await loading;assert.equal(stale.host.innerHTML,'','Stale completions cannot repopulate the view');stale.gate=null;await stale.model.open();assert.equal(stale.model.state().scope,'actor-two');assert.match(stale.host.innerHTML,/Real Request/);
assert.equal(stale.fresh,true,'A new actor forces a fresh host snapshot');
const pending=harness(),cancelGate=deferred();pending.gate=cancelGate;const staleRead=pending.model.open();await turn();assert.equal(pending.options.isCancelled(),false);assert.match(pending.host.innerHTML,/class="requests-loading-card"/);assert.match(pending.host.innerHTML,/class="requests-loading-ring"/);assert.match(pending.host.innerHTML,/aria-busy="true"/);pending.scope='another-actor';assert.equal(pending.options.isCancelled(),true,'The host can stop pending reads as soon as actor scope changes');cancelGate.resolve();await staleRead;
// The Requests entry point uses the same type-first menu as landing Add, without Budget.
assert.match(h.host.innerHTML,/class="btn mod-page-add requests-new"/);assert.match(h.host.innerHTML,/New Request<svg/);assert.doesNotMatch(h.host.innerHTML,/data-requests-picker="phase"|data-requests-new-kind="budget"/);
assert.deepEqual(Array.from(h.host.innerHTML.matchAll(/data-requests-new-kind="([^"]+)"/g),m=>m[1]),['modification','check','wire','purchase-order']);
function clickTarget(selector,node){return {closest:target=>target===selector?node:null};}
h.events.click({target:clickTarget('[data-requests-new-toggle]',h.newToggle)});assert.match(h.host.innerHTML,/aria-expanded="true"/);assert.equal(c.document.activeElement,h.menuItems[0]);
let prevented=false;h.events.keydown({key:'End',target:clickTarget('.requests-global-add',{}),preventDefault(){prevented=true;}});assert.equal(c.document.activeElement,h.menuItems[2]);assert.equal(prevented,true);
h.events.keydown({key:'Escape',target:{},preventDefault(){},stopPropagation(){}});assert.equal(c.document.activeElement,h.newToggle);assert.doesNotMatch(h.host.innerHTML,/aria-expanded="true"/);
h.events.click({target:clickTarget('[data-requests-new-kind]',{dataset:{requestsNewKind:'wire'},disabled:true})});assert.equal(h.newRequests.length,0,'Disabled types preserve current permission gates');
h.events.click({target:clickTarget('[data-requests-new-kind]',{dataset:{requestsNewKind:'check'},disabled:false})});assert.equal(h.newRequests[0].kind,'check');assert.equal(h.newRequests[0].trigger,h.newToggle,'The shared global picker restores focus to this mounted action');assert.equal(h.reads,3,'Menu actions do not load request data');
// Exercise real native-shaped host grouping, including the exact PO/revision child relationship.
const bid='90071992547409931',poId='90071992547409932',mid='90071992547409933',b={ID:bid};
Object.assign(c,{S:{budgets:[b],checkWireRequestScopes:{[bid]:'scope'},checkWireRequestState:{[bid]:'loaded'},checkWireRequestsByBudget:{[bid]:[{ID:poId,Budget:{ID:bid},Request_Type:'Purchase Order',PO_Status:'Submitted',PO_Revision:'r1',Request_Date:'2026-11-09',Vendor:{ID:'90071992547409934',display_value:'A Greater Austin'}}]}},
 cleanVal:v=>String(v??'').trim(),firstRaw:(v,keys)=>keys.map(k=>v[k]).find(v=>v!=null),lookupMatchesId:(v,id)=>typeof v==='object'?v?.ID===id:v===id,lookupName:v=>v?.display_value||'',budgetCreateScope:()=> 'scope',findProjectForBudget:()=>({key:'native-project-id'}),projectName:()=> 'Eagle Prairie',phaseName:()=> 'Phase 01',territoryName:()=> 'Austin',savedPurchaseOrderRequest:(row,id)=>row.PO_Revision&&row.Budget.ID===id,
 modsForBudget:()=>[{ID:mid,Budget:{ID:bid},Budget_Item:{ID:'90071992547409935',display_value:'Curb & Gutter'},Reference_Number:'PO:'+poId+':r1',Status:'Submitted',Amount:'100.00',Reason:'Required Increase'}]});
for(const name of ['requestRailDateRank','requestRailDateValue','requestRailGroups','allRequestEntries'])vm.runInContext(source(name),c);
const native=c.allRequestEntries([bid],true);assert.equal(native.length,1);assert.equal(native[0].children[0].ID,mid);assert.equal(native[0].projectKey,'native-project-id');assert.match(native[0].search,/Curb & Gutter/);assert.equal(native[0].record.ID,poId);assert.equal(c.allRequestEntries([bid],false)[0].children.length,0,'A denied mod report never leaks stale standalone records');
c.S.checkWireRequestScopes[bid]='old-actor';assert.equal(c.allRequestEntries([bid],true).length,0);
// Route through existing phase editor and existing action dispatcher only after exact detail readiness.
let actions=0,opens=0,nav=1,ready=true,focused=false;const phaseButton={disabled:false,getAttribute:()=>poId,focus(){focused=true;}},back={setAttribute(){}},action={attributes:[{name:'data-request-po-open',value:poId}]};Object.assign(c,{allRequestsScope:()=> 'actor',budgetNavigationToken:()=>nav,budgetNavigationCurrent:token=>token===nav,budgetDetailReady:()=>ready,setActiveTab(){},$:id=>id==='backBtn'?back:{querySelectorAll:()=>[phaseButton]},openPhaseEditor:async(id,mode)=>{assert.equal(id,bid);assert.equal(mode,'modifications');opens++;},loadCheckWireRequests:async()=>{},handleBudgetRequestClick:event=>{assert.equal(event.target,phaseButton,'Use the current visible action, preserving permissions and modal focus');assert.equal(focused,true,'Native modals capture a visible return-focus target');actions++;}});c.S.checkWireRequestState[bid]='loaded';vm.runInContext(source('openAllRequestsPhase'),c);
await c.openAllRequestsPhase(bid,false,action);assert.equal(opens,1);assert.equal(actions,1);ready=false;await c.openAllRequestsPhase(bid,false,action);assert.equal(actions,1,'Failed detail reads never invoke a request action');
const boot=source('boot');assert.doesNotMatch(boot,/allRequestsWorkspace|openAllRequestsTab|loadCheckWireRequests/,'No request index reads at startup');
assert.ok(html.indexOf('data-tab="requests"')>html.indexOf('data-tab="budgets"')&&html.indexOf('data-tab="requests"')<html.indexOf('data-tab="approvals"'));
assert.match(source('openAllRequestsTab'),/loadIndex:loadAllRequestsIndex/,'The index delegates one bulk snapshot to the host');
assert.doesNotMatch(module,/options\.loadBudget|options\.loadMods|async function worker/,'No per-phase fallback can restart the API flood');
const css=fs.readFileSync('widgets/budget-manager/src/app/budget-requests-workspace.css','utf8');
assert.match(css,/\.requests-global-add>\.requests-new\{[^}]*width:auto[^}]*gap:8px[^}]*background:linear-gradient\(145deg,#194a88,#10335f\)[^}]*color:#fff/,'The compact blue action stays independent of open picker overrides');
assert.match(css,/\.requests-new>svg\{[^}]*margin:0/,'Chevron spacing is fixed instead of consuming extra width');
assert.match(css,/\.requests-loading-card\{[^}]*gap:15px[^}]*padding:20px 25px[^}]*border-radius:14px/,'First loading uses the Forecasts card tokens');
assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{[^\n]*\.requests-loading-ring\{animation:none\}/);
assert.doesNotMatch(module,/requests-loading-dot/);
console.log('All Requests: one scoped 102-phase snapshot, deduplicated/cache-only reopening, quota failure without fanout, stale cancellation, type-first Add menu, native grouping and action handoff passed.');
