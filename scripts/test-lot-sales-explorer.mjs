import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { salesFixture } from './fixtures/lot-sales-data.mjs';
const app = 'widgets/lot-sales-explorer/src/app/';
await import('../' + app + 'sales-model.js');
await import('../' + app + 'creator-adapter.js');
const M = globalThis.LotSalesModel, A = globalThis.LotSalesCreator;
const version = JSON.parse(fs.readFileSync('widgets/lot-sales-explorer/widget.config.json','utf8')).version;
const html = fs.readFileSync(app + 'widget.html','utf8');
for (const [,asset] of html.matchAll(/(?:src|href)="([a-z][a-z-]*\.(?:js|css)(?:\?[^\"]*)?)"/g)) {
  assert.equal(new URL(asset,'https://widget.invalid/').searchParams.get('v'),version,'Local assets must change URL on every release: '+asset);
}
for (const file of fs.readdirSync(app).filter(file => file.endsWith('.js'))) new vm.Script(fs.readFileSync(app + file, 'utf8'), { filename: file });
assert.equal(M.date('29-Feb-2024'), '2024-02-29');
assert.equal(M.date('02/29/2025'), null);
assert.equal(M.date('2026-09-01'), '2026-09-01');
assert.equal(M.date('13/01/2026'), null);
assert.equal(M.numeric(''), null);
assert.equal(M.numeric('$ 45,000.00'), 45000);
assert.equal(M.numeric('invalid'), null);
const stats = M.stats([{ price: 40000, width: 40 }, { price: 100000, width: 50 }, { price: 5000, width: 0 }, { price: null, width: 50 }]);
assert.equal(stats.avgPriceFF, 1500);
assert.equal(stats.weightedPriceFF, 140000 / 90);
assert.equal(stats.count, 4);
assert.equal(stats.eligible, 2);
assert.equal(stats.missingPriceFF, 2);
assert.equal(M.stats([{price: 0, width: 40}]).avgPriceFF, 0);
assert.equal(M.stats([{price: null, width: 40}]).avgPriceFF, null);
assert.equal(M.stats([]).totalPrice, null);
assert.equal(M.totalPrice({price:100000,interest:5000}),105000);
assert.equal(M.totalPrice({price:100000,interest:null}),100000);
assert.equal(M.totalPrice({price:null,interest:5000}),null);
const totalStats = M.stats([{price:100000,interest:5000,width:50},{price:100000,interest:20000,width:100},{price:null,interest:300,width:50}]);
assert.equal(totalStats.avgTotalPriceFF,1650,'new Price/FF averages each eligible lot');
assert.equal(totalStats.missingTotalPriceFF,1);
assert.deepEqual(M.subdivisionCounts([{subdivisionId:'s1',status:'Sold'},{subdivisionId:'s1',status:'Contracted'},{subdivisionId:'s1',status:'Open'},{subdivisionId:'s1',status:'On Hold'}]).get('s1'),{total:4,sold:1,contracted:1,open:2});
assert.deepEqual(M.monthRange('2025-12','2026-02'), ['2026-02','2026-01','2025-12']);
assert.throws(() => M.monthRange('2026-03','2026-02'));
const fixture = salesFixture(new Date(2026, 8, 17)), original = JSON.stringify(fixture), lots = M.normalize(fixture);
assert.equal(lots[0].id, fixture.lots[0].ID);
assert.equal(lots[0].projectId, 'p0');
assert.equal(JSON.stringify(fixture), original);
const enriched = M.normalize({...fixture,lots:[{...fixture.lots[0],Interest1:'$1,250',Escalator:'3.5',Notes:'Review interest terms'}]})[0];
assert.equal(enriched.interest,1250);
assert.equal(enriched.escalator,3.5);
assert.equal(enriched.notes,'Review interest terms');
assert.equal(M.normalize({...fixture, lots:[...fixture.lots, fixture.lots[0]]}).length, lots.length);
const all = M.report(lots, {from:'2025-09',to:'2026-09',status:'Sold'});
assert.equal(all.months.length, 13);
assert.equal(all.months[0], '2026-09');
assert(all.lots.every(l=>l.status==='Sold'));
assert.equal(all.groupBy, 'project');
const detailLots = [
  {builder:'DR Horton',code:'old',closeDate:'2026-07-02',purchaseDate:'2026-07-02'},
  {builder:'DR Horton',code:'new',closeDate:'2026-07-23',purchaseDate:'2026-07-23'},
  {builder:'DR Horton',code:'purchase-only',closeDate:null,purchaseDate:'2026-08-01'},
  {builder:'Ashton',code:'first',closeDate:'2026-06-01',purchaseDate:'2026-06-01'}
];
assert.deepEqual(M.sortDetailLots(detailLots,'closeDate').map(l=>l.code),['first','new','old','purchase-only']);
assert.deepEqual(M.sortDetailLots(detailLots,'purchaseDate').map(l=>l.code),['first','purchase-only','new','old']);
assert.equal(detailLots[0].code,'old','drilldown sorting must not mutate report rows');
assert(all.rows.every(row => row.groupName === row.project), 'Project is the default report grouping');
const byTerritory = M.report(lots, {from:'2025-09',to:'2026-09',status:'Sold',groupBy:'territory'});
assert(byTerritory.rows.every(row => row.groupName === row.territory));
const byBuilder = M.reportSelection(lots, {from:'2025-09',to:'2026-09',statuses:['Sold'],groupBy:'builder'});
assert.equal(byBuilder.rows.reduce((count,row)=>count+row.stats.count,0), byBuilder.lots.length, 'Builder groups partition the selected lots');
assert(byBuilder.rows.every(row => row.lots.every(lot => lot.builder === row.builder && lot.subdivisionId === row.id)));
assert.equal(new Set(byBuilder.rows.map(row => row.key)).size, byBuilder.rows.length, 'Builder subdivisions keep distinct drilldown keys');
assert(byBuilder.rows.some((row,index) => byBuilder.rows.findIndex(other => other.id === row.id) !== index), 'A subdivision can appear under multiple builders');
assert(byBuilder.rows.every(row => row.firstSale === (lots.filter(lot => lot.subdivisionId === row.id && lot.builderId === row.builderId && lot.status === 'Sold' && lot.closeDate).map(lot => lot.closeDate).sort()[0] || null)));
const project = M.report(lots, {from:'2025-09',to:'2026-09',projectId:'p0',excludeBuilders:true});
assert(project.lots.length > 0);
assert(project.lots.every(l=>l.projectId==='p0' && !l.excludedBuilder));
assert.equal(project.stats.count, project.rows.reduce((n,r)=>n+r.stats.count,0));
assert(project.rows.every(row=>row.firstSale < '2025-09-01'), 'first sale spans all dates within scope');
const contracted = M.report(lots, {status:'Contracted',dateField:'purchaseDate'});
assert(contracted.stats.count > 0);
assert(contracted.lots.every(l=>l.status==='Contracted'));
const noClose = M.report(lots,{status:'Contracted',dateField:'closeDate'});
assert.equal(noClose.stats.count,0);
assert(noClose.missingDates>0);
assert.equal(M.report(lots,{projectId:'not-a-project'}).stats.count,0);
const multi = M.reportSelection(lots,{projectIds:['p0','p1'],territories:['Bryan / College Station','Fort Hood'],builderIds:['b0','b1'],statuses:['Sold','Contracted'],dateField:'purchaseDate',from:'2025-01',to:'2026-12'});
assert.equal(multi.reports.length,2);
assert(multi.lots.every(l=>['p0','p1'].includes(l.projectId)&&['b0','b1'].includes(l.builderId)),'OR within a filter, AND across filters');
assert(multi.reports.every(r=>r.lots.every(l=>l.status===r.status)),'status totals must not blend');
assert(multi.reports.every(r=>r.from===multi.from&&r.to===multi.to),'status columns use a shared month range');
assert.equal(new Set(multi.rows.map(r=>r.key)).size,multi.rows.length,'drilldown keys distinguish statuses in the same subdivision');
assert.equal(M.reportSelection(lots,{projectIds:['not-a-project'],statuses:['Sold']}).lots.length,0);
assert.equal(M.reportSelection(lots,{projectIds:[],statuses:[]}).reports.length,2,'empty multi-select means all available choices');
const historyComparison=M.reportSelection(lots,{statuses:['Sold','Contracted'],dateField:'purchaseDate'});
assert(historyComparison.reports.every(r=>r.months.join(',')===historyComparison.months.join(',')));
assert(M.csv([['=CMD()', 'a,b', '"quote"']]).includes("'=CMD()"));
assert(M.csv([['a,b']]).includes('"a,b"'));
const records = Array.from({length:1001},(_,i)=>({ID:String(9000000000000000000n + BigInt(i))}));
let calls=[];
const api = {
  getRecordCount: async()=>({code:3000,result:{records_count:'1001'}}),
  getRecords: async config=>{calls.push(config); return config.record_cursor?{code:3000,data:records.slice(1000)}:{code:3000,data:records.slice(0,1000),record_cursor:'next'};}
};
assert.equal((await A.readAll(api,'Lots',null,['ID','Lot_Size'])).length,1001);
assert.equal(calls[1].record_cursor,'next');
assert.equal(calls[0].fields,'ID,Lot_Size');
assert.equal(calls[0].field_config,'custom');
await assert.rejects(()=>A.readAll({...api,getRecords:async()=>({code:3000,data:records.slice(0,1000)})},'Lots',null,['ID']),/loaded 1000 of 1001/);
await assert.rejects(()=>A.readAll({...api,getRecords:async c=>c.record_cursor?{code:3000,data:[records[0]]}:{code:3000,data:records.slice(0,1000),record_cursor:'next'}},'Lots',null,['ID']),/duplicate/);
await assert.rejects(()=>A.readAll({...api,getRecords:async()=>({code:2894,message:'No report'})},'Lots',null,['ID']),/No report/);
assert.deepEqual(await A.readAll({getRecordCount:async()=>({code:3000,result:{records_count:'0'}}),getRecords:async()=>({code:3100})},'Lots',null,['ID']),[]);
await assert.rejects(()=>A.readAll({...api,getRecords:async()=>({code:3100})},'Lots',null,['ID']),/loaded 0 of 1001/);
const window = A.recentWindow(new Date(2026, 8, 17));
assert.equal(window.from, '2025-01'); assert.equal(window.to, '2026-12');
assert(window.criteria.includes("Close_Date >= '01/01/2025'"));
assert(window.criteria.includes("Purchase_Date < '01/01/2027'"));
const stagedData = { ...fixture, lots: [...fixture.lots,
  { ...fixture.lots[0], ID:'cross-date', Close_Date:'2024-12-31', Purchase_Date:'2025-01-01' },
  { ...fixture.lots[0], ID:'next-year', Close_Date:'2027-01-01', Purchase_Date:'' },
  { ...fixture.lots[0], ID:'no-date', Close_Date:'', Purchase_Date:'' }] };
const source = Object.fromEntries(Object.entries(A.reports).map(([key, report]) => [report, stagedData[key]]));
const requests=[];
const filtered = c => c.criteria ? source[c.report_name].filter(r => [M.date(r.Close_Date),M.date(r.Purchase_Date)].some(d=>d && d >= '2025-01-01' && d < '2027-01-01')) : source[c.report_name];
const stagedApi = {
  getRecordCount: async c => { requests.push(c); return {code:3000,result:{records_count:String(filtered(c).length)}}; },
  getRecords: async c => {requests.push(c); const rows=filtered(c), offset=Number(c.record_cursor||0); return {code:3000,data:rows.slice(offset,offset+1000),...(offset+1000<rows.length?{record_cursor:String(offset+1000)}:{})};}
};
const recent=await A.loadRecent(stagedApi,null,{now:new Date(2026,8,17)});
assert(recent.lots.some(r=>r.ID==='cross-date'), 'either date basis must be ready');
assert(!recent.lots.some(r=>r.ID==='next-year'||r.ID==='no-date'));
assert(recent.lots.length < stagedData.lots.length);
assert(requests.filter(c=>c.report_name===A.reports.lots).every(c=>c.criteria===window.criteria),'count and every page share criteria');
assert(requests.filter(c=>c.report_name===A.reports.lots && c.fields).every(c=>['Interest1','Escalator','Notes'].every(field=>c.fields.split(',').includes(field))),'lot reads include price details and notes');
const historical=await A.loadHistory(stagedApi);
assert.equal(historical.length,stagedData.lots.length);
assert.equal(M.normalize({...recent,lots:historical}).length,historical.length,'complete snapshot replaces recent without duplicate rows');
let cancelled=false, pageCalls=0;
await assert.rejects(()=>A.readAll({getRecordCount:async()=>{cancelled=true;return {code:3000,result:{records_count:'1'}}},getRecords:async()=>{pageCalls++;return {code:3000,data:[{ID:'a'}]}}},'Lots',null,['ID'],{isCancelled:()=>cancelled}),/superseded/);
assert.equal(pageCalls,0,'superseded loads stop before the next request');
console.log('Lot Sales Explorer: calculations, date boundaries, scope, data quality, CSV safety, cursor pagination and incomplete-read guards passed.');
