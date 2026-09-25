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
assert.deepEqual(allocations,[18,18,18,18,18,18,18,18,18,17]);
assert.deepEqual(engine.allocatedLots(337,2),[169,168],
  'a two-phase suggestion must keep the old rounded-up-first allocation');
assert.deepEqual(engine.allocatedLots(1789,10),[179,179,179,179,179,179,179,179,179,178],
  'only the final phase receives the legacy allocation remainder');
assert.deepEqual(engine.allocatedLots(11,10),[2,1,1,1,1,1,1,1,1,1],
  'small projects must reserve at least one lot for each remaining phase');
const phaseRows=allocations.map((lots,i)=>({ID:'phase-'+(i+1),Phase:i+1,Total_Lots:lots,
  Initial_Take_Lots:1,Initial_Delay_Months:0,First_Recurring_Delay_Months:1,
  Lots_Per_Take:lots,Take_Frequency:'Monthly',Escalator_Enabled:false}));
const chained=engine.plan({...defaults,phaseCount:10,phases:phaseRows});
assert.equal(chained.phases[0].Const_End_Month,36);
assert.equal(chained.phases[1].Const_End_Month,chained.phases[0].Lot_Sale_End_Month);
assert.equal(chained.phases[9].ID,'phase-10');
assert.equal(chained.events.reduce((s,e)=>s+e.Lots_Sold,0),179);
const customRows=[{...phaseRows[0],Total_Lots:200,Initial_Take_Lots:20,Lots_Per_Take:7},
  {...phaseRows[1],Phase:2,Total_Lots:137,Initial_Take_Lots:20,Lots_Per_Take:7}];
const customPlan=engine.plan({...defaults,totalLots:337,phaseCount:2,phases:customRows});
assert.deepEqual(customPlan.phases.map(p=>p.Total_Lots),[200,137],
  'planning must respect a saved custom phase allocation, not reseed it');
assert.deepEqual(customRows.map(p=>p.Total_Lots),[200,137],
  'planning must not mutate saved custom phase inputs');
const scenario=engine.scenarioLots(phaseRows,200);
assert.equal(scenario.reduce((s,r)=>s+Number(r.Total_Lots),0),200);
assert.ok(scenario.every(r=>Number(r.Initial_Take_Lots)>=1 && Number(r.Initial_Take_Lots)<=Number(r.Total_Lots)));
assert.equal(phaseRows.reduce((s,r)=>s+r.Total_Lots,0),179,'scenario did not mutate the saved allocation');
assert.throws(()=>engine.scenarioLots(phaseRows,9),/fewer than active phases/);
assert.throws(()=>engine.plan({...defaults,phaseCount:10,phases:phaseRows.map((r,i)=>i===9?{...r,Total_Lots:16}:r)}),/1 under/);
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
vm.runInContext(['num','intN','hasVal','round2','ymAdd','parseMonthList',
  'phaseSalesPersisted','phaseSalesActive','computeProforma']
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
// A legacy one-take later phase has a gap in its monthly receipts. The phase
// engine must sell those lots when the record is converted on Save.
const oneTakeInputs={Lots:4,Phases:2,Total_Acres:4,
  Engineering_Delay_Months:0,Engineering_Length_Months:1,
  Construction_Delay_Months:0,Construction_Length:1,
  Sale_Price_FF:1000,Lot_Size_Ft:50,Engineering_Cost_Lot:0,Const_Cost_FF:0,
  Total_Street_LF:0,Land_Cost_Acre:0,purchaseDate:{y:2027,m:1},
  Initial_Takedown:2,Lots_per_Month:2,items:[],curve:[],
  purchaseInstallments:[],saleInstallments:[],pidMud:[]};
const legacyOneTake=context.computeProforma(oneTakeInputs);
const convertedOneTake=context.computeProforma({...oneTakeInputs,
  Lot_Sales_Schedule_Version:'2',phaseSales:[
    {Phase:1,Total_Lots:2,Initial_Take_Lots:2,Initial_Delay_Months:0,
      First_Recurring_Delay_Months:1,Lots_Per_Take:2,Take_Frequency:'Monthly',
      Escalator_Enabled:false,Annual_Escalator_Pct:0,Additional_Markup_Pct:0},
    {Phase:2,Total_Lots:2,Initial_Take_Lots:2,Initial_Delay_Months:0,
      First_Recurring_Delay_Months:1,Lots_Per_Take:2,Take_Frequency:'Monthly',
      Escalator_Enabled:false,Annual_Escalator_Pct:0,Additional_Markup_Pct:0}]});
assert.deepEqual(Array.from(legacyOneTake.months.filter(r=>r.Lots_Sold).map(r=>[r.Month1,r.Lots_Sold])),[[3,2]],
  'legacy monthly receipts omit a later phase that sells in a single take');
assert.deepEqual(Array.from(convertedOneTake.months.filter(r=>r.Lots_Sold).map(r=>[r.Month1,r.Lots_Sold])),[[3,2],[4,2]],
  'conversion must sell the later phase rather than preserving the legacy one-take gap');
// A phase-1 sales delay moves phase 2's engineering and construction windows.
// Additional costs tied to those anchors must move with them, while costs tied
// to explicit calendar months must stay in their chosen months.
const timingBase={...oneTakeInputs,Lots:20,Phases:2,Engineering_Length_Months:2,
  Construction_Length:2,Initial_Takedown:5,Lots_per_Month:5,
  Lot_Sales_Schedule_Version:'2',phaseSales:[1,2].map(phase=>({Phase:phase,
    Total_Lots:10,Initial_Take_Lots:5,Initial_Delay_Months:0,
    First_Recurring_Delay_Months:1,Lots_Per_Take:5,Take_Frequency:'Monthly',
    Escalator_Enabled:false,Annual_Escalator_Pct:0,Additional_Markup_Pct:0})),
  curve:[{Month_Number:1,Percent_Cost:50},{Month_Number:2,Percent_Cost:50}]};
const delayed={...timingBase,phaseSales:timingBase.phaseSales.map((row,i)=>({...row,
  Initial_Delay_Months:i===0?1:0}))};
const normalTiming=context.computeProforma({...timingBase,items:[]});
const lateTiming=context.computeProforma({...delayed,items:[]});
for(const field of ['Eng_Start_Month','Eng_End_Month','Const_Start_Month','Const_End_Month','Lot_Sale_Start_Month']){
  assert.equal(lateTiming.phases[1][field],normalTiming.phases[1][field]+1,
    `phase 1's sales delay moves phase 2 ${field}`);
}
function appliedMonths(input,application){
  const item={Item_Name:'Timing fixture',Category:'Engineering',Department:'Development',
    Add_l_Cost:'1200',Cost_Application:application,Start_Phase:'2',End_Phase:'2',
    Specific_Months_List:application==='Specific Months'?'2,3':''};
  const calc=context.computeProforma({...input,items:[item]});
  const byMonth=new Map();
  for(const row of calc.months){
    const amount=row.Entitlement_Engineering_Addl||0;
    if(amount)byMonth.set(row.Month1,(byMonth.get(row.Month1)||0)+amount);
  }
  return {calc,months:[...byMonth.keys()].sort((a,b)=>a-b),total:[...byMonth.values()].reduce((a,b)=>a+b,0)};
}
for(const [application,anchor] of [['Engineering End','Eng_End_Month'],
  ['Construction Start','Const_Start_Month'],['Construction End','Const_End_Month']]){
  const before=appliedMonths(timingBase,application),after=appliedMonths(delayed,application);
  assert.deepEqual(before.months,[normalTiming.phases[1][anchor]],application+' uses its phase anchor');
  assert.deepEqual(after.months,[lateTiming.phases[1][anchor]],application+' follows the moved anchor');
  assert.equal(before.total,1200);assert.equal(after.total,1200);
}
const acrossBefore=appliedMonths(timingBase,'Across Phases');
const acrossAfter=appliedMonths(delayed,'Across Phases');
assert.deepEqual(acrossAfter.months,acrossBefore.months.map(month=>month+1),
  'Across Phases moves with the phase-2 engineering window');
assert.equal(acrossBefore.total,1200);assert.equal(acrossAfter.total,1200);
const fixedBefore=appliedMonths(timingBase,'Specific Months');
const fixedAfter=appliedMonths(delayed,'Specific Months');
assert.deepEqual(fixedBefore.months,[2,3]);assert.deepEqual(fixedAfter.months,[2,3]);
assert.equal(fixedAfter.total,1200);
const shiftedEngineering={...timingBase,Engineering_Delay_Months:Number(timingBase.Engineering_Delay_Months||0)+1};
const engineeringAfter=context.computeProforma({...shiftedEngineering,items:[]});
for(const field of ['Eng_Start_Month','Eng_End_Month','Const_Start_Month','Const_End_Month']){
  assert.ok(engineeringAfter.phases[1][field]>normalTiming.phases[1][field],
    `engineering delay moves phase 2 ${field}`);
}
for(const [application,anchor] of [['Engineering End','Eng_End_Month'],
  ['Construction Start','Const_Start_Month'],['Construction End','Const_End_Month']]){
  const shifted=appliedMonths(shiftedEngineering,application);
  assert.deepEqual(shifted.months,[engineeringAfter.phases[1][anchor]],
    `engineering delay moves ${application} spend to its new phase anchor`);
  assert.equal(shifted.total,1200);
}
const shiftedConstruction={...timingBase,Construction_Delay_Months:1};
const constructionBefore=context.computeProforma({...timingBase,items:[]});
const constructionAfter=context.computeProforma({...shiftedConstruction,items:[]});
assert.equal(constructionAfter.phases[0].Const_Start_Month,constructionBefore.phases[0].Const_Start_Month+1);
assert.equal(appliedMonths(shiftedConstruction,'Construction Start').total,1200);
assert.notEqual(constructionAfter.months.find(row=>row.Lots_Sold)?.Month1,
  constructionBefore.months.find(row=>row.Lots_Sold)?.Month1);
console.log('Phase delays, construction dates, and additional-cost application timing passed.');
const dollarPlan=engine.plan({...pricing,totalLots:3,baseUnitPrice:100.5,
  phases:[{Phase:1,Total_Lots:3,Initial_Take_Lots:1,Initial_Delay_Months:0,
    First_Recurring_Delay_Months:1,Lots_Per_Take:1,Take_Frequency:'Monthly',
    Escalator_Enabled:false,Annual_Escalator_Pct:0,Additional_Markup_Pct:0}]});
assert.equal(dollarPlan.summary.finishedLotSales,303,
  'the phase engine rounds each take to whole dollars');
assert.notEqual(dollarPlan.summary.finishedLotSales,3*100.5,
  'per-take rounding can differ from the old unrounded sales basis');
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
assert.match(widgetFunction('phaseSalesField'),/phaseMonthTrigger\('esc',v,i,locked\)/,
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

// Render the phase pane with a real schedule so layout checks cover the visible
// content, not merely source fragments or a brittle whole-page snapshot.
const phaseRenderContext=vm.createContext({
  S:{ed:{model:{Lots:179,Phases:1,Total_Acres:53.4,
    Sale_Price_FF:1000,Lot_Size_Ft:50,
    Lot_Sales_Schedule_Version:'2',Same_Lot_Sales_All_Phases:false,
    phaseSales:[{Phase:1,Total_Lots:179,Initial_Take_Lots:35,
      Initial_Delay_Months:0,First_Recurring_Delay_Months:3,
      Lots_Per_Take:20,Take_Frequency:'Monthly',Escalator_Enabled:false,
      Annual_Escalator_Pct:0,Additional_Markup_Pct:0,
      Esc_Start_Date:'2030-09-01'}]},phaseSelected:0}},
  phaseSalesAdopted:()=>true,
  phaseSalesDefaultEscDates:()=>{},
  phaseSalesBalance:()=>({allocated:179,expected:179,delta:0}),
  phaseSalesPlan:()=>monthly,
  phaseSalesField:(label)=>`<span data-test-field="${label}"></span>`,
  num:Number,
  fmtN:(value,digits)=>Number(value).toFixed(digits),
  fmt$:(value)=>value==null?'—':'$'+Math.round(value).toLocaleString('en-US'),
  esc:String,
  intN:Number,
  dateToCreatorValue:String,
});
vm.runInContext(['phaseSalesSharedLocked','phaseLotPriceValues','refreshPhaseLotPricePill','panePhaseSales']
  .map(widgetFunction).join('\n'),phaseRenderContext);
const phaseHtml=phaseRenderContext.panePhaseSales();
assert.match(phaseHtml,/Markup &amp; Escalator/);
assert.ok(phaseHtml.indexOf('class="ps-price-head"')<phaseHtml.indexOf('class="ps-group-body"',phaseHtml.indexOf('class="ps-price-head"')),
  'the Escalator switch belongs in the pricing section header');
assert.match(phaseHtml,/id="psLotPricePill"[^>]*>[\s\S]*?Base price <b data-ps-marked-price>\$50,000<\/b>[\s\S]*?Before markup <b data-ps-base-price>\$50,000<\/b>/,
  'show the current base price including markup and the original lot price');
assert.match(phaseHtml,/data-test-field="Additional markup"/,'markup remains visible with escalator off');
assert.doesNotMatch(phaseHtml,/data-test-field="Annual escalator"|data-test-field="Esc start date"/,
  'escalator inputs render only when enabled');
phaseRenderContext.S.ed.model.phaseSales[0].Escalator_Enabled=true;
const enabledPhaseHtml=phaseRenderContext.panePhaseSales();
assert.match(enabledPhaseHtml,/data-test-field="Annual escalator"/);
assert.match(enabledPhaseHtml,/data-test-field="Esc start date"/);
assert.ok(enabledPhaseHtml.indexOf('data-test-field="Additional markup"')<enabledPhaseHtml.indexOf('data-test-field="Annual escalator"'));
assert.ok(enabledPhaseHtml.indexOf('data-test-field="Additional markup"')<enabledPhaseHtml.indexOf('id="psLotPricePill"')
  && enabledPhaseHtml.indexOf('id="psLotPricePill"')<enabledPhaseHtml.indexOf('data-test-field="Annual escalator"')
  && enabledPhaseHtml.indexOf('data-test-field="Annual escalator"')<enabledPhaseHtml.indexOf('data-test-field="Esc start date"'),
  'markup and lot price form the first row; escalator rate and date form the second');
phaseRenderContext.S.ed.model.phaseSales[0].Escalator_Enabled=false;
assert.equal(phaseRenderContext.S.ed.model.phaseSales[0].Esc_Start_Date,'2030-09-01','rendering hidden fields preserves their model values');
phaseRenderContext.S.ed.model.phaseSales[0].Additional_Markup_Pct='10';
assert.deepEqual(Array.from(Object.values(phaseRenderContext.phaseLotPriceValues(phaseRenderContext.S.ed.model,phaseRenderContext.S.ed.model.phaseSales[0]))),[50000,55000]);
assert.match(phaseRenderContext.panePhaseSales(),/Base price <b data-ps-marked-price>\$55,000<\/b>/);
const basePriceText={textContent:''},markedPriceText={textContent:''};
phaseRenderContext.document={getElementById:()=>({querySelector:(selector)=>selector==='[data-ps-base-price]'?basePriceText:markedPriceText})};
phaseRenderContext.refreshPhaseLotPricePill();
assert.equal(basePriceText.textContent,'$50,000');
assert.equal(markedPriceText.textContent,'$55,000');
assert.match(widget,/if\(phaseKey==="Additional_Markup_Pct"\)refreshPhaseLotPricePill\(\)/,
  'typing markup should refresh the pill before the field loses focus');
phaseRenderContext.S.ed.model.phaseSales[0].Additional_Markup_Pct='-10';
assert.match(phaseRenderContext.panePhaseSales(),/Base price <b data-ps-marked-price>\$45,000<\/b>/);
phaseRenderContext.S.ed.model.phaseSales[0].Additional_Markup_Pct='0';
phaseRenderContext.S.ed.phaseSwitchPulse=true;
assert.match(phaseRenderContext.panePhaseSales(),/class="ps-summary phase-updating"/,
  'changing phases highlights the refreshed schedule');
assert.equal(phaseRenderContext.S.ed.phaseSwitchPulse,false,'the phase animation runs once per selection');
const phaseWorkspace=phaseHtml.indexOf('class="ps-workspace"');
const phaseNav=phaseHtml.indexOf('class="ps-nav"');
const phaseEditor=phaseHtml.indexOf('class="ps-editor"');
const phaseSummary=phaseHtml.indexOf('class="ps-summary"');
assert.ok(phaseWorkspace>=0 && phaseNav>phaseWorkspace && phaseEditor>phaseNav && phaseSummary>phaseEditor,
  'the phase cards, main inputs, and schedule must appear left to right');
// Source order alone did not catch an unclosed Recurring Takes group that nested
// the schedule inside the editor and forced it below the inputs.
const phaseContainers=[];
for(const tag of phaseHtml.match(/<\/?(?:div|nav|aside)\b[^>]*>/g)||[]){
  if(tag.startsWith('</')){phaseContainers.pop();continue;}
  const className=tag.match(/\bclass="([^"]*)"/)?.[1]||'';
  if(className==='ps-summary'){
    assert.equal(phaseContainers.at(-1),'ps-workspace',
      'the schedule must be a direct grid child beside the editor');
  }
  phaseContainers.push(className);
}
const phaseBalance=phaseHtml.indexOf('class="ps-balance');
const phaseBody=phaseHtml.indexOf('class="sect-body"');
const phaseControls=phaseHtml.indexOf('class="ps-phase-controls"');
assert.ok(phaseBody<phaseWorkspace && phaseBalance>phaseEditor && phaseBalance<phaseControls,
  'put the allocation pill beside the selected phase heading, above its input controls');
assert.doesNotMatch(phaseHtml,/class="ps-head"/,
  'the Lot Sales workspace should start immediately below its section heading');
assert.doesNotMatch(phaseHtml,/<(?:div|h3)[^>]*>Lot Sales(?:\s|<)/,
  'the active phase pane should not repeat the Lot Sales tab label as headings');
const phaseCard=phaseHtml.match(/<button\b[^>]*data-ps-select="0"[^>]*>([\s\S]*?)<\/button>/)?.[1];
assert.ok(phaseCard,'a phase-selection card should be visible');
assert.match(phaseCard,/179 lots/,'the phase card should identify its allocation');
assert.match(phaseCard,/53\.40 acres/,'the phase card should show acreage context');
assert.match(phaseCard,/Const ends Mth 36/,'the phase card should show compact construction timing');
assert.match(phaseCard,/Sales Mths 37[–-]47/,'the phase card should show compact sale timing');
assert.ok((phaseCard.match(/<br\s*\/?\s*>/gi)||[]).length<=1,
  'phase-card timing should use at most one deliberate line break');
const navRules=Array.from(widget.matchAll(/\.ps-nav\{([^}]*)\}/g),match=>match[1]);
assert.ok(navRules.length,'the phase navigation needs a layout rule');
for(const navStyle of navRules){
  assert.doesNotMatch(navStyle,/max-height|overflow(?:-x|-y)?\s*:\s*(?:auto|scroll)/,
    'phase cards should use available space rather than an internal scrollbar');
}
const workspaceStyle=widget.match(/\.ps-workspace\{([^}]*)\}/)?.[1]||'';
const desktopTracks=workspaceStyle.match(/grid-template-columns\s*:\s*([^;}]*)/)?.[1]||'';
assert.equal((desktopTracks.match(/minmax\(/g)||[]).length,3,
  'desktop Lot Sales needs side-by-side phase cards, editor, and schedule columns');
const phaseTrack=desktopTracks.match(/minmax\(\s*\d+px\s*,\s*(\d+)px\s*\)/);
assert.ok(phaseTrack && Number(phaseTrack[1])>=200,
  'the phase-card column should be wider than the old 155px rail');
assert.doesNotMatch(widget,/\.ps-summary\{[^}]*grid-column\s*:\s*2\b/,
  'the schedule must not be pushed under the editor by a responsive grid-column rule');
assert.match(desktopTracks,/minmax\(230px,340px\)/,'the desktop timeline track must stop growing at card width');
const stackBreakpoint=widget.match(/@media\(max-width:(\d+)px\)\{\.ps-workspace\{grid-template-columns:minmax\(0,1fr\)/)?.[1];
assert.ok(stackBreakpoint && Number(stackBreakpoint)<=760,
  'keep the schedule beside the editor until a genuinely narrow mobile width');
assert.match(phaseHtml,/<h4[^>]*>[\s\S]*?Phase 1 - Schedule<\/h4>/,
  'the right-hand timeline should be headed Phase 1 - Schedule');
assert.match(phaseHtml,/<aside class="ps-summary"[^>]*><h4><svg[\s\S]*?<\/svg>Phase 1 - Schedule<\/h4>/,
  'restore the schedule graphic in its heading');
assert.doesNotMatch(phaseHtml,/Phase 1 · project months/,
  'remove the duplicate phase caption beneath the schedule heading');
assert.match(phaseHtml,/<span class="ps-delay-badge">3 months later &#8595;<\/span>/,
  'the timeline should show the first-recurring delay badge');
for(const [label,month] of [['Construction ends',36],['Initial take',37],
  ['Recurring takes begin',40],['Final take',47]]){
  assert.ok(phaseHtml.includes(`<span class="ps-milestone-title">${label} (Month ${month})</span>`),
    `${label} should display its month beside the dot`);
}
assert.equal((phaseHtml.match(/class="ps-milestone"/g)||[]).length,4,
  'construction, initial, recurring, and final takes each need a dot');
assert.match(widget,/\.ps-milestone-title\{[^}]*font-weight:800/,
  'the milestone name and month should be bold');
assert.match(phaseHtml,/Then 20 lots every month/,
  'the schedule should explain the recurring take cadence');
assert.doesNotMatch(widget.match(/\.ps-timeline\{([^}]*)\}/)?.[1]||'',/border-left/,
  'the timeline must not draw a line below the final take');
assert.match(widget.match(/\.ps-milestone::before\{([^}]*)\}/)?.[1]||'',/background:#28588e/,
  'all milestone dots, not just the first, should be filled blue');
assert.match(widget,/\.ps-milestone:not\(:last-child\)::after\{[^}]*background:#a7c1e5/,
  'only non-final milestones should draw a connector to the next dot');

// Sharing is confirmed before it copies Phase 1 inputs; later phase lot counts
// stay editable even while the other sales controls are disabled.
const sharedModel={Lots:10,Phases:2,Total_Acres:5,Sale_Price_FF:1000,Lot_Size_Ft:50,
  Lot_Sales_Schedule_Version:'2',Same_Lot_Sales_All_Phases:'false',phaseSales:[
    {Phase:1,Total_Lots:'4',Initial_Take_Lots:'2',Initial_Delay_Months:'1',
      First_Recurring_Delay_Months:'2',Lots_Per_Take:'1',Take_Frequency:'Quarterly',
      Escalator_Enabled:'true',Annual_Escalator_Pct:'3',Esc_Start_Date:'2028-01-01',
      Additional_Markup_Pct:'5'},
    {Phase:2,Total_Lots:'6',Initial_Take_Lots:'5',Initial_Delay_Months:'0',
      First_Recurring_Delay_Months:'1',Lots_Per_Take:'2',Take_Frequency:'Monthly',
      Escalator_Enabled:'false',Annual_Escalator_Pct:'0',Esc_Start_Date:'2029-01-01',
      Additional_Markup_Pct:'0'}]};
const sharedContext=vm.createContext({
  S:{ed:{model:sharedModel,phaseSelected:1,dirty:false}},
  phaseSalesAdopted:()=>true,phaseSalesDefaultEscDates:()=>{},
  phaseSalesBalance:()=>({allocated:10,expected:10,delta:0}),
  phaseSalesPlan:()=>({phases:[],events:[]}),
  num:Number,intN:Number,fmtN:(value,digits)=>Number(value).toFixed(digits),
  fmt$:(value)=>value==null?'—':'$'+Math.round(value).toLocaleString('en-US'),
  esc:String,dateToCreatorValue:String,
});
vm.runInContext(['phaseSalesCopyShared','phaseSalesSharedLocked','phaseSalesSetShared',
  'phaseMonthTrigger','phaseSalesField','phaseLotPriceValues','panePhaseSales']
  .map(widgetFunction).join('\n'),sharedContext);
assert.equal(sharedContext.phaseSalesSharedLocked(sharedModel,1),false);
sharedContext.phaseSalesSetShared(sharedModel,true);
assert.equal(sharedModel.phaseSales[1].Total_Lots,'6','sharing keeps phase allocations');
assert.equal(sharedModel.phaseSales[1].Initial_Take_Lots,'2');
assert.equal(sharedModel.phaseSales[1].Take_Frequency,'Quarterly');
assert.equal(sharedModel.phaseSales[1].Esc_Start_Date,'2028-01-01');
assert.equal(sharedContext.phaseSalesSharedLocked(sharedModel,1),true);
const sharedPhaseHtml=sharedContext.panePhaseSales();
function phaseInput(html,key){return html.match(new RegExp(`<input[^>]*data-ps-k="${key}"[^>]*>`))?.[0]||'';}
assert.ok(phaseInput(sharedPhaseHtml,'Total_Lots'));
assert.doesNotMatch(phaseInput(sharedPhaseHtml,'Total_Lots'),/\bdisabled\b/,
  'Lots in phase remains editable');
for(const key of ['Initial_Take_Lots','Initial_Delay_Months','First_Recurring_Delay_Months',
  'Lots_Per_Take','Additional_Markup_Pct','Annual_Escalator_Pct']){
  assert.match(phaseInput(sharedPhaseHtml,key),/\bdisabled\b/,`${key} should be locked on Phase 2`);
}
assert.match(sharedPhaseHtml,/data-ps-frequency="Monthly"[^>]*disabled/);
assert.match(sharedPhaseHtml,/data-ps-frequency="Quarterly"[^>]*disabled/);
assert.match(sharedPhaseHtml,/data-ps-enable="1"[^>]*disabled/);
assert.match(sharedPhaseHtml,/data-month-kind="esc"[^>]*disabled/);
sharedContext.S.ed.phaseSelected=0;
const firstPhaseHtml=sharedContext.panePhaseSales();
assert.doesNotMatch(phaseInput(firstPhaseHtml,'Initial_Take_Lots'),/\bdisabled\b/,
  'Phase 1 remains editable');
sharedContext.phaseSalesSetShared(sharedModel,false);
sharedContext.S.ed.phaseSelected=1;
assert.doesNotMatch(phaseInput(sharedContext.panePhaseSales(),'Initial_Take_Lots'),/\bdisabled\b/,
  'turning sharing off restores editing without clearing copied values');
sharedModel.phaseSales[1].Initial_Take_Lots='5';
const sharedHost={addEventListener(){}};
let modalOptions,confirmChoice=false,refreshes=0;
sharedContext.document={getElementById:()=>sharedHost,querySelector:()=>null};
sharedContext.uiConfirm=options=>{modalOptions=options;return Promise.resolve(confirmChoice);};
sharedContext.updateDirtyChip=()=>{};
sharedContext.rerenderPane=()=>{refreshes++;};
sharedContext.recalcLive=()=>{};
sharedContext.formatNumericInputs=()=>{};
vm.runInContext(widgetFunction('wireEditInputs'),sharedContext);
sharedContext.wireEditInputs();
const sharedToggle={checked:true,focused:false,
  getAttribute(name){return name==='data-ps-shared'?'1':null;},
  focus(){this.focused=true;}};
sharedHost.onchange({target:sharedToggle});
await Promise.resolve();
assert.equal(modalOptions.title,'Apply to all?');
assert.equal(modalOptions.message,'Later phase settings will be replaced; lot counts stay.');
assert.equal(modalOptions.okLabel,'Apply');
assert.equal(modalOptions.cancelLabel,'Cancel');
assert.equal(sharedModel.Same_Lot_Sales_All_Phases,'false','Cancel keeps sharing off');
assert.equal(sharedModel.phaseSales[1].Initial_Take_Lots,'5','Cancel preserves later phase inputs');
assert.equal(sharedContext.S.ed.dirty,false,'Cancel does not dirty the form');
assert.equal(sharedToggle.checked,false);
assert.equal(refreshes,0);
confirmChoice=true;sharedToggle.checked=true;
sharedHost.onchange({target:sharedToggle});
await Promise.resolve();
assert.equal(sharedModel.Same_Lot_Sales_All_Phases,'true');
assert.equal(sharedModel.phaseSales[1].Initial_Take_Lots,'2');
assert.equal(sharedModel.phaseSales[1].Total_Lots,'6');
assert.equal(sharedContext.S.ed.dirty,true);
assert.equal(refreshes,1);
const blockedInput={value:'99',getAttribute(name){return {'data-ps-k':'Initial_Take_Lots','data-ps-i':'1'}[name]||null;}};
sharedHost.oninput({target:blockedInput});
assert.equal(sharedModel.phaseSales[1].Initial_Take_Lots,'2','later phase edits cannot change shared inputs');
assert.equal(blockedInput.value,'2');
const lotsInput={value:'7',getAttribute(name){return {'data-ps-k':'Total_Lots','data-ps-i':'1'}[name]||null;}};
sharedHost.oninput({target:lotsInput});
assert.equal(sharedModel.phaseSales[1].Total_Lots,'7','later phase lot counts still change');
const firstInput={value:'3',getAttribute(name){return {'data-ps-k':'Initial_Take_Lots','data-ps-i':'0'}[name]||null;}};
sharedHost.oninput({target:firstInput});
assert.equal(sharedModel.phaseSales[1].Initial_Take_Lots,'3','Phase 1 edits propagate while sharing is on');
sharedToggle.checked=false;
sharedHost.onchange({target:sharedToggle});
assert.equal(sharedModel.Same_Lot_Sales_All_Phases,'false');
assert.equal(sharedModel.phaseSales[1].Initial_Take_Lots,'3','turning sharing off keeps the copied values');

// The Esc Start default is the first day of each phase's first lot-sale month.
const monthContext=vm.createContext({PhaseSalesEngine:engine,S:{phaseSalesReady:true}});
vm.runInContext(['num','intN','round2','ymAdd','ymToInput','lotMixRollup','syncLotMixDerived',
  'phaseSalesPersisted','phaseSalesActive','phaseSalesAdopted','phaseSalesPlan',
  'phaseSalesDefaultEscDates','phaseSalesRefreshAutoEscDates','phaseSalesSeed',
  'phaseSalesPrepareDraft','phaseSalesSeedWhenReady']
  .map(widgetFunction).join('\n'),monthContext);
for(const missing of [undefined,null]){
  assert.equal(monthContext.phaseSalesPersisted(missing),false,
    'missing models have no persisted phase schedule');
  assert.equal(monthContext.phaseSalesAdopted(missing),false,
    'a transient missing model must not crash phase-schedule checks');
}
assert.equal(monthContext.phaseSalesAdopted({Lot_Sales_Schedule_Version:'2'}),true);
assert.equal(monthContext.phaseSalesAdopted({_phaseSalesDraft:true}),true);
const monthModel={Lots:10,Phases:2,Initial_Takedown:2,Lots_per_Month:2,
  Engineering_Delay_Months:0,Engineering_Length_Months:1,
  Construction_Delay_Months:0,Construction_Length:1,
  Sale_Price_FF:1000,Lot_Size_Ft:50,purchaseDate:{y:2027,m:1}};
const seeded=monthContext.phaseSalesSeed(monthModel);
assert.deepEqual(Array.from(seeded,r=>r.Esc_Start_Date),['2027-03-01','2027-06-01']);
const seeded337=monthContext.phaseSalesSeed({...monthModel,Lots:337,Phases:2});
assert.deepEqual(Array.from(seeded337,r=>Number(r.Total_Lots)),[169,168],
  'the widget adoption preview must use the legacy first-phase remainder rule');
const seeded1789=monthContext.phaseSalesSeed({...monthModel,Lots:1789,Phases:10,
  Initial_Takedown:35,Lots_per_Month:20});
const unopenedLegacy={...monthModel,ID:'legacy-1',Lots:1789,Phases:10,Initial_Takedown:35,Lots_per_Month:20,
  Lot_Sales_Schedule_Version:'',phaseSales:[]};
monthContext.phaseSalesPrepareDraft(unopenedLegacy);
assert.equal(unopenedLegacy.Lot_Sales_Schedule_Version,'',
  'opening an old Pro Forma must not mark it migrated');
assert.equal(unopenedLegacy.Initial_Takedown,35);
assert.equal(unopenedLegacy.Lots_per_Month,20);
assert.equal(unopenedLegacy._phaseSalesDraft,true);
assert.equal(monthContext.phaseSalesActive(unopenedLegacy),true);
assert.deepEqual(Array.from(unopenedLegacy.phaseSales,r=>Number(r.Total_Lots)),
  [179,179,179,179,179,179,179,179,179,178]);
assert.deepEqual(Array.from(seeded1789,r=>Number(r.Total_Lots)),
  [179,179,179,179,179,179,179,179,179,178],
  'conversion keeps the legacy rounded-up earlier phases and smaller final phase');
assert.equal(Number(seeded1789[0].Initial_Take_Lots),35,
  'phase 1 inherits the original initial take');
assert.ok(seeded1789.slice(1).every(r=>Number(r.Initial_Take_Lots)===20),
  'later phases start with the original continued take');
assert.ok(seeded1789.every(r=>Number(r.Lots_Per_Take)===20
  && r.Take_Frequency==='Monthly'
  && Number(r.Initial_Delay_Months)===0
  && Number(r.First_Recurring_Delay_Months)===1
  && String(r.Escalator_Enabled)==='false'
  && Number(r.Annual_Escalator_Pct)===0
  && Number(r.Additional_Markup_Pct)===0),
  'legacy phase defaults are monthly with no delay, escalator, or markup');
const freshMix={...monthModel,ID:null,Lots:'',Phases:5,phaseSales:[],lotMix:[]};
monthContext.phaseSalesPrepareDraft(freshMix);
assert.equal(freshMix.phaseSales.length,0,'a blank new PF starts without phase rows');
freshMix.lotMix=[{Lot_Size_Ft:'55',Lot_Count:'15',Price_LF:'1000'}];
monthContext.syncLotMixDerived(freshMix);
monthContext.phaseSalesSeedWhenReady(freshMix);
assert.equal(freshMix.phaseSales.reduce((sum,row)=>sum+Number(row.Total_Lots),0),15,
  'derived lots from Lot Mix should seed the phase editor without saving or reopening');
freshMix.lotMix[0].Lot_Count='155';
monthContext.syncLotMixDerived(freshMix);
monthContext.phaseSalesSeedWhenReady(freshMix);
assert.equal(freshMix.phaseSales.reduce((sum,row)=>sum+Number(row.Total_Lots),0),155,
  'generated phase allocations should follow the finished lot count while it is typed');
freshMix._phaseSalesAutoSeed=false;
freshMix.lotMix[0].Lot_Count='160';
monthContext.syncLotMixDerived(freshMix);
monthContext.phaseSalesSeedWhenReady(freshMix);
assert.equal(freshMix.phaseSales.reduce((sum,row)=>sum+Number(row.Total_Lots),0),155,
  'editing phase rows must stop automatic allocation changes');
assert.match(widgetFunction('wireEditInputs'),/if\(kind==="lotmix"\)\{\s*syncLotMixDerived\(m\);\s*phaseSalesSeedWhenReady\(m\);/,
  'the live Lot Mix input handler must seed phase rows after updating derived Lots');
const tabKeys=['gen','sched','lotsales','land','pid','addl','curve','loi','approvals','months'];
const tabButtons=tabKeys.map(key=>({key,hidden:false,style:{display:''},disabled:false,title:'',attrs:{},
  getAttribute(name){return name==='data-pane'?this.key:this.attrs[name];},
  setAttribute(name,value){this.attrs[name]=value;},
  removeAttribute(name){delete this.attrs[name];}}));
const tabContext=vm.createContext({
  S:{ed:{isNew:true,model:{ID:null},errors:{gen:['Name required'],sched:['Project Start required'],lotsales:['Phase plan required'],land:['Purchase installments required']}}},
  document:{querySelectorAll:()=>tabButtons},edPaneLabel:key=>key,
});
vm.runInContext(widgetFunction('refreshNewPfTabAccess'),tabContext);
function openTabs(){return tabButtons.filter(button=>!button.disabled).map(button=>button.key);}
tabContext.refreshNewPfTabAccess();
assert.deepEqual(openTabs(),['gen'],'a blank PF should start on General Information');
tabContext.S.ed.errors.gen=[];
tabContext.refreshNewPfTabAccess();
assert.deepEqual(openTabs(),['gen','sched'],'Project Schedule unlocks as soon as General Information is valid');
tabContext.S.ed.errors.sched=[];
tabContext.refreshNewPfTabAccess();
assert.deepEqual(openTabs(),['gen','sched','lotsales'],'Lot Sales unlocks as soon as Project Schedule is valid');
tabContext.S.ed.errors.lotsales=[];
tabContext.refreshNewPfTabAccess();
assert.deepEqual(openTabs(),['gen','sched','lotsales','land'],'Land unlocks after the phase plan is valid');
tabContext.S.ed.errors.land=[];
tabContext.refreshNewPfTabAccess();
assert.ok(openTabs().includes('months'),'later optional panes and the computed preview unlock when prior panes are valid');
assert.ok(!openTabs().includes('approvals'),'an unsaved PF cannot open Approvals');
assert.equal(tabButtons.find(button=>button.key==='approvals').attrs['aria-disabled'],'true');
tabContext.S.ed.isNew=false;
tabContext.S.ed.model.ID='saved-pf';
tabContext.refreshNewPfTabAccess();
assert.deepEqual(openTabs(),tabKeys,'saved PFs preserve direct access to every permission-visible pane');
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
const capabilityCalls=[];
const capabilityContext=vm.createContext({
  S:{liveSDK:true,useMock:false,env:{name:'PRODUCTION'},phaseSalesReady:false},
  saveApiCandidateNames:()=>['Save_PF1'],
  sdkInvoke:(cfg)=>{capabilityCalls.push(cfg);return Promise.resolve({success:false,error:'unknown operation'});},
  auditLog:()=>{}
});
vm.runInContext(['parseSaveApiResult','probePhaseSalesSupport'].map(widgetFunction).join('\n'),capabilityContext);
assert.equal(await capabilityContext.probePhaseSalesSupport(),false,
  'an older Production function must keep the widget on legacy saves');
assert.ok(capabilityCalls.every(call=>call.api_name==='Save_PF1'
  && JSON.parse(call.payload?.payload||call.parameters?.payload).id==='0'),
  'capability probes must be read-only and never cross Creator environments');
capabilityContext.sdkInvoke=()=>Promise.resolve({success:true,action:'phase_sales_capabilities',
  savePhaseSales:true,finalizePhaseSales:true});
assert.equal(await capabilityContext.probePhaseSalesSupport(),true,
  'the phase editor should activate after Creator is deployed');
assert.equal(capabilityContext.S.phaseSalesReady,true);
const savePayloadContext=vm.createContext({S:{myAccessId:'user-1'},
  buildHeaderData:()=>({}),multiLookupIds:v=>v,phaseSalesAdopted:()=>true,
  hasVal:v=>v!=null&&v!=='',parseMonthList:()=>[],monthListToCsv:()=>'',
  dateToCreatorValue:v=>v});
vm.runInContext(widgetFunction('buildSavePayload'),savePayloadContext);
const phaseDraft={ID:'proforma-1',purchaseInstallments:[],saleInstallments:[],
  pidMud:[],items:[],curve:[],phaseSales:[{ID:'stale-phase-row',Phase:1,Total_Lots:10}]};
assert.equal(savePayloadContext.buildSavePayload(phaseDraft,{}).phaseSales[0].ID,'',
  'phase saves use the server phase number to avoid stale row IDs after recalculation');
assert.equal(phaseDraft.phaseSales[0].ID,'stale-phase-row',
  'building the save payload must not mutate the editor draft');
assert.match(widget,/op:"save_phase_sales"/);
assert.match(widget,/op:"finalize_phase_sales"/);
assert.match(widget,/Phase-sales server schedule verified/);
assert.match(widget,/phase_sales_capabilities/);
assert.doesNotMatch(widget,/Phase-level lot sales can only be saved in DEV/);
assert.doesNotMatch(widget,/Pro Forma development preview/);
assert.match(widget,/Defaults from your old model:/);
assert.doesNotMatch(widget,/Approve phase schedule/);
assert.match(widget,/id="constructionCode" type="password"/);
assert.match(widget,/if\(phaseSalesAdopted\(m\)\)\{\s*if\(!ver\.verified/);
const saveFn=fs.readFileSync('creator/functions/proforma_save.dg','utf8');
assert.match(saveFn,/if\(op == "save_phase_sales"\)/);
assert.match(saveFn,/if\(op == "finalize_phase_sales"\)/);
assert.match(saveFn,/phasePf\.Lot_Sales_Schedule_Version = 2/);
assert.match(saveFn,/seenPhaseIds\.add\(rowId\)/);
assert.match(saveFn,/for each removePhaseId in removePhaseIds/);
const workflow=fs.readFileSync('creator/workflows/proforma-phase-sales-v2.md','utf8');
assert.match(workflow,/if\(remaining > 0\)\s*\{\s*if\(firstDelay < 1 \|\| perTake < 1\)/);
assert.doesNotMatch(workflow,/if\(remaining > 0 && firstDelay < 1 \|\| perTake < 1\)/);
console.log('Phase sales schedule, pricing, allocation, chaining and validation regressions passed.');
