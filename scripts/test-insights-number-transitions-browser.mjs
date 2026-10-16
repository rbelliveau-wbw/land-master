// Synthetic desktop fixtures only. No Creator writes or published fixture assets.
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
  await page.goto(url+'/?loading=1');await page.waitForFunction(()=>typeof window.__progress==='function');
  await page.evaluate(()=>{__progress('Lots',26000,26161);__progress('Lots',26100,26161);__progress('Lots',26160,26161);});
  assert.equal(await page.locator('#historyMessage').textContent(),'Loading report · 26,160 / 26,161 lots','progress uses the latest exact count');
  const loadingStyle=await page.locator('#historyBanner').evaluate(banner=>({
    dots:[...banner.querySelectorAll('span')].filter(n=>getComputedStyle(n,'::before').animationName.includes('load-pulse')).length,
    numbers:[...banner.querySelectorAll('.number-push')].map(n=>({before:getComputedStyle(n,'::before').animationName,background:getComputedStyle(n,'::before').backgroundColor,width:n.getBoundingClientRect().width})),
    inner:[...banner.querySelectorAll('.number-push-value')].map(n=>getComputedStyle(n,'::before').content)
  }));
  assert.equal(loadingStyle.dots,1,'one loading dot belongs to the message, never its nested number spans');
  assert.ok(loadingStyle.numbers.every(n=>!n.before.includes('load-pulse')&&n.background==='rgba(0, 0, 0, 0)'&&n.width>20),'number transitions retain their own clear, unclipped overlay');
  assert.ok(loadingStyle.inner.every(content=>content==='none'||content==='normal'),'number text has no generated loading dots');
  assert.equal(await page.locator('#matrixBody').textContent(),'');assert.equal(await page.locator('#export').isDisabled(),true,'pending history cannot publish a partial report');
  await page.locator('#historyBanner').screenshot({path:path.join(output,'loading-counter-transition.png')});
  await settled();await page.locator('#historyBanner').screenshot({path:path.join(output,'loading-counter.png')});
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>__progress('Lots',26161,26161));
  assert.equal(await page.locator('#historyBanner .is-changing').count(),0);assert.equal(await page.locator('#historyMessage').textContent(),'Loading report · 26,161 / 26,161 lots');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(url);await page.waitForFunction(()=>window.__sales?.state.historyReady);
  assert.equal(await page.locator('.is-changing').count(),0,'first appearance stays still');
  assert.equal(await page.locator('.report-footer,.page-foot').count(),0,'bottom description/footer are removed');
  assert.equal(await page.locator('#updated,#definition,#quality').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();const host=n.closest('.sr-only')||n;const style=getComputedStyle(host);return style.position==='absolute'&&parseFloat(style.width)<=1&&parseFloat(style.height)<=1;})),true,'metadata is outside the visible table layout');
  const bottom=await page.evaluate(()=>{const card=document.querySelector('#salesDashboard .report-card').getBoundingClientRect(),scroll=document.querySelector('#salesDashboard .matrix-scroll').getBoundingClientRect(),main=document.querySelector('main'),r=main.getBoundingClientRect();return {card:card.bottom,scroll:scroll.bottom,main:r.bottom-parseFloat(getComputedStyle(main).paddingBottom)};});
  assert.ok(Math.abs(bottom.card-bottom.scroll)<=2,'matrix fills the report card to its bottom');
  assert.ok(Math.abs(bottom.card-bottom.main)<=2,'report fills the space formerly used by the page footer');

  await keysUnique('#salesDashboard');
  const baseline=await page.locator('#matrix').textContent();
  assert.equal(await page.locator('#matrixBody tr:not(.territory) td:nth-child(2) [data-number-key]').count(),0,'first-sale dates never animate');
  await page.evaluate(()=>{const engine=InsightsNumbers;window.InsightsNumbers=null;__sales.render();window.__baselineText=document.getElementById('matrix').textContent;window.InsightsNumbers=engine;__sales.render();});
  assert.equal(await page.evaluate(()=>__baselineText),baseline,'all visible text matches the existing formatter');
  await page.evaluate(()=>{InsightsControls.setValues(document.getElementById('builder'),['b1']);document.getElementById('builder').dispatchEvent(new Event('change'));});
  assert.ok(await page.locator('#matrix .is-changing').count()>0,'comparable filtered counts animate');
  assert.equal(await page.locator('#matrixFoot .cell-button[data-month=""]').textContent(),'8','final count is available immediately');
  const csvDownload=page.waitForEvent('download');await page.locator('#export').click();const download=await csvDownload;await download.saveAs(path.join(output,'filtered.csv'));
  const csv=fs.readFileSync(path.join(output,'filtered.csv'),'utf8');assert.match(csv,/Sold totals/);assert.doesNotMatch(csv,/number-push|data-from/);
  await settled();await page.evaluate(()=>__sales.render());assert.equal(await page.locator('.is-changing').count(),0,'equal render is still');
  for(const metric of ['avgPriceFF','avgTotalPriceFF','avgPrice','avgPriceWithInterest','totalPrice','totalPriceWithInterest','count']){
    const previous=await page.locator('#matrixBody tr:not(.territory) .cell-button[data-month=""]').first().textContent();
    await page.locator('#metricPicker').click();await page.locator('#metricPopup [data-value="'+metric+'"]').click();
    assert.ok(await page.locator('#matrix .cell-button .is-changing').count()>0,'every measure switch animates through the real picker');
    assert.equal(await page.locator('#matrixBody tr:not(.territory) .cell-button[data-month=""] .number-push').first().getAttribute('data-from'),previous,'outgoing value retains its old units');
    assert.equal(await page.locator('#metricPicker').evaluate(n=>n===document.activeElement),true,'picker focus remains on the chosen measure');
    await keysUnique('#salesDashboard');
    assert.equal(await page.evaluate(()=>{
      const snapshot=()=>[...document.querySelectorAll('#matrix td')].map(td=>[td.textContent,td.style.background,td.querySelector('button')?.getAttribute('aria-label')]);
      const fast=JSON.stringify(snapshot());__sales.render();return JSON.stringify(snapshot())===fast;
    }),true,'measure fast path matches the full renderer text, accessible names and heatmap');
    if(metric==='count')await page.screenshot({path:path.join(output,'measure-base-to-count.png')});
    await settled();
  }
  await page.evaluate(()=>{InsightsControls.setValues(document.getElementById('builder'),['b1','b2']);document.getElementById('builder').dispatchEvent(new Event('change'));});await settled();
  await page.evaluate(()=>{InsightsControls.setValues(document.getElementById('builder'),['b1','b2','b3']);document.getElementById('builder').dispatchEvent(new Event('change'));});
  assert.ok(await page.locator('#builderPicker .is-changing').count()>0,'picker selected-count badge animates');assert.ok(await page.locator('#filterSummary .is-changing').count()>0,'filter selected-count chip animates');await settled();
  await page.evaluate(()=>{InsightsControls.setValues(document.getElementById('builder'),['b1']);document.getElementById('builder').dispatchEvent(new Event('change'));});await settled();
  await change('period','currentYear');assert.ok(await page.locator('#matrix .is-changing').count()>0,'selected period totals animate');assert.ok(await page.locator('#monthPage .is-changing').count()>0,'month count animates');
  await settled();await change('period','twoYears');await settled();
  await page.evaluate(()=>{InsightsControls.setValues(document.getElementById('status'),['Scheduled']);document.getElementById('status').dispatchEvent(new Event('change'));});
  assert.ok(await page.locator('#matrix .is-changing').count()>0,'lot-status changes animate matching report slots');await settled();
  await change('metric','avgPrice');await settled();const sameDollars=await page.locator('#matrixFoot .cell-button[data-month=""]').textContent();
  await change('metric','totalPrice');assert.ok(await page.locator('#matrixFoot .is-changing').count()>0,'equal formatted values still animate a different measure');assert.equal(await page.locator('#matrixFoot .cell-button[data-month=""]').textContent(),sameDollars);
  await settled();await change('metric','count');await settled();
  await page.evaluate(()=>{InsightsControls.setValues(document.getElementById('status'),['Sold']);document.getElementById('status').dispatchEvent(new Event('change'));});
  await settled();await change('dateField','closeDate');assert.ok(await page.locator('#matrix .is-changing').count()>0,'date-basis selection animates matching slots');await settled();
  await page.locator('[data-card]').first().hover();await page.locator('#subdivisionCard').waitFor({state:'visible'});
  assert.equal(await page.locator('#subdivisionCard .is-changing').count(),0,'new card stays still');
  await page.evaluate(()=>{const row=__sales.state.report.rows[0],trigger=document.querySelector('[data-card]');__sales.state.lots.push({...__sales.state.lots.find(l=>l.subdivisionId===row.id),id:'90071992547410100'});__sales.openSubdivisionCard(row.key,trigger);});
  assert.ok(await page.locator('#subdivisionCard .is-changing').count()>0,'same subdivision inventory updates animate');await keysUnique('#subdivisionCard');
  await page.locator('#viewSubdivisionLots').click();await page.locator('#detail[open]').waitFor();
  assert.equal(await page.locator('#detail .is-changing').count(),0,'first detail appearance stays still');
  await page.evaluate(()=>{__sales.state.detailLots[0]={...__sales.state.detailLots[0],price:123456};__sales.detailRows();});
  assert.ok(await page.locator('#detailBody .is-changing').count()>0,'same lot financial changes animate');
  assert.equal(await page.locator('#detailBody tr:not([class]) td:first-child [data-number-key]').count(),0,'lot codes stay static');
  await keysUnique('#detail');await settled();
  await page.locator('[data-detail-status="Scheduled"]').click();
  assert.ok(await page.locator('#detailMeta .is-changing').count()>0,'status-tab selected count animates');
  assert.ok(await page.locator('#detailPage .is-changing').count()>0,'status-tab pagination total animates');
  await page.locator('[data-detail-status="All"]').click();await keysUnique('#detail');
  await page.locator('#closeDetail').click();
  await page.evaluate(()=>{InsightsControls.setValues(document.getElementById('builder'),[]);document.getElementById('builder').dispatchEvent(new Event('change'));});await settled();
  await page.evaluate(async()=>{__data.lots.push({...__data.lots[0],ID:'90071992547410101'},{...__data.lots[0],ID:'90071992547410103'});await __sales.authorizeAndLoad();});
  assert.ok(await page.locator('#matrix .is-changing').count()>0,'same-permission native refresh compares complete snapshots');
  await settled();await page.locator('#collapse').click();assert.equal(await page.locator('#matrixBody .is-collapsed').count(),2);await keysUnique('#salesDashboard');
  await change('metric','totalPrice');assert.ok(await page.locator('#matrixBody .is-changing').count()>0,'collapsed group measure switch animates');await settled();
  await change('metric','count');assert.ok(await page.locator('#matrixBody .is-changing').count()>0);await settled();
  await page.evaluate(()=>{__sales.state.lots=__sales.state.lots.filter(l=>l.builderId==='b1');__sales.render();});assert.ok(await page.locator('#matrixBody .is-changing').count()>0,'collapsed group totals animate');
  await settled();await page.screenshot({path:path.join(output,'desktop.png'),fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});
  await change('metric','totalPrice');assert.equal(await page.locator('.is-changing').count(),0,'reduced motion also skips measure switches');await change('metric','count');
  await page.evaluate(()=>{__sales.state.lots.push({...__sales.state.lots[0],id:'90071992547410102'});__sales.render();});assert.equal(await page.locator('.is-changing').count(),0,'reduced motion updates immediately');
  await page.emulateMedia({reducedMotion:'no-preference'});
  // Exercise rapid signed transitions directly with real mounted DOM and the shared renderer.
  await page.evaluate(()=>{const host=document.createElement('div');host.id='numberTest';document.body.append(host);window.__showNumber=(value,key='signed')=>{const before=InsightsNumbers.capture(host);host.innerHTML=InsightsNumbers.markup(value,key);InsightsNumbers.apply(host,before);};__showNumber('-$1,200');__showNumber('$100');__showNumber('-$12');});
  assert.equal(await page.locator('#numberTest').textContent(),'-$12');assert.equal(await page.locator('#numberTest .number-push').first().getAttribute('data-from'),'$100','rapid changes compare the newest complete real value');
  await page.evaluate(()=>__showNumber('—'));assert.equal(await page.locator('#numberTest .is-changing').count(),0);await page.evaluate(()=>__showNumber('5'));assert.equal(await page.locator('#numberTest .is-changing').count(),0,'unknown never becomes fake zero');
  await page.evaluate(()=>__showNumber('99','other-record'));assert.equal(await page.locator('#numberTest .is-changing').count(),0,'unrelated identity stays still');await page.locator('#numberTest').evaluate(n=>n.remove());
  await page.evaluate(async()=>{__revenue=false;await __sales.authorizeAndLoad();});assert.equal(await page.locator('#matrix .is-changing').count(),0,'changed access discards previous values');
  await page.evaluate(async()=>{__granted=false;await __sales.authorizeAndLoad();});assert.equal(await page.locator('#matrix [data-number-key]').count(),0,'revoked access clears the report');
  // Dormant Budget UI stays disabled in production; exercise its source in this fixture only.
  await page.addScriptTag({url:url+'/budget-model.js'});
  await page.addScriptTag({url:url+'/budget-app.js'});
  await page.evaluate(()=>{
    __budget.state.rows=InsightsBudgetModel.normalize({projects:__data.projects,subdivisions:__data.subdivisions,budgets:[{ID:'90071992547410999',Budget_Name:'Phase 01',Subdivision1:{ID:'s1'},Const_Budget_Approval_Status:'Approved',Development_Budget_Approval_Status:'Approved'}],categories:[{ID:'category1',Budget:{ID:'90071992547410999'},Budget_Category_Name:'Roads',Budget_Total:100000}],items:[{ID:'item1',Budget:{ID:'90071992547410999'},Budget_Category:{ID:'category1'},PROJ_Actual:40000,HCSS_Actuals:10000}],modifications:[]});
    __budget.state.ready=true;__budget.shell();document.getElementById('budgetsDashboard').hidden=false;
  });
  await change('budgetInclude','all');await change('budgetBasis','revised');await keysUnique('#budgetsDashboard');assert.equal(await page.locator('#budgetsDashboard .is-changing').count(),0);
  await page.evaluate(()=>{__budget.state.rows[0].gp=60000;__budget.render();});assert.ok(await page.locator('#budgetBody .is-changing').count()>0,'budget GP, remaining and percentage animate');
  await settled();await change('budgetBasis','final');assert.ok(await page.locator('#budgetBody .is-changing').count()>0,'budget-basis changes animate the same amount slots');
  await page.evaluate(()=>__budget.openDetail('90071992547410999'));assert.equal(await page.locator('#budgetDetail .is-changing').count(),0);
  await page.evaluate(()=>{__budget.state.report.rows[0].details[0].gp=80000;__budget.openDetail('90071992547410999');});assert.ok(await page.locator('#budgetDetail .is-changing').count()>0);await keysUnique('#budgetDetail');
  assert.deepEqual(errors,[]);
  console.log('PASS Insights desktop Sliding push: one-dot loading counter with rapid exact progress, filters, native refresh, matrix/groups, inventory, lot details, dormant Budget views, immediate final text/CSV, all seven real-picker measure switches, period/status/basis changes, first/equal/unknown/identity suppression, signed rapid changes, permissions and reduced motion. Screenshots: '+output);
}catch(error){await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});console.error({errors});throw error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
