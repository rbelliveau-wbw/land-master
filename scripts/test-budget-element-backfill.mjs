import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {COMPONENT_FIELDS as F, PRELIM_COMPONENT_FIELDS as P, COMPONENT_LABELS, parseCsv, csvText, decimal4, planBackfill, readRows, runCli} from './prepare-budget-element-backfill.mjs';

const id={budget:'90071992547409941',second:'90071992547409942',dev:'90071992547409951',eng:'90071992547409952',construction:'90071992547409953',item:'90071992547409961'};
const parts=(values,fields=F)=>Object.fromEntries(fields.map((name,index)=>[name,values[index]]));
const empty=()=>parts(['','','','','']);
const categories=[
  {ID:id.dev,Budget:{ID:id.budget},Deparment:'Development',Template_Item:'false'},
  {ID:id.eng,Budget:{ID:id.budget},Deparment:'Engineering',Template_Item:false},
  {ID:id.construction,Budget:{ID:id.second},Deparment:'Construction',Template_Item:'false'}
];
const item=(ID,overrides={})=>({ID,Budget:{ID:id.budget},Budget_Category:{ID:id.dev},Department:'Development',Template_Item:'false',Budget_Ttl:'123.4567',Prelim_Budget_Ttl:'9999.99',HCSS_Actuals:'50.25',PROJ_Actual:'100.01',Status:'Approved',...empty(),...overrides});

assert.deepEqual(parseCsv('\uFEFFID,Description,Amount\r\n"90071992547409961","Comma, quote ""and""\r\nnew line","1,234.5678"\r\n'),[{ID:id.item,Description:'Comma, quote "and"\r\nnew line',Amount:'1,234.5678'}]);
assert.deepEqual(parseCsv('sep=,\r\nID,A,B\r\n1,,\r\n'),[{ID:'1',A:'',B:''}]);
for(const csv of ['ID,ID\n1,2','ID,A\n1','ID,A\n1,2,3','ID,A\n1,"unterminated','ID,A\n1,"a"x','ID,A\n1,a"b'])assert.throws(()=>parseCsv(csv));
for(const [raw,expected] of [['123.4567','123.4567'],['$1,234.5678','1234.5678'],['($1,234.5678)','-1234.5678'],['−2.1000','-2.1000'],['0','0.0000'],['-0.0000','0.0000'],['9999999999999.9999','9999999999999.9999'],[7,'7.0000']])assert.equal(decimal4(raw).text,expected);
for(const raw of ['',null,'1e3','12,34.5','1.00001','abc','($-1.00)',1.1254,9007199254740992])assert.throws(()=>decimal4(raw));

const source=[
  item(id.item),
  item('90071992547409962',{Budget_Category:{ID:id.eng},Department:'Engineering',Budget_Ttl:'-12.3456'}),
  item('90071992547409963',{Budget_Ttl:'0.0000'}),
  item('90071992547409964',{...parts(['0.0000','','','',''])}),
  item('90071992547409965',{...parts(['0','0','0','0','0'])}),
  item('90071992547409966',{...parts(['','','—','',''])}),
  item('90071992547409967',{Budget_Ttl:''}),
  item('90071992547409968',{Template_Item:'true',Budget:'',Budget_Category:''}),
  item('90071992547409969',{Department:'Construction',Budget:{ID:id.second},Budget_Category:{ID:id.construction}})
];
const before=JSON.stringify(source),plan=planBackfill(source,categories);
assert.equal(JSON.stringify(source),before,'planner never mutates exported records');
assert.deepEqual(plan.updates,[[id.item,'0.0000','0.0000','0.0000','0.0000','123.4567'],['90071992547409962','-12.3456','0.0000','0.0000','0.0000','0.0000'],['90071992547409963','0.0000','0.0000','0.0000','0.0000','0.0000']]);
assert.deepEqual(plan.summary.by_department,{Development:2,Engineering:1});
assert.equal(plan.summary.preserved_existing_allocation,3,'partial, all-zero and nonnumeric nonblank allocations are all preserved');
assert.equal(plan.summary.skipped_missing_final,1);assert.equal(plan.summary.skipped_template_items,1);assert.equal(plan.summary.skipped_other_departments,1);
assert.equal(plan.summary.planned_zero_source_count,1);assert.equal(plan.summary.planned_negative_source_count,1);
assert.deepEqual(plan.headers,['ID',...COMPONENT_LABELS]);assert.equal(plan.headers.length,6);
assert.deepEqual(plan.rollback,plan.updates.map(row=>[row[0],'','','','','']));
assert.equal(plan.preimages[0].sourceAmountField,'Budget_Ttl');assert.equal(plan.preimages[0].sourceRecord.Prelim_Budget_Ttl,'9999.99');
assert.equal(plan.summary.scheduled_or_installed_automation,false);
assert.ok(plan.summary.preserves.includes('HCSS_Actuals')&&plan.summary.preserves.includes('status'));
assert.throws(()=>planBackfill([source[0],source[0]],categories),/duplicate IDs/);
assert.throws(()=>planBackfill([source[0]],[...categories,categories[0]]),/duplicate IDs/);
assert.throws(()=>planBackfill([item(90071992547409961)],categories),/exact string record ID/);
assert.throws(()=>planBackfill([item(id.item,{Template_Item:''})],categories),/template flag/);
assert.throws(()=>planBackfill([item(id.item,{Budget:{ID:id.second}})],categories),/cross phase/);
assert.throws(()=>planBackfill([item(id.item,{Budget_Category:'Development category name'})],categories),/exact string record ID/);
assert.throws(()=>planBackfill([item(id.item,{Budget_Category:{ID:'90071992547409888'}})],categories),/absent/);
assert.throws(()=>planBackfill([item(id.item,{Department:'Engineering'})],categories),/disagrees/);
const missing=item(id.item);delete missing.Equipment_Budget;assert.throws(()=>planBackfill([missing],categories),/Equipment_Budget/);

// Native report export has lookup display labels. Explicit Department mode
// never joins those labels, even when categories share names across phases.
const native=item(id.item,{Budget:'Phase A - 10/02/2026',Budget_Category:'Shared category',Department:'Engineering'});
const nativePlan=planBackfill([native],[],{departmentSource:'item'});
assert.deepEqual(nativePlan.updates,[[id.item,'123.4567','0.0000','0.0000','0.0000','0.0000']]);
assert.equal(nativePlan.summary.department_source,'native Budget_Item.Department');
assert.equal(nativePlan.preimages[0].budgetReference,'Phase A - 10/02/2026');
assert.equal(planBackfill([{...native,Budget:''}],[],{departmentSource:'item'}).summary.skipped_missing_budget,1);
const missingDepartment={...native};delete missingDepartment.Department;assert.throws(()=>planBackfill([missingDepartment],[],{departmentSource:'item'}),/native item Department/);
assert.throws(()=>planBackfill([native],[],{departmentSource:'inferred'}),/Department source/);
assert.throws(()=>planBackfill([native],[],{departmentSource:'item',output:{Budget_Ttl:'Final'}}),/only ID/);

// Preliminary planning is explicit and fails safely until its separate native
// fields exist. It never writes/reuses frozen Final component fields.
assert.throws(()=>planBackfill([native],[],{departmentSource:'item',tier:'preliminary'}),/Prelim_Labor_Budget/);
const preliminary={...native,...parts(['','','','',''],P)};
const pp=planBackfill([preliminary],[],{departmentSource:'item',tier:'preliminary'});
assert.deepEqual(pp.updates,[[id.item,'9999.9900','0.0000','0.0000','0.0000','0.0000']]);
assert.deepEqual(pp.summary.changes_only,P);assert.ok(pp.summary.preserves.includes('Labor_Budget'));
assert.equal(pp.preimages[0].sourceAmountField,'Prelim_Budget_Ttl');
assert.equal(planBackfill([{...preliminary,Prelim_Other_Budget:'0'}],[],{departmentSource:'item',tier:'preliminary'}).summary.preserved_existing_allocation,1);
assert.equal(planBackfill([{...preliminary,Prelim_Budget_Ttl:''}],[],{departmentSource:'item',tier:'preliminary'}).summary.skipped_missing_preliminary,1);
assert.throws(()=>planBackfill([native],[],{tier:'actual'}),/Tier/);

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'budget-elements-planner-'));
try {
  const input=path.join(temp,'items.json'),out=path.join(temp,'prepared');
  fs.writeFileSync(input,JSON.stringify({All_Budget_Items:[native]}));
  assert.deepEqual(readRows(input),[native],'native report JSON wrapper is retained');
  const csv=path.join(temp,'items.csv');fs.writeFileSync(csv,csvText(Object.keys(native),[Object.values(native)]));
  assert.deepEqual(readRows(csv).map(row=>row.ID),[id.item]);
  const log=console.log;let summary;try{console.log=()=>{};summary=runCli(['--items',input,'--out',out,'--department-source','item']);}finally{console.log=log;}
  const output=parseCsv(fs.readFileSync(path.join(out,'updates.csv'),'utf8'));
  assert.equal(output[0].ID,id.item);assert.equal(output[0]['(1) Labor'],'123.4567');
  assert.deepEqual(Object.keys(output[0]),['ID',...COMPONENT_LABELS],'only native record ID and five component columns enter import CSV');
  const rollback=parseCsv(fs.readFileSync(path.join(out,'rollback.csv'),'utf8'));assert.ok(COMPONENT_LABELS.every(label=>rollback[0][label]===''));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'rollback-preimage.json'),'utf8')).records[0].sourceRecord,native);
  assert.match(summary.input_sha256.items,/^[a-f0-9]{64}$/);assert.match(summary.artifact_sha256['updates.csv'],/^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(summary),/90071992547409961|123\.4567|Phase A|Shared category/,'summary omits record IDs, names and monetary values');
  assert.throws(()=>runCli(['--items',input,'--out',out,'--department-source','item']),/already exist/,'preimages cannot be silently overwritten');
  assert.throws(()=>runCli(['--items',input,'--out',path.join(temp,'other')]),/categories is required/,'item Department scope must be explicit');
  for(const name of fs.readdirSync(out))fs.unlinkSync(path.join(out,name));fs.rmdirSync(out);fs.unlinkSync(csv);fs.unlinkSync(input);
} finally {fs.rmdirSync(temp);}
console.log('PASS: one-time offline Budget element planner; exact string IDs/4-place signed decimals, native quoted CSV/JSON, explicit Department/exact category scope, any existing allocation preserved, template/missing-data exclusions, Final/Preliminary isolation, update-only columns, non-overwriting rollback/preimage and sanitized hash summary. No live writes or automation.');
