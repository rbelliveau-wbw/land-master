// Local-only browser fixture server. Does not call Creator or load business data.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { budgetFixture } from './fixtures/insights-budgets.mjs';
import { salesFixture } from './fixtures/lot-sales-data.mjs';
const root = path.resolve('widgets/lot-sales-explorer/src/app'), data = budgetFixture(salesFixture());
const reports = {All_Lots_All_Fields:data.lots,All_Subdivisions:data.subdivisions,All_Projects:data.projects,All_Builders:data.builders,All_Budgets:data.budgets,All_Budget_Categories:data.categories,All_Budget_Items:data.items,All_Budget_Modifications:data.modifications};
const sdk = `const delay=ms=>new Promise(r=>setTimeout(r,ms));let failedHistory=false;
function filtered(c){let rows=DATA[c.report_name]||[];if(c.criteria){const years=[...c.criteria.matchAll(/01\\/01\\/(\\d{4})/g)].map(m=>Number(m[1]));const lo=years[0]+'-01-01',hi=years[1]+'-01-01';rows=rows.filter(r=>[r.Close_Date,r.Purchase_Date].some(d=>d>=lo&&d<hi));}return rows;}
window.ZOHO={CREATOR:{UTIL:{getInitParams:()=>Promise.resolve({envUrlFragment:'environment/development',loginUser:'demo@example.invalid'})},DATA:{getRecordCount:async c=>{if(c.report_name==='All_Lots_All_Fields'&&!c.criteria){await delay(Number(new URLSearchParams(location.search).get('historyDelay'))||8000);if(new URLSearchParams(location.search).has('historyFail')&&!failedHistory){failedHistory=true;throw new Error('Synthetic history interruption');}}return {code:3000,result:{records_count:String(filtered(c).length)}}},getRecords:async c=>{await delay(100);const rows=filtered(c),offset=Number(c.record_cursor||0);return {code:3000,data:rows.slice(offset,offset+1000),...(offset+1000<rows.length?{record_cursor:String(offset+1000)}:{})};}}}};`;

const server = http.createServer((req,res)=>{
  const url = new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/fixture-sdk.js'){res.setHeader('Content-Type','text/javascript');res.end('const DATA='+JSON.stringify(reports)+';'+sdk);return;}
  const file = path.resolve(root,'.'+(url.pathname==='/'?'/widget.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try { let content=fs.readFileSync(file); if(file.endsWith('.html'))content=content.toString().replace('https://static.zohocdn.com/creator/widgets/version/2.0/widgetsdk-min.js','/fixture-sdk.js').replace('Monthly performance across your subdivisions','Synthetic browser test data');res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript');res.setHeader('Cache-Control','no-store');res.end(content); }
  catch{res.writeHead(404);res.end('Not found');}
});
server.listen(8773,'127.0.0.1',()=>console.log('Lot Sales Explorer fixture: http://127.0.0.1:8773'));
