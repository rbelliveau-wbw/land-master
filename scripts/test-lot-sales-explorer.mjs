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
const salesApp = fs.readFileSync(app + 'sales-app.js','utf8');
const theme = fs.readFileSync(app + 'insights-theme.css','utf8');
const redesign = fs.readFileSync(app + 'insights-redesign.css','utf8');
assert.match(html, /<option value="Scheduled">Scheduled<\/option>/);
assert.doesNotMatch(html, /<option value="Contracted">Contracted<\/option>/);
assert.match(salesApp, /function syncDateBasis\(\)/);
assert.match(salesApp, /option\[value="closeDate"\]'\)\.hidden = scheduled/);
assert.match(salesApp, /subdivisionBuilderBreakdown\(state\.lots, row\.id\)/);
assert.match(html, /<input id="hideEmpty" type="checkbox" role="switch">/);
assert.doesNotMatch(html, /SUBDIVISION SNAPSHOT/);
assert.match(salesApp, /!f\.hideEmpty && !state\.historyReady/);
assert.match(salesApp, /View All Lots/);
assert.match(theme, /\.subdivision-progress-breakdown\{display:block/);
assert.match(redesign, /\.sales-empty-toggle\{/);
assert.match(theme, /\.progress-scheduled\{background:#e7aa35\}/);
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
assert.equal(Object.hasOwn(stats, 'weightedPriceFF'), false);
assert.equal(Object.hasOwn(M.metrics, 'weightedPriceFF'), false);
assert.equal(html.includes('value="weightedPriceFF"'), false);
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
assert.equal(totalStats.avgPriceWithInterest,112500,'average Base + Interest uses priced lots');
assert.equal(totalStats.totalPriceWithInterest,225000,'total Base + Interest excludes lots without Base Price');
assert.equal(M.stats([{price:100000,interest:null,width:50}]).totalPriceWithInterest,100000,'blank Interest is zero');
assert.equal(M.stats([{price:null,interest:5000,width:50}]).avgPriceWithInterest,null,'Interest alone is not a sale price');
for (const metric of ['avgTotalPriceFF','avgPriceWithInterest','totalPriceWithInterest']) assert(html.includes('value="'+metric+'"'),metric+' must be selectable');
assert.deepEqual(M.subdivisionCounts([{subdivisionId:'s1',status:'Sold'},{subdivisionId:'s1',status:'Scheduled'},{subdivisionId:'s1',status:'Contracted'},{subdivisionId:'s1',status:'Open'},{subdivisionId:'s1',status:'On Hold'}]).get('s1'),{total:5,sold:1,scheduled:1,contracted:1,open:2});
const breakdown=M.subdivisionBuilderBreakdown([
  {subdivisionId:'s1',status:'Sold',builder:'Builder B'}, {subdivisionId:'s1',status:'Sold',builder:'Builder A'},
  {subdivisionId:'s1',status:'Scheduled',builder:'Builder A'}, {subdivisionId:'s1',status:'Contracted',builder:'Builder B'},
  {subdivisionId:'s2',status:'Sold',builder:'Other'}
],'s1');
assert.deepEqual(breakdown.Sold,[{builder:'Builder A',count:1},{builder:'Builder B',count:1}]);
assert.deepEqual(breakdown.Scheduled,[{builder:'Builder A',count:1}]);
assert.deepEqual(breakdown.Contracted,[{builder:'Builder B',count:1}]);
assert.deepEqual(M.monthRange('2025-12','2026-02'), ['2026-02','2026-01','2025-12']);
assert.throws(() => M.monthRange('2026-03','2026-02'));
const fixture = salesFixture(new Date(2026, 8, 17));
fixture.lots.push({...fixture.lots[0],ID:'scheduled-lot',Status:'Scheduled',Close_Date:'',Purchase_Date:'2026-08-01'});
const original = JSON.stringify(fixture), lots = M.normalize(fixture);
assert.equal(lots[0].id, fixture.lots[0].ID);
assert.equal(lots[0].projectId, 'p0');
assert.equal(JSON.stringify(fixture), original);
assert.equal(M.normalize({...fixture,lots:[{...fixture.lots[0],Status:'Contracted',Close_Date:'',Purchase_Date:'2026-08-01'}]})[0].status,'Scheduled','purchase-dated lots appear Scheduled before Creator Production is reconciled');
assert.equal(M.normalize({...fixture,lots:[{...fixture.lots[0],Status:'Scheduled',Close_Date:'2026-08-15',Purchase_Date:'2026-08-01'}]})[0].status,'Sold','Close Date takes priority over Purchase Date');
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
assert.deepEqual(M.selectDetailLots(detailLots,'purchaseDate','2026-08').map(l=>l.code),['purchase-only'],'monthly totals include purchase-only lots on Purchase Date basis');
assert.deepEqual(M.selectDetailLots(detailLots,'closeDate','2026-07').map(l=>l.code),['new','old'],'Close Date month drilldown excludes lots without a close date');
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
const contractedLot=M.normalize({...fixture,lots:[{...fixture.lots[0],Status:'Contracted',Close_Date:'',Purchase_Date:''}]})[0];
assert.equal(contractedLot.status,'Contracted','a builder lot without dates remains Contracted');
const contracted=M.report([contractedLot],{status:'Contracted',dateField:'purchaseDate'});
assert.equal(contracted.stats.count,0,'undated Contracted lots cannot enter monthly buckets');
assert.equal(contracted.missingDates,1);
const noClose=M.report([contractedLot],{status:'Contracted',dateField:'closeDate'});
assert.equal(noClose.missingDates,1);
assert.equal(M.report(lots,{projectId:'not-a-project'}).stats.count,0);
const multi = M.reportSelection(lots,{projectIds:['p0','p1'],territories:['Bryan / College Station','Fort Hood'],builderIds:['b0','b1'],statuses:['Sold','Scheduled'],dateField:'closeDate',from:'2025-01',to:'2026-12'});
assert.equal(multi.reports.length,1,'Sold and Scheduled share one combined report');
assert.equal(multi.dateField,'purchaseDate','Scheduled always uses Purchase Date');
assert(multi.lots.every(l=>['p0','p1'].includes(l.projectId)&&['b0','b1'].includes(l.builderId)),'OR within a filter, AND across filters');
assert(multi.lots.some(l=>l.status==='Sold')&&multi.lots.some(l=>l.status==='Scheduled'),'combined report contains both statuses');
assert.equal(multi.rows.reduce((n,row)=>n+row.stats.count,0),multi.lots.length,'subdivision rows add Sold and Scheduled lots');
assert.equal(new Set(multi.rows.map(r=>r.key)).size,multi.rows.length,'combined view has one row per subdivision and builder scope');
assert.equal(multi.reports[0].stats.count,multi.lots.length,'combined footer counts each lot once');
assert(multi.rows.some(row=>row.lots.some(lot=>lot.status==='Sold')&&row.lots.some(lot=>lot.status==='Scheduled')),'status lines merge within a subdivision');
const scheduledOnly=M.reportSelection(lots,{statuses:['Scheduled'],dateField:'closeDate',from:'2026-08',to:'2026-08'});
assert.equal(scheduledOnly.stats.count,lots.filter(lot=>lot.status==='Scheduled'&&lot.purchaseDate?.startsWith('2026-08')).length);
assert.equal(scheduledOnly.dateField,'purchaseDate');
assert.equal(M.reportSelection(lots,{projectIds:['not-a-project'],statuses:['Sold']}).lots.length,0);
assert.deepEqual(M.reportSelection(lots,{projectIds:[],statuses:[]}).statuses,['Sold','Scheduled'],'empty multi-select means both available choices');
const historyComparison=M.reportSelection(lots,{statuses:['Sold','Scheduled'],dateField:'purchaseDate'});
assert(historyComparison.reports.every(r=>r.months.join(',')===historyComparison.months.join(',')));
const inventoryBase={...lots[0],projectId:'p0',project:'Project A',territory:'Waco',builderId:'b0',builder:'Builder A',excludedBuilder:false};
const inventory=[
  {...inventoryBase,id:'active',subdivisionId:'active',subdivision:'Active Phase',status:'Sold',closeDate:'2026-06-01',purchaseDate:'2026-05-01',price:null,width:null},
  {...inventoryBase,id:'contracted',subdivisionId:'future',subdivision:'Future Phase',status:'Contracted',closeDate:null,purchaseDate:null,builderId:'b1',builder:'Builder B'},
  {...inventoryBase,id:'future-open',subdivisionId:'future',subdivision:'Future Phase',status:'Open',closeDate:null,purchaseDate:null,builderId:'b2',builder:'Builder C'},
  {...inventoryBase,id:'unassigned',subdivisionId:'open',subdivision:'Open Phase',status:'Open',closeDate:null,purchaseDate:null,builderId:'',builder:'Placeholder',excludedBuilder:true},
  {...inventoryBase,id:'old',subdivisionId:'old',subdivision:'Past Phase',status:'Sold',closeDate:'2024-06-01',purchaseDate:'2024-05-01'}
];
const inventoryFilters={statuses:['Sold'],from:'2026-01',to:'2026-12',hideEmpty:false,excludeBuilders:false};
const showInventory=M.reportSelection(inventory,inventoryFilters);
assert.deepEqual([...new Set(showInventory.rows.map(row=>row.id))].sort(),['active','future','old','open']);
assert.equal(showInventory.lots.length,1,'only selected-period Sold lots enter report totals');
assert.equal(showInventory.reports[0].stats.count,1);
assert(showInventory.rows.filter(row=>row.id!=='active').every(row=>row.stats.count===0&&row.cells.size===0),'undated and out-of-period subdivisions have blank report values');
assert.equal(showInventory.rows.find(row=>row.id==='active').stats.avgPriceFF,null,'a missing price does not make a lot-count row empty');
assert.deepEqual(M.reportSelection(inventory,{...inventoryFilters,hideEmpty:true}).rows.map(row=>row.id),['active'],'Hide Empty removes rows without selected lots');
assert(!M.reportSelection(inventory,{...inventoryFilters,excludeBuilders:true}).rows.some(row=>row.id==='open'),'builder exclusion remains available as an explicit filter');
assert.deepEqual([...new Set(M.reportSelection(inventory,{...inventoryFilters,projectIds:['not-this-project']}).rows.map(row=>row.id))],[],'project scope applies to the all-subdivision inventory');
const builderInventory=M.reportSelection(inventory,{...inventoryFilters,groupBy:'builder'});
assert.equal(builderInventory.rows.filter(row=>row.id==='future').length,2,'Builder grouping shows each builder with populated lots');
assert.equal(new Set(builderInventory.rows.map(row=>row.key)).size,builderInventory.rows.length,'Builder inventory rows have unique keys');
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
