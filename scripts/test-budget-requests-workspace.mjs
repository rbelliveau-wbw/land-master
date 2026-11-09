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
function harness(count=8){
 let scope='actor-one',active=0,maximum=0,reads=0,mods=0,deny='',modFailure=false,phaseGate=null;
 const events={},host={innerHTML:'',replaceChildren(){this.innerHTML='';},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(type,handler){events[type]=handler;}};
 const budgets=Array.from({length:count},(_,i)=>({ID:String(9000+i)}));
 const model=api.create({host,scope:()=>scope,budgets:()=>budgets,visible:()=>true,phases:()=>[],reportDenied:()=>false,renderGroup:()=>'<article>Real Request</article>',onError:error=>{throw error;},openPhase(){},openAction(){},
  entries:ids=>ids.map(id=>entry(id,1)),loadMods:async()=>{mods++;if(modFailure)throw Error('Permission denied');},loadBudget:async id=>{reads++;active++;maximum=Math.max(maximum,active);try{if(phaseGate)await phaseGate.promise;await turn();if(id===deny)throw Error('Denied');}finally{active--;}}});
 return {model,host,events,get reads(){return reads;},get mods(){return mods;},get maximum(){return maximum;},set scope(v){scope=v;},set deny(v){deny=v;},set modFailure(v){modFailure=v;},set gate(v){phaseGate=v;}};
}
const h=harness();assert.equal(h.reads,0);assert.equal(h.mods,0,'Construction is inert until first explicit open');
const first=h.model.open(),duplicate=h.model.open();await Promise.all([first,duplicate]);
assert.equal(h.reads,8);assert.equal(h.mods,1);assert.ok(h.maximum<=3,'Global phase fanout is bounded');assert.equal(h.model.state().loaded.length,8);assert.match(h.host.innerHTML,/8<\/strong> Requests/);
await h.model.open();assert.equal(h.reads,8,'Reopening a ready tab reuses the actor-scoped cache');
h.model.ui.by='territory';h.model.ui.order='oldest';h.model.render();assert.equal(h.reads,8,'Grouping/sorting are local and read-only');
h.deny='9003';h.modFailure=true;await h.model.refresh();assert.equal(h.model.state().failed.length,1);assert.equal(h.model.state().loaded.length,7);assert.equal(h.model.state().mods,false);assert.match(h.host.innerHTML,/Bud Mods Unavailable/);assert.match(h.host.innerHTML,/Requests unavailable for 1 phase/);
const stale=harness(1),gate=deferred();stale.gate=gate;const loading=stale.model.open();await turn();stale.scope='actor-two';stale.model.render();assert.equal(stale.host.innerHTML,'','An actor change clears private rows immediately');gate.resolve();await loading;assert.equal(stale.host.innerHTML,'','Stale completions cannot repopulate the view');stale.gate=null;await stale.model.open();assert.equal(stale.model.state().scope,'actor-two');assert.match(stale.host.innerHTML,/Real Request/);
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
assert.match(source('openAllRequestsTab'),/attachments:false/,'The index does not fan out attachment or detail reads');
console.log('All Requests: lazy scoped loading, bounded/deduplicated reads, chronology/grouping/filters, native PO children, denial/stale guards and existing action handoff passed.');
