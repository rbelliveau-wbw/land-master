// Execute the saved Deluge body with explicit fixtures. Creator Save provides the compiler check.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

const source=fs.readFileSync(new URL('../creator/functions/buildForecastManagerSummary.dg',import.meta.url),'utf8');
function executable(source){
  let {js}=translate(source);
  return js.replace(/row\.Subdivisions == subdivisionId/g,'row.Subdivisions?.includes(subdivisionId)')
  .replace(/ID in contractLotIds/g,'contractLotIds.includes(row.ID)')
  .replace(/\.sum\(Forecasted_Lots\)/g,'.sum("Forecasted_Lots")');
}
const js=executable(source);
const date=s=>Date.parse(s+'T00:00:00Z');
const names={1:'DR Horton',2:'C.A. Doose',3:'StyleCraft',4:'First Omega'};
function run(tables,now='2026-10-02',subdivisionId=1,body=js){
  const context=vm.createContext({tablesJson:JSON.stringify(tables),names,now:date(now),subdivisionId});
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
      return new Proxy(rows,{get(o,k){return k in o || typeof k==='symbol'?o[k]:o[0]?.[k]??null;}});
    }
    const zoho={currentdate:now};
    ${body}
    var result=buildForecastManagerSummary(subdivisionId);
  `,context);
  return context.result;
}
const subdivision={ID:1,Subdivision_Name:'Wildwood Estates - Phase 05',Subdivision_Code:'WW05',Lots_Sold:144,Total_Lots:263};
function lot(ID,builder,status,closed=null,sub=1){return {ID,Builder1:builder,Subdivision:sub,Status:status,Close_Date:closed?date(closed):null,Purchase_Date:date('2026-10-01')};}
function forecast(builder,month,amount,sub=1){return {Subdivision1:sub,Builder1:builder,Forecast_Start_Date:date(month),Forecasted_Lots:amount};}
function schedule(builder,obligation,subs=[1],contract=null){return {ID:100+builder,Builder1:builder,Subdivisions:subs,Total_Lot_Obligation:obligation,Lots_Sold:0,Add_Contract_Contract_Name:contract};}
function values(html){return [...html.matchAll(/class='fm-(?:top|builder)-stat-v'>(-?\d+)</g)].map(x=>Number(x[1]));}
function card(html,name){return html.split("<div class='fm-builder-card'>").find(x=>x.includes("<div class='fm-builder-name'>"+name+'</div>'));}
const tables={Subdivision:[subdivision],Takedown_Schedule:[schedule(1,80),schedule(2,65),schedule(3,82),schedule(4,36)],Lots:[],Forecast:[],Contract:[]};
let id=1;
for(const [builder,total,sold,scheduled,currentActual,currentForecast,later] of [[1,79,51,0,10,10,19],[2,65,35,0,3,3,30],[3,83,42,4,0,4,36],[4,36,19,1,0,2,15]]){
  for(let i=0;i<total;i++)tables.Lots.push(lot(id++,builder,i<sold?'Sold':i<sold+scheduled?'Scheduled':'Contracted',i<sold?(i<currentActual?'2026-10-02':'2026-09-01'):null));
  tables.Forecast.push(forecast(builder,'2026-10-01',currentForecast),forecast(builder,'2026-11-01',later));
}
const html=run(tables);
assert.deepEqual(values(html),[10,10,0,0,0]);
assert.match(html,/<tr><td>Lots Sold<\/td><td>147<\/td><\/tr><tr><td>Lots Scheduled<\/td><td>5<\/td>/);
assert.match(card(html,'StyleCraft'),/42 Lots Sold - 4 Lots Scheduled/);
assert.match(card(html,'First Omega'),/19 Lots Sold - 1 Lots Scheduled/);
assert.match(card(html,'DR Horton'),/51 Lots Sold<\/div>/);
assert.match(card(html,'DR Horton'),/80 Lots Contracted/);
assert.match(card(html,'StyleCraft'),/82 Lots Contracted/);
assert.match(card(html,'C.A. Doose'),/Schedule Progress \(53%\)/);
assert.match(card(html,'StyleCraft'),/Schedule Progress \(51% &rarr; 56%\)/);
assert.match(card(html,'First Omega'),/Schedule Progress \(52% &rarr; 55%\)/);
assert.match(card(html,'StyleCraft'),/#b8860b 51\.21\d+%,#b8860b 56\.09\d+%/);
assert.doesNotMatch(card(html,'DR Horton'),/#b8860b|&rarr;/);
function monthMeter(html,name='DR Horton'){return card(html,name).split("<div class='fm-month'>")[1].split("<table class='fm-table'>")[0];}
assert.match(monthMeter(html),/October Forecast<\/div><div class='fm-month-status'>10 of 10 sold/);
assert.match(monthMeter(html),/aria-valuenow='100'/);
assert.match(monthMeter(html,'C.A. Doose'),/3 of 3 sold/);
assert.match(monthMeter(html,'StyleCraft'),/0 of 4 sold/);
assert.match(monthMeter(html,'First Omega'),/0 of 2 sold/);
assert.doesNotMatch(html,/Sold this month|0 left|fm-month-caption/);
const editedForecastTables=structuredClone(tables);
editedForecastTables.Forecast[0].Forecasted_Lots=20;
const editedForecastHtml=run(editedForecastTables);
assert.deepEqual(values(editedForecastHtml),[0,0,0,0,0]);
assert.match(monthMeter(editedForecastHtml),/10 of 20 sold/);
assert.match(monthMeter(editedForecastHtml),/aria-valuenow='50'/);
console.log('PASS: Wildwood totals, Doose double subtraction, obligation/assignment difference, conditional Scheduled labels and live progress');

function scenario(current,actual,later,close='2026-10-02',now='2026-10-02'){
  const lots=Array.from({length:actual},(_,i)=>lot(i+1,1,'Sold',close));
  // A scheduled lot with a purchase date must not consume the monthly forecast.
  lots.push(lot(99,1,'Scheduled'));
  return run({Subdivision:[subdivision],Takedown_Schedule:[schedule(1,20)],Lots:lots,Forecast:[forecast(1,'2026-10-01',current),forecast(1,'2026-11-01',later)]},now);
}
assert.deepEqual(values(scenario(10,4,5)),[5,5]);
assert.deepEqual(values(scenario(3,5,5)),[12,12]);
assert.deepEqual(values(scenario(3,5,5,'2026-09-30')),[7,7]);
assert.deepEqual(values(scenario(3,5,5,'2026-11-01','2026-11-02')),[15,15]);
assert.deepEqual(values(scenario(0,0,25)),[-5,-5]);
assert.deepEqual(values(scenario(10,4,5,'2026-11-01')),[5,5]);
assert.deepEqual(values(scenario(0,8,5)),[15,15]);
assert.match(monthMeter(scenario(10,4,5)),/4 of 10 sold/);
assert.match(monthMeter(scenario(10,4,5)),/aria-valuenow='40'.*width:40%;/);
assert.match(monthMeter(scenario(3,5,5)),/fm-month-status-over'>5 of 3 sold/);
assert.match(monthMeter(scenario(3,5,5)),/aria-valuenow='100'.*width:100%;/);
assert.match(monthMeter(scenario(0,8,5)),/8 of 0 sold/);
assert.match(monthMeter(scenario(0,8,5)),/aria-valuenow='0'.*width:0%;/);
assert.match(monthMeter(scenario(0,0,5)),/0 of 0 sold/);
assert.doesNotMatch(scenario(0,0,5),/NaN|Infinity/);
assert.match(monthMeter(scenario(3,5,5,'2026-09-30')),/0 of 3 sold/);
assert.match(monthMeter(scenario(3,5,5,'2026-11-01','2026-11-02')),/November Forecast.*5 of 5 sold/);
console.log('PASS: monthly meter shows full/partial/excess sales, zero forecast and month rollover; Scheduled and prior-month sales do not consume it');
console.log('PASS: start-of-month capacity survives partial, excess and unforecasted current-month sales; Close_Date basis, month rollover and real overforecast');

const multi={Subdivision:[subdivision],Takedown_Schedule:[schedule(1,6,[1,2],77)],Contract:[{ID:77,Lots1:[1,2,3,4,5,6]}],Lots:[lot(1,1,'Sold','2026-10-02'),lot(2,1,'Scheduled'),lot(3,1,'Contracted'),lot(4,1,'Sold','2026-10-02',2),lot(5,1,'Sold','2026-10-02',2),lot(6,1,'Contracted',null,2)],Forecast:[forecast(1,'2026-10-01',2),forecast(1,'2026-11-01',1),forecast(1,'2026-10-01',9,2)]};
const multiHtml=run(multi);
assert.deepEqual(values(multiHtml),[0,0]);
assert.match(multiHtml,/3 Lots Contracted/);
assert.match(multiHtml,/1 Lots Sold - 1 Lots Scheduled/);
assert.match(multiHtml,/Phase Progress \(33% &rarr; 66%\)/);
assert.match(multiHtml,/Overall Progress \(50% &rarr; 66%\)/);
assert.match(multiHtml,/Contract Schedule &mdash; All 2 Phases/);
assert.match(multiHtml,/6 Lots Obligated/);
assert.match(multiHtml,/<tr><td>Last Closing Date<\/td><td>10\/02\/2026<\/td>/);
assert.match(multiHtml,/<tr><td>Last Closing \(Lots\)<\/td><td>1<\/td>/);
assert.match(monthMeter(multiHtml),/1 of 2 sold/);
assert.match(monthMeter(multiHtml),/aria-valuenow='50'/);
assert.match(run({...multi,Takedown_Schedule:[]}),/No Takedown Schedule records/);
assert.equal(values(run(multi,'2026-10-02',null)).length,0);
console.log('PASS: phase-specific contract lots, actuals and progress, distinct whole-schedule progress, empty schedules and null subdivision');

// A declared contract obligation includes phases whose lots are not populated yet.
const turnbo={Subdivision:[{...subdivision,Subdivision_Name:'Turnbo Ranch - Phase 04',Subdivision_Code:'TR04'}],Takedown_Schedule:[{...schedule(1,363,[1,2,3,4],77),Initial_Takedown:50,Initial_Delay_Days:90,Continued_Takedown:50,Continued_Takedown_Delay_Days:90,Lots_Expected:50,Last_90_Day_Sales:50,Last_6_Month_Sales:100,Last_12_Month_Sales:100}],Contract:[{ID:77,Lots1:[]}],Lots:[],Forecast:[forecast(1,'2026-10-01',19),forecast(1,'2026-11-01',121)]};
for(let i=1;i<=140;i++){turnbo.Contract[0].Lots1.push(i);turnbo.Lots.push(lot(i,1,'Contracted'));}
for(let i=141;i<=171;i++){turnbo.Contract[0].Lots1.push(i);turnbo.Lots.push(lot(i,1,'Contracted',null,2));}
for(let i=172;i<=271;i++)turnbo.Lots.push(lot(i,1,'Sold','2026-08-01',2));
const turnboHtml=run(turnbo);
assert.deepEqual(values(turnboHtml),[0,0]);
assert.match(turnboHtml,/140 Lots Contracted &middot; TR04/);
assert.match(turnboHtml,/Phase Progress \(0%\)/);
assert.match(turnboHtml,/363 Lots Obligated/);
assert.match(turnboHtml,/Overall Progress \(27%\)/);
assert.match(turnboHtml,/100 Lots Sold/);
assert.match(monthMeter(turnboHtml),/0 of 19 sold/);
assert.doesNotMatch(turnboHtml.split("<div class='fm-contract-scope'>")[0],/50 Lots Expected|fm-mini-v'>100/);
const emptyPhase=run({...turnbo,Subdivision:[{...subdivision,ID:3,Subdivision_Code:'TR07'}]},'2026-10-02',3);
assert.match(emptyPhase,/0 Lots Populated &middot; TR07/);
assert.match(emptyPhase,/363 Lots Obligated/);
assert.doesNotMatch(emptyPhase,/NaN|Infinity/);

// Membership, rather than a second Builder filter, controls phase actuals.
const isolated=structuredClone(multi);
isolated.Lots.push(lot(90,1,'Sold','2026-10-02'),lot(91,1,'Scheduled'));
isolated.Lots[0].Builder1=2;
isolated.Lots[2].Status='Sold';isolated.Lots[2].Close_Date=date('2026-09-01');
const isolatedHtml=run(isolated);
assert.deepEqual(values(isolatedHtml),[-1,-1]);
assert.match(isolatedHtml,/Phase Progress \(66% &rarr; 100%\)/);
assert.match(monthMeter(isolatedHtml),/1 of 2 sold/);
assert.match(isolatedHtml,/<tr><td>Last Closing \(Lots\)<\/td><td>1<\/td>/);
assert.match(isolatedHtml,/fm-mini-k'>Last 30 Day<\/div><div class='fm-mini-v'>1/);
assert.match(isolatedHtml,/fm-mini-k'>Last 90 Day<\/div><div class='fm-mini-v'>2/);
const sameDay=structuredClone(isolated);
sameDay.Lots[2].Close_Date=date('2026-10-02');
assert.match(run(sameDay),/<tr><td>Last Closing \(Lots\)<\/td><td>2<\/td>/);

const previous=executable(fs.readFileSync(new URL('../creator/functions/baseline/buildForecastManagerSummary.monthly-meter.2026-10-02.dg',import.meta.url),'utf8'));
const withoutCss=s=>s.replace(/<style>[\s\S]*?<\/style>/,'');
assert.equal(withoutCss(run(tables)),withoutCss(run(tables,'2026-10-02',1,previous)));
assert.equal(withoutCss(run(editedForecastTables)),withoutCss(run(editedForecastTables,'2026-10-02',1,previous)));
console.log('PASS: unpopulated future phases preserve full obligation; contract membership scopes phase actuals, recent sales and latest closing; single-phase HTML equals the previous function');

const progressTables={Subdivision:[subdivision],Takedown_Schedule:[{...schedule(1,10),Lots_Expected:9}],Lots:[...Array.from({length:5},(_,i)=>lot(i+1,1,'Sold','2026-09-01')),...Array.from({length:2},(_,i)=>lot(i+10,1,'Scheduled'))],Forecast:[]};
assert.match(run(progressTables),/#b8860b 50%,#b8860b 70%,#f6a6a6 70%,#f6a6a6 90%/);
assert.match(run({...progressTables,Takedown_Schedule:[{...schedule(1,10),Lots_Expected:6}]}),/#b8860b 50%,#b8860b 70%,#edf2fb 70%/);
const capped=run({...progressTables,Takedown_Schedule:[schedule(1,6)]});
assert.match(capped,/Schedule Progress \(83% &rarr; 100%\)/);
assert.match(capped,/#b8860b 83\.33\d+%,#b8860b 100%/);
assert.doesNotMatch(run({...progressTables,Takedown_Schedule:[schedule(1,0)]}),/NaN|Infinity|&rarr;/);
const boundary={Subdivision:[subdivision],Takedown_Schedule:[schedule(1,20)],Lots:[lot(1,1,'Sold','2026-09-30'),lot(2,1,'Sold','2026-10-01'),lot(3,1,'Sold','2026-10-31')],Forecast:[forecast(1,'2026-10-01',3),forecast(1,'2026-11-01',5)]};
assert.deepEqual(values(run(boundary)),[11,11]);
assert.deepEqual(values(run(boundary,'2026-11-01')),[12,12]);
console.log('PASS: gold segment, projected percentage, expected-sales overlap, 100% cap, zero obligation and start-of-month boundaries');

if(process.argv.includes('--preview')){
  const directory=new URL('../../tmp/',import.meta.url);
  fs.writeFileSync(new URL('forecast-summary-wildwood-preview.html',directory),'<!doctype html><meta charset="utf-8"><title>Wildwood regression preview</title><body style="margin:0;padding:20px;background:#f5f7fb"><p style="font:14px Arial">Forecast Manager — audited Wildwood regression data</p>'+html);
  fs.writeFileSync(new URL('forecast-summary-turnbo-preview.html',directory),'<!doctype html><meta charset="utf-8"><title>Turnbo phase scope regression preview</title><body style="margin:0;padding:20px;background:#f5f7fb"><p style="font:14px Arial">Forecast Manager — Turnbo Phase 04 regression fixture</p>'+turnboHtml);
}
