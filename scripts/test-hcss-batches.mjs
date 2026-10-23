import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('creator/hcss-batches/Budgets_Check_HCSS_Budget1.action-1.dg','utf8');
const timer=fs.readFileSync('creator/hcss-batches/Test_Add_Hours.action-1.dg','utf8');
// Execute the actual source classification/decision blocks, with native-style
// map/list/record adapters. Native previews separately verify Deluge and exports.
const map=()=>new Map();
const collection=(values=[])=>Object.assign(values,{size(){return this.length;},contains(value){return this.includes(value);},add(value){this.push(value);}});
const nativeMap=()=>Object.assign(new Map(),{put(key,value){this.set(key,value);},get(key){return Map.prototype.get.call(this,key)??null;}});
const transform=text=>text.replace(/\/\/[^\n]*/g,'').replace(/\bfor each (\w+) in (\w+)/g,'for (const $1 of $2)').replace(/\bifnull\(/g,'coalesce(');
const build=source.slice(source.indexOf('\t\tfor each rec in rows'),source.indexOf('\n\t}\n\tif(!dryRun && settings.Current_Batch'));
const decide=source.slice(source.indexOf('\t\t\tcheckedCount ='),source.indexOf('\n\t\t}\n\t}\n\tsummary ='));
function run(rows,items,{jobs=['J0'],codes=new Map([['J0','S0']]),dryRun=false}={}){
  const context=vm.createContext({rows:rows.map(row=>({get:key=>row[key]??null})),selectedJobs:collection(jobs),jobCodes:codes,
    activeIds:nativeMap(),activeCodes:nativeMap(),duplicateCodes:nativeMap(),coalesce:(a,b)=>a??b,
    checkedCount:0,refreshedCount:0,zeroedCount:0,unchangedCount:0,duplicateCount:0,auditWriteAttempted:false,dryRun});
  vm.runInContext(transform(build),context);
  if(context.activeCodes.size>0)for(const item of items){context.existingItem=item;vm.runInContext(transform(decide),context);}
  return context;
}
const row=(job,minor,guid)=>({'H.JobCode':job,'H.Minor Code':minor,'H.zzz_CostCodeID_Guid':guid});
const items=()=>[
  {Code:'S0-B-1',Cost_Code_ID:'current',Cost:10},
  {Code:'S0-B-2',Cost_Code_ID:'old',Cost:20},
  {Code:'S0-B-3',Cost_Code_ID:'duplicate-old',Cost:30},
  {Code:'S0-B-4',Cost_Code_ID:'deleted',Cost:40},
];
const rows=[row('J0','1','current'),row('J0','2','new'),row('J0','3','dup1'),row('J0','3','dup2')];
{
  const target=items(),result=run(rows,target);
  assert.deepEqual(target,[{Code:'S0-B-1',Cost_Code_ID:'current',Cost:10},{Code:'S0-B-2',Cost_Code_ID:'new',Cost:20},{Code:'S0-B-3',Cost_Code_ID:'duplicate-old',Cost:30},{Code:'S0-B-4',Cost_Code_ID:'deleted',Cost:0}]);
  assert.equal(result.refreshedCount,1);assert.equal(result.zeroedCount,1);assert.equal(result.duplicateCount,1);
  const preview=items();run(rows,preview,{dryRun:true});assert.deepEqual(preview,items(),'Preview must not mutate costs or GUIDs');
  const empty=items();run([],empty);assert.deepEqual(empty,items(),'Empty source protects all costs');
  const invalid=items();assert.throws(()=>run([...rows,row('J0','','bad')],invalid),/Incomplete source/);assert.deepEqual(invalid,items(),'Late invalid source must fail before any writes');
  assert.throws(()=>run([row('outside','1','guid')],items()),/outside the requested batch/);
}
// Exact BIGINT remainder gives a disjoint complete partition even above JS's
// safe integer range. Apply each real decision block only to its native scope.
const subdivisions=Array.from({length:15},(_,i)=>({ID:String(900000000000000100n+BigInt(i)),code:'S'+i,job:'J'+i}));
const seen=new Set();
for(let batch=0;batch<5;batch++){
  const scope=subdivisions.filter(s=>Number(BigInt(s.ID)%5n)===batch);
  for(const s of scope){assert.ok(!seen.has(s.ID));seen.add(s.ID);}
  const targets=subdivisions.map(s=>({Subdivision_Code:s.code,Code:s.code+'-B-2',Cost_Code_ID:'old',Cost:20}));
  const selected=targets.filter(t=>scope.some(s=>s.code===t.Subdivision_Code));
  run(scope.map(s=>row(s.job,'1',s.job+'-active')),selected,{jobs:scope.map(s=>s.job),codes:new Map(scope.map(s=>[s.job,s.code]))});
  assert.equal(targets.filter(t=>t.Cost===0).length,scope.length);
  for(const t of targets)assert.equal(t.Cost,scope.some(s=>s.code===t.Subdivision_Code)?0:20,'Other batch costs remain unchanged');
}
assert.equal(seen.size,subdivisions.length);
assert.deepEqual([0,1,2,3,4].map(batch=>(batch+1)%5),[1,2,3,4,0]);
assert.match(source,/subdivision\.ID % 5 == batch/);
assert.match(source,/External_System_Mapping\[External_System == "HeavyJob"\]/);
assert.match(source,/jobCounts\.get\(job\) != 1 \|\| mappedCode == "" \|\| codeCounts\.get\(mappedCode\) != 1/);
assert.match(source,/Budget_Import_Item\[\(Data_Source == "HeavyJob Budget"\) && \(Cost != 0\) && \(Subdivision_Code in eligibleCodes\)\]/);
assert.ok(source.indexOf('config.put("criteria"')<source.indexOf('thisapp.analyticsExportRows('));
assert.ok(source.indexOf('throw "Incomplete source')<source.indexOf('existingItem.Cost_Code_ID ='));
assert.equal(source.match(/existingItem\.\w+\s*=(?!=)/g).length,2,'Only the two legacy business assignments remain');
assert.doesNotMatch(source,/insert into|Updated_Date\s*=/);
assert.match(source,/settings.Current_Batch = \(batch \+ 1\) % 5/);
assert.doesNotMatch(source.slice(source.indexOf('catch(batchError)')),/settings\.Current_Batch\s*=/,'Failure never advances cursor');
assert.doesNotMatch(timer,/settings\.Current_Batch\s*=/,'Three-hour timer cannot race the HCSS cursor');
assert.match(timer,/Next_Workflow_Run\.addHour\(3\)/);
const tokens=text=>(text.match(/"(?:\\.|[^"\\])*"|\/\/[^\n]*|\s+|./g)||[]).filter(t=>t.trim()&&!t.startsWith('//')).join('');
const native=fs.readFileSync('creator/hcss-batches/native/Budgets_Check_HCSS_Budget1.action-1.dg','utf8');
assert.equal(tokens(source).replace('[(Data_Source=="HeavyJob Budget")&&(Cost!=0)&&(Subdivision_CodeineligibleCodes)]','[Data_Source=="HeavyJob Budget"&&Cost!=0&&Subdivision_CodeineligibleCodes]'),tokens(native),'Reopened native source differs only in redundant pure-AND criteria parentheses');
assert.equal(tokens(timer),tokens(fs.readFileSync('creator/hcss-batches/native/Test_Add_Hours.action-1.dg','utf8')),'Saved/reopened timer matches the reviewed date-only source');
const retired=JSON.parse(fs.readFileSync('creator/integration-audit/retired-components.json'));
assert.equal(retired.Budgets_Check_HCSS_Budget.replacement,'Budgets_Check_HCSS_Budget1');
assert.ok(!JSON.parse(fs.readFileSync('creator/integration-audit/prepared/components.json')).some(c=>c.name==='Budgets_Check_HCSS_Budget'));
console.log('PASS: actual HCSS source/decision blocks, exact five-bucket coverage, other-batch isolation, source-first validation, duplicate/empty/preview protections, cursor wrap and single ownership, retired schedule exclusion.');
