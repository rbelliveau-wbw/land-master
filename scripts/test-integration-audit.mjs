// Executes the checked-in Deluge helper bodies with explicit native HTTP fixtures.
// This adapter is not a Creator compiler; live Save/Execute checks cover native syntax.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function compile(source){
  const strings=[];
  let s=source.replace(/"(?:\\.|[^"\\])*"/g,value=>'STRINGTOKEN'+(strings.push(value)-1)+'END');
  s=s.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g,'');
  const head=s.match(/^\s*(map|list)\s+(\w+)\(([^)]*)\)\s*\{/),args=head[3].split(',').map(arg=>arg.trim().split(/\s+/).at(-1));
  s=s.replace(head[0],`function ${head[2]}(${args.join(',')}){`);
  s=s.replace(/invokeurl\s*\[([\s\S]*?)\]/g,(_,request)=>'fixtureHttp({'+request.trim().split('\n').map(line=>line.trim()).filter(Boolean).map(line=>line.replace(/^type\s*:\s*(\w+)$/,(_,type)=>'type:"'+type+'"')).join(',')+'})');
  s=s.replace(/\{\s*((?:(?:STRINGTOKEN\d+END|\d+)\s*,\s*)+(?:STRINGTOKEN\d+END|\d+))\s*\}/g,'[$1]');
  s=s.replace(/for each\s+(\w+) in ([^\n{]+)/g,'for ($1 of $2)');
  const variables=[...new Set([...s.matchAll(/(?<![.\w])([A-Za-z_]\w*)\s*=(?!=)/g)].map(match=>match[1]).concat([...s.matchAll(/for \((\w+) of/g)].map(match=>match[1])))].filter(name=>!args.includes(name));
  s=s.replace(`function ${head[2]}(${args.join(',')}){`,`function ${head[2]}(${args.join(',')}){var ${variables.join(',')};`);
  s=s.replace(/STRINGTOKEN(\d+)END/g,(_,index)=>strings[Number(index)]);
  return {name:head[2],type:head[1],source:s};
}
function runtime(name,responder,environment='Development'){
  const calls=[],events=[],delays=[];
  const c=vm.createContext({console,fixtureResponder:responder,calls,events,delays,environment});
  vm.runInContext(`
    function ifnull(value,fallback){return value==null?fallback:value;}
    function Map(){return {};}
    function List(){return [];}
    Object.defineProperties(Object.prototype,{get:{value:function(key){return this[key]??null;}},put:{value:function(key,value){this[key]=value;}},keys:{value:function(){return Object.keys(this);}},toString:{value:function(){return JSON.stringify(this);}}});
    Array.prototype.size=function(){return this.length;};Array.prototype.get=function(key){return this[key]??null;};Array.prototype.contains=function(value){return this.includes(value);};Array.prototype.add=function(value){this.push(value);};
    String.prototype.toMap=function(){return JSON.parse(this);};String.prototype.matches=function(pattern){return new RegExp('^(?:'+pattern+')$').test(this);};String.prototype.left=function(count){if(count>this.length)throw new Error('Native left index out of range');return this.slice(0,count);};String.prototype.lengthCall=function(){return this.length;};
    var zoho={currenttime:{toString(){return '10/21/2026 11:30:00 AM';}}};
    var thisapp={environment:{type:environment,linkname:environment.toLowerCase()},workflowRunLog(event){events.push(JSON.parse(JSON.stringify(event)));return {id:'4410926000000000001'};}};
    function getUrl(url){delays.push(url);return {};}
    function fixtureHttp(config){calls.push(config);return JSON.parse(JSON.stringify(fixtureResponder(config,calls.length)));}
  `,c);
  const compiled=compile(fs.readFileSync('creator/functions/'+name+'.dg','utf8'));
  compiled.source=compiled.source.replace(/\.length\(\)/g,'.lengthCall()');
  vm.runInContext(compiled.source,c);
  function execute(args){c.args=JSON.stringify(args);const result=vm.runInContext(compiled.name+'(...JSON.parse(args))',c);if(compiled.type==='list'&&!Array.isArray(result))throw new Error('Native list return type mismatch');return result;}
  return {execute,calls,events,delays};
}
const ok=body=>({responseCode:200,responseText:JSON.stringify(body)});
function analytics(sequence=['1004'],data={data:[{Code:'EA04',Cost:42}]}){let poll=0;return config=>{
  if(config.url.includes('/views/'))return ok({status:'success',data:{jobId:'90001'}});
  if(config.url.endsWith('/data?exportFormat=json'))return ok(data);
  return ok({status:'success',data:{jobId:'90001',jobCode:sequence[Math.min(poll++,sequence.length-1)],jobStatus:'Fixture export'}});
};}
const args=['view-id',{selectedColumns:['Code','Cost']},'4410926000000000001',false];
{
  const h=runtime('analyticsExportRows',analytics(['1001','1002','1004']));
  assert.equal(h.execute(args).length,1);assert.equal(h.delays.length,2);
  assert.equal(h.calls.filter(call=>call.url.endsWith('/data?exportFormat=json')).length,1);
  assert.ok(h.calls.at(-1).url.endsWith('/data?exportFormat=json'),'Download follows completed status');
  assert.equal(h.events.at(-1).counts.received,1);
}
for(const jobCode of ['1003','1005','UNKNOWN']){
  const h=runtime('analyticsExportRows',analytics([jobCode]));assert.throws(()=>h.execute(args),error=>String(error).includes('code='+jobCode));
  assert.equal(h.calls.some(call=>call.url.endsWith('/data?exportFormat=json')),false);
}
{
  const h=runtime('analyticsExportRows',analytics(['1001']));assert.throws(()=>h.execute(args),error=>String(error).includes('twelve status checks'));assert.equal(h.delays.length,11);assert.equal(h.calls.length,13,'Create + twelve status checks, with no premature download');
}
for(const [data,allowEmpty,success] of [[{data:[]},false,false],[{data:[]},true,true],[{},false,false],[{data:[{Code:'EA04'}]},false,false],[{error:{message:'failed'},data:[]},true,false],[{data:{}},true,false]]){
  const h=runtime('analyticsExportRows',analytics(['1004'],data));if(success)assert.equal(h.execute([...args.slice(0,3),allowEmpty]).length,0);else assert.throws(()=>h.execute([...args.slice(0,3),allowEmpty]));
}
for(const failAt of [1,2,3]){
  const original=analytics();const h=runtime('analyticsExportRows',(config,n)=>n===failAt?{responseCode:503,responseText:'unavailable'}:original(config));assert.throws(()=>h.execute(args),error=>String(error).includes('HTTP 503'));
}
for(const body of [{status:'error'}, {status:'success',data:{}}, {status:'success',data:{jobId:''}}]){
  const h=runtime('analyticsExportRows',()=>ok(body));assert.throws(()=>h.execute(args));assert.equal(h.calls.length,1);
}
{
  const original=analytics();const h=runtime('analyticsExportRows',(config,n)=>n===2?ok({status:'success',data:{jobId:'WRONG',jobCode:'1004'}}):original(config));assert.throws(()=>h.execute(args),error=>String(error).includes('requested job'));assert.equal(h.calls.length,2);
}
const ID='4410926000000000001';
for(const env of ['Development','Stage','Production']){
  const h=runtime('workflowRunLog',()=>ok({code:3000,data:{ID}}),env);
  assert.equal(h.execute([{action:'start',workflow:'Fixture import',system:'Analytics'}]).id,ID);
  const call=h.calls[0],payload=JSON.parse(call.parameters);
  assert.equal(call.type,'POST');assert.equal(payload.data.Run_Status,'Running');
  assert.equal(call.headers.environment,env==='Production'?undefined:env.toLowerCase(),'Never default a non-production run into Production');
}
{
  const h=runtime('workflowRunLog',()=>ok({code:3000,result:[{code:3000,data:{ID}}]}));
  h.execute([{action:'finish',id:ID,status:'Failed',stage:'API request',message:'short',details:'short',counts:{failed:1}}]);
  const payload=JSON.parse(h.calls[0].parameters);assert.equal(h.calls[0].type,'PATCH');assert.equal(payload.data.Message,'short');assert.equal(payload.data.Rows_Failed,1);assert.equal(payload.skip_workflow,undefined,'Completion must trigger the independent email workflow');
}
for(const reply of [{code:3001,message:'Rejected'},{code:3000,data:{ID:'999'}},{code:3000,result:[]},{code:3000,result:[{code:3001,data:{ID}}]},{code:3000,data:{ID},result:[{code:3000,data:{ID}}]}]){
  const h=runtime('workflowRunLog',()=>ok(reply));assert.throws(()=>h.execute([{action:'finish',id:ID,status:'Failed'}]));assert.equal(h.calls.length,1,'Ambiguous audit writes are not replayed');
}
{
  const h=runtime('workflowRunLog',()=>{throw new Error('Ambiguous network timeout');});assert.throws(()=>h.execute([{action:'start',workflow:'Fixture',system:'Analytics'}]));assert.equal(h.calls.length,1);
}
{
  const h=runtime('workflowRunLog',()=>{throw new Error('Should not call');},'Unknown');assert.throws(()=>h.execute([{action:'start',workflow:'Fixture',system:'Analytics'}]));assert.equal(h.calls.length,0);
}
console.log('PASS: actual Deluge export polling/completion gates, bounded waits, HTTP/schema/error handling and independent audit writes with environment isolation, short text and exact native acknowledgement/no replay.');

// A shared job code across systems is valid. CTC must resolve only HeavyJob.
const ctc=fs.readFileSync('creator/integration-audit/prepared/Budgets_Import_Load_CTC_C.action-1.dg','utf8');
const mappingCriteria=ctc.match(/subdiv = External_System_Mapping\[([^\n]+)\];/)[1]
  .replace(/\b(External_Code|External_System)\b/g,'mapping.$1');
const selectMapping=vm.runInNewContext(`(mapping,rec)=>${mappingCriteria}`);
const mappedSubdivision={ID:'900000000000000201',Subdivision_Code:'EXAMPLE_PHASE'};
const mappings=[{ID:'900000000000000301',External_Code:'EXAMPLE_JOB',External_System:'Great Plains',Subdivision1:mappedSubdivision},
  {ID:'900000000000000302',External_Code:'EXAMPLE_JOB',External_System:'HeavyJob',Subdivision1:mappedSubdivision}];
const sourceRow={get:key=>key==='H.JobCode'?'EXAMPLE_JOB':null};
assert.deepEqual(mappings.filter(mapping=>selectMapping(mapping,sourceRow)).map(mapping=>mapping.ID),['900000000000000302']);
assert.equal([...mappings,{...mappings[1],ID:'900000000000000303'}].filter(mapping=>selectMapping(mapping,sourceRow)).length,2,'True same-system duplicates must remain visible to the existing count guard');
assert.match(ctc,/subdiv\.count\(\) != 1 \|\| subdiv\.Subdivision1 == null/);

// Execute the actual outer catch with a failed export and no nested date error.
const finalAcceptance=fs.readFileSync('creator/integration-audit/prepared/Sync_Final_Acceptance_Due.action-1.dg','utf8');
const syncCatch=finalAcceptance.match(/catch\s*\(syncError\)\s*\{([\s\S]*?)\n\}/)[1].replace(/^\s*info .+;\s*$/gm,'');
for(const operationStage of ['exporting Projects','exporting Tasks']){
  assert.throws(()=>vm.runInNewContext(syncCatch,{operationStage,currentProjectCode:'',updatedCount:0,dateError:null,syncError:new Error('Analytics export did not complete; job=fixture')}),
    error=>String(error).includes(operationStage)&&String(error).includes('Analytics export did not complete; job=fixture'));
}
console.log('PASS: CTC system-scoped mapping and Final Acceptance source error/stage preservation with an unset nested date error.');
