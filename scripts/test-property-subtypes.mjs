import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/land-master/src/app/widget.html','utf8');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync('widgets/land-master/src/app/property-subtypes.js','utf8'),context);
const rules=context.LMPropertySubtypes;
assert.equal(rules.values.length,17);
assert.equal(rules.allowed('Residential','School District'),true);
assert.equal(rules.allowed('Commercial','Personal Property'),true);
assert.equal(rules.allowed('Other','Personal Property'),true);
assert.equal(rules.allowed('Other','Tract'),true);
assert.equal(rules.allowed('Residential','Tract'),true);
for(const type of ['', 'LOI', 'Unknown']){
  assert.equal(rules.disabled([type]),true);
  for(const value of rules.values)assert.equal(rules.allowed(type,value),false);
  assert.equal(rules.allowed(type,''),true);
}
for(const [type,values] of Object.entries(rules.groups)){
  const html=rules.options(type,values[0]);
  assert.equal((html.match(/<optgroup /g)||[]).length,3,'every category stays visible');
  assert.equal((html.match(/<option /g)||[]).length,20,'shared values appear in both relevant categories');
  assert.equal((html.match(/ selected/g)||[]).length,1,'duplicate values cannot select the wrong category');
  for(const [group,groupValues] of Object.entries(rules.groups)){
    const section=html.split(`<optgroup label="${group}">`)[1].split('</optgroup>')[0];
    assert.equal((section.match(/ disabled/g)||[]).length,group===type?0:groupValues.length);
  }
}
assert.match(rules.options(['Other','Commercial'],'Personal Property'),/value="Personal Property" selected/);
assert.doesNotMatch(rules.options(['Other','Commercial'],''),/value="Retail"(?! disabled)/);
assert.match(rules.options('Commercial','School District'),/selected disabled value="School District"/,'opening a legacy mismatch does not silently change the saved value');
assert.throws(()=>rules.prepare({Land_Type:'Commercial'},{Subtype:'School District'}),/available for Commercial/);
assert.throws(()=>rules.prepare({Land_Type:'LOI'},{Subtype:'Tract'}),/blank for LOI/);
assert.throws(()=>rules.prepare(null,{Subtype:'Tract'}),/Reload/);
let data={Land_Type:'Commercial'};rules.prepare({Land_Type:'Residential',Subtype:'School District'},data);assert.equal(data.Subtype,'','type and incompatible subtype clear atomically');
data={Land_Type:'Other'};rules.prepare({Land_Type:'Residential',Subtype:'Tract'},data);assert.equal(Object.hasOwn(data,'Subtype'),false,'shared subtypes survive type changes');
assert.throws(()=>rules.prepare({Land_Type:'Residential'},{Land_Type:'Commercial',Subtype:'School District'}),/available/);
rules.prepare({Land_Type:'Commercial'},{Subtype:'Personal Property'});

const actual=name=>source.slice(source.indexOf('function '+name+'('),source.indexOf('\nfunction ',source.indexOf('function '+name+'(')+1));
const id='9007199254740993123',writes=[];
Object.assign(context,{S:{demo:false,liveSDK:true,properties:[{ID:id,Land_Type:'Residential',Subtype:'School District'}]},
  reportForType:()=> 'All_Property',findIn:(rows,value)=>rows.find(row=>row.ID===value),
  LMData:{request:async(_label,run)=>run()},ZOHO:{CREATOR:{DATA:{updateRecordById:async payload=>{writes.push(payload);return {code:3000};}}}},requireMutationSuccess:response=>response});
vm.runInContext(actual('updateRecord'),context);
await assert.rejects(context.updateRecord(id,{Subtype:'Retail'},'All_Property'),/available/);assert.equal(writes.length,0);
await context.updateRecord(id,{Land_Type:'Commercial'},'All_Property');
assert.equal(writes[0].id,id);assert.equal(writes[0].payload.data.Subtype,'');
await context.updateRecord(id,{Notes:'Unrelated'},'Other_Report');assert.equal(writes[1].payload.data.Subtype,undefined);
assert.match(actual('createRecord'),/LMPropertySubtypes.prepare/);
assert.match(actual('applyBulk'),/ids.forEach[\s\S]*LMPropertySubtypes.prepare[\s\S]*setBulkSaving\(true\)/,'all targets are preflighted before any write');
assert.match(actual('savePanel'),/validatePropertySubtypePanel\(\)/);
assert.match(actual('tableEditorHTML'),/data-show-disabled="1"/);
assert.match(actual('fieldHTML'),/f.subtypeTypes/);
const picker=fs.readFileSync('widgets/land-master/src/app/searchable-pickers.js','utf8');
assert.match(picker,/!active \|\| option.disabled/);
assert.match(picker,/button:not\(:disabled\)/);
assert.match(picker,/active.selectedIndex = option.index/);
console.log('Property Subtype categories, disabled options, blank/LOI rules, shared values, legacy preservation, native payload guards and bulk preflight passed.');
