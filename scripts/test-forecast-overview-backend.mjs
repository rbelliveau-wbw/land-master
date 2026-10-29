// Execute the actual additive read-only header contract, using native field shapes.
// This offline interpreter does not confirm native Creator compilation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {forecastRuntime,date} from './lib/forecast-deluge-test-runtime.mjs';

const source=fs.readFileSync(new URL('../creator/functions/forecastManagerWidget.dg',import.meta.url),'utf8');
const schema=JSON.parse(fs.readFileSync(new URL('../creator/generated/fields/Subdivision.json',import.meta.url),'utf8'));
for(const field of ['Projects_Status','Lot_Total_Residential'])assert.ok(schema.fields.some(row=>row.link_name===field),'existing native Subdivision.'+field+' is authoritative');
function fixture(){return {
  Settings:[{ID:1,Open_Forecasting_Window:false}],
  Subdivision:[{ID:10,Subdivision_Name:'Phase One',Subdivision_Code:'P01',Territory:'North Austin',Projects_Status:'Awaiting CONST',Status:'Active',Lot_Total_Residential:200,Total_Lots:999,Last_Sold_Date:date('2001-01-01'),Builders:[20]}],
  Builder:[{ID:20,Builder_Name:'Real Builder',Type1:'Builder'}],
  Forecast_Year:[{ID:30,Subdivision1:10,Builder1:20,Forecast_Year:'2026',Status:'Builder'},{ID:31,Subdivision1:10,Builder1:20,Forecast_Year:'2029',Status:'Builder'},{ID:32,Subdivision1:10,Builder1:20,Forecast_Year:'2031',Status:'Summary'},{ID:33,Subdivision1:99,Builder1:20,Forecast_Year:'2032',Status:'Builder'}],
  Forecast:[
    {ID:100,Forecast_Year2:30,Subdivision1:10,Builder1:20,Forecast_Year:'2026',Forecast_Start_Date:date('2026-03-01'),Forecasted_Lots:3},
    {ID:101,Forecast_Year2:31,Subdivision1:10,Builder1:20,Forecast_Year:'2029',Forecast_Start_Date:date('2029-06-01'),Forecasted_Lots:4},
    {ID:102,Forecast_Year2:30,Subdivision1:10,Builder1:20,Forecast_Year:'2026',Forecast_Start_Date:date('2026-02-01'),Forecasted_Lots:0},
    {ID:103,Forecast_Year2:30,Subdivision1:10,Builder1:20,Forecast_Year:'2026',Forecast_Start_Date:date('2026-01-01'),Forecasted_Lots:null},
    {ID:104,Forecast_Year2:31,Subdivision1:10,Builder1:20,Forecast_Year:'2029',Forecast_Start_Date:date('2030-01-01'),Forecasted_Lots:99,Delete_me:true},
    {ID:105,Forecast_Year2:32,Subdivision1:10,Builder1:20,Forecast_Year:'2031',Forecast_Start_Date:date('2031-02-01'),Forecasted_Lots:99},
    {ID:106,Forecast_Year2:33,Subdivision1:99,Builder1:20,Forecast_Year:'2032',Forecast_Start_Date:date('2032-02-01'),Forecasted_Lots:99},
    {ID:107,Forecast_Year2:30,Subdivision1:99,Builder1:20,Forecast_Year:'2026',Forecast_Start_Date:date('2024-01-01'),Forecasted_Lots:99},
    {ID:108,Forecast_Year2:30,Subdivision1:10,Builder1:21,Forecast_Year:'2026',Forecast_Start_Date:date('2023-01-01'),Forecasted_Lots:99}
  ],
  Lots:[
    {ID:201,Subdivision:10,Builder1:20,Close_Date:date('2026-04-18'),Status:'Sold'},
    {ID:202,Subdivision:10,Builder1:20,Close_Date:date('2025-12-30'),Status:'Open'},
    {ID:203,Subdivision:10,Builder1:20,Status:'Contracted',Model:true,Archived:true},
    {ID:204,Subdivision:99,Builder1:20,Close_Date:date('2033-12-30'),Status:'Sold'}
  ],Contract:[]
};}
function snapshot(tables=fixture()){const runtime=forecastRuntime(source,tables),result=runtime.invoke({action:'snapshot',subdivisionId:'10'});assert.equal(result.ok,true,result.message);assert.equal(runtime.writes.length,0,'overview adds no native writes');return {runtime,result};}
const {runtime,result}=snapshot();
assert.deepEqual(JSON.parse(JSON.stringify(result.overview)),{version:1,projectStatus:'Awaiting CONST',territory:'North Austin',projectsLots:200,lmLots:3,soldOut:false,firstSoldDate:'2025-12-30',lastSoldDate:'2026-04-18',firstForecastDate:'2026-03-01',finalForecastDate:'2029-06-01'});
assert.equal(result.subdivision.id,'10','native record IDs remain strings');
assert.equal(runtime.invoke({action:'catalog'}).subdivisions[0].territory,'North Austin','Territory choices reuse catalog Subdivision metadata');
assert.equal(runtime.writes.length,0,'catalog and overview are read-only');

for(const quantity of [0,null]){
  const tables=fixture();tables.Subdivision[0].Lot_Total_Residential=quantity;
  assert.equal(snapshot(tables).result.overview.projectsLots,quantity,'Projects/Budget blank quantity is not coerced to zero');
}
const empty=fixture();empty.Lots=[];empty.Forecast=[];empty.Subdivision[0].Territory=null;empty.Subdivision[0].Projects_Status=null;
const blank=snapshot(empty).result.overview;
assert.equal(blank.lmLots,0,'No LM lots is based on real subdivision records, not stale stored Total_Lots');assert.equal(blank.soldOut,false);assert.equal(blank.territory,'Unassigned');assert.equal(blank.projectStatus,'');
for(const field of ['firstSoldDate','lastSoldDate','firstForecastDate','finalForecastDate'])assert.equal(blank[field],'','missing date stays empty');
const soldOut=fixture();soldOut.Lots=soldOut.Lots.filter(row=>row.Subdivision===10&&row.Close_Date);
assert.equal(snapshot(soldOut).result.overview.soldOut,true,'all subdivision inventory sold marks the actual final sale');
const undated=fixture();undated.Lots=[{ID:220,Subdivision:10,Status:'Sold'}];
assert.equal(snapshot(undated).result.overview.lastSoldDate,'','a stored Sold status does not invent a Close Date');
const future=fixture();future.Lots.push({ID:221,Subdivision:10,Close_Date:date('2026-12-21'),Status:'Open'});
assert.equal(snapshot(future).result.overview.lastSoldDate,'2026-12-21','retain the existing all-date Close Date precedence without a new today cutoff');
console.log('PASS native Forecast overview: exact Projects/Budget fields, catalog Territory, all-date actual sales, positive Builder forecast dates, deleted/foreign scope, zero/null quantities, live LM inventory, sold-out and write-free reads. Native compilation remains a Creator promotion check.');
