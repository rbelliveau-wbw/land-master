import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app='widgets/land-master/src/app/';
const source=fs.readFileSync(app+'widget.html','utf8');
function section(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,start);return source.slice(a,b);}
function actual(name){return section('function '+name+'(','\nfunction ');}
const exportSource=fs.readFileSync('creator/exports/Land_Master_2026-08-06.ds','utf8');
const subdivisionForm=exportSource.slice(exportSource.indexOf('form Subdivision'),exportSource.indexOf('\n\t\tform ',exportSource.indexOf('form Subdivision')+1));
assert.match(subdivisionForm,/must have Project\s*\(\s*type = picklist\s*values\s*= Project\.ID\s*displayformat = \[Project_Name\]/,'the existing Subdivision Project lookup resolves Project.ID and displays Project_Name');

const P1='90071992547409931',P2='90071992547409932',C1='90071992547409933',C2='90071992547409934';
const projects=[{ID:P1,Project_Name:'Fixture North'},{ID:P2,Project_Name:'Fixture South'}];
const subdivisions=Array.from({length:348},(_,index)=>({
  ID:(90071992547410000n+BigInt(index)).toString(),Subdivision_Name:'Fixture phase '+(index+1),Subdivision_Code:'F-'+index,
  Project:{ID:index<300?P1:P2,zc_display_value:index<300?'Native North alias':'Native South alias'},
  Company1:{ID:C1,zc_display_value:'Development entity'},Land_Company:{ID:C2,zc_display_value:'Land entity'},Total_Lots:'12',Lots_Sold:'7'
}));
subdivisions[0].Project={ID:P1}; // The exact parent resolves even when native display text is absent.
subdivisions[347].Project=[]; // A genuinely empty association remains Unlinked.
const fixture={All_Property:[{ID:'90071992547409935',Common_Name:'Fixture property',Projects:[{ID:P1,zc_display_value:'Native North alias'},{ID:P2}],Company1:{ID:C2,zc_display_value:'Land entity'},Facility_ID:'000073'}],All_Projects:projects,All_Subdivisions:subdivisions,All_Companies:[{ID:C1,Company_Name:'Development entity'},{ID:C2,Company_Name:'Land entity'}],All_Milestones:[]};
const original=JSON.stringify(fixture),nodes=new Map(),nativeCalls=[],renders=[];
const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',value:'',style:{},disabled:false,classList:{add(){},remove(){},toggle(){}},setAttribute(){},querySelector(){return null;},querySelectorAll(){return [];}});return nodes.get(id);};
const c=vm.createContext({document:{getElementById:node,querySelector:()=>null,querySelectorAll:()=>[]},CFG:{version:'test',tablePageSize:100,reportCandidates:{}},OPTS:{},FILTER_DEFS:{},
  loadLocationChoices:async()=>{},diag(){},beginLoadProgress(){},updateLoadProgress(){},finishLoadProgress(){},setLoadRendering(){},
  requestAnimationFrame:fn=>fn(),setTimeout:fn=>fn(),showAppConfirm(){},closeFilterPopup(){},closeBulkModal(){},renderTable(){},renderCounts(){},renderFilterButtons(){},
  ZOHO:{CREATOR:{DATA:{
    getRecordCount:async config=>{nativeCalls.push({kind:'count',config});return {code:3000,result:{records_count:String(fixture[config.report_name].length)}};},
    getRecords:async config=>{nativeCalls.push({kind:'rows',config});return {code:3000,data:JSON.parse(JSON.stringify(fixture[config.report_name]))};}
  }}}
});c.window=c;
vm.runInContext(fs.readFileSync(app+'runtime-context.js','utf8'),c);c.LMRuntime.apply({envUrlFragment:'/environment/development',loginUser:'fixture'});
vm.runInContext(fs.readFileSync(app+'creator-data.js','utf8'),c);
vm.runInContext(fs.readFileSync(app+'land-data.js','utf8'),c);
vm.runInContext(section('var S =','function $(id)'),c);c.S.liveSDK=true;
vm.runInContext(section('function $(id)','var LOAD_WEIGHTS'),c);
vm.runInContext(section('function responseBad','/* record descriptors */'),c);
vm.runInContext(section('/* record descriptors */','function renderTable'),c);
vm.runInContext(section('function withDiscardConfirm','function inputRaw'),c);
vm.runInContext(section('function setCoreRefreshing','function tableInlineSave'),c);
vm.runInContext(section('function closeProjectPopup','function updateProjectPopupCount'),c);
vm.runInContext(section('function closeLookupPopup','function lookupChoiceRequired'),c);
vm.runInContext(section('function ensureScopeData','$("scopeSeg")'),c);
vm.runInContext(section('function loadData','var lotImport='),c);
Object.assign(c,{setStatus(){},renderBanners(){},renderAll(){renders.push(c.S.scope);},renderPanel(){}});
await c.loadData();
assert.equal(c.S.subdivisions.length,348);assert.equal(c.LandData.coreReady(),true);
assert.equal(c.S.subdivisions[0].Project.ID,P1);assert.equal(c.subdivisionsForProject(P1).length,300);
const groups=c.groupSubs(c.S.subdivisions);
assert.deepEqual(Array.from(groups,group=>[group.name,group.items.length]),[['Fixture North',300],['Fixture South',47],['Unlinked',1]],'all native lookup relationships group by their exact loaded parent; only the empty lookup is Unlinked');
assert.equal(c.colValue(c.S.subdivisions[0],'_project'),'Fixture North');
assert.equal(c.colValue(c.S.subdivisions[1],'_project'),'Fixture North','native display aliases do not replace the exact loaded Project_Name');
assert.equal(c.colValue(c.S.subdivisions[1],'_dev'),'Development entity');assert.equal(c.colValue(c.S.subdivisions[1],'_land'),'Land entity');
assert.equal(c.colValue(c.S.properties[0],'_projects'),'Fixture North, Fixture South');assert.equal(c.projectSummary(c.S.properties[0]),'Fixture North, Fixture South');
c.S.search='Fixture South';assert.equal(c.visibleList().length,1,'actual property search includes resolved native project labels');c.S.search='';
assert.equal(c.asList(c.S.properties[0].Projects)[0].display_value,'Native North alias','existing multi-lookup callers receive the native display alias without changing their stored lookup');
assert.equal(c.displayValue({ID:'native-unloaded',zc_display_value:'Native fallback'},'project'),'Native fallback');
assert.equal(c.displayValue({ID:'legacy-unloaded',display_value:'Legacy fallback'},'project'),'Legacy fallback');
assert.equal(c.displayValue({ID:'both',display_value:'Legacy preferred',zc_display_value:'Native alternate'}),'Legacy preferred');
assert.equal(c.displayValue([],'project'),'');assert.equal(c.lookupId({ID:P1,zc_display_value:'Native alias'}),P1);
assert.equal(c.relHasId(c.S.properties[0].Projects,P2),true);assert.equal(c.S.properties[0].Facility_ID,'000073');

await c.ensureScopeData('subs',c.LandData.generation());c.S.scope='subs';
c.S.expandedGroups={[P1]:true,[P2]:true,unlinked:true};
vm.runInContext(actual('renderTable'),c);c.renderPager=()=>{};c.renderTable();
const table=nodes.get('tableScroll').innerHTML;
assert.equal((table.match(/class="ghead"/g)||[]).length,3);assert.equal((table.match(/class="rec/g)||[]).length,348);
assert.ok(table.includes('data-group="'+P1+'"'));assert.ok(table.includes('data-group="'+P2+'"'));assert.match(table,/1 subdivisions · 7\/12 sold/);
assert.equal(groups.reduce((count,group)=>count+group.items.length,0),348);
assert.equal(c.LandData.status('lots'),'idle','group labels do not trigger inventory or other deferred reads');
assert.equal(nativeCalls.length,9,'the fix preserves four counted core reads and the empty milestone count');
assert.ok(nativeCalls.filter(call=>call.kind==='rows').every(call=>call.config.field_config==='all'&&!Object.hasOwn(call.config,'fields')),'Project is loaded through the unchanged complete-field transport');
assert.equal(JSON.stringify(fixture),original,'label resolution never modifies input lookup associations');
console.log('PASS: Land actual348-row renderer with synthetic native SDK2 lookup labels and exact loaded Project IDs preserves project groups, empty Unlinked, property search/summary, company labels, counts, full-field reads and deferred inventory.');
