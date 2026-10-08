// Safe compact-summary presentation, using actual saved Deluge and inert tables.
// Importing this module only exposes fixtures; browser checks are opt-in.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

const rendererPath = new URL('../widgets/forecast-manager/src/app/forecast-summary.js', import.meta.url);
const nativeSource = fs.readFileSync(new URL('../creator/functions/buildForecastManagerSummary.dg', import.meta.url), 'utf8');
const nativeBody = translate(nativeSource).js.replace(/row\.Subdivisions == subdivisionId/g, 'row.Subdivisions?.includes(subdivisionId)')
  .replace(/ID in contractLotIds/g, 'contractLotIds.includes(row.ID)').replace(/\.sum\(Forecasted_Lots\)/g, '.sum("Forecasted_Lots")');
const date = value => Date.parse(value + 'T00:00:00Z');

export function runForecastSummaryFixture(tables, now = '2026-10-07', subdivisionId = 1) {
  const context = vm.createContext({tablesJson: JSON.stringify(tables), now: date(now), subdivisionId, names: {1: 'DR Horton', 2: 'StyleCraft'}});
  vm.runInContext(`
    const tables=JSON.parse(tablesJson);
    function ifnull(v,f){return v==null?f:v;}
    function List(){return [];}
    function Map(){return {put(k,v){this[k]=v;},get(k){return this[k]??null;}};}
    Array.prototype.add=function(v){this.push(v);};
    Array.prototype.contains=function(v){return this.includes(v);};
    Array.prototype.size=Array.prototype.count=function(){return this.length;};
    Array.prototype.sum=function(field){return this.reduce((sum,row)=>sum+(row[field]??0),0);};
    Number.prototype.toLong=function(){return Math.trunc(this);};
    const numberToString=Number.prototype.toString;
    Number.prototype.toString=function(format){
      const d=new Date(Number(this));
      if(format==='MMMM')return d.toLocaleString('en-US',{month:'long',timeZone:'UTC'});
      if(format==='MM/dd/yyyy')return String(d.getUTCMonth()+1).padStart(2,'0')+'/'+String(d.getUTCDate()).padStart(2,'0')+'/'+d.getUTCFullYear();
      return numberToString.call(this);
    };
    Number.prototype.addMonth=function(n){const d=new Date(Number(this));d.setUTCMonth(d.getUTCMonth()+n);return +d;};
    Number.prototype.subMonth=function(n){return this.addMonth(-n);};
    Number.prototype.subDay=function(n){return Number(this)-n*86400000;};
    Number.prototype.toStartOfMonth=function(){const d=new Date(Number(this));return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1);};
    Object.defineProperty(Number.prototype,'Builder_Name',{get(){return names[Number(this)]??'';}});
    function query(form,predicate){
      const rows=(tables[form]??[]).map(row=>new Proxy(row,{get(o,k){return o[k]??null;}})).filter(predicate);
      return new Proxy(rows,{get(o,k){return k in o||typeof k==='symbol'?o[k]:o[0]?.[k]??null;}});
    }
    const zoho={currentdate:now};
    ${nativeBody}
    var result=buildForecastManagerSummary(subdivisionId);
  `, context);
  return context.result;
}

export function forecastSummaryFixture(options = {}) {
  const schedule = (ID, Builder1, obligation, Subdivisions = [1], contract = null) => ({ID, Builder1, Subdivisions, Total_Lot_Obligation: obligation, Add_Contract_Contract_Name: contract,
    Takedown_Start_Date: date('2026-01-05'), Initial_Takedown: 2, Initial_Delay_Days: 30, Second_Closing_Lots: null, Second_Closing_Days: null,
    Continued_Takedown: 3, Continued_Takedown_Delay_Days: 30, Takedown_End_Date: date('2027-01-30'), Last_Takedown_Date: date('2026-08-06'), Last_Takedown_Amount: 4,
    Lots_Expected: 9, Last_30_Day_Sales: 0, Last_90_Day_Sales: 9, Last_6_Month_Sales: 21, Last_12_Month_Sales: 30});
  const tables = {Subdivision: [{ID: 1, Subdivision_Name: 'Turnbo Ranch - Phase 05', Subdivision_Code: 'TR05', Status: 'Active',
    Company_Name: 'WBW Single Development Group, LLC - Series 145', County: 'Bell', Total_Lots: 148, Lot_Total_Residential: 148,
    Equiv_LF_of_Street: 5072, Last_Sold_Date: date('2026-08-06')}],
    Takedown_Schedule: [schedule(101, 1, 80), schedule(102, 2, 36), schedule(103, 2, 363, [1, 2, 3, 4], 77)],
    Lots: [], Forecast: [], Contract: [{ID: 77, Lots1: [501, 502, 503, 504, 505]}]};
  const dr = tables.Takedown_Schedule[0];
  Object.assign(dr, {Takedown_Start_Date: date('2025-09-04'), Initial_Takedown: 50, Initial_Delay_Days: 60, Second_Closing_Lots: 7, Second_Closing_Days: 0,
    Continued_Takedown: 37, Continued_Takedown_Delay_Days: 60, Takedown_End_Date: date('2026-01-02'), Last_Takedown_Date: date('2025-11-20'), Last_Takedown_Amount: 37,
    Last_30_Day_Sales: 0, Last_90_Day_Sales: 0, Last_6_Month_Sales: 0, Last_12_Month_Sales: 37, Lots_Expected: 60});
  for (let index = 0; index < 42; index++) tables.Lots.push({ID: index + 1, Builder1: 1, Subdivision: 1, Status: 'Sold', Close_Date: date(index < 4 ? '2026-10-07' : '2026-08-01')});
  for (let index = 0; index < 4; index++) tables.Lots.push({ID: index + 90, Builder1: 1, Subdivision: 1, Status: 'Scheduled', Close_Date: null});
  for (let index = 0; index < 30; index++) tables.Lots.push({ID: index + 201, Builder1: 2, Subdivision: 1, Status: 'Sold', Close_Date: date('2026-08-06')});
  tables.Lots.push({ID: 501, Builder1: 1, Subdivision: 1, Status: 'Sold', Close_Date: date('2026-10-07')},
    {ID: 502, Builder1: 2, Subdivision: 1, Status: 'Scheduled', Close_Date: null},
    {ID: 503, Builder1: 2, Subdivision: 1, Status: 'Contracted', Close_Date: null},
    {ID: 504, Builder1: 2, Subdivision: 2, Status: 'Sold', Close_Date: date('2026-09-01')},
    {ID: 505, Builder1: 2, Subdivision: 2, Status: 'Contracted', Close_Date: null});
  const forecast = (Builder1, start, amount) => ({Subdivision1: 1, Builder1, Forecast_Start_Date: date(start), Forecasted_Lots: amount});
  tables.Forecast.push(forecast(1, '2026-10-01', options.monthlyForecast ?? 10), forecast(1, '2026-11-01', 19), forecast(2, '2026-10-01', 3), forecast(2, '2026-11-01', 2));
  if (options.empty) tables.Takedown_Schedule = [];
  if (options.reversed) tables.Takedown_Schedule.reverse();
  return runForecastSummaryFixture(tables, options.today || '2026-10-07');
}

async function browserChecks() {
  const require = createRequire(import.meta.url), {chromium} = require('playwright');
  const browser = await chromium.launch({headless: true, channel: 'chrome'}), page = await browser.newPage();
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/.*/, route => {requests.push(route.request().url()); return route.abort();});
  try {
    await page.setContent('<!doctype html><title>Inert compact summary verification</title><div id="host">Previous summary</div>');
    await page.addScriptTag({content: fs.readFileSync(rendererPath, 'utf8')});
    const fixture = forecastSummaryFixture();
    const output = await page.evaluate(html => {
      const source = new DOMParser().parseFromString(html, 'text/html'), host = document.getElementById('host');
      const normalized = value => value.replace(/\s+/g, ' ').trim();
      const tableRows = table => [...table.rows].map(row => [normalized(row.cells[0].textContent), normalized(row.cells[1].textContent)]).sort((a, b) => a[0].localeCompare(b[0]));
      const values = node => [...node.querySelectorAll('[data-native-label]')].map(item => [item.dataset.nativeLabel, item.dataset.nativeValue]).sort((a, b) => a[0].localeCompare(b[0]));
      const nativeCards = [...source.querySelectorAll('.fm-builder-card')];
      const ok = ForecastSummary.render(html, host), cards = [...host.querySelectorAll('.fs-card')];
      const facts = [...host.querySelectorAll('.fs-lot-card [data-native-label]')].map(item => [item.dataset.nativeLabel, item.dataset.nativeValue]).sort((a, b) => a[0].localeCompare(b[0]));
      const results = cards.map((card, index) => {
        const native = nativeCards[index], nativeTable = [...native.children].find(child => child.tagName === 'TABLE'), nativeContract = native.querySelector('.fm-contract-scope'), contract = card.querySelector('.fs-contract');
        const nativeProgress = [...native.children].find(child => child.classList.contains('fm-progress-wrap')).querySelector('.fm-progress');
        const nativeMonth = native.querySelector('.fm-month-track');
        return {name: card.querySelector('.fs-builder-name').textContent, nativeName: native.querySelector('.fm-builder-name').textContent,
          terms: values(card.querySelector(':scope > .fs-terms')), nativeTerms: tableRows(nativeTable),
          recent: values(card.querySelector(':scope > .fs-recent')), nativeRecent: [...native.querySelector('.fm-mini-grid').children].map(item => [normalized(item.querySelector('.fm-mini-k').textContent), normalized(item.querySelector('.fm-mini-v').textContent)]).sort((a, b) => a[0].localeCompare(b[0])),
          contract: contract ? values(contract) : null, nativeContract: nativeContract ? tableRows(nativeContract.querySelector('.fm-table')) : null,
          gradient: card.querySelector(':scope > .fs-progress .fs-progress-track').style.background, nativeGradient: nativeProgress.style.background,
          monthWidth: card.querySelector('.fs-month-fill').style.width, nativeMonthWidth: native.querySelector('.fm-month-fill').style.width,
          monthNow: card.querySelector('.fs-month-track').getAttribute('aria-valuenow'), nativeMonthNow: nativeMonth.getAttribute('aria-valuenow'),
          monthText: card.querySelector('.fs-month-track').getAttribute('aria-valuetext'), nativeMonthText: nativeMonth.getAttribute('aria-valuetext'),
          balance: card.querySelector('.fs-card-balance-value').textContent, nativeBalance: native.querySelector('.fm-builder-stat-v').textContent,
          negative: card.querySelector('.fs-card-balance').classList.contains('negative'), nativeNegative: native.querySelector('.fm-builder-stat').classList.contains('fm-builder-stat-neg')};
      });
      return {ok, facts, nativeFacts: tableRows(source.querySelector('.fm-card .fm-table')), results, count: cards.length,
        topBalance: host.querySelector('.fs-balance-value')?.textContent, nativeTopBalance: source.querySelector('.fm-top-stat-v').textContent,
        headlessRecent: host.querySelectorAll('.fs-contract .fs-sale').length, unsafe: host.querySelectorAll('script,style,img,iframe,link,object,svg,button').length};
    }, fixture);
    assert.equal(output.ok, true, 'actual saved native summary is supported');
    assert.equal(output.count, 3, 'all schedules survive repeated Builder names');
    assert.deepEqual(output.facts, output.nativeFacts, 'every subdivision field survives');
    assert.equal(output.topBalance, output.nativeTopBalance, 'summary capacity is never replaced by inventory balance');
    assert.equal(output.unsafe, 0, 'outer document contains rebuilt passive content only');
    assert.equal(output.headlessRecent, 4, 'whole-contract recent sales retain four compact fields');
    for (const result of output.results) {
      for (const key of ['name', 'terms', 'recent', 'contract', 'gradient', 'monthWidth', 'monthNow', 'monthText', 'balance', 'negative']) {
        assert.deepEqual(result[key], result['native' + key[0].toUpperCase() + key.slice(1)], key + ' matches native output');
      }
    }
    assert.equal(output.results[0].terms.find(row => row[0] === 'Second Closing (Days)')[1], '0', 'explicit same-day closing remains zero');
    assert.equal(output.results[1].terms.find(row => row[0] === 'Second Closing (Days)')[1], '', 'legacy missing Second Closing remains blank');
    assert.equal(output.results[2].name, output.results[1].name, 'same Builder retains two distinct schedule cards');
    assert.ok(output.results[2].nativeContract, 'multi-phase whole-contract scope survives');

    const changed = forecastSummaryFixture({monthlyForecast: 20});
    const disclosure = await page.evaluate(({fixture, changed, reversed}) => {
      const host = document.getElementById('host');
      host.querySelector('.fs-contract').open = true;
      ForecastSummary.render(changed, host);
      const retained = host.querySelector('.fs-contract').open;
      const status = host.querySelector('.fs-month-status').textContent;
      ForecastSummary.render(reversed, host);
      const reset = !host.querySelector('.fs-contract').open;
      ForecastSummary.render(fixture, host);
      return {retained, reset, status};
    }, {fixture, changed, reversed: forecastSummaryFixture({reversed: true})});
    assert.equal(disclosure.retained, true, 'a snapshot update preserves an unchanged schedule disclosure');
    assert.equal(disclosure.reset, true, 'a different schedule order resets rather than joining by Builder');
    assert.match(disclosure.status, /of 20 sold/, 'native refreshed month value is visible');

    const zero = await page.evaluate(html => {const host = document.getElementById('host'); return {ok: ForecastSummary.render(html, host), width: host.querySelector('.fs-month-fill').style.width, text: host.querySelector('.fs-month-status').textContent, over: host.querySelector('.fs-month-status').classList.contains('over')};}, forecastSummaryFixture({monthlyForecast: 0}));
    assert.equal(zero.ok, true); assert.equal(zero.width, '0%'); assert.match(zero.text, /of 0 sold/); assert.equal(zero.over, true);
    const empty = await page.evaluate(html => {const host = document.getElementById('host'); return {ok: ForecastSummary.render(html, host), cards: host.querySelectorAll('.fs-card').length, text: host.querySelector('.fs-empty')?.textContent};}, forecastSummaryFixture({empty: true}));
    assert.equal(empty.ok, true); assert.equal(empty.cards, 0); assert.match(empty.text, /No Takedown Schedule/);

    const attacks = [fixture + '<script>window.__summaryInjected=true</script>', fixture.replace('DR Horton', '<img src="https://invalid.example/summary-probe" onerror="window.__summaryInjected=true">'), fixture.replace("background:linear-gradient(90deg", "background:url(https://invalid.example/progress);linear-gradient(90deg"), fixture + '<div class="unmapped">New source information</div>', fixture.replace("<div class='fm-mini'><div class='fm-mini-k'>Last 30 Day", "<div class='changed-mini'><div class='fm-mini-k'>Last 30 Day")];
    for (const html of attacks) {
      const attack = await page.evaluate(html => {const host = document.getElementById('host'), before = host.innerHTML; const ok = ForecastSummary.render(html, host); return {ok, unchanged: host.innerHTML === before, injected: Boolean(window.__summaryInjected)};}, html);
      assert.deepEqual(attack, {ok: false, unchanged: true, injected: false}, 'unsupported/malicious source falls back without mutating the host');
    }
    const escaped = await page.evaluate(html => {const host = document.getElementById('host'); return {ok: ForecastSummary.render(html, host), name: host.querySelector('.fs-builder-name')?.textContent, images: host.querySelectorAll('img').length};}, fixture.replaceAll('DR Horton', 'DR &lt;img src=x onerror=bad&gt; &amp; Horton'));
    assert.equal(escaped.ok, true); assert.equal(escaped.name, 'DR <img src=x onerror=bad> & Horton'); assert.equal(escaped.images, 0);
    const added = fixture.replace('</table>', '<tr><td>Additional subdivision detail</td><td>Preserved field</td></tr></table>');
    const extra = await page.evaluate(html => {const host = document.getElementById('host'); return {ok: ForecastSummary.render(html, host), text: host.querySelector('[data-native-label="Additional subdivision detail"]')?.textContent};}, added);
    assert.deepEqual(extra, {ok: true, text: 'Preserved field'}, 'new table fields are retained as generic facts');
    assert.deepEqual(errors, []); assert.deepEqual(requests, [], 'summary parsing and rendering request no external resources');
    console.log('PASS: compact cards retain every native field, repeated schedules, exact progress/meter values, blank versus zero, phase/whole-contract scopes, refreshed snapshots and disclosure state; unsafe/unknown content falls back without outer injection.');
  } finally {await browser.close();}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  new vm.Script(fs.readFileSync(rendererPath, 'utf8'), {filename: fileURLToPath(rendererPath)});
  assert.equal((forecastSummaryFixture().match(/class='fm-builder-card'/g) || []).length, 3);
  assert.match(forecastSummaryFixture(), /Contract Schedule &mdash; All 4 Phases/);
  if (process.argv.includes('--browser')) await browserChecks();
  else console.log('PASS: compact-summary source compiles and actual-Deluge fixture preserves three schedules and whole-contract content. Run --browser for rendering/security parity.');
}
