import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
const adapter=fs.readFileSync('widgets/budget-manager/src/app/creator-data.js','utf8');
function block(name){
  const start=source.indexOf(`function ${name}(`),line=source.indexOf('\n',start);
  const end=source.slice(start,line).trimEnd().endsWith('}')?line:source.indexOf('\n}',start)+2;
  assert.ok(start>=0&&end>start,name);return source.slice(start,end);
}
const plain=value=>JSON.parse(JSON.stringify(value));
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(yes=>{resolve=yes;});return {promise,resolve};}
const ITEM='4410926000009999991',OTHER='4410926000009999992';
const names=['cleanVal','isObj','rawPath','firstRaw','lookupId','getReportCandidates','budgetSdkCode','budgetMissingReport','sdkGetAllRecords',
  'budgetFeature','invalidateBudgetFeature','loadBudgetFeature','budgetFeatureStateHtml','importAssignedItem','importIsMissing',
  'importNativeBudgetCode','importAssignedBudgetCode','importHasDifferentCode','importCodeFilterUnknown','loadImportAssignmentCodes',
  'syncImportAssignmentFilters','setImportAssignmentFilter','importFilteredSorted','importDistinct','populateImportFilter','renderImports',
  'importItemCode','importMajorCode','importMinorCode','importDataSource','importItemDesc','importItemCost','importAssignCellHtml','budgetItemLabel','assignImportItem'];
function row(id,code='AV-010 - Engineering',extra={}){
  return {ID:String(id),Code:'EXTERNAL-GP-010',Subdivision_Code:'AV',Minor_Code:'010',Major_Code:'9999',Cost_Code_Description:'Engineering',Data_Source:'Great Plains',Budget_Item:{ID:ITEM,display_value:code},...extra};
}
function harness({edit=false,view=true}={}){
  const nodes={},calls=[],gate={read:null,denied:false,incomplete:false,omit:false,writeDenied:false};let renders=0;
  const data={items:[]};
  const node=id=>nodes[id]||(nodes[id]={innerHTML:'',textContent:'',value:'',style:{},hidden:false,attrs:{},setAttribute(name,value){this.attrs[name]=value;}});
  const c=vm.createContext({
    S:{liveSDK:true,useMock:false,startupReady:true,importItems:[],allBudgetItems:[],importUI:{search:'',missingOnly:false,differentOnly:false,major:'',minor:'',source:'',sort:'code'}},
    CFG:{reports:{items:'All_Budget_Items'},reportCandidates:{},forms:{importItem:'Budget_Import_Item'},importItemConfig:{budgetItemLookupField:'Budget_Item'}},
    Promise,Error,Date,Number,setTimeout,clearTimeout,
    LMRuntime:{current:()=>({environment:'PRODUCTION',user:'actual-user',appLinkName:'land-master'})},
    ZOHO:{CREATOR:{DATA:{
      async getRecordCount(config){calls.push({kind:'count',config:plain(config)});if(gate.denied)return {code:2898};return {code:3000,result:{records_count:data.items.length+(gate.incomplete?1:0)}};},
      async getRecords(config){calls.push({kind:'read',config:plain(config)});if(gate.read)await gate.read.promise;return {code:3000,data:data.items.map(item=>Object.fromEntries(config.fields.split(',').filter(field=>!(gate.omit&&field==='Budget_Code')).map(field=>[field,item[field]])))};}
    }}},document:{querySelector:()=>null,querySelectorAll:()=>[]},$:node,
    canEditImportItems:()=>edit,canViewImportItems:()=>view,syncBudgetImportBadge(){},importSubCode:rec=>String(rec.Subdivision_Code||''),importSubName:rec=>rec.Subdivision_Code||'',
    v:value=>Number(value||0),esc:value=>String(value??''),escAttr:value=>String(value??''),shortErr:error=>error?.message||String(error),auditLog(){},toastShow(){},setMsg(){},
    importAssignSelectHtml:()=>'<span>Assign</span>',
    async sdkUpdateRecord(form,id,payload){calls.push({kind:'write',form,id,payload:plain(payload)});if(gate.writeDenied)throw new Error('Denied');}
  });
  c.window=c;vm.runInContext(adapter,c);for(const name of names)vm.runInContext(block(name),c);
  c.budgetFeature('imports').status='loaded';c.budgetFeature('import-assignment-items').status='loaded';
  const render=c.renderImports;c.renderImports=()=>{renders++;return render();};
  return {c,nodes,node,calls,data,gate,renders:()=>renders};
}

// The native import key ignores source-specific Code and Major_Code; code text is exact.
{
  const {c}=harness();
  assert.equal(c.importNativeBudgetCode(row('1')),'AV-010');
  for(const external of ['EXT-HJ-010','EXT-GP-010','EXT-B-010'])assert.equal(c.importHasDifferentCode(row('1','AV-010 - Engineering',{Code:external,Major_Code:'7777'})),false);
  assert.equal(c.importHasDifferentCode(row('1','AV-011 - Engineering')),true);
  assert.equal(c.importHasDifferentCode(row('1','av-010 - Engineering')),true,'case remains exact');
  assert.equal(c.importHasDifferentCode(row('1','AV-10 - Engineering')),true,'leading zeroes remain significant');
  assert.equal(c.importHasDifferentCode(row('1','AV-010 — Engineering')),false,'acknowledged widget display format');
  for(const value of [null,'',{},[]])assert.equal(c.importHasDifferentCode(row('1','',{Budget_Item:value})),false,'missing assignments never qualify');
  assert.equal(c.importHasDifferentCode(row('1','AV-010 - Engineering',{Minor_Code:''})),null);
}

// Actual lookup values and exact string-ID matches outrank display labels.
{
  const {c}=harness();
  c.S.allBudgetItems=[{ID:ITEM,Budget_Code:'AV-010'},{ID:OTHER,Budget_Code:'AV-011'}];
  assert.equal(c.importHasDifferentCode(row('1','WRONG-999 - Stale label')),false);
  assert.equal(c.importHasDifferentCode(row('1','AV-010 - Stale label',{Budget_Item:{ID:OTHER,display_value:'AV-010 - Stale label'}})),true);
  assert.equal(c.importHasDifferentCode(row('1','',{Budget_Item:{ID:ITEM,Budget_Code:'AV-012',display_value:'AV-010 - Engineering'}})),true);
  assert.equal(c.importHasDifferentCode(row('1','AV-010 - Engineering',{'Budget_Item.Budget_Code':'AV-012'})),true,'flattened native code outranks the display label');
  c.S.allBudgetItems=[];
  for(const value of [ITEM,{ID:ITEM},{ID:ITEM,display_value:'Unreadable name'}])assert.equal(c.importHasDifferentCode(row('1','',{Budget_Item:value})),null);
}

// Missing native code components remain unknown without downloading unrelated item records.
{
  const h=harness();h.c.S.importItems=[row('1','AV-011 - Engineering',{Minor_Code:''})];
  await h.c.setImportAssignmentFilter('different');
  assert.equal(h.calls.length,0);assert.equal(h.c.S.importUI.differentOnly,false);assert.ok(h.c.S.importCodeFilterError);
  assert.match(h.node('importsTableWrap').innerHTML,/data-imp-id='1'/);
}

// View-only users filter native labels without loading assignment choices or any code roster.
{
  const h=harness();h.c.S.importItems=[row('1'),row('2','AV-011 - Engineering'),row('3','',{Budget_Item:null})];
  await h.c.setImportAssignmentFilter('different');
  assert.equal(h.c.S.importUI.differentOnly,true);assert.deepEqual(h.c.importFilteredSorted().map(item=>item.ID),['2']);
  assert.equal(h.calls.length,0);assert.match(h.node('importsTableWrap').innerHTML,/data-imp-id='2'/);assert.doesNotMatch(h.node('importsTableWrap').innerHTML,/data-imp-id='1'/);
  assert.equal(h.node('importFilterDifferent').attrs['aria-pressed'],'true');
  await h.c.setImportAssignmentFilter('missing');assert.equal(h.c.S.importUI.differentOnly,false);assert.equal(h.c.S.importUI.missingOnly,true);assert.deepEqual(h.c.importFilteredSorted().map(item=>item.ID),['3']);
  await h.c.setImportAssignmentFilter('different');assert.equal(h.c.S.importUI.missingOnly,false);assert.equal(h.c.S.importUI.differentOnly,true);
  await h.c.setImportAssignmentFilter('different');assert.equal(h.c.S.importUI.differentOnly,false);
}

// Search and all existing dropdowns intersect the different-code subset; sorting is retained.
{
  const h=harness();h.c.S.importItems=[row('1','AV-011 - Engineering',{Code:'Z',Major_Code:'2000'}),row('2','AV-012 - Survey',{Code:'A',Cost_Code_Description:'Survey',Major_Code:'2000'}),row('3','AV-013 - Engineering',{Code:'B',Data_Source:'HeavyJob'})];
  await h.c.setImportAssignmentFilter('different');assert.deepEqual(h.c.importFilteredSorted().map(item=>item.ID),['2','3','1']);
  Object.assign(h.c.S.importUI,{major:'2000',source:'Great Plains',minor:'010',search:'engineering'});
  assert.deepEqual(h.c.importFilteredSorted().map(item=>item.ID),['1']);
}

// Only unresolved lookups cause a counted two-field read, shared across repeated activation.
{
  const h=harness(),wait=deferred();h.gate.read=wait;
  h.c.S.importItems=[row('1','',{Budget_Item:{ID:ITEM}}),row('2','',{Budget_Item:{ID:OTHER}})];
  h.data.items=[{ID:ITEM,Budget_Code:'AV-010'},{ID:OTHER,Budget_Code:'AV-011'}];
  const first=h.c.setImportAssignmentFilter('different');await turn();
  assert.equal(h.c.S.importCodeFilterPending,true);assert.equal(h.c.S.importUI.differentOnly,false);assert.match(h.node('importsTableWrap').innerHTML,/data-imp-id='1'/,'normal table remains usable during read');
  await h.c.setImportAssignmentFilter('different');const second=h.c.setImportAssignmentFilter('different');await turn();
  assert.equal(h.calls.filter(call=>call.kind==='read').length,1);
  wait.resolve();await Promise.all([first,second]);assert.equal(h.c.S.importUI.differentOnly,true);
  assert.deepEqual(h.c.importFilteredSorted().map(item=>item.ID),['2']);
  assert.equal(h.calls[1].config.fields,'ID,Budget_Code');assert.equal(h.calls[1].config.field_config,'custom');
  assert.equal(h.c.S.allBudgetItems.length,0,'projection never becomes the editable full roster');
}

// Failed/incomplete/missing projected codes never publish a false empty subset and can retry.
for(const failure of ['denied','incomplete','omit','orphan']){
  const h=harness();h.c.S.importItems=[row('1','',{Budget_Item:{ID:ITEM}})];h.data.items=[{ID:ITEM,Budget_Code:'AV-011'}];
  if(failure==='orphan')h.data.items[0].ID=OTHER;else h.gate[failure]=true;
  await h.c.setImportAssignmentFilter('different');
  assert.equal(h.c.S.importUI.differentOnly,false);assert.ok(h.c.S.importCodeFilterError);assert.equal(h.node('importCodeFilterStatus').hidden,false);assert.match(h.node('importCodeFilterStatus').innerHTML,/Retry/);
  assert.match(h.node('importsTableWrap').innerHTML,/data-imp-id='1'/);assert.doesNotMatch(h.node('importsTableWrap').innerHTML,/No assigned items/);
  h.gate[failure]=false;h.data.items=[{ID:ITEM,Budget_Code:'AV-011'}];await h.c.setImportAssignmentFilter('different',true);
  assert.equal(h.c.S.importUI.differentOnly,true);assert.equal(h.c.S.importCodeFilterError,'');assert.deepEqual(h.c.importFilteredSorted().map(item=>item.ID),['1']);
}

// A real acknowledged reassignment immediately re-filters; a denied write keeps the row.
{
  const h=harness({edit:true});h.c.S.importItems=[row('1','AV-011 - Engineering')];h.c.S.allBudgetItems=[{ID:OTHER,Budget_Code:'AV-010',Item_Name:'Engineering'}];
  await h.c.setImportAssignmentFilter('different');assert.equal(h.c.importFilteredSorted().length,1);
  h.gate.writeDenied=true;h.c.assignImportItem('1',OTHER);await turn();assert.equal(h.c.importFilteredSorted().length,1);
  h.gate.writeDenied=false;h.c.assignImportItem('1',OTHER);await turn();assert.equal(h.c.importFilteredSorted().length,0);assert.match(h.node('importsTableWrap').innerHTML,/No assigned items have a different code/);
}

console.log('Budget import different-code filter checks passed.');
