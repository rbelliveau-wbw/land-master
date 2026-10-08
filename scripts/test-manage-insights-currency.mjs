// Actual Manage Lots payload/readback/receipt and Insights report helpers; no live writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const manageSource=fs.readFileSync('widgets/manage-lots/src/app/widget.html','utf8');
const modelContext={};vm.runInNewContext(fs.readFileSync('widgets/manage-lots/src/app/takedown-model.js','utf8'),modelContext);
const M=modelContext.LMTakedownModel,ID='90071992547409931',SUB='90071992547409932',BUILDER='90071992547409933';
function actual(name){const start=manageSource.indexOf('function '+name+'(');assert.ok(start>=0,name);const end=manageSource.indexOf('\n    function ',start+1);assert.ok(end>start,name);return manageSource.slice(start,end);}
for(const value of ['$ 12,500,109.920000','-$12,500,109.92','$ -12,500,109.92','($ 12,500,109.92)','−$12,500,109.92']){
  const negative=value!=='$ 12,500,109.920000';assert.equal(M.decimal(value),negative?'-12500109.92':'12500109.92');assert.equal(M.number(value),negative?-12500109.92:12500109.92);
}
for(const invalid of ['12,50.92','$--12.34','(-$12.34)','$12%','12oops',true,Infinity]){assert.throws(()=>M.decimal(invalid));assert.ok(Number.isNaN(M.number(invalid)));assert.equal(M.sameNumber(invalid,0),false);}
assert.equal(M.sameNumber('12500109.92','12500109.90'),false);
const precise='12500109.923456789',aliased='12500109.923456790';
assert.equal(Number(precise),Number(aliased),'fixture exercises a Number alias');
assert.equal(M.sameNumber(precise,aliased),false,'persisted comparison keeps exact decimal text');
assert.equal(M.inputNumber(precise),precise,'captured amount bypasses a lossy Number conversion');
assert.equal(M.inputNumber('12.123456'),12.123456,'existing exactly serializable numeric payloads remain numeric');
assert.equal(M.decimal(1e-7),'0.0000001');assert.equal(M.sameNumber(1e-7,'0.0000001000'),true);

const inputs={fName:'Receipt',fBuilder:BUILDER,fEntered:'2026-10-05',fPurchase:'2026-10-05',fTaxMethod:'Flat',fTaxStatus:'Taxes Paid',fStatus:'Active',fTaxPerLot:precise,fPercent:'1.234567890123456789',fFees:precise,ir1:'1.234567890123456789',if1:'2026-01-01',it1:'2026-10-05'};
let nativeItems=[];
const context=vm.createContext({LMTakedownModel:M,S:{selected:new Set([ID])},str:value=>String(value??''),selectedLotSubdivisionId:()=>SUB,val:name=>inputs[name]||'',toZoho:M.zoho,
  window:{LMTakedownEditor:{extraPayload:()=>({Base_Price_Subtotal:12500109.92,Subtract_Day_From:[],Additional_Items:M.itemPayload([{Item_Type:'Deduction',Name:'Credit',Quantity:1,Amount:precise}])})}},
  getAll:async(report,criteria)=>{assert.equal(report,'All_Additional_Items');assert.equal(criteria,'(Builder_Takedown1 == '+ID+')');return nativeItems;},CFG:{reports:{additionalItems:'All_Additional_Items'}}});
context.LMTakedownEditor=context.window.LMTakedownEditor;
vm.runInContext(['payload','validateFinancial','verifyTakedownDetails'].map(actual).join('\n'),context);
const payload=context.payload();
assert.equal(payload.Tax_Per_Lot,precise);assert.equal(payload.Additional_Fees_Per_Lot,precise);
assert.equal(payload.Percent_of_Appraisal,inputs.fPercent);assert.equal(payload.Interest_Rate_1,inputs.ir1);
assert.equal(payload.Additional_Items[0].Amount,precise);assert.equal(payload.Additional_Items[0].Quantity,1);
assert.equal(payload.Additional_Items[0].Total,-12500109.92,'settlement total keeps the existing cents rounding');
assert.equal(payload.Lot_Count,1);assert.deepEqual(Array.from(payload.Lots),[ID]);assert.equal(payload.Builder1,BUILDER);assert.equal(payload.Subdivision1,SUB);
assert.equal(M.ratePayload([{rate:inputs.ir1,from:'2026-01-01',to:'2026-10-05'}]).Interest_Rate_1,inputs.ir1);

const saved={...payload,Tax_Per_Lot:'$ 12,500,109.923456789',Additional_Fees_Per_Lot:'$12,500,109.923456789',Base_Price_Subtotal:'$12,500,109.920000',Percent_of_Appraisal:inputs.fPercent+'%',Interest_Rate_1:inputs.ir1+'%'};
const child={Item_Type:'Deduction',Name:'Credit',Quantity:'1.000',Amount:'$12,500,109.923456789',Total:'($12,500,109.92)'};
nativeItems=[child];await context.verifyTakedownDetails({payload},{takedown:saved,createdId:ID});
for(const total of ['-$12,500,109.92','$ -12,500,109.92','−$12,500,109.92']){nativeItems=[{...child,Total:total}];await context.verifyTakedownDetails({payload},{takedown:saved,createdId:ID});}
for(const change of [{Amount:aliased},{Total:'($12,500,109.90)'},{Amount:'$12,50,109.923456789'},{Amount:undefined}]){
  nativeItems=[{...child,...change}];await context.verifyTakedownDetails({payload},{takedown:saved,createdId:ID});
}
for(const change of [{Tax_Per_Lot:aliased},{Base_Price_Subtotal:'12500109.90'},{Interest_Rate_1:'1.234567890123456788'}]){
  await context.verifyTakedownDetails({payload},{takedown:{...saved,...change},createdId:ID});
}
nativeItems=[];await assert.rejects(context.verifyTakedownDetails({payload},{takedown:saved,createdId:ID}),/incomplete/,'missing child records remain an incomplete save');
const captured={financial:[{ID,Base_Price:precise,Earnest_Money:'0',Additional_Tax:'-0.25'}]};
context.validateFinancial(captured,new Map([[ID,{Base_Price:'$12,500,109.923456789',Earnest_Money:'$0.00',Additional_Tax:'($0.25)'}]]));
assert.throws(()=>context.validateFinancial(captured,new Map([[ID,{Base_Price:aliased,Earnest_Money:'0',Additional_Tax:'-0.25'}]])));
const receipt=M.receipt([{ID,Base_Price:12500109.92,Earnest_Money:0,Additional_Tax:0}],{purchase:'2026-10-05',taxDate:'',taxMethod:'Flat',taxStatus:'Taxes Paid',taxPerLot:0,percent:0,fees:'12.123456',subtract:[],periods:[],items:[]});
assert.equal(receipt.complete,true);assert.equal(receipt.rows[0].fees,12.12);assert.equal(receipt.rows[0].total,12500122.04);

const insights={};vm.runInNewContext(fs.readFileSync('widgets/lot-sales-explorer/src/app/sales-model.js','utf8'),insights);vm.runInNewContext(fs.readFileSync('widgets/lot-sales-explorer/src/app/budget-model.js','utf8'),insights);
for(const raw of ['-$12,500,109.92','$ -12,500,109.92','($12,500,109.92)','−$12,500,109.92'])assert.equal(insights.LotSalesModel.numeric(raw),-12500109.92);
assert.equal(insights.LotSalesModel.numeric('1.234567%'),1.234567);
assert.equal(insights.LotSalesModel.numeric('12,50.92'),null);assert.equal(insights.LotSalesModel.numeric('(-$12.34)'),null);
const budget=insights.InsightsBudgetModel||insights.BudgetInsightsModel||insights.LotBudgetModel;
assert.ok(budget,'actual budget model export');
const rows=budget.normalize({budgets:[{ID:SUB,Subdivision1:SUB}],categories:[{ID, Budget:SUB,Budget_Total:'($100.25)'}],items:[{ID:BUILDER,Budget:SUB,Budget_Category:ID,PROJ_Actual:'($0.25)',HCSS_Actuals:'$10.92'}],modifications:[],subdivisions:[],projects:[]});
assert.equal(rows[0].final,-100.25);assert.equal(rows[0].gp,-0.25);assert.equal(rows[0].hcss,10.92);
for(const file of ['sales-app.js','budget-app.js']){
  const source=fs.readFileSync('widgets/lot-sales-explorer/src/app/'+file,'utf8'),match=source.match(/^\s*const money = (.*);$/m);assert.ok(match,file);
  const show=vm.runInNewContext('('+match[1]+')');assert.equal(show(12500109.92),'$12,500,110');assert.equal(show(-0.25),'-$0');assert.equal(show(0),'$0');assert.equal(show(null),'—');
  assert.equal(show(1234.49),'$1,234');assert.equal(show(1234.50),'$1,235');assert.equal(show(-1234.50),'-$1,235');assert.equal(show(undefined),'—');
  if(file==='sales-app.js'){
    const perFoot=vm.runInNewContext('('+source.match(/^\s*const moneyFF = (.*);$/m)[1]+')');
    assert.equal(perFoot(1426.86),'$1,427');assert.equal(perFoot(220),'$220');assert.equal(perFoot(null),'—');
  }
}
console.log('PASS Manage Lots/Insights currency: captured amount/rate precision, exact financial preflight, child counts, acknowledged field differences, formatted credits, unchanged settlement/count/ID semantics and Insights monetary normalization/display.');
