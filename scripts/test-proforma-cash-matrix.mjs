import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ready,source} from './fixtures/proforma-sdk-v2-harness.mjs';

const testSource=source.replace('window.__PFW_TEST__={',
  'window.__PFW_TEST__={syncPersistentRecordHeader:syncPersistentRecordHeader,buildProformaWorkbook:buildProformaWorkbook,proformaCashFlowMatrixRows:proformaCashFlowMatrixRows,');
const h=await ready({source:testSource,references:false});
const xc=vm.createContext({});
vm.runInContext(fs.readFileSync('widgets/land-master/src/app/vendor/xlsx.full.min.js','utf8'),xc);
const X=xc.XLSX;
const model={purchaseDate:{y:2027,m:12}};
h.widget.syncPersistentRecordHeader(null,model,null);
assert.equal(h.node('dhPurchase').textContent,'Dec, 2027','no installments falls back to project start');
h.widget.syncPersistentRecordHeader(null,{...model,purchaseInstallments:[{Month1:3},{Month1:7}]},null);
assert.equal(h.node('dhPurchase').textContent,'Feb, 2028 (1 of 2)','top card uses actual first-installment timing and count');
h.widget.syncPersistentRecordHeader(null,{...model,purchaseInstallments:[{Date1:'05/01/2028',Month1:3}]},null);
assert.equal(h.node('dhPurchase').textContent,'May, 2028','explicit installment date takes precedence over month offset');
let running=0;
const calc={months:[],agg:Array.from({length:30},(_,i)=>{
  const m=i+1,total=2027*12+11+i,date={y:Math.floor(total/12),m:total%12+1};
  const sales=i===25?550.12345:0,base=i===25?560.12345:0,markup=i===25?-15.25:0,escalator=i===25?5.25:0;
  const landCost=i===0?100.005:0,eng=i===1?20.12345:0,dev=i===2?30.00001:0;
  const construction=i===3?40.5:0,constAddl=i===4?50.5:0,reimb=i===5?10.00001:0,fees=i===6?5.00001:0;
  const totalIncome=sales+reimb+fees,totalExpenses=landCost+eng+dev+construction+constAddl,cash=totalIncome-totalExpenses;
  running+=cash;
  return {m,date,fls:sales,landSale:0,pid:0,reimb,reimbFees:fees,totalIncome,landCost,engByPhase:{1:eng},engAddl:dev,
    constByPhase:{1:construction},constAddl,totalExpenses,cash,runCash:running,
    items:{engAddl:{'Engineer <review>':dev},constAddl:{Paving:constAddl},reimb:{Refund:reimb},reimbFees:{'Permit Fees':fees}},
    base,markup,escalator};
})};
calc.months=calc.agg.map(a=>({Month1:a.m,date:a.date,Master_Month:true,Base_Lot_Sales:a.base,
  Additional_Markup_Income:a.markup,Escalator_Interest_Accrued:a.escalator,Finished_Lot_Sales:a.fls,
  Cash_Flow:a.cash,Running_Cash_Flow:a.runCash}));
h.widget.S.dash.page=1;h.widget.S.dash.tab='timeline';h.widget.S.dash.expanded={};
const before=JSON.stringify({model,calc,dash:h.widget.S.dash});
const built=h.widget.buildProformaWorkbook(X,model,calc);
assert.ok(built.SheetNames.includes('Months'),'existing Months tab remains available');
assert.ok(built.SheetNames.includes('Cash Flow Matrix'),'new complete matrix tab exists');
const reopened=X.read(X.write(built,{type:'array',bookType:'xlsx'}),{type:'array'});
const ws=reopened.Sheets['Cash Flow Matrix'];
const table=Array.from(X.utils.sheet_to_json(ws,{header:1,defval:''}),row=>Array.from(row));
const row=label=>{const found=table.find(r=>r[0].trim()===label);assert.ok(found,label+' is present');return found;};
assert.deepEqual(table[0].slice(0,3),['Category','Total','Mth 1 · Dec 2027']);
assert.equal(table[0].at(-1),'Mth 30 · May 2030','export includes months after the visible 24-month page');
assert.ok(table.every(r=>r.length===32),'all month and total columns align');
for(const label of ['Base Price','Phase Increase','Escalator','Engineer <review>','Paving','Refund','Permit Fees']){
  assert.ok(row(label)[0].startsWith('    '),label+' is expanded and indented even when UI is collapsed');
}
assert.equal(row('Phase Increase')[1],-15.25,'negative markup retains its sign');
assert.equal(row('Finished Lot Sales')[1],550.12345,'sales detail never doubles parent income');
assert.equal(row('Dev Costs')[1],30.00001,'development costs preserve calculation precision');
assert.equal(row('Total Income')[1],calc.agg.reduce((sum,a)=>sum+a.totalIncome,0));
assert.equal(row('Total Expenses')[1],calc.agg.reduce((sum,a)=>sum+a.totalExpenses,0));
assert.equal(row('Cash Flow Monthly')[1],calc.agg.reduce((sum,a)=>sum+a.cash,0));
assert.equal(row('Cash Flow Cumulative')[1],calc.agg.at(-1).runCash,'cumulative total takes the last balance');
assert.equal(row('Cash Flow Monthly')[2],-100.005,'loss months remain negative');
for(const label of ['Cash Flow Monthly','Cash Flow Cumulative']){
  const r=table.indexOf(row(label));
  for(let c=1;c<32;c++)assert.equal(ws[X.utils.encode_cell({r,c})].t,'n','matrix amounts are real Excel numbers');
}
assert.equal(JSON.stringify({model,calc,dash:h.widget.S.dash}),before,'export leaves calculations and dashboard state unchanged');
assert.equal(h.writes.length,0,'export does not write Creator records');
assert.ok(!h.widget.buildProformaWorkbook(X,{},null).SheetNames.includes('Cash Flow Matrix'),'incomplete schedules do not invent financials');
console.log('PASS Pro Forma Cash Flow Matrix: actual XLSX round-trip, all 30 months, expanded detail, numeric precision, signed cash, final cumulative total, no UI/model mutation or Creator writes.');
