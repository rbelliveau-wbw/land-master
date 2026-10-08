import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {forecastRuntime,date} from './lib/forecast-deluge-test-runtime.mjs';

const source=fs.readFileSync(new URL('../creator/functions/forecastManagerWidget.dg',import.meta.url),'utf8');
const context=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../widgets/forecast-manager/src/app/forecast-model.js',import.meta.url),'utf8'),context);
const M=context.ForecastModel;
const monthNames=['February','March','April','May','June','July','August','September','October','November','December','January'];
const clone=value=>JSON.parse(JSON.stringify(value));
const base={Settings:[{ID:1,Open_Forecasting_Window:true}],Subdivision:[{ID:10,Subdivision_Name:'Fixture phase',Subdivision_Code:'FX01',Phase:'1',Builders:[20,21],Unforecasted_Lots:5}],Builder:[{ID:20,Builder_Name:'Fixture Builder A'},{ID:21,Builder_Name:'Fixture Builder B'}],Forecast_Year:[{ID:30,Subdivision1:10,Builder1:20,Forecast_Year:'2026',Status:'Builder',Forecast_Name:'FX01 - Fixture Builder A - FC2026'}],Forecast:monthNames.map((month,index)=>({ID:100+index,Subdivision1:10,Builder1:20,Forecast_Year2:30,Forecast_Year:'2026',Forecast_Month:month,Forecast_Start_Date:date(M.start('2026',index)),Forecasted_Lots:index===8?2:null,Actual_Lots:index===0?4:null,Scheduled_Lots:index===8?1:null,Delete_me:false})),Lots:Array.from({length:10},(_,index)=>({ID:200+index,Subdivision:10,Builder1:20,Phase:'1',Model:false,Status:index<3?'Sold':'Contracted',Purchase_Date:index<3?date('2026-09-01'):null,Close_Date:index<3?date('2026-09-15'):null}))};

// Catalog keeps legacy matrix identities while exposing native Builder.Type1 for creation pickers.
const typedCatalog=clone(base);typedCatalog.Builder[0].Type1='Builder';typedCatalog.Builder[1].Type1='Placeholder';
const catalogRead=forecastRuntime(source,typedCatalog),catalogResult=catalogRead.invoke({action:'catalog'});
assert.equal(catalogResult.ok,true);assert.equal(catalogResult.builders.find(row=>row.id==='20').type,'Builder');assert.equal(catalogResult.builders.find(row=>row.id==='21').type,'Placeholder');assert.equal(catalogRead.writes.length,0);

// Compare the archived FEB...JAN input workflows, rather than assuming a month-end rule.
const ds=fs.readFileSync(new URL('../creator/exports/Land_Master_2026-08-06.ds',import.meta.url),'utf8');
function exportedYears(form){const begin=ds.indexOf('\t\tform '+form+'\n'),end=ds.indexOf('\n\t\tform ',begin+1),block=ds.slice(begin,end),options=block.match(/must have Forecast_Year\s*\([\s\S]*?values = \{([^}]+)\}/);assert.ok(options,form+' required year picklist is present');return JSON.parse('['+options[1]+']');}
const parentYears=exportedYears('Forecast_Year'),childYears=exportedYears('Forecast'),supported=parentYears.filter(year=>childYears.includes(year));
assert.equal(Math.min(...supported.map(Number)),2019);assert.equal(Math.max(...supported.map(Number)),2046,'creation cannot assume the parent range alone');
const native=monthNames.map(month=>{
  const code=month.slice(0,3).toUpperCase(),start=ds.indexOf('\t\t\t'+code+'_Edit_Forecast_Manager as '),next=ds.slice(start+1).search(/\n\t\t\t\w+ as "/)+start+1,segment=ds.slice(start,next);
  assert.ok(start>=0,code+' workflow is present');
  assert.ok(segment.includes('settingsList.get(0)'));
  assert.ok(segment.includes('forecastWindowOpen != true'));
  assert.ok(segment.includes('forecastStartDate.addDay(28) < zoho.currentdate'));
  assert.ok(segment.includes('fc.Forecasted_Lots=row.'+code+'_LOTS;'));
  return segment.replace(new RegExp(code,'g'),'MONTH');
});
assert.ok(native.every(text=>text===native[0]),'all twelve native month save bodies have the same guards and side effects');

assert.equal(M.currentYear('2027-01-31'),2026);assert.equal(M.currentYear('2027-02-01'),2027);
assert.equal(M.start('2026',11),'2027-01-01');assert.equal(M.start('2026',0),'2026-02-01');
assert.equal(M.value(''),null);assert.equal(M.value('0'),0);assert.equal(M.value('0012'),12);assert.equal(M.id('90071992547409961'),'90071992547409961');
for(const invalid of ['-1','1.5','1e2','100000','two'])assert.throws(()=>M.value(invalid));
assert.equal(M.lock({start:'2026-10-01'},{today:'2026-10-29',windowOpen:true}),'');
assert.equal(M.lock({start:'2026-10-01'},{today:'2026-10-30',windowOpen:true}),'Past forecast');
assert.equal(M.lock({start:'2024-02-01'},{today:'2024-02-29',windowOpen:true}),'');
assert.equal(M.lock({start:'2026-02-01'},{today:'2026-03-01',windowOpen:true}),'');
assert.equal(M.lock({start:'2026-10-01'},{today:'2026-10-07',windowOpen:false}),'Forecasting window closed');

function run(tables=base,today){return forecastRuntime(source,tables,today);}
let engine=run(),response=engine.invoke({action:'snapshot',subdivisionId:'10'});
assert.equal(response.ok,true,JSON.stringify(response));assert.equal(response.subdivision.expectedUnforecasted,5);assert.equal(engine.writes.length,0);
const inventoryTables=clone(base);
inventoryTables.Subdivision[0].Territory='Fort Hood';
inventoryTables.Builder.push({ID:22,Builder_Name:'Fixture Builder A'});
inventoryTables.Lots=[
  {ID:801,Subdivision:10,Builder1:20,Status:'Contracted',Close_Date:date('2027-03-01'),Purchase_Date:date('2027-02-01')},
  {ID:802,Subdivision:10,Builder1:20,Status:'Sold',Purchase_Date:date('2027-02-01')},
  {ID:803,Subdivision:10,Builder1:22,Status:'Contracted',Model:true,Archived:true},
  {ID:804,Subdivision:10,Builder1:21,Status:'Open'},
  {ID:805,Subdivision:10,Builder1:null,Status:'Scheduled'},
  {ID:806,Subdivision:10,Builder1:null,Status:'On Hold'},
  {ID:807,Subdivision:999,Builder1:20,Status:'Sold'}
];
const inventoryRead=run(inventoryTables),inventoryResult=inventoryRead.invoke({action:'snapshot',subdivisionId:'10'});
assert.equal(inventoryResult.ok,true);assert.equal(inventoryRead.writes.length,0,'inventory breakdown never writes');
const insightsContext=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../widgets/lot-sales-explorer/src/app/sales-model.js',import.meta.url),'utf8'),insightsContext);
const insights=insightsContext.LotSalesModel,rawLots=inventoryTables.Lots.map(row=>({...row,Close_Date:row.Close_Date?new Date(row.Close_Date).toISOString():null,Purchase_Date:row.Purchase_Date?new Date(row.Purchase_Date).toISOString():null}));
const normalized=insights.normalize({lots:rawLots,builders:inventoryTables.Builder,subdivisions:inventoryTables.Subdivision});
const counts=insights.subdivisionCounts(normalized).get('10');
assert.deepEqual(JSON.parse(JSON.stringify(inventoryResult.inventory.counts)),{Total:counts.total,Sold:counts.sold,Scheduled:counts.scheduled,Contracted:counts.contracted,Open:counts.open},'same all-date status rules as Data Insights, including archived/model lots');
assert.deepEqual(JSON.parse(JSON.stringify(inventoryResult.inventory.builders)).sort((a,b)=>a.builder.localeCompare(b.builder)),JSON.parse(JSON.stringify(insights.builderStatusMatrix(insights.subdivisionBuilderBreakdown(normalized,'10')))),'Data Insights builder matrix excludes Open, merges matching display names and retains Unassigned');
assert.equal(inventoryResult.inventory.territory,'Fort Hood');
let matrix=M.matrix(response,['20','20','21'],['2026','2027','2026']);assert.equal(matrix.length,2);assert.equal(matrix[0].years.length,2);assert.equal(matrix[0].years[0].months[11].start,'2027-01-01');assert.equal(matrix[1].years[0].parent,null);
assert.equal(M.verifyEnsure(response,'20','2026'),true);assert.equal(M.verifyEnsure(response,'21','2026'),false);
assert.equal(M.hasYear(response,'20','2026'),true);assert.equal(M.hasYear(response,'21','2026'),false);
const incompleteConflict=clone(response);incompleteConflict.months=[];assert.equal(M.verifyEnsure(incompleteConflict,'20','2026'),false);assert.equal(M.hasYear(incompleteConflict,'20','2026'),true,'an existing parent blocks creation even without all children');
const duplicateConflict=clone(response);duplicateConflict.years.push({...duplicateConflict.years[0],id:'duplicate'});assert.equal(M.hasYear(duplicateConflict,'20','2026'),true,'duplicate parents also block creation');
assert.equal(M.hasYear({years:[{builderId:'90071992547409961',year:'2024'}]},'90071992547409961','2024'),true,'exact large string builder IDs and years outside visible filters remain checked');
assert.equal(M.hasYear({years:[{builderId:'90071992547409961',year:'2024'}]},'90071992547409962','2024'),false);
assert.equal(M.hasYear(response,'','2026'),false);assert.equal(M.hasYear(response,'20',''),false);
const repeatedIds=clone(response);repeatedIds.months[1].id=repeatedIds.months[0].id;assert.equal(M.verifyEnsure(repeatedIds,'20','2026'),false,'creation verification requires 12 distinct persisted child IDs');

const save={action:'save',subdivisionId:'10',forecastId:'108',value:6,expected:2};
response=engine.invoke(save);assert.equal(response.ok,true,JSON.stringify(response));assert.equal(response.verifiedForecastId,'108');assert.equal(response.verifiedValue,6);assert.equal(engine.tables.Subdivision[0].Unforecasted_Lots,1);assert.equal(engine.tables.Forecast[8].Forecasted_Lots,6);
assert.ok(engine.writes.every(write=>write.form==='update'&&(write.field==='Forecasted_Lots'||write.field==='Unforecasted_Lots')),'autosave changes only the native fields');
response=engine.invoke({...save,value:null,expected:6});assert.equal(response.ok,true);assert.equal(response.verifiedValue,null);assert.equal(engine.tables.Subdivision[0].Unforecasted_Lots,7);
response=engine.invoke({...save,value:0,expected:null});assert.equal(response.ok,true);assert.equal(response.verifiedValue,0);

for(const [tables,today,label] of [[{...base,Settings:[{ID:1,Open_Forecasting_Window:false}]},'2026-10-07','closed'],[{...base,Settings:[]},'2026-10-07','missing setting'],[base,'2026-10-30','past']]) {
  engine=run(tables,today);response=engine.invoke(save);assert.equal(response.ok,false,label);assert.equal(engine.writes.length,0,label+' never writes');
}
for(const today of ['2026-10-29']){engine=run(base,today);assert.equal(engine.invoke(save).ok,true);}
engine=run();assert.equal(engine.invoke({...save,expected:9}).conflict,true);assert.equal(engine.writes.length,0,'stale input is rejected without a write');
engine=run();assert.equal(engine.invoke({...save,value:1.5}).ok,false);assert.equal(engine.writes.length,0);
engine=run();assert.equal(engine.invoke({...save,subdivisionId:'999'}).ok,false);assert.equal(engine.writes.length,0);
const duplicated=clone(base);duplicated.Forecast_Year.push({...duplicated.Forecast_Year[0],ID:31});engine=run(duplicated);assert.equal(engine.invoke(save).ok,false);assert.equal(engine.writes.length,0);
const wrongDate=clone(base);wrongDate.Forecast[8].Forecast_Start_Date=date('2026-10-02');engine=run(wrongDate);assert.equal(engine.invoke(save).ok,false);assert.equal(engine.writes.length,0);
const duplicateMonth=clone(base);duplicateMonth.Forecast.push({...duplicateMonth.Forecast[8],ID:900});engine=run(duplicateMonth);assert.equal(engine.invoke(save).ok,false);assert.equal(engine.writes.length,0);

engine=run();response=engine.invoke({action:'ensure',subdivisionId:'10',builderId:'21',year:'2027'});
assert.equal(response.ok,true);assert.equal(response.createdParent,true);assert.equal(response.createdMonths,12);assert.equal(M.verifyEnsure(response,'21','2027'),true);assert.equal(engine.tables.Forecast_Year.length,2);assert.equal(engine.tables.Forecast.length,24);
const created=engine.tables.Forecast.filter(month=>month.Builder1===21);assert.equal(created.find(month=>month.Forecast_Month==='January').Forecast_Start_Date,date('2028-01-01'));assert.ok(created.every(month=>month.Forecasted_Lots==null));
const wrote=engine.writes.length;response=engine.invoke({action:'ensure',subdivisionId:'10',builderId:'21',year:'2027'});assert.equal(response.ok,true);assert.equal(response.createdParent,false);assert.equal(response.createdMonths,0);assert.equal(engine.writes.length,wrote,'an existing complete year is idempotent');
const creationTotals=clone(base);
creationTotals.Lots.push(...['Contracted','Scheduled','Scheduled','Sold'].map((Status,index)=>({ID:950+index,Subdivision:10,Builder1:21,Status,Close_Date:date('2027-03-01')})),{ID:960,Subdivision:999,Builder1:21,Status:'Scheduled'},{ID:961,Subdivision:10,Builder1:20,Status:'Scheduled'},{ID:962,Subdivision:10,Builder1:21,Status:'Sold',Close_Date:date('2028-02-01')});
engine=run(creationTotals);response=engine.invoke({action:'ensure',subdivisionId:'10',builderId:'21',year:'2027'});assert.equal(response.ok,true);
const totalsParent=engine.tables.Forecast_Year.find(row=>String(row.ID)===response.ensuredParentId);
assert.equal(totalsParent.Total_Contracted_Lots,3,'native creation includes both Contracted and Scheduled lots within the selected subdivision/builder');
assert.equal(totalsParent.Total_Sold_Lots,1,'native sold count is limited to February through January');
for(const unsupported of ['2018','2047','2050']){engine=run();assert.equal(engine.invoke({action:'ensure',subdivisionId:'10',builderId:'21',year:unsupported}).ok,false,'both required picklists must support '+unsupported);assert.equal(engine.writes.length,0);}
engine=run();response=engine.invoke({action:'ensure',subdivisionId:'10',builderId:'21',year:'2046'});assert.equal(response.ok,true);assert.equal(M.verifyEnsure(response,'21','2046'),true);
const incomplete=clone(base);incomplete.Forecast.pop();engine=run(incomplete);assert.equal(engine.invoke({action:'ensure',subdivisionId:'10',builderId:'20',year:'2026'}).ok,false);assert.equal(engine.writes.length,0,'an incomplete existing year is not silently rewritten');
const orphan=clone(base);orphan.Forecast.push({...orphan.Forecast[0],ID:999,Builder1:21,Forecast_Year2:null});engine=run(orphan);assert.equal(engine.invoke({action:'ensure',subdivisionId:'10',builderId:'21',year:'2026'}).ok,false);assert.equal(engine.writes.length,0);
engine=run({...base,Settings:[]});assert.equal(engine.invoke({action:'ensure',subdivisionId:'10',builderId:'21',year:'2027'}).ok,true,'empty-year creation mirrors native mass creation without unlocking month inputs');
assert.equal(engine.invoke({action:'snapshot',subdivisionId:'10'}).windowOpen,false);
engine=run();engine.context.zoho.loginuser='public';assert.equal(engine.invoke(save).ok,false);assert.equal(engine.writes.length,0);
assert.ok(!source.includes('containsKey')&&!/\bwhile\s*\(/.test(source));assert.match(source,/\n\treturn response\.toString\(\);\n\}\s*$/);
console.log('PASS: all 12 exported native month workflows agree; February fiscal years, exact 28-day gates, server rechecks, blank/zero values, scope/date/duplicate/conflict guards, native totals, one builder row and idempotent parent + 12-month creation. Offline execution does not confirm Creator compilation.');
