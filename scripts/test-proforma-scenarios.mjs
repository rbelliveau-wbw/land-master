import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8');
function fn(name){
 const start=source.indexOf(`function ${name}(`); assert.ok(start>=0,name);
 const brace=source.indexOf('{',start); let depth=0;
 for(let i=brace;i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}')depth--;if(!depth)return source.slice(start,i+1);}
 throw Error(name);
}
const ctx=vm.createContext({S:{dash:{}}, CFG:{irr:{}}, document:{querySelector:()=>null}, renderDashboard(){}, dealCancelRecalc(){}, dealScheduleRecalc(){}});
const names=['num','intN','round2','hasVal','fmtN','fmt$','esc','ymAdd','additionalCostUnitQuantity','syncPerUnitAdditionalCost','syncAllPerUnitAdditionalCosts','computeProforma','modelToCalc','dealCloneWith','dealApplyDriver','dealFmtDelta','dealSnapshot','dealKpis','dealPeakCash','curveLengthValue','lookupDisplayValue'];
vm.runInContext(names.map(fn).join('\n')+'\n'+source.match(/var DEAL_DRIVERS=\[[\s\S]*?\n\];/)[0],ctx);
const model={Total_Acres:'100',Land_Cost_Acre:'10000',Total_Street_LF:'5000',Lot_Size_Ft:'50',Lots:'100',Phases:'1',Sale_Price_FF:'1500',Const_Cost_FF:'300',Engineering_Cost_Lot:'500',Engineering_Length_Months:'2',Engineering_Delay_Months:'0',Construction_Length:'2',Construction_Delay_Months:'0',Initial_Takedown:'10',Lots_per_Month:'10',purchaseInstallments:[{Cost:'250000',Percent1:'25',Month1:'1'},{Cost:'750000',Percent1:'75',Month1:'2'}],curve:[{Month_Number:'1',Percent_Cost:'50'},{Month_Number:'2',Percent_Cost:'50'}],items:[{_perUnit:true,Unit:'Acre',Per_Unit:'100',Add_l_Cost:'10000',Department:'Construction',Start_Phase:'1',End_Phase:'1'},{_perUnit:true,Unit:'LF',Per_Unit:'2',Add_l_Cost:'10000',Department:'Construction',Start_Phase:'1',End_Phase:'1'},{_perUnit:true,Unit:'Lot',Per_Unit:'10',Add_l_Cost:'1000',Department:'Construction',Start_Phase:'1',End_Phase:'1'},{_perUnit:false,Add_l_Cost:'777',Department:'Construction',Start_Phase:'1',End_Phase:'1'}]};
const before=JSON.stringify(model);const base=ctx.computeProforma(model);
for(const [key,val] of [['Total_Acres',110.25],['Total_Street_LF',6000],['Lot_Size_Ft',55.25],['Lots',110],['Land_Cost_Acre',11000]]){
 const changed=ctx.dealCloneWith(model,key,val),calc=ctx.modelToCalc(changed);
 assert.equal(JSON.stringify(model),before,'sensitivity must not mutate baseline');
 assert.notEqual(calc.totals.Net_Profit,base.totals.Net_Profit,key+' affects profit');
 assert.notEqual(calc.irr,base.irr,key+' affects IRR');
 assert.equal(changed.items[3].Add_l_Cost,'777','manual additional cost stays fixed');
 if(key==='Total_Acres'){
  assert.equal(changed.purchaseInstallments.reduce((s,r)=>s+Number(r.Cost),0),1102500);
  assert.equal(changed.purchaseInstallments[1].Month1,'2');
  assert.equal(changed.items[0].Add_l_Cost,'11025');
  assert.equal(calc.totals.Land_Cost,1102500);
 }
 if(key==='Total_Street_LF'){assert.equal(calc.totals.Construction_Cost_Base,1800000);assert.equal(changed.items[1].Add_l_Cost,'12000');}
 if(key==='Lot_Size_Ft')assert.equal(calc.totals.Gross_Sales,8287500);
 ctx.S.dash.model=structuredClone(model);ctx.dealApplyDriver(key,String(val));
 assert.equal(ctx.S.dash.calc.totals.Net_Profit,calc.totals.Net_Profit,'interactive and sensitivity calculations agree');
 const snap=ctx.dealSnapshot(changed,calc);assert.equal(Number(snap.inputs[key]),val);
}
ctx.S.dash.model=structuredClone(model);
ctx.dealApplyDriver('Total_Acres','123.456');assert.equal(ctx.S.dash.model.Total_Acres,'123.46');
ctx.dealApplyDriver('Total_Street_LF','6,123.7');assert.equal(ctx.S.dash.model.Total_Street_LF,'6124');
ctx.dealApplyDriver('Lot_Size_Ft','-3');assert.equal(ctx.S.dash.model.Lot_Size_Ft,'0.01');
assert.match(ctx.dealFmtDelta(0.25,false,false,'acres',false),/0.25/);
assert.equal(ctx.DEAL_DRIVERS.length,13);
console.log('Scenario quantity, cash flow, per-unit cost, isolation, input precision and snapshot regressions passed.');
