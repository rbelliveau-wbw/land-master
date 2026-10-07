import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createPFTestDOM} from './fixtures/proforma-sdk-v2-dom.mjs';
import {salesFixture} from './fixtures/lot-sales-data.mjs';
const app='widgets/lot-sales-explorer/src/app/',html=fs.readFileSync(app+'widget.html','utf8'),source=fs.readFileSync(app+'sales-app.js','utf8');
const fixture=salesFixture(),year=new Date().getFullYear(),from=(year-1)+'-01',to=year+'-12';
const drain=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));};
function held(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject};}
function harness({denied=false}={}){
 const dom=createPFTestDOM(html),{document,nodes,node}=dom,history=held(),marks=[],calls=[];
 nodes.forEach(el=>{Object.defineProperty(el,'selectedOptions',{get:()=>el.options.filter(o=>o.selected)});el.open=false;el.close=()=>{el.open=false};el.showModal=()=>{el.open=true};el.scrollTop=0;el.scrollLeft=0;});
 const c=vm.createContext({document,Date,Map,Set,Intl,URL,URLSearchParams,Blob,console,Option:class{constructor(text,value){const el=document.createElement('option');el.value=value;el.textContent=text;return el}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},location:{hostname:'fixture.test',search:''},setTimeout,clearTimeout,queueMicrotask,matchMedia:()=>({matches:false}),innerWidth:1200,innerHeight:900});c.window=c;c.parent={};c.addEventListener=()=>{};c.dispatchEvent=()=>{};
 vm.runInContext(fs.readFileSync(app+'sales-model.js','utf8'),c);const M=c.LotSalesModel;
 c.LMRuntime={current:()=>({environment:'DEVELOPMENT',user:'fixture'})};c.LMPerf={mark:(name,detail)=>marks.push({name,detail})};c.LMCriticalErrors={breadcrumb(){}};
 c.ZOHO={CREATOR:{DATA:{}}};c.initializeSalesCreator=async()=>{};c.configureSalesReporter=()=>{};
 c.InsightsShell={setAccess(){},connected:()=>true,markConnected(){}};c.InsightsAccess={load:async()=>({lotSalesDashboard:!denied,viewTotalLotRevenue:true})};
 c.InsightsControls={syncAll(){},placePicker(){},values:el=>el.options.filter(o=>o.selected&&o.value).map(o=>o.value),setValues:(el,values)=>el.options.forEach(o=>o.selected=values.includes(o.value))};
 for(const id of ['project','projectStatus','territory','builder'])c.InsightsControls.setValues(node(id),[]);
 c.InsightsControls.setValues(node('status'),['Sold']);
 c.LotSalesCreator={reports:{lots:'All_Lots_All_Fields'},loadRecent:async()=>{calls.push('recent');const lots=fixture.lots.filter(l=>[M.date(l.Close_Date),M.date(l.Purchase_Date)].some(d=>d&&d.slice(0,7)>=from&&d.slice(0,7)<=to));return{...fixture,lots,window:{from,to}};},loadHistory:async()=>{calls.push('history');return history.promise}};
 // Expose lexical state only; all executed application functions remain unchanged.
 vm.runInContext(source.replace('  start();','  window.__test={state,render,load,history,selectedFilters}; start();'),c);
 return{c,node,history,marks,calls,widget:c.__test,M};
}
{
 const h=harness();await drain();const {state}=h.widget;
 assert.equal(state.loaded,true);assert.equal(state.historyReady,false);assert.equal(state.report,null,'no report is published before complete history');assert.equal(state.busy,true);assert.equal(h.node('refresh').disabled,true);
 assert.equal(h.node('empty').hidden,false);assert.equal(h.node('export').disabled,true);assert.equal(h.node('exportDetail').disabled,true);assert.equal(h.node('matrixBody').innerHTML,'');assert.equal(h.marks.some(x=>x.name==='insights:first-usable'),false);
 const expected=JSON.stringify(h.M.reportSelection(h.M.normalize(fixture),h.widget.selectedFilters()).reports.map(r=>r.stats));const scroll=h.c.document.querySelector('.matrix-scroll');scroll.scrollLeft=340;scroll.scrollTop=70;
 h.history.resolve(fixture.lots);await drain();assert.equal(state.historyReady,true);assert.equal(state.busy,false);assert.equal(state.lots.length,fixture.lots.length);assert.equal(new Set(state.lots.map(l=>l.id)).size,fixture.lots.length);assert.equal(JSON.stringify(state.report.reports.map(r=>r.stats)),expected);assert.equal(scroll.scrollLeft,340);assert.equal(scroll.scrollTop,70);assert.equal(h.node('export').disabled,false);assert.equal(h.marks.find(x=>x.name==='insights:first-usable').detail.historyReady,true);
}
{
 const h=harness();await drain();for(const period of ['all','twoYears','custom']){h.node('period').value=period;h.widget.render();assert.equal(h.widget.state.report,null);assert.equal(h.node('export').disabled,true);assert.equal(h.node('matrixBody').innerHTML,'');}
 h.history.reject(Error('Incomplete cursor history'));await drain();assert.equal(h.widget.state.report,null,'history failure never falls back to early results');assert.equal(h.widget.state.historyReady,false);assert.equal(h.node('retryHistory').hidden,false);assert.equal(h.node('export').disabled,true);assert.equal(h.node('matrixBody').innerHTML,'');assert.equal(h.node('connection').textContent,'Load failed');
 h.node('period').value='twoYears';h.c.LotSalesCreator.loadHistory=async()=>fixture.lots;await h.widget.history(h.widget.state.generation);assert.equal(h.widget.state.historyReady,true);assert.ok(h.widget.state.report);assert.equal(h.node('export').disabled,false);
}
{
 const h=harness();await drain();const recent=h.widget.state.lots;h.widget.state.generation++;h.history.resolve(fixture.lots);await drain();assert.equal(h.widget.state.lots,recent);assert.equal(h.widget.state.historyReady,false);assert.equal(h.widget.state.report,null,'a stale load cannot publish a partial report');
}
{
 const h=harness({denied:true});await drain();assert.equal(h.calls.length,0);assert.equal(h.widget.state.report,null);
}
console.log('PASS actual Insights atomic first paint: all periods and Hide Empty wait for complete counted history, failure remains empty, retry publishes full data, metrics/exports/scroll preserved, stale and denied loads cannot publish.');
