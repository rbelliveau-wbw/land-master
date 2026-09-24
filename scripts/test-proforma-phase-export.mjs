import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const widget=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8');
function widgetFunction(name){
  const start=widget.indexOf(`function ${name}(`);
  assert.ok(start>=0,name);
  const brace=widget.indexOf('{',start);
  let depth=0;
  for(let i=brace;i<widget.length;i++){
    if(widget[i]==='{')depth++;
    if(widget[i]==='}')depth--;
    if(depth===0)return widget.slice(start,i+1);
  }
  throw Error(`Unclosed ${name}`);
}
const format={
  xNum:v=>v==null||v===''?'':Number(v),
  xBool:v=>String(v).toLowerCase()==='true'?'Yes':'No',
  dateToCreatorValue:v=>v==='2027-03-01'?'03/01/2027':String(v||''),
  ymShort:()=> 'Mar 2027',
  fmtN:(v,dec=0)=>Number(v).toFixed(dec),
  fmt$:v=>`$${Math.round(v)}`,
  fmtPct:(v,dec=2)=>`${Number(v).toFixed(dec)}%`,
  num:v=>Number(v||0),
  esc:v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;'),
  proformaInputRows:()=>[['Section','Field','Value']]
};
const ctx=vm.createContext({...format,S:{ed:{calc:null}},document:{getElementById:()=>null}});
vm.runInContext(widgetFunction('buildProformaWorkbook')+'\n'+widgetFunction('renderMonthsPane'),ctx);
const X={utils:{
  book_new:()=>({SheetNames:[],Sheets:{}}),
  aoa_to_sheet:rows=>({rows}),
  book_append_sheet:(wb,ws,name)=>{wb.SheetNames.push(name);wb.Sheets[name]=ws;}
}};
const phase={Phase:1,Acres:2,Total_Lots:10,Eng_Start_Month:1,Eng_End_Month:1,
  Const_Start_Month:2,Const_End_Month:2,Lot_Sale_Start_Month:3,Lot_Sale_End_Month:3,Lot_Closing_Length:1,
  Initial_Take_Lots:10,Initial_Delay_Months:0,First_Recurring_Delay_Months:0,Lots_Per_Take:0,
  Take_Frequency:'Monthly',Escalator_Enabled:false,Annual_Escalator_Pct:0,Esc_Start_Date:'2027-03-01',
  Additional_Markup_Pct:-2,Take_Count:1};
const month={Month1:3,date:{y:2027,m:3},Master_Month:true,Lot_Sale_Phase:1,Lots_Sold:10,
  Base_Lot_Sales:500000,Additional_Markup_Income:-10000,Escalator_Interest_Accrued:0,
  Escalator_Percentage:0,Escalator_Elapsed_Months:0,Escalator_Applied_Pct:0,Finished_Lot_Sales:490000};
function sheet(wb,name){return wb.Sheets[name].rows;}
const adopted=ctx.buildProformaWorkbook(X,{}, {phases:[phase],months:[month]});
const [phaseHead,phaseRow]=sheet(adopted,'Phases');
const [monthHead,monthRow]=sheet(adopted,'Months');
assert.equal(phaseHead.length,phaseRow.length,'phase header/data columns must align');
assert.equal(monthHead.length,monthRow.length,'month header/data columns must align');
assert.equal(phaseRow[phaseHead.indexOf('Initial Take Lots')],10);
assert.equal(phaseRow[phaseHead.indexOf('Initial Delay Months')],0);
assert.equal(phaseRow[phaseHead.indexOf('Escalator Enabled')],'No');
assert.equal(phaseRow[phaseHead.indexOf('Esc Start Date')],'03/01/2027');
assert.equal(phaseRow[phaseHead.indexOf('Additional Markup %')],-2);
assert.equal(phaseRow[phaseHead.indexOf('Take Count')],1);
assert.equal(monthRow[monthHead.indexOf('Base Lot Sales')],500000);
assert.equal(monthRow[monthHead.indexOf('Additional Markup Income')],-10000);
assert.equal(monthRow[monthHead.indexOf('Escalator Interest Accrued')],0);
assert.equal(monthRow[monthHead.indexOf('Escalator Applied %')],0);

const legacy=ctx.buildProformaWorkbook(X,{}, {phases:[{Phase:1,Total_Lots:10}],months:[{Month1:3,Master_Month:true,Lots_Sold:10,Finished_Lot_Sales:500000}]});
const [legacyPhaseHead,legacyPhaseRow]=sheet(legacy,'Phases');
const [legacyMonthHead,legacyMonthRow]=sheet(legacy,'Months');
assert.equal(legacyPhaseRow[legacyPhaseHead.indexOf('Escalator Enabled')],'', 'legacy phase fields stay blank');
assert.equal(legacyPhaseRow[legacyPhaseHead.indexOf('Initial Take Lots')],'');
assert.equal(legacyMonthRow[legacyMonthHead.indexOf('Base Lot Sales')],'', 'legacy month fields stay blank');
assert.equal(legacyMonthRow[legacyMonthHead.indexOf('Escalator Applied %')],'');

const host={innerHTML:''};
ctx.document.getElementById=()=>host;
ctx.S.ed.calc={phases:[phase],months:[month]};
ctx.renderMonthsPane();
assert.match(host.innerHTML,/<th>Initial Lots<\/th>/);
assert.match(host.innerHTML,/<th>Applied Esc %<\/th>/);
assert.match(host.innerHTML,/>03\/01\/2027<\/td>/);
assert.match(host.innerHTML,/>-2\.00%<\/td>/);
assert.match(host.innerHTML,/>\$-10000<\/td>/);
for(const table of host.innerHTML.match(/<table\b[\s\S]*?<\/table>/g)||[]){
  const headers=(table.match(/<th\b/g)||[]).length;
  const firstRow=table.match(/<tbody>\s*<tr\b[\s\S]*?<\/tr>/);
  assert.ok(firstRow,'rendered table needs a data row');
  assert.equal((firstRow[0].match(/<td\b/g)||[]).length,headers,
    'preview header/data columns must align');
}
console.log('Pro Forma phase/month preview and workbook export regressions passed.');
