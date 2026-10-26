import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
const replies=JSON.parse(fs.readFileSync('scripts/fixtures/po-legacy-history.json','utf8'));
function actual(name){
  const match=new RegExp('(?:async )?function '+name+'\\(').exec(source);
  assert.ok(match,'Actual helper exists: '+name);
  const end=source.indexOf('\n}',match.index)+2;
  assert.ok(end>match.index,'Actual helper is complete: '+name);
  return source.slice(match.index,end);
}
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function rowFor(reply){const s=reply.snapshot;return {ID:s.id,Budget:{ID:s.budgetId},Request_Type:'Purchase Order',PO_Status:s.status,PO_Revision:s.revision,PO_Approval_State:s.approvalState,_poModifications:null,_poModificationsState:'idle'};}
const audit=[],reads=[],budgetId='4410926000005121010';
const c=vm.createContext({Promise,Set,Error,JSON,poDevelopment:()=>true,lookupMatchesId:(value,id)=>value?.ID===id,cleanVal:value=>String(value??'').trim(),auditLog:(...args)=>audit.push(args)});c.window=c;
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-domain.js','utf8'),c);
for(const name of ['savedPurchaseOrderRequest','purchaseOrderRequestChildren','loadPurchaseOrderRequestChildren'])vm.runInContext(actual(name),c);

// Exact, successful authenticated Get payloads from the October 26 Development
// audit: one has no linked modification; the other has an older unrelated link.
assert.deepEqual(replies.map(reply=>reply.snapshot.id),['4410926000005121026','4410926000005121122']);
assert.equal(replies[1].snapshot.budgetModificationId,'4410926000005121116');
const originals=JSON.stringify(replies);replies.forEach(freeze);
const rows=replies.map(rowFor);
await c.loadPurchaseOrderRequestChildren(rows,budgetId,async(action,id)=>{reads.push({action,id});assert.equal(action,'Get','Legacy display uses reads only');return replies.find(reply=>reply.snapshot.id===id);},()=>true);
assert.deepEqual(reads.map(read=>read.id),replies.map(reply=>reply.snapshot.id));
for(const row of rows){assert.equal(row._poModificationsState,'legacy-unavailable');assert.equal(row._poModifications,null,'No children or links are inferred');}
assert.equal(audit.length,0,'Verified missing legacy history must not trigger an automatic critical report');
assert.equal(JSON.stringify(replies),originals,'Read degradation never repairs records or changes reservations/approvals');
for(const reply of replies)assert.equal(c.purchaseOrderRequestChildren(rowFor(reply),{...reply,snapshot:{...reply.snapshot,approvalBundle:null}},budgetId),null,'An explicitly null captured bundle is absent');

// Every identity, authorization and modern-history failure still fails closed.
const base=replies[0],request=rowFor(base);
const invalid=[
  null,{...base,success:false},{...base,contract:'other'},{...base,snapshot:null},
  ...[{id:Number(base.snapshot.id)},{id:'4410926000005121122'},{budgetId:'4410926000005121011'},{revision:'other-revision'},{status:'Draft'},
    {commitmentState:'None'},{commitmentState:undefined},{approvalState:'Pending'},{approvalState:'Approved'},{approvalState:'Rejected'},
    {approvalBundle:{}},{approvalBundle:false},{approvalBundle:{revision:base.snapshot.revision,modifications:[]}}
  ].map(patch=>({...base,snapshot:{...base.snapshot,...patch}}))
];
for(const reply of invalid){
  assert.throws(()=>c.purchaseOrderRequestChildren(request,reply,budgetId),/could not be verified/);
  const failed=rowFor(base),before=audit.length;
  await c.loadPurchaseOrderRequestChildren([failed],budgetId,async()=>reply,()=>true);
  assert.equal(failed._poModificationsState,'unavailable');assert.equal(audit.length,before+1);assert.equal(audit.at(-1)[0],'error','Real failures retain critical diagnostics');
}
const child={id:'4410926000005999000',budgetItemId:'4410926000005121018',amount:'1.00',reference:'PO:'+request.ID+':'+request.PO_Revision,status:'Submitted'};
const modern={...base,snapshot:{...base.snapshot,approvalState:'Pending',budgetModificationId:child.id,approvalBundle:{revision:request.PO_Revision,modifications:[child]}}};
const modernRow=rowFor(modern);await c.loadPurchaseOrderRequestChildren([modernRow],budgetId,async()=>modern,()=>true);
assert.equal(modernRow._poModificationsState,'loaded');assert.equal(modernRow._poModifications[0].ID,child.id);
for(const patch of [{id:123},{budgetItemId:123},{amount:'0.00'},{reference:'PO:foreign:revision'},{status:'Approved'}])assert.throws(()=>c.purchaseOrderRequestChildren(modernRow,{...modern,snapshot:{...modern.snapshot,approvalBundle:{...modern.snapshot.approvalBundle,modifications:[{...child,...patch}]}}},budgetId),/identities/);
assert.throws(()=>c.purchaseOrderRequestChildren(modernRow,{...modern,snapshot:{...modern.snapshot,approvalBundle:{...modern.snapshot.approvalBundle,revision:'stale'}}},budgetId),/could not be verified/);

let release,current=true;const stale=rowFor(base),pending=new Promise(resolve=>{release=resolve;});
const loading=c.loadPurchaseOrderRequestChildren([stale],budgetId,()=>pending,()=>current);current=false;release(base);await loading;
assert.equal(stale._poModificationsState,'idle','Late legacy replies cannot publish after an actor/phase change');
assert.equal(stale._poModifications,null);
console.log('Legacy PO history: both exact audited snapshots show read-only unavailable history without critical errors; identity, denied replies, modern malformed bundles/children and stale actor reads remain strict.');
