import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../widgets/proforma-manager/src/app/phase-sales-engine.js';

const engine=globalThis.PhaseSalesEngine;
const defaults={totalLots:179,phaseCount:1,engineeringDelay:0,engineeringLength:12,
  constructionDelay:0,constructionLength:24,purchaseDate:'2027-01-01',baseUnitPrice:50000};
function one(overrides={},root={}){
  return engine.plan({...defaults,...root,phases:[{Phase:1,Total_Lots:179,Initial_Take_Lots:35,
    Initial_Delay_Months:0,First_Recurring_Delay_Months:3,Lots_Per_Take:20,
    Take_Frequency:'Monthly',Escalator_Enabled:false,Annual_Escalator_Pct:0,
    Additional_Markup_Pct:0,...overrides}]});
}

for(const [delay,first] of [[0,37],[3,40],[6,43]]){
  const p=one({Initial_Delay_Months:delay});
  assert.equal(p.events[0].Month1,first);
}
const monthly=one();
assert.deepEqual(monthly.events.map(e=>[e.Month1,e.Lots_Sold]),
  [[37,35],[40,20],[41,20],[42,20],[43,20],[44,20],[45,20],[46,20],[47,4]]);
assert.equal(monthly.phases[0].Lot_Closing_Length,11);
assert.equal(monthly.summary.takeCount,9);
const quarterly=one({Take_Frequency:'Quarterly'});
assert.deepEqual(quarterly.events.map(e=>[e.Month1,e.Lots_Sold]),
  [[37,35],[40,20],[43,20],[46,20],[49,20],[52,20],[55,20],[58,20],[61,4]]);
assert.equal(quarterly.phases[0].Lot_Closing_Length,25);
assert.equal(quarterly.summary.takeCount,9);

const pricing={totalLots:10,phaseCount:1,engineeringDelay:0,engineeringLength:1,
  constructionDelay:0,constructionLength:1,purchaseDate:'2027-01-01',baseUnitPrice:50000};
function priced(date, extra={}){
  return engine.plan({...pricing,phases:[{Phase:1,Total_Lots:10,Initial_Take_Lots:10,
    Initial_Delay_Months:0,Take_Frequency:'Monthly',Escalator_Enabled:true,
    Annual_Escalator_Pct:5,Esc_Start_Date:date,Additional_Markup_Pct:2,...extra}]}).events[0];
}
const atStart=priced('2027-03-15');
assert.deepEqual([atStart.Base_Lot_Sales,atStart.Additional_Markup_Income,
  atStart.Escalator_Interest_Accrued,atStart.Finished_Lot_Sales],
  [500000,10000,0,510000]);
assert.equal(priced('2027-02-01').Escalator_Interest_Accrued,2083);
assert.equal(priced('2026-03-01').Escalator_Interest_Accrued,25000);
assert.equal(priced('2026-03-01').Finished_Lot_Sales,535000);
assert.equal(priced('2027-04-01').Escalator_Interest_Accrued,0);
assert.equal(priced('',{Escalator_Enabled:false,Additional_Markup_Pct:-2}).Finished_Lot_Sales,490000);
assert.equal(engine.plan({...pricing,baseUnitPrice:5,phases:[{Phase:1,Total_Lots:10,
  Initial_Take_Lots:1,Initial_Delay_Months:0,First_Recurring_Delay_Months:1,
  Lots_Per_Take:9,Take_Frequency:'Monthly',Escalator_Enabled:false,
  Additional_Markup_Pct:-10}]}).events[0].Additional_Markup_Income,-1);

const allocations=engine.allocatedLots(179,10);
assert.deepEqual(allocations,[17,17,17,17,17,17,17,17,17,26]);
const phaseRows=allocations.map((lots,i)=>({ID:'phase-'+(i+1),Phase:i+1,Total_Lots:lots,
  Initial_Take_Lots:1,Initial_Delay_Months:0,First_Recurring_Delay_Months:1,
  Lots_Per_Take:lots,Take_Frequency:'Monthly',Escalator_Enabled:false}));
const chained=engine.plan({...defaults,phaseCount:10,phases:phaseRows});
assert.equal(chained.phases[0].Const_End_Month,36);
assert.equal(chained.phases[1].Const_End_Month,chained.phases[0].Lot_Sale_End_Month);
assert.equal(chained.phases[9].ID,'phase-10');
assert.equal(chained.events.reduce((s,e)=>s+e.Lots_Sold,0),179);
const scenario=engine.scenarioLots(phaseRows,200);
assert.equal(scenario.reduce((s,r)=>s+Number(r.Total_Lots),0),200);
assert.ok(scenario.every(r=>Number(r.Initial_Take_Lots)>=1 && Number(r.Initial_Take_Lots)<=Number(r.Total_Lots)));
assert.equal(phaseRows.reduce((s,r)=>s+r.Total_Lots,0),179,'scenario did not mutate the saved allocation');
assert.throws(()=>engine.scenarioLots(phaseRows,9),/fewer than active phases/);
assert.throws(()=>engine.plan({...defaults,phaseCount:10,phases:phaseRows.map((r,i)=>i===9?{...r,Total_Lots:25}:r)}),/1 under/);
assert.throws(()=>one({Initial_Take_Lots:180}),/exceeds/);
assert.throws(()=>one({Initial_Take_Lots:0}),/at least 1/);
assert.throws(()=>one({Lots_Per_Take:0}),/at least 1/);
assert.throws(()=>one({Annual_Escalator_Pct:-1}),/cannot be negative/);
assert.throws(()=>priced('',{Esc_Start_Date:''}),/Esc Start Date/);

// Exercise the actual widget calculation branch, not just the standalone scheduler.
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
const context=vm.createContext({PhaseSalesEngine:engine,CFG:{irr:{maxIterations:25}}});
vm.runInContext(['num','intN','hasVal','round2','ymAdd','parseMonthList','computeProforma']
  .map(widgetFunction).join('\n'),context);
const adopted=context.computeProforma({Lots:10,Phases:1,Total_Acres:10,
  Engineering_Delay_Months:0,Engineering_Length_Months:1,
  Construction_Delay_Months:0,Construction_Length:1,
  Sale_Price_FF:1000,Lot_Size_Ft:50,Engineering_Cost_Lot:0,Const_Cost_FF:0,
  Total_Street_LF:0,Land_Cost_Acre:0,purchaseDate:{y:2027,m:1},
  Lot_Sales_Schedule_Version:'2',phaseSales:[{Phase:1,Total_Lots:10,
    Initial_Take_Lots:10,Initial_Delay_Months:0,Take_Frequency:'Monthly',
    Escalator_Enabled:true,Annual_Escalator_Pct:5,Esc_Start_Date:'2026-03-01',
    Additional_Markup_Pct:2}],items:[],curve:[],purchaseInstallments:[],
  saleInstallments:[],pidMud:[]});
assert.equal(adopted.totals.Gross_Sales,535000);
assert.equal(adopted.totals.Total_Income,535000);
assert.equal(adopted.months.reduce((s,r)=>s+(r.Finished_Lot_Sales||0),0),535000);
assert.equal(adopted.months.find(r=>r.Lots_Sold===10).Escalator_Interest_Accrued,25000);
assert.equal(adopted.schedule.takedownStartMonth,3);
assert.match(widget,/<button data-pane="sched">Project Schedule<\/button>\s*<button data-pane="lotsales">Lot Sales<\/button>/,
  'Lot Sales must be its own tab immediately after Project Schedule');
assert.match(widget,/data-pane="lotsales"[^\n]*panePhaseSales\(\)/,
  'the Lot Sales pane must render the phase editor');
assert.doesNotMatch(widgetFunction('paneSchedule'),/panePhaseSales\(/,
  'Project Schedule must no longer embed the Lot Sales editor');
assert.match(widget,/<script src="phase-month-picker\.js"><\/script>/);
assert.match(widget,/<link rel="stylesheet" href="phase-month-picker\.css">/);
assert.match(widgetFunction('phaseMonthTrigger'),/data-month-kind/);
assert.match(widgetFunction('paneSchedule'),/phaseMonthTrigger\('project',m\.purchaseDate\)/,
  'Project Start should use the custom month picker');
assert.match(widgetFunction('phaseSalesField'),/phaseMonthTrigger\('esc',v,i\)/,
  'Esc Start Date should use the custom month picker');
assert.doesNotMatch(widgetFunction('paneSchedule'),/type="month"/,
  'Project Start should not fall back to the native month input');
assert.match(widgetFunction('panePhaseSales'),/class="ps-frequency"/,
  'Monthly and Quarterly should use the segmented pill control');
assert.match(widget,/PFMonthPicker\.open\(monthTrigger,selectedMonth,function\(month\)/,
  'the custom month trigger should open the month picker');
assert.match(widget,/m\.purchaseDate=parseDateAny\(month\)/,
  'Project Start selection should write the selected month to the model');
assert.match(widget,/phaseRow\.Esc_Start_Date=month\+"-01"/,
  'Esc Start selection should persist the first day of the selected month');

// The Esc Start default is the first day of each phase's first lot-sale month.
const monthContext=vm.createContext({PhaseSalesEngine:engine});
vm.runInContext(['num','intN','ymAdd','ymToInput','phaseSalesAdopted','phaseSalesPlan',
  'phaseSalesDefaultEscDates','phaseSalesRefreshAutoEscDates','phaseSalesSeed']
  .map(widgetFunction).join('\n'),monthContext);
const monthModel={Lots:10,Phases:2,Initial_Takedown:2,Lots_per_Month:2,
  Engineering_Delay_Months:0,Engineering_Length_Months:1,
  Construction_Delay_Months:0,Construction_Length:1,
  Sale_Price_FF:1000,Lot_Size_Ft:50,purchaseDate:{y:2027,m:1}};
const seeded=monthContext.phaseSalesSeed(monthModel);
assert.deepEqual(Array.from(seeded,r=>r.Esc_Start_Date),['2027-03-01','2027-06-01']);
seeded[0].Esc_Start_Date='2027-03-15';
seeded[1].Esc_Start_Date='';
monthContext.phaseSalesDefaultEscDates(monthModel,seeded);
assert.equal(seeded[0].Esc_Start_Date,'2027-03-15',
  'do not overwrite an existing saved Esc Start Date');
assert.equal(seeded[1].Esc_Start_Date,'2027-06-01');
monthModel.purchaseDate={y:2027,m:2};
seeded[1].Esc_Start_Date='';
monthContext.phaseSalesDefaultEscDates(monthModel,seeded);
assert.equal(seeded[1].Esc_Start_Date,'2027-07-01',
  'a blank Esc Start default follows a changed Project Start month');
monthModel.Lot_Sales_Schedule_Version='2';
monthModel.phaseSales=seeded;
seeded[0]._autoEscStart=false;
seeded[1]._autoEscStart=true;
monthModel.purchaseDate={y:2027,m:3};
monthContext.phaseSalesRefreshAutoEscDates(monthModel);
assert.equal(seeded[0].Esc_Start_Date,'2027-03-15',
  'Project Start changes must preserve a user-chosen Esc date');
assert.equal(seeded[1].Esc_Start_Date,'2027-08-01',
  'Project Start changes should update untouched auto-derived Esc dates');
assert.match(widget,/op:"save_phase_sales"/);
assert.match(widget,/Phase-sales server schedule verified/);
assert.match(widget,/Phase-level lot sales can only be saved in DEV/);
assert.doesNotMatch(widget,/Pro Forma development preview/);
assert.match(widget,/This one-time update gives each phase its own schedule\. Approve to stage it; Save to make the change\./);
assert.match(widget,/id="constructionCode" type="password"/);
assert.ok(widget.indexOf('This one-time update gives each phase its own schedule.') < widget.indexOf('<table><thead><tr><th>Phase</th>'),
  'one-time migration note must appear above the suggested-phase matrix');
assert.match(widget,/if\(phaseSalesAdopted\(m\)\)\{\s*if\(!ver\.verified/);
const saveFn=fs.readFileSync('creator/functions/proforma_save.dg','utf8');
assert.match(saveFn,/if\(op == "save_phase_sales"\)/);
assert.match(saveFn,/phasePf\.Lot_Sales_Schedule_Version = 2/);
assert.match(saveFn,/seenPhaseIds\.add\(rowId\)/);
assert.match(saveFn,/for each removePhaseId in removePhaseIds/);
const workflow=fs.readFileSync('creator/workflows/proforma-phase-sales-v2.md','utf8');
assert.match(workflow,/if\(remaining > 0\)\s*\{\s*if\(firstDelay < 1 \|\| perTake < 1\)/);
assert.doesNotMatch(workflow,/if\(remaining > 0 && firstDelay < 1 \|\| perTake < 1\)/);
console.log('Phase sales schedule, pricing, allocation, chaining and validation regressions passed.');
