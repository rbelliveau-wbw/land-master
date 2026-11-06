import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from '../../../scripts/lib/deluge-pdf-test-runtime.mjs';

const folder=new URL('./',import.meta.url),root=new URL('../../../',import.meta.url);
const read=relative=>fs.readFileSync(new URL(relative,root),'utf8');
const local=relative=>fs.readFileSync(new URL(relative,folder),'utf8');
const manifest=JSON.parse(local('consumers.json'));
const catalog=read(manifest.source_catalog),globals=JSON.parse(catalog.match(/thisapp\.variables\.City = (\[[^\n]+\]);/)[1]);
const policy=translate(read('creator/functions/globalCityPolicy.dg')).js;
const permission=translate(read('creator/functions/hasConstructionPermission.dg')).js;
assert.equal(manifest.consumers.length,10);assert.equal(manifest.consumers.filter(c=>c.selection==='single').length,7);assert.equal(manifest.consumers.filter(c=>c.selection==='multi').length,3);
assert.equal(globals.length,76);
const SID='90071992547409931',SID2='90071992547409932',PID='90071992547409933',CID='90071992547409934';
const byForm=name=>manifest.consumers.find(c=>c.form===name);
const compile=source=>translate('string runBinding()\n{\n'+source.replace(/alert\s+([^;]+);/g,'throw Error($1);').replace(/cancel submit;/g,'').replace(/clear City;/g,'clearCity();').replace(/City:ui\.add\(/g,'addCityChoices(')+'\nreturn "ok";\n}').js;
const compiled=new Map();
for(const c of manifest.consumers){
 for(const kind of ['on_load','on_validate']){
  const source=local(c[kind]);compiled.set(c.form+':'+kind,compile(source));
  assert.equal((source.match(/thisapp\.globalCityPolicy\(/g)||[]).length,1,'one shared policy call per binding');
  assert.doesNotMatch(source,/variables\.(?:City|City_Legacy)|Pflugerville|Lorena|"N"|\b(?:insert into|delete from|sendmail|invokeurl|while\s*\(|containsKey)/,'wrappers do not copy authority, data writes or legacy exceptions');
  if(c.mode==='persisted')assert.match(source,new RegExp('sharedCityStored = '+c.form+'\\[ID == input.ID\\]'));
  else assert.doesNotMatch(source,/sharedCityStored\s*=/,'transient/filter values cannot borrow persisted legacy eligibility');
 }
 assert.equal(c.allow_other_choices_target,c.selection==='single'?true:null,'multi-select has no Allow Other Choices promise');
 const formStart=catalog.indexOf('\t\tform '+c.form+'\n'),tail=catalog.slice(formStart),next=tail.slice(1).search(/\n\t\tform /);
 const native=next<0?tail:tail.slice(0,next+1);
 const field=native.match(/^\t\t\t(?<required>must have (?:unique )?)?City\n\s*\((?<body>.*?)^\t\t\t\)/ms);
 assert.ok(field,c.form+' native field exists');assert.equal(!!field.groups.required,c.mandatory,c.form+' requirement unchanged');assert.match(field.groups.body,new RegExp('type = '+c.native_type+'\\b'));
}
const repositoryBefore=read('creator/workflows/Field_Validations_Contrac.dg'),original=local('native-before/Contract.Field_Validations_Contrac.dg'),merged=local('Contract.Field_Validations_Contrac.merged.dg');
const codeTokens=source=>source.replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*|\s+/g,token=>token.startsWith('"')?token:'');
const rejectionGuard=read('creator/schema-changes/construction-rejection-2026-11-06/Contract.Construction_Rejection.validate.dg');
assert.equal(codeTokens(repositoryBefore),codeTokens(rejectionGuard.trimEnd()+'\n\n'+original.trimEnd()+'\n\n'+local(byForm('Contract').on_validate)),'current native mirror preserves the historical Contract rules and City suffix plus only the new rejection guard');
assert.equal(merged,repositoryBefore.trimEnd()+'\n','generated integration copy follows the current native mirror');
assert.equal((merged.match(/thisapp\.globalCityPolicy\(/g)||[]).length,1,'regeneration may not duplicate the existing City policy');
assert.ok(merged.lastIndexOf('input.City = requestSubdivision.City;')<merged.indexOf('sharedCityRequested ='));
compiled.set('Contract:merged',compile(merged));

function inputFor(c,city,extra={}){
 return {ID:null,City:c.selection==='multi'?(city==null?null:[city]):city,Project:PID,Subdivision1:[SID],Subdivision:SID,Contract_Type:'Issue',Work_Module:'Legal',Status:'New',Parent_Contract:null,Builder:null,Contract_Actions:[],Approvals1:[],...extra};
}
function run(c,input,{saved=null,cities=globals,load=false,sourceTables={},mergedContract=false,editor=true,submitter=true}={}){
 const context=vm.createContext({fixture:JSON.stringify({input,saved,cities,sourceTables,editor,submitter,form:c.form})});
 vm.runInContext(`
  var fixture=JSON.parse(fixture),input=fixture.input,tables=fixture.sourceTables;
  tables[fixture.form]=fixture.saved?[fixture.saved]:[];
  tables.User_Access=[{ID:'77',User:'native-actor',Edit_All_Construction_Requests:fixture.editor,Submit_Construction_Requests:fixture.submitter}];
  var globalReads=0,zoho={loginuser:'native-actor'},thisapp={variables:{get City(){globalReads++;return fixture.cities;}},permissions:{profileForUser(){return '';},isUserInProfile(){return false;}}};
  function List(){return [];}function Map(){return {put(k,v){this[k]=v;},get(k){return Object.hasOwn(this,k)?this[k]:null;}};}
  function ifnull(v,f){return v==null?f:v;}
  function isText(v){if(Array.isArray(v)||(v!==null&&typeof v==='object')||typeof v==='boolean')return null;if(typeof v!=='string')return false;return v.trim()===''||!Number.isFinite(Number(v));}
  Array.prototype.contains=function(v){return this.includes(v);};Array.prototype.add=function(v){this.push(v);};Array.prototype.size=Array.prototype.count=function(){return this.length;};
  String.prototype.toLong=function(){return this.toString();};
  function record(row){return new Proxy(row||{},{get(o,k){return o[k]??null;}});}
  function query(form,predicate){var rows=(tables[form]||[]).map(record).filter(predicate);return new Proxy(rows,{get(o,k){return k in o||typeof k==='symbol'?o[k]:o[0]?.[k]??null;}});}
  var uiChoices=['Original mounted native choice'],uiReplaced=false;function clearCity(){uiChoices=[];uiReplaced=true;input.City=null;}function addCityChoices(v){uiChoices=Array.from(v);}
  ${policy}
  thisapp.globalCityPolicy=globalCityPolicy;
  ${permission}
  thisapp.hasConstructionPermission=hasConstructionPermission;
  ${compiled.get(c.form+':'+(mergedContract?'merged':load?'on_load':'on_validate'))}
  var result=runBinding();
 `,context);
 return JSON.parse(JSON.stringify({input:context.input,choices:context.uiChoices,uiReplaced:context.uiReplaced,result:context.result,globalReads:context.globalReads,tables:context.tables}));
}

const future='Future Global City';
for(const c of manifest.consumers){
 for(const city of globals){
  const input=inputFor(c,city),result=run(c,input);
  assert.deepEqual(result.input,input,c.form+' validation does not write values');assert.equal(result.globalReads,1);
 }
 const input=inputFor(c,future),futureOptions={cities:[...globals,future]};
 assert.doesNotThrow(()=>run(c,input,futureOptions),c.form+' policy accepts a future global addition');
 const loaded=run(c,input,{...futureOptions,load:true});assert.ok(loaded.choices.includes(future));assert.deepEqual(loaded.input.City,input.City);assert.equal(loaded.globalReads,1);
 for(const bad of ['N','Unknown New City',' Pflugerville ','pflugerville'])assert.throws(()=>run(c,inputFor(c,bad)),/shared City list/,c.form+' rejects new non-global input');
 for(const city of [null,'']){
  const blank=inputFor(c,null);blank.City=c.selection==='multi'?(city===null?null:[]):city;
  assert.deepEqual(run(c,blank).input,blank,c.form+' leaves native nullable/mandatory blank semantics unchanged');
 }
 const arbitrary=inputFor(c,'Injected Draft City'),cleared=run(c,arbitrary,{load:true});
 assert.deepEqual(cleared.choices,globals);assert.deepEqual(cleared.input.City,c.selection==='multi'?[]:null,'untrusted prefill cannot become a choice');
 const unavailable=run(c,inputFor(c,'Pflugerville'),{cities:null,load:true});
 assert.equal(unavailable.uiReplaced,false);assert.deepEqual(unavailable.input.City,inputFor(c,'Pflugerville').City,'global outage preserves current mounted value');
 assert.throws(()=>run(c,inputFor(c,'Pflugerville'),{cities:null}),/shared City list is unavailable/);
 if(c.mode==='persisted'){
  const saved=inputFor(c,'N',{ID:CID}),current=structuredClone(saved);
  assert.doesNotThrow(()=>run(c,current,{saved}));
  const legacyLoad=run(c,current,{saved,load:true});assert.ok(legacyLoad.choices.includes('N'));assert.deepEqual(legacyLoad.input.City,current.City);
  for(const change of [{ID:null},{ID:'90071992547419999'},{City:c.selection==='multi'?['Other Legacy']: 'Other Legacy'}])assert.throws(()=>run(c,{...current,...change},{saved}),/shared City list/,c.form+' exact native record/City identity is required');
  const stale=run(c,{...current,ID:'90071992547419999'},{saved,load:true});assert.ok(!stale.choices.includes('N'),'another saved row cannot authorize a stale ID');
  const removed=inputFor(c,'Temple',{ID:CID});assert.doesNotThrow(()=>run(c,removed,{saved:removed,cities:globals.filter(v=>v!=='Temple')}));
  assert.throws(()=>run(c,inputFor(c,'Temple'),{cities:globals.filter(v=>v!=='Temple')}),/shared City list/);
 }else{
  const saved=inputFor(c,'N',{ID:CID});assert.throws(()=>run(c,saved,{saved}),/shared City list/,'a transient/filter record never grants a persisted City exception');
  const selected=inputFor(c,'Pflugerville');if(c.selection==='multi')selected.City=['Temple','Pflugerville'];
  assert.deepEqual(run(c,selected,{load:true}).input.City,selected.City,'valid existing search criteria keep order and values');
 }
}
for(const form of ['Subdivision','Lots']){
 const c=byForm(form),saved=inputFor(c,'N',{ID:CID}),field=form==='Lots'?'Subdivision':'Project';
 assert.throws(()=>run(c,{...saved,[field]:'different-source'},{saved}),/shared City list/,form+' cannot move saved legacy City to another source');
}
{
 const c=byForm('Contract'),saved=inputFor(c,'N',{ID:CID,Subdivision1:[SID,SID2]});
 assert.doesNotThrow(()=>run(c,{...saved,Subdivision1:[SID2,SID,SID]},{saved}));
 for(const change of [{Project:'new-project'},{Subdivision1:[SID]},{Subdivision1:[SID,'new-subdivision']},{Contract_Type:'DA'},{Work_Module:'Construction'}])assert.throws(()=>run(c,{...saved,...change},{saved}),/shared City list/);
 assert.doesNotThrow(()=>run(c,{...saved,Work_Module:'Legal'},{saved:{...saved,Work_Module:''}}),'legacy blank module retains its existing Legal meaning');
 const tables={Subdivision:[{ID:SID,Project:PID,Company1:null,County:'Travis',City:'Pflugerville',Territory:'North Austin'}],Project:[{ID:PID,Territory:'North Austin'}]};
 const request=inputFor(c,'spoofed',{Work_Module:'Construction',Contract_Type:'Offsite'});
 const result=run(c,request,{sourceTables:tables,mergedContract:true});assert.equal(result.input.City,'Pflugerville');assert.equal(result.input.Status,'Proposed');
 assert.throws(()=>run(c,request,{sourceTables:tables,mergedContract:true,editor:false,submitter:false}),/permission is required/);
 assert.throws(()=>run(c,{...request,Subdivision1:[SID,SID2]},{sourceTables:tables,mergedContract:true}),/Choose one Subdivision/);
 assert.doesNotThrow(()=>run(c,inputFor(c,'Pflugerville',{Subdivision1:[SID,SID2]}),{mergedContract:true}),'Legal multi-Subdivision behavior remains intact');
}
{
 const c=byForm('Tax_Rate_Template'),saved=inputFor(c,null,{ID:CID,City:['Temple','N']});
 assert.doesNotThrow(()=>run(c,{...saved,City:['N','Temple']},{saved}));
 assert.throws(()=>run(c,{...saved,City:['N','Temple','Austin']},{saved}),/shared City list/,'unknown saved members require the whole selection unchanged');
 assert.doesNotThrow(()=>run(c,{...saved,City:['Temple','Austin']},{saved}),'removing the legacy member leaves valid global choices');
}
process.argv.push('--check');
await import(new URL('generate.mjs',folder));
process.argv.pop();
console.log('PASS all 10 native City bindings: actual shared helper/source, 76 globals/future addition, scalar/multi choices, persisted scope and stale IDs, transient filters, blank/required metadata, outage preservation and unchanged Contract native guards. Native compile/configuration/live verification pending.');
