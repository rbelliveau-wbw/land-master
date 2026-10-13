import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ready,source,clone} from './fixtures/proforma-sdk-v2-harness.mjs';

// Run the entire widget and serialize/reopen a real XLSX, including its cell types.
const testSource=source.replace('window.__PFW_TEST__={',
  'window.__PFW_TEST__={buildProformaWorkbook:buildProformaWorkbook,computeProforma:computeProforma,');
const h=await ready({source:testSource,references:false});
const xc=vm.createContext({});
vm.runInContext(fs.readFileSync('widgets/land-master/src/app/vendor/xlsx.full.min.js','utf8'),xc);
const X=xc.XLSX;
const additive={
  'Lots Sold':'Lots_Sold','Base Lot Sales':'Base_Lot_Sales','Additional Markup Income':'Additional_Markup_Income',
  'Escalator Interest Accrued':'Escalator_Interest_Accrued','Finished Lot Sales':'Finished_Lot_Sales',
  'Land Cost':'Land_Cost','Land Sale':'Land_Sale','PID/MUD Revenue':'PID_MUD_Revenue',
  'Entitlement & Eng':'Entitlement_Engineering',"Ent & Eng Add'l":'Entitlement_Engineering_Addl',
  'Construction Base':'Construction_Cost_Base',"Construction Add'l":'Construction_Cost_Addl',
  'Reimbursements':'Reimbursements','Reimbursed Fees':'Reimbursed_Fees'
};
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function close(actual,expected,label){
  assert.equal(typeof actual,'number',label+' stays numeric');
  assert.ok(Math.abs(actual-expected)<=Math.max(1e-8,Math.abs(expected)*Number.EPSILON*32),
    `${label}: ${actual} != ${expected}`);
}
function workbook(model,calc){
  const before=JSON.stringify({model,calc});
  const built=h.widget.buildProformaWorkbook(X,freeze(model),freeze(calc));
  const bytes=X.write(built,{type:'array',bookType:'xlsx'});
  const wb=X.read(bytes,{type:'array'});
  assert.equal(JSON.stringify({model,calc}),before,'export never mutates inputs, phase detail, totals or balances');
  const table=Array.from(X.utils.sheet_to_json(wb.Sheets.Months,{header:1,defval:''}),row=>Array.from(row));
  const heads=table[0],rows=table.slice(1).map(row=>Object.fromEntries(heads.map((key,i)=>[key,row[i]])));
  assert.equal(new Set(rows.map(r=>r.Month)).size,rows.length,'exactly one row for each month');
  assert.equal(rows.length,new Set(calc.months.map(r=>Number(r.Month1))).size);
  assert.deepEqual(rows.map(r=>r.Month),[...rows.map(r=>r.Month)].sort((a,b)=>a-b));
  rows.forEach((row,index)=>{
    const detail=calc.months.filter(r=>Number(r.Month1)===row.Month);
    assert.equal(row.Master,'Yes');
    for(const [label,key] of Object.entries(additive)){
      const present=detail.filter(r=>r[key]!=null&&r[key]!=='');
      if(!present.length){assert.equal(row[label],'',label+' remains blank when absent');continue;}
      close(row[label],present.reduce((s,r)=>s+Number(String(r[key]).replace(/[$,%\s,]/g,'')),0),label);
      assert.equal(wb.Sheets.Months[X.utils.encode_cell({r:index+1,c:heads.indexOf(label)})].t,'n');
    }
    const master=detail.find(r=>/^(true|yes|1)$/i.test(String(r.Master_Month)));
    for(const [label,key] of [['Cash Flow','Cash_Flow'],['Running Cash Flow','Running_Cash_Flow']]){
      if(master[key]==null||master[key]==='')assert.equal(row[label],'');
      else close(row[label],Number(master[key]),label+' is copied once from the Master');
    }
  });
  assert.equal(h.writes.length,0,'export never writes to Creator');
  return {wb,rows};
}

const costs=(values={})=>({...Object.fromEntries(Object.values(additive).map(key=>[key,0])),...values});
const april={y:2028,m:4};
const a={...costs({Lots_Sold:10,Base_Lot_Sales:10000.01,Additional_Markup_Income:-200.02,
  Escalator_Interest_Accrued:100.03,Finished_Lot_Sales:9900.02,Construction_Cost_Base:101.1234,
  Construction_Cost_Addl:50.05,Land_Cost:1000.01}),Month1:17,date:april,Master_Month:true,
  Const_Phase:1,Lot_Sale_Phase:1,Escalator_Percentage:5,Escalator_Elapsed_Months:3,Escalator_Applied_Pct:1.25};
const b={...costs({Lots_Sold:5,Base_Lot_Sales:5000.02,Escalator_Interest_Accrued:50,
  Finished_Lot_Sales:5050.02,Entitlement_Engineering:200.2345,Entitlement_Engineering_Addl:-10.01,
  Reimbursements:30.03,Reimbursed_Fees:20.02}),Month1:'17',date:april,Master_Month:false,
  Eng_Phase:2,Lot_Sale_Phase:2,Escalator_Percentage:7,Escalator_Elapsed_Months:6,Escalator_Applied_Pct:3.5,
  Cash_Flow:999999,Running_Cash_Flow:999999};
const c={...costs({Construction_Cost_Base:300.3456,Construction_Cost_Addl:60.06,
  Entitlement_Engineering:400.4567,Entitlement_Engineering_Addl:15.015,PID_MUD_Revenue:100.1}),
  Month1:17,date:april,Master_Month:false,Eng_Phase:10,Const_Phase:10};
const d={...costs({Entitlement_Engineering:500.5678,Land_Sale:700.07}),
  Month1:17,date:april,Master_Month:false,Eng_Phase:3,Const_Phase:3};
const income=r=>(r.Finished_Lot_Sales||0)+(r.Land_Sale||0)+(r.PID_MUD_Revenue||0)+(r.Reimbursements||0)+(r.Reimbursed_Fees||0);
const expense=r=>(r.Land_Cost||0)+(r.Entitlement_Engineering||0)+(r.Entitlement_Engineering_Addl||0)
  +(r.Construction_Cost_Base||0)+(r.Construction_Cost_Addl||0);
a.Cash_Flow=[a,b,c,d].reduce((sum,r)=>sum+income(r)-expense(r),0);
a.Running_Cash_Flow=-123456.789;
const prior={...costs(),Month1:16,date:{y:2028,m:3},Master_Month:'true',Cash_Flow:0,Running_Cash_Flow:-140000,
  Lot_Sale_Phase:1,Escalator_Percentage:0,Escalator_Elapsed_Months:0,Escalator_Applied_Pct:0};
const idle={Month1:18,date:{y:2028,m:5},Master_Month:true,Land_Cost:100.01,Cash_Flow:-100.01,Running_Cash_Flow:-123556.799};
const detail=[idle,c,a,d,b,prior];
const result=workbook({}, {months:clone(detail)});
const combined=result.rows.find(r=>r.Month===17);
assert.equal(combined['Const Phase'],'1, 3, 10','phase IDs are sorted labels, never 1310');
assert.equal(combined['Eng Phase'],'2, 3, 10','more than two engineering phases survive');
assert.equal(combined['Lot Sale Phase'],'1, 2','simultaneous selling phases survive');
assert.equal(combined['Escalator Percentage'],'Phase 1: 5; Phase 2: 7');
assert.equal(combined['Escalator Elapsed Months'],'Phase 1: 3; Phase 2: 6');
assert.equal(combined['Escalator Applied %'],'Phase 1: 1.25; Phase 2: 3.5');
assert.equal(result.rows[0]['Escalator Percentage'],0,'zero is distinct from blank');
assert.equal(result.rows[0]['Lot Sale Phase'],1,'single phase IDs remain numeric');
close(combined['Finished Lot Sales'],combined['Base Lot Sales']+combined['Additional Markup Income']+combined['Escalator Interest Accrued'],'sales components reconcile');
close(combined['Cash Flow'],combined['Finished Lot Sales']+combined['Land Sale']+combined['PID/MUD Revenue']
  +combined.Reimbursements+combined['Reimbursed Fees']-combined['Land Cost']-combined['Entitlement & Eng']
  -combined["Ent & Eng Add'l"]-combined['Construction Base']-combined["Construction Add'l"],'monthly cash reconciles');
const sameRate=clone(detail);sameRate.forEach(r=>{if(r.Month1==17&&r.Lot_Sale_Phase){r.Escalator_Percentage=5;r.Escalator_Elapsed_Months=3;r.Escalator_Applied_Pct=1.25;}});
assert.equal(workbook({}, {months:sameRate}).rows.find(r=>r.Month===17)['Escalator Percentage'],5,'matching rates stay numeric and are not added');
const repeatedPhase=clone(detail);repeatedPhase.find(r=>r.Eng_Phase===3).Eng_Phase=2;
assert.equal(workbook({}, {months:repeatedPhase}).rows.find(r=>r.Month===17)['Eng Phase'],'2, 10','phase labels are deduplicated');
const reversed=workbook({}, {months:clone(detail).reverse()}).rows;
for(let i=0;i<result.rows.length;i++)for(const key of Object.keys(result.rows[i])){
  if(typeof result.rows[i][key]==='number')close(reversed[i][key],result.rows[i][key],'row-order independence: '+key);
  else assert.equal(reversed[i][key],result.rows[i][key]);
}
for(const [change,pattern] of [
  [rows=>{rows[1].Master_Month=true;},/one Master row/],
  [rows=>{rows[0].Master_Month=false;},/one Master row/],
  [rows=>{rows[0].Month1=0;},/invalid month number/],
  [rows=>{rows[0].Construction_Cost_Base='bad';},/invalid Construction_Cost_Base/],
  [rows=>{rows[0].Eng_Phase=1.5;},/invalid Eng_Phase/],
  [rows=>{rows[0].date={y:2028,m:6};},/conflicting dates/],
  [rows=>{rows[0].Construction_Cost_Base=1e308;rows[1].Construction_Cost_Base=1e308;},/invalid Construction_Cost_Base total/],
  [rows=>{rows[1].Lot_Sale_Phase=null;},/needs a sale phase/]
]){
  const rows=clone([a,b,c,d]);change(rows);
  assert.throws(()=>h.widget.buildProformaWorkbook(X,{}, {months:rows}),pattern,'malformed data must fail visibly, never silently change math');
}

// Deterministic randomized overlaps: 1–6 phases in each of 8 months, fractional
// and negative amounts, arbitrarily ordered details, Master in any position.
let seed=44929401;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
for(let run=0;run<60;run++){
  const rows=[];let running=0;
  for(let month=1;month<=8;month++){
    const n=1+Math.floor(random()*6),masterIndex=Math.floor(random()*n),monthly=[];
    for(let phase=1;phase<=n;phase++){
      const row={Month1:month,date:{y:2029,m:month},Master_Month:phase-1===masterIndex,
        Eng_Phase:phase,Const_Phase:phase,Lot_Sale_Phase:phase,
        Escalator_Percentage:phase,Escalator_Elapsed_Months:month,Escalator_Applied_Pct:phase*month/12};
      Object.values(additive).forEach(key=>{row[key]=Math.round((random()-.25)*1e8)/10000;});
      row.Lots_Sold=Math.floor(random()*20);
      row.Finished_Lot_Sales=row.Base_Lot_Sales+row.Additional_Markup_Income+row.Escalator_Interest_Accrued;
      monthly.push(row);
    }
    const cash=monthly.reduce((sum,row)=>sum+income(row)-expense(row),0);running+=cash;
    monthly[masterIndex].Cash_Flow=cash;monthly[masterIndex].Running_Cash_Flow=running;
    rows.push(...monthly);
  }
  for(let i=rows.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[rows[i],rows[j]]=[rows[j],rows[i]];}
  const exported=workbook({}, {months:rows}).rows;
  for(const [label,key] of Object.entries(additive))close(exported.reduce((sum,r)=>sum+r[label],0),rows.reduce((sum,r)=>sum+r[key],0),'project sum: '+label);
  close(exported.reduce((sum,r)=>sum+r['Cash Flow'],0),exported.at(-1)['Running Cash Flow'],'final cumulative cash');
}

// Use the unchanged PF calculator to produce six overlapping real phases.
const model={Lots:120,Phases:6,Total_Acres:10,Engineering_Delay_Months:0,Engineering_Length_Months:12,
  Construction_Delay_Months:0,Construction_Length:18,Sale_Price_FF:1000.25,Lot_Size_Ft:50,
  Engineering_Cost_Lot:125.75,Const_Cost_FF:50.25,Total_Street_LF:6000,Land_Cost_Acre:50000,
  Engineering_Overhead:2,Construction_Overhead:3,Overhead:1,Interest:7,Profit_Share:10,
  purchaseDate:{y:2027,m:1},phaseSales:Array.from({length:6},(_,i)=>({Phase:i+1,Total_Lots:20,
    Initial_Take_Lots:20,Initial_Delay_Months:0,First_Recurring_Delay_Months:0,Lots_Per_Take:0,
    Take_Frequency:'Monthly',Escalator_Enabled:true,Annual_Escalator_Pct:i+1,Esc_Start_Date:'2027-01-01',Additional_Markup_Pct:i-2})),
  curve:Array.from({length:18},(_,i)=>({Month_Number:i+1,Percent_Cost:100/18})),items:[],
  purchaseInstallments:[{Month1:1,Cost:500000}],saleInstallments:[{Month1:50,Cost:2000}],pidMud:[{Month1:49,Cost:3000}]};
const calc=h.widget.computeProforma(model),before=JSON.stringify(calc);
assert.equal(calc.warnings.length,0);
assert.ok(Math.max(...calc.agg.map(r=>calc.months.filter(d=>d.Month1===r.m&&d.Eng_Phase!=null).length))>=6);
assert.ok(Math.max(...calc.agg.map(r=>calc.months.filter(d=>d.Month1===r.m&&d.Const_Phase!=null).length))>=6);
const actual=workbook(clone(model),calc).rows;
assert.equal(actual.length,calc.endMonth);
for(const row of actual){
  const agg=calc.agg.find(a=>a.m===row.Month);
  close(row['Cash Flow'],calc.monthlyCash[row.Month-1],'calculator monthly cash parity');
  close(row['Running Cash Flow'],agg.runCash,'dashboard balance parity');
  close(income({Finished_Lot_Sales:row['Finished Lot Sales'],Land_Sale:row['Land Sale'],PID_MUD_Revenue:row['PID/MUD Revenue'],
    Reimbursements:row.Reimbursements,Reimbursed_Fees:row['Reimbursed Fees']}),agg.totalIncome,'dashboard income parity');
  close(row['Land Cost']+row['Entitlement & Eng']+row["Ent & Eng Add'l"]+row['Construction Base']+row["Construction Add'l"],agg.totalExpenses,'dashboard expense parity');
}
close(actual.reduce((sum,r)=>sum+r['Finished Lot Sales'],0),calc.totals.Gross_Sales,'Gross Sales parity');
close(actual.reduce((sum,r)=>sum+r['Cash Flow'],0),actual.at(-1)['Running Cash Flow'],'real calculator final cash');
assert.equal(JSON.stringify(calc),before,'calculator, phase detail, ROI/IRR and header totals remain identical after export');
console.log('PASS PF monthly XLSX: one row/month; six overlapping engineering/construction phases; simultaneous sales; all additive columns; Master-only balances; rate labels; blank/zero/negative/sub-cent values; 60 shuffled models; real calculator/dashboard parity; no mutation or Creator writes; malformed-data failures.');
