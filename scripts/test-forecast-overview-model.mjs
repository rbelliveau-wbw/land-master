import assert from 'node:assert/strict';
import '../widgets/forecast-manager/src/app/forecast-model.js';
import '../widgets/forecast-manager/src/app/forecast-overview.js';
const M=globalThis.ForecastModel,O=globalThis.ForecastOverview;
function fixture(){
  const years=[{id:'300000000000000001',builderId:'200000000000000001',year:'2026'},{id:'300000000000000002',builderId:'200000000000000002',year:'2028'}];
  return {today:'2026-10-29',subdivision:{id:'100000000000000001'},overview:{version:1,projectsLots:200,lmLots:170},years,months:years.flatMap(parent=>M.months.map((month,index)=>({id:parent.id+String(index).padStart(2,'0'),parentId:parent.id,builderId:parent.builderId,subdivisionId:'100000000000000001',year:parent.year,month,start:M.start(parent.year,index),forecast:3,actual:2,scheduled:1})))};
}
const snapshot=fixture(),overview=O.build(snapshot);
assert.equal(overview.displayTotalLabel,'Sold + Forecast');
assert.equal(overview.displayTotal,8*2+4*3+12*3,'all-year total reuses actuals before current month and forecasts from current month forward');
assert.equal(overview.projectsDifference,200-64);assert.equal(overview.lmDifference,170-64);
for(const view of ['outlook','forecast','actual','scheduled']){snapshot.view=view;assert.equal(O.build(snapshot).displayTotal,64,'the active matrix tab never changes the combined header basis');}
snapshot.overview.lmLots=0;assert.equal(O.build(snapshot).lmDifference,null,'No LM lots suppresses difference arithmetic');
snapshot.overview.projectsLots=null;assert.equal(O.build(snapshot).projectsDifference,null,'an unavailable Projects quantity is distinct from zero');
snapshot.overview.projectsLots=0;assert.equal(O.build(snapshot).projectsDifference,-64,'a known zero Projects count has a real signed difference');
delete snapshot.overview;snapshot.inventory={counts:{Total:9}};assert.equal(O.build(snapshot).lmLots,9,'old native snapshots retain available inventory counts');assert.equal(O.build(snapshot).projectsLots,undefined,'absent new Projects metadata leaves the existing native-summary fallback available');
const broken=fixture();broken.months.pop();assert.equal(O.build(broken).displayTotal,null,'incomplete saved years cannot silently publish a partial combined total');
const duplicate=fixture();duplicate.years.push({...duplicate.years[0],id:'duplicate'});assert.equal(O.build(duplicate).displayTotal,null,'duplicate parents stay visibly unavailable');
const empty=fixture();empty.years=[];empty.months=[];assert.equal(O.build(empty).displayTotal,0);
const untouched=fixture(),original=structuredClone(untouched);O.build(untouched);assert.deepEqual(untouched,original,'helper never mutates native snapshots');
console.log('PASS whole-subdivision Forecast header totals: existing outlook rules, sparse and noncontiguous years, constant cross-tab basis, signed deltas, zero/unknown/no-LM, old backend data and incomplete/duplicate rejection.');
