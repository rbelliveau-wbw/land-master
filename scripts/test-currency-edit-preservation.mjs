// Actual currency functions and committing input handlers; no live Creator writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const budget=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8');
const tax=fs.readFileSync('widgets/tax-center/src/app/widget.html','utf8');
function extract(source,name){
  const start=source.indexOf('function '+name+'(');assert.ok(start>=0,name);
  const brace=source.indexOf('{',start);let depth=0;
  for(let i=brace;i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&!--depth)return source.slice(start,i+1);}
  throw new Error('Unclosed '+name);
}
const ID='90071992547410001',ITEM='90071992547410002',CATEGORY='90071992547410003';
const items=[{ID:ITEM,Budget_Category:{ID:CATEGORY},Prelim_Budget_Ttl:12500109.92,Budget_Ttl:'12500109.92',PROJ_Actual:'100.25'}];
const S={edBudget:{ID,Land_Cost:0,Lot_Price:0,Lot_Total_Residential:0},items:{[ID]:items},categories:{[ID]:[{ID:CATEGORY,Deparment:'Development',Budget_Total:'12500109.92'}]},edPhaseIdx:null};
const listeners={},matrixListeners={},headerWrites=[],itemWrites=[],nodes={requestBalance:{innerHTML:''},requestBudgetGuard:{classList:{toggle(){}}}};
const context=vm.createContext({S,Intl,Number,Date,Promise,
  document:{addEventListener:(name,callback)=>{listeners[name]=callback;}},
  mxEl:{addEventListener:(name,callback)=>{matrixListeners[name]=callback;}},
  $:name=>nodes[name],
  isObj:value=>value!==null&&typeof value==='object',
  firstRaw:(record,paths)=>paths.map(path=>path.split('.').reduce((value,key)=>value?.[key],record)).find(value=>value!=null&&value!=='')??null,
  cleanVal:value=>String(value??'').trim(),catDept:category=>category.Deparment,
  budgetMetricEditable:()=>true,escAttr:value=>String(value),
  findItemById:id=>items.find(item=>item.ID===id),
  isReimbursementBudgetItem:item=>!!item.reimbursement,
  queueBudgetSave:(id,field,value)=>headerWrites.push({id,field,value}),
  queueSave:(id,field,value)=>itemWrites.push({id,field,value}),
  recalcBudgetPerUnitItems:()=>[],renderPhaseMatrix(){},renderSummaryMatrices(){},renderProjectRatesLite(){},
  markInputState:(input,state)=>input.classList.add(state),updateProjectMatrixLive(){},updateCatSubtotal(){},setMsg(){},
  itemModAgg:()=>({approved:0.25}),requestAmountNumber:value=>Number(value)||0,
  budgetPerUnitEnabled:()=>false,budgetPerUnitStatus:()=>({}),budgetUnitRate:()=>0,
  canEditBudget:()=>true,canSubmitMod:()=>false,NOTE_PENCIL_SVG:'',esc:value=>String(value),modCellHtml:()=>''
});
const names=['fmt','fmtK','parseMoney','v','numFromPaths','budgetLots','budgetUnitNumber','metricRaw','metricDisp','renderBudgetMetrics','reimbursementMoneyField','normalizeReimbursementValue','catTotal','computeDeptTotals','compareNormalizeDetailAmount','compareAddDetailValue','comparePhaseDetailValue','requestFinancialValue','requestBalanceSnapshot','fmtRequestMoney','fmtRequestMod','renderRequestBalance','phaseItemRow'];
vm.runInContext(names.map(name=>extract(budget,name)).join('\n'),context);
const metrics=budget.slice(budget.indexOf('var BUDGET_METRICS ='),budget.indexOf('function budgetMetricEditable('));
vm.runInContext(metrics,context);
const headerAt=budget.indexOf('var inp = e.target.closest(".bmi");');
vm.runInContext(budget.slice(budget.lastIndexOf('document.addEventListener("change"',headerAt),budget.indexOf('document.addEventListener("focusin"',headerAt)),context);
const matrixAt=budget.indexOf('mxEl.addEventListener("input"');
vm.runInContext(budget.slice(matrixAt,budget.indexOf('mxEl.addEventListener("keydown"',matrixAt)),context);
function input(value,dataset,kind){const classes=new Set();return{value,dataset,selected:false,select(){this.selected=true;},classList:{add:name=>classes.add(name),contains:name=>classes.has(name),toggle(name,on){on?classes.add(name):classes.delete(name);}},closest(selector){return selector===kind?this:selector==='.editor-metric'?{classList:{toggle(){}}}:null;}};}
for(const value of [12500109.92,12.123456,-12.123456,0]){
  assert.equal(context.parseMoney(context.fmt(value,true)),value,'editable formatting preserves fractional input');
  assert.equal(context.v(String(value)),value,'financial reads preserve fractions');
}
assert.equal(context.fmt(12500109.92),'$12,500,109.92');
for(const parser of ['parseMoney','v','budgetUnitNumber'])for(const credit of ['($12,500,109.923456)','−$12,500,109.923456'])assert.equal(context[parser](credit),-12500109.923456,parser+' preserves formatted credits');
assert.equal(context.metricRaw({Land_Cost:'($12,500,109.92)'},'Land_Cost'),-12500109.92);
assert.equal(context.fmt(-0.25),'-$0.25');assert.equal(context.fmt(0),'$0');
for(const show of [context.fmt,context.fmtRequestMoney]){
  assert.equal(show(20000),'$20,000');assert.equal(show(-20000),'-$20,000');
  assert.equal(context.parseMoney(show(12.123456,true)),show===context.fmt?12.123456:12.12);
}
assert.ok(!budget.includes('$0.00'),'zero currency labels also omit cents');
assert.equal(context.fmtK(12.25),'$12.25');assert.equal(context.metricDisp('money',12.25),'$12.25');
assert.equal(context.budgetLots({Lot_Total_Residential:'7.9'}),8,'lot counts retain explicit whole-number rounding');
const rendered=context.renderBudgetMetrics({...S.edBudget,Land_Cost:12500109.92,Lot_Price:12.123456});
assert.match(rendered,/data-bf='Land_Cost'[^>]*value='12,500,109\.92'/);
assert.match(rendered,/data-bf='Lot_Price'[^>]*value='12\.123456'/);
for(const [field,value]of [['Land_Cost','12,500,109.92'],['Lot_Price','12.123456']]){
  const element=input(value,{bf:field,kind:'money'},'.bmi');listeners.change({target:element});
  assert.equal(S.edBudget[field],context.parseMoney(value));assert.equal(headerWrites.at(-1).value,context.parseMoney(value));
  assert.equal(context.parseMoney(element.value),context.parseMoney(value));
}
const count=input('7.9',{bf:'Lot_Total_Residential',kind:'int'},'.bmi');listeners.change({target:count});assert.equal(headerWrites.at(-1).value,8);
assert.equal(headerWrites.every(write=>write.id===ID),true,'exact record IDs remain strings');
assert.match(context.phaseItemRow(items[0],S.edBudget,true,false,false),/data-f='Prelim_Budget_Ttl' value='\$12,500,109\.92'/);
const untouched=input(context.fmt(items[0].Prelim_Budget_Ttl,true),{id:ITEM,f:'Prelim_Budget_Ttl'},'.ci');
matrixListeners.focusin({target:untouched});assert.equal(untouched.value,'12500109.92');matrixListeners.blur({target:untouched});
assert.equal(itemWrites.length,0,'focus and blur alone do not replay an item write');assert.equal(untouched.value,'$12,500,109.92');
for(const [value,reimbursement,wanted]of [['12.123456',false,12.123456],['12.25',true,-12.25],['($12,500,109.923456)',false,-12500109.923456]]){
  items[0].reimbursement=reimbursement;const element=input(value,{id:ITEM,f:'Prelim_Budget_Ttl'},'.ci');
  matrixListeners.input({target:element});matrixListeners.blur({target:element});
  assert.equal(itemWrites.at(-1).value,wanted);assert.equal(context.parseMoney(element.value),wanted);
}
assert.equal(context.catTotal([{Budget_Total:'10.25'},{Budget_Total:'20.50'}],'Budget_Total'),30.75);
const totals=context.computeDeptTotals(S.edBudget);assert.equal(totals.dev.final,12500109.92);assert.equal(totals.dev.actual,100.25);
assert.equal(context.compareNormalizeDetailAmount('reimbursements','12.25'),-12.25);
const projection={values:{}};context.compareAddDetailValue(projection,'phase','10.25');context.compareAddDetailValue(projection,'phase','20.50');assert.equal(projection.values.phase,30.75);
assert.equal(context.comparePhaseDetailValue({selected:'auto'},{Budget_Ttl:'10.25',Prelim_Budget_Ttl:'20.50'}),10.25);
S.modModal={requestFlow:true,requestType:'Purchase Order',requestAmount:200.51,poState:'loaded',poItemId:ITEM,poIssued:0};context.renderRequestBalance({ID:ITEM,Budget_Ttl:'200.25',PROJ_Actual:'100.25'});
assert.match(nodes.requestBalance.innerHTML,/Remaining After Current Request[\s\S]*-\$0\.01/,'request overage retains the one-cent difference');

const taxWrites=[],taxRow={id:ID},taxContext=vm.createContext({Intl,Number,Date,Promise,
  state:{data:{parcelYears:[taxRow]},savingIds:{}},CONFIG:{reports:{parcelYears:'All_Tax_Parcel_Years'}},Tax:{canEdit:()=>true},
  inlineSourceElement:()=>null,inlineStateKey:()=>'',markInlineState(){},renderSaveIndicator(){},applyCodeAndPropertyLink(){},diag(){},
  updateRecord:(id,fields)=>{taxWrites.push({id,fields});return Promise.resolve();},displayValue:value=>value
});
taxContext.window=taxContext;vm.runInContext(fs.readFileSync('widgets/tax-center/src/app/tax-controller.js','utf8')+'\nTax.currencyText=LMTaxPreparation.create({reports:{},forms:{}}).currencyText;',taxContext);
vm.runInContext(['currencyNumberText','numericValue','money','utilitiesconvertIntegerToCurrency','formatCurrencyInput','unformatCurrencyInput','inlineSave'].map(name=>extract(tax,name)).join('\n'),taxContext);
assert.equal(taxContext.money(12500109.92),'$12,500,109.92');assert.equal(taxContext.money(0),'$0.00');
assert.equal(taxContext.money('($12,500,109.92)'),'-$12,500,109.92');
assert.equal(taxContext.numericValue('−$12,500,109.923456'),-12500109.923456);
for(const amount of ['12500109.92','12.123456','-12.123456','0']){
  const node={value:amount};taxContext.formatCurrencyInput(node);taxContext.unformatCurrencyInput(node);
  assert.equal(Number(node.value),Number(amount),'Tax render/focus keeps the amount');
  taxContext.formatCurrencyInput(node);assert.equal(taxContext.numericValue(node.value),Number(amount),'Tax blur keeps the amount');
}
assert.equal(taxContext.utilitiesconvertIntegerToCurrency('123456789.123456789'),'$123,456,789.123456789','formatting preserves supplied decimal strings without a Number conversion');
const accounting={value:'($12,500,109.923456)'};taxContext.formatCurrencyInput(accounting);assert.equal(accounting.value,'-$12,500,109.923456');taxContext.unformatCurrencyInput(accounting);assert.equal(accounting.value,'-12500109.923456');assert.equal(taxContext.numericValue('($12,500,109.923456)'),-12500109.923456);
for(const field of ['Market_Value','Assessed_Value','Settlement_Offer_Value','Assessed_Offer','Final_Value','Assessed_Final']){
  const node={value:taxContext.utilitiesconvertIntegerToCurrency('12500109.92')};taxContext.unformatCurrencyInput(node);
  await taxContext.inlineSave(ID,{[field]:node.value});assert.equal(taxWrites.at(-1).id,ID);assert.equal(taxWrites.at(-1).fields[field],'12500109.92');
  node.value='12.123456';taxContext.formatCurrencyInput(node);await taxContext.inlineSave(ID,{[field]:node.value});assert.equal(taxWrites.at(-1).fields[field],'12.123456');
  await taxContext.inlineSave(ID,{[field]:'($12,500,109.923456)'});assert.equal(taxWrites.at(-1).fields[field],'-12500109.923456');
  for(const amount of ['0.0000001','12.123456789012345','123456789.123456789']){await taxContext.inlineSave(ID,{[field]:amount});assert.equal(taxWrites.at(-1).fields[field],amount,'Monetary payload preserves supplied fractional text');}
}
const beforeMalformed=taxWrites.length;for(const invalid of ['1e-7','($-12.34)','$12,34.56'])await assert.rejects(taxContext.inlineSave(ID,{Market_Value:invalid}));assert.equal(taxWrites.length,beforeMalformed);assert.equal(Object.keys(taxContext.state.savingIds).length,0,'Invalid input clears Saving state without sending a write');
console.log('PASS currency edit preservation: actual Budget money/count/header/item handlers, credits, financial aggregates/comparison/request projections, Tax focus/blur and six native money payload fields.');
