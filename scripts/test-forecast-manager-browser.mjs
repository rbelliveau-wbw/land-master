// Browser fixtures are inert and live only in the test runner, never in widget releases.
import {createRequire} from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {forecastSummaryFixture} from './test-forecast-compact-summary.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=path.resolve('widgets/forecast-manager/src/app'),output=path.resolve('tmp/forecast-manager-preview');fs.mkdirSync(output,{recursive:true});
const server=http.createServer((request,response)=>{
  const pathname=new URL(request.url,'http://localhost').pathname,filename=path.resolve(root,'.'+pathname);
  if(!filename.startsWith(root+path.sep)||!fs.existsSync(filename)){response.writeHead(404).end();return;}
  response.setHeader('Content-Type',filename.endsWith('.js')?'text/javascript':filename.endsWith('.css')?'text/css':'text/html');response.end(fs.readFileSync(filename));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
await page.route(/.*/,route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.fulfill({contentType:'text/javascript',body:''}));
await page.addInitScript(({summaryHtml})=>{
  const sub='90071992547409931',a='90071992547409961',b='90071992547409962';
  window.__catalog={subdivisions:[{id:sub,name:'Wildwood Estates — Phase 05',code:'WW05'}],builders:[{id:a,name:'DR Horton'},{id:b,name:'StyleCraft'}]};
  window.__snapshot={subdivision:{id:sub,name:'Wildwood Estates — Phase 05',code:'WW05',builderIds:[a,b],unforecasted:52,expectedUnforecasted:52},years:[],months:[],summaryHtml};
  function addYear(builderId,year){const id='900719925474'+year+builderId.slice(-2);window.__snapshot.years.push({id,builderId,year,name:'Fixture year'});['February','March','April','May','June','July','August','September','October','November','December','January'].forEach((month,index)=>window.__snapshot.months.push({id:id+String(index).padStart(2,'0'),parentId:id,builderId,subdivisionId:sub,year,month,start:(Number(year)+(index===11?1:0))+'-'+String(index===11?1:index+2).padStart(2,'0')+'-01',forecast:index<8?3:index===8?2:5,actual:index<8?2:0,scheduled:index===8?1:0}));return id;}
  addYear(a,'2026');addYear(a,'2027');addYear(b,'2026');
  window.__calls=[];window.__sends=[];window.__delay=0;window.__lost=false;window.__window=true;
  window.__missing=new URL(location.href).searchParams.get('missing')==='1';
  window.ZOHO={CREATOR:{UTIL:{getInitParams:async()=>{window.__init=true;return {loginUser:'inert-forecast-fixture',appLinkName:'land-master',envUrlFragment:'environment/development'};}},DATA:{invokeCustomApi:async config=>{
    if(config.api_name.startsWith('Report_'))return {result:{ok:true}};
    const body=JSON.parse(config.payload.payload);window.__calls.push({api:config.api_name,...body});
    if(window.__missing)return {code:9350,message:"Custom API doesn't exist. Please check the custom API linkname."};
    const meta={ok:true,action:body.action,today:'2026-10-07',windowOpen:window.__window};
    if(body.action==='catalog')return {code:3000,details:{output:JSON.stringify({...meta,...window.__catalog})}};
    if(body.action==='save'||body.action==='ensure')window.__sends.push(body);
    if(window.__delay)await new Promise(resolve=>setTimeout(resolve,window.__delay));
    if(body.action==='save'){
      if(!window.__window)return {result:JSON.stringify({...meta,ok:false,unknown:false,message:'Forecasting window closed for the month.'})};
      const month=window.__snapshot.months.find(month=>month.id===body.forecastId);
      if(month.forecast!==body.expected)return {result:JSON.stringify({...meta,ok:false,unknown:false,conflict:true,message:'Forecast changed. Refresh before editing.'})};
      month.forecast=body.value;
      if(window.__lost){window.__lost=false;throw new Error('Fixture lost response after write');}
      return {code:3000,details:{output:JSON.stringify({...meta,...window.__snapshot,verifiedForecastId:month.id,verifiedValue:month.forecast})}};
    }
    if(body.action==='ensure'){const existing=window.__snapshot.years.find(year=>year.builderId===body.builderId&&year.year===body.year),id=existing?existing.id:addYear(body.builderId,body.year);return {result:JSON.stringify({...meta,...window.__snapshot,ensuredParentId:id,createdParent:!existing,createdMonths:existing?0:12})};}
    return {result:JSON.stringify({...meta,...window.__snapshot})};
  }}}};
},{summaryHtml:forecastSummaryFixture()});
try {
  await page.goto('http://127.0.0.1:'+server.address().port+'/widget.html');await page.waitForFunction(()=>!document.getElementById('subPicker').disabled);
  await page.screenshot({path:path.join(output,'empty.png'),fullPage:true});
  await page.locator('#subPicker').click();assert.equal(await page.locator('.popover input').getAttribute('placeholder'),'Search Subdivision');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.locator('#search').click();await page.waitForSelector('#matrix tbody tr');
  assert.equal(await page.locator('#matrix tbody tr').count(),2,'one row per builder across both years');assert.equal(await page.locator('[data-create-builder]').count(),1);assert.equal(await page.locator('select').count(),0,'custom pickers only');
  assert.equal(await page.locator('#compactSummary').isVisible(),true,'compact native snapshot is visible');assert.equal(await page.locator('#summary').isVisible(),false,'supported native markup avoids nested summary scrolling');assert.ok(await page.locator('.fs-card').count()>=3,'all schedules including repeated builders are retained');assert.ok(await page.locator('.fs-contract').count()>0,'all-phase contract details remain present');
  const scheduleCount=await page.locator('.fs-card').count();await page.locator('#builderPicker').click();assert.equal(await page.locator('[role="listbox"]').getAttribute('aria-multiselectable'),'true');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert.ok(await page.evaluate(()=>document.activeElement.matches('.option')),'toggling a selection retains keyboard focus');await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.querySelector('.popover').contains(document.activeElement)),'keyboard focus stays within the picker');await page.locator('[data-pop-done]').click();assert.equal(await page.locator('.fs-card').count(),scheduleCount,'matrix filtering leaves all subdivision schedules visible');await page.locator('#builderPicker').click();await page.locator('[data-pop-clear]').click();assert.equal(await page.locator('.popover').count(),0,'Clear applies and dismisses immediately');assert.equal(await page.locator('#matrix tbody tr').count(),2);
  const currentId=await page.evaluate(()=>__snapshot.months.find(month=>month.builderId===__catalog.builders[0].id&&month.year==='2026'&&month.month==='October').id),input=page.locator('[data-forecast="'+currentId+'"]');
  assert.equal(await input.isDisabled(),false);assert.equal(await page.locator('[data-forecast]').first().isDisabled(),true,'past months are disabled');
  await page.screenshot({path:path.join(output,'desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.locator('#matrixScroll').evaluate(node=>{node.scrollLeft=700;});await page.screenshot({path:path.join(output,'mobile-missing-year.png'),fullPage:true});await page.locator('#matrixScroll').evaluate(node=>{node.scrollLeft=0;});await page.setViewportSize({width:1440,height:1000});
  await input.fill('4');await input.press('Tab');await page.waitForFunction(id=>document.querySelector('[data-cell="'+id+'"]').classList.contains('saved'),currentId);assert.equal(await page.evaluate(()=>__sends.length),1);assert.equal(await page.evaluate(()=>__calls.every(call=>call.api==='Forecast_Manager_Widget_DEV')),true,'no production API fallback');
  assert.equal(await page.locator('.fs-card').count(),scheduleCount,'field-change save refreshes compact summary while preserving inline edit');
  await page.evaluate(()=>{__window=false;});await input.fill('8');await input.press('Tab');await page.waitForFunction(id=>document.querySelector('[data-cell="'+id+'"]').classList.contains('failed'),currentId);assert.equal(await input.inputValue(),'8','a failed value is retained');
  await page.locator('#check').click();await page.waitForFunction(()=>document.getElementById('window').textContent.includes('closed'));assert.equal(await input.isDisabled(),true);assert.equal(await page.evaluate(()=>__snapshot.months.find(month=>month.id===__sends[1].forecastId).forecast),4,'server recheck rejects a newly closed window');
  await page.locator('#discard').click();await page.locator('#dialogAction').click();assert.equal(await input.inputValue(),'4');
  await page.evaluate(()=>{__window=true;});await page.locator('#refresh').click();await page.waitForFunction(()=>document.getElementById('window').textContent.includes('open'));
  await page.evaluate(()=>{__lost=true;});await input.fill('9');await input.press('Tab');await page.waitForFunction(id=>document.querySelector('[data-cell="'+id+'"]').classList.contains('unknown'),currentId);
  const sends=await page.evaluate(()=>__sends.length);await page.locator('#check').click();await page.waitForFunction(id=>document.querySelector('[data-cell="'+id+'"]').classList.contains('saved'),currentId);assert.equal(await page.evaluate(()=>__sends.length),sends,'status checking never replays a write');
  await page.evaluate(()=>{__delay=650;});await page.locator('[data-create-builder]').click();await page.screenshot({path:path.join(output,'add-year.png'),fullPage:true});await page.locator('[data-picker="newYear"]').click();assert.equal(await page.locator('.option').count(),28,'creation years fit both required parent and child picklists');assert.equal(await page.locator('[data-option="2047"]').count(),0);await page.screenshot({path:path.join(output,'year-picker.png'),fullPage:true});await page.keyboard.press('Escape');await page.locator('#dialogAction').click();await page.waitForSelector('#stage1');assert.equal(await page.locator('#dialogClose').isDisabled(),true);assert.equal(await page.locator('#app').evaluate(node=>node.inert),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#modal').isVisible(),true,'pending creation cannot be dismissed');
  await page.screenshot({path:path.join(output,'creation-progress.png'),fullPage:true});
  await page.waitForFunction(()=>document.getElementById('creationResult').textContent.includes('successfully'));assert.equal(await page.locator('#creationLedger span').count(),12);assert.equal(await page.locator('#modal [role="progressbar"]').getAttribute('aria-valuenow'),'13');await page.screenshot({path:path.join(output,'creation-result.png'),fullPage:true});await page.locator('#dialogCancel').click();assert.equal(await page.locator('#matrix tbody tr').count(),2,'creation does not add another builder row');assert.equal(await page.locator('[data-create-builder]').count(),0);
  await page.locator('[data-view="actual"]').click();assert.equal(await page.locator('[data-forecast]').count(),0,'Sold is read-only');await page.locator('[data-view="forecast"]').click();
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'the matrix scrolls inside the page on mobile');
  await page.locator('#yearPicker').click();assert.ok(await page.locator('.popover').evaluate(node=>node.getBoundingClientRect().right<=innerWidth&&node.getBoundingClientRect().left>=0));await page.keyboard.press('Escape');
  await page.setViewportSize({width:320,height:320});await page.locator('#yearPicker').click();assert.ok(await page.locator('.popover').evaluate(node=>{const r=node.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;}),'picker stays inside a short viewport');await page.keyboard.press('Escape');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'compact cards fit narrow viewports');
  await page.goto('http://127.0.0.1:'+server.address().port+'/widget.html?missing=1');await page.waitForFunction(()=>document.getElementById('saveStatus').textContent==='API setup required');assert.match(await page.locator('#notice').textContent(),/Missing Creator API: Forecast_Manager_Widget_DEV/);assert.equal(await page.locator('#subPicker').isDisabled(),true);assert.equal(await page.evaluate(()=>__sends.length),0,'missing API never attempts a write');
  assert.deepEqual(errors,[]);console.log('PASS: inert browser fixtures verify native details.output and legacy responses, explicit missing-DEV-API setup state, builder rows, custom filters, native locks, server-closed-window rejection, retained drafts, lost-response reconciliation without replay, verified 12-child creation, close lock, read-only Sold, DEV API routing and mobile layout. Screenshots: '+output);
} catch(error) {
  console.error(JSON.stringify({errors,notice:await page.locator('#notice').textContent(),status:await page.locator('#saveStatus').textContent(),state:await page.evaluate(()=>({init:window.__init,context:LMRuntime.current(),calls:window.__calls,app:typeof ForecastApp,model:typeof ForecastModel,runtime:typeof LMRuntime,creator:typeof ZOHO,promise:Promise.toString(),capture:LMRuntime.capture.toString(),initMethod:ZOHO.CREATOR.UTIL.getInitParams.toString()}))},null,2));
  await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});throw error;
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
