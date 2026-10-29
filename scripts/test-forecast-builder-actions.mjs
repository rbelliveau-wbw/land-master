import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {forecastRuntime} from './lib/forecast-deluge-test-runtime.mjs';
const source=fs.readFileSync(new URL('../creator/functions/forecastManagerWidget.dg',import.meta.url),'utf8');
const fixture=()=>({Settings:[{ID:1,Open_Forecasting_Window:false}],Subdivision:[{ID:10,Subdivision_Name:'Phase One',Subdivision_Code:'P01',Builders:[20]}],Builder:[{ID:20,Builder_Name:'Placeholder',Type1:'Builder'},{ID:21,Builder_Name:'Real Builder',Type1:'Builder'},{ID:22,Builder_Name:'Another Builder',Type1:'Builder'}],Forecast_Year:[{ID:30,Subdivision1:10,Builder1:20,Forecast_Year:'2026',Status:'Builder',Forecast_Name:'P01 - Placeholder - FC2026',Builder_Notes:'Target builder'},{ID:31,Subdivision1:10,Builder1:20,Forecast_Year:'2028',Status:'Builder',Forecast_Name:'P01 - Placeholder - FC2028'},{ID:32,Subdivision1:99,Builder1:20,Forecast_Year:'2026',Status:'Builder',Forecast_Name:'Other - Placeholder - FC2026'},{ID:33,Subdivision1:10,Builder1:21,Forecast_Year:'2025',Status:'Builder',Forecast_Name:'P01 - Real Builder - FC2025'}],Forecast:[{ID:100,Subdivision1:10,Builder1:20,Forecast_Year2:30,Forecast_Year:'2026',Forecasted_Lots:12},{ID:101,Subdivision1:10,Builder1:20,Forecast_Year2:31,Forecast_Year:'2028',Forecasted_Lots:3},{ID:102,Subdivision1:99,Builder1:20,Forecast_Year2:32,Forecast_Year:'2026'},{ID:103,Subdivision1:10,Builder1:20,Forecast_Year2:null,Forecast_Year:'2030',Delete_me:true}],Lots:[],Contract:[{ID:70,Builder:21,Subdivision1:[10,11],Contract_Type:'Lot (Master)',Status:'New',Archive:true},{ID:71,Builder:22,Subdivision1:[10],Contract_Type:'Service Agreement'},{ID:72,Builder:20,Subdivision1:[99],Contract_Type:'Lot (Amendment)'},{ID:73,Builder:22,Subdivision1:[99],Contract_Type:'Lot'}]});
const request={subdivisionId:'10',sourceBuilderId:'20',destinationBuilderId:'21'};
let engine=forecastRuntime(source,fixture()),result=engine.invoke({action:'snapshot',subdivisionId:'10'});
assert.equal(result.ok,true,result.message);assert.equal(result.builderActionsVersion,1);assert.equal(result.years.find(p=>p.id==='30').note,'Target builder');assert.equal(result.years.find(p=>p.id==='33').hasLotContract,true,'any status and any subdivision in the contract lookup');assert.equal(result.years.find(p=>p.id==='30').hasLotContract,false,'other subdivision contracts do not count');assert.equal(engine.writes.length,0);
let catalog=engine.invoke({action:'catalog'});assert.equal(catalog.builders.find(b=>b.id==='20').placeholder,true);assert.equal(catalog.builders.find(b=>b.id==='21').placeholder,false);
let plan=engine.invoke({action:'assign_preview',...request});assert.equal(plan.ok,true,plan.message);assert.deepEqual([...plan.assignment.parentIds],['30','31']);assert.deepEqual([...plan.assignment.forecastIds],['100','101','103']);assert.equal(engine.writes.length,0,'preflight never writes and includes hidden years and marked/orphan months');
let rejected=engine.invoke({action:'assign',...request,parentIds:['30'],forecastIds:['100']});assert.equal(rejected.ok,false);assert.equal(engine.writes.length,0,'stale/incomplete preview writes nothing');
result=engine.invoke({action:'assign',...request,parentIds:plan.assignment.parentIds,forecastIds:plan.assignment.forecastIds});assert.equal(result.ok,true,result.message);assert.equal(result.assignment.acknowledged,true);assert.equal(engine.tables.Forecast_Year.find(p=>p.ID===30).Builder1,21);assert.equal(engine.tables.Forecast_Year.find(p=>p.ID===31).Builder1,21);assert.equal(engine.tables.Forecast.find(p=>p.ID===103).Builder1,21);assert.equal(engine.tables.Forecast_Year.find(p=>p.ID===32).Builder1,20);assert.equal(engine.tables.Forecast.find(p=>p.ID===102).Builder1,20);assert.equal(engine.tables.Forecast_Year.find(p=>p.ID===30).Builder_Notes,'Target builder');assert.equal(engine.tables.Forecast.find(p=>p.ID===100).Forecasted_Lots,12);
let writes=engine.writes.length;result=engine.invoke({action:'assign_status',...request,parentIds:plan.assignment.parentIds,forecastIds:plan.assignment.forecastIds});assert.equal(result.assignment.verified,true);assert.equal(engine.writes.length,writes,'lost-response recovery performs no writes');
result=engine.invoke({action:'assign_preview',...request,sourceBuilderId:'21',destinationBuilderId:'22'});assert.equal(result.ok,false,'real builders cannot be reassigned');assert.equal(engine.writes.length,writes);
let collision=fixture();collision.Forecast_Year.push({ID:34,Subdivision1:10,Builder1:21,Forecast_Year:'2028'});engine=forecastRuntime(source,collision);result=engine.invoke({action:'assign_preview',...request});assert.equal(result.ok,false);assert.equal(engine.writes.length,0,'destination conflicts cannot merge forecasts');
let mismatch=fixture();mismatch.Forecast[0].Builder1=22;engine=forecastRuntime(source,mismatch);result=engine.invoke({action:'assign_preview',...request});assert.equal(result.ok,false);assert.equal(engine.writes.length,0,'inconsistent parent-child scope blocks all writes');
engine=forecastRuntime(source,fixture());result=engine.invoke({action:'note',subdivisionId:'10',parentId:'30',note:'Target Omega',expected:'Target builder'});assert.equal(result.ok,true,result.message);assert.equal(result.savedNoteParentId,'30');assert.equal(engine.tables.Forecast_Year[0].Builder_Notes,'Target Omega');assert.equal(engine.tables.Forecast[0].Forecasted_Lots,12);writes=engine.writes.length;
for(const payload of [{parentId:'30',expected:'old',note:'Overwrite'},{parentId:'32',expected:'',note:'Wrong subdivision'},{parentId:'33',expected:'',note:'Real builder'},{parentId:'30',expected:'Target Omega',note:'a'.repeat(10001)}]){result=engine.invoke({action:'note',subdivisionId:'10',...payload});assert.equal(result.ok,false,result.message);assert.equal(engine.writes.length,writes);}
result=engine.invoke({action:'note',subdivisionId:'10',parentId:'30',note:'',expected:'Target Omega'});assert.equal(result.ok,true);assert.equal(engine.tables.Forecast_Year[0].Builder_Notes,'','empty note is persisted');
const actionsContext=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(new URL('../widgets/forecast-manager/src/app/forecast-builder-actions.js',import.meta.url),'utf8'),actionsContext);
for(const name of ['Placeholder','Placeholder2','Placeholder3','Placeholder4','  pLaCeHoLdEr3  ']) {
  const tables=fixture();tables.Builder[0].Builder_Name=name;
  const runtime=forecastRuntime(source,tables),model=actionsContext.window.ForecastBuilderActions;
  assert.equal(model.isPlaceholder({name,placeholder:false}),true,name+' works with older catalog metadata');
  assert.equal(runtime.invoke({action:'catalog'}).builders.find(row=>row.id==='20').placeholder,true,name+' catalog exception');
  const note=runtime.invoke({action:'note',subdivisionId:'10',parentId:'30',note:'Future builder for '+name,expected:'Target builder'});
  assert.equal(note.ok,true,note.message);
  const preview=runtime.invoke({action:'assign_preview',...request});assert.equal(preview.ok,true,preview.message);
  assert.deepEqual([...preview.assignment.parentIds],['30','31'],name+' includes hidden years');
  const assigned=runtime.invoke({action:'assign',...request,parentIds:preview.assignment.parentIds,forecastIds:preview.assignment.forecastIds});
  assert.equal(assigned.ok,true,assigned.message);assert.equal(runtime.tables.Forecast_Year[0].Builder_Notes,'Future builder for '+name);
  assert.equal(runtime.tables.Forecast_Year[1].Builder1,21);assert.equal(runtime.tables.Forecast[2].Builder1,20,'other subdivision stays unchanged');
  const destinationTables=fixture();destinationTables.Builder[1].Builder_Name=name;
  const destinationRuntime=forecastRuntime(source,destinationTables);
  assert.equal(destinationRuntime.invoke({action:'assign_preview',...request}).ok,false,name+' cannot be an assignment destination');
  assert.equal(destinationRuntime.writes.length,0);
}
for(const name of ['Placeholder1','Placeholder5','Placeholder20','Placeholder 2','Placeholder Builders','','Real Builder']) {
  assert.equal(actionsContext.window.ForecastBuilderActions.isPlaceholder({name}),false,name+' is outside the explicit exception');
  const tables=fixture();tables.Builder[0].Builder_Name=name;const runtime=forecastRuntime(source,tables);
  assert.equal(runtime.invoke({action:'catalog'}).builders.find(row=>row.id==='20').placeholder,false);
  assert.equal(runtime.invoke({action:'note',subdivisionId:'10',parentId:'30',note:'Blocked',expected:'Target builder'}).ok,false);
  assert.equal(runtime.invoke({action:'assign_preview',...request}).ok,false);assert.equal(runtime.writes.length,0);
}
assert.equal(actionsContext.window.ForecastBuilderActions.isPlaceholder(null),false);
assert.equal(actionsContext.window.ForecastBuilderActions.isPlaceholder({name:'Metadata placeholder',placeholder:true}),true,'preserve explicit catalog metadata');
console.log('PASS forecast builder actions: four exact placeholder names, normalized names, rejected lookalikes/destinations, all-year scope, parent-child safeguards, duplicate/stale rejection, real-builder lock, preserved lots/notes, blank/conflicting notes and write-free assignment recovery.');
