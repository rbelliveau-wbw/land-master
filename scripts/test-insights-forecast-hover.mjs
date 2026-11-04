import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the production renderer/card handlers without a browser or live data.
const listeners=new Map(),nodes=new Map();
function node(id){
  if(!nodes.has(id))nodes.set(id,{id,hidden:true,innerHTML:'',textContent:'',style:{},offsetWidth:280,offsetHeight:200,attributes:new Map(),
    addEventListener(type,handler){listeners.set(id+':'+type,handler);},
    setAttribute(name,value){this.attributes.set(name,String(value));},
    contains(target){return target===this;}});
  return nodes.get(id);
}
let UI;
const context=vm.createContext({ForecastInsightsModel:{},LotSalesModel:{},document:{getElementById:node,addEventListener(type,handler){listeners.set('document:'+type,handler);}},
  innerWidth:1000,innerHeight:700,setTimeout,clearTimeout,Intl,
  __expose(value){UI=value;}});
context.window=context;context.addEventListener=()=>{};
const source=fs.readFileSync('widgets/lot-sales-explorer/src/app/forecast-insights-app.js','utf8');
vm.runInContext(source.replace('  window.ForecastInsightsApp=Object.freeze','  __expose({S,cellValue,cellTitle,builderLabel,openCard,closeCard});\n  window.ForecastInsightsApp=Object.freeze'),context);
UI.S.permissions={today:'2026-11-04'};UI.S.report={mode:'outlook',rows:[]};
const current={start:'2026-11-01',name:'November',value:11,sold:0,forecast:11,missing:0,tooltipForecast:11,tooltipScheduled:4,tooltipSold:2,tooltipForecastMissing:0};
const markup=UI.cellValue(current,'phase:month','fc-current-month');
assert.match(markup,/data-fc-month-info=/);assert.match(markup,/aria-haspopup="dialog"/);
assert.match(markup,/# Forecast: 11[\s\S]*# Scheduled: 4[\s\S]*# Sold: 2/,'current-month accessible comparison uses saved counts without changing its displayed outlook value');
assert.doesNotMatch(UI.cellValue({...current,start:'2026-10-01'},'phase:past'),/data-fc-month-info=/,'only the exact current calendar month gets the comparison card');
assert.match(UI.cellTitle({...current,tooltipForecast:null,tooltipScheduled:null,tooltipSold:null}),/# Forecast: —\n# Scheduled: —\n# Sold: —/,'missing records never become zero counts');
assert.match(UI.cellTitle({...current,tooltipForecast:0,tooltipScheduled:0,tooltipSold:0}),/# Forecast: 0\n# Scheduled: 0\n# Sold: 0/,'saved zeroes remain explicit inside the card');
assert.match(UI.cellTitle({...current,tooltipForecastMissing:1}),/# Forecast: 11 \(Partial\)/,'partially known forecast totals are identified');

function trigger(dataset){return {dataset,attributes:new Map(),hasAttribute(name){return name==='data-fc-month-info'?'fcMonthInfo'in dataset:name==='data-fc-builder-note'?'fcBuilderNote'in dataset:name==='data-fc-info'?'fcInfo'in dataset:false;},
  setAttribute(name,value){this.attributes.set(name,String(value));},getBoundingClientRect(){return {left:20,bottom:50};},
  closest(){return this;},focus(){listeners.get('forecastsDashboard:focusin')({target:this});}};}
const month=trigger({fcMonthInfo:JSON.stringify({month:'November 2026',forecast:11,scheduled:4,sold:2,missing:0})});
UI.openCard(month,true);
assert.equal(node('fcInfoTitle').textContent,'November 2026');
assert.match(node('fcInfoBody').innerHTML,/<dt># Forecast<\/dt><dd>11<\/dd><dt># Scheduled<\/dt><dd>4<\/dd><dt># Sold<\/dt><dd>2<\/dd>/);
listeners.get('fcInfoClose:click')();assert.equal(node('fcInfoCard').hidden,true,'Close stays closed after restoring focus to its opener');assert.equal(month.attributes.get('aria-expanded'),'false');
UI.openCard(month,true);listeners.get('document:keydown')({key:'Escape'});assert.equal(node('fcInfoCard').hidden,true,'Escape stays closed after restoring focus');

const phase={id:'900000000000000001',name:'Phase <One>',territory:'Austin',project:'Project',projectStatus:'Active',finalAcceptanceDueDate:'2026-12-18'};
const placeholder={id:'900000000000000002',name:'Placeholder2',note:'First Year\n<script>unsafe</script>\nSecond Year'};
UI.S.model={phases:[phase]};UI.S.report.rows=[{phase,builders:[placeholder]}];
assert.match(UI.builderLabel(phase,placeholder),/data-fc-builder-note="900000000000000002"/);
assert.match(UI.builderLabel(phase,placeholder),/Phase &lt;One&gt;/,'source-owned phase names are escaped in button attributes');
assert.doesNotMatch(UI.builderLabel(phase,{...placeholder,name:'Placeholder5'}),/data-fc-builder-note/,'only supported exact placeholder names get note controls');
const builder=trigger({fcBuilderNote:placeholder.id,fcNotePhase:phase.id});UI.openCard(builder,true);
assert.match(node('fcInfoBody').innerHTML,/First Year\n&lt;script&gt;unsafe&lt;\/script&gt;\nSecond Year/,'joined notes remain multiline plain text');
assert.doesNotMatch(node('fcInfoBody').innerHTML,/<script>/);
const subdivision=trigger({fcInfo:phase.id});UI.openCard(subdivision,true);
assert.match(node('fcInfoBody').innerHTML,/<dt>Final Acceptance Due Date<\/dt><dd>12\/18\/2026<\/dd>/,'subdivision date formats without a timezone conversion');
phase.finalAcceptanceDueDate=null;UI.openCard(subdivision,true);assert.match(node('fcInfoBody').innerHTML,/<dt>Final Acceptance Due Date<\/dt><dd>—<\/dd>/);
UI.closeCard();
console.log('PASS Forecasts current-month saved counts, unknown/zero/partial states, exact placeholder identities, multiline note escaping, acceptance dates and keyboard dismissal.');
