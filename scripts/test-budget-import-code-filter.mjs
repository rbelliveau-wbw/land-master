import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
const ledgerSource=fs.readFileSync('widgets/budget-manager/src/app/budget-import-ledger.js','utf8');
const workspaceSource=fs.readFileSync('widgets/budget-manager/src/app/budget-import-workspace.js','utf8');
function block(name){
  const start=source.indexOf(`function ${name}(`),line=source.indexOf('\n',start);
  const end=source.slice(start,line).trimEnd().endsWith('}')?line:source.indexOf('\n}',start)+2;
  assert.ok(start>=0&&end>start,name);return source.slice(start,end);
}
const ITEM='4410926000009999991',OTHER='4410926000009999992';
const functions=['cleanVal','isObj','rawPath','firstRaw','lookupId','budgetFeature','invalidateBudgetFeature','loadBudgetFeature',
  'importAssignedItem','importIsMissing','importNativeBudgetCode','importAssignedBudgetCode','importHasDifferentCode','setImportAssignmentFilter',
  'importSubCode','importItemCode','importMajorCode','importMinorCode','importDataSource','importItemDesc','budgetItemSubCode'];
function row(id,code='AV-010 - Engineering',extra={}){
  return {ID:String(id),Code:'AV-GP-010',Subdivision_Code:'AV',Minor_Code:'010',Major_Code:'9999',Cost_Code_Description:'Engineering',Data_Source:'Great Plains',Cost:'20',Labor:'0',Materials:'0',Equipment:'0',Subcontractor:'0',Other:'20',Budget_Item:{ID:ITEM,display_value:code},...extra};
}
function harness(){
  const calls=[],permissions={view:true,edit:false},data={imports:[],items:[],denyItems:false};
  const host={innerHTML:'',setAttribute(){},closest:()=>null,querySelectorAll:()=>[]};
  const c=vm.createContext({S:{view:'vImports',features:{},importItems:[],allBudgetItems:[],budgets:[],importUI:{subdivision:'AV',search:'',missingOnly:false,differentOnly:false,major:'',minor:'',source:'',sort:'code'}},
    CFG:{reports:{importItems:'All_Budget_Item_Imports',items:'All_Budget_Items'},importItemConfig:{budgetItemLookupField:'Budget_Item',importSubCodeFields:['Subdivision_Code'],itemSubCodeFields:['Subdivision_Code','Budget.Subdivision_Code']}},
    Promise,Error,Date,Number,document:{activeElement:null}});
  c.window=c;vm.runInContext(ledgerSource,c);vm.runInContext(workspaceSource,c);for(const name of functions)vm.runInContext(block(name),c);
  const controller=c.BudgetImportWorkspace.create({state:c.S,config:c.CFG,node:id=>id==='importsTableWrap'?host:null,escape:value=>String(value??''),escapeAttr:value=>String(value??''),clean:c.cleanVal,
    canView:()=>permissions.view,canEdit:()=>permissions.edit,scope:()=> 'PRODUCTION|actual-user',feature:c.budgetFeature,loadFeature:c.loadBudgetFeature,
    async read(report,criteria,options){calls.push({report,criteria,options});const sub=criteria.match(/== "([^"]+)"/);if(report===c.CFG.reports.items&&data.denyItems)throw {permissionDenied:true,message:'Budget Items denied'};return (report===c.CFG.reports.items?data.items:data.imports).filter(record=>!sub||record.Subdivision_Code===sub[1]);},
    assigned:c.importAssignedItem,source:c.importDataSource,major:c.importMajorCode,minor:c.importMinorCode,description:c.importItemDesc,code:c.importItemCode,subCode:c.importSubCode,subName:c.importSubCode,itemSubCode:c.budgetItemSubCode,different:c.importHasDifferentCode,assignHtml:()=>'<span>Assignment</span>',badge(){},onError(){}});
  c.importWorkspaceController=()=>controller;return {c,controller,host,calls,data,permissions};
}
const item=(id,code)=>({ID:id,Budget_Code:code,Item_Name:'Scoped Budget Item',Subdivision_Code:'AV'});

// Native comparison uses subdivision/minor, retaining case and zeroes, never the GP/HJ/B marker.
{
  const {c}=harness();assert.equal(c.importNativeBudgetCode(row('1')),'AV-010');
  for(const marker of ['HJ','GP','B'])assert.equal(c.importHasDifferentCode(row('1','AV-010 - Engineering',{Code:'AV-'+marker+'-010',Major_Code:'7777'})),false);
  assert.equal(c.importHasDifferentCode(row('1','AV-011 - Engineering')),true);
  assert.equal(c.importHasDifferentCode(row('1','av-010 - Engineering')),true);
  assert.equal(c.importHasDifferentCode(row('1','AV-10 - Engineering')),true);
  assert.equal(c.importHasDifferentCode(row('1','AV-010 — Engineering')),false);
  for(const value of [null,'',{},[],{display_value:'AV-010 - Label Only'},'AV-010 - Label Only'])assert.equal(c.importHasDifferentCode(row('1','',{Budget_Item:value})),false);
  assert.equal(c.importHasDifferentCode(row('1','AV-010 - Engineering',{Minor_Code:''})),null);
}

// Scoped exact IDs outrank stale labels; embedded/flattened native code dereferences retain precedence.
{
  const h=harness();h.data.items=[item(ITEM,'AV-010'),item(OTHER,'AV-011')];await h.controller.load();
  assert.equal(h.c.importHasDifferentCode(row('1','WRONG-999 - Stale Label')),false);
  assert.equal(h.c.importHasDifferentCode(row('1','AV-010 - Stale Label',{Budget_Item:{ID:OTHER,display_value:'AV-010 - Stale Label'}})),true);
  assert.equal(h.c.importHasDifferentCode(row('1','AV-010 - Engineering',{'Budget_Item.Budget_Code':'AV-012'})),true);
  assert.equal(h.c.importHasDifferentCode(row('1','',{Budget_Item:{ID:ITEM,Budget_Code:'AV-012',display_value:'AV-010 - Engineering'}})),true);
  assert.equal(h.calls.length,2);assert.ok(h.calls.every(call=>call.criteria.includes('Subdivision_Code == "AV"')));
  assert.equal(h.c.S.allBudgetItems.length,0,'Scoped item fields do not populate the global roster');
}

// Different Code lists only the mismatching native record, even when peers share its Budget Item.
{
  const h=harness();h.data.items=[item(ITEM,'AV-011'),item(OTHER,'AV-010')];
  h.data.imports=[row('gp','AV-011 - Engineering',{Minor_Code:'011'}),row('hcss','AV-011 - Engineering',{Data_Source:'HeavyJob',Code:'AV-HJ-010',Cost:'30'}),row('budget','AV-011 - Engineering',{Data_Source:'HeavyJob Budget',Code:'AV-B-011',Minor_Code:'011',Cost:'40'}),row('matched','AV-010 - Matched',{Budget_Item:{ID:OTHER}}),row('missing','',{Budget_Item:null})];
  await h.controller.load();const reads=h.calls.length;
  assert.equal(h.c.importHasDifferentCode(h.data.imports[0]),false);assert.equal(h.c.importHasDifferentCode(h.data.imports[1]),true);
  await h.c.setImportAssignmentFilter('different');assert.equal(h.c.S.importUI.differentOnly,true);assert.equal(h.c.S.importUI.missingOnly,false);
  assert.match(h.host.innerHTML,/data-import-ledger-key="import:hcss"/);
  for(const id of ['gp','budget','matched','missing'])assert.ok(!h.host.innerHTML.includes('data-import-ledger-key="import:'+id+'"'),'Exclude unrelated imported record '+id);
  const groups=h.controller.groups().filter(g=>g.budgetItemId===ITEM);assert.equal(groups.length,3);assert.ok(groups.every(g=>g.records.length===1),'Shared mapping targets do not consolidate source rows');
  assert.equal(groups.find(g=>g.key==='import:gp').sources.gp.total,20);assert.equal(groups.find(g=>g.key==='import:hcss').sources.hcss.total,30);assert.equal(groups.find(g=>g.key==='import:budget').sources.budget.total,40);
  assert.equal(h.calls.length,reads,'Filtering never downloads a global code projection');
  await h.c.setImportAssignmentFilter('missing');assert.equal(h.c.S.importUI.differentOnly,false);assert.equal(h.c.S.importUI.missingOnly,true);assert.match(h.host.innerHTML,/data-import-ledger-key="import:missing"/);assert.doesNotMatch(h.host.innerHTML,/data-import-ledger-key="import:hcss"/);
  await h.c.setImportAssignmentFilter('different');assert.equal(h.c.S.importUI.missingOnly,false);assert.equal(h.c.S.importUI.differentOnly,true);
  await h.c.setImportAssignmentFilter('different');assert.equal(h.c.S.importUI.differentOnly,false);
}

// Search/source filters apply to individual imported records without adding shared-target siblings.
{
  const h=harness();h.data.items=[item(ITEM,'AV-011'),item(OTHER,'AV-012')];h.data.imports=[row('engineering-gp','',{Code:'Z-GP',Major_Code:'2000'}),row('engineering-hcss','',{Code:'Z-HJ',Data_Source:'HeavyJob',Major_Code:'2000'}),row('survey','',{Budget_Item:{ID:OTHER},Code:'A-GP',Cost_Code_Description:'Survey',Major_Code:'3000'})];
  await h.controller.load();await h.c.setImportAssignmentFilter('different');Object.assign(h.c.S.importUI,{major:'2000',source:'Great Plains',minor:'010',search:'engineering'});h.controller.render();
  assert.match(h.host.innerHTML,/data-import-ledger-key="import:engineering-gp"/);assert.doesNotMatch(h.host.innerHTML,/data-import-ledger-key="import:engineering-hcss"|data-import-ledger-key="import:survey"/);
}

// Unavailable codes remain unknown, never false differences or a reason to fetch an unrelated roster.
for(const shape of [ITEM,{ID:ITEM},{ID:ITEM,display_value:'Unreadable Name'}]){
  const h=harness();h.data.imports=[row('unknown','',{Budget_Item:shape})];await h.controller.load();assert.equal(h.c.importHasDifferentCode(h.controller.rows()[0]),null);assert.equal(h.controller.groups()[0].different,null);
  const reads=h.calls.length;await h.c.setImportAssignmentFilter('different');assert.doesNotMatch(h.host.innerHTML,/data-import-ledger-key="import:unknown"/);assert.equal(h.calls.length,reads);
  await h.c.setImportAssignmentFilter('different');assert.match(h.host.innerHTML,/data-import-ledger-key="import:unknown"/);
}

// Item permission failure remains visible without inventing codes or falling back globally.
{
  const h=harness();h.data.imports=[row('unknown','',{Budget_Item:{ID:ITEM}})];h.data.denyItems=true;await h.controller.load();assert.match(h.host.innerHTML,/Budget Item Details Unavailable/);assert.equal(h.controller.items().length,0);
  await h.c.setImportAssignmentFilter('different');assert.equal(h.c.importHasDifferentCode(h.controller.rows()[0]),null);assert.equal(h.calls.length,2);assert.ok(h.calls.every(call=>call.criteria.includes('Subdivision_Code == "AV"')));
}

// Blank subdivision is a working global review scope; inactive and unauthorized views remain guarded.
{
  const h=harness();h.c.S.view='vBudgets';await h.c.setImportAssignmentFilter('different');assert.equal(h.c.S.importUI.differentOnly,false);
  h.c.S.view='vImports';h.c.S.importUI.subdivision='';await h.controller.load();await h.c.setImportAssignmentFilter('different');assert.equal(h.c.S.importUI.differentOnly,true);assert.equal(h.calls.length,2);assert.ok(h.calls.every(call=>call.criteria===''));
  h.c.S.importUI.differentOnly=false;h.c.S.importUI.subdivision='AV';h.permissions.view=false;await h.c.setImportAssignmentFilter('different');assert.equal(h.c.S.importUI.differentOnly,false);await h.controller.load();assert.equal(h.calls.length,2);
}

// Both review modes cover every subdivision, with stable row identity and native per-row comparison.
{
  const h=harness();h.c.S.importUI.subdivision='';
  h.data.items=[item(ITEM,'AV-011'),{...item(OTHER,'BR-020'),Subdivision_Code:'BR'}];
  h.data.imports=[
    row('av-different','',{Budget_Item:{ID:ITEM}}),
    row('av-missing','',{Budget_Item:null}),
    row('br-different','',{Subdivision_Code:'BR',Minor_Code:'021',Budget_Item:{ID:OTHER}}),
    row('br-matched','',{Subdivision_Code:'BR',Minor_Code:'020',Budget_Item:{ID:OTHER}}),
    row('br-missing','',{Subdivision_Code:'BR',Budget_Item:null}),
    row('br-unknown','',{Subdivision_Code:'BR',Budget_Item:{ID:'4410926000008888888'}})
  ];
  await h.controller.open();assert.equal(h.controller.rows().length,6);assert.equal(h.controller.groups().length,6);
  assert.ok(h.calls.every(call=>call.criteria===''),'Global reports omit subdivision criteria');
  await h.c.setImportAssignmentFilter('different');
  for(const id of ['av-different','br-different'])assert.ok(h.host.innerHTML.includes('data-import-ledger-key="import:'+id+'"'));
  for(const id of ['av-missing','br-missing','br-matched','br-unknown'])assert.ok(!h.host.innerHTML.includes('data-import-ledger-key="import:'+id+'"'));
  await h.c.setImportAssignmentFilter('missing');
  for(const id of ['av-missing','br-missing'])assert.ok(h.host.innerHTML.includes('data-import-ledger-key="import:'+id+'"'));
  for(const id of ['av-different','br-different','br-matched','br-unknown'])assert.ok(!h.host.innerHTML.includes('data-import-ledger-key="import:'+id+'"'));
  assert.equal(h.c.importHasDifferentCode(h.data.imports.at(-1)),null,'Unresolved native codes remain unknown in the global review');
  await h.c.setImportAssignmentFilter('all');assert.equal(h.c.S.importUI.missingOnly,false);assert.equal(h.c.S.importUI.differentOnly,false);
  for(const record of h.data.imports)assert.ok(h.host.innerHTML.includes('data-import-ledger-key="import:'+record.ID+'"'));
  assert.doesNotMatch(h.host.innerHTML,/class="il-major"/,'The entire database remains a flat list');
}

// Repeated comparisons reuse the same code index, while a new authoritative roster refreshes it.
{
  const h=harness();h.data.items=[item(ITEM,'AV-010')];await h.controller.load();
  h.c.importHasDifferentCode(row('first'));const index=h.c.S.importCodeItemIndex;
  for(let i=0;i<50;i++)assert.equal(h.c.importHasDifferentCode(row('repeat-'+i)),false);
  assert.equal(h.c.S.importCodeItemIndex,index,'A fresh concat must not rebuild the full item index once per import');
  h.c.S.importWorkspaceData.items=[item(ITEM,'AV-011')];
  assert.equal(h.c.importHasDifferentCode(row('fresh')),true,'New roster array invalidates the cached code index');
  assert.notEqual(h.c.S.importCodeItemIndex,index);
}

console.log('Budget Import Code Filter: native exact comparison, database-wide review, independent records, unknown codes, permissions and stable item index passed.');
