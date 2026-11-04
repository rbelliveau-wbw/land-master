import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('creator/functions/globalCityPolicy.dg');
const catalog=read('creator/exports/Land_Master_2026-11-02-catalog.ds');
const match=catalog.match(/thisapp\.variables\.City = (\[[^\n]+\]);/);
assert.ok(match,'the native export supplies the authoritative fixture');
const globals=JSON.parse(match[1]);
assert.equal(globals.length,76);
assert.match(source,/^map globalCityPolicy\(list requestedCities, list savedCities, bool allowRetained\)/);
assert.match(source,/\n\treturn response;\n}\s*$/,'Creator requires an unconditional outer return');
assert.match(source,/globalChoices = thisapp\.variables\.City;/);
assert.doesNotMatch(source,/\.toString\(|\.trim\(|toLowerCase|toUpperCase|\b(?:while|containsKey|insert into|delete from|sendmail|invokeurl)\b/);
assert.doesNotMatch(source,/\b(?:Contract|Project|Subdivision|Lots|Property)\s*\[/,'the helper neither queries nor changes records');
assert.doesNotMatch(source,/(?:Pflugerville|Lorena|Killeen|Austin|"N")/,'no copied choices or legacy exception');

const {js}=translate(source);
const context=vm.createContext({fixture:JSON.stringify(globals)});
vm.runInContext(`
 var appCities=JSON.parse(fixture),globalReads=0;
 var thisapp={variables:{get City(){globalReads++;return appCities;}}};
 function Map(){return {put(k,v){this[k]=v;},get(k){return Object.hasOwn(this,k)?this[k]:null;}};}
 function List(){return [];}
 function ifnull(value,fallback){return value==null?fallback:value;}
 // Native isText returns null for list/map/boolean, false for numeric values/text.
 function isText(value){
   if(Array.isArray(value)||(value!==null&&typeof value==='object')||typeof value==='boolean')return null;
   if(typeof value!=='string')return false;
   return value.trim()===''||!Number.isFinite(Number(value));
 }
 Array.prototype.add=function(value){this.push(value);};
 Array.prototype.contains=function(value){return this.includes(value);};
 Array.prototype.size=function(){return this.length;};
 ${js}
`,context);

function execute(requested=[],saved=[],retained=false){
 context.requestedFixture=JSON.stringify(requested);context.savedFixture=JSON.stringify(saved);context.allowRetainedFixture=retained;
 return JSON.parse(vm.runInContext('JSON.stringify(globalCityPolicy(JSON.parse(requestedFixture),JSON.parse(savedFixture),allowRetainedFixture))',context));
}
function setGlobals(values){context.globalFixture=JSON.stringify(values);vm.runInContext('appCities=JSON.parse(globalFixture)',context);}
const frozenInputs={requested:['Temple'],saved:['N']};
for(const city of globals){
 const result=execute([city]);
 assert.equal(result.ok,true,city);assert.equal(result.retained,false);assert.equal(result.message,'');assert.deepEqual(result.choices,globals);
}
assert.deepEqual(execute(),{choices:globals,ok:true,retained:false,message:''},'optional blank is an empty list');
assert.deepEqual(execute(['Temple','Lorena','Temple']).choices,globals,'requests do not reorder global choices');
const future='Future Global City';
const readsBefore=context.globalReads;
setGlobals([...globals,future]);
assert.equal(execute([future]).ok,true,'future additions are accepted from the current app variable');
assert.ok(execute().choices.includes(future));
assert.equal(context.globalReads,readsBefore+2,'each policy invocation reads the current variable');
setGlobals(globals);
assert.equal(execute([future]).ok,false,'a previous call cannot cache a removed global choice');

for(const city of ['N','Arbitrary New City',' Pflugerville ','pflugerville','']){
 assert.equal(execute([city]).ok,false,JSON.stringify(city));
 assert.equal(execute([city],[city],false).ok,false,'saved values never grant retention without caller eligibility');
}
const retained=execute(['Temple','N'],['N','N'],true);
assert.equal(retained.ok,true);assert.equal(retained.retained,true);assert.equal(retained.message,'');
assert.deepEqual(retained.choices,[...globals,'N'],'one current saved legacy choice is appended without changing canonical order');
const loaded=execute([],['N'],true);
assert.equal(loaded.ok,true);assert.equal(loaded.retained,false);assert.deepEqual(loaded.choices,[...globals,'N']);
assert.deepEqual(execute([],['N'],false).choices,globals,'ineligible saved legacy choices are hidden');
for(const request of [['N','Other Legacy'],['Temple','Other Legacy'],['Other Legacy','N']]){
 const rejected=execute(request,['N'],true);
 assert.equal(rejected.ok,false,'every requested legacy value must already be saved');
 assert.equal(rejected.retained,false,'a partial retained match never marks a rejected request retained');
 assert.deepEqual(rejected.choices,globals,'failed validation does not expose partial legacy choices');
}
assert.deepEqual(execute(['Legacy Two','Legacy One'],['Legacy One','Legacy Two'],true).choices,[...globals,'Legacy One','Legacy Two']);
setGlobals(globals.filter(city=>city!=='Temple'));
assert.equal(execute(['Temple']).ok,false);
assert.equal(execute(['Temple'],['Temple'],true).retained,true,'removed global values can stay only under caller-established retention');
setGlobals(globals);

// No member is stringified into a City; null/blank is represented by an empty list.
for(const malformed of [null,0,123,true,false,[],['Temple'],{City:'Temple'},{display_value:'Temple'}]){
 assert.equal(execute([malformed]).ok,false,'malformed request '+JSON.stringify(malformed));
 assert.equal(execute(['Temple'],[malformed],true).ok,false,'malformed saved value '+JSON.stringify(malformed));
}
assert.equal(execute(null).ok,false);assert.equal(execute([],null,true).ok,false);
const requestCopy=structuredClone(frozenInputs.requested),savedCopy=structuredClone(frozenInputs.saved);
assert.equal(execute(frozenInputs.requested,frozenInputs.saved,true).ok,true);
assert.deepEqual(frozenInputs.requested,requestCopy);assert.deepEqual(frozenInputs.saved,savedCopy);
assert.deepEqual(context.appCities,vm.runInContext('JSON.parse(fixture)',context),'app variable is never mutated');
for(const invalidGlobal of [null,[],[''],['Temple',null],['Temple',['N']],['Temple',{City:'N'}]]){
 setGlobals(invalidGlobal);
 const result=execute([],['N'],true);
 assert.equal(result.ok,false,'missing/malformed global configuration fails closed');
 assert.deepEqual(result.choices,[]);assert.equal(result.retained,false);assert.match(result.message,/unavailable/);
}
setGlobals(['Temple','Temple','Waco']);
assert.deepEqual(execute().choices,['Temple','Waco'],'duplicate globals preserve first-seen canonical order');
console.log('PASS globalCityPolicy actual Deluge body: all 76 globals, live future additions/removals, exact legacy retention, strict members, optional blanks, invalid-config fail-closed, and no source/input mutations. Native compilation remains a separate check.');
