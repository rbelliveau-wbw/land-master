import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../widgets/proforma-manager/src/app/phase-sales-engine.js';

const source=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8');
function widgetFunction(name){
  const start=source.indexOf(`function ${name}(`);
  assert.ok(start>=0,`${name} must exist in the widget`);
  const brace=source.indexOf('{',start);
  let depth=0;
  for(let i=brace;i<source.length;i++){
    if(source[i]==='{')depth++;
    if(source[i]==='}')depth--;
    if(depth===0)return source.slice(start,i+1);
  }
  throw Error(`Unclosed ${name}`);
}

// Use the live widget calculator and its actual phase-sale engine. These month
// ranges are the data the timeline receives for existing and adopted Pro Formas.
const context=vm.createContext({
  PhaseSalesEngine:globalThis.PhaseSalesEngine,
  CFG:{irr:{maxIterations:25}},
  MONTHS_S:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
});
vm.runInContext(['num','intN','hasVal','round2','ymAdd','ymKey','ymLabel','ymShort','monthsBetween',
  'parseMonthList','phaseSalesPersisted','phaseSalesActive','computeProforma',
  'esc','fmt$','fmtN','flowTimelineHtml'].map(widgetFunction).join('\n'),context);

const base={Lots:48,Phases:2,Total_Acres:48,
  Engineering_Delay_Months:0,Engineering_Length_Months:12,
  Construction_Delay_Months:0,Construction_Length:12,
  Initial_Takedown:2,Lots_per_Month:2,
  Sale_Price_FF:1000,Lot_Size_Ft:50,Engineering_Cost_Lot:1000,
  Const_Cost_FF:300,Total_Street_LF:4800,Land_Cost_Acre:0,
  purchaseDate:{y:2027,m:1},items:[],curve:[],purchaseInstallments:[],
  saleInstallments:[],pidMud:[]};
const adopted={...base,Lot_Sales_Schedule_Version:'2',phaseSales:[1,2].map(Phase=>({
  Phase,Total_Lots:24,Initial_Take_Lots:2,Initial_Delay_Months:0,
  First_Recurring_Delay_Months:1,Lots_Per_Take:2,Take_Frequency:'Monthly',
  Escalator_Enabled:false,Annual_Escalator_Pct:0,Additional_Markup_Pct:0
}))};
const expectedWindows=[
  [1,12,13,24,25,36],
  [13,24,25,36,37,48]
];
const stageKeys=['Eng_Start_Month','Eng_End_Month','Const_Start_Month',
  'Const_End_Month','Lot_Sale_Start_Month','Lot_Sale_End_Month'];
function monthColumns(firstMonth){
  return Array.from({length:24},(_,i)=>context.ymAdd(base.purchaseDate,firstMonth+i-1));
}
function render(calculation,model,firstMonth){
  return context.flowTimelineHtml(calculation,model,monthColumns(firstMonth));
}
function segmentTags(html,stage){
  return [...html.matchAll(/<button\b[^>]*class="[^"]*pt-segment\b[^"]*"[^>]*>/g)]
    .map(m=>m[0]).filter(tag=>(tag.match(/class="([^"]+)"/)?.[1].split(' ')||[]).includes(`pt-${stage}`));
}
function geometry(tag){
  const match=tag.match(/style="left:([\d.]+)%;width:([\d.]+)%"/);
  assert.ok(match,'stage bars have positions on the shared month axis');
  return [Number(match[1]),Number(match[2])];
}
for(const [label,model] of [['legacy',base],['v2',adopted]]){
  const calculation=context.computeProforma(model);
  assert.equal(calculation.phases.length,2,`${label} has two calculated phases`);
  assert.deepEqual(JSON.parse(JSON.stringify(calculation.phases.map(p=>stageKeys.map(k=>p[k])))),expectedWindows,
    `${label} supplies complete engineering, construction, and sales ranges`);
  const first=render(calculation,model,1);
  const second=render(calculation,model,25);
  for(const [page,html] of [[1,first],[2,second]]){
    assert.equal((html.match(/class="[^"]*\bpt-row\b/g)||[]).length,2,
      `${label} page ${page} keeps one row per phase`);
    assert.doesNotMatch(html,/pt-empty/,`${label} page ${page} has a schedule`);
  }
  assert.equal(segmentTags(first,'eng').length,2,
    `${label} page 1 shows Phase 1 and 2 engineering overlap`);
  assert.equal(segmentTags(first,'const').length,1,
    `${label} page 1 shows Phase 1 construction ending at the page edge`);
  assert.equal(segmentTags(first,'sales').length,0,
    `${label} page 1 clips sales beginning next page`);
  assert.equal(segmentTags(second,'eng').length,0,
    `${label} page 2 clips engineering from the previous page`);
  assert.equal(segmentTags(second,'const').length,1,
    `${label} page 2 shows Phase 2 construction overlapping Phase 1 sales`);
  assert.equal(segmentTags(second,'sales').length,2,
    `${label} page 2 shows both sales windows`);
  assert.deepEqual(segmentTags(first,'eng').map(geometry),[[0,50],[50,50]],
    `${label} page 1 places consecutive engineering windows against the same month columns`);
  assert.deepEqual(segmentTags(second,'sales').map(geometry),[[0,50],[50,50]],
    `${label} page 2 places consecutive sales windows against the same month columns`);
  assert.deepEqual(segmentTags(second,'const').map(geometry),[[0,50]],
    `${label} page 2 shows construction overlapping Phase 1 lot sales`);
  for(const tag of [...segmentTags(first,'eng'),...segmentTags(first,'const'),
      ...segmentTags(second,'const'),...segmentTags(second,'sales')]){
    assert.match(tag,/\bdata-tip="[^"]+"/,`${label} stages provide hover detail`);
    assert.match(tag,/\baria-label="[^"]+"/,`${label} stages provide focus detail`);
    assert.match(tag,/\bdata-pt-duration="\d+ months?"/,`${label} stages expose the full segment length`);
    assert.match(tag,/\bdata-pt-period="[^"]+"/,`${label} stages expose their calendar dates`);
  }
  assert.match(first,/\bpt-eng[^>]*>Eng · 12 mo<\/button>/,
    `${label} engineering bars show their length in months`);
  assert.match(first,/\bpt-const[^>]*>Const · 12 mo<\/button>/,
    `${label} construction bars show their length in months`);
  assert.match(second,/\bpt-sales[^>]*>Sales · 12 mo<\/button>/,
    `${label} sales bars show their length in months`);
  const clipped=render(calculation,model,12);
  assert.match(clipped,/\bpt-eng[^>]*pt-cut-left[^>]*>12m<\/button>/,
    `${label} a narrow clipped segment still shows the full segment duration`);
  assert.match(segmentTags(first,'eng')[0],/Base engineering cost:/,
    `${label} engineering hover has its calculated cost`);
  assert.match(segmentTags(first,'eng')[0],/data-pt-metric-label="Base engineering cost"/,
    `${label} engineering has a structured tooltip metric`);
  assert.match(segmentTags(first,'const')[0],/Base construction cost:/,
    `${label} construction hover has its calculated cost`);
  assert.match(segmentTags(second,'sales')[0],/lots closed in .*closing month/,
    `${label} lot sales hover has calculated closing detail`);
  assert.match(segmentTags(second,'sales')[0],/data-pt-total-label="Finished lot sales"/,
    `${label} sales has a structured revenue row`);
}

// The green span is a sales window, including months with no closing. A
// two-take adopted schedule closes in M25 and M28, with no closing in M26–27.
const gapModel={...base,Lots:4,Phases:1,phaseSales:[{
  Phase:1,Total_Lots:4,Initial_Take_Lots:2,Initial_Delay_Months:0,
  First_Recurring_Delay_Months:3,Lots_Per_Take:2,Take_Frequency:'Monthly',
  Escalator_Enabled:false,Annual_Escalator_Pct:0,Additional_Markup_Pct:0
}]};
gapModel.Lot_Sales_Schedule_Version='2';
const gap=context.computeProforma(gapModel);
assert.deepEqual(JSON.parse(JSON.stringify(gap.phases.map(p=>[p.Lot_Sale_Start_Month,p.Lot_Sale_End_Month]))),[[25,28]]);
assert.deepEqual(Array.from(gap.months.filter(r=>Number(r.Lots_Sold)>0),
  r=>Number(r.Month1)),[25,28],
  'the adopted schedule closes lots in M25 and M28 with a two-month gap');
const gapHtml=render(gap,gapModel,25);
assert.equal(segmentTags(gapHtml,'sales').length,1,
  'the continuous sales window must remain visible across months without a closing');
assert.match(gapHtml,/Mth 25[–-]28/,
  'the sales tooltip names the complete window despite the gap');
assert.match(gapHtml,/4 lots closed in 2 closing months/,
  'the sales tooltip distinguishes the closing months from the sales window');

// Additional costs use calculated month rows for the hovered phase and stage
// window. Adjacent/overlapping phases must not inherit the project grand total.
const spending=context.computeProforma(base);
function costRow(month,phaseKey,phase){
  const row=spending.months.find(r=>r.Month1===month && r[phaseKey]===phase);
  assert.ok(row,`month ${month} has ${phaseKey} ${phase}`);
  return row;
}
costRow(1,'Eng_Phase',1).Entitlement_Engineering_Addl=10;
costRow(13,'Eng_Phase',2).Entitlement_Engineering_Addl=20;
costRow(13,'Const_Phase',1).Construction_Cost_Addl=40;
costRow(25,'Const_Phase',2).Construction_Cost_Addl=50;
Object.assign(spending.totals,{Entitlement_Engineering_Addl:17608200,
  Construction_Cost_Addl:5580000,Land_Cost:26536062,Total_Expenses:88824612});
const firstSpend=render(spending,base,1),secondSpend=render(spending,base,25);
assert.doesNotMatch(firstSpend,/pt-outflow-head|pt-cost-row|pt-spend/,
  'the timeline has no added outflow section or bars');
const engCards=segmentTags(firstSpend,'eng');
assert.match(engCards[0],/data-pt-addl-label="Ent\/Eng Add&#39;l" data-pt-addl-value="\$10"/,
  'Phase 1 engineering shows only its own additional cost');
assert.match(engCards[1],/data-pt-addl-label="Ent\/Eng Add&#39;l" data-pt-addl-value="\$20"/,
  'Phase 2 engineering excludes Phase 1 cost during overlap');
assert.match(segmentTags(firstSpend,'const')[0],/data-pt-addl-label="Construction Add&#39;l" data-pt-addl-value="\$40"/,
  'Phase 1 construction shows its additional cost');
assert.match(segmentTags(secondSpend,'const')[0],/data-pt-addl-label="Construction Add&#39;l" data-pt-addl-value="\$50"/,
  'Phase 2 construction shows its additional cost after paging');
assert.match(segmentTags(secondSpend,'sales')[0],/data-pt-addl-label=""/,
  'sales has no unrelated additional cost');
assert.doesNotMatch(firstSpend,/88,824,612|17,608,200|26,536,062/,
  'grand totals are absent from phase cards');
assert.match(widgetFunction('flowTimelineTooltipShow'),/if\(data\.ptAddlLabel\) body\.appendChild\(row\(data\.ptAddlLabel,data\.ptAddlValue/,
  'the hover card renders the phase additional cost');

const empty=render({phases:[],agg:[]},base,1);
assert.match(empty,/pt-empty/, 'incomplete schedules have a useful empty state');
assert.equal(segmentTags(empty,'sales').length,0);

// The slider must surface the view and reuse its existing 24-month pager.
assert.match(source,/<button[^>]*data-tab="timeline"[^>]*>Timeline<\/button>/);
assert.match(source,/id="flowTimelineWrap"/);
assert.match(source,/id="flowTimelineBody"/);
assert.match(widgetFunction('renderFlowTable'),/flowTimelineHtml\(c,m,cols\)/,
  'the timeline shares the same visible calendar months as the cash-flow table');
assert.match(source,/id="flowPrev"[^\n]*Previous months/);
assert.match(source,/id="flowNext"[^\n]*Next months/);

console.log('Pro Forma timeline stages, overlap, paging, details, and empty schedule checks passed.');
