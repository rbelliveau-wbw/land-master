import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8');
function fn(name){
  const start=source.indexOf('function '+name+'('),brace=source.indexOf('{',start);
  assert.ok(start>=0,name);let depth=0;
  for(let i=brace;i<source.length;i++){
    if(source[i]==='{')depth++;if(source[i]==='}')depth--;
    if(!depth)return source.slice(start,i+1);
  }
  throw Error(name);
}
const ctx=vm.createContext({
  S:{myAccessId:'',dash:{}},HEADER_FIELDS:['Name','Land_Cost_Acre','Total_Acres','Total_Street_LF','Lot_Size_Ft','Sale_Price_FF','Overhead','Interest','Earnest_Money','Amount_per_Extension','Land_Sale','Engineering_Cost_Lot','Const_Cost_FF','Phases'],
  PRESERVE_EMPTY_HEADER_FIELDS:{},LOI_FIELD_DEFS:[{key:'Total_Acres'},{key:'Amount_per_Acre'},{key:'Earnest_Money'},{key:'Amount_per_Extension'}],
  syncDerivedLoiFields:()=>{},multiLookupIds:()=>[],savedInputLock:()=>false,
  ymToCreator:()=>'',dateToCreatorValue:v=>v,phaseSalesAdopted:()=>false,
  monthListToCsv:()=>'',parseMonthList:()=>[],normalizeZeroCostAdditionalItems:()=>{},
  loiAcreCheck:()=>({mismatch:false}),loiPriceCheck:()=>({mismatch:false}),phaseSalesPlan:()=>{},
  document:{querySelector:()=>null},toast:()=>{},dealCloneWith:(m,k,v)=>({...m,[k]:v}),
  modelToCalc:()=>({}),renderDashboard:()=>{},dealCancelRecalc:()=>{}
});
const helperStart=source.indexOf('var PF_WHOLE_HEADER='),helperEnd=source.indexOf('function validateModel(',helperStart);
vm.runInContext(['num','intN','hasVal','round2','round0','stripMoney','stripNumberGroups','inFmtN','inFmt$','buildHeaderData','buildLoiHeaderData','childData','buildSavePayload','dealApplyDriver','validateModel'].map(fn).join('\n')+'\n'+source.slice(helperStart,helperEnd)+'\n'+source.match(/var DEAL_DRIVERS=\[[\s\S]*?\n\];/)[0],ctx);
for(const raw of ['12345.6789','0.000001','-1234.5678','1500.0100']){
  const grouped=ctx.inFmt$(raw);
  assert.equal(ctx.stripMoney(grouped),raw,'blur/focus retains every entered decimal digit');
  assert.equal(ctx.stripNumberGroups(ctx.inFmtN(raw)),raw);
}
assert.equal(ctx.inFmt$(''),'');assert.equal(ctx.inFmt$(null),'');
const m={ID:'4410926000004947002',Name:'Precision QA',Land_Cost_Acre:'12345.6789',Total_Acres:'1234.5678',Total_Street_LF:'12345.6789',Lot_Size_Ft:'50.1256',Sale_Price_FF:'1500.1234',Overhead:'2.1234',Interest:'8.5678',Earnest_Money:'25000.6789',Amount_per_Extension:'1500.3456',Land_Sale:'1234.5678',Engineering_Cost_Lot:'123.4567',Const_Cost_FF:'987.6543',Phases:'1',purchaseInstallments:[{Installment:'1',Month1:'1',Cost:'123.4567',Percent1:'12.3456'}],saleInstallments:[],pidMud:[{Month1:'1',Cost:'123.4567'}],items:[{Item_Name:'Test',_perUnit:true,Per_Unit:'12.3456',Add_l_Cost:'123.4567',Start_Phase:'1',End_Phase:'1'}],curve:[{Month_Number:'1',Percent_Cost:'12.3456'}]};
const before=JSON.stringify(m),calc={totals:{},schedule:{}};
const payload=ctx.buildSavePayload(m,calc),header=payload.header;
for(const key of ctx.HEADER_FIELDS)assert.equal(header[key],m[key],key+' survives the save unchanged');
assert.equal(JSON.stringify(m),before,'saving must not normalize the editor inputs');
assert.equal(payload.purchaseInstallments[0].Cost,'123.4567');
assert.equal(payload.purchaseInstallments[0].Percent1,'12.3456');
assert.equal(payload.pidMud[0].Cost,'123.4567');
assert.equal(payload.items[0].Per_Unit,'12.3456');
assert.equal(payload.items[0].Add_l_Cost,'123.4567');
assert.equal(payload.curve[0].Percent_Cost,'12.3456');
const loi=ctx.buildLoiHeaderData(m);
assert.equal(loi.Amount_per_Acre,m.Land_Cost_Acre);
assert.equal(loi.Earnest_Money,m.Earnest_Money);
assert.equal(loi.Total_Acres,m.Total_Acres);
for(const v of ['2.5','1.001','not a number'])assert.equal(ctx.invalidWholeNumber(v),true);
for(const v of ['',null,'2','2.0','1,234'])assert.equal(ctx.invalidWholeNumber(v),false);
const invalid={...m,Total_Street_LF:'12345',Phases:'1.5',Purchase_Installments:'2.5',Engineering_Length_Months:'3.2',Initial_Feasibility_Days:'60.5',lotMix:[{Lot_Count:'100.5'}],curve:[{Month_Number:'1.5'}],phaseSales:[{Total_Lots:'100.5',Lots_Per_Take:'10.5'}],items:[{Start_Phase:'1.5'}],pidMud:[{Month1:'1.5'}]};
const errors=[];ctx.validateWholeInputs(invalid,(pane,msg)=>errors.push({pane,msg}));
assert.equal(errors.length,10);
assert.ok(errors.every(e=>e.msg.includes('whole number')));
assert.equal(invalid.Phases,'1.5','invalid counts stay visible for correction');
assert.ok(source.includes('validateWholeInputs(m,err);'),'the save validator runs the whole-number checks');
assert.ok(source.includes('PF_WHOLE_LOI).forEach'),'LOI saves reject fractional day and extension counts');
ctx.S.dash.model={Lots:'100'};ctx.dealApplyDriver('Lots','100.5');assert.equal(ctx.S.dash.model.Lots,'100');
ctx.S.dash.model.Total_Street_LF='5000';ctx.dealApplyDriver('Total_Street_LF','5000.5');assert.equal(ctx.S.dash.model.Total_Street_LF,'5000');
for(const key of ['Land_Cost_Acre','Total_Acres','Sale_Price_FF']){
  ctx.dealApplyDriver(key,'1234.56789');assert.equal(Number(ctx.S.dash.model[key]),1234.56789);
}
const backend=fs.readFileSync('creator/functions/proforma_save.dg','utf8');
for(const field of ['Land_Cost_Acre','Total_Acres'])assert.ok(backend.includes('pf.'+field+'=header.get("'+field+'").toDecimal();'));
assert.ok(backend.indexOf('wholeInputRules = Map();')<backend.indexOf('newRec = insert into Add_Pro_Forma'),'counts are checked before writes');
console.log('Pro Forma decimals survive blur, focus, save payloads and scenarios; fractional counts reject without rounding.');
