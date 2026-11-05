import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
const modelSource=fs.readFileSync('widgets/budget-manager/src/app/budget-import-ledger.js','utf8');
const plain=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function block(name){
  const start=source.indexOf(`function ${name}(`),line=source.indexOf('\n',start);
  const end=source.slice(start,line).trimEnd().endsWith('}')?line:source.indexOf('\n}',start)+2;
  assert.ok(start>=0&&end>start,`Missing production helper: ${name}`);return source.slice(start,end);
}
function install(context,names){for(const name of names)vm.runInContext(block(name),context);}
function modelHarness(){
  const context=vm.createContext({CFG:{importItemConfig:{budgetItemLookupField:'Budget_Item'}},console,document:{activeElement:null,querySelector:()=>null},$:()=>null});
  context.window=context;vm.runInContext(modelSource,context);
  install(context,['cleanVal','isObj','rawPath','firstRaw','importAssignedItem','cssEsc']);
  assert.ok(context.BudgetImportLedger,'The production ledger model is available');
  return context;
}
const c=modelHarness(),ledger=c.BudgetImportLedger;
{
  const labelOnly=ledger.createGroups([{ID:'101',Budget_Item:'AR05-3101 - Clearing Brush',Data_Source:'Great Plains',Cost:'1'},{ID:'102',Budget_Item:'AR05-3101 - Clearing Brush',Data_Source:'Great Plains',Cost:'2'}]);
  assert.equal(labelOnly.length,2,'Scalar display labels cannot establish a shared native identity');
  assert.ok(labelOnly.every(group=>group.missing),'Display-only scalar mappings remain unresolved');
}
const BID='90071992547409931',OTHER='90071992547409932';
const elementNames=['Labor','Materials','Equipment','Subcontractor','Other'];
const parts=values=>Object.fromEntries(elementNames.map((key,index)=>[key,values[index]]));
const row=(id,source,cost,assigned,values=[1,2,3,4,5],extra={})=>({ID:id,Code:'AR05-GP-3101',Cost_Code_Description:'Source Description',Subdivision_Code:'AR05',Major_Code:'3100',Minor_Code:'3101',Data_Source:source,Cost:cost,Budget_Item:assigned,...parts(values),...extra});
function options(extra={}){
  return {assigned:c.importAssignedItem,source:r=>r.Data_Source,major:r=>r.Major_Code,minor:r=>r.Minor_Code,description:r=>r.Cost_Code_Description,code:r=>r.Code,cost:r=>r.Cost,component:ledger.readComponent,different:r=>r.Code_Differs===true,itemById:{[BID]:{ID:BID,Budget_Code:'AR05-3101',Item_Name:'Mapped Name'},[OTHER]:{ID:OTHER,Budget_Code:'AR05-3101',Item_Name:'Different Native Item'}},...extra};
}

// Native optional values preserve unknown, explicit zero, credits and four decimals.
assert.deepEqual(plain(ledger.componentNames),elementNames);
for(const value of [null,undefined,'','  ',true,false,'not a number',NaN,Infinity])assert.equal(ledger.nullableNumber(value),null,`Unknown numeric value ${String(value)}`);
for(const [value,expected]of [[0,0],['0',0],['-45.6789',-45.6789],['$1,234.5678',1234.5678],[{value:'12.3401'},12.3401],[{display_value:'0'},0],[{zc_display_value:'-1.0001'},-1.0001]])assert.equal(ledger.nullableNumber(value),expected);
assert.equal(ledger.readComponent({Labor:'0',Labor_Budget:'99'},'Labor'),0);
assert.equal(ledger.readComponent({Labor:'',Labor_Budget:'99'},'Labor'),null,'A blank renamed field must not revive a legacy amount');
assert.equal(ledger.readComponent({Labor:null,Labor_Budget:'99'},'Labor'),null);
assert.equal(ledger.readComponent({Labor_Budget:'12.3401'},'Labor'),12.3401,'The legacy key is read only when the renamed key is absent');

// The legacy aggregation helper retains its exact native identity/numeric contract.
// The current flat workspace deliberately invokes it once per imported record below.
{
  const records=[
    row('100','HeavyJob Budget','100',{ID:BID,display_value:'AR05-3101 - Mapped Name'}),
    row('101','HeavyJob','12.3401',BID,[0,0,0,0,0]),
    row('102','HeavyJob','-0.3401',{ID:BID},[1,0,0,0,0]),
    row('103','Great Plains','-45.6789',{ID:BID},[-10,-2,-3,-4,-5],{Code_Differs:true}),
    row('104','Great Plains','21',{ID:OTHER},[21,0,0,0,0]),
    row('105','Great Plains','1',null),
    row('106','Great Plains','2',null),
    row('107','Great Plains','3',{display_value:'AR05-3101 - Mapped Name'}),
    row('108','New External System','9',{ID:BID},[9,0,0,0,0])
  ];
  const snapshot=plain(records),groups=ledger.createGroups(records,options());
  assert.equal(groups.length,5,'Two assigned identities plus three distinct unassigned records');
  const group=groups.find(g=>g.budgetItemId===BID);
  assert.ok(group);assert.equal(group.records.length,5);assert.equal(group.item.ID,BID);
  assert.equal(group.sources.budget.total,100);
  assert.equal(group.sources.hcss.total,12,'Multiple records for the same source aggregate once');
  assert.equal(group.sources.hcss.elements.Labor,1);
  assert.equal(group.sources.hcss.elements.Materials,0,'Explicit measured zero remains zero');
  assert.equal(group.sources.gp.total,-45.6789,'Source totals retain signed native four-place values');
  assert.equal(group.sources.gp.elements.Other,-5);
  assert.notEqual(group.sources.gp.total,Object.values(group.sources.gp.elements).reduce((a,b)=>a+b,0),'No element-to-total equality or residual is imposed');
  assert.equal(group.otherSources.length,1);assert.equal(group.otherSources[0].total,9);
  assert.equal(group.different,true);
  const missing=groups.filter(g=>g.missing);
  assert.equal(missing.length,3);assert.equal(new Set(missing.map(g=>g.key)).size,3);
  for(const g of missing){assert.equal(g.records.length,1);assert.equal(g.budgetItemId,'');}
  assert.deepEqual(plain(records),snapshot,'Grouping never rewrites original codes, descriptions, mappings or source-owned amounts');
  assert.equal(group.records[0],records[0],'Source records keep their identity for exact per-record mapping controls');
}

// Missing components cannot quietly understate a grouped amount, while known peers remain available.
{
  const first=row('201','Great Plains','10',{ID:BID},[0,2,3,4,5]);
  const second=row('202','Great Plains','20',{ID:BID},[1,'',0,0,0]);
  const group=ledger.createGroups([first,second],options())[0];
  assert.equal(group.sources.gp.total,30);
  assert.equal(group.sources.gp.elements.Labor,1);
  assert.equal(group.sources.gp.elements.Materials,null,'A missing contributor is unknown, not a partial sum');
  assert.equal(group.sources.gp.elements.Equipment,3);
  assert.equal(group.sources.hcss,null,'An absent source has no invented zero record');
  const missingTotal=ledger.createGroups([first,{...second,Cost:''}],options())[0];
  assert.equal(missingTotal.sources.gp.total,null,'Incomplete source totals do not become a misleading partial total');
}

const workspaceSource=fs.readFileSync('widgets/budget-manager/src/app/budget-import-workspace.js','utf8');
function workspaceHarness(){
  const c=modelHarness(),calls=[],messages=[],domNodes={},handlers={};
  domNodes.vImports={addEventListener(type,handler){handlers[type]=handler;},querySelectorAll:()=>[],querySelector:()=>({focus(){}})};
  const permissions={view:true,edit:true},session={key:'PRODUCTION|native-user'};
  c.S={view:'vImports',features:{},importUI:{subdivision:'',search:'',sort:'code',major:'',minor:'',source:''},importItems:[{ID:'editor-only'}],importItemsLoaded:true};
  install(c,['budgetFeature','invalidateBudgetFeature','loadBudgetFeature']);
  vm.runInContext(workspaceSource,c);
  let readImpl=async(report,criteria)=>{
    const match=criteria.match(/== "([^"]+)"/),subdivisions=match?[match[1]]:['AR05','AR06'];
    return subdivisions.map(sub=>report==='imports'?row('workspace-'+sub,'Great Plains','12.3401',{ID:sub==='AR05'?BID:OTHER},[0,1,2,3,4],{Subdivision_Code:sub}):{ID:sub==='AR05'?BID:OTHER,Budget_Code:sub+'-3101',Item_Name:'Stored Item',Subdivision_Code:sub,GP_Labor_Actuals:'0'});
  };
  const deps={state:c.S,config:{reports:{importItems:'imports',items:'items'}},node:id=>domNodes[id]||null,escape:String,escapeAttr:String,clean:value=>value==null?'':String(value).trim(),
    canView:()=>permissions.view,canEdit:()=>permissions.edit,scope:()=>session.key,read:(report,criteria,options)=>{calls.push({report,criteria,options});return readImpl(report,criteria,options);},
    feature:c.budgetFeature,loadFeature:c.loadBudgetFeature,assigned:c.importAssignedItem,source:r=>r.Data_Source,major:r=>r.Major_Code,minor:r=>r.Minor_Code,description:r=>r.Cost_Code_Description,code:r=>r.Code,subCode:r=>r.Subdivision_Code,subName:r=>r.Subdivision_Code,itemSubCode:r=>r.Subdivision_Code,different:()=>false,assignHtml:()=>'',badge(){},onError:error=>messages.push(error)};
  const controller=c.BudgetImportWorkspace.create(deps);
  return {c,controller,calls,permissions,session,deps,domNodes,handlers,messages,setRead:fn=>{readImpl=fn;}};
}

// The tab opens All Subdivisions; selecting a subdivision narrows both counted reads.
{
  const h=workspaceHarness();
  await h.controller.open();await h.controller.load();assert.equal(h.calls.length,2,'Opening the tab loads the complete global scope once');
  assert.deepEqual(h.calls.map(call=>[call.report,call.criteria]),[['imports',''],['items','']]);
  assert.equal(h.controller.rows().length,2,'All Subdivisions includes both authorized subdivisions');
  h.c.S.importUI.subdivision='AR05';h.c.S.view='vBudgets';
  await h.controller.load();assert.equal(h.calls.length,2,'Selecting scope outside the Import Items tab performs no reads');
  h.c.S.view='vImports';h.permissions.view=false;
  await h.controller.load();assert.equal(h.calls.length,2,'Missing View permission cannot trigger native reads');
  h.permissions.view=true;
  await h.controller.load();
  assert.deepEqual(h.calls.slice(2).map(call=>[call.report,call.criteria]),[['imports','(Subdivision_Code == "AR05")'],['items','(Budget.Subdivision_Code == "AR05")']]);
  assert.equal(h.controller.rows()[0].ID,'workspace-AR05');assert.equal(h.controller.items()[0].ID,BID);
  assert.equal(h.c.S.importItems[0].ID,'editor-only','Scoped workspace publication cannot replace the complete editor import snapshot');
  const reads=h.calls.length;await h.controller.load();assert.equal(h.calls.length,reads,'Reopening a complete scope uses its counted cache');
  h.c.S.importUI.subdivision='';await h.controller.load();assert.equal(h.calls.length,reads,'Clearing the subdivision reuses the complete global cache');
  assert.equal(h.controller.rows().length,2,'Cleared subdivision means All Subdivisions, not an empty workspace');
  h.permissions.view=false;assert.equal(h.controller.rows().length,0);assert.equal(h.controller.items().length,0,'Loss of access hides cached data immediately');
}

// The actual clear action returns to the global cache while retaining the chosen review mode.
{
  const h=workspaceHarness();await h.controller.open();
  h.c.S.importUI.subdivision='AR05';await h.controller.load();
  Object.assign(h.c.S.importUI,{missingOnly:true,differentOnly:false,major:'3100',minor:'3101',source:'Great Plains'});
  const clear={hasAttribute:name=>name==='data-import-clear'};
  h.handlers.click({target:{closest:()=>clear}});
  for(let i=0;i<5;i++)await turn();
  assert.equal(h.c.S.importUI.subdivision,'');assert.equal(h.controller.current().subdivision,'');
  assert.equal(h.controller.rows().length,2,'The clear button publishes All Subdivisions rather than an empty state');
  assert.equal(h.c.S.importUI.missingOnly,true,'The database-wide Missing Item review remains selected');
  for(const field of ['major','minor','source'])assert.equal(h.c.S.importUI[field],'','Subdivision-specific filters clear with the scope');
  assert.equal(h.calls.length,4,'Clear reuses the global cache instead of issuing duplicate complete reads');
}

// Flat workspace rows preserve independent imports, original identity and source amounts.
{
  const h=workspaceHarness();
  const sourceRows=[row('90071992547409940','Great Plains','0',{ID:BID}),row('90071992547409941','HeavyJob','-25.1234',{ID:BID}),row('90071992547409942','HeavyJob Budget','',null,[0,0,0,0,0],{Subdivision_Code:'AR06'})];
  h.setRead(async report=>report==='imports'?sourceRows:[{ID:BID,Budget_Code:'AR05-3101',Item_Name:'Mapped Item',Subdivision_Code:'AR05'}]);
  await h.controller.open();const groups=h.controller.groups();
  assert.equal(groups.length,3,'A shared Budget Item lookup never combines imported records in the flat workspace');
  assert.deepEqual(plain(groups.map(group=>group.key)),sourceRows.map(record=>'import:'+record.ID));
  for(let index=0;index<groups.length;index++){
    const group=groups[index];assert.equal(group.records.length,1);assert.equal(group.records[0],sourceRows[index]);
    assert.equal(group.label,sourceRows[index].Cost_Code_Description,'The imported description remains visible rather than being replaced by the mapped name');
    assert.equal(group.code,sourceRows[index].Code,'The original imported code remains visible');
  }
  assert.equal(groups[0].sources.gp.total,0);assert.equal(groups[1].sources.hcss.total,-25.1234);assert.equal(groups[2].sources.budget.total,null);
  assert.equal(groups[0].sources.hcss,null,'An absent source remains unavailable, not zero');
}

// An earlier global request cannot overwrite a newer explicit subdivision selection.
{
  const h=workspaceHarness(),globalGate=deferred();
  h.setRead((report,criteria)=>{
    const sub=criteria?'AR05':'AR06',value=report==='imports'?[row('loaded-'+sub,'Great Plains','1',{ID:BID},[0,0,0,0,0],{Subdivision_Code:sub})]:[{ID:BID,Subdivision_Code:sub}];
    return criteria?Promise.resolve(value):globalGate.promise.then(()=>value);
  });
  const global=h.controller.open();await turn();
  h.c.S.importUI.subdivision='AR05';await h.controller.load();assert.equal(h.controller.rows()[0].ID,'loaded-AR05');
  globalGate.resolve();await global;assert.equal(h.controller.rows()[0].ID,'loaded-AR05','Late global results cannot replace a selected subdivision');
  h.c.S.importUI.subdivision='';await h.controller.load();assert.equal(h.controller.rows()[0].ID,'loaded-AR06','Clearing returns to the separately cached complete global read');
}

// Pending duplicate opens share requests; older subdivisions may cache but cannot publish over selection.
{
  const h=workspaceHarness(),old=deferred(),fresh=deferred();h.c.S.importUI.subdivision='AR05';
  h.setRead((report,criteria)=>{
    const sub=criteria.includes('AR05')?'AR05':'AR06',gate=sub==='AR05'?old:fresh;
    return gate.promise.then(()=>report==='imports'?[row('loaded-'+sub,'Great Plains','1',{ID:BID},[0,0,0,0,0],{Subdivision_Code:sub})]:[{ID:BID,Subdivision_Code:sub}]);
  });
  const a=h.controller.load(),duplicate=h.controller.load();await turn();assert.equal(h.calls.length,2,'Duplicate opens share one import and one Budget Item read');
  h.c.S.importUI.subdivision='AR06';assert.equal(h.controller.rows().length,0,'Previous subdivision data disappears as soon as scope changes');
  const b=h.controller.load();await turn();assert.equal(h.calls.length,4);
  fresh.resolve();await b;assert.equal(h.controller.rows()[0].ID,'loaded-AR06');
  old.resolve();await Promise.all([a,duplicate]);assert.equal(h.controller.rows()[0].ID,'loaded-AR06','A late old response cannot overwrite the selected subdivision');
  h.c.S.importUI.subdivision='AR05';await h.controller.load();assert.equal(h.controller.rows()[0].ID,'loaded-AR05');assert.equal(h.calls.length,4,'A complete old scope remains reusable under its own key');
}

// A fresh generation wins even when an older request for the same scope finishes last.
{
  const h=workspaceHarness(),old=deferred(),fresh=deferred();let reads=0;h.c.S.importUI.subdivision='AR05';
  h.setRead((report)=>{
    const version=reads++<2?'old':'fresh',gate=version==='old'?old:fresh;
    return gate.promise.then(()=>report==='imports'?[row(version,'Great Plains','1',{ID:BID},[0,0,0,0,0])]:[{ID:BID,Subdivision_Code:'AR05'}]);
  });
  const first=h.controller.load();const rejects=assert.rejects(first,/superseded/);await turn();
  const second=h.controller.load(true);await turn();fresh.resolve();await second;assert.equal(h.controller.rows()[0].ID,'fresh');
  old.resolve();await rejects;assert.equal(h.controller.rows()[0].ID,'fresh');
}

// Actor/environment identity belongs to the cache key and the read cancellation predicate.
{
  const h=workspaceHarness();h.c.S.importUI.subdivision='AR05';await h.controller.load();
  const previous=h.calls[0].options;h.session.key='DEVELOPMENT|different-user';
  assert.equal(previous.isCancelled(),true);assert.equal(h.controller.rows().length,0);
  await h.controller.load();assert.equal(h.calls.length,4,'A different native session must query its own scope');
  h.permissions.view=false;assert.equal(h.calls[2].options.isCancelled(),true);
}

// Wrong-scope native rows fail closed. A denied scoped item read never substitutes a global roster.
{
  const h=workspaceHarness();h.c.S.importUI.subdivision='AR05';
  h.setRead(async report=>report==='imports'?[row('wrong','Great Plains','1',{ID:BID},[0,0,0,0,0],{Subdivision_Code:'AR06'})]:[]);
  await assert.rejects(h.controller.load(),/selected subdivision/);assert.equal(h.controller.rows().length,0);
  h.setRead(async report=>{if(report==='items')throw {permissionDenied:true,message:'Scoped items denied'};return [row('allowed-import','Great Plains','2',null,[0,0,0,0,0])];});
  await h.controller.load(true);assert.equal(h.controller.rows()[0].ID,'allowed-import');assert.equal(h.controller.items().length,0);
  assert.equal(h.controller.current().itemError.permissionDenied,true);
  assert.ok(h.calls.every(call=>call.criteria.includes('Subdivision_Code == "AR05"')),'No failure path requests an unscoped roster');
  h.setRead(async report=>report==='imports'?[]:[{ID:BID,Subdivision_Code:'AR06'}]);
  await assert.rejects(h.controller.load(true),/selected subdivision/);
}

// A genuine import permission failure removes an old authorized workspace snapshot immediately.
{
  const h=workspaceHarness();h.c.S.importUI.subdivision='AR05';await h.controller.load();assert.equal(h.controller.rows().length,1);
  h.setRead(async report=>{if(report==='imports')throw {permissionDenied:true,message:'Imports denied'};return [];});
  await assert.rejects(h.controller.load(true),error=>error.permissionDenied===true);
  assert.equal(h.controller.current(),null);assert.equal(h.controller.rows().length,0);assert.equal(h.controller.items().length,0);
  assert.equal(h.c.S.importItems[0].ID,'editor-only','A workspace permission failure cannot rewrite the separate editor snapshot');
}

// Navigating away while an import read is pending cannot publish or repaint an inactive workspace.
{
  const h=workspaceHarness(),gate=deferred();h.c.S.importUI.subdivision='AR05';
  h.setRead(report=>gate.promise.then(()=>report==='imports'?[row('late','Great Plains','1',{ID:BID})]:[]));
  const pending=h.controller.load();await turn();h.c.S.view='vBudgets';gate.resolve();await pending;
  assert.equal(h.c.S.importWorkspaceData,undefined,'Inactive navigation leaves publication to a subsequent explicit tab open');
  h.c.S.view='vImports';await h.controller.open();assert.equal(h.controller.rows()[0].ID,'late','The completed native response is reusable only when the selected tab reopens');
}

// The real scheduler never reads imports; explicit editor detail still retains its dedicated loader.
assert.doesNotMatch(block('scheduleBudgetBadgeSummaries'),/loadImportItems|loadImportWorkspace|reports\.importItems/);
assert.match(block('loadBudgetElementImports'),/loadImportItems\(false\)/);
assert.match(block('loadImportItems'),/S\.importItems=rows/,'Editor completeness remains separate from scoped workspace state');

// Native assignment preserves exact IDs, permissions and the existing single-field adapter write.
{
  const h=workspaceHarness(),writes=[],gate=deferred();h.c.S.importUI.subdivision='AR05';await h.controller.load();
  const record=h.controller.rows()[0];record.Budget_Item=null;
  const globalFeature=h.c.budgetFeature('imports');globalFeature.status='loaded';const generation=globalFeature.generation;
  h.c.S.elementImportSource={old:true};
  Object.assign(h.c,{findImportRecord:id=>h.controller.rows().find(r=>r.ID===id),canEditImportItems:()=>h.permissions.edit,budgetItemsForSubCode:()=>h.controller.items(),importSubCode:r=>r.Subdivision_Code,budgetItemLabel:item=>item.Budget_Code+' — '+item.Item_Name,
    budgetBadgeScope:()=>h.session.key,setMsg:message=>h.messages.push(message),toastShow(){},renderImports(){},shortErr:error=>error.message||String(error),auditLog(){},sdkUpdateRecord:(form,id,payload)=>{writes.push({form,id,payload:plain(payload)});return gate.promise;}});
  h.c.CFG.forms={importItem:'Budget_Import_Item'};install(h.c,['normSubCode','assignImportItem']);
  h.permissions.edit=false;h.c.assignImportItem(record.ID,BID,null);assert.equal(writes.length,0);
  h.permissions.edit=true;h.c.assignImportItem(record.ID,OTHER,null);assert.equal(writes.length,0,'An item outside scoped choices cannot be assigned');
  h.c.assignImportItem(record.ID,BID,null);assert.deepEqual(writes,[{form:'Budget_Import_Item',id:record.ID,payload:{Budget_Item:BID}}]);
  assert.equal(record.Budget_Item,null,'A pending native write cannot report the assignment as saved');
  gate.resolve({code:3000,data:{ID:record.ID}});await turn();assert.equal(record.Budget_Item.ID,BID);
  assert.equal(h.c.S.importItemsLoaded,false);assert.equal(h.c.S.elementImportSource,null);assert.equal(globalFeature.status,'idle');assert.equal(globalFeature.generation,generation+1);
  assert.equal(h.messages.length,2,'Only the denied-permission and unavailable-item attempts report errors; successful focus restoration cannot fall into catch');
}

// An acknowledged mapping updates every completed cache containing the native import ID.
for(const writeSubdivision of ['', 'AR05']){
  const h=workspaceHarness(),writes=[],toasts=[];let repaints=0;
  const importedId='90071992547409940';
  h.setRead(async(report,criteria)=>{
    const subdivisions=criteria?['AR05']:['AR05','AR06'];
    return subdivisions.map(sub=>report==='imports'?row(sub==='AR05'?importedId:'90071992547409941','Great Plains','1',null,[0,0,0,0,0],{Subdivision_Code:sub}):{ID:sub==='AR05'?BID:OTHER,Budget_Code:sub+'-3101',Item_Name:'Stored Item',Subdivision_Code:sub});
  });
  await h.controller.open();const globalSnapshot=h.controller.current();
  h.c.S.importUI.subdivision='AR05';await h.controller.load();const scopedSnapshot=h.controller.current();
  assert.notEqual(globalSnapshot.rows[0],scopedSnapshot.rows[0],'Native reads produce independent global/scoped record objects');
  h.c.S.importUI.subdivision=writeSubdivision;await h.controller.load();
  Object.assign(h.c,{findImportRecord:id=>h.controller.rows().find(record=>record.ID===id),canEditImportItems:()=>h.permissions.edit,budgetItemsForSubCode:()=>h.controller.items(),importSubCode:record=>record.Subdivision_Code,budgetItemLabel:item=>item.Budget_Code+' — '+item.Item_Name,
    budgetBadgeScope:()=>h.session.key,setMsg:message=>h.messages.push(message),toastShow:message=>toasts.push(message),renderImports:()=>repaints++,shortErr:error=>error.message||String(error),auditLog(){},sdkUpdateRecord:async(form,id,payload)=>{writes.push({form,id,payload:plain(payload)});}});
  h.c.CFG.forms={importItem:'Budget_Import_Item'};install(h.c,['normSubCode','assignImportItem']);
  h.c.assignImportItem(importedId,BID,null);for(let i=0;i<3;i++)await turn();
  assert.equal(globalSnapshot.rows[0].Budget_Item.ID,BID);assert.equal(scopedSnapshot.rows[0].Budget_Item.ID,BID,'Both captured cache snapshots receive the exact acknowledged lookup');
  const opposite=writeSubdivision?'':'AR05',reads=h.calls.length;h.c.S.importUI.subdivision=opposite;await h.controller.load();
  assert.equal(h.calls.length,reads,'Changing to an already loaded scope keeps its native cache');
  assert.equal(h.controller.rows().find(record=>record.ID===importedId).Budget_Item.ID,BID,'Reopening a cached opposite scope cannot revive the missing mapping');
  assert.equal(h.controller.groups().filter(group=>group.missing).length,opposite?0:1,'The cached scope reports its updated complete missing count');
  assert.deepEqual(writes,[{form:'Budget_Import_Item',id:importedId,payload:{Budget_Item:BID}}]);
  assert.equal(repaints,1);assert.ok(toasts.includes('Budget Item Assigned'));assert.deepEqual(h.messages,[],'Success focus restoration reports no assignment error');
}

// A pre-ack opposite-scope read is superseded instead of publishing its older mapping.
{
  const h=workspaceHarness(),stale=deferred();let saved=false,repaints=0;
  const importedId='90071992547409940';
  h.setRead((report,criteria)=>{
    const value=report==='imports'?[row(importedId,'Great Plains','1',saved?{ID:BID}:null,[0,0,0,0,0])]:[{ID:BID,Budget_Code:'AR05-3101',Item_Name:'Stored Item',Subdivision_Code:'AR05'}];
    return criteria&&!saved?stale.promise.then(()=>value):Promise.resolve(value);
  });
  await h.controller.open();const globalSnapshot=h.controller.current();h.c.S.importUI.subdivision='AR05';
  const pending=h.controller.load(),rejected=assert.rejects(pending,/superseded/);await turn();
  const key='import-workspace:'+h.session.key+'|ar05',feature=h.c.budgetFeature(key),generation=feature.generation;
  assert.equal(feature.status,'loading');h.c.S.importUI.subdivision='';await h.controller.load();
  Object.assign(h.c,{findImportRecord:id=>h.controller.rows().find(record=>record.ID===id),canEditImportItems:()=>true,budgetItemsForSubCode:()=>h.controller.items(),importSubCode:record=>record.Subdivision_Code,budgetItemLabel:item=>item.Budget_Code+' — '+item.Item_Name,
    budgetBadgeScope:()=>h.session.key,setMsg:message=>h.messages.push(message),toastShow(){},renderImports:()=>repaints++,shortErr:error=>error.message||String(error),auditLog(){},sdkUpdateRecord:async()=>{saved=true;}});
  h.c.CFG.forms={importItem:'Budget_Import_Item'};install(h.c,['normSubCode','assignImportItem']);
  h.c.assignImportItem(importedId,BID,null);for(let i=0;i<3;i++)await turn();
  assert.equal(feature.generation,generation+1);assert.equal(feature.status,'idle','Acknowledgement invalidates an earlier pending workspace read');
  stale.resolve();await rejected;assert.equal(repaints,1,'The late opposite-scope response never repaints the current workspace');
  assert.equal(h.controller.current(),globalSnapshot);assert.equal(globalSnapshot.rows[0].Budget_Item.ID,BID);
  h.c.S.importUI.subdivision='AR05';await h.controller.load();assert.equal(h.controller.rows()[0].Budget_Item.ID,BID,'Revisiting the invalidated scope reads the current native mapping');
  assert.deepEqual(h.messages,[]);
}

// A delayed acknowledgement from an older actor cannot patch or invalidate newer actor caches.
{
  const h=workspaceHarness(),write=deferred();let repaints=0;
  const importedId='90071992547409940';
  h.setRead(async report=>report==='imports'?[row(importedId,'Great Plains','1',null,[0,0,0,0,0])]:[{ID:BID,Budget_Code:'AR05-3101',Item_Name:'Stored Item',Subdivision_Code:'AR05'}]);
  await h.controller.open();const captured=h.controller.rows()[0];
  Object.assign(h.c,{findImportRecord:id=>h.controller.rows().find(record=>record.ID===id),canEditImportItems:()=>true,budgetItemsForSubCode:()=>h.controller.items(),importSubCode:record=>record.Subdivision_Code,budgetItemLabel:item=>item.Budget_Code+' — '+item.Item_Name,
    budgetBadgeScope:()=>h.session.key,setMsg:message=>h.messages.push(message),toastShow(){},renderImports:()=>repaints++,shortErr:error=>error.message||String(error),auditLog(){},sdkUpdateRecord:()=>write.promise});
  h.c.CFG.forms={importItem:'Budget_Import_Item'};install(h.c,['normSubCode','assignImportItem']);
  h.c.assignImportItem(importedId,BID,null);h.session.key='PRODUCTION|new-user';await h.controller.open();
  const newSnapshot=h.controller.current(),feature=h.c.budgetFeature('import-workspace:'+h.session.key+'|'),generation=feature.generation;
  assert.notEqual(newSnapshot.rows[0],captured);write.resolve();for(let i=0;i<3;i++)await turn();
  assert.equal(captured.Budget_Item.ID,BID,'The captured record still completes its own native acknowledgement');
  assert.equal(newSnapshot.rows[0].Budget_Item,null);assert.equal(feature.status,'loaded');assert.equal(feature.generation,generation,'The new actor cache and generation remain untouched');
  assert.equal(repaints,0);assert.deepEqual(h.messages,[]);
}

// Delayed native acknowledgements finish the captured record without touching a new workspace/actor.
for(const change of ['subdivision','actor','view']){
  const h=workspaceHarness(),gate=deferred(),toasts=[];let repaints=0;h.c.S.importUI.subdivision='AR05';await h.controller.load();
  const original=h.controller.rows()[0],target=h.controller.items()[0];original.Budget_Item=null;
  const mirror={...original};h.c.S.importItems=[mirror];
  const globalFeature=h.c.budgetFeature('imports');globalFeature.status='loaded';const generation=globalFeature.generation;
  const oldElements={old:true};h.c.S.elementImportSource=oldElements;h.c.S.importItemsLoaded=true;
  Object.assign(h.c,{findImportRecord:id=>original.ID===id?original:null,canEditImportItems:()=>h.permissions.edit,budgetItemsForSubCode:()=>[target],importSubCode:r=>r.Subdivision_Code,budgetItemLabel:item=>item.Budget_Code+' — '+item.Item_Name,
    budgetBadgeScope:()=>h.session.key,setMsg:message=>h.messages.push(message),toastShow:message=>toasts.push(message),renderImports:()=>repaints++,shortErr:error=>error.message||String(error),auditLog(){},sdkUpdateRecord:()=>gate.promise});
  h.c.CFG.forms={importItem:'Budget_Import_Item'};install(h.c,['normSubCode','assignImportItem']);
  h.c.assignImportItem(original.ID,BID,null);assert.equal(original.Budget_Item,null);
  if(change==='subdivision'){h.c.S.importUI.subdivision='AR06';await h.controller.load();}
  if(change==='actor')h.session.key='PRODUCTION|another-user';
  if(change==='view')h.c.S.view='vBudgets';
  target.Item_Name='Different Roster Label After Navigation';
  gate.resolve({code:3000,data:{ID:original.ID}});await turn();
  assert.equal(original.Budget_Item.ID,BID);assert.equal(original.Budget_Item.display_value,'AR05-3101 — Stored Item','The acknowledgement uses its captured scoped item label');
  if(change==='actor'){
    assert.equal(mirror.Budget_Item,null,'A different actor does not receive a late global mirror patch');
    assert.equal(h.c.S.elementImportSource,oldElements);assert.equal(h.c.S.importItemsLoaded,true);assert.equal(globalFeature.generation,generation);
  }else{
    assert.equal(mirror.Budget_Item.ID,BID,'Same-actor global import identity mirrors the actual acknowledged assignment after navigation');
    assert.equal(h.c.S.elementImportSource,null);assert.equal(h.c.S.importItemsLoaded,false);assert.equal(globalFeature.status,'idle');assert.equal(globalFeature.generation,generation+1);
  }
  assert.equal(repaints,0,'A late assignment cannot repaint a different subdivision, actor or view');
  if(change==='subdivision')assert.equal(h.controller.rows()[0].ID,'workspace-AR06');
  assert.equal(toasts.includes('Budget Item Assigned'),false,'A success popup cannot cross subdivision, view or actor navigation');
}

// Real wrapper: assignment invalidation + fresh completion must survive an older read's late failure.
{
  const h=workspaceHarness(),write=deferred(),oldRead=deferred(),freshRead=deferred(),reads=[];let badgeUpdates=0,editorUpdates=0;
  h.c.S.importUI.subdivision='AR05';await h.controller.load();
  const original=h.controller.rows()[0],target=h.controller.items()[0];original.Budget_Item=null;
  h.c.S.importItems=[{...original}];h.c.S.importItemsLoaded=true;const feature=h.c.budgetFeature('imports'),generation=feature.generation;
  Object.assign(h.c,{findImportRecord:()=>original,canEditImportItems:()=>true,budgetItemsForSubCode:()=>[target],importSubCode:r=>r.Subdivision_Code,budgetItemLabel:item=>item.Budget_Code+' — '+item.Item_Name,
    budgetBadgeScope:()=>h.session.key,setMsg(){},toastShow(){},renderImports(){throw new Error('Inactive workspace must not redraw');},shortErr:error=>error.message||String(error),auditLog(){},sdkUpdateRecord:()=>write.promise,
    sdkGetAllRecords:(report,criteria,options)=>{reads.push({report,criteria,options:plain(options)});return reads.length===1?oldRead.promise:freshRead.promise;},
    syncBudgetImportBadge:()=>badgeUpdates++,refreshBudgetElementValues:()=>{editorUpdates++;h.c.S.elementImportSource=h.c.S.importItemsLoaded?{record:h.c.S.importItems[0].ID}:null;}});
  h.c.CFG.forms={importItem:'Budget_Import_Item'};h.c.CFG.reports={importItems:'imports'};
  install(h.c,['normSubCode','assignImportItem','loadImportItems']);
  const pending=h.c.loadImportItems(false),rejected=assert.rejects(pending,/superseded/);await turn();
  h.c.assignImportItem(original.ID,BID,null);h.c.S.view='vEditor';
  write.resolve();await turn();assert.equal(feature.generation,generation+1);assert.equal(h.c.S.importItemsLoaded,false);
  const freshRows=[{...original}],fresh=h.c.loadImportItems(false);await turn();freshRead.resolve(freshRows);await fresh;
  assert.equal(h.c.S.importItemsLoaded,true);assert.equal(h.c.S.importItems,freshRows);assert.equal(feature.status,'loaded');
  const elementSource=h.c.S.elementImportSource,badges=badgeUpdates,editors=editorUpdates;
  oldRead.resolve([{ID:'stale-unassigned',Budget_Item:null}]);await rejected;
  assert.equal(h.c.S.importItems,freshRows);assert.equal(h.c.S.importItems[0].Budget_Item.ID,BID);
  assert.equal(h.c.S.importItemsLoaded,true,'The older wrapper error cannot clear fresh completeness');
  assert.equal(h.c.S.elementImportSource,elementSource);assert.equal(badgeUpdates,badges);assert.equal(editorUpdates,editors,'A superseded wrapper cannot refresh the current editor');
  assert.deepEqual(reads,[{report:'imports',criteria:'',options:{fresh:false}},{report:'imports',criteria:'',options:{fresh:false}}],'The race uses only the existing complete import report read');
  h.c.S.importItemsLoaded=false;await h.c.loadImportItems(false);assert.equal(reads.length,2);assert.equal(h.c.S.importItemsLoaded,true,'A current loaded-cache result repairs its completeness flag');
  h.c.sdkGetAllRecords=async()=>{throw {permissionDenied:true,message:'Current imports denied'};};
  await assert.rejects(h.c.loadImportItems(true),error=>error.permissionDenied===true);
  assert.equal(feature.generation,generation+2,'Force increments before the wrapper captures its generation');
  assert.equal(h.c.S.importItemsLoaded,false,'A real current-generation permission failure still removes completeness');assert.equal(feature.status,'error');
}

// Even a cache-hit microtask may be superseded before its wrapper callback runs.
{
  const h=workspaceHarness();let badgeUpdates=0,editorUpdates=0;h.c.S.view='vEditor';
  const feature=h.c.budgetFeature('imports');feature.status='loaded';feature.value=[{ID:'cached'}];h.c.S.importItems=feature.value;h.c.S.importItemsLoaded=false;
  Object.assign(h.c,{sdkGetAllRecords(){throw new Error('A valid cache hit performs no native read');},syncBudgetImportBadge:()=>badgeUpdates++,refreshBudgetElementValues:()=>editorUpdates++});
  install(h.c,['loadImportItems']);const cached=h.c.loadImportItems(false),rejected=assert.rejects(cached,/superseded/);h.c.invalidateBudgetFeature('imports');await rejected;
  assert.equal(h.c.S.importItemsLoaded,false);assert.equal(badgeUpdates,1,'Only the current request-start badge is allowed');assert.equal(editorUpdates,0);
}

// All fixed headings, tabs and field labels on the new surface use Title Case.
for(const title of ['Construction Budget','HCSS Actuals','GP Actuals','Cost Element','Source Total','Stored Total','Element Breakdown','Original Import Record','Cost To Complete','External Cost Code ID','Updated Date','Import Status','Error Response'])assert.ok(workspaceSource.includes(title),title);
assert.doesNotMatch(workspaceSource,/Construction budget|HCSS actuals|GP actuals|Element breakdown|Original import records|Cost to complete|Import status|Error response/);
assert.ok(/<script[^>]+src=["'][^"']*budget-import-ledger\.js(?:\?[^"']*)?["']/.test(source),'Widget loads the ledger model');
assert.ok(/<script[^>]+src=["'][^"']*budget-import-workspace\.js(?:\?[^"']*)?["']/.test(source),'Widget loads the global/scoped flat workspace');

console.log('Budget Import Ledger regression checks passed.');
