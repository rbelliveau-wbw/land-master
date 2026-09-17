import assert from 'node:assert/strict';
await import('../widgets/lot-sales-explorer/src/app/sales-model.js');
await import('../widgets/lot-sales-explorer/src/app/budget-model.js');
await import('../widgets/lot-sales-explorer/src/app/budget-adapter.js');
const M=globalThis.InsightsBudgetModel;
const base={ID:'9000000000000000001',Budget_Name:'Phase A',Subdivision1:{ID:'s1'},Const_Budget_Approval_Status:'Approved',Development_Budget_Approval_Status:'Approved',Status:'Active',Added_Time:'01/01/2026'};
const data={projects:[{ID:'p1',Project_Name:'Project One'}],subdivisions:[{ID:'s1',Project:{ID:'p1'},Subdivision_Name:'Phase A',Territory:'North'}],
  budgets:[base,{...base,ID:'9000000000000000002',Development_Budget_Approval_Status:'Pending',Added_Time:'02/01/2026'},{...base,ID:'9000000000000000000',Added_Time:'12/01/2025'},{ID:'other',Budget_Name:'Unlinked',Subdivision1:''}],
  categories:[{ID:'c1',Budget:{ID:base.ID},Budget_Category_Name:'Roads',Deparment:'Construction',Budget_Total:'100000'}],
  items:[{ID:'i1',Budget:{ID:base.ID},Budget_Category:{ID:'c1'},PROJ_Actual:'120000',HCSS_Actuals:'60000'}],
  modifications:[{ID:'m1',Budget:{ID:base.ID},Budget_Category:{ID:'c1'},Budget_Item:{ID:'i1'},Modification_Type:'Increase',Status:'Approved',Amount:'10000'},
    {ID:'m2',Budget:{ID:base.ID},Budget_Category:{ID:'c1'},Budget_Item:{ID:'i1'},Modification_Type:'Decrease',Status:'Approved',Amount:'2000'},
    {ID:'m3',Budget:{ID:base.ID},Budget_Category:{ID:'c1'},Budget_Item:{ID:'i1'},Modification_Type:'Increase',Status:'Submitted',Amount:'50000'}]};
const snapshot=JSON.stringify(data),rows=M.normalize(data);
assert.equal(JSON.stringify(data),snapshot);
assert.throws(()=>M.report(rows,{scope:''}),/Choose/);
let r=M.report(rows,{scope:'approved',basis:'revised'});
assert.equal(r.count,1);assert.equal(r.rows[0].id,base.ID);
assert.equal(r.budget,108000);assert.equal(r.actual,120000);assert.equal(r.overrun,12000);assert.equal(r.remaining,-12000);assert.equal(r.pending,50000);
assert.equal(r.rows[0].hcss,60000,'HCSS must not be added to GP');
assert.equal(r.rows[0].details[0].revised,108000,'category modification counted only once despite both lookup paths');
r=M.report(rows,{scope:'approved',basis:'final'});assert.equal(r.overrun,20000);
r=M.report(rows,{scope:'latest'});assert.equal(r.rows.find(r=>r.subdivisionId==='s1').id,'9000000000000000002');assert.equal(r.count,2);
r=M.report(rows,{scope:'all'});assert.equal(r.count,4);assert.equal(r.missing,3);assert.equal(r.budget,108000);
assert.equal(M.report(rows,{scope:'all',projectId:'not-visible'}).count,0);
assert.equal(M.report(rows,{scope:'all',projectId:'not-visible'}).budget,null,'empty report is not zero budget');
const zero=M.normalize({...data,categories:[{...data.categories[0],Budget_Total:0}],items:[{...data.items[0],PROJ_Actual:0}],modifications:[]});
r=M.report(zero,{scope:'approved',basis:'revised'});assert.equal(r.budget,0);assert.equal(r.remaining,0);assert.equal(r.rows[0].used,null);
const credit=M.normalize({...data,items:[{...data.items[0],PROJ_Actual:-50}],modifications:[]});
assert.equal(M.report(credit,{scope:'approved'}).actual,-50,'GP credits remain signed');
console.log('Insights budgets: approval scope, latest record selection, signed modifications, GP/HCSS separation, empty/zero detail and totals passed.');
