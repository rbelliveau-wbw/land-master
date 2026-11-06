// Execute the checked-in batch-claim helper against native-shaped API replies.
// This verifies request/ownership behavior; Creator compilation is a separate gate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const source = fs.readFileSync('creator/functions/workflowExportClaimRows.dg', 'utf8').replace(/\r\n/g, '\n');
function compile(text) {
  const strings = [];
  let code = text.replace(/"(?:\\.|[^"\\])*"/g, value => `STRINGTOKEN${strings.push(value)-1}END`);
  code = code.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
  const head = code.match(/^\s*bool\s+(\w+)\(([^)]*)\)\s*\{/);
  const args = head[2].split(',').map(arg => arg.trim().split(/\s+/).at(-1));
  const signature = `function ${head[1]}(${args.join(',')}){`;
  code = code.replace(head[0], signature);
  code = code.replace(/invokeurl\s*\[([\s\S]*?)\]/g, (_all, body) =>
    'fixtureHttp({' + body.trim().split('\n').map(line => line.trim()).filter(Boolean)
      .map(line => line.replace(/^type\s*:\s*(\w+)$/, (_line, type) => `type:"${type}"`)).join(',') + '})');
  code = code.replace(/Workflow_Export_Lock\[([^\]]+)\]/g, (_all, criteria) =>
    `fetchLocks(row=>${criteria.replace(/(?<![.\w])Claim_Key\b/g, 'row.Claim_Key')})`);
  code = code.replace(/\{\s*((?:(?:STRINGTOKEN\d+END|\d+)\s*,\s*)+(?:STRINGTOKEN\d+END|\d+))\s*\}/g, '[$1]');
  code = code.replace(/for each\s+(\w+) in ([^\n{]+)/g, 'for ($1 of $2)');
  code = code.replace(/\binfo ([^;]+);/g, 'fixtureInfo($1);');
  const locals = [...new Set([...code.matchAll(/(?<![.\w])([A-Za-z_]\w*)\s*=(?!=)/g)].map(match => match[1])
    .concat([...code.matchAll(/for \((\w+) of/g)].map(match => match[1])))].filter(name => !args.includes(name));
  code = code.replace(signature, `${signature}var ${locals.join(',')};`);
  return code.replace(/STRINGTOKEN(\d+)END/g, (_all, index) => strings[Number(index)]);
}

const AUDIT = '4410926000005159046';
const key = index => `${AUDIT}|actual-row|${createHash('sha256').update(`source-${index}`).digest('hex')}`;
function fixture({mode = 'ok', environment = 'development', existing = [], keys = [key(0)], audit = AUDIT} = {}) {
  const context = vm.createContext({fixtureMode: mode, fixtureEnvironment: environment,
    fixtureExisting: JSON.stringify(existing), fixtureKeys: JSON.stringify(keys), fixtureAudit: audit});
  vm.runInContext(`
    var requests=[],messages=[],locks=JSON.parse(fixtureExisting),nextId=90071992547409930n;
    function ifnull(value,fallback){return value==null?fallback:value;}
    function List(){return [];}
    Object.defineProperties(Object.prototype,{
      get:{value:function(key){return this[key]??null;}},
      put:{value:function(key,value){this[key]=value;}},
      toString:{value:function(){return JSON.stringify(this);}}
    });
    Array.prototype.size=function(){return this.length;};
    Array.prototype.add=function(value){this.push(value);};
    Array.prototype.contains=function(value){return this.includes(value);};
    String.prototype.toMap=function(){return JSON.parse(this);};
    String.prototype.matches=function(pattern){return new RegExp('^(?:'+pattern+')$').test(this);};
    function fetchLocks(predicate){var found=locks.filter(predicate);return {count:function(){return found.length;}};}
    function fixtureInfo(message){messages.push(message);}
    var thisapp={environment:{type:fixtureEnvironment,linkname:fixtureEnvironment==='production'?'':fixtureEnvironment}};
    var zoho={currenttime:{toString:function(){return '11/05/2026 08:00:00 PM';}}};
    function fixtureHttp(request){
      var payload=JSON.parse(request.parameters);
      requests.push({url:request.url,type:request.type,headers:request.headers,connection:request.connection,payload});
      if(fixtureMode==='throw-before')throw Error('transport failed');
      if(fixtureMode==='http-error')return {responseCode:429,responseText:'{}'};
      if(fixtureMode==='bad-json')return {responseCode:200,responseText:'unknown'};
      if(fixtureMode==='race')locks.push({ID:'1',Claim_Key:payload.data[0].Claim_Key});
      var result=payload.data.map(function(row,index){
        if(locks.some(lock=>lock.Claim_Key===row.Claim_Key)||(fixtureMode==='partial'&&index===1)){
          return {code:3001,message:'Duplicate or rejected record'};
        }
        var record={ID:String(nextId++),Claim_Key:row.Claim_Key};locks.push(record);
        return {code:3000,data:{...record}};
      });
      if(fixtureMode==='lost-after-persist')throw Error('reply lost after commit');
      if(fixtureMode==='reverse')result.reverse();
      if(fixtureMode==='missing-key')delete result[0].data.Claim_Key;
      if(fixtureMode==='foreign-key')result[0].data.Claim_Key='999|actual-row|'+'a'.repeat(64);
      if(fixtureMode==='missing-id')delete result[0].data.ID;
      if(fixtureMode==='invalid-id')result[0].data.ID='unknown';
      if(fixtureMode==='duplicate-key')result[1].data.Claim_Key=result[0].data.Claim_Key;
      if(fixtureMode==='duplicate-id')result[1].data.ID=result[0].data.ID;
      if(fixtureMode==='short')result.pop();
      if(fixtureMode==='extra')result.push(result[0]);
      if(fixtureMode==='record-error')result[0].error='native validation rejected';
      var body={code:3000,result};
      if(fixtureMode==='outer-error')body.error='request rejected';
      if(fixtureMode==='top-data')body.data={ID:'1'};
      if(fixtureMode==='missing-results')delete body.result;
      if(fixtureMode==='outer-code')body.code=3001;
      return {responseCode:200,responseText:JSON.stringify(body)};
    }
  ` + compile(source), context);
  const run = () => vm.runInContext('workflowExportClaimRows(fixtureAudit,JSON.parse(fixtureKeys))', context);
  const read = expression => JSON.parse(vm.runInContext('JSON.stringify('+expression+')', context));
  return {context,run,read};
}

for (const environment of ['development', 'stage', 'production']) {
  const h = fixture({environment, keys: Array.from({length:100}, (_, index) => key(index))});
  assert.equal(h.run(), true);
  const [request] = h.read('requests');
  assert.equal(h.read('requests.length'), 1, 'a complete one-hundred-row claim chunk uses one request');
  assert.equal(request.payload.data.length, 100);
  assert.deepEqual(request.payload.result.fields, ['Claim_Key']);
  assert.equal(request.headers.environment, environment === 'production' ? undefined : environment);
  assert.equal(request.connection, 'workflow_audit_admin');
  assert.equal(request.type, 'POST');
  assert.match(request.url, /\/form\/Workflow_Export_Lock$/);
  assert.equal(h.read('locks').at(-1).ID, '90071992547410029', 'long Creator record IDs retain exact identity');
  assert.equal(h.run(), false, 'committed claims never authorize a second execution');
  assert.equal(h.read('requests.length'), 1, 'an existing claim set is not resent');
}
{
  const h=fixture({keys:Array.from({length:25},(_,index)=>key(index))});
  assert.equal(h.run(),true);assert.equal(h.read('requests[0].payload.data.length'),25,'legacy twenty-five-key callers remain supported');
}
assert.equal(fixture({mode:'reverse', keys:[key(0),key(1)]}).run(), true, 'acknowledgements are matched by identity, not response order');
for (const mode of ['partial','missing-key','foreign-key','missing-id','invalid-id','duplicate-key','duplicate-id','short','extra','record-error','outer-error','top-data','missing-results','outer-code','race','throw-before','lost-after-persist','http-error','bad-json']) {
  const h = fixture({mode, keys:[key(0),key(1)]});
  assert.equal(h.run(), false, `${mode} does not establish ownership of the full chunk`);
  assert.equal(h.read('requests.length'), 1, `${mode} does not automatically retry the request`);
  if (['partial','race','lost-after-persist'].includes(mode)) {
    assert.ok(h.read('locks.length') > 0, 'claims may persist even when the reply cannot authorize processing');
    assert.equal(h.run(), false, 'persisted partial or unknown claims cannot authorize replay');
    assert.equal(h.read('requests.length'), 1);
  }
}
for (const keys of [[], Array.from({length:101}, (_, index) => key(index)), null, ['bad-key'], [null], [key(0).replace(AUDIT,'999')]]) {
  const h = fixture({keys});
  assert.throws(h.run);
  assert.equal(h.read('requests.length'), 0, 'invalid input is rejected before the independent request');
}
{
  const h = fixture({keys:[key(0),key(0)]});
  assert.equal(h.run(), false);
  assert.equal(h.read('requests.length'), 0, 'duplicate keys within a chunk fail before creating claims');
}
{
  const h = fixture({keys:[key(0),key(1)],existing:[{ID:'4410926000000000001',Claim_Key:key(1)}]});
  assert.equal(h.run(), false);
  assert.equal(h.read('requests.length'), 0, 'cross-chunk duplicates fail before creating the rest of the chunk');
}
{
  const h = fixture({environment:'unknown'});
  assert.throws(h.run, /environment/);
  assert.equal(h.read('requests.length'), 0);
}
assert.match(source, /return false;\s*}\s*$/, 'the bool helper has a compile-safe outer fallback');
assert.doesNotMatch(source, /while\s*\(/);
console.log('PASS: one hundred durable row claims in one request, legacy twenty-five-key calls, exact key/ID ownership, long IDs, environment routing, reordered replies, partial commit, races and lost-response no-replay.');
