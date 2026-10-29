import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {forecastFixture} from './fixtures/insights-forecasts.mjs';
const dir='widgets/lot-sales-explorer/src/app/';
for(const file of ['sales-model.js','forecast-model.js','forecast-insights-model.js','forecast-insights-adapter.js','insights-access.js'])await import('../'+dir+file);
const M=globalThis.ForecastInsightsModel,A=globalThis.ForecastInsightsCreator,today='2026-10-27';
assert.equal(fs.readFileSync(dir+'forecast-model.js','utf8'),fs.readFileSync('widgets/forecast-manager/src/app/forecast-model.js','utf8'),'Forecast Manager rules are reused unchanged');
const filters={groupBy:'project',mode:'outlook',period:'next',years:[],projectStatuses:[],territories:[],projectIds:[],builderIds:[],search:'',hideEmpty:false};
const data=forecastFixture(),model=M.normalize(data),report=M.report(model,filters,today);
assert.deepEqual(M.report(model,{...filters,search:' av01 '},today).rows.map(r=>r.phase.id),[data.subdivisions[0].ID],'subdivision codes match case-insensitively with trimmed search');
assert.ok(A.fields.subdivisions.includes('Subdivision_Code'),'the existing native field is explicitly requested');
assert.deepEqual(report.years,[2026,2027]);assert.equal(report.months.length,24);assert.equal(report.months[11].key,'2027-01');assert.equal(report.months[12].key,'2027-02');
const alta=report.rows.find(r=>r.phase.name.startsWith('Alta'));
assert.equal(alta.cells[0].value,5,'Completed month uses native Actual Lots');assert.equal(alta.cells[8].value,21,'Current month uses saved forecast, without adding actuals');assert.equal(alta.cells[9].value,21);
assert.equal(M.annual(alta.cells,2026).value,8*5+4*21);assert.equal(M.annual(alta.cells,2027).value,12*21);
assert.deepEqual(M.total(alta.cells),{value:376,known:48,knownValue:376,missing:0,sold:40,forecast:336},'selected-period total adds past Sold and current/future Forecast once');
for(const mode of ['outlook','forecast'])for(const groupBy of ['project','territory','builder'])for(const period of ['current','next','planning','custom']){
  const scoped=M.report(model,{...filters,mode,groupBy,period,years:['2026','2028']},today);
  for(const row of [...scoped.rows,...scoped.rows.flatMap(row=>row.builderRows),{cells:scoped.totals}]){
    const sum=M.total(row.cells),annuals=scoped.years.map(year=>M.annual(row.cells,year));
    assert.equal(sum.knownValue,annuals.reduce((value,year)=>value+year.knownValue,0),'period total includes only selected months, including noncontiguous fiscal years');
    assert.equal(sum.sold+sum.forecast,sum.knownValue);
    assert.equal(sum.missing,annuals.reduce((value,year)=>value+year.missing,0),'missing months retain their warning');
  }
}
assert.equal(M.total(alta.builderRows[0].cells).value,176);assert.equal(M.total(alta.builderRows[1].cells).value,200,'builder detail totals do not add to the report twice');
assert.equal(M.total(report.rows.find(row=>row.phase.name.startsWith('No Forecast')).cells).value,null,'all-unknown period stays unknown');
assert.equal(M.total(report.rows.find(row=>row.phase.name.startsWith('Meadow')).cells).value,0,'known zero period stays zero');
assert.equal(report.rows.find(r=>r.phase.name.startsWith('No Forecast')).cells[0].value,null,'Absent forecasts remain unknown');
assert.equal(report.rows.find(r=>r.phase.name.startsWith('Meadow')).phase.soldOut,true);
const nonempty=M.report(model,{...filters,hideEmpty:true},today);assert.equal(nonempty.rows.length,1,'Hide Empty removes zero, missing-only and mixed blank/zero rows');assert.equal(nonempty.totals[0].value,5,'filtered totals match visible nonempty rows');assert.equal(M.hasValues([{value:null},{value:0}]),false);assert.equal(M.hasValues([{value:null},{value:5}]),true,'a nonzero month keeps a partly missing row');assert.equal(report.rows.find(r=>r.phase.name.startsWith('No Forecast')).cells[0].value,null,'hiding missing-only rows never converts missing data to zero');
assert.equal(M.report(model,{...filters,mode:'forecast'},today).rows.find(r=>r.phase.id===alta.phase.id).cells[0].value,21,'Forecast-only retains saved past forecasts');
assert.equal(M.report(model,{...filters,groupBy:'territory'},today).groups.length,2);
const builderReport=M.report(model,{...filters,groupBy:'builder'},today);assert.equal(builderReport.rows.filter(r=>r.phase.id===alta.phase.id).length,2,'Builder view allocates each forecast once');
assert.equal(M.report(model,{...filters,builderIds:[data.builders[1].ID]},today).rows.length,1);assert.equal(M.report(model,{...filters,builderIds:['unavailable']},today).rows.length,0);
assert.equal(M.report(model,{...filters,projectIds:[data.projects[0].ID]},today).rows.length,1);assert.equal(M.report(model,{...filters,territories:['Austin']},today).rows.length,1);assert.equal(M.report(model,{...filters,projectStatuses:['Planning']},today).rows.length,1);
assert.equal(M.report(model,{...filters,search:'D.R. Horton'},today).rows[0].cells[0].value,3,'Builder search keeps exact builder scope');
assert.deepEqual(M.yearsFor('custom',today,[2028,2026,2028]),[2026,2028]);assert.deepEqual(M.yearsFor('current','2027-01-10'),[2026]);assert.throws(()=>M.yearsFor('custom',today,[]));assert.throws(()=>M.report(model,filters,''));
for(const mutate of [d=>d.years.push({...d.years[0],ID:'duplicate'}),d=>d.months.push({...d.months[0],ID:'duplicate'}),d=>d.months.pop(),d=>d.months[0].Forecast_Start_Date='2026-03-01',d=>d.months[0].Forecasted_Lots='-1',d=>d.months[0].Subdivision1={ID:'wrong'}]){const d=forecastFixture();mutate(d);assert.throws(()=>M.normalize(d),'Incomplete or inconsistent forecast data rejects before rendering');}
const blank=forecastFixture();blank.months.find(m=>m.Forecast_Month==='October').Forecasted_Lots='';assert.equal(M.report(M.normalize(blank),filters,today).rows.find(r=>r.phase.id===alta.phase.id).cells[8].value,11,'one blank builder never hides another builder saved forecast');

// Builder details are cached presentation rows, never additional report contributors.
const firstPhase=result=>result.rows.find(row=>row.phase.id===data.subdivisions[0].ID);
const numericCell=cell=>({key:cell.key,value:cell.value,knownValue:cell.knownValue,known:cell.known,missing:cell.missing,sold:cell.sold,forecast:cell.forecast});
function assertBuilderDetailParity(result){
  const parent=firstPhase(result);assert.equal(parent.builderRows.length,2);
  assert.deepEqual(parent.builderRows.map(row=>row.builder.id).sort(),parent.builders.map(builder=>builder.id).sort(),'only currently scoped builders have child rows');
  assert.ok(parent.builderRows.every(row=>typeof row.key==='string'&&typeof row.builder.id==='string'),'exact large Creator IDs remain strings');
  assert.equal(new Set(parent.builderRows.map(row=>row.key)).size,2,'child motion identities are unique');
  assert.ok(parent.builderRows.every(child=>!result.rows.some(row=>row.key===child.key)),'child rows are excluded from report/group/footer/CSV source rows');
  const rolled=M.aggregate(parent.builderRows,result.months);assert.deepEqual(rolled.map(numericCell),parent.cells.map(numericCell),'children reproduce the exact known/unknown monthly parent aggregate');
  for(const year of result.years)assert.deepEqual(M.annual(rolled,year),M.annual(parent.cells,year),'child annual totals agree without adding a second report contribution');
  return parent;
}
assertBuilderDetailParity(report);assert.equal(report.rows.length,3);assert.equal(report.totals[8].value,21,'cached child details do not double-count the footer');
assert.ok(report.rows.filter(row=>row.builders.length<=1).every(row=>row.builderRows.length===0),'single-builder and unassigned phases have no redundant children');
assert.ok(builderReport.rows.every(row=>row.builderRows.length===0),'Builder grouping already supplies the one-builder level');
for(const mode of ['outlook','forecast'])for(const groupBy of ['project','territory'])assertBuilderDetailParity(M.report(model,{...filters,mode,groupBy},today));
const currentDetails=M.report(model,{...filters,period:'current'},today);assertBuilderDetailParity(currentDetails);assert.ok(firstPhase(currentDetails).builderRows.every(row=>row.cells.length===12&&row.cells.every(cell=>cell.year===2026)));
const laterDetails=M.report(model,{...filters,period:'custom',years:['2027']},today);assertBuilderDetailParity(laterDetails);assert.ok(firstPhase(laterDetails).builderRows.every(row=>row.cells.length===12&&row.cells.every(cell=>cell.year===2027)),'child months follow only the selected fiscal range');
for(const scoped of [M.report(model,{...filters,builderIds:[data.builders[1].ID]},today),M.report(model,{...filters,search:'D.R. Horton'},today)]){
  const parent=firstPhase(scoped);assert.equal(parent.builders[0].id,data.builders[1].ID);assert.equal(parent.builderRows.length,0,'single-builder filters/search do not expose other builders');
}
const repeated=M.report(model,filters,today);assert.deepEqual(firstPhase(repeated).builderRows.map(row=>row.key),alta.builderRows.map(row=>row.key),'child identities survive a genuine report rebuild');
const sparseDetails=forecastFixture();
for(const [builderId,year]of [[sparseDetails.builders[0].ID,'2027'],[sparseDetails.builders[1].ID,'2026']]){
  const parent=sparseDetails.years.find(row=>row.Subdivision1.ID===sparseDetails.subdivisions[0].ID&&row.Builder1.ID===builderId&&row.Forecast_Year===year);
  sparseDetails.years=sparseDetails.years.filter(row=>row.ID!==parent.ID);sparseDetails.months=sparseDetails.months.filter(row=>row.Forecast_Year2.ID!==parent.ID);
}
const sparseParent=assertBuilderDetailParity(M.report(M.normalize(sparseDetails),filters,today));
assert.ok(sparseParent.builderRows.find(row=>row.builder.id===data.builders[0].ID).cells.filter(cell=>cell.year===2027).every(cell=>cell.value===null&&cell.known===0&&cell.missing===1),'missing builder-years remain unknown in the detail line');
assert.equal(sparseParent.cells[8].value,10);assert.equal(sparseParent.cells[12].value,11,'one builder missing a year does not erase another builder detail');
for(const emptyValue of ['0','']){
  const emptyDetails=forecastFixture();for(const month of emptyDetails.months.filter(row=>row.Subdivision1.ID===emptyDetails.subdivisions[0].ID&&row.Builder1.ID===emptyDetails.builders[0].ID)){month.Forecasted_Lots=emptyValue;month.Actual_Lots='0';}
  const parent=assertBuilderDetailParity(M.report(M.normalize(emptyDetails),{...filters,mode:'forecast'},today));
  const emptyChild=parent.builderRows.find(row=>row.builder.id===data.builders[0].ID),populatedChild=parent.builderRows.find(row=>row.builder.id===data.builders[1].ID);
  assert.equal(M.hasValues(emptyChild.cells),false,'Hide Empty can hide a zero or unknown child while retaining its populated parent');assert.equal(M.hasValues(populatedChild.cells),true);
  assert.ok(emptyChild.cells.every(cell=>cell.value===(emptyValue===''?null:0)),'zero and unknown child values remain distinct');
}
const all=new Map(Object.entries(A.reports).map(([key,name])=>[name,data[key]]));let calls=0;
globalThis.LotSalesCreator={readAll:async(api,name,onProgress,fields,options)=>{calls++;assert.equal(options.isCancelled(),false);assert.deepEqual(fields,A.fields[Object.keys(A.reports).find(k=>A.reports[k]===name)]);return all.get(name);}};
assert.deepEqual(await A.load({}, {isCurrent:()=>true}),data);assert.equal(calls,5);
await assert.rejects(A.load({}, {isCurrent:()=>false}),/session changed/);
const original=globalThis.LotSalesCreator.readAll;globalThis.LotSalesCreator.readAll=async(...args)=>{if(args[1]==='All_Forecasts')throw Error('Read denied');return original(...args);};await assert.rejects(A.load({}, {isCurrent:()=>true}),/Read denied/);
globalThis.LotSalesCreator.readAll=async(...args)=>{const rows=await original(...args);if(args[1]!=='All_Forecasts')return rows;return rows.map(({Forecasted_Lots,...rest})=>rest);};await assert.rejects(A.load({}, {isCurrent:()=>true}),/Forecasted_Lots is unavailable/);
const runtime={current:()=>({environment:'PRODUCTION',user:'viewer',appLinkName:'land-master'}),apiName:n=>n};
const access=async flags=>globalThis.InsightsAccess.load({DATA:{invokeCustomApi:async()=>({code:3000,result:flags})}},runtime);
assert.equal((await access({hasRow:true,lotSalesDashboard:true})).forecastsDashboard,false,'Lot Sales access never implies Forecasts');
assert.equal((await access({hasRow:true,forecastsDashboard:true,today})).forecastsDashboard,true);assert.equal((await access({hasRow:false,forecastsDashboard:true,today})).forecastsDashboard,false);
console.log('PASS Forecasts native shapes, reused outlook rule, fiscal boundaries, exact grouping, unknown values, complete reads and independent access.');

assert.deepEqual(M.report(model,{...filters,subdivisionIds:[data.subdivisions[0].ID]},today).rows.map(r=>r.phase.id),[data.subdivisions[0].ID]);
assert.equal(M.report(model,{...filters,subdivisionIds:[data.subdivisions[0].ID],projectIds:[data.projects[1].ID]},today).rows.length,0,'Project and Subdivision filters intersect');

assert.deepEqual(M.yearsFor('planning',today),[2026,2027,2028,2029]);
