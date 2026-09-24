import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8');
const backend=fs.readFileSync('creator/functions/proforma_save.dg','utf8');
const baseline=fs.readFileSync('releases/proforma-manager/1.80.22/index.html','utf8');
function extract(name,text=source){
  const start=text.indexOf(`function ${name}(`);
  assert.ok(start>=0,`${name} exists`);
  const brace=text.indexOf('{',start);
  let depth=0;
  for(let i=brace;i<text.length;i++){
    if(text[i]==='{')depth++;
    if(text[i]==='}')depth--;
    if(!depth)return text.slice(start,i+1);
  }
  throw Error(`Unterminated ${name}`);
}
const names=['migrationAccountAccess','migrationEditAccess','canOpenPfEditor','canEditPf',
  'canSavePf','canEditOwner','boolValue','protectedInputLock','isInputLocked','savedInputLock',
  'isLOIApprovalLocked','editorHasSaveWork','applyInputLock','applyEditGating','updateDirtyChip'];
function harness(overrides={}){
  const S={migrationEditor:'rbelliveau',currentUser:'rbelliveau@wbdevelopment.com',myAccessId:'1001',
    users:[{id:'1001',label:'rbelliveau'},{id:'1002',label:'other'}],
    perms:{editAll:false,editOwned:false,ownerEditSend:false,anyEdit:false,readOnly:true,editOwner:true},
    ed:{dirty:false,model:null},...overrides};
  function control(loi=false){return {disabled:true,dataset:{inputLock:'1'},
    closest:()=>loi?{}:null,matches:()=>false};}
  const financial=control(),loi=control(true),classes={};
  const host={classList:{toggle:(k,v)=>{classes[k]=v;}},querySelectorAll:()=>[financial,loi]};
  const btn={dataset:{}},banner={classList:{toggle(){}},hidden:true},dirty={classList:{toggle(){}}};
  const context=vm.createContext({S,
    perms:()=>S.perms,userOwnsPf:r=>r.Owner===S.myAccessId,canDuplicatePf:()=>false,
    proformaApprovalState:r=>({started:r.Status==='Pending Approval'||r.Status==='Approved',complete:r.Status==='Approved'}),
    renderEditOwners(){},syncDuplicateBanner(){},canViewProformaApprovals:()=>false,
    document:{getElementById:id=>({edPanes:host,btnSave:btn,edBanner:banner,edDirty:dirty})[id]||null}});
  vm.runInContext(names.map(n=>extract(n)).join('\n'),context);
  return {S,context,financial,loi,classes,btn,banner};
}
const records=[
  {ID:'2001',Status:'Approved',Lock_Inputs:'true',Owner:'someone-else'},
  {ID:'2002',Status:'Pending Approval',Lock_Inputs:'true',Owner:'someone-else'},
  {ID:'2003',Status:'Closed',Probability:'Closed Won',Lock_Inputs:'true',Owner:'someone-else'},
  {ID:'2004',Status:'Draft',Archive:true,Lock_Inputs:'true',Owner:'someone-else'},
  {ID:'2005',Status:'Draft',Lock_Inputs:'false',Owner:'someone-else'}
];
for(const rec of records){
  const h=harness();h.S.ed.model=rec;
  const before=JSON.stringify(rec);
  assert.equal(h.context.canOpenPfEditor(rec),true);
  assert.equal(h.context.canSavePf(rec),true);
  assert.equal(h.context.isInputLocked(rec),false);
  assert.equal(h.context.savedInputLock(rec),rec.Lock_Inputs==='true');
  assert.equal(h.context.canEditPf(rec),false,'unrelated permissions do not inherit migration access');
  h.context.applyEditGating();h.context.updateDirtyChip();
  assert.equal(h.btn.disabled,false,'unchanged existing records can be deliberately re-saved');
  assert.equal(h.financial.disabled,false,'financial controls are editable');
  assert.equal(h.classes.readonly,false);
  assert.match(h.banner.textContent,/Mega Admin Mode/);
  if(rec.Status==='Approved'||rec.Status==='Pending Approval')assert.equal(h.loi.disabled,true,'LOI approval lock remains');
  if(rec.Lock_Inputs==='true')assert.equal(h.context.canEditOwner(rec),false,'owner controls retain their lock');
  assert.equal(JSON.stringify(rec),before,'gating must not mutate records');
}
// An approved record with a stored false lock must not be silently changed to true, either.
{
  const h=harness(),rec={ID:'2006',Status:'Approved',Lock_Inputs:'false'};
  assert.equal(h.context.savedInputLock(rec),false);
  assert.equal(h.context.protectedInputLock(rec),true);
}
for(const overrides of [
  {currentUser:'other@wbdevelopment.com',myAccessId:'1002'},
  {currentUser:'rbelliveau@another-domain.com'},
  {currentUser:'wbdevelopment'},
  {currentUser:'',myAccessId:''},
  {myAccessId:'1002'},
  {users:[]},
  {migrationEditor:''},
  {migrationEditor:undefined}
]){
  const h=harness(overrides);h.S.ed.model=records[0];
  assert.equal(h.context.migrationAccountAccess(),false);
  assert.equal(h.context.canOpenPfEditor(records[0]),false);
  assert.equal(h.context.canSavePf(records[0]),false);
  assert.equal(h.context.isInputLocked(records[0]),true);
  h.context.applyEditGating();h.context.updateDirtyChip();
  assert.equal(h.btn.disabled,true,'other identities and disabled switch retain Save restriction');
  assert.equal(h.financial.disabled,true);
  assert.doesNotMatch(h.banner.textContent,/Mega Admin Mode/);
}
{
  const h=harness();h.S.ed.model={ID:null,Status:'Draft'};
  assert.equal(h.context.migrationEditAccess(h.S.ed.model),false);
  assert.equal(h.context.canSavePf(h.S.ed.model),false,'new-record grants are not expanded');
  assert.equal(h.context.editorHasSaveWork(),false);
}
{
  const h=harness({migrationEditor:''});
  h.S.perms.editOwned=true;h.S.ed.model={ID:'2007',Owner:'1001',Status:'Draft',Lock_Inputs:'false'};
  assert.equal(h.context.canSavePf(h.S.ed.model),true,'normal owned-record editing survives rollback');
  assert.equal(h.context.editorHasSaveWork(),false);
  h.S.ed.model._phaseSalesDraft=true;
  assert.equal(h.context.editorHasSaveWork(),true,'ordinary pending migration can still save after bypass removal');
}
assert.ok(source.includes('if(migrationEditAccess(r)) rowCanEdit=true;'));
assert.ok(source.includes('if(view==="edit"&&!canOpenPfEditor(rec))'));
assert.ok(source.includes('proformaApprovalState(m0).complete&&!migrationEditAccess(m0)'));
assert.ok(source.includes('d[f]=savedInputLock(m)'));
assert.ok(source.includes('var headerTouch={Name:m.Name,Lock_Inputs:savedInputLock(m)}'));
assert.ok(source.includes('var inputLocked=protectedInputLock(r)'));
assert.ok(extract('buildSavePayload').includes('userAccessId:String(S.myAccessId||"")'));
assert.match(source,/var phasePayload=\{op:"save_phase_sales",id:pfId,\s*userAccessId:String\(S.myAccessId\|\|""\)/);
assert.match(source,/op:"finalize_phase_sales",id:pfId,userAccessId:String\(S.myAccessId\|\|""\)/);
assert.match(backend,/migrationEditor = "rbelliveau";/);
assert.match(backend,/migrationEditAccess = false;/);
assert.match(backend,/migrationAccess = User_Access\[ID == migrationAccessId.toLong\(\)\]/);
assert.match(backend,/migrationUser = ifnull\(migrationAccess.User,""\)/);
assert.match(backend,/resp.put\("migrationEditor",migrationEditor\)/);
for(const name of ['phaseApprovalComplete','finalApprovalComplete','approvalIsComplete']){
  assert.match(backend,new RegExp(`if\\(!migrationEditAccess && \\(${name} \\|\\|`));
}
assert.equal((backend.match(/if\(!migrationEditAccess &&/g)||[]).length,3,'only the three financial-save guards are bypassed');
assert.match(backend,/if\(approvalComplete \|\| ifnull\(quickPf.Status/,'explicit unlock stays guarded');
assert.match(backend,/if\(loiApprovalStarted \|\| loiPfStatus == "Pending Approval"/,'LOI approval guard stays');
assert.equal(extract('initializeConstructionGate'),extract('initializeConstructionGate',baseline),
  'the Under Construction modal and tab-session unlock behavior must remain unchanged');

// Missing/disabled capability must clear a previously cached account grant.
{
  const h=harness();h.S.liveSDK=true;h.S.env={name:'PRODUCTION'};
  h.context.saveApiCandidateNames=()=>['Save_PF'];h.context.auditLog=()=>{};
  vm.runInContext(extract('parseSaveApiResult')+'\n'+extract('probePhaseSalesSupport'),h.context);
  h.context.sdkInvoke=()=>Promise.resolve({success:true,action:'phase_sales_capabilities',savePhaseSales:true,finalizePhaseSales:true,migrationEditor:'rbelliveau'});
  await h.context.probePhaseSalesSupport();assert.equal(h.context.migrationAccountAccess(),true);
  h.context.sdkInvoke=()=>Promise.resolve({success:true,action:'phase_sales_capabilities',savePhaseSales:true,finalizePhaseSales:true,migrationEditor:''});
  await h.context.probePhaseSalesSupport();assert.equal(h.context.migrationAccountAccess(),false);
  h.S.migrationEditor='rbelliveau';
  h.context.sdkInvoke=()=>Promise.reject(Error('unavailable'));
  await h.context.probePhaseSalesSupport();assert.equal(h.context.migrationAccountAccess(),false);
}
console.log('Pro Forma migration access: account-only bypass, original gates restored, locks retained, Under Construction unchanged.');
