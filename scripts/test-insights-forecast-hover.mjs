import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
for(const file of ['sales-model.js','forecast-model.js','forecast-insights-model.js'])await import('../widgets/lot-sales-explorer/src/app/'+file);
const M=globalThis.ForecastInsightsModel;

// Exercise the production renderer/card handlers without a browser or live data.
const listeners=new Map(),nodes=new Map();
function node(id){
  if(!nodes.has(id))nodes.set(id,{id,hidden:true,innerHTML:'',textContent:'',style:{},offsetWidth:280,offsetHeight:200,attributes:new Map(),firstElementChild:{hidden:false},
    classList:{names:new Set(),toggle(name,active){active?this.names.add(name):this.names.delete(name);},contains(name){return this.names.has(name);}},
    addEventListener(type,handler){listeners.set(id+':'+type,handler);},
    setAttribute(name,value){this.attributes.set(name,String(value));},
    removeAttribute(name){this.attributes.delete(name);},getAttribute(name){return this.attributes.get(name)??null;},
    get title(){return this.getAttribute('title')||'';},set title(value){this.setAttribute('title',value);},
    contains(target){return target===this;}});
  return nodes.get(id);
}
let UI;
const context=vm.createContext({ForecastInsightsModel:M,LotSalesModel:{},document:{getElementById:node,addEventListener(type,handler){listeners.set('document:'+type,handler);}},
  innerWidth:1000,innerHeight:700,setTimeout,clearTimeout,Intl,
  __expose(value){UI=value;}});
context.window=context;context.addEventListener=()=>{};
const source=fs.readFileSync('widgets/lot-sales-explorer/src/app/forecast-insights-app.js','utf8');
vm.runInContext(source.replace('  window.ForecastInsightsApp=Object.freeze','  __expose({S,cellValue,cellTitle,builderLabel,phaseHTML,totalsMarkup,updateCellDetails,syncHideEmpty,openCard,closeCard});\n  window.ForecastInsightsApp=Object.freeze'),context);
UI.S.permissions={today:'2026-11-04',forecastsDashboard:true};UI.S.report={mode:'outlook',rows:[]};
const current={start:'2026-11-01',name:'November',year:2026,index:9,key:'2026-11',value:11,known:1,knownValue:11,sold:0,forecast:11,missing:0,tooltipForecast:11,tooltipScheduled:4,tooltipSold:2,tooltipForecastKnown:1,tooltipRecords:1,tooltipForecastMissing:0};
const markup=UI.cellValue(current,'phase:month','fc-current-month');
assert.match(markup,/data-fc-month-info=/);assert.match(markup,/aria-haspopup="dialog"/);
assert.match(markup,/# Forecast: 11[\s\S]*# Scheduled: 4[\s\S]*# Sold: 2/,'current-month accessible comparison uses saved counts without changing its displayed outlook value');
assert.doesNotMatch(markup,/\stitle=/,'current-month card has no duplicate native browser tooltip');
assert.doesNotMatch(UI.cellValue({...current,start:'2026-10-01'},'phase:past'),/data-fc-month-info=/,'only the exact current calendar month gets the comparison card');
assert.match(UI.cellValue({...current,start:'2026-10-01'},'phase:past'),/\stitle=/,'other months retain their native-only comparisons');
assert.match(UI.cellTitle({...current,tooltipForecast:null,tooltipScheduled:null,tooltipSold:null}),/# Forecast: —\n# Scheduled: —\n# Sold: —/,'missing records never become zero counts');
assert.match(UI.cellTitle({...current,tooltipForecast:0,tooltipScheduled:0,tooltipSold:0}),/# Forecast: 0\n# Scheduled: 0\n# Sold: 0/,'saved zeroes remain explicit inside the card');
const partial={...current,missing:1,tooltipForecastMissing:1};
assert.match(UI.cellTitle(partial),/# Forecast: 11\n# Scheduled: 4\n# Sold: 2/,'partial-known counts keep their saved values');
assert.doesNotMatch(UI.cellValue(partial,'phase:partial'),/\(Partial\)/,'partial-known current-month accessible names omit the removed marker');
assert.equal(partial.tooltipForecastMissing,1,'display wording never changes source completeness');

function trigger(dataset){return {dataset,attributes:new Map(),hasAttribute(name){return name==='data-fc-month-info'?'fcMonthInfo'in dataset:name==='data-fc-builder-note'?'fcBuilderNote'in dataset:name==='data-fc-info'?'fcInfo'in dataset:false;},
  setAttribute(name,value){this.attributes.set(name,String(value));},getBoundingClientRect(){return {left:20,bottom:50};},
  closest(){return this;},focus(){listeners.get('forecastsDashboard:focusin')({target:this});}};}
const month=trigger({fcMonthInfo:JSON.stringify({month:'November 2026',forecast:11,scheduled:4,sold:2,missing:0})});
UI.openCard(month,true);
assert.equal(node('fcInfoTitle').textContent,'November 2026');
assert.match(node('fcInfoBody').innerHTML,/<dt># Forecast<\/dt><dd>11<\/dd><dt># Scheduled<\/dt><dd>4<\/dd><dt># Sold<\/dt><dd>2<\/dd>/);
const partialMonth=trigger({fcMonthInfo:JSON.stringify({month:'November 2026',forecast:11,scheduled:4,sold:2,missing:1})});UI.openCard(partialMonth,true);
assert.match(node('fcInfoBody').innerHTML,/<dt># Forecast<\/dt><dd>11<\/dd>/);assert.doesNotMatch(node('fcInfoBody').innerHTML,/\(Partial\)/,'the card removes the marker for incomplete contributors');
UI.openCard(month,true);
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

// Use native aggregates and the production Hide Empty/cache updater. The hidden
// row has a zero forecast but saved Scheduled lots, so metadata must refresh
// even though the displayed matrix value remains 11 on both sides of a toggle.
const months=[{year:2026,index:9,name:'November',start:'2026-11-01',key:'2026-11'}],visible={key:'visible',cells:[partial]},empty={key:'empty',cells:[{...current,value:0,knownValue:0,forecast:0,tooltipForecast:0,tooltipScheduled:3,tooltipSold:0}]};
const group={id:'fixture',rows:[visible,empty]},allCells=M.aggregate(group.rows,months),filteredCells=M.aggregate([visible],months);
UI.S.baseReport={mode:'outlook',rows:group.rows,groups:[group],years:[2026],months};UI.S.nonemptyReport={...UI.S.baseReport,rows:[visible],groups:[{...group,rows:[visible]}]};UI.S.report=UI.S.baseReport;
const groupAll=UI.totalsMarkup(allCells,'group:fixture',true),groupFiltered=UI.totalsMarkup(filteredCells,'group:fixture',true),footAll=UI.totalsMarkup(allCells,'all'),footFiltered=UI.totalsMarkup(filteredCells,'all');
assert.equal(groupAll[1].title,null);assert.equal(footAll[1].title,null,'cached current-month totals explicitly suppress native titles');
assert.match(groupAll[0].title,/Sold.*Forecast/,'selected-period totals retain their native-only comparison');
const groupCells=groupAll.map((value,index)=>{const cell=node('group-cell-'+index);cell.innerHTML=value.html;cell.title='Stale Native Tooltip';return cell;}),footCells=footAll.map((value,index)=>{const cell=node('foot-cell-'+index);cell.innerHTML=value.html;cell.title='Stale Native Tooltip';return cell;});
UI.S.groupNodes=[{group,header:node('fixture-group'),count:node('fixture-count'),rows:[node('visible-row'),node('empty-row')],nonemptyCount:1,emptyMask:[false,true],allCount:'2',filteredCount:'1',totalCells:groupCells,totals:groupCells.map(cell=>cell.firstElementChild),allTotals:groupAll,filteredTotals:groupFiltered,totalMarkup:groupAll}];
UI.S.allFoot=footAll;UI.S.filteredFoot=footFiltered;UI.S.footCells=footCells;UI.S.footMarkup=footAll;UI.S.allCount='2 Phases';UI.S.filteredCount='1 Phase';
for(const checked of [true,false,true]){
  node('fcHideEmpty').checked=checked;UI.syncHideEmpty(false);
  for(const cell of [groupCells[1],footCells[1]]){assert.equal(cell.getAttribute('title'),null,'Hide Empty never restores current-month native titles');assert.match(cell.innerHTML,new RegExp('&quot;scheduled&quot;:'+(checked?4:7)),'saved comparison metadata follows the visible aggregate');assert.equal(cell.classList.contains('fc-missing'),true,'missing styling still updates when title is suppressed');}
}
assert.equal(allCells[0].value,filteredCells[0].value,'the presentation change preserves the matrix value');
UI.S.report=UI.S.baseReport;
const single={key:'single',phase,builders:[placeholder],builderRows:[],cells:[current]},singleMarkup=UI.phaseHTML(single,false);
assert.match(singleMarkup,/<td class="fc-meta"><button[^>]*data-fc-builder-note=/,'single-placeholder cards do not inherit a metadata-cell title');
const real={id:'900000000000000003',name:'Real Builder'},multi={...single,key:'multi',builders:[placeholder,real],builderRows:[{key:'placeholder-child',builder:placeholder,cells:[current]},{key:'real-child',builder:real,cells:[current]}]};
const multiMarkup=UI.phaseHTML(multi,false);assert.doesNotMatch(multiMarkup,/<span title="Placeholder2">/,'expanded placeholder names do not inherit a wrapper tooltip');assert.match(multiMarkup,/<span title="Real Builder">/,'ordinary truncated builder names retain their native tooltip');
assert.match(UI.phaseHTML({...single,key:'real',builders:[real]},false),/<td class="fc-meta" title="Real Builder">/,'single ordinary builder names retain their native tooltip');
UI.closeCard();
console.log('PASS Forecasts saved counts, marker removal, cached Hide Empty title suppression, exact placeholder identities, multiline note escaping, acceptance dates and keyboard dismissal.');
