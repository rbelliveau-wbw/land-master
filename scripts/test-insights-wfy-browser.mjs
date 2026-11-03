import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {forecastFixture} from './fixtures/insights-forecasts.mjs';
import {salesFixture} from './fixtures/lot-sales-data.mjs';

const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve('widgets/lot-sales-explorer/src/app'),output=path.resolve('tmp');
fs.mkdirSync(output,{recursive:true});
const forecasts=forecastFixture(),sales=salesFixture(new Date('2026-11-03T12:00:00'));
sales.subdivisions=sales.subdivisions.map(row=>({...row,Subdivision_Code:row.ID,Projects_Status:'Active',Total_Lots:'100',Lots_Sold:'20'}));
const data={All_Subdivisions:[...forecasts.subdivisions,...sales.subdivisions],All_Projects:[...forecasts.projects,...sales.projects],All_Builders:[...forecasts.builders,...sales.builders],All_Forecasts:forecasts.months,All_Forecast_Years:forecasts.years,All_Lots_All_Fields:sales.lots.slice(0,20)};
const sdk=`window.ZOHO={CREATOR:{UTIL:{getInitParams:async()=>({appLinkName:'land-master',loginUser:'viewer@example.test',envUrlFragment:'/environment/development'}),getQueryParams:async()=>Object.fromEntries(new URLSearchParams(location.search))},DATA:{invokeCustomApi:async()=>({code:3000,result:JSON.stringify({hasRow:true,lotSalesDashboard:true,forecastsDashboard:true,viewTotalLotRevenue:true,today:'2026-11-03'})}),getRecordCount:async c=>({code:3000,result:{records_count:(${JSON.stringify(data)})[c.report_name]?.length||0}}),getRecords:async c=>({code:3000,data:(${JSON.stringify(data)})[c.report_name]||[]})}}};`;
const server=http.createServer((req,res)=>{
  const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,''),file=path.resolve(root,relative||'widget.html');
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':'text/html');res.end(fs.readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
  browser=await chromium.launch({headless:true,channel:'chrome',ignoreDefaultArgs:['--hide-scrollbars']});
  const page=await browser.newPage({viewport:{width:1540,height:980}}),errors=[];
  page.setDefaultTimeout(8000);page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    const NativeDate=Date;window.Date=class extends NativeDate {
      constructor(...args){super(...(args.length?args:['2026-11-03T12:00:00']));}
      static now(){return new NativeDate('2026-11-03T12:00:00').getTime();}
    };
  });
  await page.route('https://static.zohocdn.com/**',route=>route.fulfill({contentType:'application/javascript',body:sdk}));
  await page.goto('http://127.0.0.1:'+server.address().port+'/widget.html?dashboard=sales');
  await page.locator('#salesDashboard').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.getElementById('salesLoading').hidden&&!document.getElementById('refresh').disabled);
  const range=()=>page.locator('#from,#to').evaluateAll(nodes=>nodes.map(node=>node.value));
  assert.equal(await page.locator('#period').inputValue(),'twoWFYs');
  assert.deepEqual(await range(),['2025-02','2027-01']);
  const selectPeriod=async value=>{await page.locator('#periodPicker').click();await page.locator('#periodPopup [data-value="'+value+'"]').click();};
  await page.locator('#periodPicker').click();
  const options=await page.locator('#periodPopup .picker-option').allTextContents();
  for(const option of ['Current + Previous WFY','Current WFY (Feb–Jan)','Previous WFY (Feb–Jan)','WFY to Date','Current Year (Jan–Dec)'])assert.ok(options.includes(option),option+' is available');
  await page.screenshot({path:path.join(output,'wfy-period-browser.png')});await page.keyboard.press('Escape');
  await selectPeriod('currentYear');assert.deepEqual(await range(),['2026-01','2026-12']);
  await selectPeriod('currentWFY');assert.deepEqual(await range(),['2026-02','2027-01']);
  await selectPeriod('previousWFY');assert.deepEqual(await range(),['2025-02','2026-01']);
  await selectPeriod('wfytd');assert.deepEqual(await range(),['2026-02','2026-11']);
  await selectPeriod('currentWFY');await page.locator('#allFilters').click();await page.locator('#fromPicker').click();
  assert.equal(await page.locator('#fromPopup .month-year').textContent(),'WFY 2026');
  assert.deepEqual(await page.locator('#fromPopup [data-month]').allTextContents(),['Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan']);
  assert.equal(await page.locator('#fromPopup [data-month="0"]').getAttribute('aria-label'),'Choose January 2027 (WFY 2026)');
  await page.screenshot({path:path.join(output,'wfy-browser.png')});
  await page.locator('#fromPopup [data-month="0"]').click();
  assert.equal(await page.locator('#from').inputValue(),'2027-01');assert.equal(await page.locator('#period').inputValue(),'custom');
  await page.locator('#reset').click();assert.equal(await page.locator('#period').inputValue(),'twoWFYs');assert.deepEqual(await range(),['2025-02','2027-01']);
  await page.locator('[data-dashboard="forecasts"]').click();await page.locator('#fcBody .fc-leaf').first().waitFor();
  assert.equal(await page.locator('#fcPeriod').inputValue(),'planning');
  assert.equal(await page.locator('#fcAnnual').locator('..').innerText(),'WFY Totals');
  assert.deepEqual(await page.locator('#fcHead .fc-year').allTextContents(),['WFY 2026Feb 2026 – Jan 2027','WFY 2027Feb 2027 – Jan 2028','WFY 2028Feb 2028 – Jan 2029','WFY 2029Feb 2029 – Jan 2030']);
  await page.locator('#fcPeriodPicker').click();await page.locator('#fcPeriodPopup [data-value="custom"]').click();
  assert.equal(await page.locator('#fcPeriodPicker .picker-value').textContent(),'Choose WFYs');
  assert.equal(await page.locator('#fcYearsLabel').isVisible(),true);assert.equal(await page.locator('#fcYearsPicker').getAttribute('aria-label'),'WFYs');
  await page.locator('#fcYearsPicker').click();assert.ok((await page.locator('#fcYearsPopup .picker-option').allTextContents()).some(text=>text.includes('WFY 2026')));await page.keyboard.press('Escape');
  await page.screenshot({path:path.join(output,'wfy-forecast-browser.png')});
  assert.deepEqual(errors,[]);
  console.log('PASS desktop Insights WFY defaults/reset, fiscal and calendar menus, February–January picker, January selection, forecast WFY controls and totals.');
} finally {
  await browser?.close();await new Promise(resolve=>server.close(resolve));
}
