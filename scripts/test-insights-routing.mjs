import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createPFTestDOM} from './fixtures/proforma-sdk-v2-dom.mjs';
const app='widgets/lot-sales-explorer/src/app/',html=fs.readFileSync(app+'widget.html','utf8');
function harness(search='',native={}){
 const dom=createPFTestDOM(html),events=[],listeners=new Map(),location={search,href:'https://fixture.test/prod/insights/?'+search.replace(/^\?/,'')};
 const c=vm.createContext({document:dom.document,location,URL,URLSearchParams,setTimeout,clearTimeout,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},history:{replaceState(_state,_title,url){location.href=String(url);location.search=url.search;}}});
 c.window=c;c.dispatchEvent=e=>{events.push(e);};c.addEventListener=(name,fn)=>listeners.set(name,fn);c.ZOHO={CREATOR:{UTIL:{getQueryParams:async()=>native}}};
 vm.runInContext(fs.readFileSync(app+'insights-shell.js','utf8'),c);return {...dom,c,events,listeners};
}
const both={lotSalesDashboard:true,forecastsDashboard:true};
{
 const h=harness('?dashboard=forecasts&projectId=900000000000000001');await h.c.InsightsShell.readRoute();h.c.InsightsShell.setAccess(both);
 assert.equal(h.c.InsightsShell.current(),'forecasts');assert.equal(h.node('salesDashboard').hidden,true);assert.equal(h.node('forecastsDashboard').hidden,false);assert.equal(h.node('budgetsDashboard').hidden,true);
 assert.equal(h.c.InsightsShell.route().projectId,'900000000000000001');assert.equal(h.c.InsightsShell.show('sales'),true);assert.equal(h.c.InsightsShell.current(),'sales');assert.match(h.c.location.search,/dashboard=sales/);assert.match(h.c.location.search,/projectId=/);
 h.c.InsightsShell.setAccess({lotSalesDashboard:false,forecastsDashboard:true});assert.equal(h.c.InsightsShell.current(),null,'An explicitly denied route does not silently load another dashboard');
 assert.match(h.node('dashboardAccessText').textContent,/Lot Sales dashboard access/);assert.equal(h.c.InsightsShell.show('forecasts'),true);
 h.c.InsightsShell.setAccess(null);assert.equal(h.c.InsightsShell.current(),null);assert.equal(h.node('forecastsDashboard').hidden,true);
}
for(const [flags,expected]of [[{lotSalesDashboard:true},'sales'],[{forecastsDashboard:true},'forecasts'],[{},null]]){const h=harness();h.c.InsightsShell.setAccess(flags);assert.equal(h.c.InsightsShell.current(),expected);}
{
 const h=harness('?dashboard=sales',{dashboard:'forecasts',projectId:'native-project'});await h.c.InsightsShell.readRoute();h.c.InsightsShell.setAccess(both);assert.equal(h.c.InsightsShell.current(),'forecasts','Native Creator page variables take precedence over iframe defaults');assert.equal(h.c.InsightsShell.route().projectId,'native-project');
}
for(const key of ['budgets','__proto__','invalid']){const h=harness('?dashboard='+key);h.c.InsightsShell.setAccess(both);assert.equal(h.c.InsightsShell.current(),null);assert.equal(h.c.InsightsShell.show(key),false);assert.match(h.node('dashboardAccessText').textContent,/Unknown dashboard/);}
{
 const h=harness(),workspace=h.document.querySelector('.workspace'),toggle=h.node('navigationToggle');
 h.c.InsightsShell.setAccess(both);h.node('search').value='Arroyo';h.node('matrixBody').innerHTML='<tr id="retainedSalesRow"><td>Current report</td></tr>';
 const row=h.node('retainedSalesRow'),events=h.events.length;h.node('matrixBody').scrollLeft=240;toggle.focus();
 assert.equal(toggle.getAttribute('aria-expanded'),'true','Each fresh shell starts expanded');
 const motion=[],timeline=[];let activeAnimation=null;
 h.c.getComputedStyle=node=>{
  if(node!==workspace)return {opacity:workspace.classList.contains('navigation-collapsed')?'0':'1',transform:'none'};
  const gridTemplateColumns=activeAnimation?.rendered||(workspace.classList.contains('navigation-collapsed')?'72px 928px':'218px 782px');
  timeline.push({type:'read',value:gridTemplateColumns,animating:!!activeAnimation});return {gridTemplateColumns};
 };
 h.c.LMMotion={animate:(node,frames,duration)=>{
  const animation={rendered:frames[0].gridTemplateColumns,cancel(){if(node===workspace)timeline.push({type:'cancel'});if(activeAnimation===animation)activeAnimation=null;}};
  motion.push({node,frames,duration,animation});if(node===workspace)activeAnimation=animation;return animation;
 }};
 await toggle.fire('click');
 assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.equal(toggle.getAttribute('aria-label'),'Expand Menu');
 assert.equal(h.node('search').value,'Arroyo');assert.equal(h.node('matrixBody').scrollLeft,240);assert.equal(h.node('retainedSalesRow'),row);
 assert.equal(h.events.length,events,'Collapse never reloads or navigates a dashboard');assert.equal(h.document.activeElement,toggle);
 const gridMotions=()=>motion.filter(entry=>entry.node===workspace);
 assert.equal(gridMotions().length,1,'Grid resizing reuses the shared motion engine alongside child transitions');
 assert.equal(gridMotions()[0].frames[0].gridTemplateColumns,'218px 782px');assert.equal(gridMotions()[0].frames[1].gridTemplateColumns,'72px 928px');assert.equal(gridMotions()[0].duration,230);
 for(const [rendered,expanded,target]of [['151px 849px',true,'218px 782px'],['186px 814px',false,'72px 928px']]){
  activeAnimation.rendered=rendered;timeline.length=0;
  await toggle.fire('click');const latest=gridMotions().at(-1);
  assert.equal(toggle.getAttribute('aria-expanded'),String(expanded));
  assert.equal(latest.frames[0].gridTemplateColumns,rendered,'Rapid reversal starts at the visible intermediate grid');
  assert.equal(latest.frames[1].gridTemplateColumns,target,'Rapid reversal reaches the real new endpoint, not the old animated value');
  assert.deepEqual(timeline.map(entry=>entry.type),['read','cancel','read'],'Capture the visible grid before cancelling; measure the target after cancellation');
  assert.equal(timeline[0].animating,true);assert.equal(timeline[2].animating,false);
  assert.equal(h.node('retainedSalesRow'),row);assert.equal(h.node('search').value,'Arroyo');assert.equal(h.node('matrixBody').scrollLeft,240);assert.equal(h.document.activeElement,toggle);assert.equal(h.events.length,events);
 }
 const navigation=h.node('insightsNavigation');let prevented=false;
 await navigation.fire('keydown',{key:'ArrowDown',target:h.node('salesTab'),preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.equal(h.c.InsightsShell.current(),'forecasts');assert.equal(h.document.activeElement,h.node('forecastsTab'));
 h.c.InsightsShell.setAccess({lotSalesDashboard:true});
 await navigation.fire('keydown',{key:'ArrowDown',target:h.node('salesTab'),preventDefault(){}});
 assert.equal(h.c.InsightsShell.current(),'sales','Keyboard navigation cannot enter a denied dashboard');
}
console.log('PASS dashboard routes and permissions; default-open navigation, shared collapse motion, retained report/filter/scroll/focus, and permitted keyboard tabs.');
