import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createPFTestDOM} from './fixtures/proforma-sdk-v2-dom.mjs';
import {salesFixture} from './fixtures/lot-sales-data.mjs';
const app='widgets/lot-sales-explorer/src/app/',html=fs.readFileSync(app+'widget.html','utf8'),source=fs.readFileSync(app+'sales-app.js','utf8');
const fixture=salesFixture(),year=new Date().getFullYear(),from=(year-1)+'-01',to=year+'-12';
const drain=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));};
function held(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject};}
function harness({denied=false,holdRecent=false}={}){
 const dom=createPFTestDOM(html),{document,nodes,node}=dom,history=held(),recent=held(),access={granted:!denied},marks=[],calls=[];
 nodes.forEach(el=>{Object.defineProperty(el,'selectedOptions',{get:()=>el.options.filter(o=>o.selected)});el.open=false;el.close=()=>{el.open=false};el.showModal=()=>{el.open=true};el.scrollTop=0;el.scrollLeft=0;});
 const c=vm.createContext({document,Date,Map,Set,Intl,URL,URLSearchParams,Blob,console,Option:class{constructor(text,value){const el=document.createElement('option');el.value=value;el.textContent=text;return el}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},location:{hostname:'fixture.test',search:''},setTimeout,clearTimeout,queueMicrotask,matchMedia:()=>({matches:false}),innerWidth:1200,innerHeight:900});c.window=c;c.parent={};c.addEventListener=()=>{};c.dispatchEvent=()=>{};
 vm.runInContext(fs.readFileSync(app+'sales-model.js','utf8'),c);const M=c.LotSalesModel;
 c.LMRuntime={current:()=>({environment:'DEVELOPMENT',user:'fixture'})};c.LMPerf={mark:(name,detail)=>marks.push({name,detail})};c.LMCriticalErrors={breadcrumb(){}};
 c.ZOHO={CREATOR:{DATA:{}}};c.initializeSalesCreator=async()=>{};c.configureSalesReporter=()=>{};
 c.InsightsShell={setAccess(){},connected:()=>true,markConnected(){},readRoute:async()=>({}),route:()=>({}),current:()=> 'sales'};c.InsightsAccess={load:async()=>({lotSalesDashboard:access.granted,viewTotalLotRevenue:true})};
 c.InsightsControls={syncAll(){},placePicker(){},values:el=>el.options.filter(o=>o.selected&&o.value).map(o=>o.value),setValues:(el,values)=>el.options.forEach(o=>o.selected=values.includes(o.value))};
 for(const id of ['project','projectStatus','territory','builder'])c.InsightsControls.setValues(node(id),[]);
 c.InsightsControls.setValues(node('status'),['Sold']);
 const recentData=()=>({...fixture,lots:fixture.lots.filter(l=>[M.date(l.Close_Date),M.date(l.Purchase_Date)].some(d=>d&&d.slice(0,7)>=from&&d.slice(0,7)<=to)),window:{from,to}});
 c.LotSalesCreator={reports:{lots:'All_Lots_All_Fields'},loadRecent:async()=>{calls.push('recent');return holdRecent?recent.promise:recentData();},loadHistory:async()=>{calls.push('history');return history.promise}};
 // Expose lexical state only; all executed application functions remain unchanged.
 vm.runInContext(source.replace('  start();','  window.__test={state,render,load,history,selectedFilters,authorizeAndLoad}; start();'),c);
 return{c,node,history,recent,recentData,access,marks,calls,widget:c.__test,M};
}
{
 const h=harness({holdRecent:true});await drain();const {state}=h.widget;
 assert.equal(state.loaded,false);assert.equal(h.calls.join(','),'recent');assert.equal(h.node('salesLoading').hidden,false,'initial reference/recent read uses the centered loader');assert.equal(h.node('matrix').getAttribute('aria-busy'),'true');assert.equal(h.node('empty').hidden,true);assert.equal(h.node('historyBanner').hidden,true);assert.equal(h.node('export').disabled,true);
 h.recent.resolve(h.recentData());await drain();
 assert.equal(state.loaded,true);assert.equal(state.historyReady,false);assert.equal(state.report,null,'no report is published before complete history');assert.equal(state.busy,true);assert.equal(h.node('refresh').disabled,true);
 assert.equal(h.node('salesLoading').hidden,false,'loader remains active through the complete-history read');assert.equal(h.node('matrix').getAttribute('aria-busy'),'true');assert.equal(h.node('empty').hidden,true);assert.equal(h.node('historyBanner').hidden,true);assert.equal(h.node('export').disabled,true);assert.equal(h.node('exportDetail').disabled,true);assert.equal(h.node('matrixBody').innerHTML,'');assert.equal(h.marks.some(x=>x.name==='insights:first-usable'),false);
 const expected=JSON.stringify(h.M.reportSelection(h.M.normalize(fixture),h.widget.selectedFilters()).reports.map(r=>r.stats));const scroll=h.c.document.querySelector('.matrix-scroll');scroll.scrollLeft=340;scroll.scrollTop=70;
 h.history.resolve(fixture.lots);await drain();assert.equal(state.historyReady,true);assert.equal(state.busy,false);assert.equal(h.node('salesLoading').hidden,true);assert.equal(h.node('matrix').getAttribute('aria-busy'),'false');assert.equal(state.lots.length,fixture.lots.length);assert.equal(new Set(state.lots.map(l=>l.id)).size,fixture.lots.length);assert.equal(JSON.stringify(state.report.reports.map(r=>r.stats)),expected);assert.equal(scroll.scrollLeft,340);assert.equal(scroll.scrollTop,70);assert.equal(h.node('export').disabled,false);assert.equal(h.marks.find(x=>x.name==='insights:first-usable').detail.historyReady,true);
}
{
 const h=harness();await drain();for(const period of ['all','twoYears','custom']){h.node('period').value=period;h.widget.render();assert.equal(h.widget.state.report,null);assert.equal(h.node('export').disabled,true);assert.equal(h.node('matrixBody').innerHTML,'');}
 h.history.reject(Error('Incomplete cursor history'));await drain();assert.equal(h.widget.state.report,null,'history failure never falls back to early results');assert.equal(h.widget.state.historyReady,false);assert.equal(h.node('salesLoading').hidden,true);assert.equal(h.node('matrix').getAttribute('aria-busy'),'false');assert.equal(h.node('historyBanner').hidden,false,'real history failures retain the error/retry banner');assert.equal(h.node('retryHistory').hidden,false);assert.equal(h.node('export').disabled,true);assert.equal(h.node('matrixBody').innerHTML,'');assert.equal(h.node('connection').textContent,'Load failed');
 const retry=held();h.node('period').value='twoYears';h.c.LotSalesCreator.loadHistory=async()=>retry.promise;const run=h.widget.history(h.widget.state.generation);await drain();assert.equal(h.node('salesLoading').hidden,false,'direct history retry reopens the loader');assert.equal(h.node('matrix').getAttribute('aria-busy'),'true');assert.equal(h.node('historyBanner').hidden,true);assert.equal(h.node('empty').hidden,true);assert.equal(h.node('export').disabled,true);retry.resolve(fixture.lots);await run;assert.equal(h.widget.state.historyReady,true);assert.ok(h.widget.state.report);assert.equal(h.node('salesLoading').hidden,true);assert.equal(h.node('matrix').getAttribute('aria-busy'),'false');assert.equal(h.node('export').disabled,false);
}
{
 const h=harness();await drain();assert.equal(h.node('salesLoading').hidden,false);h.access.granted=false;await h.widget.authorizeAndLoad();assert.equal(h.node('salesLoading').hidden,true,'permission reset clears the loader immediately');assert.equal(h.node('matrix').getAttribute('aria-busy'),'false');h.history.resolve(fixture.lots);await drain();assert.equal(h.widget.state.lots.length,0);assert.equal(h.widget.state.historyReady,false);assert.equal(h.widget.state.report,null,'a stale load cannot publish after access reset');assert.equal(h.node('salesLoading').hidden,true);
}
{
 const h=harness();await drain();assert.equal(h.widget.state.busy,true);const nextHistory=held();h.c.LotSalesCreator.loadHistory=async()=>{h.calls.push('new-history');return nextHistory.promise;};const reauthorization=h.widget.authorizeAndLoad();await drain();
 assert.equal(h.calls.filter(call=>call==='recent').length,2,'same-grant reauthorization starts a fresh recent/reference read');assert.equal(h.calls.filter(call=>call==='new-history').length,1,'new generation owns its required history read');assert.equal(h.widget.state.historyReady,false);assert.equal(h.node('salesLoading').hidden,false);assert.equal(h.node('matrix').getAttribute('aria-busy'),'true');
 h.history.resolve(fixture.lots);await drain();assert.equal(h.widget.state.historyReady,false,'old history cannot complete the newer report');assert.equal(h.widget.state.report,null);assert.equal(h.widget.state.busy,true);assert.equal(h.node('salesLoading').hidden,false,'old load finally cannot clear the newer loader');assert.equal(h.node('matrix').getAttribute('aria-busy'),'true');assert.equal(h.node('export').disabled,true);
 nextHistory.resolve(fixture.lots);await reauthorization;await drain();assert.equal(h.widget.state.historyReady,true);assert.ok(h.widget.state.report);assert.equal(h.widget.state.busy,false);assert.equal(h.node('salesLoading').hidden,true);assert.equal(h.node('matrix').getAttribute('aria-busy'),'false');assert.equal(h.node('export').disabled,false);
}
{
 const h=harness({denied:true});await drain();assert.equal(h.calls.length,0);assert.equal(h.widget.state.report,null);assert.equal(h.node('salesLoading').hidden,true);assert.equal(h.node('matrix').getAttribute('aria-busy'),'false');
}
{
 const h=harness({holdRecent:true});await drain();h.recent.reject(Error('Recent report denied'));await drain();assert.equal(h.node('salesLoading').hidden,true);assert.equal(h.node('matrix').getAttribute('aria-busy'),'false');assert.equal(h.node('empty').hidden,false);assert.match(h.node('empty').innerHTML,/Unable to load the report/);assert.equal(h.node('export').disabled,true);assert.equal(h.widget.state.report,null);
}
{
 const h=harness();await drain();h.history.resolve(fixture.lots);await drain();
 assert.equal(h.node('metric').value,'count');
 const groups=new Set(h.widget.state.report.rows.map(row=>JSON.stringify([row.status,row.groupId])));
 assert.ok(groups.size);assert.equal(h.node('collapse').disabled,false);assert.equal(h.node('collapse').textContent,'Collapse All');
 await h.node('collapse').fire('click');assert.equal(h.widget.state.collapsed.size,groups.size);assert.equal(h.node('collapse').textContent,'Expand All');
 await h.node('collapse').fire('click');assert.equal(h.widget.state.collapsed.size,0);assert.equal(h.node('collapse').textContent,'Collapse All');
 h.widget.state.collapsed.add([...groups][0]);h.widget.render();
 assert.equal(h.node('collapse').textContent,groups.size===1?'Expand All':'Collapse All');
 h.node('metric').value='avgPriceFF';await h.node('reset').fire('click');assert.equal(h.node('metric').value,'count');assert.equal(h.widget.state.collapsed.size,0);
}
console.log('PASS Insights centered loading lifecycle, atomic first paint, complete history, failures/retry, denied/stale access reset, Lot Count defaults/reset and visible-group Expand All / Collapse All.');
