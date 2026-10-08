import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('widgets/budget-manager/src/app/widget.html', 'utf8');
const start = source.indexOf('function loadBudgetDetail(');
const end = source.indexOf('\n/* ── LANDING:', start);
assert.ok(start >= 0 && end > start);
const loader = source.slice(start, end);
const category = {ID:'900002', Budget:'900001'};
const item = {ID:'900003', Budget_Category:'900002'};

async function run(read) {
  const logs = [], calls = [];
  const S = {detailLoads:{}, detailGeneration:{}, categories:{}, items:{}};
  const context = {
    S, CFG:{reports:{categories:'categories', items:'items'}},
    budgetDetailReady:()=>false, budgetDetailPublishAllowed:()=>true,
    setLoad:()=>{}, auditLog:(level,message)=>logs.push({level,message}),
    compareCategoryRecords:()=>0, compareItemRecords:()=>0,
    rowBelongsToBudget:(row,id)=>row.Budget === id,
    rowBelongsToCategory:(row,ids)=>ids.includes(row.Budget_Category),
    sdkGetAllRecords:(report,criteria)=>{
      calls.push({report,criteria});
      return Promise.resolve().then(()=>read(report,criteria));
    }
  };
  vm.createContext(context);
  vm.runInContext(loader,context);
  let error;
  try {await context.loadBudgetDetail('900001');} catch (err) {error=err;}
  assert.equal(Object.keys(S.detailLoads).length,0,'settled loads release their receipt');
  return {S,logs,calls,error};
}

const empty = await run((report)=>report==='categories'?[category]:[]);
assert.equal(empty.error,undefined);
assert.equal(empty.S.items['900001'].length,0);
assert.ok(empty.logs.every(log=>log.level!=='error'),'successful empty items must not trigger critical reports');
assert.equal(empty.calls.filter(call=>call.report==='items'&&!call.criteria).length,1);

const noCategories = await run(()=>[]);
assert.equal(noCategories.S.categories['900001'].length,0);
assert.equal(noCategories.S.items['900001'].length,0);
assert.ok(noCategories.logs.every(log=>log.level!=='error'));
assert.equal(noCategories.calls.filter(call=>call.report==='items').length,0);

const populated = await run(report=>report==='categories'?[category]:[item]);
assert.equal(populated.S.items['900001'][0].ID,item.ID);
assert.equal(populated.calls.length,2,'nonempty criteria avoid full-report reads');

const recovered = await run((report,criteria)=>{
  if(criteria)throw new Error('Criteria unavailable');
  return report==='categories'?[category,{ID:'other',Budget:'other'}]:[item,{ID:'other',Budget_Category:'other'}];
});
assert.equal(recovered.error,undefined);
assert.equal(recovered.S.items['900001'].length,1,'fallback preserves local matching');
assert.ok(recovered.logs.some(log=>log.level==='warn'));
assert.ok(recovered.logs.every(log=>log.level!=='error'),'recovered reads are warnings');

for (const failedReport of ['categories','items']) {
  const failure = new Error('Full report unavailable');
  const failed = await run((report,criteria)=>{
    if(report!==failedReport)return [category];
    if(criteria)return [];
    throw failure;
  });
  assert.equal(failed.error,failure,'terminal read failures propagate to existing error handlers');
  assert.equal(failed.S.items['900001'],undefined,'failed read never publishes an empty financial snapshot');
  assert.equal(failed.calls.filter(call=>call.report===failedReport&&!call.criteria).length,1,'failed fallback is not replayed');
}
console.log('Budget detail empty/nonempty, recovered criteria, and terminal read failure regressions passed.');
