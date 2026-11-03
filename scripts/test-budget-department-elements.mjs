import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the shipped department mapping using the native category and item
// lookup shapes. These vectors are display values; no native record is written.
const source = fs.readFileSync('widgets/budget-manager/src/app/widget.html', 'utf8').replace(/\r\n/g, '\n');
function extract(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must be present in the shipped widget`);
  const firstLine = source.indexOf('\n', start);
  const end = source.slice(start, firstLine).trimEnd().endsWith('}') ? firstLine : source.indexOf('\n}', start) + 2;
  assert.ok(end > start, `${name} must have a complete body`);
  return source.slice(start, end);
}
const map = source.match(/var BUDGET_ELEMENTS\s*=\s*(\[[\s\S]*?\]);/);
assert.ok(map, 'native element map remains explicit');
const B1 = '4410926000005159046', B2 = '4410926000005159047';
const CDEV = '4410926000005159101', CENG = '4410926000005159102', CCON = '4410926000005159103', CUNKNOWN = '4410926000005159104';
const state = {edBudget: {ID: B1}, categories: {
  [B1]: [{ID: CDEV, Budget: {ID:B1}, Budget_Category_Name: 'Site Costs', Deparment: 'Development'}],
  [B2]: [{ID: CENG, Budget: {ID:B2}, Budget_Category_Name: 'Site Costs', Deparment: 'Engineering'},
    {ID: CCON, Budget: {ID:B2}, Budget_Category_Name: 'Site Costs', Deparment: 'Construction'},
    {ID: CUNKNOWN, Budget: {ID:B2}, Budget_Category_Name: 'Site Costs', Deparment: 'Unassigned'}]
}};
const context = vm.createContext({S:state});
vm.runInContext(`var BUDGET_ELEMENTS=${map[1]};\n` + [
  'cleanVal','isObj','rawPath','firstRaw','lookupId','catDept','budgetElementNumber',
  'budgetElementSnapshot','budgetElementDepartmentIndex','budgetElementValues','budgetPrelimElementSnapshot'
].map(extract).join('\n'), context);
const plain = value => JSON.parse(JSON.stringify(value));
const fields = ['Labor_Budget','Materials_Budget','Equipment_Budget','Subcontractor_Budget','Other_Budget'];
const parts = values => Object.fromEntries(fields.map((field,index)=>[field,values[index]]));
const item = (ID, budget, category, extra={}) => ({ID, Budget:{ID:budget}, Budget_Category:{ID:category,zc_display_value:'Site Costs'}, ...extra});
const dev = item('4410926000005159201', B1, CDEV, {Department:'Construction'});
const eng = item('4410926000005159202', B2, CENG, {Department:'Development'});
const con = item('4410926000005159203', B2, CCON, {Department:'Development'});
assert.equal(context.budgetElementDepartmentIndex(dev),4,'Development uses Other, taking the matched category over a conflicting item department');
assert.equal(context.budgetElementDepartmentIndex(eng),0,'Engineering resolves another phase by exact category ID rather than active phase or same name');
assert.equal(context.budgetElementDepartmentIndex(con),null,'Construction never inherits a conflicting item default');
assert.equal(context.budgetElementDepartmentIndex({...dev,Budget_Category:CDEV}),4,'native string category lookups remain exact');
assert.equal(context.budgetElementDepartmentIndex(item('unknown',B2,CUNKNOWN)),null,'unknown category departments do not fall back to a cost code or label');
assert.equal(context.budgetElementDepartmentIndex({ID:'fallback',Budget_Category:{ID:'missing'},Department:'Engineering'}),0,'missing categories can use the native item Department');
assert.equal(context.budgetElementDepartmentIndex({ID:'fallback',Budget_Category:{},Department:'Development'}),4,'an empty lookup can use native Department');
assert.equal(context.budgetElementDepartmentIndex({ID:'fallback',Budget_Category:{zc_display_value:'Development'}}),null,'a lookup label without exact identity cannot invent a department');

const aggregateFields=['Prelim_Budget_Ttl','Unapproved_Final_Budget_Ttl','Budget_Ttl','HCSS_Actuals','PROJ_Actual'];
for (const [record,index] of [[dev,4],[eng,0]]) {
  for (const field of aggregateFields) {
    for (const [raw,expected] of [['123.4567',123.4567],['($1,200.1234)',-1200.1234],[0,0],['0.0000',0]]) {
      const native = {...record,[field]:raw}, before=JSON.stringify(native), vector=[0,0,0,0,0];vector[index]=expected;
      assert.deepEqual(plain(context.budgetElementValues(native,field)),vector,`${field} uses the department's single element and native signed precision`);
      assert.equal(JSON.stringify(native),before,'display mapping never changes native parent values');
    }
    for (const raw of [undefined,null,'',' ','—','unavailable']) assert.equal(context.budgetElementValues({...record,[field]:raw},field),null,`${field} missing data remains unavailable`);
  }
}
for (const field of aggregateFields) assert.equal(context.budgetElementValues({...con,[field]:100},field),null,'Construction aggregate values have no inferred element split');
assert.equal(context.budgetElementValues({ID:'unknown',Department:'Unknown',Budget_Ttl:100},'Budget_Ttl'),null,'unknown departments have no fallback allocation');

const explicit={...dev,Budget_Ttl:'100',...parts(['10.1250','20','30','35','4.8750'])};
assert.deepEqual(plain(context.budgetElementValues(explicit,'Budget_Ttl')),[10.125,20,30,35,4.875],'complete mixed/nondefault snapshots are preserved for Development');
assert.deepEqual(plain(context.budgetElementValues({...eng,...parts([0,0,0,0,100]),Budget_Ttl:100},'Budget_Ttl')),[0,0,0,0,100],'an explicit Engineering Other allocation is not reassigned to Labor');
assert.deepEqual(plain(context.budgetElementValues({...con,...parts([10,20,30,40,50]),Budget_Ttl:1},'Budget_Ttl')),[10,20,30,40,50],'complete Construction snapshots stay authoritative even when the aggregate differs');
assert.deepEqual(plain(context.budgetElementValues({...dev,...parts([0,0,0,0,0]),Budget_Ttl:100},'Budget_Ttl')),[0,0,0,0,0],'an explicit all-zero snapshot is preserved rather than replaced by its parent');
for (const field of fields) {
  assert.equal(context.budgetElementValues({...dev,Budget_Ttl:100,[field]:0},'Budget_Ttl'),null,`partial explicit ${field}=0 cannot be discarded for a department fallback`);
  assert.equal(context.budgetElementValues({...eng,Budget_Ttl:100,[field]:'25.0000'},'Budget_Ttl'),null,`partial explicit ${field} cannot be reassigned`);
}
assert.deepEqual(plain(context.budgetElementValues({...dev,...parts([null,'',null,'',null]),Budget_Ttl:'75.1250'},'Budget_Ttl')),[0,0,0,0,75.125],'wholly absent snapshot fields retain the documented department fallback');
assert.deepEqual(plain(context.budgetElementValues({...explicit,HCSS_Actuals:'60'},'HCSS_Actuals')),[0,0,0,0,60],'actuals follow the department rule instead of budget proportions');
assert.deepEqual(plain(context.budgetElementValues({...eng,...parts([0,0,0,0,100]),PROJ_Actual:'80'},'PROJ_Actual')),[80,0,0,0,0],'an explicit budget allocation never becomes a fabricated actual split');

// The PO baseline fallback must be more conservative than a new-entry default:
// native componentBaselineAvailable=false also describes partial snapshots.
const poDefaultSource=source.match(/defaultElement:(function\(item\)\{[^\n]+\}),/);
assert.ok(poDefaultSource,'actual PO integration callback must be discoverable');
const poDefault=vm.runInContext('('+poDefaultSource[1]+')',context);
assert.equal(poDefault(dev),'5');assert.equal(poDefault(eng),'1');assert.equal(poDefault(con),'');
for(const explicit of [{Other_Budget:100},{Other_Budget:0},{Labor_Budget:'0.0000'},parts([0,0,0,0,0]),parts([10,20,30,40,50])]){
  assert.equal(poDefault({...eng,...explicit}),'','any explicit Final component, including a partial zero, suppresses inferred PO baseline allocation');
}
assert.equal(poDefault({...eng,...parts([null,'',null,'',null])}),'1','wholly absent native components retain the department baseline fallback');

console.log('Budget department elements: exact cross-phase category IDs, Development/Engineering defaults, signed/zero/unknown aggregates, explicit/partial snapshot preservation, independent actuals and no native mutation passed.');
