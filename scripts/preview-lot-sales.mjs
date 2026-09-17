// Local-only browser fixture server. Does not call Creator or load business data.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { salesFixture } from './fixtures/lot-sales-data.mjs';
const root = path.resolve('widgets/lot-sales-explorer/src/app'), data = salesFixture();
const reports = {All_Lots_All_Fields:data.lots,All_Subdivisions:data.subdivisions,All_Projects:data.projects,All_Builders:data.builders};
const sdk = `window.ZOHO={CREATOR:{UTIL:{getInitParams:()=>Promise.resolve({envUrlFragment:'environment/development',loginUser:'demo@example.invalid'})},DATA:{getRecordCount:async c=>({code:3000,result:{records_count:String(DATA[c.report_name].length)}}),getRecords:async c=>{const rows=DATA[c.report_name],offset=Number(c.record_cursor||0);return {code:3000,data:rows.slice(offset,offset+1000),...(offset+1000<rows.length?{record_cursor:String(offset+1000)}:{})};}}}};`;
const server = http.createServer((req,res)=>{
  const url = new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/fixture-sdk.js'){res.setHeader('Content-Type','text/javascript');res.end('const DATA='+JSON.stringify(reports)+';'+sdk);return;}
  const file = path.resolve(root,'.'+(url.pathname==='/'?'/widget.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try { let content=fs.readFileSync(file); if(file.endsWith('.html'))content=content.toString().replace('https://static.zohocdn.com/creator/widgets/version/2.0/widgetsdk-min.js','/fixture-sdk.js').replace('Monthly performance across your subdivisions','Synthetic browser test data');res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript');res.setHeader('Cache-Control','no-store');res.end(content); }
  catch{res.writeHead(404);res.end('Not found');}
});
server.listen(8773,'127.0.0.1',()=>console.log('Lot Sales Explorer fixture: http://127.0.0.1:8773'));
