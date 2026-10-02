import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('widgets/land-master/src/app/widget.html','utf8');
function section(start,end){return source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));}
const fields={City:'Houston',County:'Harris',Territory:'South Austin',Project_Name:'Example',Company1:'4410926000000000001'};
const context=vm.createContext({OPTS:{},S:{choicesReady:false,projects:[{ID:'4410926000000000002',Territory:'Houston'}]},
  projectFieldValue:field=>fields[field]||'',defaultSubName:()=> 'Phase 1',lookupId:value=>String(value?.ID||value||''),findIn:(list,id)=>list.find(r=>String(r.ID)===String(id)),
  LOCATION_CHOICES_SNAPSHOT:JSON.parse(fs.readFileSync('creator/app-variables/location-choices.json','utf8')),auditOnly:(label,details,isErr)=>{assert.equal(isErr,false);assert.equal(details.source,"saved app-variable snapshot");},LMRuntime:{apiName:name=>name+'_DEV'},parseFunctionResult:r=>({ok:r.code===3000,result:r.result})});
vm.runInContext(section('function applyLocationChoices','function loadData'),context);
vm.runInContext(section('function subdivisionPayloadFromRow','function createStagedSubdivisions'),context);
vm.runInContext(section('function inheritSubdivisionTerritory','function savePanel(){'),context);
const choices={City:['Houston',' Austin ','Houston'],County:['Harris','Bell'],Territory:['Houston','South Austin']};
context.applyLocationChoices(choices);
assert.deepEqual(Array.from(context.OPTS.projectCity),['Houston','Austin']);
assert.equal(context.OPTS.projectCity,context.OPTS.subCity);
assert.equal(context.OPTS.propertyCounty,context.OPTS.lotCounty);
assert.throws(()=>context.applyLocationChoices({City:[],County:[]}),/Territory/);
context.invokeErrorApi=async args=>{assert.equal(args.api_name,'Get_Land_Master_Choices_DEV');assert.equal(args.http_method,'GET');assert.equal(Object.hasOwn(args,'query_params'),false,'the native SDK GET request must omit unused query parameters');return {code:3000,result:JSON.stringify(choices)};};
await context.loadLocationChoices();
assert.equal(context.S.choicesReady,true);
context.invokeErrorApi=async()=>({code:5000,result:'bad'});
await context.loadLocationChoices();
assert.equal(context.S.choicesReady,true);
assert.equal(context.S.choicesSource,'snapshot');
assert.ok(context.OPTS.projectCity.includes('Houston'));
context.invokeErrorApi=async()=>{throw {code:9350,message:'Custom API does not exist'};};
await context.loadLocationChoices();
assert.equal(context.S.choicesReady,true);
assert.equal(context.OPTS.territory.length,10);
context.applyLocationChoices(choices);
let choiceGeneration=1,releaseOldChoice;
context.LandData={generation:()=>choiceGeneration};context.LMLandData={cancelled:()=>Object.assign(new Error('Load superseded.'),{cancelled:true})};
context.invokeErrorApi=()=>new Promise(resolve=>{releaseOldChoice=resolve;});
const staleChoice=context.loadLocationChoices(1).catch(error=>error);choiceGeneration=2;
context.applyLocationChoices({City:['Current City'],County:['Current County'],Territory:['Current Territory']});
releaseOldChoice({code:3000,result:choices});assert.equal((await staleChoice).cancelled,true);
assert.deepEqual(Array.from(context.OPTS.projectCity),['Current City'],'a stale location-choice response must not replace the new generation choices or apply the fallback');
context.applyLocationChoices(choices);
let data=context.subdivisionPayloadFromRow({name:'Phase A',phase:'2',territory:'WRONG',devCompany:'4410926000000000003'},'4410926000000000002');
assert.equal(data.Territory,'South Austin','phase inherits current Project choice rather than an old row choice');
assert.equal(data.City,'Houston');assert.equal(data.County,'Harris');
assert.equal(data.Project,'4410926000000000002');assert.equal(data.Company1,'4410926000000000003');
fields.Territory='';
assert.equal(context.subdivisionPayloadFromRow({},'4410926000000000002').Territory,undefined);
data={Project:'4410926000000000002'};
context.inheritSubdivisionTerritory(data,{},true);
assert.equal(data.Territory,'Houston');
data={Notes:'untouched'};
assert.equal(context.inheritSubdivisionTerritory(data,{Project:{ID:'4410926000000000002'}},false),null,'unrelated edits preserve saved subdivision Territory');
data={Project:''};context.inheritSubdivisionTerritory(data,{},false);assert.equal(data.Territory,'');
const project=section('} else if(type==="project")', '} else if(type==="milestone")');
assert.match(project,/F\("Territory","Territory","select"/);
assert.doesNotMatch(project,/F\("Proforma"/);
assert.doesNotMatch(section('function subdivisionSubformInner','function subdivisionSubformHTML'),/data-sub-field="territory"|<th>Territory<\/th>/);
assert.doesNotMatch(source,/Record fields|Ctrl\/Cmd-click/);
assert.match(source,/inheritSubdivisionTerritory\(data,rec,S.editorNew\)/);
console.log('Land Master shared choices, API errors, Territory inheritance, and editor contracts passed.');

const modalNode={classList:{add:()=>{}},setAttribute:()=>{}};
// Entry-point routing is tested here; the actual asynchronous editor controller is exercised by test-land-master-lazy-data.mjs.
Object.assign(context,{$:()=>modalNode,withDiscardConfirm:(message,accept)=>accept(),startEditorRequest(type){context.S.editorType=type;context.S.modalOpen=true;}});
const modalStart=source.indexOf('function openNewEditor('),modalEnd=source.indexOf('\n',modalStart);
vm.runInContext(source.slice(modalStart,modalEnd),context);
for(const type of ['property','project','subdivision','company','lot','builder','takedown','builderTakedown']){
 context.S.liveSDK=true;context.S.choicesReady=false;context.S.modalOpen=false;
 context.openNewEditor(type);assert.equal(context.S.modalOpen,true,type+' must open');assert.equal(context.S.editorType,type);
}
const picker=fs.readFileSync('widgets/land-master/src/app/searchable-pickers.js','utf8');
vm.runInContext(picker.slice(picker.indexOf('  function label('),picker.indexOf('  function selected(')),context);
for(const [input,expected] of [['Edit Subtype','Subtype'],['Edit Land type','Land Type'],['Search and edit County','County'],['City *','City']]){
 assert.equal(context.label({getAttribute:()=>input}),expected);
}
console.log('All New modals open after API failure; saved choices and clean search labels passed.');

const currentVersion=JSON.parse(fs.readFileSync('widgets/land-master/widget.config.json','utf8')).version;
assert.ok(source.includes(`searchable-pickers.js?v=${currentVersion}"`),'picker script uses the configured release version');
assert.ok(source.includes(`searchable-pickers.css?v=${currentVersion}"`),'picker stylesheet uses the configured release version');
assert.doesNotMatch(source, /(?:lookup-popup-close|project-popup-close)[^>]*>×/);
