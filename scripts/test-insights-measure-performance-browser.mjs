// Representative 26,000-lot / four-year desktop fixture. No Creator writes or published fixture assets.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve('widgets/lot-sales-explorer/src/app'), output=path.resolve('tmp/insights-number-transitions-preview');
fs.mkdirSync(output,{recursive:true});
const year=new Date().getFullYear();
const data={projects:[{ID:'p1',Project_Name:'Cedar Hollow'},{ID:'p2',Project_Name:'Copper Ridge'}],subdivisions:[{ID:'s1',Subdivision_Name:'Cedar Hollow — Phase 01',Project:{ID:'p1'},Territory:'North'},{ID:'s2',Subdivision_Name:'Copper Ridge — Phase 02',Project:{ID:'p2'},Territory:'South'}],builders:[{ID:'b1',Builder_Name:'Atlas Homes',Type1:'Builder'},{ID:'b2',Builder_Name:'Pioneer Homes',Type1:'Builder'}],lots:[]};
for(let i=1;i<=12;i++)data.lots.push({ID:String(90071992547409930n+BigInt(i)),Subdivision:{ID:i<=9?'s1':'s2'},Builder1:{ID:i%3?'b1':'b2'},Status:'Sold',Close_Date:`${year}-03-08`,Purchase_Date:`${year}-02-01`,Lot_Code:`LOT-00${i}`,Lot_Size:String(40+i),Base_Price:String(40000+i*1000),Interest1:'500',Escalator:'3.5'});
data.lots[0].Close_Date=`${year-1}-03-08`;data.lots[0].Purchase_Date=`${year-1}-02-01`;
data.builders.push({ID:'b3',Builder_Name:'Third Homes',Type1:'Builder'});
data.lots.push({...data.lots[1],ID:'90071992547410222',Status:'Scheduled',Close_Date:'',Purchase_Date:`${year}-04-01`});
data.subdivisions=[];data.lots=[];
for(let i=0;i<50;i++)data.subdivisions.push({ID:'s'+i,Subdivision_Name:'Phase '+i,Project:{ID:'p1'},Territory:'North'});
for(let i=0;i<26000;i++){const month=i%48;const y=year-3+Math.floor(month/12),m=String(month%12+1).padStart(2,'0');data.lots.push({ID:String(90071992547409930n+BigInt(i)),Subdivision:{ID:'s'+(Math.floor(i/48)%50)},Builder1:{ID:'b1'},Status:'Sold',Close_Date:`${y}-${m}-08`,Purchase_Date:`${y}-${m}-01`,Lot_Code:'LOT-'+i,Lot_Size:'50',Base_Price:String(40000+i%100*1000),Interest1:'500',Escalator:'3.5'});}
const server=http.createServer((req,res)=>{
  const file=new URL(req.url,'http://localhost').pathname.slice(1)||'widget.html';
  const stubs={
    'runtime-context.js':`window.ZOHO={CREATOR:{DATA:{},UTIL:{getInitParams:async()=>({})}}};window.LMRuntime={apply:()=>({environment:'DEVELOPMENT',user:'fixture'}),current:()=>({environment:'DEVELOPMENT',user:'fixture'}),apiName:n=>n};`,
    'critical-error-reporter.js':`window.LMCriticalErrors={configure(){},markReady(){},breadcrumb(){}};`,
    'creator-adapter.js':`window.LotSalesCreator={reports:{},loadRecent:async()=>({...structuredClone(window.__data),window:{from:'${year-1}-01',to:'${year}-12'}}),loadHistory:async(api,progress)=>{if(new URL(location.href).searchParams.has('loading')){window.__progress=progress;return new Promise(()=>{});}return structuredClone(window.__data.lots);}};`,
    'insights-access.js':`window.InsightsAccess={load:async()=>({lotSalesDashboard:window.__granted,viewTotalLotRevenue:window.__revenue})};`
  };
  const filename=path.resolve(root,file);
  if(!filename.startsWith(root+path.sep)||(!stubs[file]&&!fs.existsSync(filename))){res.writeHead(404).end();return;}
  let body=stubs[file]??fs.readFileSync(filename,'utf8');
  if(file==='sales-app.js')body=body.replace('  start();','  window.__sales={state,render,detailRows,openSubdivisionCard,authorizeAndLoad}; start();');
  if(file==='budget-app.js')body=body.replace('  window.addEventListener(\'insights:ready\'',"  window.__budget={state,render,openDetail,shell}; window.addEventListener('insights:ready'");
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1540,height:980}}),errors=[];
page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
await page.route(/.*/,route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.fulfill({body:'',contentType:'text/javascript'}));
await page.addInitScript(data=>{window.__data=data;window.__granted=true;window.__revenue=true;},data);
const url='http://127.0.0.1:'+server.address().port;
const settled=()=>page.waitForFunction(()=>!document.querySelector('.is-changing'));
const change=async(id,value)=>page.evaluate(({id,value})=>{const el=document.getElementById(id);el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));},{id,value});
const keysUnique=async(selector)=>assert.equal(await page.locator(selector+' [data-number-key]').evaluateAll(nodes=>new Set(nodes.map(n=>n.dataset.numberKey)).size===nodes.length),true,'keys identify a field once');
try{
  await page.goto(url);await page.waitForFunction(()=>window.__sales?.state.historyReady);
  await change('period','all');await settled();
  await page.evaluate(()=>{window.__report=__sales.state.report;window.__row=document.querySelector('#matrixBody tr:not(.territory)');window.__number=__row.querySelector('[data-number-key]');});
  const results=[];
  for(const metric of ['avgPrice','count','totalPriceWithInterest','avgPriceFF']){
    results.push(await page.evaluate(metric=>{const t=performance.now();const el=document.getElementById('metric');el.value=metric;el.dispatchEvent(new Event('change',{bubbles:true}));return {metric,ms:performance.now()-t,cells:document.querySelectorAll('#matrix [data-number-key]').length};},metric));assert.equal(await page.evaluate(()=>__sales.state.report===__report),true,'measure changes reuse all authoritative aggregates');assert.equal(await page.evaluate(()=>document.querySelector('#matrixBody tr:not(.territory)')===__row),true,'measure changes preserve mounted rows');assert.equal(await page.evaluate(()=>__row.querySelector('[data-number-key]')===__number),true,'measure changes preserve numeric nodes');await page.waitForTimeout(700);
  }
  assert.deepEqual(errors,[]);console.log('PASS: Insights 26,000 lots / 50 subdivisions / 48 months; no reaggregation or row/number replacement. Handler timings: '+JSON.stringify(results));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}

