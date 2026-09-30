// Local development server. Only widget assets and these authored Deluge sources are served.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fixture} from './fixtures/proforma-budget-transfer.mjs';
const root=path.resolve('widgets/proforma-manager/src/app');
const escape=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/transfer-fixture'){
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync('scripts/fixtures/proforma-budget-transfer.html','utf8').replace('__FIXTURE_JSON__',JSON.stringify(fixture())));return;
 }
 if(url.pathname.startsWith('/code/')){
  const name=url.pathname.slice(6);
  if(!['PF_Budget_Transfer_Plan.dg','PF_Budget_Transfer.dg','getUserAccess.dg'].includes(name)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<meta charset="utf-8"><label>Deluge source<textarea aria-label="Deluge source" style="width:95%;height:90vh">'+escape(fs.readFileSync('creator/functions/'+name,'utf8'))+'</textarea></label>');return;
 }
 const file=path.resolve(root,'.'+(url.pathname==='/'?'/widget.html':decodeURIComponent(url.pathname)));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript');res.setHeader('Cache-Control','no-store');const bytes=fs.readFileSync(file);res.end(file.endsWith("widget.html")?bytes.toString("utf8").replace(/<script src="https:\/\/static\.zohocdn\.com[^"]*"><\/script>/,""):bytes);}catch{res.writeHead(404);res.end();}
}).listen(8784,'127.0.0.1',()=>console.log('Pro Forma transfer preview: http://127.0.0.1:8784/?mock=1'));
