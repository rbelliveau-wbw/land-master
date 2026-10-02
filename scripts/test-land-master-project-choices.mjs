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
context.invokeErrorApi=async args=>{assert.equal(args.api_name,'Get_Land_Master_Choices_DEV');assert.equal(args.http_method,'GET');return {code:3000,result:JSON.stringify(choices)};};
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
Object.assign(context,{$:()=>modalNode,withDiscardConfirm:(message,accept)=>accept(),newDefaults:()=>({}),renderPanel:()=>{}});
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

assert.match(source,/searchable-pickers\.js\?v=8\.13\.2/);
assert.match(source,/searchable-pickers\.css\?v=8\.13\.2/);
assert.doesNotMatch(source, /(?:lookup-popup-close|project-popup-close)[^>]*>×/);
